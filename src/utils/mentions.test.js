const { extractDomain, dedupeMentions, cleanSnippet, recordMentions } = require('./mentions');

// Mock the database and websocket modules
jest.mock('../db', () => ({
  runQuery: jest.fn()
}));

jest.mock('../services/websocket', () => ({
  broadcastNewMention: jest.fn()
}));

const { runQuery } = require('../db');
const { broadcastNewMention } = require('../services/websocket');

describe('recordMentions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('creates mentions with verified = null (pending review)', () => {
    // Mock: no existing mentions
    runQuery.mockImplementation((sql) => {
      if (sql.includes('SELECT link FROM mediaMentions')) {
        return []; // No existing mentions
      }
      if (sql.includes('SELECT id FROM publications WHERE LOWER(website)')) {
        return [{ id: 1 }]; // Publication exists
      }
      if (sql.includes('INSERT INTO mediaMentions')) {
        // Capture the INSERT and verify verified is null
        return [
          {
            id: 1,
            title: 'Test Article',
            verified: null // Should be null for pending review
          }
        ];
      }
      return [];
    });

    const results = [
      {
        title: 'Test Article',
        url: 'https://example.com/article',
        snippet: 'Test snippet',
        source: 'example.com',
        sentiment: 'neutral',
        clientId: 1,
        normalizedUrl: 'https://example.com/article'
      }
    ];

    const created = recordMentions(results, 'new');

    expect(created).toHaveLength(1);
    expect(created[0].verified).toBeNull();

    // Verify the INSERT SQL includes verified field with null value
    const insertCall = runQuery.mock.calls.find((call) =>
      call[0].includes('INSERT INTO mediaMentions')
    );
    expect(insertCall).toBeDefined();
    expect(insertCall[0]).toContain('verified');
    // The 11th parameter (index 10) should be null for verified
    expect(insertCall[1][10]).toBeNull();
  });

  test('broadcasts new mention after creation', () => {
    runQuery.mockImplementation((sql) => {
      if (sql.includes('SELECT link FROM mediaMentions')) {
        return [];
      }
      if (sql.includes('SELECT id FROM publications')) {
        return [{ id: 1 }];
      }
      if (sql.includes('INSERT INTO mediaMentions')) {
        return [{ id: 1, title: 'Test Article', verified: null }];
      }
      return [];
    });

    const results = [
      {
        title: 'Test Article',
        url: 'https://example.com/article',
        snippet: 'Test snippet',
        source: 'example.com',
        sentiment: 'neutral',
        clientId: 1,
        normalizedUrl: 'https://example.com/article'
      }
    ];

    recordMentions(results, 'new');

    expect(broadcastNewMention).toHaveBeenCalledTimes(1);
    expect(broadcastNewMention).toHaveBeenCalledWith(
      expect.objectContaining({ id: 1, verified: null })
    );
  });

  test('skips duplicate mentions', () => {
    runQuery.mockImplementation((sql) => {
      if (sql.includes('SELECT link FROM mediaMentions')) {
        return [{ link: 'https://example.com/article' }]; // Already exists
      }
      return [];
    });

    const results = [
      {
        title: 'Test Article',
        url: 'https://example.com/article',
        snippet: 'Test snippet',
        source: 'example.com',
        clientId: 1,
        normalizedUrl: 'https://example.com/article'
      }
    ];

    const created = recordMentions(results, 'new');

    expect(created).toHaveLength(0);
    expect(broadcastNewMention).not.toHaveBeenCalled();
  });

  test('handles empty results array', () => {
    const created = recordMentions([], 'new');
    expect(created).toHaveLength(0);
    expect(runQuery).not.toHaveBeenCalled();
  });
});

describe('cleanSnippet', () => {
  test('removes "X hours ago" prefix', () => {
    const input = '7 hours ago ... Aside from daily delivery to major retail hubs';
    const expected = 'Aside from daily delivery to major retail hubs';
    expect(cleanSnippet(input)).toBe(expected);
  });

  test('removes "X days ago" prefix', () => {
    const input = '2 days ago ... New York Produce Show announces lineup';
    const expected = 'New York Produce Show announces lineup';
    expect(cleanSnippet(input)).toBe(expected);
  });

  test('handles abbreviated forms like "hrs"', () => {
    const input = '5 hrs ago ... Breaking news from the industry';
    const expected = 'Breaking news from the industry';
    expect(cleanSnippet(input)).toBe(expected);
  });

  test('returns unchanged snippet if no time prefix', () => {
    const input = 'Regular snippet without time prefix';
    expect(cleanSnippet(input)).toBe(input);
  });

  test('handles null or undefined input', () => {
    expect(cleanSnippet(null)).toBeNull();
    expect(cleanSnippet(undefined)).toBeUndefined();
  });
});

describe('extractDomain', () => {
  test('extracts domain from valid URL', () => {
    expect(extractDomain('https://www.example.com/path')).toBe('www.example.com');
    expect(extractDomain('http://producenews.com/article/123')).toBe('producenews.com');
  });

  test('returns null for invalid URL', () => {
    expect(extractDomain('not-a-url')).toBeNull();
    expect(extractDomain('')).toBeNull();
  });
});

describe('dedupeMentions', () => {
  test('removes duplicate mentions based on URL and clientId', () => {
    const results = [
      { normalizedUrl: 'https://example.com/article', clientId: 1, title: 'First' },
      { normalizedUrl: 'https://example.com/article', clientId: 1, title: 'Duplicate' },
      { normalizedUrl: 'https://example.com/other', clientId: 1, title: 'Different URL' },
      { normalizedUrl: 'https://example.com/article', clientId: 2, title: 'Different client' }
    ];

    const deduped = dedupeMentions(results);

    expect(deduped).toHaveLength(3);
    expect(deduped[0].title).toBe('First');
    expect(deduped.find((r) => r.title === 'Duplicate')).toBeUndefined();
  });

  test('handles empty array', () => {
    expect(dedupeMentions([])).toEqual([]);
  });
});
