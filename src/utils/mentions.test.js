const { extractDomain, dedupeMentions, cleanSnippet } = require('./mentions');

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
    expect(deduped.find(r => r.title === 'Duplicate')).toBeUndefined();
  });

  test('handles empty array', () => {
    expect(dedupeMentions([])).toEqual([]);
  });
});
