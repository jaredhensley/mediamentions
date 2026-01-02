const {
  healthCheck,
  verificationStatus,
  listPendingReview,
  acceptPendingReview,
  rejectPendingReview,
  getPendingReviewCount,
  getRssFeedStatus
} = require('./admin');

// Mock dependencies
jest.mock('../db', () => ({
  runQuery: jest.fn(),
  runExecute: jest.fn()
}));

jest.mock('../utils/http', () => ({
  sendJson: jest.fn()
}));

jest.mock('../services/verificationStatus', () => ({
  getStatus: jest.fn()
}));

jest.mock('../services/rssService', () => ({
  pollRssFeeds: jest.fn(),
  loadClientsWithRssFeeds: jest.fn()
}));

const { runQuery } = require('../db');
const { sendJson } = require('../utils/http');
const { getStatus } = require('../services/verificationStatus');
const { loadClientsWithRssFeeds } = require('../services/rssService');

describe('Admin Routes', () => {
  let mockRes;

  beforeEach(() => {
    jest.clearAllMocks();
    mockRes = {
      writeHead: jest.fn(),
      end: jest.fn()
    };
  });

  describe('healthCheck', () => {
    test('returns ok status with timestamp', () => {
      const mockReq = {};

      healthCheck(mockReq, mockRes);

      expect(sendJson).toHaveBeenCalledWith(
        mockRes,
        200,
        expect.objectContaining({
          status: 'ok',
          timestamp: expect.any(String)
        })
      );
    });
  });

  describe('verificationStatus', () => {
    test('returns verification status', () => {
      const mockReq = {};
      const status = { total: 10, verified: 5, failed: 2 };
      getStatus.mockReturnValue(status);

      verificationStatus(mockReq, mockRes);

      expect(sendJson).toHaveBeenCalledWith(mockRes, 200, status);
    });
  });

  describe('listPendingReview', () => {
    test('returns list of pending mentions', () => {
      const mockReq = {};
      const pendingMentions = [
        { id: 1, title: 'Article 1', verified: null },
        { id: 2, title: 'Article 2', verified: null }
      ];
      runQuery.mockReturnValue(pendingMentions);

      listPendingReview(mockReq, mockRes);

      expect(sendJson).toHaveBeenCalledWith(mockRes, 200, pendingMentions);
    });

    test('returns empty array when no pending mentions', () => {
      const mockReq = {};
      runQuery.mockReturnValue([]);

      listPendingReview(mockReq, mockRes);

      expect(sendJson).toHaveBeenCalledWith(mockRes, 200, []);
    });
  });

  describe('acceptPendingReview', () => {
    test('accepts pending mention', () => {
      const mockReq = {};
      runQuery.mockReturnValueOnce([{ id: 1, verified: null }]); // SELECT
      runQuery.mockReturnValueOnce([]); // UPDATE

      acceptPendingReview(mockReq, mockRes, { id: '1' });

      expect(sendJson).toHaveBeenCalledWith(
        mockRes,
        200,
        expect.objectContaining({ success: true, id: 1, verified: 1 })
      );
    });

    test('returns 404 for non-existent mention', () => {
      const mockReq = {};
      runQuery.mockReturnValue([]);

      acceptPendingReview(mockReq, mockRes, { id: '999' });

      expect(sendJson).toHaveBeenCalledWith(mockRes, 404, { error: 'Mention not found' });
    });

    test('returns 400 for invalid id', () => {
      const mockReq = {};

      acceptPendingReview(mockReq, mockRes, { id: 'invalid' });

      expect(sendJson).toHaveBeenCalledWith(mockRes, 400, { error: 'Invalid ID' });
    });

    test('returns 400 if mention already reviewed', () => {
      const mockReq = {};
      runQuery.mockReturnValue([{ id: 1, verified: 1 }]); // Already verified

      acceptPendingReview(mockReq, mockRes, { id: '1' });

      expect(sendJson).toHaveBeenCalledWith(mockRes, 400, {
        error: 'Mention is not pending review'
      });
    });
  });

  describe('rejectPendingReview', () => {
    test('rejects pending mention and archives it', () => {
      const mockReq = {};
      runQuery.mockReturnValueOnce([
        {
          id: 1,
          verified: null,
          title: 'Test Article',
          clientName: 'Client',
          publicationName: 'Publication'
        }
      ]); // SELECT
      runQuery.mockReturnValueOnce([]); // INSERT into deletedMentions
      runQuery.mockReturnValueOnce([]); // UPDATE

      rejectPendingReview(mockReq, mockRes, { id: '1' });

      expect(sendJson).toHaveBeenCalledWith(
        mockRes,
        200,
        expect.objectContaining({ success: true, id: 1, verified: 0 })
      );
    });

    test('returns 404 for non-existent mention', () => {
      const mockReq = {};
      runQuery.mockReturnValue([]);

      rejectPendingReview(mockReq, mockRes, { id: '999' });

      expect(sendJson).toHaveBeenCalledWith(mockRes, 404, { error: 'Mention not found' });
    });

    test('returns 400 if mention already reviewed', () => {
      const mockReq = {};
      runQuery.mockReturnValue([{ id: 1, verified: 0 }]); // Already rejected

      rejectPendingReview(mockReq, mockRes, { id: '1' });

      expect(sendJson).toHaveBeenCalledWith(mockRes, 400, {
        error: 'Mention is not pending review'
      });
    });
  });

  describe('getPendingReviewCount', () => {
    test('returns count of pending mentions', () => {
      const mockReq = {};
      runQuery.mockReturnValue([{ count: 5 }]);

      getPendingReviewCount(mockReq, mockRes);

      expect(sendJson).toHaveBeenCalledWith(mockRes, 200, { count: 5 });
    });

    test('returns 0 when no pending mentions', () => {
      const mockReq = {};
      runQuery.mockReturnValue([{ count: 0 }]);

      getPendingReviewCount(mockReq, mockRes);

      expect(sendJson).toHaveBeenCalledWith(mockRes, 200, { count: 0 });
    });

    test('handles missing count gracefully', () => {
      const mockReq = {};
      runQuery.mockReturnValue([]);

      getPendingReviewCount(mockReq, mockRes);

      expect(sendJson).toHaveBeenCalledWith(mockRes, 200, { count: 0 });
    });
  });

  describe('getRssFeedStatus', () => {
    test('returns RSS feed status for clients', () => {
      const mockReq = {};
      loadClientsWithRssFeeds.mockReturnValue([
        { id: 1, name: 'Client 1', alertsRssFeedUrl: 'https://example.com/rss1' },
        { id: 2, name: 'Client 2', alertsRssFeedUrl: 'https://example.com/rss2' }
      ]);

      getRssFeedStatus(mockReq, mockRes);

      expect(sendJson).toHaveBeenCalledWith(mockRes, 200, {
        clientsWithFeeds: 2,
        clients: expect.arrayContaining([
          expect.objectContaining({ id: 1, name: 'Client 1' }),
          expect.objectContaining({ id: 2, name: 'Client 2' })
        ])
      });
    });

    test('returns empty when no clients have RSS feeds', () => {
      const mockReq = {};
      loadClientsWithRssFeeds.mockReturnValue([]);

      getRssFeedStatus(mockReq, mockRes);

      expect(sendJson).toHaveBeenCalledWith(mockRes, 200, {
        clientsWithFeeds: 0,
        clients: []
      });
    });
  });
});
