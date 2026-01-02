/**
 * @fileoverview Feedback summary route handlers
 */

const { runQuery } = require('../db');
const { parseJsonBody, sendJson } = require('../utils/http');
const {
  validate,
  createFeedbackSummarySchema,
  updateFeedbackSummarySchema
} = require('../schemas');
const {
  createGetHandler,
  createUpdateHandler,
  createDeleteHandler,
  createListHandler
} = require('./helpers');

const listFeedbackSummaries = createListHandler('feedbackSummaries');
const getFeedbackSummary = createGetHandler('feedbackSummaries', 'Feedback summary');
const updateFeedbackSummary = createUpdateHandler(
  'feedbackSummaries',
  'Feedback summary',
  updateFeedbackSummarySchema,
  ['clientId', 'summary', 'rating', 'period']
);
const deleteFeedbackSummary = createDeleteHandler('feedbackSummaries', 'Feedback summary');

async function createFeedbackSummary(req, res) {
  try {
    const body = await parseJsonBody(req);
    const validation = validate(createFeedbackSummarySchema, body);
    if (!validation.success) {
      sendJson(res, 400, { error: validation.error });
      return;
    }
    const d = validation.data;
    const now = new Date().toISOString();
    const [summary] = runQuery(
      'INSERT INTO feedbackSummaries (clientId, summary, rating, period, createdAt, updatedAt) VALUES (@p0, @p1, @p2, @p3, @p4, @p4) RETURNING *;',
      [d.clientId, d.summary, d.rating || null, d.period || null, now]
    );
    sendJson(res, 201, summary);
  } catch (error) {
    sendJson(res, 400, { error: error.message });
  }
}

const routes = [
  { method: 'GET', pattern: '/feedback-summaries', handler: listFeedbackSummaries },
  { method: 'POST', pattern: '/feedback-summaries', handler: createFeedbackSummary },
  { method: 'GET', pattern: '/feedback-summaries/:id', handler: getFeedbackSummary },
  { method: 'PUT', pattern: '/feedback-summaries/:id', handler: updateFeedbackSummary },
  { method: 'DELETE', pattern: '/feedback-summaries/:id', handler: deleteFeedbackSummary }
];

module.exports = {
  routes,
  listFeedbackSummaries,
  getFeedbackSummary,
  createFeedbackSummary,
  updateFeedbackSummary,
  deleteFeedbackSummary
};
