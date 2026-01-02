/**
 * @fileoverview Route handlers for all API endpoints
 */

const { runQuery, runExecute } = require('../db');
const { parseJsonBody, sendJson, escapeXml, formatDisplayDate } = require('../utils/http');
const { getStatus: getVerificationStatus } = require('../services/verificationStatus');
const { pollRssFeeds, loadClientsWithRssFeeds } = require('../services/rssService');
const {
  validate,
  createClientSchema,
  updateClientSchema,
  createPublicationSchema,
  updatePublicationSchema,
  createMediaMentionSchema,
  updateMediaMentionSchema,
  createFeedbackSummarySchema,
  updateFeedbackSummarySchema,
  createSearchJobSchema,
  updateSearchJobSchema,
  idParamSchema
} = require('../schemas');
const {
  createGetHandler,
  createUpdateHandler,
  createDeleteHandler,
  createListHandler
} = require('./helpers');

// ============================================================================
// CLIENT ROUTES
// ============================================================================

const listClients = createListHandler('clients');
const getClient = createGetHandler('clients', 'Client');
const updateClient = createUpdateHandler('clients', 'Client', updateClientSchema, [
  'name',
  'contactEmail',
  'alertsRssFeedUrl'
]);
const deleteClient = createDeleteHandler('clients', 'Client');

async function createClient(req, res) {
  try {
    const body = await parseJsonBody(req);
    const validation = validate(createClientSchema, body);
    if (!validation.success) {
      sendJson(res, 400, { error: validation.error });
      return;
    }
    const now = new Date().toISOString();
    const [client] = runQuery(
      'INSERT INTO clients (name, contactEmail, alertsRssFeedUrl, createdAt, updatedAt) VALUES (@p0, @p1, @p2, @p3, @p3) RETURNING *;',
      [
        validation.data.name,
        validation.data.contactEmail,
        validation.data.alertsRssFeedUrl || null,
        now
      ]
    );
    sendJson(res, 201, client);
  } catch (error) {
    sendJson(res, 400, { error: error.message });
  }
}

// ============================================================================
// PUBLICATION ROUTES
// ============================================================================

const listPublications = createListHandler('publications', {
  whereClause: "name != 'Unknown Source'"
});
const getPublication = createGetHandler('publications', 'Publication');
const updatePublication = createUpdateHandler(
  'publications',
  'Publication',
  updatePublicationSchema,
  ['name', 'website']
);
const deletePublication = createDeleteHandler('publications', 'Publication');

async function createPublication(req, res) {
  try {
    const body = await parseJsonBody(req);
    const validation = validate(createPublicationSchema, body);
    if (!validation.success) {
      sendJson(res, 400, { error: validation.error });
      return;
    }
    const now = new Date().toISOString();
    const [publication] = runQuery(
      'INSERT INTO publications (name, website, createdAt, updatedAt) VALUES (@p0, @p1, @p2, @p2) RETURNING *;',
      [validation.data.name, validation.data.website || null, now]
    );
    sendJson(res, 201, publication);
  } catch (error) {
    sendJson(res, 400, { error: error.message });
  }
}

// ============================================================================
// MEDIA MENTION ROUTES
// ============================================================================

const getMediaMention = createGetHandler('mediaMentions', 'Media mention');
const updateMediaMention = createUpdateHandler(
  'mediaMentions',
  'Media mention',
  updateMediaMentionSchema,
  [
    'title',
    'subjectMatter',
    'mentionDate',
    'reMentionDate',
    'link',
    'source',
    'sentiment',
    'status',
    'clientId',
    'publicationId',
    'verified'
  ]
);
async function deleteMediaMention(_req, res, params) {
  const validation = validate(idParamSchema, params);
  if (!validation.success) {
    sendJson(res, 400, { error: validation.error });
    return;
  }

  // Fetch mention with client and publication names before deleting
  const [mention] = runQuery(
    `SELECT
      m.*,
      c.name as clientName,
      p.name as publicationName
     FROM mediaMentions m
     JOIN clients c ON m.clientId = c.id
     JOIN publications p ON m.publicationId = p.id
     WHERE m.id = @p0;`,
    [validation.data.id]
  );

  if (!mention) {
    sendJson(res, 404, { error: 'Media mention not found' });
    return;
  }

  // Archive to deletedMentions table
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
      mention.verified,
      mention.clientId,
      mention.clientName,
      mention.publicationId,
      mention.publicationName
    ]
  );

  // Delete from mediaMentions
  runQuery('DELETE FROM mediaMentions WHERE id = @p0;', [validation.data.id]);

  sendJson(res, 200, mention);
}

