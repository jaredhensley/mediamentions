#!/usr/bin/env node

const { runQuery, runExecute } = require('../db');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const { broadcastMentionVerified, broadcastVerificationStatus } = require('../services/websocket');

// Use stealth plugin to avoid Cloudflare detection
puppeteer.use(StealthPlugin());
const { config } = require('../config');

/**
 * Validate URL before fetching
 * @param {string} url - URL to validate
 * @returns {boolean} - True if valid and safe to fetch
 */
function isValidUrl(url) {
  if (!url || typeof url !== 'string') return false;

  try {
    const parsed = new URL(url);

    // Only allow http/https
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return false;
    }

    // Block internal/private IPs
    const hostname = parsed.hostname.toLowerCase();
    const blockedPatterns = [
      /^localhost$/,
      /^127\./,
      /^10\./,
      /^172\.(1[6-9]|2[0-9]|3[01])\./,
      /^192\.168\./,
      /^0\./,
      /^169\.254\./,
      /^\[::1\]$/,
      /^\[fe80:/i
    ];

    if (blockedPatterns.some(pattern => pattern.test(hostname))) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

/**
 * Check if client name appears in text content
 * Uses configurable variations for fuzzy matching
 * @param {string} textContent - Lowercase text content
 * @param {string} clientName - Client name
 * @returns {boolean} - True if name or variation found
 */
function checkClientNameInContent(textContent, clientName) {
  if (!clientName || !textContent) return false;

  const clientNameLower = clientName.toLowerCase();

  // Direct match
  if (textContent.includes(clientNameLower)) {
    return true;
  }

  // Check configured variations
  const variations = config.verification.clientNameVariations || [];
  for (const { from, to } of variations) {
    if (clientNameLower.includes(from)) {
      const variant = clientNameLower.replace(from, to);
      if (textContent.includes(variant)) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Truncate title safely for display
 * @param {string} title - Title to truncate
 * @param {number} maxLength - Max length
 * @returns {string} - Truncated title
 */
function truncateTitle(title, maxLength = 50) {
  if (!title) return 'Untitled';
  if (title.length <= maxLength) return title;
  return title.substring(0, maxLength) + '...';
}

/**
 * Verify a mention using Puppeteer (for sites blocking regular fetch)
 * @param {Object} mention - Mention object with id, link, clientName
 * @param {Object} browser - Puppeteer browser instance
 * @returns {Object} - Verification result
 */
async function verifyWithBrowser(mention, browser) {
  const { id, link, clientName } = mention;
  let page = null;

  try {
    page = await browser.newPage();

    // Set viewport and user agent
    await page.setViewport({ width: 1920, height: 1080 });
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36');

    // Navigate with faster wait strategy
    await page.goto(link, {
      waitUntil: 'domcontentloaded',
      timeout: config.verification.browserTimeoutMs
    });

    // Wait a bit for dynamic content to load (configurable)
    await new Promise(resolve => setTimeout(resolve, config.verification.dynamicContentDelayMs));

    // Extract text content (return original, lowercase outside)
    const rawTextContent = await page.evaluate(() => {
      return document.body ? document.body.innerText : '';
    });

    const textContent = rawTextContent.toLowerCase();

    // Detect Cloudflare/WAF block pages - send to manual review instead of false positive
    const blockIndicators = [
      'access denied',
      'ray id',
      'cloudflare',
      'verify you are human',
      'checking your browser',
      'please wait while we verify',
      'just a moment',
      'enable javascript and cookies',
      'blocked',
      '403 forbidden',
      'attention required'
    ];
    const isBlockedPage = blockIndicators.some(indicator => textContent.includes(indicator));

    // Check for suspiciously short content (block pages are usually small)
    const isSuspiciouslyShort = textContent.length < config.verification.minContentLength;

    if (isBlockedPage || isSuspiciouslyShort) {
      return {
        id,
        verified: null,
        reason: 'blocked_page_detected',
        error: 'Page appears to be blocked or challenge page - needs manual review'
      };
    }

    const verified = checkClientNameInContent(textContent, clientName) ? 1 : 0;
    return {
      id,
      verified,
      reason: verified ? 'verified_browser' : 'name_not_found',
      error: null
    };

  } catch (error) {
    // Browser errors should go to manual review
    return {
      id,
      verified: null,
      reason: 'browser_error',
      error: error.message + ' - needs manual review'
    };
  } finally {
    // Always close the page
    if (page) {
      try {
        await page.close();
      } catch {
        // Ignore close errors
      }
    }
  }
}

/**
 * Verify a mention by fetching its URL and checking for client name
 * @param {Object} mention - Mention object with id, link, clientName
 * @param {Function} getBrowser - Function to lazily get browser instance
 * @returns {Object} - Verification result
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
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
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

    // If blocked (403/401/429/5xx), try snippet fallback before manual review
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

    // 4xx errors (except 403/401/429) are definitive failures - don't retry
    if (response.status >= 400 && response.status < 500) {
      return {
        id,
        verified: 0,
        reason: 'http_error_4xx',
        error: `HTTP ${response.status}`
      };
    }

    // 5xx errors should go to manual review (server issues)
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
      return {
        id,
        verified: 0,
        reason: 'http_error',
        error: `HTTP ${response.status}`
      };
    }

    const contentType = response.headers.get('content-type') || '';

    // Accept HTML and XHTML
    const isHtmlContent = contentType.includes('text/html') ||
                          contentType.includes('application/xhtml+xml');

    if (!isHtmlContent) {
      // PDFs and other documents can't be auto-verified but may be legitimate
      const isDocument = contentType.includes('application/pdf') ||
                         contentType.includes('application/msword') ||
                         contentType.includes('application/vnd.openxmlformats') ||
                         contentType.includes('application/vnd.ms-');
      return {
        id,
        verified: isDocument ? null : 0,
        reason: isDocument ? 'document_type' : 'not_html',
        error: isDocument
          ? `Content-Type: ${contentType} - needs manual review`
          : `Content-Type: ${contentType}`
      };
    }

    const html = await response.text();
    const textContent = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/gi, ' ')
      .replace(/&amp;/gi, '&')
      .replace(/&lt;/gi, '<')
      .replace(/&gt;/gi, '>')
      .replace(/&quot;/gi, '"')
      .toLowerCase();

    const verified = checkClientNameInContent(textContent, clientName) ? 1 : 0;
    return {
      id,
      verified,
      reason: verified ? 'verified' : 'name_not_found',
      error: null
    };

  } catch (error) {
    // Try snippet fallback before going to manual review
    const snippetResult = trySnippetFallback();
    if (snippetResult) return snippetResult;

    const reason = error.name === 'AbortError' ? 'timeout' : 'fetch_error';
    return {
      id,
      verified: null,
      reason,
      error: error.message + ' - needs manual review'
    };
  }
}

/**
 * Verify a mention with retry logic for network errors
 * @param {Object} mention - Mention object
 * @param {Function} getBrowser - Function to lazily get browser instance
 * @returns {Object} - Verification result
 */
async function verifyMentionWithRetry(mention, getBrowser) {
  const maxRetries = config.verification.maxRetries;
  let lastResult = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const result = await verifyMention(mention, getBrowser);

    // If verified or definite rejection, return immediately (no retry needed)
    const noRetryReasons = [
      'name_not_found',
      'no_url',
      'invalid_url',
      'not_html',
      'document_type',
      'http_error_4xx'  // 4xx errors won't change on retry
    ];

    if (result.verified === 1 || noRetryReasons.includes(result.reason)) {
      return result;
    }

    // If blocked/needs review, don't retry - just return for manual review
    if (result.verified === null) {
      return result;
    }

    // Save result for potential return
    lastResult = result;

    // If this wasn't the last attempt, wait before retrying
    if (attempt < maxRetries) {
      await new Promise(resolve => setTimeout(resolve, config.verification.retryDelayMs));
    }
  }

  // All retries failed, mark for manual review (return new object, don't mutate)
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
 * Process mentions with concurrency control
 * @param {Array} mentions - Mentions to process
 * @param {Function} processFn - Function to process each mention
 * @param {number} concurrency - Max concurrent operations
 * @returns {Promise<Array>} - Results
 */
async function processWithConcurrency(mentions, processFn, concurrency) {
  const results = [];
  let index = 0;

  async function worker() {
    while (index < mentions.length) {
      const currentIndex = index++;
      const mention = mentions[currentIndex];
      const result = await processFn(mention, currentIndex);
      results[currentIndex] = result;
    }
  }

  // Create worker pool
  const workers = Array(Math.min(concurrency, mentions.length))
    .fill(null)
    .map(() => worker());

  await Promise.all(workers);
  return results;
}

/**
 * Update database with verification result
 * @param {Object} result - Verification result
 * @returns {boolean} - True if successful
 */
function updateVerificationInDb(result) {
  try {
    runExecute(
      'UPDATE mediaMentions SET verified = @p0 WHERE id = @p1',
      [result.verified, result.id]
    );
    return true;
  } catch (error) {
    console.error(`Failed to update mention ${result.id}: ${error.message}`);
    return false;
  }
}

/**
 * Verify all unverified mentions in the database
 * @param {Object} options - Options for verification
 * @param {boolean} options.silent - If true, suppress console output
 * @param {boolean} options.broadcast - If true, broadcast via WebSocket (default: true for non-silent)
 * @returns {Promise<Object>} - Verification results summary
 */
async function verifyAllMentions({ silent = false, broadcast = !silent } = {}) {
  const log = silent ? () => {} : console.log;

  log('Starting mention verification...\n');

  // Fetch all mentions with client names
  const mentions = runQuery(`
    SELECT
      m.id,
      m.link,
      m.title,
      m.subjectMatter,
      c.name as clientName,
      m.verified
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
    db_errors: 0,
    errors: {}
  };

  // Count already verified first
  const toVerify = mentions.filter(m => m.verified !== 1);
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

  // Lazy browser initialization with promise lock to prevent multiple launches
  let browser = null;
  let browserPromise = null;  // Lock to prevent race condition
  const getBrowser = async () => {
    // If browser already exists, return it
    if (browser) return browser;

    // If another caller is already launching, wait for that same promise
    if (browserPromise) return browserPromise;

    // First caller - create the launch promise
    browserPromise = (async () => {
      log('Launching browser for Cloudflare bypass...\n');
      try {
        browser = await puppeteer.launch({
          headless: true,
          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage'
          ]
        });
        return browser;
      } catch (error) {
        console.error('Failed to launch browser:', error.message);
        browserPromise = null;  // Reset so next caller can retry
        return null;
      }
    })();

    return browserPromise;
  };

  // Track processed count for accurate progress
  let processedCount = 0;

  try {
    // Process with concurrency
    const concurrency = config.verification.concurrentRequests || 5;

    log(`Processing ${toVerify.length} mentions with concurrency ${concurrency}...\n`);

    // Process a single mention and update results
    const processMention = async (mention, index) => {
      const result = await verifyMentionWithRetry(mention, getBrowser);
      processedCount++;

      // Track verification method
      if (result.reason === 'verified_browser') {
        results.browser_used++;
      } else if (result.reason === 'verified_snippet') {
        results.snippet_verified++;
      }

      // Update database with error handling
      const dbSuccess = updateVerificationInDb(result);
      if (!dbSuccess) {
        results.db_errors++;
      }

      if (result.verified === 1) {
        results.verified++;
        const method = result.reason === 'verified_browser' ? ' [BROWSER]' :
                       result.reason === 'verified_snippet' ? ' [SNIPPET]' : '';
        log(`[${index + 1}/${mentions.length}] ${truncateTitle(mention.title)} ✓ VERIFIED${method}`);
      } else if (result.verified === null) {
        results.needs_review++;
        results.errors[result.reason] = (results.errors[result.reason] || 0) + 1;
        log(`[${index + 1}/${mentions.length}] ${truncateTitle(mention.title)} ⚠ NEEDS REVIEW (${result.reason})`);
      } else {
        results.failed++;
        results.errors[result.reason] = (results.errors[result.reason] || 0) + 1;
        log(`[${index + 1}/${mentions.length}] ${truncateTitle(mention.title)} ✗ FAILED (${result.reason})`);
      }

      // Broadcast verification result via WebSocket
      if (broadcast) {
        broadcastMentionVerified(mention, result);

        // Broadcast progress update
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

    // Concurrent processing with worker pool
    let currentIndex = 0;
    const mentionsToProcess = mentions.map((m, i) => ({ mention: m, index: i }))
      .filter(({ mention }) => mention.verified !== 1);

    const worker = async () => {
      while (currentIndex < mentionsToProcess.length) {
        const idx = currentIndex++;
        if (idx >= mentionsToProcess.length) break;

        const { mention, index } = mentionsToProcess[idx];
        await processMention(mention, index);

        // Small delay between requests to avoid hammering servers
        await new Promise(resolve => setTimeout(resolve, config.verification.rateLimitMs));
      }
    };

    // Launch concurrent workers
    const workers = Array(Math.min(concurrency, mentionsToProcess.length))
      .fill(null)
      .map(() => worker());

    await Promise.all(workers);
  } finally {
    // Always close browser if it was opened
    if (browser) {
      try {
        await browser.close();
      } catch {
        // Ignore close errors
      }
    }
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
  if (results.db_errors > 0) {
    log(`Database errors:     ${results.db_errors}`);
  }
  const processed = results.total - results.already_verified;
  const rate = processed > 0 ? Math.round((results.verified / processed) * 100) : 0;
  log(`Verification rate:   ${rate}%`);
  log('\nReasons:');
  Object.entries(results.errors)
    .sort((a, b) => b[1] - a[1])
    .forEach(([reason, count]) => {
      const total = results.failed + results.needs_review;
      const pct = total > 0 ? Math.round((count / total) * 100) : 0;
      log(`  ${reason}: ${count} (${pct}%)`);
    });
  log('='.repeat(60) + '\n');

  return results;
}

/**
 * Main verification function (CLI entry point)
 * Delegates to verifyAllMentions with console output enabled
 */
async function main() {
  await verifyAllMentions({ silent: false, broadcast: false });
}

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    console.error('Error:', error);
    process.exit(1);
  });
}

module.exports = {
  verifyMention,
  verifyAllMentions,
  checkClientNameInContent,
  isValidUrl,
  truncateTitle
};
