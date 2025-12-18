function quoteTerm(term) {
  const trimmed = term.trim();
  if (!trimmed) return '';
  if (/\s/.test(trimmed)) {
    return `"${trimmed}"`;
  }
  return trimmed;
}

function formatNegatives(words = []) {
  return words
    .filter(Boolean)
    .map((word) => word.trim())
    .filter(Boolean)
    .map((word) => `-${quoteTerm(word)}`);
}

function formatContext(contextWords = []) {
  const filtered = contextWords
    .filter(Boolean)
    .map((word) => word.trim())
    .filter(Boolean);
  if (!filtered.length) return [];
  if (filtered.length === 1) return [quoteTerm(filtered[0])];
  return [`(${filtered.map(quoteTerm).join(' OR ')})`];
}

function formatDomains(domains = []) {
  return domains
    .filter(Boolean)
    .map((domain) => domain.trim())
    .filter(Boolean)
    .map((domain) => `-site:${domain}`);
}

function buildSearchRequest(client, profile, options = {}) {
  // Use searchTerms from profile if available, otherwise use client name
  const searchTerm = profile.searchTerms || client.name.trim();
  const exactTerms = client.name.trim();
  const extraPhrases = (options.extraPhrases || []).filter(Boolean);

  // Don't quote searchTerms that contain OR - they're pre-formatted boolean queries
  const formattedSearchTerm = searchTerm.includes(' OR ') ? searchTerm : quoteTerm(searchTerm);
  const parts = [formattedSearchTerm];
  if (extraPhrases.length) {
    parts.push(...extraPhrases.map(quoteTerm));
  }
  parts.push(...formatContext(profile.contextWords));
  parts.push(...formatNegatives(profile.excludeWords));

  const excludeOwnDomains = options.excludeOwnDomains !== false;
  if (excludeOwnDomains) {
    parts.push(...formatDomains(profile.ownDomains));
  }

  const query = parts.filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();

  return {
    query,
    exactTerms,
    label: options.label
  };
}

module.exports = {
  buildSearchRequest
};
