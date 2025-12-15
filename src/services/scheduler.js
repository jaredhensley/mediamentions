const cron = require('node-cron');

const { runSearchJob } = require('./searchService');
const { pollRssFeeds } = require('./rssService');
const { searchConfig } = require('../config');

function parseSchedule(timeString) {
  const [hours, minutes] = timeString.split(':').map(Number);
  if (
    Number.isNaN(hours) ||
    Number.isNaN(minutes) ||
    hours < 0 ||
    hours > 23 ||
    minutes < 0 ||
    minutes > 59
  ) {
    throw new Error(`Invalid schedule time: ${timeString}`);
  }
  return { hours, minutes };
}

function cronExpressionFromSchedule(schedule) {
  return `${schedule.minutes} ${schedule.hours} * * *`;
}

function getNextRunDate(task) {
  if (typeof task.nextDates === 'function') {
    return task.nextDates();
  }

  if (typeof task.getNextDates === 'function') {
    return task.getNextDates();
  }

  throw new Error('Scheduled task does not expose next run calculation');
}

function logNextRun(task) {
  try {
    const next = getNextRunDate(task);

    // If this scheduler doesn't support next run calculation
    // and getNextRunDate returns null/undefined, just skip logging.
    if (!next) {
      // Optional: uncomment if you want a low-noise info log instead of silence:
      // console.log('[scheduler] next run time not available for this scheduler');
      return;
    }

    const nextDate =
      typeof next.toJSDate === 'function' ? next.toJSDate() : new Date(next);

    console.log(`[scheduler] next run scheduled for ${nextDate.toISOString()}`);
  } catch (err) {
    const msg = err && err.message ? err.message : String(err);

    // For known/expected cases where the scheduled task doesn't expose
    // a next run calculation API (e.g., node-cron Task), do not warn.
    if (msg.includes('does not expose next run calculation')) {
      // Optional: uncomment if you want a low-noise info log:
      // console.log('[scheduler] next run time not available for this scheduler');
      return;
    }

    // Only warn on truly unexpected errors.
    console.warn('[scheduler] unable to compute next run time', msg);
  }
}

async function scheduleDailySearch({ runImmediately = false } = {}) {
  const schedule = parseSchedule(searchConfig.scheduleTime);
  const cronExpression = cronExpressionFromSchedule(schedule);

  console.log(`[scheduler] registering cron job with expression "${cronExpression}"`);
  const task = cron.schedule(
    cronExpression,
    async () => {
      console.log(`[scheduler] starting tracking run at ${new Date().toISOString()}`);
      await runSearchJob();
      logNextRun(task);
    },
    { scheduled: true, timezone: 'UTC' }
  );

  logNextRun(task);

  if (runImmediately) {
    console.log('[scheduler] running immediate tracking job');
    await runSearchJob();
    logNextRun(task);
  }

  return task;
}

/**
 * Schedule RSS feed polling to run every 2 hours
 * RSS feeds are polled more frequently than CSE to catch new mentions faster
 * @param {Object} options - Scheduler options
 * @param {boolean} options.runImmediately - Run RSS poll immediately on startup
 * @returns {Object} - Scheduled cron task
 */
async function scheduleRssPolling({ runImmediately = false } = {}) {
  // Run every 2 hours at minute 30 (offset from daily search)
  const cronExpression = '30 */2 * * *';

  console.log(`[scheduler] registering RSS polling cron job with expression "${cronExpression}"`);
  const task = cron.schedule(
    cronExpression,
    async () => {
      console.log(`[scheduler] starting RSS polling run at ${new Date().toISOString()}`);
      await pollRssFeeds();
      logNextRun(task);
    },
    { scheduled: true, timezone: 'UTC' }
  );

  logNextRun(task);

  if (runImmediately) {
    console.log('[scheduler] running immediate RSS poll');
    await pollRssFeeds();
    logNextRun(task);
  }

  return task;
}

module.exports = {
  scheduleDailySearch,
  scheduleRssPolling
};
