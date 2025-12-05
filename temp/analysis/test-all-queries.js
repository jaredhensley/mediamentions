const { getSearchProfile } = require('./src/data/clientSearchProfiles');
const { buildSearchRequest } = require('./src/utils/searchQueries');
const { runQuery } = require('./src/db');

console.log('Testing All Improved Search Queries');
console.log('='.repeat(80));
console.log();

// Get all clients from database
const clients = runQuery('SELECT id, name FROM clients ORDER BY name');

clients.forEach((client, index) => {
  console.log(`${index + 1}. ${client.name}`);
  console.log('-'.repeat(80));

  const profile = getSearchProfile(client);
  const searchRequest = buildSearchRequest(client, profile);

  console.log('Search Terms:', profile.searchTerms || `"${client.name}"`);
  console.log('Context Words:', profile.contextWords.slice(0, 8).join(', ') + (profile.contextWords.length > 8 ? '...' : ''));
  console.log('Exclude Words:', profile.excludeWords.join(', '));
  console.log();
  console.log('Generated Query:');
  console.log(searchRequest.query);
  console.log();
  console.log();
});

console.log('='.repeat(80));
console.log('Summary of Changes:');
console.log('='.repeat(80));
console.log();
console.log('Phase 1 - Abbreviations Added:');
console.log('  ✓ Full Tilt Marketing: "FullTilt Marketing"');
console.log('  ✓ MAAB: "MAAB"');
console.log('  ✓ NCSC: "NCSC", "NC Sweetpotato Commission"');
console.log('  ✓ ND250: "ND250", "ND 250"');
console.log('  ✓ TGF: "TGF", "Todd Greiner Farms Packing"');
console.log('  ✓ STOC: "STOC", "Texas 1015", "TX1015"');
console.log('  ✓ TWA: "TWA"');
console.log('  ✓ CAB: "CAB", "Colombia Avocado"');
console.log('  ✓ G&R: "G and R Farms", "G & R"');
console.log();
console.log('Phase 1 - Critical Fixes:');
console.log('  ✓ Full Tilt Marketing: Changed from general marketing to produce industry');
console.log('  ✓ Bushwick: Expanded business context, fixed exclude words');
console.log();
console.log('Phase 2 - Context Expansions:');
console.log('  ✓ All clients: Added seasonal terms (harvest, season, crop)');
console.log('  ✓ All clients: Added business terms (grower, industry, commission)');
console.log('  ✓ Agriculture clients: Added specific product/location terms');
console.log();
console.log('Phase 3 - EFI ECIP:');
console.log('  ✓ EFI: Added ECIP and "Ethical Charter Implementation Program"');
console.log();
