/**
 * @fileoverview HTTP server entry point
 * Minimal server setup that delegates to route modules
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const { initializeDatabase } = require('./db');
const { seedDefaultClients } = require('./utils/seedDefaultClients');
const { seedDefaultPublications } = require('./utils/seedDefaultPublications');
const { scheduleDailySearch, scheduleRssPolling } = require('./services/scheduler');
const { initWebSocket } = require('./services/websocket');
const { validateConfig, config } = require('./config');
const { requireApiKey } = require('./middleware/auth');
const { matchRoute, sendJson } = require('./utils/http');
const { routes } = require('./routes');

// Static file serving for production (client build)
const CLIENT_DIST = path.join(__dirname, '..', 'client', 'dist');
const MIME_TYPES = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2'
};

function serveStaticFile(res, filePath) {
  const ext = path.extname(filePath);
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  try {
    const content = fs.readFileSync(filePath);
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(content);
    return true;
  } catch {
    return false;
  }
}

// Validate configuration before starting
validateConfig();

initializeDatabase();
seedDefaultClients();
seedDefaultPublications();

const PORT = process.env.PORT || 3000;

const server = http.createServer(async (req, res) => {
  const corsOrigin = config.server.corsOrigin;

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': corsOrigin,
      'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, X-API-Key'
    });
    res.end();
    return;
  }

  res.setHeader('Access-Control-Allow-Origin', corsOrigin);
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-API-Key');

  const urlPath = req.url.split('?')[0];
  const matchedRoute = routes.find(
    (route) => route.method === req.method && matchRoute(route.pattern, urlPath)
  );

  // If no API route matches, try to serve static files (for SPA)
  if (!matchedRoute) {
    // Check if client/dist exists (production build)
    if (fs.existsSync(CLIENT_DIST)) {
      // Try to serve the exact file
      const requestedFile = path.join(CLIENT_DIST, urlPath);
      if (fs.existsSync(requestedFile) && fs.statSync(requestedFile).isFile()) {
        serveStaticFile(res, requestedFile);
        return;
      }

      // For SPA: serve index.html for all non-file requests
      const indexPath = path.join(CLIENT_DIST, 'index.html');
      if (fs.existsSync(indexPath)) {
        serveStaticFile(res, indexPath);
        return;
      }
    }

    sendJson(res, 404, { error: 'Route not found' });
    return;
  }

  // Apply authentication middleware
  // Uses callback pattern since requireApiKey expects (req, res, next)
  const authPassed = await new Promise((resolve) => {
    requireApiKey(req, res, () => resolve(true));
    // If auth fails, requireApiKey sends 401 response and doesn't call next
    // Give it a moment to check - if response was sent, resolve false
    setImmediate(() => {
      if (res.writableEnded) resolve(false);
    });
  });

  if (!authPassed) return;

  const params = matchRoute(matchedRoute.pattern, req.url.split('?')[0]);
  try {
    await matchedRoute.handler(req, res, params || {});
  } catch (error) {
    sendJson(res, 500, { error: error.message });
  }
});

server.listen(PORT, async () => {
  console.log(`Server listening on port ${PORT}`);

  // Initialize WebSocket server for real-time updates BEFORE starting scheduler
  initWebSocket(server);

  // Kick off scheduled searches and run one immediately to populate mentions
  try {
    await scheduleDailySearch({ runImmediately: true });
  } catch (err) {
    console.error('[scheduler] failed to start search scheduler', err);
  }

  // Start RSS feed polling scheduler (runs every 2 hours)
  // Don't run immediately on startup - let daily search complete first
  try {
    await scheduleRssPolling({ runImmediately: false });
  } catch (err) {
    console.error('[scheduler] failed to start RSS polling scheduler', err);
  }
});
