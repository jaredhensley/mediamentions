/**
 * @fileoverview Shared verification logic for search and RSS services
 */

const { runQuery } = require('../db');
const { verifyAllMentions } = require('../scripts/verifyMentions');
const verificationStatus = require('./verificationStatus');

/**
 * Run verification on all unverified mentions
 * @param {Object} options - Options
 * @param {string} [options.source='verification'] - Source identifier for logging (e.g., 'search', 'rss')
 * @param {Object} [options.jobLog] - Job log object to update with verification results
 * @returns {Promise<{verified: number, failed: number, total: number}>} Verification results
 */
async function runVerificationPass({ source = 'verification', jobLog = null } = {}) {
  const logPrefix = source === 'rss' ? '[rss/verification]' : '[verification]';

  console.log(`\n${logPrefix} Starting automatic verification of new mentions...`);

  // Count total mentions to verify
  const totalMentions =
    runQuery(
      'SELECT COUNT(*) as count FROM mediaMentions WHERE verified IS NULL OR verified != 1'
    )[0]?.count || 0;

  verificationStatus.setVerifying(totalMentions);

  try {
    const verificationResults = await verifyAllMentions({ silent: false });

    if (jobLog) {
      jobLog.verificationResults = verificationResults;
    }

    verificationStatus.setComplete(verificationResults);
    console.log(
      `${logPrefix} ✓ Completed: ${verificationResults.verified} verified, ${verificationResults.failed} failed`
    );

    return verificationResults;
  } catch (err) {
    console.warn(`${logPrefix} ✗ Failed: ${err.message}`);

    if (jobLog) {
      jobLog.errors.push({ step: 'verification', message: err.message });
    }

    verificationStatus.setComplete({ total: 0, verified: 0, failed: 0 });

    return { total: 0, verified: 0, failed: 0, error: err.message };
  }
}

/**
 * Skip verification and set status to complete
 * @param {string} [reason='no new mentions created'] - Reason for skipping
 */
function skipVerification(reason = 'no new mentions created') {
  console.log(`[verification] Skipped (${reason})`);
  verificationStatus.setComplete({ total: 0, verified: 0, failed: 0 });
}

module.exports = {
  runVerificationPass,
  skipVerification
};
