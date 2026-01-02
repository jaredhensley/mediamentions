/**
 * @fileoverview Publication route handlers
 */

const { runQuery } = require('../db');
const { parseJsonBody, sendJson } = require('../utils/http');
const { validate, createPublicationSchema, updatePublicationSchema } = require('../schemas');
const {
  createGetHandler,
  createUpdateHandler,
  createDeleteHandler,
  createListHandler
} = require('./helpers');

const listPublications = createListHandler('publications', {
  whereClause: "name != 'Unknown Source'"
});
const getPublication = createGetHandler('publications', 'Publication');
const updatePublication = createUpdateHandler(
  'publications',
  'Publication',
  updatePublicationSchema,
  ['name', 'website']
);
const deletePublication = createDeleteHandler('publications', 'Publication');

async function createPublication(req, res) {
  try {
    const body = await parseJsonBody(req);
    const validation = validate(createPublicationSchema, body);
    if (!validation.success) {
      sendJson(res, 400, { error: validation.error });
      return;
    }
    const now = new Date().toISOString();
    const [publication] = runQuery(
      'INSERT INTO publications (name, website, createdAt, updatedAt) VALUES (@p0, @p1, @p2, @p2) RETURNING *;',
      [validation.data.name, validation.data.website || null, now]
    );
    sendJson(res, 201, publication);
  } catch (error) {
    sendJson(res, 400, { error: error.message });
  }
}

const routes = [
  { method: 'GET', pattern: '/publications', handler: listPublications },
  { method: 'POST', pattern: '/publications', handler: createPublication },
  { method: 'GET', pattern: '/publications/:id', handler: getPublication },
  { method: 'PUT', pattern: '/publications/:id', handler: updatePublication },
  { method: 'DELETE', pattern: '/publications/:id', handler: deletePublication }
];

module.exports = {
  routes,
  listPublications,
  getPublication,
  createPublication,
  updatePublication,
  deletePublication
};
