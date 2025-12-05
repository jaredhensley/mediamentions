const { runQuery } = require('./src/db');

const clients = runQuery("SELECT id, name FROM clients WHERE LOWER(name) LIKE '%efi%' OR LOWER(name) LIKE '%equitable%' LIMIT 1");
if (!clients.length) {
  console.log('No EFI client found');
  process.exit(0);
}

const client = clients[0];
console.log('Client:', client.name);
console.log();

const searches = runQuery('SELECT * FROM searches WHERE clientId = @p0', [client.id]);

console.log('EFI Search Queries:');
console.log('='.repeat(80));
searches.forEach((s, i) => {
  console.log(`${i + 1}. Provider: ${s.provider}`);
  console.log(`   Query: ${s.query}`);
  console.log(`   Exact Terms: ${s.exactTerms || 'N/A'}`);
  console.log(`   Last Run: ${s.lastRunAt || 'Never'}`);
  console.log();
});

console.log(`\nTotal searches configured: ${searches.length}`);
