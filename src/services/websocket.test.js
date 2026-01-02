/**
 * @fileoverview Tests for websocket service
 */

// Mock setup before any imports
let mockWss;
let connectionCallback;
let mockClient;

jest.mock('ws', () => ({
  WebSocketServer: jest.fn(() => mockWss)
}));

describe('websocket', () => {
  let websocket;

  beforeEach(() => {
    // Reset module state
    jest.resetModules();

    // Setup mock client
    mockClient = {
      readyState: 1, // WebSocket.OPEN
      send: jest.fn(),
      on: jest.fn()
    };

    // Setup mock WebSocketServer
    mockWss = {
      on: jest.fn((event, callback) => {
        if (event === 'connection') {
          connectionCallback = callback;
        }
      })
    };

    // Re-require ws mock
    jest.doMock('ws', () => ({
      WebSocketServer: jest.fn(() => mockWss)
    }));

    // Re-require the module to get fresh state
    websocket = require('./websocket');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('initWebSocket', () => {
    it('creates WebSocketServer with http server', () => {
      const { WebSocketServer } = require('ws');
      const mockServer = { on: jest.fn() };

      websocket.initWebSocket(mockServer);

      expect(WebSocketServer).toHaveBeenCalledWith({ server: mockServer });
    });

    it('sets up connection handler', () => {
      const mockServer = { on: jest.fn() };

      websocket.initWebSocket(mockServer);

      expect(mockWss.on).toHaveBeenCalledWith('connection', expect.any(Function));
    });

    it('sends connected message on new connection', () => {
      const mockServer = { on: jest.fn() };
      websocket.initWebSocket(mockServer);

      connectionCallback(mockClient);

      expect(mockClient.send).toHaveBeenCalledWith(
        JSON.stringify({
          type: 'connected',
          message: 'Connected to MediaMentions WebSocket'
        })
      );
    });

    it('registers close handler on client', () => {
      const mockServer = { on: jest.fn() };
      websocket.initWebSocket(mockServer);

      connectionCallback(mockClient);

      expect(mockClient.on).toHaveBeenCalledWith('close', expect.any(Function));
    });

    it('registers error handler on client', () => {
      const mockServer = { on: jest.fn() };
      websocket.initWebSocket(mockServer);

      connectionCallback(mockClient);

      expect(mockClient.on).toHaveBeenCalledWith('error', expect.any(Function));
    });
  });

  describe('broadcast', () => {
    it('does nothing when WebSocket not initialized', () => {
      // Don't initialize - broadcast should silently do nothing
      websocket.broadcast('test', { data: 'test' });

      // No error thrown is success
      expect(true).toBe(true);
    });

    it('sends message to connected clients', () => {
      const mockServer = { on: jest.fn() };
      websocket.initWebSocket(mockServer);
      connectionCallback(mockClient);

      // Clear the send mock after connected message
      mockClient.send.mockClear();

      websocket.broadcast('test_event', { value: 123 });

      expect(mockClient.send).toHaveBeenCalledWith(
        JSON.stringify({ type: 'test_event', value: 123 })
      );
    });

    it('skips clients that are not open', () => {
      const mockServer = { on: jest.fn() };
      websocket.initWebSocket(mockServer);

      // Connect client, then simulate closed state
      connectionCallback(mockClient);
      mockClient.readyState = 3; // WebSocket.CLOSED

      // Reset send mock after connected message
      mockClient.send.mockClear();

      websocket.broadcast('test', {});

      expect(mockClient.send).not.toHaveBeenCalled();
    });

    it('handles send errors gracefully', () => {
      const mockServer = { on: jest.fn() };
      websocket.initWebSocket(mockServer);
      connectionCallback(mockClient);

      // Make send throw an error
      mockClient.send.mockClear();
      mockClient.send.mockImplementation(() => {
        throw new Error('Connection lost');
      });

      // Should not throw
      expect(() => websocket.broadcast('test', {})).not.toThrow();
    });
  });

  describe('broadcastVerificationStatus', () => {
    it('broadcasts verification_status type', () => {
      const mockServer = { on: jest.fn() };
      websocket.initWebSocket(mockServer);
      connectionCallback(mockClient);
      mockClient.send.mockClear();

      const status = { phase: 'running', progress: 50 };
      websocket.broadcastVerificationStatus(status);

      expect(mockClient.send).toHaveBeenCalledWith(
        JSON.stringify({ type: 'verification_status', status })
      );
    });
  });

  describe('broadcastMentionVerified', () => {
    it('broadcasts mention verification details', () => {
      const mockServer = { on: jest.fn() };
      websocket.initWebSocket(mockServer);
      connectionCallback(mockClient);
      mockClient.send.mockClear();

      const mention = { id: 1, title: 'Test Article', clientName: 'TestCo' };
      const result = { verified: 1, reason: 'verified_fetch' };

      websocket.broadcastMentionVerified(mention, result);

      expect(mockClient.send).toHaveBeenCalledWith(
        JSON.stringify({
          type: 'mention_verified',
          mentionId: 1,
          verified: 1,
          reason: 'verified_fetch',
          title: 'Test Article',
          clientName: 'TestCo'
        })
      );
    });
  });

  describe('broadcastNewMention', () => {
    it('broadcasts new_mention with mention data', () => {
      const mockServer = { on: jest.fn() };
      websocket.initWebSocket(mockServer);
      connectionCallback(mockClient);
      mockClient.send.mockClear();

      const mention = { id: 5, title: 'New Article', link: 'https://example.com' };
      websocket.broadcastNewMention(mention);

      expect(mockClient.send).toHaveBeenCalledWith(
        JSON.stringify({ type: 'new_mention', mention })
      );
    });
  });

  describe('broadcastVerificationPhase', () => {
    it('broadcasts verification_phase with phase info', () => {
      const mockServer = { on: jest.fn() };
      websocket.initWebSocket(mockServer);
      connectionCallback(mockClient);
      mockClient.send.mockClear();

      websocket.broadcastVerificationPhase('start');

      expect(mockClient.send).toHaveBeenCalledWith(
        JSON.stringify({ type: 'verification_phase', phase: 'start' })
      );
    });

    it('includes stats when provided', () => {
      const mockServer = { on: jest.fn() };
      websocket.initWebSocket(mockServer);
      connectionCallback(mockClient);
      mockClient.send.mockClear();

      websocket.broadcastVerificationPhase('complete', { verified: 10, failed: 2 });

      expect(mockClient.send).toHaveBeenCalledWith(
        JSON.stringify({
          type: 'verification_phase',
          phase: 'complete',
          verified: 10,
          failed: 2
        })
      );
    });
  });
});
