const { randomUUID } = require('crypto');
const { providerApiKeys, providerConfig } = require('../config');

function getPublishedDate(item) {
  const metatags = item.pagemap?.metatags || [];
  for (const tag of metatags) {
    const candidate =
      tag['article:published_time'] ||
      tag['og:published_time'] ||
      tag['article:modified_time'] ||
      tag['og:updated_time'] ||
      tag['pubdate'];

    if (candidate) {
      const parsed = new Date(candidate);
      if (!Number.isNaN(parsed.getTime())) {
        return parsed.toISOString();
      }
    }
  }
  return new Date().toISOString();
}

async function googleSearch(query, { maxResults }) {
  if (!providerApiKeys.google) {
    throw new Error('Missing Google API key (set GOOGLE_API_KEY in your .env file)');
  }
  if (!providerConfig.googleSearchEngineId) {
    throw new Error('Missing Google Custom Search Engine ID (set GOOGLE_CSE_ID in your .env file)');
  }

  const num = Math.max(1, Math.min(10, maxResults));
  const params = new URLSearchParams({
    key: providerApiKeys.google,
    cx: providerConfig.googleSearchEngineId,
    q: query,
    num: String(num),
    dateRestrict: 'd1'
  });

  const url = `https://www.googleapis.com/customsearch/v1?${params.toString()}`;
  const headers = {};

  if (providerConfig.googleReferer) {
    headers.Referer = providerConfig.googleReferer;
  }

  const response = await fetch(url, { headers });

  if (!response.ok) {
    let detail = `${response.status} ${response.statusText}`;
    try {
      const errorBody = await response.json();
      if (errorBody.error?.message) {
        detail = errorBody.error.message;
      }
    } catch (err) {
      // ignore JSON parsing issues to avoid masking the original response error
    }
    throw new Error(`Google search failed: ${detail}`);
  }

  const data = await response.json();
  const items = data.items || [];

  return items.slice(0, num).map((item) => ({
    id: randomUUID(),
    title: item.title,
    url: item.link,
    snippet: item.snippet || '',
    publishedAt: getPublishedDate(item),
    provider: 'google'
  }));
}

const providerLookup = {
  google: googleSearch
};

module.exports = {
  providerLookup
};
