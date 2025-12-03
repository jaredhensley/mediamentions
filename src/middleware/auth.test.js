const { requireApiKey } = require('./auth');

describe('requireApiKey', () => {
  let req, res, next;

  beforeEach(() => {
    req = { headers: {} };
    res = {
      writeHead: jest.fn(),
      end: jest.fn()
    };
    next = jest.fn();
  });

  const originalEnv = process.env;

  afterAll(() => {
    process.env = originalEnv;
  });

  test('allows request when no API key is configured', () => {
    delete process.env.API_KEY;

    requireApiKey(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.writeHead).not.toHaveBeenCalled();
  });

  test('rejects request without API key header when configured', () => {
    process.env.API_KEY = 'test-key';

    requireApiKey(req, res, next);

    expect(res.writeHead).toHaveBeenCalledWith(401, expect.any(Object));
    expect(res.end).toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
  });

  test('rejects request with invalid API key', () => {
    process.env.API_KEY = 'test-key';
    req.headers['x-api-key'] = 'wrong-key';

    requireApiKey(req, res, next);

    expect(res.writeHead).toHaveBeenCalledWith(401, expect.any(Object));
    expect(next).not.toHaveBeenCalled();
  });

  test('allows request with valid API key', () => {
    process.env.API_KEY = 'test-key';
    req.headers['x-api-key'] = 'test-key';

    requireApiKey(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.writeHead).not.toHaveBeenCalled();
  });
});
