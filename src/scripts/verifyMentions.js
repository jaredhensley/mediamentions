#!/usr/bin/env node

const { runQuery, runExecute } = require('../db');
const puppeteer = require('puppeteer');
const { broadcastMentionVerified, broadcastVerificationStatus } = require('../services/websocket');

/**
 * Check if client name appears in text content
 * @param {string} textContent - Lowercase text content
 * @param {string} clientName - Client name
 * @returns {boolean} - True if name or variation found
 */
function checkClientNameInContent(textContent, clientName) {
  const clientNameLower = clientName.toLowerCase();
  const nameFound = textContent.includes(clientNameLower);

  // Also check for common variations
  if (nameFound) return true;

  if (clientNameLower.includes('sweetpotato')) {
    return textContent.includes(clientNameLower.replace('sweetpotato', 'sweet potato'));
  } else if (clientNameLower.includes('sweet potato')) {
    return textContent.includes(clientNameLower.replace('sweet potato', 'sweetpotato'));
  } else if (clientNameLower.includes('colombia')) {
    return textContent.includes(clientNameLower.replace('colombia', 'colombian'));
  }

  return false;
}

/**
 * Verify a mention using Puppeteer (for sites blocking regular fetch)
 * @param {Object} mention - Mention object with id, link, clientName
 * @param {Object} browser - Puppeteer browser instance
 * @returns {Object} - Verification result
 */
async function verifyWithBrowser(mention, browser) {
  const { id, link, clientName } = mention;

  try {
    const page = await browser.newPage();

    // Set viewport and user agent
    await page.setViewport({ width: 1920, height: 1080 });
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36');

    // Navigate with timeout
    await page.goto(link, {
      waitUntil: 'networkidle2',
      timeout: 20000
    });

    // Wait a bit for dynamic content to load
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Extract text content
    const textContent = await page.evaluate(() => {
      return document.body.innerText.toLowerCase();
    });

    await page.close();

    const verified = checkClientNameInContent(textContent, clientName) ? 1 : 0;
    return {
      id,
      verified,
      reason: verified ? 'verified_browser' : 'name_not_found',
      error: null
    };

  } catch (error) {
    return {
      id,
      verified: 0,
      reason: 'browser_error',
      error: error.message
    };
  }
}

/**
 * Verify a mention by fetching its URL and checking for client name
 * @param {Object} mention - Mention object with id, link, clientName
 * @param {Object} browser - Optional Puppeteer browser instance for fallback
 * @returns {Object} - Verification result
 */
async function verifyMention(mention, browser = null) {
  const { id, link, clientName } = mention;

  if (!link) {
    return { id, verified: 0, reason: 'no_url', error: null };
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
      signal: AbortSignal.timeout(10000) // 10 second timeout
    });

    // If 403, try with browser
    if (response.status === 403 && browser) {
      return await verifyWithBrowser(mention, browser);
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
    if (!contentType.includes('text/html')) {
      return {
        id,
        verified: 0,
        reason: 'not_html',
        error: `Content-Type: ${contentType}`
      };
    }

    const html = await response.text();
    const textContent = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .toLowerCase();

    const verified = checkClientNameInContent(textContent, clientName) ? 1 : 0;
    return {
      id,
      verified,
      reason: verified ? 'verified' : 'name_not_found',
      error: null
    };

  } catch (error) {
    const reason = error.name === 'AbortError' ? 'timeout' : 'fetch_error';
    return {
      id,
      verified: 0,
      reason,
      error: error.message
    };
  }
}

/**
 * Verify a mention with retry logic for network errors
 * @param {Object} mention - Mention object
 * @param {Object} browser - Puppeteer browser instance
 * @returns {Object} - Verification result
 */
async function verifyMentionWithRetry(mention, browser) {
  const maxRetries = 2;
  let lastResult = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const result = await verifyMention(mention, browser);

    // Network errors that should be retried
    const networkErrors = ['timeout', 'fetch_error', 'browser_error'];

    // If successful or non-retriable error, return immediately
    if (result.verified === 1 || !networkErrors.includes(result.reason)) {
      return result;
    }

    // Save result for potential return
    lastResult = result;

    // If this wasn't the last attempt, wait before retrying
    if (attempt < maxRetries) {
      await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second delay before retry
    }
  }

  // All retries failed, return last result
  return lastResult;
}

/**
 * Main verification function
 */
