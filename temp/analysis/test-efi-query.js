const { getSearchProfile } = require('./src/data/clientSearchProfiles');
const { buildSearchRequest } = require('./src/utils/searchQueries');

// Mock EFI client
const efiClient = {
  id: 4,
  name: 'Equitable Food Initiative'
};

const profile = getSearchProfile(efiClient);
const searchRequest = buildSearchRequest(efiClient, profile);

console.log('EFI Search Profile:');
console.log('='.repeat(80));
console.log('Name:', profile.name);
console.log('Context Words:', profile.contextWords);
console.log('Exclude Words:', profile.excludeWords);
console.log('Own Domains:', profile.ownDomains);
console.log();
console.log('Generated Search Query:');
console.log('='.repeat(80));
console.log(searchRequest.query);
console.log();
console.log('Exact Terms:', searchRequest.exactTerms);
