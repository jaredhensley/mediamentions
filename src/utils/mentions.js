const { runQuery } = require('../db');

function normalizeResult(result, client) {
  const domain = extractDomain(result.url);
  const source = domain || 'Unknown source';
  const sentiment = analyzeSentiment(result.title, result.snippet || '');

  return {
    ...result,
    clientId: client.id,
    clientName: client.name,
    source,
    sentiment,
    normalizedUrl: result.url.toLowerCase(),
    matchedPressReleaseId: null
  };
}

function extractDomain(url) {
  try {
    return new URL(url).hostname;
  } catch (err) {
    return null;
  }
}

function dedupeMentions(results) {
  const seen = new Set();
  return results.filter((result) => {
    const key = `${result.normalizedUrl}-${result.clientId}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

function associatePressRelease(result, pressReleases) {
  for (const release of pressReleases) {
    const matchesTitle = result.title.toLowerCase().includes(release.title.toLowerCase());
    const matchesKeyword = release.keywords.some((keyword) =>
      result.title.toLowerCase().includes(keyword.toLowerCase()) ||
      result.snippet.toLowerCase().includes(keyword.toLowerCase())
    );
    if (matchesTitle || matchesKeyword) {
      return release.id;
    }
  }
  return null;
}

function recordMentions(results, status) {
  const created = [];
  const publicationCache = new Map();

  for (const result of results) {
    const duplicate = runQuery('SELECT id FROM mediaMentions WHERE link=@p0 AND clientId=@p1 LIMIT 1;', [
      result.url,
      result.clientId
    ]);

    if (duplicate.length) {
      // Already stored for this client; skip creating a duplicate entry.
      // eslint-disable-next-line no-continue
      continue;
    }

    const publicationId = ensurePublication(result.source, publicationCache);
    if (!publicationId) {
      // eslint-disable-next-line no-continue
      continue;
    }

    const now = new Date().toISOString();
    const mentionDate = normalizeDate(result.publishedAt) || now;

    const cleanedSnippet = cleanSnippet(result.snippet);
    const [mention] = runQuery(
      'INSERT INTO mediaMentions (title, subjectMatter, mentionDate, reMentionDate, link, source, sentiment, status, clientId, publicationId, pressReleaseId, createdAt, updatedAt) VALUES (@p0, @p1, @p2, @p3, @p4, @p5, @p6, @p7, @p8, @p9, @p10, @p11, @p11) RETURNING *;',
      [
        result.title,
        cleanedSnippet || status || 'Mention',
        mentionDate,
        null,
        result.url,
        result.source,
        result.sentiment || null,
        status,
        result.clientId,
        publicationId,
        result.matchedPressReleaseId || null,
        now
      ]
    );

    created.push(mention);
  }

  return created;
}

function normalizeDate(value) {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString();
}

function cleanSnippet(snippet) {
  if (!snippet) return snippet;

  // Remove Google's timestamp prefixes like "7 hours ago ...", "2 days ago ...", etc.
  const timePatterns = [
    /^\d+\s+(second|minute|hour|day|week|month|year)s?\s+ago\s*[.\-…]*\s*/i,
    /^\d+\s+(sec|min|hr|hrs)s?\s+ago\s*[.\-…]*\s*/i
  ];

  let cleaned = snippet;
  for (const pattern of timePatterns) {
    cleaned = cleaned.replace(pattern, '');
  }

  return cleaned.trim();
}

function ensurePublication(domain, cache) {
  const cacheKey = domain || 'unknown';
  if (cache.has(cacheKey)) {
    return cache.get(cacheKey);
  }

  const websitePattern = domain ? `%${domain}%` : '%';
  const [existing] = domain
    ? runQuery(
        'SELECT id FROM publications WHERE LOWER(website) LIKE LOWER(@p0) OR LOWER(name) = LOWER(@p1) LIMIT 1;',
        [websitePattern, domain]
      ) || []
    : [];

  if (existing && existing.id) {
    cache.set(cacheKey, existing.id);
    return existing.id;
  }

  const [unknown] =
    runQuery('SELECT id FROM publications WHERE LOWER(name) = LOWER(@p0) LIMIT 1;', ['unknown source']) || [];

  if (unknown && unknown.id) {
    cache.set(cacheKey, unknown.id);
    return unknown.id;
  }

  return null;
}

function analyzeSentiment(title, snippet) {
  const text = `${title} ${snippet}`.toLowerCase();
  const positives = ['good', 'great', 'positive', 'growth', 'success', 'win', 'expands', 'improves'];
  const negatives = ['bad', 'decline', 'negative', 'loss', 'drop', 'lawsuit', 'fails', 'cuts'];

  const positiveHits = positives.some((word) => text.includes(word));
  const negativeHits = negatives.some((word) => text.includes(word));

  if (positiveHits && !negativeHits) return 'positive';
  if (negativeHits && !positiveHits) return 'negative';
  return 'neutral';
}

module.exports = {
  normalizeResult,
  dedupeMentions,
  associatePressRelease,
  recordMentions,
  extractDomain,
  cleanSnippet
};
