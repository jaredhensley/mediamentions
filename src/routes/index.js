/**
 * @fileoverview Route aggregator - combines all domain-specific route modules
 */

const clientRoutes = require('./clients');
const publicationRoutes = require('./publications');
const mentionRoutes = require('./mentions');
const feedbackRoutes = require('./feedback');
const searchJobRoutes = require('./searchJobs');
const exportRoutes = require('./exports');
const adminRoutes = require('./admin');

// Combine all routes from individual modules
const routes = [
  ...adminRoutes.routes, // Health check goes first for priority
  ...clientRoutes.routes,
  ...publicationRoutes.routes,
  ...mentionRoutes.routes,
  ...feedbackRoutes.routes,
  ...searchJobRoutes.routes,
  ...exportRoutes.routes
];

module.exports = {
  routes
};
