const { runQuery } = require('../db');

function normalizeResult(result, client) {
  const domain = extractDomain(result.url);
  const publication = domain || 'unknown';

  return {
    ...result,
    clientId: client.id,
    clientName: client.name,
    publication,
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

    const publicationId = ensurePublication(result.publication, result.url, publicationCache);
    if (!publicationId) {
      // eslint-disable-next-line no-continue
      continue;
    }

    const now = new Date().toISOString();
    const mentionDate = normalizeDate(result.publishedAt) || now;

    const [mention] = runQuery(
      'INSERT INTO mediaMentions (title, subjectMatter, mentionDate, link, clientId, publicationId, pressReleaseId, createdAt, updatedAt) VALUES (@p0, @p1, @p2, @p3, @p4, @p5, @p6, @p7, @p7) RETURNING *;',
      [
        result.title,
        result.snippet || status || 'Mention',
        mentionDate,
        result.url,
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

function ensurePublication(domain, url, cache) {
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
    : runQuery('SELECT id FROM publications WHERE LOWER(name) = LOWER(@p0) LIMIT 1;', ['Unknown publication']) || [];

  if (existing && existing.id) {
    cache.set(cacheKey, existing.id);
    return existing.id;
  }

  const now = new Date().toISOString();
  const name = domain || 'Unknown publication';
  const website = domain ? `https://${domain}` : url;
  const [created] = runQuery(
    'INSERT INTO publications (name, website, createdAt, updatedAt) VALUES (@p0, @p1, @p2, @p2) RETURNING *;',
    [name, website, now]
  );

  cache.set(cacheKey, created.id);
  return created.id;
}

module.exports = {
  normalizeResult,
  dedupeMentions,
  associatePressRelease,
  recordMentions
};
