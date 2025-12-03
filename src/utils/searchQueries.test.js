const { buildSearchRequest } = require('./searchQueries');

describe('buildSearchRequest', () => {
  test('builds basic search query with client name', () => {
    const client = { name: 'Bushwick Commission' };
    const profile = {};

    const result = buildSearchRequest(client, profile);

    expect(result.query).toContain('"Bushwick Commission"');
    expect(result.exactTerms).toBe('Bushwick Commission');
  });

  test('includes context words with OR logic', () => {
    const client = { name: 'Test Client' };
    const profile = { contextWords: ['produce', 'marketing'] };

    const result = buildSearchRequest(client, profile);

    expect(result.query).toContain('produce');
    expect(result.query).toContain('marketing');
    expect(result.query).toContain('OR');
  });

  test('excludes specified words with minus operator', () => {
    const client = { name: 'Test Client' };
    const profile = { excludeWords: ['unrelated', 'spam'] };

    const result = buildSearchRequest(client, profile);

    expect(result.query).toContain('-unrelated');
    expect(result.query).toContain('-spam');
  });

  test('handles extra phrases for press releases', () => {
    const client = { name: 'Test Client' };
    const profile = {};
    const options = { extraPhrases: ['New Product Launch'] };

    const result = buildSearchRequest(client, profile, options);

    expect(result.query).toContain('"New Product Launch"');
  });
});
