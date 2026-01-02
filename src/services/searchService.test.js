/**
 * @fileoverview Tests for searchService
 */

jest.mock('../db');
jest.mock('../data/clientSearchProfiles');
jest.mock('../providers/providers');
jest.mock('../utils/mentions');
jest.mock('../utils/searchFilters');
jest.mock('./verificationHelper');
jest.mock('./verificationStatus');

const { runSearchJob } = require('./searchService');
const { runQuery } = require('../db');
const { getSearchProfile } = require('../data/clientSearchProfiles');
const { providerLookup } = require('../providers/providers');
const { normalizeResult, dedupeMentions, recordMentions } = require('../utils/mentions');
const { filterResultsForClient } = require('../utils/searchFilters');
const { runVerificationPass, skipVerification } = require('./verificationHelper');
const verificationStatus = require('./verificationStatus');

describe('searchService', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Default mock implementations
    runQuery.mockReturnValue([{ id: 1, name: 'Test Client' }]);
    getSearchProfile.mockReturnValue({
      searchTerms: 'Test Client',
      priorityPublications: []
    });
    providerLookup.google = jest
      .fn()
      .mockResolvedValue([{ title: 'Test Result', link: 'https://example.com/article' }]);
    filterResultsForClient.mockReturnValue([
      { title: 'Test Result', link: 'https://example.com/article' }
    ]);
    normalizeResult.mockReturnValue({
      title: 'Test Result',
      link: 'https://example.com/article',
      clientId: 1
    });
    dedupeMentions.mockImplementation((mentions) => mentions);
    recordMentions.mockReturnValue([{ id: 100 }]);
    verificationStatus.setSearching = jest.fn();
    runVerificationPass.mockResolvedValue({ total: 1, verified: 1, failed: 0 });
    skipVerification.mockImplementation(() => {});
  });

  describe('runSearchJob', () => {
    it('searches all active clients', async () => {
      const clients = [
        { id: 1, name: 'Client A' },
        { id: 2, name: 'Client B' }
      ];
      runQuery.mockReturnValue(clients);

      await runSearchJob();

      expect(getSearchProfile).toHaveBeenCalledTimes(2);
      expect(getSearchProfile).toHaveBeenCalledWith(clients[0]);
      expect(getSearchProfile).toHaveBeenCalledWith(clients[1]);
    });

    it('runs providers for each query', async () => {
      await runSearchJob();

      expect(providerLookup.google).toHaveBeenCalled();
    });

    it('filters and normalizes results', async () => {
      const rawResult = { title: 'Raw', link: 'https://example.com' };
      providerLookup.google.mockResolvedValue([rawResult]);

      await runSearchJob();

      expect(filterResultsForClient).toHaveBeenCalled();
      expect(normalizeResult).toHaveBeenCalled();
    });

    it('deduplicates and records mentions', async () => {
      const normalized = [{ title: 'Test', clientId: 1 }];
      normalizeResult.mockReturnValue(normalized[0]);

      await runSearchJob();

      expect(dedupeMentions).toHaveBeenCalled();
      expect(recordMentions).toHaveBeenCalled();
    });

    it('runs verification when mentions are created', async () => {
      recordMentions.mockReturnValue([{ id: 1 }, { id: 2 }]);

      const result = await runSearchJob();

      expect(runVerificationPass).toHaveBeenCalledWith(
        expect.objectContaining({ source: 'search' })
      );
      expect(skipVerification).not.toHaveBeenCalled();
      expect(result.createdMentions).toBe(2);
    });

    it('skips verification when no mentions created', async () => {
      recordMentions.mockReturnValue([]);

      await runSearchJob();

      expect(skipVerification).toHaveBeenCalled();
      expect(runVerificationPass).not.toHaveBeenCalled();
    });

    it('returns job log with correct structure', async () => {
      recordMentions.mockReturnValue([{ id: 1 }]);

      const result = await runSearchJob();

      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('startedAt');
      expect(result).toHaveProperty('finishedAt');
      expect(result).toHaveProperty('status');
      expect(result).toHaveProperty('errors');
      expect(result).toHaveProperty('providerRuns');
      expect(result).toHaveProperty('createdMentions');
    });

    it('handles provider errors gracefully', async () => {
      providerLookup.google.mockRejectedValue(new Error('API rate limit'));

      const result = await runSearchJob();

      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toBe('API rate limit');
      expect(result.status).toBe('completed_with_errors');
    });

    it('sets status to completed when no errors', async () => {
      const result = await runSearchJob();

      expect(result.status).toBe('completed');
    });

    it('builds priority publication queries', async () => {
      getSearchProfile.mockReturnValue({
        searchTerms: 'Test Client',
        priorityPublications: ['example.com', 'news.com']
      });

      await runSearchJob();

      // Should be called twice: base query + priority publication query
      expect(providerLookup.google).toHaveBeenCalledTimes(2);
    });

    it('sets searching status at start', async () => {
      await runSearchJob();

      expect(verificationStatus.setSearching).toHaveBeenCalled();
    });
  });
});
