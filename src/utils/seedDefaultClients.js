const { runQuery } = require('../db');
const defaultClients = require('../data/defaultClients');

function seedDefaultClients({ log = () => {} } = {}) {
  const existingNames = new Set(
    runQuery('SELECT LOWER(name) as name FROM clients;').map((row) => row.name)
  );

  const now = new Date().toISOString();
  let inserted = 0;

  defaultClients.forEach((client) => {
    const normalizedName = client.name.toLowerCase();
    if (existingNames.has(normalizedName)) {
      return;
    }

    runQuery(
      'INSERT INTO clients (name, contactEmail, createdAt, updatedAt) VALUES (@p0, @p1, @p2, @p2);',
      [client.name, client.contactEmail, now]
    );
    inserted += 1;
    existingNames.add(normalizedName);
  });

  if (inserted) {
    log(`Seeded ${inserted} default client(s) for initial setup.`);
  } else {
    log('Default clients already present; no new records added.');
  }
  return inserted;
}

module.exports = { seedDefaultClients };
