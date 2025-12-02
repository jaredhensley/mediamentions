const path = require('path');
const { initializeDatabase, runQuery, databasePath } = require('./db');
const defaultPublications = require('./data/defaultPublications');
const defaultClients = require('./data/defaultClients');
const { seedDefaultClients } = require('./utils/seedDefaultClients');
const { seedDefaultPublications } = require('./utils/seedDefaultPublications');

function log(msg) {
  // eslint-disable-next-line no-console
  console.log(`[dev] ${msg}`);
}

function seedIfEmpty() {
  seedDefaultClients({ log });
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
  const sampleClientName = defaultClients[0].name;
  const [client] =
    runQuery('SELECT * FROM clients WHERE LOWER(name) = LOWER(@p0) LIMIT 1;', [sampleClientName]) || [];

  if (!client) {
    throw new Error(`Expected default client "${sampleClientName}" to be seeded before sample data.`);
  }

  const samplePublicationName = defaultPublications[0].name;
  const [publication] =
    runQuery('SELECT * FROM publications WHERE LOWER(name) = LOWER(@p0) LIMIT 1;', [samplePublicationName]) || [];

  if (!publication) {
    throw new Error(`Expected default publication "${samplePublicationName}" to be seeded before sample data.`);
  }

  runQuery(
    'INSERT INTO mediaMentions (title, subjectMatter, mentionDate, link, clientId, publicationId, createdAt, updatedAt) VALUES (@p0, @p1, @p2, @p3, @p4, @p5, @p6, @p6);',
    [
      'Launch coverage',
      'Product',
      '2024-05-01',
      defaultPublications[0].website || 'https://example.com/launch',
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
