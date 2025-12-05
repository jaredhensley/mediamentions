const { extractDomain } = require("./mentions");

/**
 * Generate common variations of a client name for fuzzy matching
 * @param {string} name - The client name
 * @returns {string[]} - Array of name variations
 */
function getNameVariations(name) {
  const variations = [name.toLowerCase()];

  // Handle "sweetpotato" vs "sweet potato"
  if (name.toLowerCase().includes('sweetpotato')) {
    variations.push(name.toLowerCase().replace('sweetpotato', 'sweet potato'));
  }
  if (name.toLowerCase().includes('sweet potato')) {
    variations.push(name.toLowerCase().replace('sweet potato', 'sweetpotato'));
  }

  // Handle "Colombia" vs "Colombian" (common misspelling)
  if (name.toLowerCase().includes('colombia')) {
    variations.push(name.toLowerCase().replace('colombia', 'colombian'));
  }

  // Handle "Full Tilt" vs "FullTilt" (brand sometimes writes as one word)
  if (name.toLowerCase().includes('full tilt')) {
    variations.push(name.toLowerCase().replace('full tilt', 'fulltilt'));
  }

  // Handle "Colombia Avocado Board" vs "Avocados from Colombia" (brand name)
  if (name.toLowerCase().includes('colombia avocado')) {
    variations.push('avocados from colombia');
  }

  // Handle "South Texas Onion Committee" vs "Texas 1015" (famous onion variety)
  if (name.toLowerCase().includes('south texas onion')) {
    variations.push('texas 1015');
    variations.push('1015 onion');
  }

  // Handle "Michigan Asparagus Advisory Board" vs "MAAB" abbreviation
  if (name.toLowerCase().includes('michigan asparagus')) {
    variations.push('maab');
  }

  return variations;
}

/**
 * Check if any word from a list appears in the text
 * @param {string} text - Text to search in
 * @param {string[]} words - Words to search for
 * @returns {number} - Count of matches
 */
function countMatches(text, words = []) {
  if (!text || !words.length) return 0;
  const lower = text.toLowerCase();
  return words.filter((word) => lower.includes(word.toLowerCase())).length;
}

/**
 * Detect if snippet contains non-editorial patterns (sponsor lists, directories, etc.)
 * @param {string} snippet - Snippet text to analyze
 * @returns {boolean} - True if snippet appears to be non-editorial
 */
function isNonEditorialPattern(snippet) {
  const lower = snippet.toLowerCase();

  // Sponsor/partner list patterns
  const sponsorPatterns = [
    /sponsor(?:s|ed by)?[\s:]+/i,
    /partner(?:s)?[\s:]+/i,
    /member(?:s)?[\s:]+/i,
    /supporter(?:s)?[\s:]+/i,
    /supporter(?:s)? include/i,
    /founding partner/i,
    /\bthanks?\s+to\s+(?:our\s+)?sponsor/i,
  ];

  // Directory/listing patterns
  const directoryPatterns = [
    /address|phone|map|reviews|rating/i,
    /contact us|email|location/i,
    /\d{3}[-.\s]\d{3}[-.\s]\d{4}/, // phone numbers
    /\b\d{5}\b/, // zip codes
    /^(?:about|contact|location|address|hours)/i,
  ];

  // Generic page patterns (events, marketing, navigation)
  const genericPagePatterns = [
    /^events?\s*[-|]?/i,
    /^marketing\s*[-|]?/i,
    /^news\s*[-|]?/i,
    /^about\s*[-|]?/i,
    /^contact\s*[-|]?/i,
    /^upcoming events/i,
    /^calendar/i,
  ];

  // Label-only patterns (no verbs or editorial content)
  const labelPatterns = [
    /^[^-]+ - homepage$/i,
    /^[^-]+ inc\.?$/i,
    /^[^-]+ logo$/i,
    /^about [^-]+$/i,
  ];

  // Check for sponsor patterns
  for (const pattern of sponsorPatterns) {
    if (pattern.test(lower)) {
      return true;
    }
  }

  // Check for directory patterns
  for (const pattern of directoryPatterns) {
    if (pattern.test(lower)) {
      return true;
    }
  }

  // Check for generic page patterns
  for (const pattern of genericPagePatterns) {
    if (pattern.test(snippet.trim())) {
      return true;
    }
  }

  // Check for label-only patterns
  for (const pattern of labelPatterns) {
    if (pattern.test(snippet.trim())) {
      return true;
    }
  }

  return false;
}

/**
 * Detect if snippet contains editorial language (verbs, actions, statements)
 * @param {string} snippet - Snippet text to analyze
 * @returns {boolean} - True if snippet appears to be editorial content
 */
