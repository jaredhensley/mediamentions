/**
 * @fileoverview Admin route handlers for maintenance and monitoring
 */

const { runQuery, runExecute } = require('../db');
const { sendJson } = require('../utils/http');
const { getStatus: getVerificationStatus } = require('../services/verificationStatus');
const { pollRssFeeds, loadClientsWithRssFeeds } = require('../services/rssService');
const { normalizeUrlForComparison } = require('../utils/mentions');

// ============================================================================
// HEALTH CHECK
// ============================================================================

function healthCheck(_req, res) {
  sendJson(res, 200, { status: 'ok', timestamp: new Date().toISOString() });
}

// ============================================================================
// VERIFICATION STATUS
// ============================================================================

function verificationStatus(_req, res) {
  const status = getVerificationStatus();
  sendJson(res, 200, status);
}

// ============================================================================
// PENDING REVIEW HANDLERS
// ============================================================================

function listPendingReview(req, res) {
  const mentions = runQuery(`
    SELECT
      m.id,
      m.title,
      m.link,
      m.source,
      m.mentionDate,
      m.createdAt,
      m.verified,
      c.name as clientName,
      c.id as clientId
    FROM mediaMentions m
    JOIN clients c ON m.clientId = c.id
    WHERE m.verified IS NULL
    ORDER BY m.createdAt DESC
  `);

  sendJson(res, 200, mentions);
}

function acceptPendingReview(req, res, params) {
  const id = Number(params.id);
  if (isNaN(id)) {
    return sendJson(res, 400, { error: 'Invalid ID' });
  }

  const mention = runQuery('SELECT * FROM mediaMentions WHERE id = @p0', [id])[0];
  if (!mention) {
    return sendJson(res, 404, { error: 'Mention not found' });
  }

  if (mention.verified !== null) {
    return sendJson(res, 400, { error: 'Mention is not pending review' });
  }

  runQuery('UPDATE mediaMentions SET verified = 1 WHERE id = @p0', [id]);
  sendJson(res, 200, { success: true, id, verified: 1 });
}

function rejectPendingReview(req, res, params) {
  const id = Number(params.id);
  if (isNaN(id)) {
    return sendJson(res, 400, { error: 'Invalid ID' });
  }

  const [mention] = runQuery(
    `SELECT
      m.*,
      c.name as clientName,
      p.name as publicationName
     FROM mediaMentions m
     JOIN clients c ON m.clientId = c.id
     JOIN publications p ON m.publicationId = p.id
     WHERE m.id = @p0;`,
    [id]
  );

  if (!mention) {
    return sendJson(res, 404, { error: 'Mention not found' });
  }

  if (mention.verified !== null) {
    return sendJson(res, 400, { error: 'Mention is not pending review' });
  }

  // Archive to deletedMentions before marking as rejected
  runQuery(
    `INSERT INTO deletedMentions (
      originalMentionId, title, subjectMatter, mentionDate, reMentionDate,
      link, source, sentiment, status, verified, clientId, clientName,
      publicationId, publicationName
    ) VALUES (@p0, @p1, @p2, @p3, @p4, @p5, @p6, @p7, @p8, @p9, @p10, @p11, @p12, @p13);`,
    [
      mention.id,
      mention.title,
      mention.subjectMatter,
      mention.mentionDate,
      mention.reMentionDate,
      mention.link,
      mention.source,
      mention.sentiment,
      mention.status,
      0, // Will be marked as verified = 0 (rejected)
      mention.clientId,
      mention.clientName,
      mention.publicationId,
      mention.publicationName
    ]
  );

  runQuery('UPDATE mediaMentions SET verified = 0 WHERE id = @p0', [id]);
  sendJson(res, 200, { success: true, id, verified: 0 });
}

function getPendingReviewCount(req, res) {
  const result = runQuery('SELECT COUNT(*) as count FROM mediaMentions WHERE verified IS NULL')[0];
  sendJson(res, 200, { count: result?.count || 0 });
}

// ============================================================================
// RSS FEED HANDLERS
// ============================================================================

async function triggerRssPoll(req, res) {
  try {
    console.log('[api] Manual RSS poll triggered');
    const result = await pollRssFeeds({ runVerification: true });
    sendJson(res, 200, result);
  } catch (err) {
    sendJson(res, 500, { error: err.message });
  }
}

function getRssFeedStatus(req, res) {
  const clients = loadClientsWithRssFeeds();
  sendJson(res, 200, {
    clientsWithFeeds: clients.length,
    clients: clients.map((c) => ({
      id: c.id,
      name: c.name,
      feedUrl: c.alertsRssFeedUrl
    }))
  });
}

// ============================================================================
// CLEANUP DUPLICATES
// ============================================================================

function inspectDuplicates(_req, res) {
  try {
    // Find duplicate groups
    const duplicateGroups = runQuery(`
      SELECT link, clientId, COUNT(*) as count
      FROM mediaMentions
      GROUP BY link, clientId
      HAVING COUNT(*) > 1
      ORDER BY count DESC
    `);

    // Get full details for each duplicate group
    const duplicates = [];
    for (const group of duplicateGroups) {
      const mentions = runQuery(
        `SELECT id, title, mentionDate, link, clientId, verified, status, createdAt
         FROM mediaMentions
         WHERE link = @p0 AND clientId = @p1
         ORDER BY id ASC`,
        [group.link, group.clientId]
      );
      duplicates.push({
        link: group.link,
        clientId: group.clientId,
        count: group.count,
        mentions: mentions
      });
    }

    sendJson(res, 200, {
      totalDuplicateGroups: duplicateGroups.length,
      duplicates: duplicates
    });
  } catch (err) {
    sendJson(res, 500, { error: err.message });
  }
}

