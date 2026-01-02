const { runQuery } = require('../db');
const { broadcastNewMention } = require('../services/websocket');
const { config } = require('../config');

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
    normalizedUrl: result.url.toLowerCase()
  };
}

function extractDomain(url) {
  try {
    return new URL(url).hostname;
  } catch (_err) {
    return null;
  }
}

/**
 * Normalize URL for comparison purposes
 * Removes trailing slashes, lowercases, strips tracking params, normalizes protocol
 * @param {string} url - URL to normalize
 * @returns {string|null} - Normalized URL or null if invalid
 */
function normalizeUrlForComparison(url) {
  if (!url) return null;

  try {
    const parsed = new URL(url);

    // Normalize to https
    parsed.protocol = 'https:';

    // Remove common tracking params
    const trackingParams = [
      'utm_source',
      'utm_medium',
      'utm_campaign',
      'utm_content',
      'utm_term',
      'fbclid',
      'gclid',
      'ref',
      'source'
    ];
    trackingParams.forEach((param) => parsed.searchParams.delete(param));

    // Build normalized URL
    let normalized = `${parsed.protocol}//${parsed.hostname.toLowerCase()}${parsed.pathname}`;

    // Remove trailing slash (but keep root slash)
    if (
      normalized.endsWith('/') &&
      normalized.length > parsed.protocol.length + 2 + parsed.hostname.length + 1
    ) {
      normalized = normalized.slice(0, -1);
    }

    // Add remaining search params if any
    const remainingParams = parsed.searchParams.toString();
    if (remainingParams) {
      normalized += `?${remainingParams}`;
    }

    return normalized.toLowerCase();
  } catch {
    return null;
  }
}

/**
 * Check if a URL should be blocked based on patterns and domains
 * These are typically listing pages, search results, or aggregator sites
 * Patterns and domains are configured in config.filters
 * @param {string} url - URL to check
 * @param {string} [source] - Source domain (optional, for domain check)
 * @returns {boolean} - True if URL should be blocked
 */
function isBlockedUrl(url, source) {
  if (!url) return false;

  const { blockedUrlPatterns, blockedDomains } = config.filters;

  // Check URL patterns
  for (const pattern of blockedUrlPatterns) {
    if (pattern.test(url)) {
      return true;
    }
  }

  // Check blocked domains
  const urlLower = url.toLowerCase();
  const sourceLower = (source || '').toLowerCase();

  for (const domain of blockedDomains) {
    if (urlLower.includes(domain) || sourceLower.includes(domain)) {
      return true;
    }
  }

  return false;
}

/**
 * Deduplicate mentions within a batch by URL or title
 * Keeps the first occurrence when duplicates are found
 * @param {Array} results - Array of normalized mention results
 * @returns {Array} - Deduplicated results
 */
function dedupeMentions(results) {
  const seenUrls = new Set();
  const seenTitles = new Set();

  return results.filter((result) => {
    const urlKey = `url:${result.normalizedUrl}-${result.clientId}`;
    const normalizedTitle = (result.title || '').toLowerCase().trim();
    const titleKey = `title:${normalizedTitle}-${result.clientId}`;

    // Check if we've seen this URL or title before for this client
    if (seenUrls.has(urlKey) || (normalizedTitle && seenTitles.has(titleKey))) {
      return false;
    }

    seenUrls.add(urlKey);
    if (normalizedTitle) {
      seenTitles.add(titleKey);
    }
    return true;
  });
}

