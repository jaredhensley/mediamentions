const cron = require('node-cron');

const { runSearchJob } = require('./searchService');
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
    const nextDate = typeof next.toJSDate === 'function' ? next.toJSDate() : new Date(next);
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

module.exports = {
  scheduleDailySearch
};
