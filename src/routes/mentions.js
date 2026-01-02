/**
 * @fileoverview Media mention route handlers
 */

const { runQuery } = require('../db');
const { parseJsonBody, sendJson } = require('../utils/http');
const {
  validate,
  createMediaMentionSchema,
  updateMediaMentionSchema,
  idParamSchema
} = require('../schemas');
const { normalizeUrlForComparison } = require('../utils/mentions');
const { createGetHandler, createUpdateHandler } = require('./helpers');

const getMediaMention = createGetHandler('mediaMentions', 'Media mention');
const updateMediaMention = createUpdateHandler(
  'mediaMentions',
  'Media mention',
  updateMediaMentionSchema,
  [
    'title',
    'subjectMatter',
    'mentionDate',
    'reMentionDate',
    'link',
    'source',
    'sentiment',
    'status',
    'clientId',
    'publicationId',
    'verified'
  ]
);

async function deleteMediaMention(_req, res, params) {
  const validation = validate(idParamSchema, params);
  if (!validation.success) {
    sendJson(res, 400, { error: validation.error });
    return;
  }

  // Fetch mention with client and publication names before deleting
  const [mention] = runQuery(
    `SELECT
      m.*,
      c.name as clientName,
      p.name as publicationName
     FROM mediaMentions m
     JOIN clients c ON m.clientId = c.id
     JOIN publications p ON m.publicationId = p.id
     WHERE m.id = @p0;`,
    [validation.data.id]
  );

  if (!mention) {
    sendJson(res, 404, { error: 'Media mention not found' });
    return;
  }

  // Archive to deletedMentions table
  runQuery(
    `INSERT INTO deletedMentions (
      originalMentionId, title, subjectMatter, mentionDate, reMentionDate,
      link, source, sentiment, status, verified, clientId, clientName,
      publicationId, publicationName
    ) VALUES (@p0, @p1, @p2, @p3, @p4, @p5, @p6, @p7, @p8, @p9, @p10, @p11, @p12, @p13);`,
    [
      mention.id,
      mention.title,
      mention.subjectMatter,
      mention.mentionDate,
      mention.reMentionDate,
      mention.link,
      mention.source,
      mention.sentiment,
      mention.status,
      mention.verified,
      mention.clientId,
      mention.clientName,
      mention.publicationId,
      mention.publicationName
    ]
  );

  // Delete from mediaMentions
  runQuery('DELETE FROM mediaMentions WHERE id = @p0;', [validation.data.id]);

  sendJson(res, 200, mention);
}

async function listMediaMentions(req, res) {
  const url = new URL(req.url, 'http://localhost');
  const filters = [];
  const params = [];
  if (url.searchParams.get('clientId')) {
    params.push(Number(url.searchParams.get('clientId')));
    filters.push(`clientId=@p${params.length - 1}`);
  }
  if (url.searchParams.get('publicationId')) {
    params.push(Number(url.searchParams.get('publicationId')));
    filters.push(`publicationId=@p${params.length - 1}`);
  }
  if (url.searchParams.get('startDate')) {
    params.push(url.searchParams.get('startDate'));
    filters.push(`mentionDate >= @p${params.length - 1}`);
  }
  if (url.searchParams.get('endDate')) {
    params.push(url.searchParams.get('endDate'));
    filters.push(`mentionDate <= @p${params.length - 1}`);
  }
  if (url.searchParams.get('subject')) {
    params.push(`%${url.searchParams.get('subject')}%`);
    filters.push(`subjectMatter LIKE @p${params.length - 1}`);
  }
  const whereClause = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
  const mentions = runQuery(
    `SELECT * FROM mediaMentions ${whereClause} ORDER BY mentionDate DESC, id DESC;`,
    params
  );
  sendJson(res, 200, mentions);
}

async function createMediaMention(req, res) {
  try {
    const body = await parseJsonBody(req);
    const validation = validate(createMediaMentionSchema, body);
    if (!validation.success) {
      sendJson(res, 400, { error: validation.error });
      return;
    }
    const d = validation.data;
    const now = new Date().toISOString();

    // Normalize the URL to ensure consistency (http -> https, remove tracking params)
    const normalizedLink = normalizeUrlForComparison(d.link) || d.link || '';

    const [mention] = runQuery(
      `INSERT INTO mediaMentions (title, subjectMatter, mentionDate, reMentionDate, link, source, sentiment, status, clientId, publicationId, createdAt, updatedAt)
       VALUES (@p0, @p1, @p2, @p3, @p4, @p5, @p6, @p7, @p8, @p9, @p10, @p10) RETURNING *;`,
      [
        d.title,
        d.subjectMatter || '',
        d.mentionDate,
        d.reMentionDate || null,
        normalizedLink,
        d.source || null,
        d.sentiment || null,
        d.status || 'new',
        d.clientId,
        d.publicationId,
        now
      ]
    );
    sendJson(res, 201, mention);
  } catch (error) {
    sendJson(res, 400, { error: error.message });
  }
}

const routes = [
  { method: 'GET', pattern: '/media-mentions', handler: listMediaMentions },
  { method: 'POST', pattern: '/media-mentions', handler: createMediaMention },
  { method: 'GET', pattern: '/media-mentions/:id', handler: getMediaMention },
  { method: 'PUT', pattern: '/media-mentions/:id', handler: updateMediaMention },
  { method: 'DELETE', pattern: '/media-mentions/:id', handler: deleteMediaMention }
];

module.exports = {
  routes,
  listMediaMentions,
  getMediaMention,
  createMediaMention,
  updateMediaMention,
  deleteMediaMention
};
