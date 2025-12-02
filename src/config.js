require('dotenv').config();

const DEFAULT_SCHEDULE_TIME = process.env.SCHEDULE_TIME || '03:00';

const providerApiKeys = {
  google: process.env.GOOGLE_API_KEY,
  bing: process.env.BING_API_KEY || 'demo-bing-key',
  customApi: process.env.CUSTOM_SEARCH_KEY || 'demo-custom-key',
  inbox: process.env.INBOX_TOKEN || 'demo-inbox-token'
};

const providerConfig = {
  googleSearchEngineId: process.env.GOOGLE_CSE_ID
};

const searchConfig = {
  scheduleTime: DEFAULT_SCHEDULE_TIME,
  providers: ['google', 'bing', 'customApi', 'inbox'],
  maxResultsPerProvider: Number(process.env.MAX_RESULTS_PER_PROVIDER || 10),
  mentionStatus: 'unverified'
};

module.exports = {
  providerApiKeys,
  providerConfig,
  searchConfig
};
