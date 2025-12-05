const { runQuery } = require('./src/db');

async function checkVivaClient() {
  console.log('Checking all clients in database:\n');

  // Get all clients
  const clients = await runQuery('SELECT * FROM clients ORDER BY id');

  console.log('All clients:');
  clients.forEach(c => {
    console.log(`  ID ${c.id}: ${c.name}`);
  });

  console.log('\n' + '='.repeat(80));
  console.log('SEARCHING FOR SOUTH TEXAS ONION COMMITTEE (ID 11)');
  console.log('='.repeat(80) + '\n');

  // Get South Texas Onion Committee mentions in 180-day window
  const startDate = '2025-06-07';
  const endDate = '2025-12-04';

  const mentions = await runQuery(`
    SELECT * FROM mediaMentions
    WHERE clientId = 11
    AND mentionDate >= ?
    AND mentionDate <= ?
    ORDER BY mentionDate DESC
  `, [startDate, endDate]);

  console.log(`Mentions for South Texas Onion Committee (June 7 - Dec 4, 2025): ${mentions.length}\n`);

  if (mentions.length > 0) {
    console.log('Sample mentions (first 5):');
    mentions.slice(0, 5).forEach((m, i) => {
      console.log(`\n${i + 1}. Date: ${m.mentionDate}`);
      console.log(`   Title: ${m.title}`);
      console.log(`   Source: ${m.source}`);
      console.log(`   URL: ${m.link}`);
    });
  }

  console.log('\n' + '='.repeat(80));
  console.log('ALL MENTIONS IN DATE RANGE (for context)');
  console.log('='.repeat(80) + '\n');

  const allMentions = await runQuery(`
    SELECT * FROM mediaMentions
    WHERE clientId = 11
    ORDER BY mentionDate DESC
    LIMIT 20
  `);

  console.log(`Total recent mentions for client 11: ${allMentions.length}\n`);

  if (allMentions.length > 0) {
    console.log('Sample of all mentions (first 10):');
    allMentions.slice(0, 10).forEach((m, i) => {
      console.log(`\n${i + 1}. Date: ${m.mentionDate}`);
      console.log(`   Title: ${m.title}`);
      console.log(`   Source: ${m.source}`);
    });
  }
}

checkVivaClient().catch(console.error);
