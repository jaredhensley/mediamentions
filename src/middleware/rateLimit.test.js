/**
 * @fileoverview Tests for rate limiting middleware
 */

const { createRateLimiter, getClientIp, _rateLimitStore } = require('./rateLimit');

describe('rateLimit', () => {
  beforeEach(() => {
    // Clear rate limit store between tests
    _rateLimitStore.clear();
  });

  describe('getClientIp', () => {
    it('returns IP from X-Forwarded-For header', () => {
      const req = {
        headers: { 'x-forwarded-for': '1.2.3.4, 5.6.7.8' },
        socket: { remoteAddress: '127.0.0.1' }
      };
      expect(getClientIp(req)).toBe('1.2.3.4');
    });

    it('returns socket remote address when no forwarded header', () => {
      const req = {
        headers: {},
        socket: { remoteAddress: '192.168.1.1' }
      };
      expect(getClientIp(req)).toBe('192.168.1.1');
    });

    it('returns unknown when no IP available', () => {
      const req = { headers: {}, socket: {} };
      expect(getClientIp(req)).toBe('unknown');
    });
  });

  describe('createRateLimiter', () => {
    it('allows requests within limit', () => {
      const limiter = createRateLimiter({ maxRequests: 3, windowMs: 60000, keyPrefix: 'test' });
      const req = { headers: {}, socket: { remoteAddress: '10.0.0.1' } };
      const res = { setHeader: jest.fn(), writeHead: jest.fn(), end: jest.fn() };

      let nextCalled = false;
      limiter(req, res, () => {
        nextCalled = true;
      });

      expect(nextCalled).toBe(true);
      expect(res.writeHead).not.toHaveBeenCalled();
      expect(res.setHeader).toHaveBeenCalledWith('X-RateLimit-Limit', 3);
      expect(res.setHeader).toHaveBeenCalledWith('X-RateLimit-Remaining', 2);
    });

    it('blocks requests over limit', () => {
      const limiter = createRateLimiter({ maxRequests: 2, windowMs: 60000, keyPrefix: 'test2' });
      const req = { headers: {}, socket: { remoteAddress: '10.0.0.2' } };
      const res = {
        setHeader: jest.fn(),
        writeHead: jest.fn(),
        end: jest.fn(),
        writableEnded: false
      };

      const next = jest.fn();

      // First two requests should pass
      limiter(req, res, next);
      limiter(req, res, next);
      expect(next).toHaveBeenCalledTimes(2);

      // Third request should be blocked
      limiter(req, res, next);
      expect(next).toHaveBeenCalledTimes(2); // Still 2
      expect(res.writeHead).toHaveBeenCalledWith(429, { 'Content-Type': 'application/json' });
      expect(res.end).toHaveBeenCalled();
    });

    it('tracks different IPs separately', () => {
      const limiter = createRateLimiter({ maxRequests: 1, windowMs: 60000, keyPrefix: 'test3' });
      const req1 = { headers: {}, socket: { remoteAddress: '10.0.0.3' } };
      const req2 = { headers: {}, socket: { remoteAddress: '10.0.0.4' } };
      const res = { setHeader: jest.fn(), writeHead: jest.fn(), end: jest.fn() };

      let calls = 0;
      const next = () => calls++;

      limiter(req1, res, next);
      limiter(req2, res, next);

      expect(calls).toBe(2); // Both pass because different IPs
    });
  });
});
