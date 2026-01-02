#!/usr/bin/env node

/**
 * @fileoverview Mention verification orchestrator
 * Verifies media mentions by fetching URLs and checking for client name presence
 */

const { runQuery, runExecute } = require('../db');
const { broadcastMentionVerified, broadcastVerificationStatus } = require('../services/websocket');
const { normalizeUrlForComparison, recordMentions, normalizeResult } = require('../utils/mentions');
const { config } = require('../config');

// Import extracted modules
const { isValidUrl, mentionExistsForUrl } = require('../utils/urlValidation');
const {
  checkClientNameInContent,
  extractTextFromHtml,
  isHtmlContentType,
  isDocumentContentType,
  truncateTitle
} = require('../utils/contentAnalysis');
const {
  createBrowserGetter,
  verifyWithBrowser,
  getCardItemSiteConfig
} = require('../services/browserService');

/**
 * Verify a mention by fetching its URL and checking for client name
 * @param {Object} mention - Mention object with id, link, clientName
 * @param {Function} getBrowser - Function to lazily get browser instance
 * @returns {Promise<Object>} - Verification result
 */
async function verifyMention(mention, getBrowser = null) {
  const { id, link, clientName, subjectMatter } = mention;

  // Helper to check snippet as fallback
  const trySnippetFallback = () => {
    if (subjectMatter && checkClientNameInContent(subjectMatter.toLowerCase(), clientName)) {
      return { id, verified: 1, reason: 'verified_snippet', error: null };
    }
    return null;
  };

  // Validate URL
  if (!link) {
    return { id, verified: 0, reason: 'no_url', error: null };
  }

  if (!isValidUrl(link)) {
    return { id, verified: 0, reason: 'invalid_url', error: 'URL is invalid or blocked' };
  }

  try {
    // Try regular fetch first (faster)
    const response = await fetch(link, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Cache-Control': 'no-cache',
        Pragma: 'no-cache'
      },
      redirect: 'follow',
      signal: AbortSignal.timeout(config.verification.fetchTimeoutMs)
    });

    // Check if status should trigger browser fallback
    const browserFallbackStatuses = config.verification.browserFallbackStatuses || [403];
    if (browserFallbackStatuses.includes(response.status) && getBrowser) {
      const browser = await getBrowser();
      if (browser) {
        return await verifyWithBrowser(mention, browser);
      }
    }

    // Handle blocked responses
    if (response.status === 403 || response.status === 401 || response.status === 429) {
      const snippetResult = trySnippetFallback();
      if (snippetResult) return snippetResult;
      return {
        id,
        verified: null,
        reason: 'blocked',
        error: `HTTP ${response.status} - needs manual review`
      };
    }

    // 4xx errors are definitive failures
    if (response.status >= 400 && response.status < 500) {
      return { id, verified: 0, reason: 'http_error_4xx', error: `HTTP ${response.status}` };
    }

    // 5xx errors need manual review
    if (response.status >= 500) {
      const snippetResult = trySnippetFallback();
      if (snippetResult) return snippetResult;
      return {
        id,
        verified: null,
        reason: 'http_error_5xx',
        error: `HTTP ${response.status} - needs manual review`
      };
    }

    if (!response.ok) {
      return { id, verified: 0, reason: 'http_error', error: `HTTP ${response.status}` };
    }

    const contentType = response.headers.get('content-type') || '';

    // Handle HTML content
    if (isHtmlContentType(contentType)) {
      const html = await response.text();
      const textContent = extractTextFromHtml(html);
      const verified = checkClientNameInContent(textContent, clientName) ? 1 : 0;
      return {
        id,
        verified,
        reason: verified ? 'verified' : 'name_not_found',
        error: null
      };
    }

    // Handle documents (PDF, Word, etc.)
    if (isDocumentContentType(contentType)) {
      const titleLower = (mention.title || '').toLowerCase();
      const snippetLower = (subjectMatter || '').toLowerCase();
      const combinedText = `${titleLower} ${snippetLower}`;

      if (checkClientNameInContent(combinedText, clientName)) {
        return { id, verified: 1, reason: 'verified_document_title', error: null };
      }
      return {
        id,
        verified: null,
        reason: 'document_type',
        error: `Content-Type: ${contentType} - needs manual review`
      };
    }

    // Non-HTML, non-document content
    return { id, verified: 0, reason: 'not_html', error: `Content-Type: ${contentType}` };
  } catch (error) {
    const snippetResult = trySnippetFallback();
    if (snippetResult) return snippetResult;

    const reason = error.name === 'AbortError' ? 'timeout' : 'fetch_error';
    return { id, verified: null, reason, error: error.message + ' - needs manual review' };
  }
}

