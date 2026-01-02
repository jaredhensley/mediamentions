/**
 * @fileoverview URL validation and security utilities
 * Handles URL validation, private IP blocking, and URL normalization checks
 */

const { normalizeUrlForComparison } = require('./mentions');
const { runQuery } = require('../db');

/**
 * Patterns for blocked/private IP addresses and hostnames
 * These should never be accessed to prevent SSRF attacks
 */
const BLOCKED_HOST_PATTERNS = [
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

/**
 * Validate URL before fetching
 * Ensures URL is safe to fetch (no private IPs, valid protocol)
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
    if (BLOCKED_HOST_PATTERNS.some((pattern) => pattern.test(hostname))) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

/**
 * Check if a mention URL already exists in the database
 * @param {string} url - URL to check
 * @param {number} clientId - Client ID to check for
 * @returns {boolean} - True if mention with this URL exists for this client
 */
function mentionExistsForUrl(url, clientId) {
  if (!url || !clientId) return false;

  const normalized = normalizeUrlForComparison(url);
  if (!normalized) return false;

  // Check both exact match and normalized match
  const existing = runQuery(
    `SELECT id FROM mediaMentions
     WHERE clientId = @p0 AND (link = @p1 OR link = @p2)
     LIMIT 1`,
    [clientId, url, normalized]
  );

  return existing && existing.length > 0;
}

/**
 * Extract hostname from URL safely
 * @param {string} url - URL to extract hostname from
 * @returns {string|null} - Hostname or null if invalid
 */
function extractHostname(url) {
  if (!url) return null;
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return null;
  }
}

module.exports = {
  isValidUrl,
  mentionExistsForUrl,
  extractHostname,
  BLOCKED_HOST_PATTERNS
};
