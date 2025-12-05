const { runQuery } = require('./src/db');
const csv = require('fs').readFileSync('/Users/jaredhensley/Code/mediamentions/manual-tracking-efi.csv', 'utf-8');

// Parse CSV
const lines = csv.split('\n');
const manualMentions = [];

for (let i = 4; i < lines.length; i++) {
  const line = lines[i];
  if (!line.trim()) continue;

  const parts = line.split(',');
  const date = parts[0];
  const publication = parts[1];
  const title = parts[2];
  const link = parts[5];

  if (!date || date === 'example' || date.includes('EFI Media Mentions')) continue;
  if (date === 'JULY' || date === '5/12/20') continue; // Skip invalid dates

  manualMentions.push({
    date: date.slice(0, 10),
    publication: publication || '',
    title: title || '',
    link: link || ''
  });
}

// Get EFI client from database
const clients = runQuery("SELECT id, name FROM clients WHERE LOWER(name) LIKE '%efi%' OR LOWER(name) LIKE '%equitable%' LIMIT 1");
const efiClient = clients[0];

if (!efiClient) {
  console.log('EFI client not found');
  process.exit(1);
}

// Get automated mentions
const autoMentions = runQuery('SELECT title, link, source, mentionDate, verified FROM mediaMentions WHERE clientId = @p0', [efiClient.id]);

console.log('='.