const {
  listMediaMentions,
  createMediaMention,
  getMediaMention,
  deleteMediaMention
} = require('./mentions');

// Mock dependencies
jest.mock('../db', () => ({
  runQuery: jest.fn()
}));

jest.mock('../utils/http', () => ({
  parseJsonBody: jest.fn(),
  sendJson: jest.fn(),
  buildUpdateFields: jest.fn()
}));

jest.mock('../utils/mentions', () => ({
  normalizeUrlForComparison: jest.fn((url) => (url ? url.toLowerCase() : null))
}));

const { runQuery } = require('../db');
const { parseJsonBody, sendJson } = require('../utils/http');

describe('Media Mention Routes', () => {
  let mockRes;

  beforeEach(() => {
    jest.clearAllMocks();
    mockRes = {
      writeHead: jest.fn(),
      end: jest.fn()
    };
  });

  describe('listMediaMentions', () => {
    test('returns all mentions without filters', async () => {
      const mockReq = { url: '/media-mentions' };
      const mentions = [
        { id: 1, title: 'Article 1' },
        { id: 2, title: 'Article 2' }
      ];
      runQuery.mockReturnValue(mentions);

      await listMediaMentions(mockReq, mockRes);

      expect(sendJson).toHaveBeenCalledWith(mockRes, 200, mentions);
    });

    test('filters by clientId', async () => {
      const mockReq = { url: '/media-mentions?clientId=1' };
      const mentions = [{ id: 1, title: 'Article 1', clientId: 1 }];
      runQuery.mockReturnValue(mentions);

      await listMediaMentions(mockReq, mockRes);

      expect(runQuery).toHaveBeenCalledWith(
        expect.stringContaining('clientId=@p0'),
        expect.arrayContaining([1])
      );
    });

    test('filters by publicationId', async () => {
      const mockReq = { url: '/media-mentions?publicationId=5' };
      runQuery.mockReturnValue([]);

      await listMediaMentions(mockReq, mockRes);

      expect(runQuery).toHaveBeenCalledWith(
        expect.stringContaining('publicationId=@p0'),
        expect.arrayContaining([5])
      );
    });

    test('filters by date range', async () => {
      const mockReq = { url: '/media-mentions?startDate=2025-01-01&endDate=2025-12-31' };
      runQuery.mockReturnValue([]);

      await listMediaMentions(mockReq, mockRes);

      expect(runQuery).toHaveBeenCalledWith(
        expect.stringContaining('mentionDate >='),
        expect.arrayContaining(['2025-01-01', '2025-12-31'])
      );
    });

    test('filters by subject matter', async () => {
      const mockReq = { url: '/media-mentions?subject=produce' };
      runQuery.mockReturnValue([]);

      await listMediaMentions(mockReq, mockRes);

      expect(runQuery).toHaveBeenCalledWith(
        expect.stringContaining('subjectMatter LIKE'),
        expect.arrayContaining(['%produce%'])
      );
    });

    test('combines multiple filters', async () => {
      const mockReq = { url: '/media-mentions?clientId=1&publicationId=2' };
      runQuery.mockReturnValue([]);

      await listMediaMentions(mockReq, mockRes);

      expect(runQuery).toHaveBeenCalledWith(
        expect.stringContaining('AND'),
        expect.arrayContaining([1, 2])
      );
    });
  });

  describe('createMediaMention', () => {
    test('creates mention with valid data', async () => {
      const mockReq = {};
      parseJsonBody.mockResolvedValue({
        title: 'New Article',
        mentionDate: '2025-01-01',
        clientId: 1,
        publicationId: 1,
        link: 'https://example.com/article'
      });
      runQuery.mockReturnValue([
        {
          id: 1,
          title: 'New Article',
          link: 'https://example.com/article'
        }
      ]);

      await createMediaMention(mockReq, mockRes);

      expect(sendJson).toHaveBeenCalledWith(
        mockRes,
        201,
        expect.objectContaining({ title: 'New Article' })
      );
    });

    test('returns 400 for missing required fields', async () => {
      const mockReq = {};
      parseJsonBody.mockResolvedValue({
        title: 'New Article'
        // Missing required fields
      });

      await createMediaMention(mockReq, mockRes);

      expect(sendJson).toHaveBeenCalledWith(
        mockRes,
        400,
        expect.objectContaining({ error: expect.any(String) })
      );
    });

    test('normalizes URL before storing', async () => {
      const mockReq = {};
      parseJsonBody.mockResolvedValue({
        title: 'New Article',
        mentionDate: '2025-01-01',
        clientId: 1,
        publicationId: 1,
        link: 'HTTPS://EXAMPLE.COM/ARTICLE'
      });
      runQuery.mockReturnValue([{ id: 1 }]);

      await createMediaMention(mockReq, mockRes);

      expect(runQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT'),
        expect.arrayContaining(['https://example.com/article'])
      );
    });

    test('sets default status to new', async () => {
      const mockReq = {};
      parseJsonBody.mockResolvedValue({
        title: 'New Article',
        mentionDate: '2025-01-01',
        clientId: 1,
        publicationId: 1,
        link: 'https://example.com/article'
      });
      runQuery.mockReturnValue([{ id: 1 }]);

      await createMediaMention(mockReq, mockRes);

      expect(runQuery).toHaveBeenCalledWith(expect.any(String), expect.arrayContaining(['new']));
    });
  });

  describe('getMediaMention', () => {
    test('returns mention by id', async () => {
      const mockReq = {};
      const mention = { id: 1, title: 'Test Article' };
      runQuery.mockReturnValue([mention]);

      await getMediaMention(mockReq, mockRes, { id: '1' });

      expect(sendJson).toHaveBeenCalledWith(mockRes, 200, mention);
    });

    test('returns 404 for non-existent mention', async () => {
      const mockReq = {};
      runQuery.mockReturnValue([]);

      await getMediaMention(mockReq, mockRes, { id: '999' });

      expect(sendJson).toHaveBeenCalledWith(mockRes, 404, { error: 'Media mention not found' });
    });
  });

  describe('deleteMediaMention', () => {
    test('deletes mention and archives it', async () => {
      const mockReq = {};
      runQuery.mockReturnValueOnce([
        {
          id: 1,
          title: 'Test Article',
          clientName: 'Client',
          publicationName: 'Publication'
        }
      ]); // SELECT with joins
      runQuery.mockReturnValueOnce([]); // INSERT into deletedMentions
      runQuery.mockReturnValueOnce([]); // DELETE

      await deleteMediaMention(mockReq, mockRes, { id: '1' });

      // Verify archived
      expect(runQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO deletedMentions'),
        expect.any(Array)
      );
      // Verify deleted
      expect(runQuery).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM mediaMentions'),
        [1]
      );
    });

    test('returns 404 for non-existent mention', async () => {
      const mockReq = {};
      runQuery.mockReturnValue([]);

      await deleteMediaMention(mockReq, mockRes, { id: '999' });

      expect(sendJson).toHaveBeenCalledWith(mockRes, 404, { error: 'Media mention not found' });
    });

    test('returns 400 for invalid id', async () => {
      const mockReq = {};

      await deleteMediaMention(mockReq, mockRes, { id: 'invalid' });

      expect(sendJson).toHaveBeenCalledWith(
        mockRes,
        400,
        expect.objectContaining({ error: expect.any(String) })
      );
    });
  });
});
