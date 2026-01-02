const {
  extractDomain,
  dedupeMentions,
  cleanSnippet,
  recordMentions,
  normalizeUrlForComparison
} = require('./mentions');

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

  test('skips duplicate mentions by URL', () => {
    runQuery.mockImplementation((sql) => {
      if (sql.includes('SELECT link, LOWER(TRIM(title))')) {
        return [{ link: 'https://example.com/article', normalizedTitle: 'test article' }]; // Already exists
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

  test('skips duplicate mentions by title', () => {
    runQuery.mockImplementation((sql) => {
      if (sql.includes('SELECT link, LOWER(TRIM(title))')) {
        // Return existing mention with same title but different URL
        return [{ link: 'https://example.com/old-article', normalizedTitle: 'test article' }];
      }
      return [];
    });

    const results = [
      {
        title: 'Test Article', // Same title (case-insensitive)
        url: 'https://example.com/new-article', // Different URL
        snippet: 'Test snippet',
        source: 'example.com',
        clientId: 1,
        normalizedUrl: 'https://example.com/new-article'
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
      { normalizedUrl: 'https://example.com/article', clientId: 1, title: 'Duplicate URL' },
      { normalizedUrl: 'https://example.com/other', clientId: 1, title: 'Different URL' },
      { normalizedUrl: 'https://example.com/article', clientId: 2, title: 'Different client' }
    ];

    const deduped = dedupeMentions(results);

    expect(deduped).toHaveLength(3);
    expect(deduped[0].title).toBe('First');
    expect(deduped.find((r) => r.title === 'Duplicate URL')).toBeUndefined();
  });

  test('removes duplicate mentions based on title and clientId', () => {
    const results = [
      {
        normalizedUrl: 'https://example.com/article-v1',
        clientId: 1,
        title: 'Same Title Here'
      },
      {
        normalizedUrl: 'https://example.com/article-v2',
        clientId: 1,
        title: 'Same Title Here'
      },
      {
        normalizedUrl: 'https://example.com/other',
        clientId: 1,
        title: 'Different Title'
      },
      {
        normalizedUrl: 'https://example.com/article-v3',
        clientId: 2,
        title: 'Same Title Here'
      }
    ];

    const deduped = dedupeMentions(results);

    expect(deduped).toHaveLength(3);
    // First mention should be kept
    expect(deduped[0].normalizedUrl).toBe('https://example.com/article-v1');
    // Second mention with same title should be removed
    expect(
      deduped.find((r) => r.normalizedUrl === 'https://example.com/article-v2')
    ).toBeUndefined();
    // Different title should be kept
    expect(deduped.find((r) => r.title === 'Different Title')).toBeDefined();
    // Same title but different client should be kept
    expect(deduped.find((r) => r.clientId === 2)).toBeDefined();
  });

  test('title comparison is case-insensitive', () => {
    const results = [
      { normalizedUrl: 'https://example.com/article-1', clientId: 1, title: 'Breaking News Today' },
      { normalizedUrl: 'https://example.com/article-2', clientId: 1, title: 'BREAKING NEWS TODAY' },
      { normalizedUrl: 'https://example.com/article-3', clientId: 1, title: 'breaking news today' }
    ];

    const deduped = dedupeMentions(results);

    expect(deduped).toHaveLength(1);
    expect(deduped[0].normalizedUrl).toBe('https://example.com/article-1');
  });

  test('handles empty or null titles gracefully', () => {
    const results = [
      { normalizedUrl: 'https://example.com/article-1', clientId: 1, title: '' },
      { normalizedUrl: 'https://example.com/article-2', clientId: 1, title: '' },
      { normalizedUrl: 'https://example.com/article-3', clientId: 1, title: null },
      { normalizedUrl: 'https://example.com/article-4', clientId: 1, title: 'Actual Title' }
    ];

    const deduped = dedupeMentions(results);

    // Empty/null titles should not cause false deduplication - each URL is unique
    expect(deduped).toHaveLength(4);
  });

  test('removes duplicates by either URL or title', () => {
    const results = [
      { normalizedUrl: 'https://example.com/article-1', clientId: 1, title: 'Original Article' },
      { normalizedUrl: 'https://example.com/article-1', clientId: 1, title: 'Different Title' }, // Same URL
      { normalizedUrl: 'https://example.com/article-2', clientId: 1, title: 'Original Article' } // Same title
    ];

    const deduped = dedupeMentions(results);

    // Only the first mention should remain
    expect(deduped).toHaveLength(1);
    expect(deduped[0].normalizedUrl).toBe('https://example.com/article-1');
    expect(deduped[0].title).toBe('Original Article');
  });

  test('handles empty array', () => {
    expect(dedupeMentions([])).toEqual([]);
  });
});

describe('normalizeUrlForComparison', () => {
  test('normalizes protocol to https', () => {
    expect(normalizeUrlForComparison('http://example.com/article')).toBe(
      'https://example.com/article'
    );
    expect(normalizeUrlForComparison('https://example.com/article')).toBe(
      'https://example.com/article'
    );
  });

  test('removes trailing slashes', () => {
    expect(normalizeUrlForComparison('https://example.com/article/')).toBe(
      'https://example.com/article'
    );
    expect(normalizeUrlForComparison('https://example.com/')).toBe('https://example.com/');
  });

  test('lowercases URL', () => {
    expect(normalizeUrlForComparison('https://EXAMPLE.COM/Article')).toBe(
      'https://example.com/article'
    );
  });

  test('removes common tracking parameters', () => {
    expect(
      normalizeUrlForComparison('https://example.com/article?utm_source=google&utm_medium=cpc')
    ).toBe('https://example.com/article');
    expect(normalizeUrlForComparison('https://example.com/article?fbclid=abc123&id=456')).toBe(
      'https://example.com/article?id=456'
    );
  });

  test('preserves non-tracking query parameters', () => {
    expect(normalizeUrlForComparison('https://example.com/article?page=2&id=123')).toBe(
      'https://example.com/article?page=2&id=123'
    );
  });

  test('returns null for invalid URLs', () => {
    expect(normalizeUrlForComparison(null)).toBeNull();
    expect(normalizeUrlForComparison(undefined)).toBeNull();
    expect(normalizeUrlForComparison('')).toBeNull();
    expect(normalizeUrlForComparison('not-a-url')).toBeNull();
  });

  test('handles URLs with complex paths', () => {
    expect(
      normalizeUrlForComparison('https://producenews.com/the-news/articles/some-article-slug')
    ).toBe('https://producenews.com/the-news/articles/some-article-slug');
  });
});