function cleanupDuplicates(_req, res) {
  const result = {
    startedAt: new Date().toISOString(),
    duplicatesFound: 0,
    duplicatesDeleted: 0,
    urlsNormalized: 0,
    indexCreated: false,
    indexDropped: false,
    errors: []
  };

  try {
    // Step 1: Drop the unique index temporarily so we can normalize URLs
    try {
      runExecute('DROP INDEX IF EXISTS idx_mentions_url_client_unique');
      result.indexDropped = true;
    } catch (err) {
      result.errors.push(`Failed to drop index: ${err.message}`);
    }

    // Step 2: Find and delete semantic duplicates (same normalized URL OR title + clientId)
    // Group all mentions by normalized URL + clientId and title + clientId in memory
    const allMentions = runQuery(
      'SELECT id, link, title, clientId FROM mediaMentions ORDER BY id ASC'
    );
    const urlGroups = new Map();
    const titleGroups = new Map();

    // Group by URL
    for (const mention of allMentions) {
      const normalized = normalizeUrlForComparison(mention.link) || mention.link;
      const key = `url:${normalized}-${mention.clientId}`;

      if (!urlGroups.has(key)) {
        urlGroups.set(key, []);
      }
      urlGroups.get(key).push(mention.id);
    }

    // Group by title
    for (const mention of allMentions) {
      const normalizedTitle = (mention.title || '').toLowerCase().trim();
      if (!normalizedTitle) continue; // Skip empty titles

      const key = `title:${normalizedTitle}-${mention.clientId}`;

      if (!titleGroups.has(key)) {
        titleGroups.set(key, []);
      }
      titleGroups.get(key).push(mention.id);
    }

    // Collect all IDs to delete (but keep track to avoid double-deletion)
    const idsToDelete = new Set();

    // Delete URL duplicates - keep first (oldest) in each group
    for (const [_key, ids] of urlGroups) {
      if (ids.length > 1) {
        result.duplicatesFound++;
        // Delete all except the first one
        for (let i = 1; i < ids.length; i++) {
          idsToDelete.add(ids[i]);
        }
      }
    }

    // Delete title duplicates - keep first (oldest) in each group
    for (const [_key, ids] of titleGroups) {
      if (ids.length > 1) {
        result.duplicatesFound++;
        // Delete all except the first one
        for (let i = 1; i < ids.length; i++) {
          idsToDelete.add(ids[i]);
        }
      }
    }

    // Perform the actual deletions
    for (const id of idsToDelete) {
      runExecute('DELETE FROM mediaMentions WHERE id = @p0', [id]);
      result.duplicatesDeleted++;
    }

    // Step 3: Normalize all remaining URLs
    const remainingMentions = runQuery('SELECT id, link FROM mediaMentions');
    for (const mention of remainingMentions) {
      const normalized = normalizeUrlForComparison(mention.link);
      if (normalized && normalized !== mention.link) {
        runExecute('UPDATE mediaMentions SET link = @p0 WHERE id = @p1', [normalized, mention.id]);
        result.urlsNormalized++;
      }
    }

    // Create the unique index
    try {
      runExecute(
        'CREATE UNIQUE INDEX IF NOT EXISTS idx_mentions_url_client_unique ON mediaMentions(link, clientId)'
      );
      result.indexCreated = true;
    } catch (err) {
      result.errors.push(`Failed to create unique index: ${err.message}`);
    }

    // Verify the index exists
    const indices = runQuery(
      "SELECT name FROM sqlite_master WHERE type='index' AND name='idx_mentions_url_client_unique'"
    );
    result.indexExists = indices.length > 0;

    result.finishedAt = new Date().toISOString();
    result.success = result.errors.length === 0;

    sendJson(res, 200, result);
  } catch (err) {
    result.errors.push(err.message);
    result.success = false;
    sendJson(res, 500, result);
  }
}

const routes = [
  { method: 'GET', pattern: '/api/health', handler: healthCheck },
  { method: 'GET', pattern: '/api/verification-status', handler: verificationStatus },

  { method: 'GET', pattern: '/admin/pending-review', handler: listPendingReview },
  { method: 'GET', pattern: '/admin/pending-review/count', handler: getPendingReviewCount },
  { method: 'POST', pattern: '/admin/pending-review/:id/accept', handler: acceptPendingReview },
  { method: 'POST', pattern: '/admin/pending-review/:id/reject', handler: rejectPendingReview },

  { method: 'GET', pattern: '/admin/rss-feeds', handler: getRssFeedStatus },
  { method: 'POST', pattern: '/admin/rss-feeds/poll', handler: triggerRssPoll },

  { method: 'GET', pattern: '/admin/duplicates/inspect', handler: inspectDuplicates },
  { method: 'POST', pattern: '/admin/cleanup-duplicates', handler: cleanupDuplicates }
];

module.exports = {
  routes,
  healthCheck,
  verificationStatus,
  listPendingReview,
  acceptPendingReview,
  rejectPendingReview,
  getPendingReviewCount,
  triggerRssPoll,
  getRssFeedStatus,
  inspectDuplicates,
  cleanupDuplicates
};
