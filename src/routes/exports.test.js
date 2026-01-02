const {
  buildExcelXml,
  escapeCSV,
  exportFalsePositives,
  exportDeletedMentions
} = require('./exports');

// Mock dependencies
jest.mock('../db', () => ({
  runQuery: jest.fn()
}));

jest.mock('../utils/http', () => ({
  sendJson: jest.fn(),
  escapeXml: jest.fn((str) =>
    str.replace(
      /[<>&"]/g,
      (c) =>
        ({
          '<': '&lt;',
          '>': '&gt;',
          '&': '&amp;',
          '"': '&quot;'
        })[c]
    )
  ),
  formatDisplayDate: jest.fn((date) => (date ? new Date(date).toLocaleDateString() : ''))
}));

const { runQuery } = require('../db');

describe('Export Routes', () => {
  let mockRes;

  beforeEach(() => {
    jest.clearAllMocks();
    mockRes = {
      writeHead: jest.fn(),
      end: jest.fn()
    };
  });

  describe('escapeCSV', () => {
    test('returns empty string for null', () => {
      expect(escapeCSV(null)).toBe('');
    });

    test('returns empty string for undefined', () => {
      expect(escapeCSV(undefined)).toBe('');
    });

    test('returns string as-is when no special characters', () => {
      expect(escapeCSV('simple text')).toBe('simple text');
    });

    test('wraps in quotes when contains comma', () => {
      expect(escapeCSV('hello, world')).toBe('"hello, world"');
    });

    test('wraps in quotes and escapes when contains double quote', () => {
      expect(escapeCSV('say "hello"')).toBe('"say ""hello"""');
    });

    test('wraps in quotes when contains newline', () => {
      expect(escapeCSV('line1\nline2')).toBe('"line1\nline2"');
    });

    test('converts numbers to strings', () => {
      expect(escapeCSV(123)).toBe('123');
    });
  });

  describe('buildExcelXml', () => {
    test('generates valid XML structure', () => {
      const rows = [];
      const xml = buildExcelXml(rows);

      expect(xml).toContain('<?xml version="1.0"?>');
      expect(xml).toContain('<Workbook');
      expect(xml).toContain('</Workbook>');
      expect(xml).toContain('<Worksheet');
      expect(xml).toContain('</Table>');
    });

    test('includes client name in title row when provided', () => {
      const rows = [];
      const xml = buildExcelXml(rows, { clientName: 'Test Client' });

      expect(xml).toContain('Test Client Media Mentions');
    });

    test('generates data rows for mentions', () => {
      const rows = [
        {
          mentionDate: '2025-01-01',
          source: 'example.com',
          title: 'Test Article',
          subjectMatter: 'Topic',
          link: 'https://example.com/article'
        }
      ];
      const xml = buildExcelXml(rows);

      expect(xml).toContain('Test Article');
      expect(xml).toContain('example.com');
    });

    test('includes header row with column names', () => {
      const rows = [];
      const xml = buildExcelXml(rows);

      expect(xml).toContain('Date');
      expect(xml).toContain('Publication Name');
      expect(xml).toContain('Title');
      expect(xml).toContain('Topic');
      expect(xml).toContain('Link');
    });

    test('uses publicationName as fallback when source is missing', () => {
      const rows = [
        {
          mentionDate: '2025-01-01',
          publicationName: 'Publication Name',
          title: 'Test Article',
          link: 'https://example.com/article'
        }
      ];
      const xml = buildExcelXml(rows);

      expect(xml).toContain('Publication Name');
    });
  });

  describe('exportFalsePositives', () => {
    test('exports CSV with correct headers', () => {
      const mockReq = {};
      runQuery.mockReturnValue([]);

      exportFalsePositives(mockReq, mockRes);

      expect(mockRes.writeHead).toHaveBeenCalledWith(
        200,
        expect.objectContaining({
          'Content-Type': 'text/csv'
        })
      );
      expect(mockRes.end).toHaveBeenCalledWith(expect.stringContaining('Client,Title,URL,Source'));
    });

    test('includes mention data in CSV', () => {
      const mockReq = {};
      runQuery.mockReturnValue([
        {
          id: 1,
          clientName: 'Test Client',
          title: 'Test Article',
          link: 'https://example.com',
          source: 'example.com',
          mentionDate: '2025-01-01',
          createdAt: '2025-01-01',
          verified: 0
        }
      ]);

      exportFalsePositives(mockReq, mockRes);

      const csvContent = mockRes.end.mock.calls[0][0];
      expect(csvContent).toContain('Test Client');
      expect(csvContent).toContain('Test Article');
      expect(csvContent).toContain('https://example.com');
    });

    test('sets correct filename with date', () => {
      const mockReq = {};
      runQuery.mockReturnValue([]);

      exportFalsePositives(mockReq, mockRes);

      expect(mockRes.writeHead).toHaveBeenCalledWith(
        200,
        expect.objectContaining({
          'Content-Disposition': expect.stringContaining('false-positives-')
        })
      );
    });
  });

  describe('exportDeletedMentions', () => {
    test('exports CSV with correct headers', () => {
      const mockReq = {};
      runQuery.mockReturnValue([]);

      exportDeletedMentions(mockReq, mockRes);

      expect(mockRes.writeHead).toHaveBeenCalledWith(
        200,
        expect.objectContaining({
          'Content-Type': 'text/csv'
        })
      );
      expect(mockRes.end).toHaveBeenCalledWith(expect.stringContaining('Client,Title,URL'));
    });

    test('includes deleted mention data in CSV', () => {
      const mockReq = {};
      runQuery.mockReturnValue([
        {
          id: 1,
          originalMentionId: 100,
          clientName: 'Test Client',
          title: 'Deleted Article',
          link: 'https://example.com',
          source: 'example.com',
          mentionDate: '2025-01-01',
          status: 'new',
          verified: 0,
          deletedAt: '2025-01-02'
        }
      ]);

      exportDeletedMentions(mockReq, mockRes);

      const csvContent = mockRes.end.mock.calls[0][0];
      expect(csvContent).toContain('Deleted Article');
      expect(csvContent).toContain('Test Client');
    });

    test('sets correct filename with date', () => {
      const mockReq = {};
      runQuery.mockReturnValue([]);

      exportDeletedMentions(mockReq, mockRes);

      expect(mockRes.writeHead).toHaveBeenCalledWith(
        200,
        expect.objectContaining({
          'Content-Disposition': expect.stringContaining('deleted-mentions-')
        })
      );
    });
  });
});
