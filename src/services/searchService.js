const { randomUUID } = require('crypto');
const { clients, pressReleases, searchJobs } = require('../data/store');
const { providerLookup } = require('../providers/providers');
const { searchConfig } = require('../config');
const { normalizeResult, dedupeMentions, associatePressRelease, recordMentions } = require('../utils/mentions');

function buildQueries(client, activePressReleases) {
  const base = client.keywords.join(' ');
  const perRelease = activePressReleases.map((release) => `${client.name} ${release.title}`);
  return [base, ...perRelease];
}

async function runProvider(providerName, query, jobLog) {
  const provider = providerLookup[providerName];
  if (!provider) {
    throw new Error(`Unknown provider: ${providerName}`);
  }
  try {
    console.log(`[providers] ${providerName} → searching for "${query}"`);
    const results = await provider(query, { maxResults: searchConfig.maxResultsPerProvider });
    jobLog.providerRuns.push({ provider: providerName, query, status: 'success', results: results.length });
    console.log(`[providers] ${providerName} ✓ returned ${results.length} results for "${query}"`);
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
  searchJobs.push(jobLog);

  const activeClients = clients;
  for (const client of activeClients) {
    const activePressReleases = pressReleases.filter((release) => release.clientId === client.id && release.active);
    if (!activePressReleases.length) {
      continue;
    }
    const queries = buildQueries(client, activePressReleases);
    const providerResults = [];

    for (const providerName of searchConfig.providers) {
      for (const query of queries) {
        const results = await runProvider(providerName, query, jobLog);
        results.forEach((result) => providerResults.push(normalizeResult(result, client)));
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
