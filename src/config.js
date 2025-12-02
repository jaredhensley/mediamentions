require('dotenv').config();

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

const DEFAULT_SCHEDULE_TIME = process.env.SCHEDULE_TIME || '03:00';
const googleSearchEngineId = cleanEnv(process.env.GOOGLE_CSE_ID);
const googleReferer = cleanEnv(process.env.GOOGLE_REFERER);

const providerApiKeys = {
  google: cleanEnv(process.env.GOOGLE_API_KEY),
  bing: cleanEnv(process.env.BING_API_KEY) || 'demo-bing-key',
  customApi: cleanEnv(process.env.CUSTOM_SEARCH_KEY) || 'demo-custom-key',
  inbox: cleanEnv(process.env.INBOX_TOKEN) || 'demo-inbox-token'
};

const providerConfig = {
  googleSearchEngineId,
  googleReferer
};

const searchConfig = {
  scheduleTime: DEFAULT_SCHEDULE_TIME,
  providers: ['google', 'customApi', 'inbox'],
  maxResultsPerProvider: Number(process.env.MAX_RESULTS_PER_PROVIDER || 10),
  mentionStatus: 'unverified'
};

module.exports = {
  providerApiKeys,
  providerConfig,
  searchConfig
};