async function main() {
  console.log('Starting mention verification...\n');

  // Fetch all mentions with client names
  const mentions = runQuery(`
    SELECT
      m.id,
      m.link,
      m.title,
      c.name as clientName,
      m.verified
    FROM mediaMentions m
    JOIN clients c ON m.clientId = c.id
    ORDER BY m.id
  `);

  console.log(`Found ${mentions.length} mentions to verify\n`);

  const results = {
    total: mentions.length,
    verified: 0,
    failed: 0,
    already_verified: 0,
    browser_used: 0,
    errors: {}
  };

  // Launch browser for Cloudflare bypass (reuse across requests)
  console.log('Launching browser for Cloudflare bypass...\n');
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    // Process mentions with rate limiting
    for (let i = 0; i < mentions.length; i++) {
      const mention = mentions[i];

      // Skip if already verified
      if (mention.verified === 1) {
        results.already_verified++;
        console.log(`[${i + 1}/${mentions.length}] SKIP: ${mention.title.substring(0, 50)}... (already verified)`);
        continue;
      }

      process.stdout.write(`[${i + 1}/${mentions.length}] Verifying: ${mention.title.substring(0, 50)}...`);

      const result = await verifyMentionWithRetry(mention, browser);

      // Track browser usage
      if (result.reason === 'verified_browser') {
        results.browser_used++;
      }

      // Update database
      runExecute(
        'UPDATE mediaMentions SET verified = @p0 WHERE id = @p1',
        [result.verified, result.id]
      );

      if (result.verified === 1) {
        results.verified++;
        const method = result.reason === 'verified_browser' ? ' [BROWSER]' : '';
        console.log(` ✓ VERIFIED${method}`);
      } else {
        results.failed++;
        results.errors[result.reason] = (results.errors[result.reason] || 0) + 1;
        console.log(` ✗ FAILED (${result.reason}${result.error ? ': ' + result.error : ''})`);
      }

      // Rate limiting: 500ms between requests
      if (i < mentions.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
  } finally {
    // Always close browser
    await browser.close();
  }

  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log('VERIFICATION SUMMARY');
  console.log('='.repeat(60));
  console.log(`Total mentions:      ${results.total}`);
  console.log(`Already verified:    ${results.already_verified}`);
  console.log(`Newly verified:      ${results.verified}`);
  console.log(`  Via browser:       ${results.browser_used}`);
  console.log(`Failed to verify:    ${results.failed}`);
  console.log(`Verification rate:   ${Math.round((results.verified / (results.total - results.already_verified)) * 100)}%`);
  console.log('\nFailure reasons:');
  Object.entries(results.errors)
    .sort((a, b) => b[1] - a[1])
    .forEach(([reason, count]) => {
      const pct = Math.round((count / results.failed) * 100);
      console.log(`  ${reason}: ${count} (${pct}%)`);
    });
  console.log('='.repeat(60) + '\n');
}

/**
 * Verify all unverified mentions in the database
 * @param {Object} options - Options for verification
 * @param {boolean} options.silent - If true, suppress console output
 * @returns {Promise<Object>} - Verification results summary
 */
async function verifyAllMentions({ silent = false } = {}) {
  const log = silent ? () => {} : console.log;
  const write = silent ? () => {} : (msg) => process.stdout.write(msg);

  log('Starting mention verification...\n');

  // Fetch all mentions with client names
  const mentions = runQuery(`
    SELECT
      m.id,
      m.link,
      m.title,
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
    already_verified: 0,
    browser_used: 0,
    errors: {}
  };

  // Launch browser for Cloudflare bypass (reuse across requests)
  log('Launching browser for Cloudflare bypass...\n');
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    // Process mentions with rate limiting
    for (let i = 0; i < mentions.length; i++) {
      const mention = mentions[i];

      // Skip if already verified
      if (mention.verified === 1) {
        results.already_verified++;
        log(`[${i + 1}/${mentions.length}] SKIP: ${mention.title.substring(0, 50)}... (already verified)`);
        continue;
      }

      write(`[${i + 1}/${mentions.length}] Verifying: ${mention.title.substring(0, 50)}...`);

      const result = await verifyMentionWithRetry(mention, browser);

      // Track browser usage
      if (result.reason === 'verified_browser') {
        results.browser_used++;
      }

      // Update database
      runExecute(
        'UPDATE mediaMentions SET verified = @p0 WHERE id = @p1',
        [result.verified, result.id]
      );

      if (result.verified === 1) {
        results.verified++;
        const method = result.reason === 'verified_browser' ? ' [BROWSER]' : '';
        log(` ✓ VERIFIED${method}`);
      } else {
        results.failed++;
        results.errors[result.reason] = (results.errors[result.reason] || 0) + 1;
        log(` ✗ FAILED (${result.reason}${result.error ? ': ' + result.error : ''})`);
      }

      // Broadcast verification result via WebSocket
      broadcastMentionVerified(mention, result);

      // Broadcast progress update
      broadcastVerificationStatus({
        isRunning: true,
        phase: 'verifying',
        total: mentions.length - results.already_verified,
        processed: i + 1 - results.already_verified,
        verified: results.verified,
        failed: results.failed
      });

      // Rate limiting: 500ms between requests
      if (i < mentions.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
  } finally {
    // Always close browser
    await browser.close();
  }

  // Print summary
  log('\n' + '='.repeat(60));
  log('VERIFICATION SUMMARY');
  log('='.repeat(60));
  log(`Total mentions:      ${results.total}`);
  log(`Already verified:    ${results.already_verified}`);
  log(`Newly verified:      ${results.verified}`);
  log(`  Via browser:       ${results.browser_used}`);
  log(`Failed to verify:    ${results.failed}`);
  log(`Verification rate:   ${Math.round((results.verified / (results.total - results.already_verified)) * 100)}%`);
  log('\nFailure reasons:');
  Object.entries(results.errors)
    .sort((a, b) => b[1] - a[1])
    .forEach(([reason, count]) => {
      const pct = Math.round((count / results.failed) * 100);
      log(`  ${reason}: ${count} (${pct}%)`);
    });
  log('='.repeat(60) + '\n');

  return results;
}

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    console.error('Error:', error);
    process.exit(1);
  });
}

module.exports = { verifyMention, verifyAllMentions };
