const { getSearchProfile } = require('./src/data/clientSearchProfiles');
const { runQuery } = require('./src/db');
const { providerLookup } = require('./src/providers/providers');
const { searchConfig } = require('./src/config');
const { normalizeResult, dedupeMentions, recordMentions } = require('./src/utils/mentions');
const { buildSearchRequest } = require('./src/utils/searchQueries');
const { filterResultsForClient } = require('./src/utils/searchFilters');

async function testEFISearch() {
  console.log('Testing EFI Enhanced Search Query');
  console.log('='.repeat(80));
  console.log();

  // Get EFI client
  const [efiClient] = runQuery("SELECT id, name FROM clients WHERE LOWER(name) LIKE '%equitable%' LIMIT 1");

  if (!efiClient) {
    console.log('❌ EFI client not found in database');
    return;
  }

  console.log('Client:', efiClient.name);
  console.log('Client ID:', efiClient.id);
  console.log();

  // Get search profile
  const profile = getSearchProfile(efiClient);
  console.log('Search Profile:');
  console.log('  Search Terms:', profile.searchTerms || efiClient.name);
  console.log('  Context Words:', profile.contextWords.join(', '));
  console.log('  Exclude Words:', profile.excludeWords.join(', '));
  console.log();

  // Build search request
  const searchRequest = buildSearchRequest(efiClient, profile);
  console.log('Generated Query:');
  console.log(searchRequest.query);
  console.log();
  console.log('='.repeat(80));
  console.log('Running Google Search...');
  console.log('='.repeat(80));
  console.log();

  // Run Google search
  const googleSearch = providerLookup.google;
  const rawResults = await googleSearch(searchRequest, { maxResults: 100 });

  console.log(`✓ Google returned ${rawResults.length} raw results`);
  console.log();

  // Filter results
  const filtered = filterResultsForClient(rawResults, profile, efiClient);
  console.log(`✓ After filtering: ${filtered.length} results`);
  console.log();

  // Normalize results
  const normalized = filtered.map(r => normalizeResult(r, efiClient));

  // Dedupe
  const deduped = dedupeMentions(normalized);
  console.log(`✓ After deduplication: ${deduped.length} unique results`);
  console.log();

  console.log('='.repeat(80));
  console.log('Sample Results (first 10):');
  console.log('='.repeat(80));
  console.log();

  deduped.slice(0, 10).forEach((result, i) => {
    console.log(`${i + 1}. ${result.title}`);
    console.log(`   Source: ${result.source}`);
    console.log(`   URL: ${result.url}`);
    console.log(`   Published: ${result.publishedAt || 'N/A'}`);
    console.log(`   Sentiment: ${result.sentiment}`);
    console.log();
  });

  if (deduped.length > 10) {
    console.log(`... and ${deduped.length - 10} more results`);
    console.log();
  }

  console.log('='.repeat(80));
  console.log('Summary:');
  console.log('='.repeat(80));
  console.log(`Total unique results found: ${deduped.length}`);
  console.log(`Previous baseline: 1 mention (from manual tracking comparison)`);
  console.log(`Improvement: ${deduped.length}x increase`);
  console.log();

  // Count by source
  const bySources = {};
  deduped.forEach(r => {
    const source = r.source || 'unknown';
    bySources[source] = (bySources[source] || 0) + 1;
  });

  console.log('Results by source:');
  Object.entries(bySources)
    .sort((a, b) => b[1] - a[1])
    .forEach(([source, count]) => {
      console.log(`  ${source}: ${count}`);
    });
}

testEFISearch()
  .then(() => {
    console.log('\n✓ Test complete');
    process.exit(0);
  })
  .catch(err => {
    console.error('\n❌ Test failed:', err.message);
    console.error(err.stack);
    process.exit(1);
  });
