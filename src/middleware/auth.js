const crypto = require('crypto');
const { config } = require('../config');

// Track whether we've warned about missing API key (only warn once)
let authWarningLogged = false;

/**
 * Middleware to require API key authentication
 * If API_KEY is not configured, authentication is disabled (dev mode)
 * @param {Object} req - HTTP request object
 * @param {Object} res - HTTP response object
 * @param {Function} next - Callback to continue request handling
 */
function requireApiKey(req, res, next) {
  const apiKey = req.headers['x-api-key'];
  const validApiKey = config.auth.apiKey;

  // If no API key is configured, skip authentication (dev mode)
  if (!validApiKey) {
    if (!authWarningLogged) {
      console.warn('[auth] No API_KEY configured - authentication disabled');
      authWarningLogged = true;
    }
    next();
    return;
  }

  if (!apiKey || apiKey !== validApiKey) {
    res.writeHead(401, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Unauthorized: Invalid or missing API key' }));
    return;
  }

  next();
}

/**
 * Generate a new API key with 'mm_' prefix
 * @returns {string} - Generated API key
 */
function generateApiKey() {
  return `mm_${crypto.randomBytes(32).toString('hex')}`;
}

module.exports = {
  requireApiKey,
  generateApiKey
};
