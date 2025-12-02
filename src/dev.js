const path = require('path');
const { initializeDatabase, runQuery, databasePath } = require('./db');
const { seedDefaultPublications } = require('./utils/seedDefaultPublications');

function log(msg) {
  // eslint-disable-next-line no-console
  console.log(`[dev] ${msg}`);
}

function seedIfEmpty() {
  seedDefaultPublications({ log });

  const [{ count: clientCount } = { count: 0 }] = runQuery('SELECT COUNT(*) as count FROM clients;');
  const [{ count: publicationCount } = { count: 0 }] = runQuery(
    'SELECT COUNT(*) as count FROM publications;',
  );
  const [{ count: mentionCount } = { count: 0 }] = runQuery('SELECT COUNT(*) as count FROM mediaMentions;');

  if (clientCount || publicationCount || mentionCount) {
    log(
      `Skipping sample seed because existing data was detected (clients: ${clientCount}, publications: ${publicationCount}, mentions: ${mentionCount}).`,
    );
    return;
  }

  const now = new Date().toISOString();
  const [client] = runQuery(
    'INSERT INTO clients (name, contactEmail, createdAt, updatedAt) VALUES (@p0, @p1, @p2, @p2) RETURNING *;',
    ['Example Client', 'press@example.com', now],
  );

  const [publication] = runQuery(
    'INSERT INTO publications (name, website, clientId, createdAt, updatedAt) VALUES (@p0, @p1, @p2, @p3, @p3) RETURNING *;',
    ['Tech Daily', 'https://techdaily.example', client.id, now],
  );

  runQuery(
    'INSERT INTO mediaMentions (title, subjectMatter, mentionDate, link, clientId, publicationId, createdAt, updatedAt) VALUES (@p0, @p1, @p2, @p3, @p4, @p5, @p6, @p6);',
    [
      'Launch coverage',
      'Product',
      '2024-05-01',
      'https://techdaily.example/launch',
      client.id,
      publication.id,
      now,
    ],
  );

  log('Seeded sample client, publication, and media mention into an empty database.');
}

(function bootstrap() {
  initializeDatabase();
  const absolutePath = path.isAbsolute(databasePath)
    ? databasePath
    : path.join(process.cwd(), databasePath);
  log(`SQLite database ready at ${absolutePath}`);

  if (!process.env.SKIP_DEV_SEED) {
    seedIfEmpty();
  } else {
    log('Skipping sample seed because SKIP_DEV_SEED is set.');
  }

  log('Starting API server with CORS enabled...');
  // Requiring server starts the HTTP listener.
  // eslint-disable-next-line global-require
  require('./server');
})();
