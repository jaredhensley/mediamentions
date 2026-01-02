const { createClient, listClients, getClient, updateClient, deleteClient } = require('./clients');

// Mock dependencies
jest.mock('../db', () => ({
  runQuery: jest.fn()
}));

jest.mock('../utils/http', () => ({
  parseJsonBody: jest.fn(),
  sendJson: jest.fn(),
  buildUpdateFields: jest.fn()
}));

const { runQuery } = require('../db');
const { parseJsonBody, sendJson, buildUpdateFields } = require('../utils/http');

describe('Client Routes', () => {
  let mockRes;

  beforeEach(() => {
    jest.clearAllMocks();
    mockRes = {
      writeHead: jest.fn(),
      end: jest.fn()
    };
  });

  describe('createClient', () => {
    test('creates client with valid data', async () => {
      const mockReq = {};
      parseJsonBody.mockResolvedValue({
        name: 'Test Client',
        contactEmail: 'test@example.com'
      });
      runQuery.mockReturnValue([{ id: 1, name: 'Test Client', contactEmail: 'test@example.com' }]);

      await createClient(mockReq, mockRes);

      expect(sendJson).toHaveBeenCalledWith(
        mockRes,
        201,
        expect.objectContaining({ name: 'Test Client' })
      );
    });

    test('returns 400 for invalid data', async () => {
      const mockReq = {};
      parseJsonBody.mockResolvedValue({});

      await createClient(mockReq, mockRes);

      expect(sendJson).toHaveBeenCalledWith(
        mockRes,
        400,
        expect.objectContaining({ error: expect.any(String) })
      );
    });

    test('returns 400 on parse error', async () => {
      const mockReq = {};
      parseJsonBody.mockRejectedValue(new Error('Invalid JSON'));

      await createClient(mockReq, mockRes);

      expect(sendJson).toHaveBeenCalledWith(mockRes, 400, { error: 'Invalid JSON' });
    });

    test('creates client with optional alertsRssFeedUrl', async () => {
      const mockReq = {};
      parseJsonBody.mockResolvedValue({
        name: 'Test Client',
        contactEmail: 'test@example.com',
        alertsRssFeedUrl: 'https://example.com/rss'
      });
      runQuery.mockReturnValue([
        {
          id: 1,
          name: 'Test Client',
          contactEmail: 'test@example.com',
          alertsRssFeedUrl: 'https://example.com/rss'
        }
      ]);

      await createClient(mockReq, mockRes);

      expect(runQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO clients'),
        expect.arrayContaining(['Test Client', 'test@example.com', 'https://example.com/rss'])
      );
    });
  });

  describe('listClients', () => {
    test('returns all clients', async () => {
      const mockReq = {};
      const clients = [
        { id: 1, name: 'Client 1' },
        { id: 2, name: 'Client 2' }
      ];
      runQuery.mockReturnValue(clients);

      await listClients(mockReq, mockRes);

      expect(sendJson).toHaveBeenCalledWith(mockRes, 200, clients);
    });

    test('returns empty array when no clients', async () => {
      const mockReq = {};
      runQuery.mockReturnValue([]);

      await listClients(mockReq, mockRes);

      expect(sendJson).toHaveBeenCalledWith(mockRes, 200, []);
    });
  });

  describe('getClient', () => {
    test('returns client by id', async () => {
      const mockReq = {};
      const client = { id: 1, name: 'Test Client' };
      runQuery.mockReturnValue([client]);

      await getClient(mockReq, mockRes, { id: '1' });

      expect(sendJson).toHaveBeenCalledWith(mockRes, 200, client);
    });

    test('returns 404 for non-existent client', async () => {
      const mockReq = {};
      runQuery.mockReturnValue([]);

      await getClient(mockReq, mockRes, { id: '999' });

      expect(sendJson).toHaveBeenCalledWith(mockRes, 404, { error: 'Client not found' });
    });

    test('returns 400 for invalid id', async () => {
      const mockReq = {};

      await getClient(mockReq, mockRes, { id: 'invalid' });

      expect(sendJson).toHaveBeenCalledWith(
        mockRes,
        400,
        expect.objectContaining({ error: expect.any(String) })
      );
    });
  });

  describe('deleteClient', () => {
    test('deletes client and returns deleted data', async () => {
      const mockReq = {};
      const client = { id: 1, name: 'Test Client' };
      runQuery.mockReturnValue([client]);

      await deleteClient(mockReq, mockRes, { id: '1' });

      expect(sendJson).toHaveBeenCalledWith(mockRes, 200, client);
    });

    test('returns 404 for non-existent client', async () => {
      const mockReq = {};
      runQuery.mockReturnValue([]);

      await deleteClient(mockReq, mockRes, { id: '999' });

      expect(sendJson).toHaveBeenCalledWith(mockRes, 404, { error: 'Client not found' });
    });
  });

  describe('updateClient', () => {
    test('updates client with valid data', async () => {
      const mockReq = {};
      parseJsonBody.mockResolvedValue({ name: 'Updated Client' });
      buildUpdateFields.mockReturnValue({
        keys: ['name'],
        values: ['Updated Client']
      });
      runQuery.mockReturnValue([{ id: 1, name: 'Updated Client' }]);

      await updateClient(mockReq, mockRes, { id: '1' });

      expect(sendJson).toHaveBeenCalledWith(
        mockRes,
        200,
        expect.objectContaining({ name: 'Updated Client' })
      );
    });

    test('returns 404 when updating non-existent client', async () => {
      const mockReq = {};
      parseJsonBody.mockResolvedValue({ name: 'Updated Client' });
      buildUpdateFields.mockReturnValue({
        keys: ['name'],
        values: ['Updated Client']
      });
      runQuery.mockReturnValue([]);

      await updateClient(mockReq, mockRes, { id: '999' });

      expect(sendJson).toHaveBeenCalledWith(mockRes, 404, { error: 'Client not found' });
    });
  });
});
