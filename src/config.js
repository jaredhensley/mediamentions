require('dotenv').config();
const path = require('path');

function cleanEnv(value) {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function requireEnv(name) {
  const value = cleanEnv(process.env[name]);
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

// Server configuration
const config = {
  server: {
    port: Number(process.env.PORT) || 3000,
    host: process.env.HOST || 'localhost',
    corsOrigin: process.env.CORS_ORIGIN || '*'
  },
  database: {
    path: process.env.DATABASE_URL || path.join(__dirname, '..', 'data', 'mediamentions.db')
  },
  auth: {
    apiKey: process.env.API_KEY || null
  },
  providers: {
    google: {
      apiKey: requireEnv('GOOGLE_API_KEY'),
      searchEngineId: requireEnv('GOOGLE_CSE_ID'),
      referer: cleanEnv(process.env.GOOGLE_REFERER) || null
    }
  },
  scheduler: {
    time: process.env.SCHEDULE_TIME || '03:00',
    timezone: process.env.TZ || 'UTC'
  },
  search: {
    providers: ['google'],
    maxResultsPerProvider: Number.isFinite(Number(process.env.MAX_RESULTS_PER_PROVIDER))
      ? Number(process.env.MAX_RESULTS_PER_PROVIDER)
      : Infinity,
    mentionStatus: 'new'
  },
  filters: {
    // Maximum age of articles to include (in days)
    articleAgeDays: Number(process.env.ARTICLE_AGE_DAYS) || 180,
    // Social media domains to exclude from all results
    socialMediaDomains: [
      'facebook.com',
      'twitter.com',
      'x.com',
      'instagram.com',
      'linkedin.com',
      'reddit.com',
      'tiktok.com',
      'youtube.com',
      'pinterest.com',
      'snapchat.com',
      'threads.net'
    ]
  },
  verification: {
    // Rate limit between verification requests (ms)
    rateLimitMs: Number(process.env.VERIFY_RATE_LIMIT_MS) || 500,
    // Browser page load timeout (ms)
    browserTimeoutMs: Number(process.env.VERIFY_BROWSER_TIMEOUT_MS) || 20000,
    // Fetch request timeout (ms)
    fetchTimeoutMs: Number(process.env.VERIFY_FETCH_TIMEOUT_MS) || 10000,
    // Wait time for dynamic content after page load (ms)
    dynamicContentDelayMs: Number(process.env.VERIFY_DYNAMIC_DELAY_MS) || 2000,
    // Maximum retry attempts for failed verifications
    maxRetries: Number(process.env.VERIFY_MAX_RETRIES) || 2,
    // Delay between retries (ms)
    retryDelayMs: Number(process.env.VERIFY_RETRY_DELAY_MS) || 1000,
    // Minimum content length to consider valid (chars) - shorter is likely a block page
    minContentLength: Number(process.env.VERIFY_MIN_CONTENT_LENGTH) || 1000,
    // Number of concurrent verification requests
    concurrentRequests: Number(process.env.VERIFY_CONCURRENT_REQUESTS) || 5,
    // HTTP status codes that should trigger browser fallback
    browserFallbackStatuses: [403, 503, 520, 521, 522, 523, 524],
    // Client name variations for fuzzy matching
    clientNameVariations: [
      { from: 'sweetpotato', to: 'sweet potato' },
      { from: 'sweet potato', to: 'sweetpotato' },
      { from: 'colombia', to: 'colombian' }
    ]
  },
  logging: {
    level: process.env.LOG_LEVEL || 'info'
  },
  rss: {
    // Polling interval in hours (default: every 2 hours)
    pollingIntervalHours: Number(process.env.RSS_POLLING_INTERVAL_HOURS) || 2,
    // Request timeout for RSS feeds (ms)
    fetchTimeoutMs: Number(process.env.RSS_FETCH_TIMEOUT_MS) || 30000,
    // Whether to run verification automatically after RSS polling
    autoVerify: process.env.RSS_AUTO_VERIFY !== 'false'
  },
  // Site-specific handling for listing/index pages with card items
  // These sites have listing pages where client names appear in article cards
  // that link to actual articles. We need to extract the real article URLs.
  cardItemSites: [
    {
      // Produce News uses card-item class for article previews on listing pages
      domain: 'producenews.com',
      // CSS selector for card container elements
      cardSelector: '.card-item',
      // How to extract the article URL from the card (relative to card element)
      linkSelector: 'a[href]',
      // Patterns in URL that indicate a listing/index page (not an article)
      listingPagePatterns: ['/tag/', '/category/', '/author/', '/page/', '/search/']
    }
  ]
};

// Legacy exports for backward compatibility
const providerApiKeys = {
  google: config.providers.google.apiKey
};

const providerConfig = {
  googleSearchEngineId: config.providers.google.searchEngineId,
  googleReferer: config.providers.google.referer
};

const searchConfig = {
  scheduleTime: config.scheduler.time,
  providers: config.search.providers,
  maxResultsPerProvider: config.search.maxResultsPerProvider,
  mentionStatus: config.search.mentionStatus
};

function validateConfig() {
  const errors = [];
  const warnings = [];

  if (!config.providers.google.apiKey) {
    errors.push('GOOGLE_API_KEY is required');
  }

  if (!config.providers.google.searchEngineId) {
    errors.push('GOOGLE_CSE_ID is required');
  }

  // Warn about missing API_KEY in production
  const isProduction = process.env.NODE_ENV === 'production';
  if (!config.auth.apiKey) {
    if (isProduction) {
      errors.push('API_KEY is required in production mode');
    } else {
      warnings.push(
        'API_KEY not set - authentication disabled (set NODE_ENV=production to enforce)'
      );
    }
  }

  // Log warnings
  for (const warning of warnings) {
    console.warn(`[config] Warning: ${warning}`);
  }

  if (errors.length > 0) {
    throw new Error(`Configuration validation failed:\n  - ${errors.join('\n  - ')}`);
  }
}

module.exports = {
  config,
  providerApiKeys,
  providerConfig,
  searchConfig,
  validateConfig
};
