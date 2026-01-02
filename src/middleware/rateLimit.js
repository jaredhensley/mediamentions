/**
 * @fileoverview Rate limiting middleware
 * Provides simple in-memory rate limiting for export endpoints
 */

const { config } = require('../config');

// In-memory store for rate limiting
// Key: IP address, Value: { count, resetTime }
const rateLimitStore = new Map();

// Clean up expired entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of rateLimitStore.entries()) {
    if (now > value.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}, 60 * 1000); // Clean every minute

/**
 * Get client IP from request
 * Handles proxied requests via X-Forwarded-For header
 * @param {Object} req - HTTP request object
 * @returns {string} - Client IP address
 */
function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    // X-Forwarded-For can be comma-separated list; take first
    return forwarded.split(',')[0].trim();
  }
  return req.socket?.remoteAddress || 'unknown';
}

/**
 * Create rate limit middleware for a specific endpoint type
 * @param {Object} options - Rate limit options
 * @param {number} options.maxRequests - Max requests per window
 * @param {number} options.windowMs - Time window in milliseconds
 * @param {string} options.keyPrefix - Prefix for rate limit key (to separate different limiters)
 * @returns {Function} - Middleware function
 */
function createRateLimiter({ maxRequests = 10, windowMs = 60000, keyPrefix = 'default' } = {}) {
  return function rateLimitMiddleware(req, res, next) {
    const ip = getClientIp(req);
    const key = `${keyPrefix}:${ip}`;
    const now = Date.now();

    let record = rateLimitStore.get(key);

    // Initialize or reset expired record
    if (!record || now > record.resetTime) {
      record = {
        count: 0,
        resetTime: now + windowMs
      };
    }

    record.count++;
    rateLimitStore.set(key, record);

    // Set rate limit headers
    const remaining = Math.max(0, maxRequests - record.count);
    const resetSeconds = Math.ceil((record.resetTime - now) / 1000);

    res.setHeader('X-RateLimit-Limit', maxRequests);
    res.setHeader('X-RateLimit-Remaining', remaining);
    res.setHeader('X-RateLimit-Reset', resetSeconds);

    // Check if over limit
    if (record.count > maxRequests) {
      res.writeHead(429, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          error: 'Too many requests',
          retryAfter: resetSeconds
        })
      );
      return;
    }

    next();
  };
}

// Pre-configured rate limiters for common use cases
const exportRateLimiter = createRateLimiter({
  maxRequests: config.rateLimit?.export?.maxRequests || 5,
  windowMs: config.rateLimit?.export?.windowMs || 60000,
  keyPrefix: 'export'
});

const adminExportRateLimiter = createRateLimiter({
  maxRequests: config.rateLimit?.adminExport?.maxRequests || 10,
  windowMs: config.rateLimit?.adminExport?.windowMs || 60000,
  keyPrefix: 'admin-export'
});

module.exports = {
  createRateLimiter,
  exportRateLimiter,
  adminExportRateLimiter,
  getClientIp,
  // Expose for testing
  _rateLimitStore: rateLimitStore
};
