const cron = require('node-cron');

const { runSearchJob } = require('./searchService');
const { searchConfig } = require('../config');

const TIMEZONE = 'UTC';

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

function computeNextRun(schedule) {
  const now = new Date();
  const next = new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate(),
      schedule.hours,
      schedule.minutes,
      0,
      0
    )
  );

  if (next <= now) {
    next.setUTCDate(next.getUTCDate() + 1);
  }

  return next;
}

function logNextRun(schedule) {
  try {
    const nextDate = computeNextRun(schedule);
    console.log(`[scheduler] next run scheduled for ${nextDate.toISOString()}`);
  } catch (err) {
    console.warn('[scheduler] unable to compute next run time', err.message);
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
      logNextRun(schedule);
    },
    { scheduled: true, timezone: TIMEZONE }
  );

  logNextRun(schedule);

  if (runImmediately) {
    console.log('[scheduler] running immediate tracking job');
    await runSearchJob();
    logNextRun(schedule);
  }

  return task;
}

module.exports = {
  scheduleDailySearch
};
