const crypto = require('crypto');

function requireApiKey(req, res, next) {
  const apiKey = req.headers['x-api-key'];
  const validApiKey = process.env.API_KEY;

  // If no API key is configured, skip authentication (dev mode)
  if (!validApiKey) {
    console.warn('[auth] No API_KEY configured - authentication disabled');
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

function generateApiKey() {
  return `mm_${crypto.randomBytes(32).toString('hex')}`;
}

module.exports = {
  requireApiKey,
  generateApiKey
};
