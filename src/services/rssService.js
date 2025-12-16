/**
 * @fileoverview Google Alerts RSS feed polling service
 * Polls configured RSS feeds for each client and creates mentions from new entries
 */

const { randomUUID } = require('crypto');
const { runQuery } = require('../db');
const { normalizeResult, dedupeMentions, recordMentions } = require('../utils/mentions');
const { verifyAllMentions } = require('../scripts/verifyMentions');
const verificationStatus = require('./verificationStatus');

/**
 * Parse RSS/Atom XML into items array
 * Google Alerts uses Atom format with <entry> tags
 * @param {string} xml - Raw RSS/Atom XML content
 * @returns {Array<{title: string, link: string, pubDate: string, description: string}>}
 */
function parseRssXml(xml) {
  const items = [];

  // Try Atom format first (Google Alerts uses this)
  const entryRegex = /<entry>([\s\S]*?)<\/entry>/g;
  let match;

  while ((match = entryRegex.exec(xml)) !== null) {
    const entryXml = match[1];

    const title = extractTag(entryXml, 'title');
    // Atom uses <link href="..."> attribute, not content
    const rawLink = extractLinkHref(entryXml) || extractTag(entryXml, 'link');
    const pubDate = extractTag(entryXml, 'published') || extractTag(entryXml, 'updated');
    const description = extractTag(entryXml, 'content') || extractTag(entryXml, 'summary');

    // Decode HTML entities in the link before processing
    const decodedLink = rawLink ? decodeXmlEntities(rawLink) : null;

    if (decodedLink) {
      items.push({
        title: decodeHtmlEntities(title || 'Untitled'),
        link: cleanGoogleAlertUrl(decodedLink),
        pubDate,
        description: decodeHtmlEntities(description || '')
      });
    }
  }

  // If no Atom entries found, try RSS format
  if (items.length === 0) {
    const itemRegex = /<item>([\s\S]*?)<\/item>/g;
    while ((match = itemRegex.exec(xml)) !== null) {
      const itemXml = match[1];

      const title = extractTag(itemXml, 'title');
      const rawLink = extractTag(itemXml, 'link');
      const pubDate = extractTag(itemXml, 'pubDate');
      const description = extractTag(itemXml, 'description');

      const decodedLink = rawLink ? decodeXmlEntities(rawLink) : null;

      if (decodedLink) {
        items.push({
          title: decodeHtmlEntities(title || 'Untitled'),
          link: cleanGoogleAlertUrl(decodedLink),
          pubDate,
          description: decodeHtmlEntities(description || '')
        });
      }
    }
  }

  return items;
}

/**
 * Extract href attribute from link tag (Atom format)
 * @param {string} xml - XML string
 * @returns {string|null}
 */
function extractLinkHref(xml) {
  const linkRegex = /<link[^>]*href=["']([^"']+)["'][^>]*>/i;
  const match = xml.match(linkRegex);
  return match ? match[1] : null;
}

/**
 * Extract content from an XML tag
 * @param {string} xml - XML string
 * @param {string} tagName - Tag name to extract
 * @returns {string|null}
 */
function extractTag(xml, tagName) {
  // Handle CDATA sections (with optional attributes on the tag)
  const cdataRegex = new RegExp(`<${tagName}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]></${tagName}>`, 'i');
  const cdataMatch = xml.match(cdataRegex);
  if (cdataMatch) {
    return cdataMatch[1].trim();
  }

  // Handle regular tags (with optional attributes like type="html")
  const regex = new RegExp(`<${tagName}[^>]*>([\\s\\S]*?)</${tagName}>`, 'i');
  const match = xml.match(regex);
  return match ? match[1].trim() : null;
}

/**
 * Decode XML entities only (preserves HTML tags)
 * @param {string} str - String with XML entities
 * @returns {string}
 */
function decodeXmlEntities(str) {
  if (!str) return str;
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'");
}

/**
 * Decode HTML entities and strip HTML tags
 * @param {string} str - String with HTML entities and possibly HTML tags
 * @returns {string}
 */
function decodeHtmlEntities(str) {
  if (!str) return str;
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/<[^>]+>/g, ' ')  // Strip HTML tags
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Google Alerts URLs are redirect URLs - extract the actual target URL
 * @param {string} url - Google redirect URL
 * @returns {string} - Actual target URL
 */
function cleanGoogleAlertUrl(url) {
  try {
    const parsed = new URL(url);
    // Google Alerts uses a redirect URL like:
    // https://www.google.com/url?rct=j&sa=t&url=https://actual-site.com/...
    if (parsed.hostname.includes('google.com') && parsed.searchParams.has('url')) {
      return parsed.searchParams.get('url');
    }
    return url;
  } catch {
    return url;
  }
}

/**
 * Fetch and parse an RSS feed
 * @param {string} feedUrl - RSS feed URL
 * @returns {Promise<Array>} - Parsed RSS items
 */
