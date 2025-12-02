const { randomUUID } = require('crypto');
const { getSearchProfile } = require('../data/clientSearchProfiles');
const { runQuery } = require('../db');
const { providerLookup } = require('../providers/providers');
const { searchConfig } = require('../config');
const { normalizeResult, dedupeMentions, associatePressRelease, recordMentions } = require('../utils/mentions');
const { buildSearchRequest } = require('../utils/searchQueries');
const { filterResultsForClient } = require('../utils/searchFilters');

function buildQueries(client, profile, activePressReleases) {
  const base = buildSearchRequest(client, profile);
  const perRelease = activePressReleases.map((release) =>
    buildSearchRequest(client, profile, { extraPhrases: [release.title], label: `press:${release.title}` })
  );
  return [base, ...perRelease];
}

function hydratePressReleasesForClient(client) {
  const rows = runQuery('SELECT id, title FROM pressReleases WHERE clientId=@p0;', [client.id]);
  if (!rows.length) {
    return [];
  }
  return rows.map((release) => ({ ...release, keywords: [release.title || client.name] }));
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
  const logLabel = label ? `${label} | ${query}` : query;
  try {
    console.log(`[providers] ${providerName} → searching for "${logLabel}"`);
    const results = await provider(searchRequest, { maxResults: searchConfig.maxResultsPerProvider });
    jobLog.providerRuns.push({ provider: providerName, query, label, status: 'success', results: results.length });
    console.log(`[providers] ${providerName} ✓ returned ${results.length} results for "${logLabel}"`);
    return results;
  } catch (err) {
    console.warn(`[providers] ${providerName} ✗ failed for "${query}": ${err.message}`);
    jobLog.errors.push({ provider: providerName, query, message: err.message });
    jobLog.providerRuns.push({ provider: providerName, query, status: 'failed', error: err.message });
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

  const activeClients = loadClients();
  for (const client of activeClients) {
    const profile = getSearchProfile(client);
    const activePressReleases = hydratePressReleasesForClient(client);
    const queries = buildQueries(client, profile, activePressReleases);
    const providerResults = [];

    for (const providerName of searchConfig.providers) {
      for (const searchRequest of queries) {
        const results = await runProvider(providerName, searchRequest, jobLog);
        const filtered = filterResultsForClient(results, profile, client);
        filtered.forEach((result) => providerResults.push(normalizeResult(result, client)));
      }
    }

    const deduped = dedupeMentions(providerResults);
    const associated = deduped.map((result) => ({
      ...result,
      matchedPressReleaseId: associatePressRelease(result, activePressReleases)
    }));

    const created = recordMentions(associated, searchConfig.mentionStatus);
    jobLog.createdMentions += created.length;
  }

  jobLog.finishedAt = new Date().toISOString();
  jobLog.status = jobLog.errors.length ? 'completed_with_errors' : 'completed';
  return jobLog;
}

module.exports = {
  runSearchJob
};
