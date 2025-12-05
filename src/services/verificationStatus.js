/**
 * Simple in-memory verification status tracking
 */

const { broadcastVerificationPhase, broadcastVerificationStatus } = require('./websocket');

let status = {
  isRunning: false,
  phase: 'idle', // 'idle' | 'searching' | 'verifying' | 'complete'
  total: 0,
  processed: 0,
  verified: 0,
  failed: 0,
  startedAt: null,
  completedAt: null
};

function setSearching() {
  status = {
    isRunning: true,
    phase: 'searching',
    total: 0,
    processed: 0,
    verified: 0,
    failed: 0,
    startedAt: new Date().toISOString(),
    completedAt: null
  };
  broadcastVerificationPhase('searching');
  broadcastVerificationStatus(status);
}

function setVerifying(total) {
  status.phase = 'verifying';
  status.total = total;
  status.processed = 0;
  status.verified = 0;
  status.failed = 0;
  broadcastVerificationPhase('verifying', { total });
  broadcastVerificationStatus(status);
}

function updateProgress(processed, verified, failed) {
  status.processed = processed;
  status.verified = verified;
  status.failed = failed;
  broadcastVerificationStatus(status);
}

function setComplete(results) {
  status = {
    isRunning: false,
    phase: 'complete',
    total: results?.total || status.total,
    processed: results?.total || status.processed,
    verified: results?.verified || status.verified,
    failed: results?.failed || status.failed,
    startedAt: status.startedAt,
    completedAt: new Date().toISOString()
  };
  broadcastVerificationPhase('complete', {
    total: status.total,
    verified: status.verified,
    failed: status.failed
  });
  broadcastVerificationStatus(status);
}

function setIdle() {
  status = {
    isRunning: false,
    phase: 'idle',
    total: 0,
    processed: 0,
    verified: 0,
    failed: 0,
    startedAt: null,
    completedAt: null
  };
  broadcastVerificationPhase('idle');
}

function getStatus() {
  return { ...status };
}

module.exports = {
  setSearching,
  setVerifying,
  updateProgress,
  setComplete,
  setIdle,
  getStatus
};