/**
 * Verify a mention with retry logic for network errors
 * @param {Object} mention - Mention object
 * @param {Function} getBrowser - Function to lazily get browser instance
 * @returns {Promise<Object>} - Verification result
 */
async function verifyMentionWithRetry(mention, getBrowser) {
  const maxRetries = config.verification.maxRetries;
  let lastResult = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const result = await verifyMention(mention, getBrowser);

    // Don't retry for definitive results
    const noRetryReasons = [
      'name_not_found',
      'no_url',
      'invalid_url',
      'not_html',
      'document_type',
      'http_error_4xx',
      'card_item_listing_page'
    ];

    if (result.verified === 1 || noRetryReasons.includes(result.reason)) {
      return result;
    }

    if (result.verified === null) {
      return result;
    }

    lastResult = result;

    if (attempt < maxRetries) {
      await new Promise((resolve) => setTimeout(resolve, config.verification.retryDelayMs));
    }
  }

  if (lastResult) {
    return {
      ...lastResult,
      verified: null,
      error: (lastResult.error || '') + ' - needs manual review after retries'
    };
  }
  return lastResult;
}

/**
 * Update database with verification result
 * @param {Object} result - Verification result
 * @returns {boolean} - True if successful
 */
function updateVerificationInDb(result) {
  try {
    runExecute('UPDATE mediaMentions SET verified = @p0 WHERE id = @p1', [
      result.verified,
      result.id
    ]);
    return true;
  } catch (error) {
    console.error(`Failed to update mention ${result.id}: ${error.message}`);
    return false;
  }
}

/**
 * Process discovered articles from card-item listing pages
 * @param {Map} articleLibrary - Library of discovered articles
 * @param {Function} getBrowser - Browser getter function
 * @param {Object} results - Results object to update
 * @param {Function} log - Logging function
 * @returns {Promise<Array>} - Created mentions for verification
 */
async function processDiscoveredArticles(articleLibrary, getBrowser, results, log) {
  const discoveredMentions = [];

  for (const [_normalizedUrl, article] of articleLibrary) {
    try {
      if (mentionExistsForUrl(article.url, article.clientId)) {
        log(`  SKIP: ${truncateTitle(article.title)} (already exists)`);
        continue;
      }

      const client = { id: article.clientId, name: article.clientName };
      const result = normalizeResult(
        {
          id: require('crypto').randomUUID(),
          title: article.title || 'Untitled',
          url: article.url,
          snippet: 'Discovered from card-item listing page',
          publishedAt: null,
          provider: 'card-item-discovery'
        },
        client
      );

      const created = recordMentions([result], 'new');
      if (created.length > 0) {
        results.mentions_from_cards++;
        discoveredMentions.push({ ...created[0], clientName: article.clientName });
        log(`  NEW: ${truncateTitle(article.title)} → created mention`);
      }
    } catch (error) {
      log(`  ERROR: Failed to create mention for ${article.url}: ${error.message}`);
    }
  }

  return discoveredMentions;
}

/**
 * Verify all unverified mentions in the database
 * @param {Object} options - Options for verification
 * @param {boolean} options.silent - If true, suppress console output
 * @param {boolean} options.broadcast - If true, broadcast via WebSocket
 * @returns {Promise<Object>} - Verification results summary
 */
