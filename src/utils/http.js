/**
 * @fileoverview HTTP utility functions for request/response handling
 */

/**
 * Parse JSON body from incoming request
 * @param {http.IncomingMessage} req - HTTP request object
 * @returns {Promise<Object>} - Parsed JSON body
 */
function parseJsonBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req
      .on('data', (chunk) => chunks.push(chunk))
      .on('end', () => {
        if (!chunks.length) {
          resolve({});
          return;
        }
        try {
          const parsed = JSON.parse(Buffer.concat(chunks).toString());
          resolve(parsed);
        } catch (error) {
          reject(error);
        }
      })
      .on('error', reject);
  });
}

/**
 * Send JSON response
 * @param {http.ServerResponse} res - HTTP response object
 * @param {number} status - HTTP status code
 * @param {Object} payload - Response payload
 */
function sendJson(res, status, payload) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(payload));
}

/**
 * Escape XML special characters
 * @param {string} value - String to escape
 * @returns {string} - Escaped string
 */
function escapeXml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Format date for display
 * @param {string|null} value - Date string or null
 * @returns {string} - Formatted date or empty string
 */
function formatDisplayDate(value) {
  if (!value) return '';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

/**
 * Build update fields for SQL UPDATE statements
 * @param {Object} body - Request body with fields to update
 * @param {string[]} allowedKeys - List of allowed field names
 * @returns {{ keys: string[], values: any[] }} - Keys and values for SQL
 */
function buildUpdateFields(body, allowedKeys) {
  const keys = [];
  const values = [];
  allowedKeys.forEach((key) => {
    if (body[key] !== undefined) {
      keys.push(key);
      values.push(body[key]);
    }
  });
  return { keys, values };
}

/**
 * Match a URL path against a route pattern
 * @param {string} pattern - Route pattern with :param placeholders
 * @param {string} path - URL path to match
 * @returns {Object|null} - Matched params or null if no match
 */
function matchRoute(pattern, path) {
  const patternParts = pattern.split('/').filter(Boolean);
  const pathParts = path.split('/').filter(Boolean);
  if (patternParts.length !== pathParts.length) return null;
  const params = {};
  for (let i = 0; i < patternParts.length; i += 1) {
    const patternPart = patternParts[i];
    const pathPart = pathParts[i];
    if (patternPart.startsWith(':')) {
      params[patternPart.slice(1)] = decodeURIComponent(pathPart);
    } else if (patternPart !== pathPart) {
      return null;
    }
  }
  return params;
}

module.exports = {
  parseJsonBody,
  sendJson,
  escapeXml,
  formatDisplayDate,
  buildUpdateFields,
  matchRoute
};
