// Mock the config module before importing auth
jest.mock('../config', () => ({
  config: {
    auth: {
      apiKey: null // Default to no key configured
    }
  }
}));

const { requireApiKey } = require('./auth');
const { config } = require('../config');

describe('requireApiKey', () => {
  let req, res, next;

  beforeEach(() => {
    req = { headers: {} };
    res = {
      writeHead: jest.fn(),
      end: jest.fn()
    };
    next = jest.fn();
    // Reset config between tests
    config.auth.apiKey = null;
  });

  test('allows request when no API key is configured', () => {
    config.auth.apiKey = null;

    requireApiKey(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.writeHead).not.toHaveBeenCalled();
  });

  test('rejects request without API key header when configured', () => {
    config.auth.apiKey = 'test-key';

    requireApiKey(req, res, next);

    expect(res.writeHead).toHaveBeenCalledWith(401, expect.any(Object));
    expect(res.end).toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
  });

  test('rejects request with invalid API key', () => {
    config.auth.apiKey = 'test-key';
    req.headers['x-api-key'] = 'wrong-key';

    requireApiKey(req, res, next);

    expect(res.writeHead).toHaveBeenCalledWith(401, expect.any(Object));
    expect(next).not.toHaveBeenCalled();
  });

  test('allows request with valid API key', () => {
    config.auth.apiKey = 'test-key';
    req.headers['x-api-key'] = 'test-key';

    requireApiKey(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.writeHead).not.toHaveBeenCalled();
  });
});
