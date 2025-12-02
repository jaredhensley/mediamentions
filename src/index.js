const { scheduleDailySearch } = require('./services/scheduler');
const { runSearchJob } = require('./services/searchService');
const { mediaMentions, searchJobs } = require('./data/store');

const runOnce = process.argv.includes('--once');

async function start() {
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
      console.log(`[results] mentions: ${mediaMentions.length}`);
      console.log(`[results] jobs recorded: ${searchJobs.length}`);
    }
  })
  .catch((err) => {
    console.error('[startup] failed to start scheduler', err);
    process.exitCode = 1;
  });
