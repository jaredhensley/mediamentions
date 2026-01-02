/**
 * @fileoverview Content analysis utilities for verification
 * Handles HTML parsing, text extraction, and client name matching
 */

const { config } = require('../config');

/**
 * Indicators of Cloudflare/WAF block pages
 * If these appear in page content, the page is likely blocked
 */
const BLOCK_PAGE_INDICATORS = [
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
 * Check if page appears to be a block/challenge page
 * @param {string} textContent - Lowercase page text content
 * @returns {boolean} - True if page appears blocked
 */
function isBlockedPage(textContent) {
  if (!textContent) return false;
  return BLOCK_PAGE_INDICATORS.some((indicator) => textContent.includes(indicator));
}

/**
 * Check if content is suspiciously short (likely a block page)
 * @param {string} textContent - Page text content
 * @returns {boolean} - True if suspiciously short
 */
function isSuspiciouslyShortContent(textContent) {
  const minLength = config.verification.minContentLength || 1000;
  return !textContent || textContent.length < minLength;
}

/**
 * Extract text content from HTML
 * Removes scripts, styles, and HTML tags
 * @param {string} html - Raw HTML content
 * @returns {string} - Extracted lowercase text content
 */
function extractTextFromHtml(html) {
  if (!html) return '';

  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .toLowerCase();
}

/**
 * Check if content type indicates HTML content
 * @param {string} contentType - Content-Type header value
 * @returns {boolean} - True if HTML content
 */
function isHtmlContentType(contentType) {
  if (!contentType) return false;
  return contentType.includes('text/html') || contentType.includes('application/xhtml+xml');
}

/**
 * Check if content type indicates a document (PDF, Word, etc.)
 * @param {string} contentType - Content-Type header value
 * @returns {boolean} - True if document type
 */
function isDocumentContentType(contentType) {
  if (!contentType) return false;
  return (
    contentType.includes('application/pdf') ||
    contentType.includes('application/msword') ||
    contentType.includes('application/vnd.openxmlformats') ||
    contentType.includes('application/vnd.ms-')
  );
}

/**
 * Truncate title safely for display
 * @param {string} title - Title to truncate
 * @param {number} maxLength - Max length (default: 50)
 * @returns {string} - Truncated title
 */
function truncateTitle(title, maxLength = 50) {
  if (!title) return 'Untitled';
  if (title.length <= maxLength) return title;
  return title.substring(0, maxLength) + '...';
}

module.exports = {
  checkClientNameInContent,
  isBlockedPage,
  isSuspiciouslyShortContent,
  extractTextFromHtml,
  isHtmlContentType,
  isDocumentContentType,
  truncateTitle,
  BLOCK_PAGE_INDICATORS
};
