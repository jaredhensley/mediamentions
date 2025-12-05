/**
 * @fileoverview HTTP server entry point
 * Minimal server setup that delegates to route modules
 */

const http = require('http');
const { initializeDatabase } = require('./db');
const { seedDefaultClients } = require('./utils/seedDefaultClients');
const { seedDefaultPublications } = require('./utils/seedDefaultPublications');
const { scheduleDailySearch } = require('./services/scheduler');
const { initWebSocket } = require('./services/websocket');
const { validateConfig, config } = require('./config');
const { requireApiKey } = require('./middleware/auth');
const { matchRoute, sendJson } = require('./utils/http');
const { routes } = require('./routes');

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
      'Access-Control-Allow-Headers': 'Content-Type, X-API-Key',
    });
    res.end();
    return;
  }

  res.setHeader('Access-Control-Allow-Origin', corsOrigin);
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-API-Key');

  const matchedRoute = routes.find((route) => route.method === req.method && matchRoute(route.pattern, req.url.split('?')[0]));
  if (!matchedRoute) {
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
  // eslint-disable-next-line no-console
  console.log(`Server listening on port ${PORT}`);

  // Initialize WebSocket server for real-time updates BEFORE starting scheduler
  initWebSocket(server);

  // Kick off scheduled searches and run one immediately to populate mentions
  try {
    await scheduleDailySearch({ runImmediately: true });
  } catch (err) {
    console.error('[scheduler] failed to start search scheduler', err);
  }
});