async function listMediaMentions(req, res) {
  const url = new URL(req.url, 'http://localhost');
  const filters = [];
  const params = [];
  if (url.searchParams.get('clientId')) {
    params.push(Number(url.searchParams.get('clientId')));
    filters.push(`clientId=@p${params.length - 1}`);
  }
  if (url.searchParams.get('publicationId')) {
    params.push(Number(url.searchParams.get('publicationId')));
    filters.push(`publicationId=@p${params.length - 1}`);
  }
  if (url.searchParams.get('startDate')) {
    params.push(url.searchParams.get('startDate'));
    filters.push(`mentionDate >= @p${params.length - 1}`);
  }
  if (url.searchParams.get('endDate')) {
    params.push(url.searchParams.get('endDate'));
    filters.push(`mentionDate <= @p${params.length - 1}`);
  }
  if (url.searchParams.get('subject')) {
    params.push(`%${url.searchParams.get('subject')}%`);
    filters.push(`subjectMatter LIKE @p${params.length - 1}`);
  }
  const whereClause = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
  const mentions = runQuery(
    `SELECT * FROM mediaMentions ${whereClause} ORDER BY mentionDate DESC, id DESC;`,
    params
  );
  sendJson(res, 200, mentions);
}

async function createMediaMention(req, res) {
  try {
    const body = await parseJsonBody(req);
    const validation = validate(createMediaMentionSchema, body);
    if (!validation.success) {
      sendJson(res, 400, { error: validation.error });
      return;
    }
    const d = validation.data;
    const now = new Date().toISOString();
    const [mention] = runQuery(
      `INSERT INTO mediaMentions (title, subjectMatter, mentionDate, reMentionDate, link, source, sentiment, status, clientId, publicationId, createdAt, updatedAt)
       VALUES (@p0, @p1, @p2, @p3, @p4, @p5, @p6, @p7, @p8, @p9, @p10, @p10) RETURNING *;`,
      [
        d.title,
        d.subjectMatter || '',
        d.mentionDate,
        d.reMentionDate || null,
        d.link || '',
        d.source || null,
        d.sentiment || null,
        d.status || 'new',
        d.clientId,
        d.publicationId,
        now
      ]
    );
    sendJson(res, 201, mention);
  } catch (error) {
    sendJson(res, 400, { error: error.message });
  }
}

// ============================================================================
// FEEDBACK SUMMARY ROUTES
// ============================================================================

const listFeedbackSummaries = createListHandler('feedbackSummaries');
const getFeedbackSummary = createGetHandler('feedbackSummaries', 'Feedback summary');
const updateFeedbackSummary = createUpdateHandler(
  'feedbackSummaries',
  'Feedback summary',
  updateFeedbackSummarySchema,
  ['clientId', 'summary', 'rating', 'period']
);
const deleteFeedbackSummary = createDeleteHandler('feedbackSummaries', 'Feedback summary');

async function createFeedbackSummary(req, res) {
  try {
    const body = await parseJsonBody(req);
    const validation = validate(createFeedbackSummarySchema, body);
    if (!validation.success) {
      sendJson(res, 400, { error: validation.error });
      return;
    }
    const d = validation.data;
    const now = new Date().toISOString();
    const [summary] = runQuery(
      'INSERT INTO feedbackSummaries (clientId, summary, rating, period, createdAt, updatedAt) VALUES (@p0, @p1, @p2, @p3, @p4, @p4) RETURNING *;',
      [d.clientId, d.summary, d.rating || null, d.period || null, now]
    );
    sendJson(res, 201, summary);
  } catch (error) {
    sendJson(res, 400, { error: error.message });
  }
}

// ============================================================================
// SEARCH JOB ROUTES
// ============================================================================

