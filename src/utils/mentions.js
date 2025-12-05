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
    // Try to extract date from snippet if publishedAt is missing
    const mentionDate = normalizeDate(result.publishedAt) || extractDateFromSnippet(result.snippet) || now;

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

/**
 * Extract publication date from snippet text
 * Looks for patterns like "Nov 10, 2025", "December 3, 2025", "12/3/2025", etc.
 */
function extractDateFromSnippet(snippet) {
  if (!snippet) return null;

  // Pattern 1: "Month DD, YYYY" (e.g., "Nov 10, 2025", "December 3, 2025")
  const monthDayYearPattern = /\b(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+(\d{1,2}),?\s+(\d{4})\b/i;
  const match1 = snippet.match(monthDayYearPattern);
  if (match1) {
    const dateStr = `${match1[1]} ${match1[2]}, ${match1[3]}`;
    const parsed = new Date(dateStr);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toISOString();
    }
  }

  // Pattern 2: "YYYY-MM-DD" ISO format
  const isoPattern = /\b(\d{4})-(\d{2})-(\d{2})\b/;
  const match2 = snippet.match(isoPattern);
  if (match2) {
    const parsed = new Date(match2[0]);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toISOString();
    }
  }

  return null;
}

function cleanSnippet(snippet) {
  if (!snippet) return snippet;

  let cleaned = snippet;

  // Remove Google's timestamp prefixes like "7 hours ago ...", "2 days ago ...", etc.
  const timePatterns = [
    /^\d+\s+(second|minute|hour|day|week|month|year)s?\s+ago\s*[.\-…]*\s*/i,
    /^\d+\s+(sec|min|hr|hrs)s?\s+ago\s*[.\-…]*\s*/i
  ];

  for (const pattern of timePatterns) {
    cleaned = cleaned.replace(pattern, '');
  }

  // Remove dates from snippet to avoid confusion with mentionDate
  // Pattern 1: "Month DD, YYYY" (e.g., "Nov 10, 2025", "December 3, 2025")
  const monthDayYearPattern = /\b(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+(\d{1,2}),?\s+(\d{4})\b/gi;
  cleaned = cleaned.replace(monthDayYearPattern, '');

  // Pattern 2: "YYYY-MM-DD" ISO format
  const isoPattern = /\b(\d{4})-(\d{2})-(\d{2})\b/g;
  cleaned = cleaned.replace(isoPattern, '');

  // Clean up any double spaces or leading "... " artifacts
  cleaned = cleaned.replace(/\s+/g, ' ').replace(/^[.\-…\s]+/, '').trim();

  return cleaned;
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

  // Expanded sentiment keyword lists with domain-specific terms
  const positives = [
    // General positive
    'good', 'great', 'positive', 'success', 'win', 'wins', 'winning', 'excellent', 'outstanding',
    // Growth & expansion
    'growth', 'expands', 'expansion', 'growing', 'increases', 'rise', 'soars', 'surge', 'boosts',
    // Improvement
    'improves', 'improvement', 'better', 'enhanced', 'advancement', 'innovation', 'breakthrough',
    // Achievement
    'achieves', 'achievement', 'award', 'awarded', 'recognition', 'honored', 'celebrates',
    // Business positive
    'profit', 'revenue', 'profitable', 'thriving', 'flourishing', 'partnership', 'collaboration',
    // Agriculture/food specific
    'harvest', 'abundant', 'quality', 'fresh', 'organic', 'sustainable', 'certified'
  ];

  const negatives = [
    // General negative
    'bad', 'negative', 'poor', 'terrible', 'worst', 'failure', 'failed',
    // Decline
    'decline', 'declining', 'decrease', 'drop', 'drops', 'falling', 'plunges', 'slump',
    // Loss & damage
    'loss', 'losses', 'loses', 'losing', 'damage', 'damaged', 'destroyed', 'devastated',
    // Problems
    'problem', 'issue', 'concern', 'warning', 'alert', 'risk', 'threat', 'crisis',
    // Business negative
    'cuts', 'layoffs', 'bankruptcy', 'closes', 'shutdown', 'struggles',
    // Legal
    'lawsuit', 'sued', 'violation', 'recall', 'investigation', 'fraud',
    // Agriculture/food specific
    'contamination', 'outbreak', 'disease', 'pest', 'drought', 'shortage', 'spoiled'
  ];

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
