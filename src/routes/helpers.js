/**
 * @fileoverview CRUD route handler factories
 * Reduces code duplication by generating common route handlers
 */

const { runQuery } = require('../db');
const { parseJsonBody, sendJson, buildUpdateFields } = require('../utils/http');
const { validate, idParamSchema } = require('../schemas');

/**
 * Create a GET handler for fetching a single resource by ID
 * @param {string} tableName - Database table name
 * @param {string} resourceName - Human-readable resource name for errors
 * @returns {Function} Route handler
 */
function createGetHandler(tableName, resourceName) {
  return async function(_req, res, params) {
    const validation = validate(idParamSchema, params);
    if (!validation.success) {
      sendJson(res, 400, { error: validation.error });
      return;
    }
    const [item] = runQuery(`SELECT * FROM ${tableName} WHERE id=@p0;`, [validation.data.id]);
    if (!item) {
      sendJson(res, 404, { error: `${resourceName} not found` });
      return;
    }
    sendJson(res, 200, item);
  };
}

/**
 * Create an UPDATE handler for a resource
 * @param {string} tableName - Database table name
 * @param {string} resourceName - Human-readable resource name for errors
 * @param {Object} updateSchema - Zod schema for validation
 * @param {string[]} allowedKeys - List of allowed update fields
 * @returns {Function} Route handler
 */
function createUpdateHandler(tableName, resourceName, updateSchema, allowedKeys) {
  return async function(req, res, params) {
    const idValidation = validate(idParamSchema, params);
    if (!idValidation.success) {
      sendJson(res, 400, { error: idValidation.error });
      return;
    }
    const body = await parseJsonBody(req);
    const validation = validate(updateSchema, body);
    if (!validation.success) {
      sendJson(res, 400, { error: validation.error });
      return;
    }
    const { keys, values } = buildUpdateFields(validation.data, allowedKeys);
    keys.push('updatedAt');
    values.push(new Date().toISOString());
    values.push(idValidation.data.id);
    const assignment = keys.map((key, idx) => `${key}=@p${idx}`).join(', ');
    const [item] = runQuery(
      `UPDATE ${tableName} SET ${assignment} WHERE id=@p${values.length - 1} RETURNING *;`,
      values,
    );
    if (!item) {
      sendJson(res, 404, { error: `${resourceName} not found` });
      return;
    }
    sendJson(res, 200, item);
  };
}

/**
 * Create a DELETE handler for a resource
 * @param {string} tableName - Database table name
 * @param {string} resourceName - Human-readable resource name for errors
 * @returns {Function} Route handler
 */
function createDeleteHandler(tableName, resourceName) {
  return async function(_req, res, params) {
    const validation = validate(idParamSchema, params);
    if (!validation.success) {
      sendJson(res, 400, { error: validation.error });
      return;
    }
    const [item] = runQuery(`DELETE FROM ${tableName} WHERE id=@p0 RETURNING *;`, [validation.data.id]);
    if (!item) {
      sendJson(res, 404, { error: `${resourceName} not found` });
      return;
    }
    sendJson(res, 200, item);
  };
}

/**
 * Create a LIST handler for fetching all resources
 * @param {string} tableName - Database table name
 * @param {Object} options - Options for the list query
 * @param {string} [options.whereClause] - Optional WHERE clause
 * @param {string} [options.orderBy] - ORDER BY clause (default: 'id')
 * @returns {Function} Route handler
 */
function createListHandler(tableName, { whereClause = '', orderBy = 'id' } = {}) {
  const where = whereClause ? `WHERE ${whereClause}` : '';
  return async function(_req, res) {
    const items = runQuery(`SELECT * FROM ${tableName} ${where} ORDER BY ${orderBy};`);
    sendJson(res, 200, items);
  };
}

module.exports = {
  createGetHandler,
  createUpdateHandler,
  createDeleteHandler,
  createListHandler
};