const listSearchJobs = createListHandler('searchJobs');
const getSearchJob = createGetHandler('searchJobs', 'Search job');
const updateSearchJob = createUpdateHandler('searchJobs', 'Search job', updateSearchJobSchema, [
  'clientId',
  'query',
  'status',
  'scheduledAt',
  'completedAt'
]);
const deleteSearchJob = createDeleteHandler('searchJobs', 'Search job');

async function createSearchJob(req, res) {
  try {
    const body = await parseJsonBody(req);
    const validation = validate(createSearchJobSchema, body);
    if (!validation.success) {
      sendJson(res, 400, { error: validation.error });
      return;
    }
    const d = validation.data;
    const now = new Date().toISOString();
    const [job] = runQuery(
      'INSERT INTO searchJobs (clientId, query, status, scheduledAt, completedAt, createdAt, updatedAt) VALUES (@p0, @p1, @p2, @p3, @p4, @p5, @p5) RETURNING *;',
      [d.clientId, d.query, d.status || 'pending', d.scheduledAt, d.completedAt || null, now]
    );
    sendJson(res, 201, job);
  } catch (error) {
    sendJson(res, 400, { error: error.message });
  }
}

// ============================================================================
// EXPORT ROUTES
// ============================================================================

function buildExcelXml(rows, { clientName } = {}) {
  const styles = `
    <Styles>
      <Style ss:ID="Title">
        <Font ss:Bold="1" ss:Size="14" />
      </Style>
      <Style ss:ID="Header">
        <Font ss:Bold="1" />
        <Alignment ss:Horizontal="Center" ss:Vertical="Center" />
        <Interior ss:Color="#E8EDF5" ss:Pattern="Solid" />
        <Borders>
          <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" />
          <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" />
          <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" />
          <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" />
        </Borders>
      </Style>
      <Style ss:ID="Cell">
        <Borders>
          <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" />
          <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" />
          <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" />
          <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" />
        </Borders>
      </Style>
      <Style ss:ID="Date" ss:Parent="Cell">
        <NumberFormat ss:Format="mmm d, yyyy h:mm AM/PM" />
      </Style>
      <Style ss:ID="Link" ss:Parent="Cell">
        <Font ss:Color="#0563C1" ss:Underline="Single" />
      </Style>
    </Styles>`;

  const columns = [
    { title: 'Date', width: 120, style: 'Date' },
    { title: 'Publication Name', width: 180, style: 'Cell' },
    { title: 'Title', width: 300, style: 'Cell' },
    { title: 'Topic', width: 160, style: 'Cell' },
    { title: 'Additional Mentions', width: 160, style: 'Cell' },
    { title: 'Link', width: 220, style: 'Link' }
  ];

  const header = `<?xml version="1.0"?>
  <Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
    xmlns:o="urn:schemas-microsoft-com:office:office"
    xmlns:x="urn:schemas-microsoft-com:office:excel"
    xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
    ${styles}
    <Worksheet ss:Name="Media Mentions">
      <Table>`;
  const footer = '</Table></Worksheet></Workbook>';
  const titleRow = clientName
    ? `<Row><Cell ss:MergeAcross="${columns.length - 1}" ss:StyleID="Title"><Data ss:Type="String">${escapeXml(
        `${clientName} Media Mentions`
      )}</Data></Cell></Row>`
    : '';
  const columnDefs = columns
    .map((col) => `<Column ss:AutoFitWidth="0" ss:Width="${col.width}" />`)
    .join('');
  const headerRow = `<Row>${columns
    .map(
      (col) =>
        `<Cell ss:StyleID="Header"><Data ss:Type="String">${escapeXml(col.title)}</Data></Cell>`
    )
    .join('')}</Row>`;
  const dataRows = rows
    .map((row) => {
      const values = [
        formatDisplayDate(row.mentionDate) || '',
        row.source || row.publicationName || '',
        row.title || '',
        row.subjectMatter || '',
        formatDisplayDate(row.reMentionDate) || '',
        row.link || ''
      ];

      return `<Row>${values
        .map((value, idx) => {
          const style = columns[idx].style;
          const hrefAttr = idx === 5 && value ? ` ss:HRef="${escapeXml(value)}"` : '';
          return `<Cell ss:StyleID="${style}"${hrefAttr}><Data ss:Type="String">${escapeXml(value)}</Data></Cell>`;
        })
        .join('')}</Row>`;
    })
    .join('');

  return `${header}${columnDefs}${titleRow}${headerRow}${dataRows}${footer}`;
}