function recordMentions(results, status) {
  if (!results.length) return [];

  const created = [];
  const publicationCache = new Map();

  // Batch duplicate check: collect all URL+clientId and title+clientId pairs and check in one query
  // This fixes N+1 query pattern (was running 1 query per result)
  const existingSet = new Set();

  // Build a set of existing link+clientId and title+clientId combinations
  // Group by clientId for efficient querying
  const clientGroups = new Map();
  for (const result of results) {
    if (!clientGroups.has(result.clientId)) {
      clientGroups.set(result.clientId, { urls: [], titles: [] });
    }
    const normalizedUrl = normalizeUrlForComparison(result.url) || result.url;
    const normalizedTitle = (result.title || '').toLowerCase().trim();
    clientGroups.get(result.clientId).urls.push(normalizedUrl);
    clientGroups.get(result.clientId).titles.push(normalizedTitle);
  }

  // Query existing mentions for each client (reduces N queries to M queries where M = unique clients)
  for (const [clientId, { urls, titles }] of clientGroups) {
    // Use IN clause for batch lookup - check both URL and title
    const urlPlaceholders = urls.map((_, i) => `@p${i}`).join(', ');
    const titlePlaceholders = titles.map((_, i) => `@p${urls.length + i}`).join(', ');
    const existing = runQuery(
      `SELECT link, LOWER(TRIM(title)) as normalizedTitle FROM mediaMentions
       WHERE clientId = @p${urls.length + titles.length}
       AND (link IN (${urlPlaceholders}) OR LOWER(TRIM(title)) IN (${titlePlaceholders}))`,
      [...urls, ...titles, clientId]
    );
    for (const row of existing) {
      // Add both URL and title-based keys to catch duplicates by either
      existingSet.add(`url:${row.link}-${clientId}`);
      existingSet.add(`title:${row.normalizedTitle}-${clientId}`);
    }
  }

  // Now process results, skipping duplicates
  for (const result of results) {
    // Normalize the URL and title before checking for duplicates and storing
    const normalizedUrl = normalizeUrlForComparison(result.url) || result.url;
    const normalizedTitle = (result.title || '').toLowerCase().trim();

    const urlKey = `url:${normalizedUrl}-${result.clientId}`;
    const titleKey = `title:${normalizedTitle}-${result.clientId}`;

    if (existingSet.has(urlKey) || existingSet.has(titleKey)) {
      // Already stored for this client (by URL or title); skip creating a duplicate entry.
      continue;
    }

    // Skip blocked URLs (search pages, category archives, aggregator sites)
    if (isBlockedUrl(result.url, result.source)) {
      continue;
    }

    // Add to existingSet so we don't create duplicates within this batch
    existingSet.add(urlKey);
    existingSet.add(titleKey);

    const publicationId = ensurePublication(result.source, publicationCache);
    if (!publicationId) {
      continue;
    }

    const now = new Date().toISOString();
    // Try to extract date from snippet if publishedAt is missing
    const mentionDate =
      normalizeDate(result.publishedAt) || extractDateFromSnippet(result.snippet) || now;

    const cleanedSnippet = cleanSnippet(result.snippet);
    const [mention] = runQuery(
      'INSERT INTO mediaMentions (title, subjectMatter, mentionDate, reMentionDate, link, source, sentiment, status, clientId, publicationId, verified, createdAt, updatedAt) VALUES (@p0, @p1, @p2, @p3, @p4, @p5, @p6, @p7, @p8, @p9, @p10, @p11, @p11) RETURNING *;',
      [
        result.title,
        cleanedSnippet || status || 'Mention',
        mentionDate,
        null,
        normalizedUrl, // Store normalized URL
        result.source,
        result.sentiment || null,
        status,
        result.clientId,
        publicationId,
        null, // verified = NULL means pending until auto-verification runs
        now
      ]
    );

    // Broadcast new mention via WebSocket
    broadcastNewMention(mention);

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
  const monthDayYearPattern =
    /\b(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+(\d{1,2}),?\s+(\d{4})\b/i;
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
  const monthDayYearPattern =
    /\b(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+(\d{1,2}),?\s+(\d{4})\b/gi;
  cleaned = cleaned.replace(monthDayYearPattern, '');

  // Pattern 2: "YYYY-MM-DD" ISO format
  const isoPattern = /\b(\d{4})-(\d{2})-(\d{2})\b/g;
  cleaned = cleaned.replace(isoPattern, '');

  // Clean up any double spaces or leading "... " artifacts
  cleaned = cleaned
    .replace(/\s+/g, ' ')
    .replace(/^[.\-…\s]+/, '')
    .trim();

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
    runQuery('SELECT id FROM publications WHERE LOWER(name) = LOWER(@p0) LIMIT 1;', [
      'unknown source'
    ]) || [];

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
    'good',
    'great',
    'positive',
    'success',
    'win',
    'wins',
    'winning',
    'excellent',
    'outstanding',
    // Growth & expansion
    'growth',
    'expands',
    'expansion',
    'growing',
    'increases',
    'rise',
    'soars',
    'surge',
    'boosts',
    // Improvement
    'improves',
    'improvement',
    'better',
    'enhanced',
    'advancement',
    'innovation',
    'breakthrough',
    // Achievement
    'achieves',
    'achievement',
    'award',
    'awarded',
    'recognition',
    'honored',
    'celebrates',
    // Business positive
    'profit',
    'revenue',
    'profitable',
    'thriving',
    'flourishing',
    'partnership',
    'collaboration',
    // Agriculture/food specific
    'harvest',
    'abundant',
    'quality',
    'fresh',
    'organic',
    'sustainable',
    'certified'
  ];

  const negatives = [
    // General negative
    'bad',
    'negative',
    'poor',
    'terrible',
    'worst',
    'failure',
    'failed',
    // Decline
    'decline',
    'declining',
    'decrease',
    'drop',
    'drops',
    'falling',
    'plunges',
    'slump',
    // Loss & damage
    'loss',
    'losses',
    'loses',
    'losing',
    'damage',
    'damaged',
    'destroyed',
    'devastated',
    // Problems
    'problem',
    'issue',
    'concern',
    'warning',
    'alert',
    'risk',
    'threat',
    'crisis',
    // Business negative
    'cuts',
    'layoffs',
    'bankruptcy',
    'closes',
    'shutdown',
    'struggles',
    // Legal
    'lawsuit',
    'sued',
    'violation',
    'recall',
    'investigation',
    'fraud',
    // Agriculture/food specific
    'contamination',
    'outbreak',
    'disease',
    'pest',
    'drought',
    'shortage',
    'spoiled'
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
  recordMentions,
  extractDomain,
  normalizeUrlForComparison,
  cleanSnippet,
  isBlockedUrl
};
