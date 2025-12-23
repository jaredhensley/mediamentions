const { runQuery } = require('../db');
const defaultClients = require('../data/defaultClients');

function seedDefaultClients({ log = () => {} } = {}) {
  // Get existing clients with their current RSS feed URLs
  const existingClients = runQuery(
    'SELECT id, LOWER(name) as name, alertsRssFeedUrl FROM clients;'
  );
  const existingNames = new Map(existingClients.map((row) => [row.name, row]));

  const now = new Date().toISOString();
  let inserted = 0;
  let updated = 0;

  defaultClients.forEach((client) => {
    const normalizedName = client.name.toLowerCase();
    const existing = existingNames.get(normalizedName);

    if (existing) {
      // Update existing client with RSS feed URL if they don't have one
      if (!existing.alertsRssFeedUrl && client.alertsRssFeedUrl) {
        runQuery('UPDATE clients SET alertsRssFeedUrl = @p0, updatedAt = @p1 WHERE id = @p2;', [
          client.alertsRssFeedUrl,
          now,
          existing.id
        ]);
        updated += 1;
      }
      return;
    }

    // Insert new client with RSS feed URL
    runQuery(
      'INSERT INTO clients (name, contactEmail, alertsRssFeedUrl, createdAt, updatedAt) VALUES (@p0, @p1, @p2, @p3, @p3);',
      [client.name, client.contactEmail, client.alertsRssFeedUrl, now]
    );
    inserted += 1;
    existingNames.set(normalizedName, { name: normalizedName });
  });

  if (inserted || updated) {
    log(`Seeded ${inserted} new client(s), updated ${updated} with RSS feeds.`);
  } else {
    log('Default clients already present; no changes needed.');
  }
  return inserted + updated;
}

module.exports = { seedDefaultClients };
