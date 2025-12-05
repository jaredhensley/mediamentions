const { runQuery } = require('./src/db');

// Get EFI client ID
const clients = runQuery("SELECT id, name FROM clients WHERE LOWER(name) LIKE '%efi%' OR LOWER(name) LIKE '%equitable%' LIMIT 1");
const efiClient = clients[0];

if (!efiClient) {
  console.log('EFI client not found in database');
  process.exit(0);
}

console.log('EFI Client:', efiClient);
console.log();

// Get all EFI mentions (both verified and unverified)
const allMentions = runQuery('SELECT id, title, link, source, mentionDate, verified, sentiment, createdAt FROM mediaMentions WHERE clientId = @p0 ORDER BY mentionDate DESC', [efiClient.id]);

console.log('Total EFI mentions in database:', allMentions.length);
console.log('Verified:', allMentions.filter(m => m.verified === 1).length);
console.log('False positives:', allMentions.filter(m => m.verified === 0).length);
console.log();

console.log('Verified mentions:');
console.log('==================');
allMentions.filter(m => m.verified === 1).forEach((m, i) => {
  console.log(`${i + 1}. [${m.mentionDate.slice(0, 10)}] ${m.title}`);
  console.log(`   Source: ${m.source}`);
  console.log(`   URL: ${m.link}`);
  console.log(`   Sentiment: ${m.sentiment || 'N/A'}`);
  console.log();
});
