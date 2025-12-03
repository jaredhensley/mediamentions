const { extractDomain } = require("./mentions");

/**
 * Generate common variations of a client name for fuzzy matching
 * @param {string} name - The client name
 * @returns {string[]} - Array of name variations
 */
function getNameVariations(name) {
  const variations = [name.toLowerCase()];

  // Handle "sweetpotato" vs "sweet potato"
  if (name.toLowerCase().includes('sweetpotato')) {
    variations.push(name.toLowerCase().replace('sweetpotato', 'sweet potato'));
  }
  if (name.toLowerCase().includes('sweet potato')) {
    variations.push(name.toLowerCase().replace('sweet potato', 'sweetpotato'));
  }

  // Handle "Colombia" vs "Colombian" (common misspelling)
  if (name.toLowerCase().includes('colombia')) {
    variations.push(name.toLowerCase().replace('colombia', 'colombian'));
  }

  return variations;
}

/**
 * Check if any word from a list appears in the text
 * @param {string} text - Text to search in
 * @param {string[]} words - Words to search for
 * @returns {number} - Count of matches
 */
function countMatches(text, words = []) {
  if (!text || !words.length) return 0;
  const lower = text.toLowerCase();
  return words.filter((word) => lower.includes(word.toLowerCase())).length;
}

/**
 * Score and filter search results based on client profile
 * Uses a scoring system where:
 * - Name match is required (returns false if not found)
 * - Name in title gives bonus points
 * - Each contextWord match adds points
 * - Each excludeWord match subtracts points
 * - Results must score >= 0.6 to pass
 *
 * @param {Array} results - Search results to filter
 * @param {Object} profile - Client search profile
 * @param {Object} client - Client object
 * @returns {Array} - Filtered results
 */
function filterResultsForClient(results, profile, client) {
  const nameVariations = getNameVariations(client.name);
  const contextWords = (profile.contextWords || []).map((word) =>
    word.toLowerCase()
  );
  const excludeWords = (profile.excludeWords || []).map((word) =>
    word.toLowerCase()
  );
  const excludeDomains = (profile.ownDomains || []).map((domain) =>
    domain.toLowerCase()
  );

  const SCORE_THRESHOLD = 0.6;

  return results.filter((result) => {
    const title = result.title || "";
    const snippet = result.snippet || "";
    const titleLower = title.toLowerCase();
    const combinedText = `${title} ${snippet}`.toLowerCase();

    // Hard filter: Exclude own domains
    const domain = extractDomain(result.url);
    if (domain && excludeDomains.includes(domain.toLowerCase())) {
      return false;
    }

    // Hard requirement: Name MUST appear (or a close variation)
    const hasNameMatch = nameVariations.some(variant => combinedText.includes(variant));
    if (!hasNameMatch) {
      return false;
    }

    // Start scoring
    let score = 0;

    // Base score for having name match
    score += 1.0;

    // Bonus: Name appears in title (very strong signal)
    const nameInTitle = nameVariations.some(variant => titleLower.includes(variant));
    if (nameInTitle) {
      score += 0.5;
    }

    // Positive signals: Each contextWord match adds confidence
    const contextMatches = countMatches(combinedText, contextWords);
    score += contextMatches * 0.2; // Each match = +0.2

    // Negative signals: Each excludeWord match reduces confidence
    const excludeMatches = countMatches(combinedText, excludeWords);
    score -= excludeMatches * 0.5; // Each match = -0.5

    // Special case: If excludeWords appear in title, very strong negative signal
    const excludeInTitle = countMatches(titleLower, excludeWords);
    score -= excludeInTitle * 0.3; // Additional penalty for title

    // Keep result if score meets threshold
    return score >= SCORE_THRESHOLD;
  });
}

module.exports = {
  filterResultsForClient,
  getNameVariations, // Export for testing
  countMatches, // Export for testing
};
