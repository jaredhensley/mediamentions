const { runQuery } = require('./src/db');

async function searchVivaInDatabase() {
  console.log('Searching for "Viva" in database:\n');

  // Search in clients
  console.log('='.repeat(80));
  console.log('CLIENTS containing "Viva":');
  console.log('='.repeat(80));
  const clients = await runQuery(`SELECT * FROM clients WHERE name LIKE '%Viva%' OR name LIKE '%viva%'`);
  console.log(`Found ${clients.length} clients`);
  clients.forEach(c => console.log(`  ID ${c.id}: ${c.name}`));

  // Search in media mentions titles
  console.log('\n' + '='.repeat(80));
  console.log('MEDIA MENTIONS with "Viva" in title:');
  console.log('='.repeat(80));
  const mentionsInTitle = await runQuery(`SELECT * FROM mediaMentions WHERE title LIKE '%Viva%' OR title LIKE '%viva%'`);
  console.log(`Found ${mentionsInTitle.length} mentions\n`);
  mentionsInTitle.slice(0, 5).forEach((m, i) => {
    console.log(`${i + 1}. Date: ${m.mentionDate}, Client ID: ${m.clientId}`);
    console.log(`   Title: ${m.title}`);
    console.log(`   Source: ${m.source}\n`);
  });

  // Search in media mentions sources
  console.log('='.repeat(80));
  console.log('MEDIA MENTIONS with "Viva" in source:');
  console.log('='.repeat(80));
  const mentionsInSource = await runQuery(`SELECT * FROM mediaMentions WHERE source LIKE '%Viva%' OR source LIKE '%viva%'`);
  console.log(`Found ${mentionsInSource.length} mentions\n`);
  mentionsInSource.slice(0, 5).forEach((m, i) => {
    console.log(`${i + 1}. Date: ${m.mentionDate}, Client ID: ${m.clientId}`);
    console.log(`   Title: ${m.title}`);
    console.log(`   Source: ${m.source}\n`);
  });

  // Get all mentions for any client to see what data exists
  console.log('='.repeat(80));
  console.log('SAMPLE OF ALL DATABASE MENTIONS (to understand data):');
  console.log('='.repeat(80));
  const allMentions = await runQuery(`
    SELECT m.*, c.name as clientName
    FROM mediaMentions m
    JOIN clients c ON m.clientId = c.id
    ORDER BY m.mentionDate DESC
    LIMIT 10
  `);
  console.log(`\nShowing ${allMentions.length} most recent mentions:\n`);
  allMentions.forEach((m, i) => {
    console.log(`${i + 1}. ${m.mentionDate} - ${m.clientName}`);
    console.log(`   Title: ${m.title}`);
    console.log(`   Source: ${m.source}\n`);
  });

  // Count mentions per client
  console.log('='.repeat(80));
  console.log('MENTIONS COUNT BY CLIENT:');
  console.log('='.repeat(80));
  const counts = await runQuery(`
    SELECT c.id, c.name, COUNT(m.id) as count
    FROM clients c
    LEFT JOIN mediaMentions m ON c.id = m.clientId
    GROUP BY c.id
    ORDER BY count DESC
  `);
  console.log('');
  counts.forEach(c => {
    console.log(`  ${c.name} (ID ${c.id}): ${c.count} mentions`);
  });
}

searchVivaInDatabase().catch(console.error);
