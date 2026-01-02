/**
 * @fileoverview Search job route handlers
 */

const { runQuery } = require('../db');
const { parseJsonBody, sendJson } = require('../utils/http');
const { validate, createSearchJobSchema, updateSearchJobSchema } = require('../schemas');
const {
  createGetHandler,
  createUpdateHandler,
  createDeleteHandler,
  createListHandler
} = require('./helpers');

const listSearchJobs = createListHandler('searchJobs');
const getSearchJob = createGetHandler('searchJobs', 'Search job');
const updateSearchJob = createUpdateHandler('searchJobs', 'Search job', updateSearchJobSchema, [
  'clientId',
  'query',
  'status',
  'scheduledAt',
  'completedAt'
]);
const deleteSearchJob = createDeleteHandler('searchJobs', 'Search job');

async function createSearchJob(req, res) {
  try {
    const body = await parseJsonBody(req);
    const validation = validate(createSearchJobSchema, body);
    if (!validation.success) {
      sendJson(res, 400, { error: validation.error });
      return;
    }
    const d = validation.data;
    const now = new Date().toISOString();
    const [job] = runQuery(
      'INSERT INTO searchJobs (clientId, query, status, scheduledAt, completedAt, createdAt, updatedAt) VALUES (@p0, @p1, @p2, @p3, @p4, @p5, @p5) RETURNING *;',
      [d.clientId, d.query, d.status || 'pending', d.scheduledAt, d.completedAt || null, now]
    );
    sendJson(res, 201, job);
  } catch (error) {
    sendJson(res, 400, { error: error.message });
  }
}

const routes = [
  { method: 'GET', pattern: '/search-jobs', handler: listSearchJobs },
  { method: 'POST', pattern: '/search-jobs', handler: createSearchJob },
  { method: 'GET', pattern: '/search-jobs/:id', handler: getSearchJob },
  { method: 'PUT', pattern: '/search-jobs/:id', handler: updateSearchJob },
  { method: 'DELETE', pattern: '/search-jobs/:id', handler: deleteSearchJob }
];

module.exports = {
  routes,
  listSearchJobs,
  getSearchJob,
  createSearchJob,
  updateSearchJob,
  deleteSearchJob
};