async function verifyAllMentions({ silent = false, broadcast = !silent } = {}) {
  const log = silent ? () => {} : console.log;

  log('Starting mention verification...\n');

  // Fetch all mentions with client names
  const mentions = runQuery(`
    SELECT m.id, m.link, m.title, m.subjectMatter, m.clientId, c.name as clientName, m.verified
    FROM mediaMentions m
    JOIN clients c ON m.clientId = c.id
    ORDER BY m.id
  `);

  log(`Found ${mentions.length} mentions to verify\n`);

  const results = {
    total: mentions.length,
    verified: 0,
    failed: 0,
    needs_review: 0,
    already_verified: 0,
    browser_used: 0,
    snippet_verified: 0,
    card_item_listing_pages: 0,
    discovered_articles: 0,
    mentions_from_cards: 0,
    db_errors: 0,
    errors: {}
  };

  const discoveredArticleLibrary = new Map();
  const toVerify = mentions.filter((m) => m.verified !== 1);
  results.already_verified = mentions.length - toVerify.length;

  // Log skipped mentions
  mentions.forEach((mention, i) => {
    if (mention.verified === 1) {
      log(`[${i + 1}/${mentions.length}] SKIP: ${truncateTitle(mention.title)} (already verified)`);
    }
  });

  if (toVerify.length === 0) {
    log('\nAll mentions already verified!\n');
    return results;
  }

  // Create browser getter
  const { getBrowser, closeBrowser } = createBrowserGetter(log);
  let processedCount = 0;

  try {
    const concurrency = config.verification.concurrentRequests || 5;
    log(`Processing ${toVerify.length} mentions with concurrency ${concurrency}...\n`);

    // Process a single mention
    const processMention = async (mention, index, totalCount) => {
      const result = await verifyMentionWithRetry(mention, getBrowser);
      processedCount++;

      // Track verification method
      if (result.reason === 'verified_browser') results.browser_used++;
      else if (result.reason === 'verified_snippet') results.snippet_verified++;

      // Handle card-item listing pages
      if (result.reason === 'card_item_listing_page' && result.discoveredArticles) {
        results.card_item_listing_pages++;
        for (const article of result.discoveredArticles) {
          const normalizedUrl = normalizeUrlForComparison(article.url);
          if (normalizedUrl && !discoveredArticleLibrary.has(normalizedUrl)) {
            if (!mentionExistsForUrl(article.url, result.clientId)) {
              discoveredArticleLibrary.set(normalizedUrl, {
                url: article.url,
                title: article.title,
                clientId: result.clientId,
                clientName: mention.clientName
              });
              results.discovered_articles++;
            }
          }
        }
        log(
          `[${index + 1}/${totalCount}] ${truncateTitle(mention.title)} ⊘ LISTING PAGE (found ${result.discoveredArticles.length} cards)`
        );
      }

      // Update database
      if (!updateVerificationInDb(result)) results.db_errors++;

      // Log and track results
      if (result.verified === 1) {
        results.verified++;
        const method =
          result.reason === 'verified_browser'
            ? ' [BROWSER]'
            : result.reason === 'verified_snippet'
              ? ' [SNIPPET]'
              : '';
        log(`[${index + 1}/${totalCount}] ${truncateTitle(mention.title)} ✓ VERIFIED${method}`);
      } else if (result.verified === null) {
        results.needs_review++;
        results.errors[result.reason] = (results.errors[result.reason] || 0) + 1;
        log(
          `[${index + 1}/${totalCount}] ${truncateTitle(mention.title)} ⚠ NEEDS REVIEW (${result.reason})`
        );
      } else if (result.reason !== 'card_item_listing_page') {
        results.failed++;
        results.errors[result.reason] = (results.errors[result.reason] || 0) + 1;
        log(
          `[${index + 1}/${totalCount}] ${truncateTitle(mention.title)} ✗ FAILED (${result.reason})`
        );
      }

      // Broadcast progress
      if (broadcast) {
        broadcastMentionVerified(mention, result);
        broadcastVerificationStatus({
          isRunning: true,
          phase: 'verifying',
          total: toVerify.length,
          processed: processedCount,
          verified: results.verified,
          failed: results.failed,
          needs_review: results.needs_review
        });
      }

      return result;
    };

    // Concurrent processing
    let currentIndex = 0;
    const mentionsToProcess = mentions
      .map((m, i) => ({ mention: m, index: i }))
      .filter(({ mention }) => mention.verified !== 1);

    const worker = async () => {
      while (currentIndex < mentionsToProcess.length) {
        const idx = currentIndex++;
        if (idx >= mentionsToProcess.length) break;

        const { mention, index } = mentionsToProcess[idx];
        await processMention(mention, index, mentions.length);
        await new Promise((resolve) => setTimeout(resolve, config.verification.rateLimitMs));
      }
    };

    const workers = Array(Math.min(concurrency, mentionsToProcess.length))
      .fill(null)
      .map(() => worker());

    await Promise.all(workers);

    // Process discovered articles (one level deep only for simplicity)
    if (discoveredArticleLibrary.size > 0) {
      log(`\nProcessing ${discoveredArticleLibrary.size} discovered articles...\n`);
      const discoveredMentions = await processDiscoveredArticles(
        discoveredArticleLibrary,
        getBrowser,
        results,
        log
      );

      // Verify discovered mentions
      for (let i = 0; i < discoveredMentions.length; i++) {
        const mention = discoveredMentions[i];
        const verifyResult = await verifyMentionWithRetry(mention, getBrowser);
        updateVerificationInDb(verifyResult);

        if (verifyResult.verified === 1) {
          results.verified++;
          log(
            `  [${i + 1}/${discoveredMentions.length}] ${truncateTitle(mention.title)} ✓ VERIFIED`
          );
        } else if (verifyResult.verified === null) {
          results.needs_review++;
          log(
            `  [${i + 1}/${discoveredMentions.length}] ${truncateTitle(mention.title)} ⚠ NEEDS REVIEW`
          );
        } else {
          results.failed++;
          log(`  [${i + 1}/${discoveredMentions.length}] ${truncateTitle(mention.title)} ✗ FAILED`);
        }

        await new Promise((resolve) => setTimeout(resolve, config.verification.rateLimitMs));
      }
    }
  } finally {
    await closeBrowser();
  }

  // Print summary
  log('\n' + '='.repeat(60));
  log('VERIFICATION SUMMARY');
  log('='.repeat(60));
  log(`Total mentions:      ${results.total}`);
  log(`Already verified:    ${results.already_verified}`);
  log(`Newly verified:      ${results.verified}`);
  log(`  Via snippet:       ${results.snippet_verified}`);
  log(`  Via browser:       ${results.browser_used}`);
  log(`Needs manual review: ${results.needs_review}`);
  log(`Failed to verify:    ${results.failed}`);
  if (results.card_item_listing_pages > 0) {
    log(`Listing pages:       ${results.card_item_listing_pages}`);
    log(`  Articles found:    ${results.discovered_articles}`);
    log(`  Mentions created:  ${results.mentions_from_cards}`);
  }
  if (results.db_errors > 0) {
    log(`Database errors:     ${results.db_errors}`);
  }
  const processed = results.total - results.already_verified;
  const rate = processed > 0 ? Math.round((results.verified / processed) * 100) : 0;
  log(`Verification rate:   ${rate}%`);
  if (Object.keys(results.errors).length > 0) {
    log('\nReasons:');
    Object.entries(results.errors)
      .sort((a, b) => b[1] - a[1])
      .forEach(([reason, count]) => {
        const total = results.failed + results.needs_review;
        const pct = total > 0 ? Math.round((count / total) * 100) : 0;
        log(`  ${reason}: ${count} (${pct}%)`);
      });
  }
  log('='.repeat(60) + '\n');

  return results;
}

/**
 * Main verification function (CLI entry point)
 */
async function main() {
  await verifyAllMentions({ silent: false, broadcast: false });
}

// Run if called directly
if (require.main === module) {
  main().catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });
}

module.exports = {
  verifyMention,
  verifyAllMentions,
  checkClientNameInContent,
  isValidUrl,
  truncateTitle,
  getCardItemSiteConfig,
  mentionExistsForUrl
};
