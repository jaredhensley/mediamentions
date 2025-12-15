#!/usr/bin/env node
/**
 * Manual RSS feed polling script
 * Usage: node src/scripts/pollRssFeeds.js [--no-verify]
 */

const { initializeDatabase } = require('../db');
const { pollRssFeeds } = require('../services/rssService');

async function main() {
  const args = process.argv.slice(2);
  const skipVerification = args.includes('--no-verify');

  console.log('Initializing database...');
  initializeDatabase();

  console.log(`\nStarting RSS feed polling${skipVerification ? ' (verification disabled)' : ''}...\n`);

  try {
    const result = await pollRssFeeds({ runVerification: !skipVerification });

    console.log('\n========================================');
    console.log('RSS Polling Complete');
    console.log('========================================');
    console.log(`Status: ${result.status}`);
    console.log(`Feeds polled: ${result.feedsPolled}`);
    console.log(`Entries found: ${result.entriesFound}`);
    console.log(`Mentions created: ${result.mentionsCreated}`);

    if (result.verificationResults) {
      console.log(`\nVerification Results:`);
      console.log(`  Verified: ${result.verificationResults.verified}`);
      console.log(`  Failed: ${result.verificationResults.failed}`);
      console.log(`  Needs Review: ${result.verificationResults.needsReview || 0}`);
    }

    if (result.errors.length > 0) {
      console.log(`\nErrors (${result.errors.length}):`);
      result.errors.forEach((err, i) => {
        console.log(`  ${i + 1}. ${err.clientName || err.step}: ${err.message}`);
      });
    }

    console.log(`\nDuration: ${((new Date(result.finishedAt) - new Date(result.startedAt)) / 1000).toFixed(1)}s`);

  } catch (err) {
    console.error('Fatal error:', err.message);
    process.exit(1);
  }
}

main();
