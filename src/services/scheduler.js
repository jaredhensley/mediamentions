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

function nextRunDate(schedule) {
  const now = new Date();
  const next = new Date(now);
  next.setHours(schedule.hours, schedule.minutes, 0, 0);
  if (next <= now) {
    next.setDate(next.getDate() + 1);
  }
  return next;
}

async function scheduleDailySearch({ runImmediately = false } = {}) {
  const schedule = parseSchedule(searchConfig.scheduleTime);
  let nextRun = runImmediately ? new Date() : nextRunDate(schedule);

  async function runAndSchedule() {
    console.log(`[scheduler] starting tracking run at ${new Date().toISOString()}`);
    await runSearchJob();
    nextRun = nextRunDate(schedule);
    const delay = nextRun.getTime() - Date.now();
    console.log(`[scheduler] next run scheduled for ${nextRun.toISOString()}`);
    setTimeout(runAndSchedule, delay);
  }

  const initialDelay = Math.max(0, nextRun.getTime() - Date.now());
  console.log(`[scheduler] initial run scheduled for ${nextRun.toISOString()}`);
  setTimeout(runAndSchedule, initialDelay);
}

module.exports = {
  scheduleDailySearch
};
