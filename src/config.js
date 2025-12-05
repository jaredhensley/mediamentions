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
    maxRetries: Number(process.env.VERIFY_MAX_RETRIES) || 2
  },
  logging: {
    level: process.env.LOG_LEVEL || 'info'
  }
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

  if (!config.providers.google.apiKey) {
    errors.push('GOOGLE_API_KEY is required');
  }

  if (!config.providers.google.searchEngineId) {
    errors.push('GOOGLE_CSE_ID is required');
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
