const { filterResultsForClient } = require('./searchFilters');

describe('filterResultsForClient', () => {
  const client = { name: 'Bushwick Commission' };

  test('filters results that do not contain client name in title or snippet', () => {
    const profile = {};
    const results = [
      {
        title: 'Article about Bushwick Commission',
        snippet: 'The Bushwick Commission announced new partnership today'
      },
      { title: 'Unrelated article', snippet: 'No mention of client' },
      {
        title: 'Another story',
        snippet: 'Bushwick Commission expanded operations said spokesperson'
      }
    ];

    const filtered = filterResultsForClient(results, profile, client);

    expect(filtered).toHaveLength(2);
  });

  test('handles case-insensitive client name matching', () => {
    const profile = {};
    const results = [
      { title: 'Article about produce', snippet: 'BUSHWICK COMMISSION announced new program' },
      { title: 'Story about farming', snippet: 'bushwick commission partnered with local farms' }
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
      {
        title: 'Bushwick Commission produce news',
        snippet: 'Bushwick Commission announced new produce initiative'
      },
      {
        title: 'Bushwick Commission update',
        snippet: 'Bushwick Commission reported general update'
      }
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