async function fetchRssFeed(feedUrl) {
  const response = await fetch(feedUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; MediaMentions/1.0)',
      'Accept': 'application/rss+xml, application/xml, text/xml'
    }
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch RSS feed: ${response.status} ${response.statusText}`);
  }

  const xml = await response.text();
  return parseRssXml(xml);
}

/**
 * Convert RSS item to our standard result format
 * @param {Object} item - RSS item
 * @param {Object} client - Client object
 * @returns {Object} - Normalized result
 */
function rssItemToResult(item, client) {
  const publishedAt = item.pubDate ? new Date(item.pubDate).toISOString() : null;

  return {
    id: randomUUID(),
    title: item.title,
    url: item.link,
    snippet: item.description,
    publishedAt,
    provider: 'google-alerts-rss'
  };
}

/**
 * Load all clients with RSS feed URLs configured
 * @returns {Array} - Clients with alertsRssFeedUrl set
 */
function loadClientsWithRssFeeds() {
  return runQuery('SELECT id, name, alertsRssFeedUrl FROM clients WHERE alertsRssFeedUrl IS NOT NULL AND alertsRssFeedUrl != "" ORDER BY id;');
}

/**
 * Poll all RSS feeds and create mentions from new entries
 * @param {Object} options - Options
 * @param {boolean} options.runVerification - Whether to run verification after creating mentions (default: false)
 * @returns {Promise<Object>} - Job result log
 */
async function pollRssFeeds({ runVerification = false } = {}) {
  const jobLog = {
    id: randomUUID(),
    startedAt: new Date().toISOString(),
    status: 'running',
    errors: [],
    feedsPolled: 0,
    entriesFound: 0,
    mentionsCreated: 0
  };

  console.log('[rss] Starting RSS feed polling...');

  const clients = loadClientsWithRssFeeds();
  if (clients.length === 0) {
    console.log('[rss] No clients with RSS feeds configured');
    jobLog.status = 'completed';
    jobLog.finishedAt = new Date().toISOString();
    return jobLog;
  }

  console.log(`[rss] Found ${clients.length} client(s) with RSS feeds`);

  for (const client of clients) {
    try {
      console.log(`[rss] Polling feed for ${client.name}...`);
      const items = await fetchRssFeed(client.alertsRssFeedUrl);
      jobLog.feedsPolled++;
      jobLog.entriesFound += items.length;

      if (items.length === 0) {
        console.log(`[rss] No items in feed for ${client.name}`);
        continue;
      }

      console.log(`[rss] Found ${items.length} items in feed for ${client.name}`);

      // Convert RSS items to our result format
      const results = items.map(item => {
        const baseResult = rssItemToResult(item, client);
        return normalizeResult(baseResult, client);
      });

      // Deduplicate
      const deduped = dedupeMentions(results);

      // Record mentions (this handles DB-level deduplication too)
      const created = recordMentions(deduped, 'new');
      jobLog.mentionsCreated += created.length;

      if (created.length > 0) {
        console.log(`[rss] Created ${created.length} new mention(s) for ${client.name}`);
      }

    } catch (err) {
      console.warn(`[rss] ✗ Failed to poll feed for ${client.name}: ${err.message}`);
      jobLog.errors.push({ clientId: client.id, clientName: client.name, message: err.message });
    }
  }

  // Run verification if requested and we created mentions
  if (runVerification && jobLog.mentionsCreated > 0) {
    console.log('\n[rss/verification] Starting automatic verification of new mentions...');
    const totalMentions = runQuery('SELECT COUNT(*) as count FROM mediaMentions WHERE verified IS NULL OR verified != 1')[0]?.count || 0;
    verificationStatus.setVerifying(totalMentions);
    try {
      const verificationResults = await verifyAllMentions({ silent: false });
      jobLog.verificationResults = verificationResults;
      verificationStatus.setComplete(verificationResults);
      console.log(`[rss/verification] ✓ Completed: ${verificationResults.verified} verified, ${verificationResults.failed} failed`);
    } catch (err) {
      console.warn(`[rss/verification] ✗ Failed: ${err.message}`);
      jobLog.errors.push({ step: 'verification', message: err.message });
      verificationStatus.setComplete({ total: 0, verified: 0, failed: 0 });
    }
  }

  jobLog.finishedAt = new Date().toISOString();
  jobLog.status = jobLog.errors.length ? 'completed_with_errors' : 'completed';

  console.log(`[rss] Completed: ${jobLog.feedsPolled} feeds polled, ${jobLog.entriesFound} entries found, ${jobLog.mentionsCreated} mentions created`);

  return jobLog;
}

module.exports = {
  pollRssFeeds,
  fetchRssFeed,
  parseRssXml,
  loadClientsWithRssFeeds
};
