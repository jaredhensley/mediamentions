const { providerApiKeys, providerConfig } = require('./src/config');
const { filterResultsForClient } = require('./src/utils/searchFilters');
const { getSearchProfile } = require('./src/data/clientSearchProfiles');
const fs = require('fs');

const KEY_PUBLICATIONS = [
  'thepacker.com',
  'andnowuknow.com',
  'theproducenews.com',
  'perishablenews.com',
  'freshplaza.com',
  'bluebookservices.com',
  'producebusiness.com',
  'produceretailer.com',
  'freshfruitportal.com',
  'hortidaily.com'
];

async function fetchAllPages(query) {
  const allResults = [];
  let start = 1;

  while (allResults.length < 100) {
    const params = new URLSearchParams({
      key: providerApiKeys.google,
      cx: providerConfig.googleSearchEngineId,
      q: query,
      num: '10',
      start: String(start),
      dateRestrict: 'd180'
    });

    const url = 'https://www.googleapis.com/customsearch/v1?' + params.toString();
    const response = await fetch(url);
    const data = await response.json();

    if (data.error) {
      console.error('API Error:', data.error.message);
      break;
    }

    const items = data.items || [];
    allResults.push(...items.map(item => ({
      title: item.title,
      link: item.link,
      snippet: item.snippet || '',
      provider: 'google'
    })));

    if (!data.queries?.nextPage || !items.length) break;
    start = data.queries.nextPage[0].startIndex;
  }

  return allResults;
}

async function testDualQuery() {
  const client = { id: 1, name: 'Equitable Food Initiative' };
  const profile = getSearchProfile(client);

  console.log('='.repeat(80));
  console.log('DUAL QUERY TEST FOR EFI');
  console.log('='.repeat(80));
  console.log();

  // Query 1: General search
  const generalQuery = '"Equitable Food Initiative" OR "EFI" -recipe -cooking -donation -charity -volunteer -site:equitablefood.org';
  console.log('QUERY 1 (General):');
  console.log(generalQuery);
  console.log();

  const generalResults = await fetchAllPages(generalQuery);
  console.log('General query returned: ' + generalResults.length + ' results');

  // Query 2: Site-restricted to key publications
  const siteRestrict = KEY_PUBLICATIONS.map(s => 'site:' + s).join(' OR ');
  const siteQuery = '"Equitable Food Initiative" (' + siteRestrict + ')';
  console.log();
  console.log('QUERY 2 (Site-restricted):');
  console.log(siteQuery.substring(0, 100) + '...');
  console.log();

  const siteResults = await fetchAllPages(siteQuery);
  console.log('Site-restricted query returned: ' + siteResults.length + ' results');

  // Merge and dedupe
  const allResults = [...generalResults, ...siteResults];
  const seen = new Set();
  const deduped = allResults.filter(r => {
    const key = r.link.toLowerCase().replace(/\/$/, '');
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  console.log();
  console.log('Combined: ' + allResults.length + ' -> Deduped: ' + deduped.length);

  // Apply filters
  const filtered = filterResultsForClient(deduped, profile, client);
  console.log('After filtering: ' + filtered.length + ' results');

  // Save URLs for comparison
  fs.writeFileSync('/tmp/efi_dual_query_urls.txt',
    filtered.map(r => r.link.toLowerCase()).join('\n'));

  // Count by domain
  const domains = {};
  filtered.forEach(r => {
    try {
      const hostname = new URL(r.link).hostname.replace('www.', '');
      domains[hostname] = (domains[hostname] || 0) + 1;
    } catch {}
  });

  console.log();
  console.log('RESULTS BY DOMAIN:');
  console.log('-'.repeat(60));
  Object.entries(domains)
    .sort((a,b) => b[1] - a[1])
    .slice(0, 20)
    .forEach(([domain, count]) => {
      console.log('  ' + domain + ': ' + count);
    });

  return filtered;
}

testDualQuery()
  .then(() => console.log('\nDone!'))
  .catch(console.error);