async function exportMentions(_req, res, params) {
  const validation = validate(idParamSchema, params);
  if (!validation.success) {
    sendJson(res, 400, { error: validation.error });
    return;
  }
  const clientId = validation.data.id;
  const [client] = runQuery('SELECT name FROM clients WHERE id=@p0;', [clientId]);
  const url = new URL(_req.url, 'http://localhost');
  const filters = ['mm.clientId=@p0'];
  const values = [clientId];
  if (url.searchParams.get('publicationId')) {
    values.push(Number(url.searchParams.get('publicationId')));
    filters.push(`mm.publicationId=@p${values.length - 1}`);
  }
  if (url.searchParams.get('startDate')) {
    values.push(url.searchParams.get('startDate'));
    filters.push(`mm.mentionDate >= @p${values.length - 1}`);
  }
  if (url.searchParams.get('endDate')) {
    values.push(url.searchParams.get('endDate'));
    filters.push(`mm.mentionDate <= @p${values.length - 1}`);
  }
  const whereClause = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
  const rows = runQuery(
    `SELECT mm.mentionDate, COALESCE(mm.source, p.name) as source, p.name as publicationName, mm.title, mm.subjectMatter, mm.reMentionDate, mm.link
     FROM mediaMentions mm
     LEFT JOIN publications p ON mm.publicationId = p.id
     ${whereClause}
     ORDER BY mm.mentionDate DESC, mm.id DESC;`,
    values
  );
  const xml = buildExcelXml(rows, { clientName: client?.name });
  res.writeHead(200, {
    'Content-Type': 'application/vnd.ms-excel',
    'Content-Disposition': `attachment; filename="media-mentions-${client?.name || clientId}.xls"`
  });
  res.end(xml);
}

function verificationStatus(_req, res) {
  const status = getVerificationStatus();
  sendJson(res, 200, status);
}

