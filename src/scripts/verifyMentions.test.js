const { checkClientNameInContent, isValidUrl, truncateTitle } = require('./verifyMentions');

describe('verifyMentions module', () => {
  describe('isValidUrl', () => {
    test('accepts valid http URLs', () => {
      expect(isValidUrl('http://example.com')).toBe(true);
      expect(isValidUrl('http://example.com/path/to/page')).toBe(true);
      expect(isValidUrl('http://sub.example.com')).toBe(true);
    });

    test('accepts valid https URLs', () => {
      expect(isValidUrl('https://example.com')).toBe(true);
      expect(isValidUrl('https://example.com/path?query=1')).toBe(true);
      expect(isValidUrl('https://www.example.com')).toBe(true);
    });

    test('rejects null/undefined/empty', () => {
      expect(isValidUrl(null)).toBe(false);
      expect(isValidUrl(undefined)).toBe(false);
      expect(isValidUrl('')).toBe(false);
    });

    test('rejects non-string values', () => {
      expect(isValidUrl(123)).toBe(false);
      expect(isValidUrl({})).toBe(false);
      expect(isValidUrl([])).toBe(false);
    });

    test('rejects non-http protocols', () => {
      expect(isValidUrl('ftp://example.com')).toBe(false);
      expect(isValidUrl('file:///etc/passwd')).toBe(false);
      expect(isValidUrl('javascript:alert(1)')).toBe(false);
      expect(isValidUrl('data:text/html,<script>alert(1)</script>')).toBe(false);
    });

    test('rejects localhost', () => {
      expect(isValidUrl('http://localhost')).toBe(false);
      expect(isValidUrl('http://localhost:3000')).toBe(false);
      expect(isValidUrl('https://localhost/path')).toBe(false);
    });

    test('rejects loopback IPs', () => {
      expect(isValidUrl('http://127.0.0.1')).toBe(false);
      expect(isValidUrl('http://127.0.0.1:8080')).toBe(false);
      expect(isValidUrl('http://127.1.2.3')).toBe(false);
    });

    test('rejects private network IPs (10.x.x.x)', () => {
      expect(isValidUrl('http://10.0.0.1')).toBe(false);
      expect(isValidUrl('http://10.255.255.255')).toBe(false);
    });

    test('rejects private network IPs (172.16-31.x.x)', () => {
      expect(isValidUrl('http://172.16.0.1')).toBe(false);
      expect(isValidUrl('http://172.31.255.255')).toBe(false);
    });

    test('rejects private network IPs (192.168.x.x)', () => {
      expect(isValidUrl('http://192.168.0.1')).toBe(false);
      expect(isValidUrl('http://192.168.1.100')).toBe(false);
    });

    test('rejects link-local IPs', () => {
      expect(isValidUrl('http://169.254.0.1')).toBe(false);
      expect(isValidUrl('http://169.254.169.254')).toBe(false); // AWS metadata
    });

    test('rejects malformed URLs', () => {
      expect(isValidUrl('not-a-url')).toBe(false);
      expect(isValidUrl('example.com')).toBe(false); // No protocol
      expect(isValidUrl('http://')).toBe(false);
    });
  });

  describe('checkClientNameInContent', () => {
    test('finds exact match (case insensitive on client name)', () => {
      // Note: textContent is expected to be lowercase already (function contract)
      expect(checkClientNameInContent('article about acme corp today', 'Acme Corp')).toBe(true);
      expect(checkClientNameInContent('acme corp announces new product', 'ACME CORP')).toBe(true);
    });

    test('returns false when name not found', () => {
      expect(checkClientNameInContent('article about something else', 'Acme Corp')).toBe(false);
      expect(checkClientNameInContent('', 'Acme Corp')).toBe(false);
    });

    test('handles null/undefined inputs', () => {
      expect(checkClientNameInContent(null, 'Acme')).toBe(false);
      expect(checkClientNameInContent('content', null)).toBe(false);
      expect(checkClientNameInContent(null, null)).toBe(false);
      expect(checkClientNameInContent(undefined, 'Acme')).toBe(false);
    });

    test('finds sweetpotato/sweet potato variations', () => {
      // Config has variation: sweetpotato <-> sweet potato
      expect(
        checkClientNameInContent(
          'north carolina sweet potato commission event',
          'North Carolina Sweetpotato Commission'
        )
      ).toBe(true);

      expect(
        checkClientNameInContent(
          'north carolina sweetpotato commission event',
          'North Carolina Sweet Potato Commission'
        )
      ).toBe(true);
    });

    test('finds colombia/colombian variations', () => {
      // Config has variation: colombia -> colombian
      expect(
        checkClientNameInContent('colombian avocado board announces', 'Colombia Avocado Board')
      ).toBe(true);
    });

    test('partial matches within words are found', () => {
      // This is expected behavior - substring matching
      expect(checkClientNameInContent('the company acme corporation', 'acme')).toBe(true);
    });
  });

  describe('truncateTitle', () => {
    test('returns title unchanged if shorter than max', () => {
      expect(truncateTitle('Short title', 50)).toBe('Short title');
      expect(truncateTitle('Exactly 10', 10)).toBe('Exactly 10');
    });

    test('truncates long titles with ellipsis', () => {
      const longTitle = 'This is a very long title that should be truncated';
      const result = truncateTitle(longTitle, 20);
      expect(result).toBe('This is a very long ...');
      expect(result.length).toBe(23); // 20 + '...'
    });

    test('handles null/undefined', () => {
      expect(truncateTitle(null)).toBe('Untitled');
      expect(truncateTitle(undefined)).toBe('Untitled');
      expect(truncateTitle('')).toBe('Untitled');
    });

    test('uses default max length of 50', () => {
      const title = 'A'.repeat(60);
      const result = truncateTitle(title);
      expect(result).toBe('A'.repeat(50) + '...');
    });
  });
});

describe('verifyMentions config integration', () => {
  test('config has verification settings', () => {
    const { config } = require('../config');

    expect(config.verification).toBeDefined();
    expect(config.verification.rateLimitMs).toBeDefined();
    expect(config.verification.browserTimeoutMs).toBeDefined();
    expect(config.verification.fetchTimeoutMs).toBeDefined();
    expect(config.verification.maxRetries).toBeDefined();
  });

  test('config has new verification settings', () => {
    const { config } = require('../config');

    expect(config.verification.retryDelayMs).toBeDefined();
    expect(config.verification.minContentLength).toBeDefined();
    expect(config.verification.concurrentRequests).toBeDefined();
    expect(config.verification.browserFallbackStatuses).toBeDefined();
    expect(config.verification.clientNameVariations).toBeDefined();
  });

  test('browserFallbackStatuses includes expected codes', () => {
    const { config } = require('../config');
    const statuses = config.verification.browserFallbackStatuses;

    expect(statuses).toContain(403);
    expect(statuses).toContain(503);
    expect(statuses).toContain(520); // Cloudflare
  });

  test('clientNameVariations has expected structure', () => {
    const { config } = require('../config');
    const variations = config.verification.clientNameVariations;

    expect(Array.isArray(variations)).toBe(true);
    expect(variations.length).toBeGreaterThan(0);

    variations.forEach((v) => {
      expect(v).toHaveProperty('from');
      expect(v).toHaveProperty('to');
      expect(typeof v.from).toBe('string');
      expect(typeof v.to).toBe('string');
    });
  });
});
