describe('config module', () => {
  test('exports expected structure', () => {
    const config = require('./config');

    expect(config).toHaveProperty('config');
    expect(config).toHaveProperty('validateConfig');
    expect(config).toHaveProperty('providerApiKeys');
    expect(config).toHaveProperty('providerConfig');
    expect(config).toHaveProperty('searchConfig');
  });

  test('has expected server properties', () => {
    const { config } = require('./config');

    expect(config.server).toHaveProperty('port');
    expect(config.server).toHaveProperty('host');
    expect(config.server).toHaveProperty('corsOrigin');
    expect(typeof config.server.port).toBe('number');
  });

  test('has expected provider configuration', () => {
    const { config } = require('./config');

    expect(config.providers).toHaveProperty('google');
    expect(config.providers.google).toHaveProperty('apiKey');
    expect(config.providers.google).toHaveProperty('searchEngineId');
  });

  test('validateConfig is a function', () => {
    const { validateConfig } = require('./config');

    expect(typeof validateConfig).toBe('function');
  });
});
