/**
 * @fileoverview Browser service for Puppeteer-based verification
 * Handles browser lifecycle, page navigation, and card-item site analysis
 */

const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const { config } = require('../config');
const {
  checkClientNameInContent,
  isBlockedPage,
  isSuspiciouslyShortContent
} = require('../utils/contentAnalysis');

// Use stealth plugin to avoid Cloudflare detection
puppeteer.use(StealthPlugin());

/**
 * Get card-item site configuration for a URL
 * Card-item sites are listing pages where client names appear in article preview cards
 * @param {string} url - URL to check
 * @returns {Object|null} - Site config if URL matches a card-item site, null otherwise
 */
function getCardItemSiteConfig(url) {
  if (!url) return null;

  try {
    const hostname = new URL(url).hostname.toLowerCase();
    const sites = config.cardItemSites || [];

    for (const site of sites) {
      if (hostname.includes(site.domain)) {
        return site;
      }
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Create a lazy browser getter with promise lock
 * Prevents multiple browser instances from being launched
 * @param {Function} logFn - Logging function
 * @returns {Function} - Async function that returns browser instance
 */
function createBrowserGetter(logFn = console.log) {
  let browser = null;
  let browserPromise = null;

  const getBrowser = async () => {
    if (browser) return browser;
    if (browserPromise) return browserPromise;

    browserPromise = (async () => {
      logFn('Launching browser for Cloudflare bypass...\n');
      try {
        browser = await puppeteer.launch({
          headless: true,
          args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
        });
        return browser;
      } catch (error) {
        console.error('Failed to launch browser:', error.message);
        browserPromise = null;
        return null;
      }
    })();

    return browserPromise;
  };

  // Return both getter and cleanup function
  return {
    getBrowser,
    closeBrowser: async () => {
      if (browser) {
        try {
          await browser.close();
        } catch {
          // Ignore close errors
        }
        browser = null;
        browserPromise = null;
      }
    }
  };
}

/**
 * Analyze a card-item page for client name matches
 * Returns discovered article URLs if client name only appears in cards
 * @param {Object} page - Puppeteer page instance
 * @param {string} clientName - Client name to search for
 * @param {Object} siteConfig - Card-item site configuration
 * @returns {Promise<Object>} - Analysis result with cards and match location
 */
async function analyzeCardItemPage(page, clientName, siteConfig) {
  const { cardSelector, linkSelector } = siteConfig;
  const clientNameLower = clientName.toLowerCase();

  /* eslint-disable no-undef */
  const cardAnalysis = await page.evaluate(
    (clientNameLowerParam, cardSel, linkSel) => {
      const cards = document.querySelectorAll(cardSel);
      const cardsWithMatch = [];
      let matchFoundOutsideCards = false;

      // Check each card for the client name
      for (const card of cards) {
        const cardText = (card.innerText || '').toLowerCase();
        if (cardText.includes(clientNameLowerParam)) {
          const linkEl = card.querySelector(linkSel);
          if (linkEl && linkEl.href) {
            cardsWithMatch.push({
              url: linkEl.href,
              title:
                linkEl.textContent?.trim() ||
                card.querySelector('h2, h3, h4, .title')?.textContent?.trim() ||
                ''
            });
          }
        }
      }

      // Check if client name appears outside of any cards
      const bodyClone = document.body.cloneNode(true);
      const cardsInClone = bodyClone.querySelectorAll(cardSel);
      for (const card of cardsInClone) {
        card.remove();
      }
      const contentWithoutCards = (bodyClone.innerText || '').toLowerCase();
      matchFoundOutsideCards = contentWithoutCards.includes(clientNameLowerParam);

      return {
        cardsWithMatch,
        matchFoundOutsideCards,
        totalCards: cards.length
      };
    },
    clientNameLower,
    cardSelector,
    linkSelector
  );
  /* eslint-enable no-undef */

  return cardAnalysis;
}

/**
 * Verify a mention using Puppeteer browser
 * Used for sites that block regular fetch requests
 * @param {Object} mention - Mention object with id, link, clientName, clientId
 * @param {Object} browser - Puppeteer browser instance
 * @returns {Promise<Object>} - Verification result
 */
async function verifyWithBrowser(mention, browser) {
  const { id, link, clientName, clientId } = mention;
  let page = null;

  try {
    page = await browser.newPage();

    // Set viewport and user agent
    await page.setViewport({ width: 1920, height: 1080 });
    await page.setUserAgent(
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'
    );

    // Navigate with faster wait strategy
    await page.goto(link, {
      waitUntil: 'domcontentloaded',
      timeout: config.verification.browserTimeoutMs
    });

    // Wait for dynamic content
    await new Promise((resolve) => setTimeout(resolve, config.verification.dynamicContentDelayMs));

    // Check if this is a card-item site
    const cardItemSiteConfig = getCardItemSiteConfig(link);

    // Extract text content
    // eslint-disable-next-line no-undef
    const rawTextContent = await page.evaluate(() => document.body?.innerText || '');
    const textContent = rawTextContent.toLowerCase();

    // Detect block pages
    if (isBlockedPage(textContent) || isSuspiciouslyShortContent(textContent)) {
      return {
        id,
        verified: null,
        reason: 'blocked_page_detected',
        error: 'Page appears to be blocked or challenge page - needs manual review'
      };
    }

    const clientNameFound = checkClientNameInContent(textContent, clientName);

    // Handle card-item sites
    if (clientNameFound && cardItemSiteConfig) {
      const cardAnalysis = await analyzeCardItemPage(page, clientName, cardItemSiteConfig);

      // If match is ONLY in cards, this is a listing page
      if (cardAnalysis.cardsWithMatch.length > 0 && !cardAnalysis.matchFoundOutsideCards) {
        return {
          id,
          verified: 0,
          reason: 'card_item_listing_page',
          error: null,
          discoveredArticles: cardAnalysis.cardsWithMatch,
          clientId
        };
      }

      // Match found outside cards - legitimate article
      if (cardAnalysis.matchFoundOutsideCards) {
        return {
          id,
          verified: 1,
          reason: 'verified_browser',
          error: null
        };
      }
    }

    // Standard verification
    const verified = clientNameFound ? 1 : 0;
    return {
      id,
      verified,
      reason: verified ? 'verified_browser' : 'name_not_found',
      error: null
    };
  } catch (error) {
    return {
      id,
      verified: null,
      reason: 'browser_error',
      error: error.message + ' - needs manual review'
    };
  } finally {
    if (page) {
      try {
        await page.close();
      } catch {
        // Ignore close errors
      }
    }
  }
}

module.exports = {
  getCardItemSiteConfig,
  createBrowserGetter,
  analyzeCardItemPage,
  verifyWithBrowser
};
