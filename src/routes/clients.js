/**
 * @fileoverview Client route handlers
 */

const { runQuery } = require('../db');
const { parseJsonBody, sendJson } = require('../utils/http');
const { validate, createClientSchema, updateClientSchema } = require('../schemas');
const {
  createGetHandler,
  createUpdateHandler,
  createDeleteHandler,
  createListHandler
} = require('./helpers');

const listClients = createListHandler('clients');
const getClient = createGetHandler('clients', 'Client');
const updateClient = createUpdateHandler('clients', 'Client', updateClientSchema, [
  'name',
  'contactEmail',
  'alertsRssFeedUrl'
]);
const deleteClient = createDeleteHandler('clients', 'Client');

async function createClient(req, res) {
  try {
    const body = await parseJsonBody(req);
    const validation = validate(createClientSchema, body);
    if (!validation.success) {
      sendJson(res, 400, { error: validation.error });
      return;
    }
    const now = new Date().toISOString();
    const [client] = runQuery(
      'INSERT INTO clients (name, contactEmail, alertsRssFeedUrl, createdAt, updatedAt) VALUES (@p0, @p1, @p2, @p3, @p3) RETURNING *;',
      [
        validation.data.name,
        validation.data.contactEmail,
        validation.data.alertsRssFeedUrl || null,
        now
      ]
    );
    sendJson(res, 201, client);
  } catch (error) {
    sendJson(res, 400, { error: error.message });
  }
}

const routes = [
  { method: 'GET', pattern: '/clients', handler: listClients },
  { method: 'POST', pattern: '/clients', handler: createClient },
  { method: 'GET', pattern: '/clients/:id', handler: getClient },
  { method: 'PUT', pattern: '/clients/:id', handler: updateClient },
  { method: 'DELETE', pattern: '/clients/:id', handler: deleteClient }
];

module.exports = {
  routes,
  listClients,
  getClient,
  createClient,
  updateClient,
  deleteClient
};
