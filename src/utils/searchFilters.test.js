const { filterResultsForClient } = require('./searchFilters');

describe('filterResultsForClient', () => {
  const client = { name: 'Bushwick Commission' };

  test('filters results that do not contain client name', () => {
    const profile = {};
    const results = [
      { title: 'Article about Bushwick Commission', snippet: 'Some content' },
      { title: 'Unrelated article', snippet: 'No mention of client' },
      { title: 'Another Bushwick Commission story', snippet: 'More content' }
    ];

    const filtered = filterResultsForClient(results, profile, client);

    expect(filtered).toHaveLength(2);
    expect(filtered.every(r => r.title.includes('Bushwick Commission'))).toBe(true);
  });

  test('handles case-insensitive client name matching', () => {
    const profile = {};
    const results = [
      { title: 'Article about BUSHWICK COMMISSION', snippet: 'Content' },
      { title: 'Story mentions bushwick commission', snippet: 'Content' }
    ];

    const filtered = filterResultsForClient(results, profile, client);

    expect(filtered).toHaveLength(2);
  });

  test('validates context words when required', () => {
    const profile = {
      contextWords: ['produce', 'marketing'],
      requireContextMatch: true
    };
    const results = [
      { title: 'Bushwick Commission produce news', snippet: 'About produce' },
      { title: 'Bushwick Commission update', snippet: 'No context words' }
    ];

    const filtered = filterResultsForClient(results, profile, client);

    expect(filtered).toHaveLength(1);
    expect(filtered[0].title).toContain('produce');
  });

  test('returns empty array for no results', () => {
    const profile = {};
    const filtered = filterResultsForClient([], profile, client);

    expect(filtered).toEqual([]);
  });
});
