const { extractDomain } = require("./mentions");

function containsAny(text, words = []) {
  if (!text) return false;
  const lower = text.toLowerCase();
  return words.some((word) => lower.includes(word.toLowerCase()));
}

function filterResultsForClient(results, profile, client) {
  const nameCheck = client.name.toLowerCase();
  const contextWords = (profile.contextWords || []).map((word) =>
    word.toLowerCase()
  );
  const excludeDomains = (profile.ownDomains || []).map((domain) =>
    domain.toLowerCase()
  );
  const hasProfile = contextWords.length > 0 || excludeDomains.length > 0;

  return results.filter((result) => {
    const title = result.title || "";
    const snippet = result.snippet || "";
    const combinedText = `${title} ${snippet}`.toLowerCase();

    const domain = extractDomain(result.url);
    if (domain && excludeDomains.includes(domain.toLowerCase())) {
      return false;
    }

    // For clients with search profiles, trust the context words and Google's exact term matching
    // For clients without profiles, require exact name match as a safety check
    if (!hasProfile && !combinedText.includes(nameCheck)) {
      return false;
    }

    // Apply context word filtering for clients with search profiles
    if (
      hasProfile &&
      contextWords.length &&
      !containsAny(combinedText, contextWords)
    ) {
      return false;
    }

    return true;
  });
}

module.exports = {
  filterResultsForClient,
};
