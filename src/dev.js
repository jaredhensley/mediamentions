const path = require('path');
const { initializeDatabase, runQuery, databasePath } = require('./db');
const { runSearchJob } = require('./services/searchService');
const { clients, mediaMentions } = require('./data/store');

function log(msg) {
  // eslint-disable-next-line no-console
  console.log(`[dev] ${msg}`);
}

function slugify(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function upsertDemoClients() {
  const existing = runQuery('SELECT id, name FROM clients;');
  const nameToId = new Map(existing.map((row) => [row.name, row.id]));

  let inserted = 0;
  const now = new Date().toISOString();
  clients.forEach((client) => {
    if (nameToId.has(client.name)) return;
    const email = `${slugify(client.name)}@example.com`;
    const [row] = runQuery(
      'INSERT INTO clients (name, contactEmail, createdAt, updatedAt) VALUES (@p0, @p1, @p2, @p2) RETURNING *;',
      [client.name, email, now],
    );
    nameToId.set(client.name, row.id);
    inserted += 1;
  });

  if (inserted) {
    log(`Synced ${inserted} demo clients into SQLite for local development.`);
  } else {
    log('Demo clients already present in SQLite; skipping client seed.');
  }

  return nameToId;
}

function ensurePublicationsMap() {
  const publications = runQuery('SELECT id, name FROM publications;');
  return new Map(publications.map((row) => [row.name, row.id]));
}

async function seedMentionsWithProviders(clientNameToId) {
  const [{ count: mentionCount } = { count: 0 }] = runQuery('SELECT COUNT(*) as count FROM mediaMentions;');
  if (mentionCount) {
    log(`Skipping provider seed because ${mentionCount} media mentions already exist.`);
    return;
  }

  const jobLog = await runSearchJob();
  log(`[dev] Ran provider demo job -> status: ${jobLog.status}, created: ${jobLog.createdMentions}.`);

  const clientsById = new Map(clients.map((client) => [client.id, client]));
  const publicationNameToId = ensurePublicationsMap();
  let persisted = 0;
  const now = new Date().toISOString();

  mediaMentions.forEach((mention) => {
    const client = clientsById.get(mention.clientId);
    if (!client) return;
    const clientDbId = clientNameToId.get(client.name);
    if (!clientDbId) return;

    const publicationName = mention.publication || 'unknown';
    let publicationId = publicationNameToId.get(publicationName);
    if (!publicationId) {
      const [pub] = runQuery(
        'INSERT INTO publications (name, website, clientId, createdAt, updatedAt) VALUES (@p0, @p1, @p2, @p3, @p3) RETURNING *;',
        [publicationName, `https://${publicationName}`, clientDbId, now],
      );
      publicationId = pub.id;
      publicationNameToId.set(publicationName, publicationId);
    }

    const mentionDate = mention.publishedAt || mention.createdAt || now;
    runQuery(
      'INSERT INTO mediaMentions (title, subjectMatter, mentionDate, reMentionDate, link, clientId, publicationId, createdAt, updatedAt) VALUES (@p0, @p1, @p2, @p3, @p4, @p5, @p6, @p7, @p7);',
      [mention.title, mention.snippet || null, mentionDate, null, mention.url, clientDbId, publicationId, now],
    );
    persisted += 1;
  });

  log(`[dev] Persisted ${persisted} media mentions into SQLite for the UI/API.`);
}

(async function bootstrap() {
  initializeDatabase();
  const absolutePath = path.isAbsolute(databasePath)
    ? databasePath
    : path.join(process.cwd(), databasePath);
  log(`SQLite database ready at ${absolutePath}`);

  if (!process.env.SKIP_DEV_SEED) {
    const clientNameToId = upsertDemoClients();
    await seedMentionsWithProviders(clientNameToId);
  } else {
    log('Skipping sample seed because SKIP_DEV_SEED is set.');
  }

  log('Starting API server with CORS enabled...');
  // Requiring server starts the HTTP listener.
  // eslint-disable-next-line global-require
  require('./server');
})().catch((err) => {
  console.error('[dev] failed to bootstrap developer mode', err);
  process.exitCode = 1;
});
