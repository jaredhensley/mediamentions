const { randomUUID } = require('crypto');
const { providerApiKeys } = require('../config');

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const makeResult = (provider, query, domainSuffix = 'news.example.com') => ({
  id: randomUUID(),
  title: `${provider.toUpperCase()} result for ${query}`,
  url: `https://${provider}.${domainSuffix}/${encodeURIComponent(query)}`,
  snippet: `${provider} found coverage about ${query}.`,
  publishedAt: new Date().toISOString(),
  provider
});

async function googleSearch(query, { maxResults }) {
  if (!providerApiKeys.google) {
    throw new Error('Missing Google API key');
  }
  await delay(50);
  return Array.from({ length: Math.max(1, Math.min(3, maxResults)) }, (_, idx) =>
    makeResult('google', `${query}-${idx}`, 'example.com')
  );
}

async function bingSearch(query, { maxResults }) {
  if (!providerApiKeys.bing) {
    throw new Error('Missing Bing API key');
  }
  await delay(50);
  return Array.from({ length: Math.max(1, Math.min(2, maxResults)) }, (_, idx) =>
    makeResult('bing', `${query}-${idx}`, 'bingnews.example.com')
  );
}

async function customApiSearch(query, { maxResults }) {
  if (!providerApiKeys.customApi) {
    throw new Error('Missing custom API key');
  }
  await delay(30);
  return [makeResult('api', query, 'wire.example.com')].slice(0, maxResults);
}

async function inboxSearch(query, { maxResults }) {
  if (!providerApiKeys.inbox) {
    throw new Error('Missing inbox token');
  }
  await delay(20);
  return [
    {
      ...makeResult('inbox', query, 'mail.example.com'),
      snippet: 'Found mention in monitored inbox',
      url: `mailto:${encodeURIComponent(query)}@mail.example.com`
    }
  ].slice(0, maxResults);
}

const providerLookup = {
  google: googleSearch,
  bing: bingSearch,
  customApi: customApiSearch,
  inbox: inboxSearch
};

module.exports = {
  providerLookup
};
