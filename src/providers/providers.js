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

async function googleSearch(searchRequest, { maxResults }) {
  if (!providerApiKeys.google) {
    throw new Error('Missing Google API key (set GOOGLE_API_KEY in your .env file)');
  }
  if (!providerConfig.googleSearchEngineId) {
    throw new Error('Missing Google Custom Search Engine ID (set GOOGLE_CSE_ID in your .env file)');
  }

  const query = typeof searchRequest === 'string' ? searchRequest : searchRequest.query;
  const exactTerms = typeof searchRequest === 'object' ? searchRequest.exactTerms : null;

  const allResults = [];
  const headers = {};

  if (providerConfig.googleReferer) {
    headers.Referer = providerConfig.googleReferer;
  }

  const limit = Number.isFinite(maxResults) && maxResults > 0 ? Math.min(maxResults, 100) : 100;
  let start = 1;

  while (allResults.length < limit) {
    const remaining = limit - allResults.length;
    const num = Math.max(1, Math.min(10, remaining));
    const params = new URLSearchParams({
      key: providerApiKeys.google,
      cx: providerConfig.googleSearchEngineId,
      q: query,
      num: String(num),
      start: String(start),
      dateRestrict: 'd180'
    });

    if (exactTerms) {
      params.set('exactTerms', exactTerms);
    }

    const url = `https://www.googleapis.com/customsearch/v1?${params.toString()}`;
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
    const mapped = items.map((item) => ({
      id: randomUUID(),
      title: item.title,
      url: item.link,
      snippet: item.snippet || '',
      publishedAt: getPublishedDate(item),
      provider: 'google'
    }));

    allResults.push(...mapped);

    if (!data.queries?.nextPage || !items.length) {
      break;
    }

    const nextStart = data.queries.nextPage?.[0]?.startIndex;
    if (!nextStart) {
      break;
    }

    start = nextStart;
  }

  return allResults.slice(0, limit);
}

const providerLookup = {
  google: googleSearch
};

module.exports = {
  providerLookup
};