function hasEditorialLanguage(snippet) {
  const lower = snippet.toLowerCase();

  // Editorial action verbs and patterns
  const editorialPatterns = [
    /\bannounced?\b/,
    /\bpartner(?:ed|ing)\s+with\b/,
    /\bexpanded?\b/,
    /\bappointed?\b/,
    /\bjoined?\b/,
    /\blaunched?\b/,
    /\bintroduced?\b/,
    /\breleased?\b/,
    /\bunveiled?\b/,
    /\breveals?\b/,
    /\bis\s+(?:a\s+)?leading\b/,
    /\badvocate(?:s|d)?\s+for\b/,
    /\bwork(?:s|ed|ing)\s+(?:with|on|to)\b/,
    /\bprovide(?:s|d)?\b/,
    /\bserve(?:s|d)?\b/,
    /\bhelp(?:s|ed|ing)?\b/,
    /\bsupport(?:s|ed|ing)?\b/,
    /\bname(?:d|s)\b/,
    /\bwin(?:s|ning)?\b/,
    /\breceive(?:d|s)?\b/,
    /\bearn(?:ed|s)?\b/,
    /\baward(?:ed|s)?\b/,
    /\bsaid\b/,
    /\bstate(?:d|s)?\b/,
    /\bexplain(?:ed|s)?\b/,
    /\bnote(?:d|s)?\b/,
    /\baccording to\b/,
    /\bplan(?:s|ned|ning)?\s+to\b/,
    /\bseek(?:s|ing)?\s+to\b/,
    /\baim(?:s|ing)?\s+to\b/,
    /\bhas\s+(?:been|launched|opened|created|developed)\b/,
    /\bwill\s+(?:launch|open|expand|introduce|release)\b/,
    /\brecently\s+(?:announced|launched|opened|expanded)\b/,
    /\bnew\s+(?:program|initiative|partnership|campaign|product)\b/,
    /\bfeatured?\b/,
    /\bhighlighted?\b/,
    /\bspotlighted?\b/,
    /\bprofile(?:d|s)?\b/,
    /\binterview(?:ed|s)?\b/,
  ];

  for (const pattern of editorialPatterns) {
    if (pattern.test(lower)) {
      return true;
    }
  }

  // Check if snippet has sentence structure (contains verbs and is not just a list)
  // Look for common verb forms
  const hasVerb = /\b(?:is|are|was|were|has|have|had|will|would|can|could|may|might|should|must|do|does|did)\b/i.test(snippet);
  const hasSentence = snippet.includes('.') || snippet.includes(',');
  const notJustList = !/^[A-Z][a-z]+(?:,\s+[A-Z][a-z]+)*\.?$/i.test(snippet.trim());

  return hasVerb && hasSentence && notJustList;
}

/**
 * Extract date from snippet prefix (e.g., "Nov 21, 2024 —" or "3 days ago —")
 * Google often prefixes snippets with article dates
 * @param {string} snippet - Snippet text to parse
 * @returns {Date|null} - Parsed date or null if not found
 */
function extractSnippetDate(snippet) {
  if (!snippet) return null;

  // Pattern 1: "Nov 21, 2024 —" or "December 3, 2024 —"
  const absoluteDateMatch = snippet.match(/^([A-Z][a-z]{2,8})\s+(\d{1,2}),?\s+(\d{4})\s*[—\-–]/);
  if (absoluteDateMatch) {
    const [, month, day, year] = absoluteDateMatch;
    const dateStr = `${month} ${day}, ${year}`;
    const parsed = new Date(dateStr);
    if (!isNaN(parsed.getTime())) {
      return parsed;
    }
  }

  // Pattern 2: "3 days ago —" or "2 weeks ago —"
  const relativeMatch = snippet.match(/^(\d+)\s+(second|minute|hour|day|week|month|year)s?\s+ago\s*[—\-–]/i);
  if (relativeMatch) {
    const [, amount, unit] = relativeMatch;
    const now = new Date();
    const multipliers = {
      second: 1000,
      minute: 60 * 1000,
      hour: 60 * 60 * 1000,
      day: 24 * 60 * 60 * 1000,
      week: 7 * 24 * 60 * 60 * 1000,
      month: 30 * 24 * 60 * 60 * 1000,
      year: 365 * 24 * 60 * 60 * 1000
    };
    const offset = parseInt(amount) * (multipliers[unit.toLowerCase()] || 0);
    return new Date(now.getTime() - offset);
  }

  return null;
}

/**
 * Detect if URL appears to be a category/index page rather than an article
 * @param {string} url - URL to check
 * @returns {boolean} - True if URL matches category page patterns
 */
