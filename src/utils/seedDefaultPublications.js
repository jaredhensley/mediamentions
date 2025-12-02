const { runQuery } = require('../db');
const defaultPublications = require('../data/defaultPublications');

function seedDefaultPublications({ log = () => {} } = {}) {
  const [{ count: publicationCount } = { count: 0 }] = runQuery('SELECT COUNT(*) as count FROM publications;');
  if (publicationCount) {
    log(`Skipping default publication seed because ${publicationCount} publication(s) already exist.`);
    return 0;
  }

  const now = new Date().toISOString();
  let inserted = 0;

  defaultPublications.forEach((publication) => {
    runQuery(
      'INSERT INTO publications (name, website, clientId, createdAt, updatedAt) VALUES (@p0, @p1, NULL, @p2, @p2);',
      [publication.name, publication.website || null, now],
    );
    inserted += 1;
  });

  log(`Seeded ${inserted} default publication(s) for initial setup.`);
  return inserted;
}

module.exports = { seedDefaultPublications };
