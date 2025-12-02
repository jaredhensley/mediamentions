const { mediaMentions, publications } = require('../data/store');

function normalizeResult(result, client) {
  const domain = extractDomain(result.url);
  const publication = domain || 'unknown';

  if (domain && !publications[domain]) {
    publications[domain] = {
      domain,
      mentions: 0,
      lastSeenAt: null
    };
  }

  return {
    ...result,
    clientId: client.id,
    clientName: client.name,
    publication,
    normalizedUrl: result.url.toLowerCase(),
    matchedPressReleaseId: null
  };
}

function extractDomain(url) {
  try {
    return new URL(url).hostname;
  } catch (err) {
    return null;
  }
}

function dedupeMentions(results) {
  const seen = new Set();
  return results.filter((result) => {
    const key = `${result.normalizedUrl}-${result.clientId}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

function associatePressRelease(result, pressReleases) {
  for (const release of pressReleases) {
    const matchesTitle = result.title.toLowerCase().includes(release.title.toLowerCase());
    const matchesKeyword = release.keywords.some((keyword) =>
      result.title.toLowerCase().includes(keyword.toLowerCase()) ||
      result.snippet.toLowerCase().includes(keyword.toLowerCase())
    );
    if (matchesTitle || matchesKeyword) {
      return release.id;
    }
  }
  return null;
}

function recordMentions(results, status) {
  const created = [];
  for (const result of results) {
    const mention = {
      id: mediaMentions.length + 1,
      clientId: result.clientId,
      publication: result.publication,
      url: result.url,
      title: result.title,
      snippet: result.snippet,
      provider: result.provider,
      publishedAt: result.publishedAt,
      status,
      matchedPressReleaseId: result.matchedPressReleaseId,
      createdAt: new Date().toISOString()
    };
    mediaMentions.push(mention);
    if (publications[result.publication]) {
      publications[result.publication].mentions += 1;
      publications[result.publication].lastSeenAt = mention.createdAt;
    }
    created.push(mention);
  }
  return created;
}

module.exports = {
  normalizeResult,
  dedupeMentions,
  associatePressRelease,
  recordMentions
};
