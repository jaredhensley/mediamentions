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
