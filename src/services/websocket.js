const { WebSocketServer } = require('ws');

let wss = null;
const clients = new Set();

/**
 * Initialize WebSocket server attached to the HTTP server
 * @param {http.Server} server - The HTTP server instance
 */
function initWebSocket(server) {
  wss = new WebSocketServer({ server });

  wss.on('connection', (ws) => {
    clients.add(ws);

    ws.on('close', () => {
      clients.delete(ws);
    });

    ws.on('error', (error) => {
      console.error('[websocket] Client error:', error.message);
      clients.delete(ws);
    });

    // Send current status on connection
    ws.send(
      JSON.stringify({
        type: 'connected',
        message: 'Connected to MediaMentions WebSocket'
      })
    );
  });

  console.log('[websocket] WebSocket server initialized');
}

/**
 * Broadcast a message to all connected clients
 * @param {string} type - Message type
 * @param {Object} data - Message data
 */
function broadcast(type, data) {
  if (!wss) return;

  const message = JSON.stringify({ type, ...data });

  clients.forEach((client) => {
    if (client.readyState === 1) {
      // WebSocket.OPEN
      try {
        client.send(message);
      } catch (err) {
        // Remove client on send error
        console.error('[websocket] Failed to send message to client:', err.message);
        clients.delete(client);
      }
    }
  });
}

/**
 * Send verification status update
 * @param {Object} status - Verification status object
 */
function broadcastVerificationStatus(status) {
  broadcast('verification_status', { status });
}

/**
 * Send notification when a mention is verified
 * @param {Object} mention - The mention that was verified
 * @param {Object} result - Verification result
 */
function broadcastMentionVerified(mention, result) {
  broadcast('mention_verified', {
    mentionId: mention.id,
    verified: result.verified,
    reason: result.reason,
    title: mention.title,
    clientName: mention.clientName
  });
}

/**
 * Send notification when a new mention is created
 * @param {Object} mention - The new mention
 */
function broadcastNewMention(mention) {
  broadcast('new_mention', { mention });
}

/**
 * Send notification when verification process starts/ends
 * @param {string} phase - 'start' or 'complete'
 * @param {Object} stats - Optional stats for completion
 */
function broadcastVerificationPhase(phase, stats = {}) {
  broadcast('verification_phase', { phase, ...stats });
}

module.exports = {
  initWebSocket,
  broadcast,
  broadcastVerificationStatus,
  broadcastMentionVerified,
  broadcastNewMention,
  broadcastVerificationPhase
};