function exportFalsePositives(req, res) {
  const mentions = runQuery(`
    SELECT
      m.id,
      c.name as clientName,
      m.title,
      m.link,
      m.source,
      m.mentionDate,
      m.createdAt,
      m.verified
    FROM mediaMentions m
    JOIN clients c ON m.clientId = c.id
    WHERE m.verified = 0
    ORDER BY m.createdAt DESC
  `);

  const headers = [
    'Client',
    'Title',
    'URL',
    'Source',
    'Mention Date',
    'Created At',
    'Verified',
    'ID'
  ];
  const escapeCSV = (value) => {
    if (value === null || value === undefined) return '';
    const str = String(value);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const rows = [headers.join(',')];
  mentions.forEach((m) => {
    rows.push(
      [m.clientName, m.title, m.link, m.source, m.mentionDate, m.createdAt, m.verified, m.id]
        .map(escapeCSV)
        .join(',')
    );
  });

  const csv = rows.join('\n');

  res.writeHead(200, {
    'Content-Type': 'text/csv',
    'Content-Disposition': `attachment; filename="false-positives-${new Date().toISOString().split('T')[0]}.csv"`,
    'Access-Control-Allow-Origin': '*'
  });
  res.end(csv);
}

function exportDeletedMentions(req, res) {
  const mentions = runQuery(`
    SELECT
      id,
      originalMentionId,
      clientName,
      title,
      link,
      source,
      mentionDate,
      status,
      verified,
      deletedAt
    FROM deletedMentions
    ORDER BY deletedAt DESC
  `);

  const headers = [
    'Client',
    'Title',
    'URL',
    'Source',
    'Mention Date',
    'Status',
    'Verified',
    'Deleted At',
    'Original ID',
    'Deleted ID'
  ];
  const escapeCSV = (value) => {
    if (value === null || value === undefined) return '';
    const str = String(value);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const rows = [headers.join(',')];
  mentions.forEach((m) => {
    rows.push(
      [
        m.clientName,
        m.title,
        m.link,
        m.source,
        m.mentionDate,
        m.status,
        m.verified,
        m.deletedAt,
        m.originalMentionId,
        m.id
      ]
        .map(escapeCSV)
        .join(',')
    );
  });

  const csv = rows.join('\n');

  res.writeHead(200, {
    'Content-Type': 'text/csv',
    'Content-Disposition': `attachment; filename="deleted-mentions-${new Date().toISOString().split('T')[0]}.csv"`,
    'Access-Control-Allow-Origin': '*'
  });
  res.end(csv);
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
// HEALTH CHECK
// ============================================================================

function healthCheck(_req, res) {
  sendJson(res, 200, { status: 'ok', timestamp: new Date().toISOString() });
}

// ============================================================================
// ADMIN: CLEANUP DUPLICATES
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
    indexCreated: false,
    errors: []
  };

  try {
    // Find duplicates
    const duplicates = runQuery(`
      SELECT link, clientId, COUNT(*) as count
      FROM mediaMentions
      GROUP BY link, clientId
      HAVING COUNT(*) > 1
      ORDER BY count DESC
    `);

    result.duplicatesFound = duplicates.length;

    if (duplicates.length > 0) {
      // For each duplicate, keep the oldest (smallest id) and delete the rest
      for (const dup of duplicates) {
        const mentions = runQuery(
          'SELECT id FROM mediaMentions WHERE link = @p0 AND clientId = @p1 ORDER BY id ASC',
          [dup.link, dup.clientId]
        );

        const deleteIds = mentions.slice(1).map((m) => m.id);

        for (const id of deleteIds) {
          runExecute('DELETE FROM mediaMentions WHERE id = @p0', [id]);
          result.duplicatesDeleted++;
        }
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

// ============================================================================
// ROUTE TABLE
// ============================================================================

const routes = [
  { method: 'GET', pattern: '/api/health', handler: healthCheck },
  { method: 'GET', pattern: '/clients', handler: listClients },
  { method: 'POST', pattern: '/clients', handler: createClient },
  { method: 'GET', pattern: '/clients/:id', handler: getClient },
  { method: 'PUT', pattern: '/clients/:id', handler: updateClient },
  { method: 'DELETE', pattern: '/clients/:id', handler: deleteClient },

  { method: 'GET', pattern: '/publications', handler: listPublications },
  { method: 'POST', pattern: '/publications', handler: createPublication },
  { method: 'GET', pattern: '/publications/:id', handler: getPublication },
  { method: 'PUT', pattern: '/publications/:id', handler: updatePublication },
  { method: 'DELETE', pattern: '/publications/:id', handler: deletePublication },

  { method: 'GET', pattern: '/media-mentions', handler: listMediaMentions },
  { method: 'POST', pattern: '/media-mentions', handler: createMediaMention },
  { method: 'GET', pattern: '/media-mentions/:id', handler: getMediaMention },
  { method: 'PUT', pattern: '/media-mentions/:id', handler: updateMediaMention },
  { method: 'DELETE', pattern: '/media-mentions/:id', handler: deleteMediaMention },

  { method: 'GET', pattern: '/feedback-summaries', handler: listFeedbackSummaries },
  { method: 'POST', pattern: '/feedback-summaries', handler: createFeedbackSummary },
  { method: 'GET', pattern: '/feedback-summaries/:id', handler: getFeedbackSummary },
  { method: 'PUT', pattern: '/feedback-summaries/:id', handler: updateFeedbackSummary },
  { method: 'DELETE', pattern: '/feedback-summaries/:id', handler: deleteFeedbackSummary },

  { method: 'GET', pattern: '/search-jobs', handler: listSearchJobs },
  { method: 'POST', pattern: '/search-jobs', handler: createSearchJob },
  { method: 'GET', pattern: '/search-jobs/:id', handler: getSearchJob },
  { method: 'PUT', pattern: '/search-jobs/:id', handler: updateSearchJob },
  { method: 'DELETE', pattern: '/search-jobs/:id', handler: deleteSearchJob },

  { method: 'GET', pattern: '/clients/:id/mentions/export', handler: exportMentions },
  { method: 'GET', pattern: '/api/clients/:id/mentions/export', handler: exportMentions },
  { method: 'GET', pattern: '/admin/false-positives/export', handler: exportFalsePositives },
  { method: 'GET', pattern: '/admin/deleted-mentions/export', handler: exportDeletedMentions },
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
  routes
};
