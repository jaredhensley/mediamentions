const { runQuery } = require('./src/db');

// Check searchJobs table schema
const schema = runQuery("SELECT sql FROM sqlite_master WHERE type='table' AND name='searchJobs'");
console.log('searchJobs table schema:');
console.log(schema[0].sql);
console.log();

// Get all search jobs
const jobs = runQuery('SELECT * FROM searchJobs ORDER BY createdAt DESC LIMIT 20');
console.log(`\nTotal search jobs: ${jobs.length}`);
console.log('='.repeat(80));

jobs.forEach((job, i) => {
  console.log(`\n${i + 1}. Job ID: ${job.id}`);
  console.log(`   Client ID: ${job.clientId || 'N/A'}`);
  console.log(`   Status: ${job.status}`);
  console.log(`   Query: ${job.query ? job.query.substring(0, 100) : 'N/A'}`);
  console.log(`   Provider: ${job.provider || 'N/A'}`);
  console.log(`   Created: ${job.createdAt}`);
  console.log(`   Completed: ${job.completedAt || 'Not completed'}`);
});

// Get clients
const clients = runQuery('SELECT * FROM clients');
console.log('\n\n' + '='.repeat(80));
console.log('CLIENTS:');
console.log('='.repeat(80));
clients.forEach(c => {
  console.log(`\n${c.id}. ${c.name}`);
  console.log(`   Notes: ${c.notes || 'N/A'}`);

  // Get search jobs for this client
  const clientJobs = runQuery('SELECT COUNT(*) as count FROM searchJobs WHERE clientId = @p0', [c.id]);
  console.log(`   Search jobs: ${clientJobs[0].count}`);
});