function isCategoryPage(url) {
  if (!url) return false;

  const urlLower = url.toLowerCase();

  // Category page URL patterns
  const categoryPatterns = [
    /\/commodities\//,
    /\/categories\//,
    /\/topics?\//,
    /\/tags?\//,
    /\/archive/,
    /\/all-conventions\//,
    /\/sightings/,
    /\/sustainability$/,
    /\/produce-living$/,
    /\/people$/,
    /\/headlines$/,
    /\/news$/,
    /\/events$/,
    /\/resources$/,
    /\?category=/,
    /\?tag=/,
    /\?topic=/,
  ];

  return categoryPatterns.some(pattern => pattern.test(urlLower));
}

/**
 * Social media domains to exclude from all results
 * Social posts/comments are not editorial media mentions
 */
const SOCIAL_MEDIA_DOMAINS = [
  'facebook.com',
  'twitter.com',
  'x.com',
  'instagram.com',
  'linkedin.com',
  'reddit.com',
  'tiktok.com',
  'youtube.com',
  'pinterest.com',
  'snapchat.com',
  'threads.net'
];

/**
 * Score and filter search results based on client profile
 * GOOGLE SEARCH PHASE: Sniper rifle approach for highest-precision hits
 * - Name MUST appear in snippet (hard requirement - snippet is the actual content excerpt)
 * - Snippet validates with editorial language
 * - Rejects sponsor lists, directories, and logo appearances
 * - Own domains are auto-rejects
 * - Social media posts are auto-rejects
 * - ExcludeWords are hard brakes
 *
 * Note: ~80% of mentions will come from tiered publication scraping later
 * This phase prioritizes precision over recall
 *
 * @param {Array} results - Search results to filter
 * @param {Object} profile - Client search profile
 * @param {Object} client - Client object
 * @returns {Array} - Filtered results
 */
