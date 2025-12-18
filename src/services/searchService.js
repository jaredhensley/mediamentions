const { randomUUID } = require('crypto');
const { getSearchProfile } = require('../data/clientSearchProfiles');
const { runQuery } = require('../db');
const { providerLookup } = require('../providers/providers');
const { searchConfig } = require('../config');
const { normalizeResult, dedupeMentions, recordMentions } = require('../utils/mentions');
const { buildSearchRequest } = require('../utils/searchQueries');
const { filterResultsForClient } = require('../utils/searchFilters');
const { runVerificationPass, skipVerification } = require('./verificationHelper');
const verificationStatus = require('./verificationStatus');

function buildQueries(client, profile) {
  const queries = [];

  // Base query (general search)
  const base = buildSearchRequest(client, profile);
  queries.push(base);

  // If client has priority publications, add a site-restricted query
  if (profile.priorityPublications && profile.priorityPublications.length > 0) {
    const siteRestrict = profile.priorityPublications.map((s) => `site:${s}`).join(' OR ');
    const clientName = profile.searchTerms || client.name;
    // Use just the full name for site-restricted query (no abbreviations to avoid noise)
    const fullName = clientName.split(' OR ')[0].replace(/"/g, '');
    const siteQuery = {
      query: `"${fullName}" (${siteRestrict})`,
      exactTerms: fullName,
      label: 'priority-publications'
    };
    queries.push(siteQuery);
  }

  return queries;
}

function loadClients() {
  return runQuery('SELECT id, name FROM clients ORDER BY id;');
}

async function runProvider(providerName, searchRequest, jobLog) {
  const provider = providerLookup[providerName];
  if (!provider) {
    throw new Error(`Unknown provider: ${providerName}`);
  }
  const query = typeof searchRequest === 'string' ? searchRequest : searchRequest.query;
  const label = typeof searchRequest === 'object' ? searchRequest.label : null;
  try {
    const results = await provider(searchRequest, {
      maxResults: searchConfig.maxResultsPerProvider
    });
    jobLog.providerRuns.push({
      provider: providerName,
      query,
      label,
      status: 'success',
      results: results.length
    });
    return results;
  } catch (err) {
    console.warn(`[providers] ${providerName} ✗ failed for "${query}": ${err.message}`);
    jobLog.errors.push({ provider: providerName, query, message: err.message });
    jobLog.providerRuns.push({
      provider: providerName,
      query,
      status: 'failed',
      error: err.message
    });
    return [];
  }
}

async function runSearchJob() {
  const jobLog = {
    id: randomUUID(),
    startedAt: new Date().toISOString(),
    status: 'running',
    errors: [],
    providerRuns: [],
    createdMentions: 0
  };

  // Set status to searching
  verificationStatus.setSearching();

  const activeClients = loadClients();
  for (const client of activeClients) {
    const profile = getSearchProfile(client);
    const queries = buildQueries(client, profile);
    const providerResults = [];

    for (const providerName of searchConfig.providers) {
      for (const searchRequest of queries) {
        const results = await runProvider(providerName, searchRequest, jobLog);
        const filtered = filterResultsForClient(results, profile, client);
        filtered.forEach((result) => providerResults.push(normalizeResult(result, client)));
      }
    }

    const deduped = dedupeMentions(providerResults);
    const created = recordMentions(deduped, searchConfig.mentionStatus);
    jobLog.createdMentions += created.length;
  }

  // Run verification on all unverified mentions
  if (jobLog.createdMentions > 0) {
    await runVerificationPass({ source: 'search', jobLog });
  } else {
    skipVerification();
  }

  jobLog.finishedAt = new Date().toISOString();
  jobLog.status = jobLog.errors.length ? 'completed_with_errors' : 'completed';
  return jobLog;
}

module.exports = {
  runSearchJob
};
