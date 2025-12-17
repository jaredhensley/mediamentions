const { scheduleDailySearch } = require('./services/scheduler');
const { runSearchJob } = require('./services/searchService');
const { initializeDatabase } = require('./db');
const { seedDefaultClients } = require('./utils/seedDefaultClients');
const { seedDefaultPublications } = require('./utils/seedDefaultPublications');
const { validateConfig } = require('./config');

const runOnce = process.argv.includes('--once');

async function start() {
  // Validate configuration before starting
  validateConfig();

  initializeDatabase();
  seedDefaultClients();
  seedDefaultPublications();

  if (runOnce) {
    console.log('[startup] running single tracking job');
    const job = await runSearchJob();
    console.log(`[startup] job ${job.id} status: ${job.status}`);
    console.log(`[startup] created mentions: ${job.createdMentions}`);
    console.log(`[startup] errors: ${job.errors.length}`);
    return;
  }

  scheduleDailySearch({ runImmediately: true });
}

start()
  .then(() => {
    if (runOnce) {
      console.log('[results] job completed successfully');
      process.exit(0);
    }
  })
  .catch((err) => {
    console.error('[startup] failed to start scheduler', err);
    process.exit(1);
  });