function filterResultsForClient(results, profile, client) {
  const nameVariations = getNameVariations(client.name);
  const excludeWords = (profile.excludeWords || []).map((word) =>
    word.toLowerCase()
  );
  const excludeDomains = (profile.ownDomains || []).map((domain) =>
    domain.toLowerCase()
  );

  const rejectionLog = [];

  // Calculate the 180-day threshold for article dates
  const now = new Date();
  const dateThreshold = new Date(now.getTime() - (180 * 24 * 60 * 60 * 1000));

  const filtered = results.filter((result) => {
    const title = result.title || "";
    const snippet = result.snippet || "";
    const titleLower = title.toLowerCase();
    const snippetLower = snippet.toLowerCase();

    // Check if name appears in snippet (for diagnostic logging)
    const nameInSnippet = nameVariations.some(variant => snippetLower.includes(variant));

    // RULE 0: Article date must be within 180-day window
    // This catches aggregator sites hosting old articles
    // Check both meta tag date (publishedAt) and snippet prefix date
    const metaDate = result.publishedAt ? new Date(result.publishedAt) : null;
    const snippetDate = extractSnippetDate(snippet);

    // Use snippet date if available, otherwise fall back to meta date
    const articleDate = snippetDate || metaDate;

    if (articleDate && !isNaN(articleDate.getTime()) && articleDate < dateThreshold) {
      const daysOld = Math.floor((now - articleDate) / (24 * 60 * 60 * 1000));
      rejectionLog.push({
        reason: 'article_too_old',
        title,
        snippet,
        url: result.url,
        publishedAt: articleDate.toISOString(),
        daysOld,
        dateSource: snippetDate ? 'snippet' : 'meta',
        nameInTitle: false,
        nameInSnippet
      });
      return false;
    }

    // RULE 1: Own domains are auto-rejects
    const domain = extractDomain(result.url);
    if (domain && excludeDomains.includes(domain.toLowerCase())) {
      rejectionLog.push({
        reason: 'own_domain',
        title,
        snippet,
        url: result.url,
        domain,
        nameInTitle: false,
        nameInSnippet
      });
      return false;
    }

    // RULE 1.5: Social media domains are auto-rejects
    // Social posts/comments are not editorial media mentions
    if (domain) {
      // Normalize domain by removing www. prefix for comparison
      const normalizedDomain = domain.toLowerCase().replace(/^www\./, '');
      if (SOCIAL_MEDIA_DOMAINS.includes(normalizedDomain)) {
        rejectionLog.push({
          reason: 'social_media',
          title,
          snippet,
          url: result.url,
          domain,
          nameInTitle: false,
          nameInSnippet
        });
        return false;
      }
    }

    // RULE 1.6: Category/index pages are auto-rejects
    // These are navigation pages, not articles
    if (isCategoryPage(result.url)) {
      rejectionLog.push({
        reason: 'category_page',
        title,
        snippet,
        url: result.url,
        nameInTitle: false,
        nameInSnippet
      });
      return false;
    }

    // RULE 2: Name MUST appear in snippet (hard requirement for Google Search phase)
    // The snippet is the actual content excerpt - if client name appears there, it's a real mention
    const nameInTitle = nameVariations.some(variant => titleLower.includes(variant));

    if (!nameInSnippet) {
      rejectionLog.push({
        reason: 'name_not_in_snippet',
        title,
        snippet,
        url: result.url,
        nameInTitle,
        nameInSnippet: false
      });
      return false; // Reject if name not in snippet - no exceptions
    }

    // RULE 3: Reject non-editorial patterns in both title and snippet
    // Check title for generic patterns (events, marketing, news pages)
    if (isNonEditorialPattern(title)) {
      rejectionLog.push({
        reason: 'non_editorial_title',
        title,
        snippet,
        url: result.url,
        nameInTitle: true,
        nameInSnippet
      });
      return false;
    }

    // Check snippet for sponsor lists, directories, etc.
    if (isNonEditorialPattern(snippet)) {
      rejectionLog.push({
        reason: 'non_editorial_snippet',
        title,
        snippet,
        url: result.url,
        nameInTitle: true,
        nameInSnippet
      });
      return false;
    }

    // RULE 4: Title must have substance (not just generic LinkedIn/social media titles)
    const titleTooGeneric = /^[^|]+\s*\|\s*(LinkedIn|Facebook|Twitter|Instagram)$/i.test(title.trim());
    const titleTooShort = title.trim().length < 5 || title.trim() === '|' || /^\s*\|\s*\w+\s*$/i.test(title.trim());
    if (titleTooGeneric || titleTooShort) {
      rejectionLog.push({
        reason: 'title_too_generic_or_short',
        title,
        snippet,
        url: result.url,
        nameInTitle: true,
        nameInSnippet
      });
      return false;
    }

    // RULE 5: Snippet must contain editorial language (validates that title mention is substantive)
    if (!hasEditorialLanguage(snippet)) {
      rejectionLog.push({
        reason: 'no_editorial_language',
        title,
        snippet,
        url: result.url,
        nameInTitle: true,
        nameInSnippet
      });
      return false;
    }

    // RULE 6: ExcludeWords are hard brakes (snippet sanity check)
    // If excludeWords dominate the snippet, treat as wrong entity
    const excludeMatches = countMatches(snippet, excludeWords);
    if (excludeMatches >= 2) {
      rejectionLog.push({
        reason: 'exclude_words_in_snippet',
        title,
        snippet,
        url: result.url,
        excludeMatches,
        nameInTitle: true,
        nameInSnippet
      });
      // 2+ exclude terms = likely wrong entity
      return false;
    }

    // If single exclude term appears in title, very strong signal of wrong entity
    if (excludeWords.length > 0 && countMatches(title, excludeWords) > 0) {
      rejectionLog.push({
        reason: 'exclude_words_in_title',
        title,
        snippet,
        url: result.url,
        nameInTitle: true,
        nameInSnippet
      });
      return false;
    }

    // All checks passed: name in snippet + editorial language + no red flags = accept
    return true;
  });

  // Log rejection statistics
  if (rejectionLog.length > 0) {
    console.log(`\n=== FILTER DIAGNOSTICS for ${client.name} ===`);
    console.log(`Total results: ${results.length}`);
    console.log(`Accepted: ${filtered.length}`);
    console.log(`Rejected: ${rejectionLog.length}\n`);

    // Group by rejection reason
    const reasonCounts = {};
    rejectionLog.forEach(r => {
      reasonCounts[r.reason] = (reasonCounts[r.reason] || 0) + 1;
    });

    console.log('Rejection reasons:');
    Object.entries(reasonCounts)
      .sort((a, b) => b[1] - a[1])
      .forEach(([reason, count]) => {
        console.log(`  ${reason}: ${count} (${Math.round(count / rejectionLog.length * 100)}%)`);
      });

    // Show how many had name in snippet but not title
    const nameInSnippetNotTitle = rejectionLog.filter(r => r.nameInSnippet && !r.nameInTitle);
    if (nameInSnippetNotTitle.length > 0) {
      console.log(`\n⚠️  ${nameInSnippetNotTitle.length} results had name in SNIPPET but NOT in title`);
      console.log('Examples:');
      nameInSnippetNotTitle.slice(0, 3).forEach(r => {
        console.log(`\n  Title: ${r.title}`);
        console.log(`  Snippet: ${r.snippet.substring(0, 150)}...`);
        console.log(`  URL: ${r.url}`);
      });
    }

    console.log('\n');
  }

  return filtered;
}

module.exports = {
  filterResultsForClient,
  getNameVariations, // Export for testing
  countMatches, // Export for testing
  isNonEditorialPattern, // Export for testing
  hasEditorialLanguage, // Export for testing
};
