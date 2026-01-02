/**
 * @fileoverview Tests for verificationHelper
 */

jest.mock('../db');
jest.mock('../scripts/verifyMentions');
jest.mock('./verificationStatus');

const { runVerificationPass, skipVerification } = require('./verificationHelper');
const { runQuery } = require('../db');
const { verifyAllMentions } = require('../scripts/verifyMentions');
const verificationStatus = require('./verificationStatus');

describe('verificationHelper', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Default mock implementations
    runQuery.mockReturnValue([{ count: 5 }]);
    verifyAllMentions.mockResolvedValue({ total: 5, verified: 4, failed: 1 });
    verificationStatus.setVerifying = jest.fn();
    verificationStatus.setComplete = jest.fn();
  });

  describe('runVerificationPass', () => {
    it('counts unverified mentions before starting', async () => {
      await runVerificationPass();

      expect(runQuery).toHaveBeenCalledWith(
        expect.stringContaining('verified IS NULL OR verified != 1')
      );
    });

    it('sets verifying status with count', async () => {
      runQuery.mockReturnValue([{ count: 10 }]);

      await runVerificationPass();

      expect(verificationStatus.setVerifying).toHaveBeenCalledWith(10);
    });

    it('calls verifyAllMentions with correct options', async () => {
      await runVerificationPass();

      expect(verifyAllMentions).toHaveBeenCalledWith({ silent: false });
    });

    it('returns verification results on success', async () => {
      const expectedResults = { total: 5, verified: 4, failed: 1 };
      verifyAllMentions.mockResolvedValue(expectedResults);

      const result = await runVerificationPass();

      expect(result).toEqual(expectedResults);
    });

    it('sets complete status with results', async () => {
      const results = { total: 5, verified: 4, failed: 1 };
      verifyAllMentions.mockResolvedValue(results);

      await runVerificationPass();

      expect(verificationStatus.setComplete).toHaveBeenCalledWith(results);
    });

    it('updates jobLog when provided', async () => {
      const jobLog = { errors: [] };
      const results = { total: 5, verified: 4, failed: 1 };
      verifyAllMentions.mockResolvedValue(results);

      await runVerificationPass({ jobLog });

      expect(jobLog.verificationResults).toEqual(results);
    });

    it('handles verification errors gracefully', async () => {
      verifyAllMentions.mockRejectedValue(new Error('Browser crashed'));

      const result = await runVerificationPass();

      expect(result).toEqual({
        total: 0,
        verified: 0,
        failed: 0,
        error: 'Browser crashed'
      });
    });

    it('adds error to jobLog on failure', async () => {
      const jobLog = { errors: [] };
      verifyAllMentions.mockRejectedValue(new Error('Network timeout'));

      await runVerificationPass({ jobLog });

      expect(jobLog.errors).toHaveLength(1);
      expect(jobLog.errors[0]).toEqual({
        step: 'verification',
        message: 'Network timeout'
      });
    });

    it('sets complete status with zeros on error', async () => {
      verifyAllMentions.mockRejectedValue(new Error('Test error'));

      await runVerificationPass();

      expect(verificationStatus.setComplete).toHaveBeenCalledWith({
        total: 0,
        verified: 0,
        failed: 0
      });
    });

    it('uses correct log prefix for rss source', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await runVerificationPass({ source: 'rss' });

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('[rss/verification]'));
      consoleSpy.mockRestore();
    });

    it('uses default log prefix for search source', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await runVerificationPass({ source: 'search' });

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('[verification]'));
      consoleSpy.mockRestore();
    });

    it('handles zero unverified mentions count', async () => {
      runQuery.mockReturnValue([{ count: 0 }]);

      await runVerificationPass();

      expect(verificationStatus.setVerifying).toHaveBeenCalledWith(0);
    });
  });

  describe('skipVerification', () => {
    it('sets complete status with zero counts', () => {
      skipVerification();

      expect(verificationStatus.setComplete).toHaveBeenCalledWith({
        total: 0,
        verified: 0,
        failed: 0
      });
    });

    it('logs skip message with default reason', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      skipVerification();

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('no new mentions created'));
      consoleSpy.mockRestore();
    });

    it('logs skip message with custom reason', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      skipVerification('already running');

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('already running'));
      consoleSpy.mockRestore();
    });
  });
});
