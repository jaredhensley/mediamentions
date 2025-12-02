const { runQuery } = require('../db');
const defaultPublications = require('../data/defaultPublications');

function seedDefaultPublications({ log = () => {} } = {}) {
  const existingNames = new Set(
    runQuery('SELECT LOWER(name) as name FROM publications;').map((row) => row.name),
  );

  const now = new Date().toISOString();
  let inserted = 0;

  defaultPublications.forEach((publication) => {
    const normalizedName = publication.name.toLowerCase();
    if (existingNames.has(normalizedName)) {
      return;
    }

    runQuery(
      'INSERT INTO publications (name, website, clientId, createdAt, updatedAt) VALUES (@p0, @p1, NULL, @p2, @p2);',
      [publication.name, publication.website || null, now],
    );
    inserted += 1;
    existingNames.add(normalizedName);
  });

  if (inserted) {
    log(`Seeded ${inserted} default publication(s) for initial setup.`);
  } else {
    log('Default publications already present; no new records added.');
  }
  return inserted;
}

module.exports = { seedDefaultPublications };
