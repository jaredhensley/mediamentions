const { runQuery } = require('./db');

const shouldAutoSeed = () => process.env.NODE_ENV !== 'production' && process.env.AUTO_SEED !== 'false';

function insertClient(client) {
  const now = new Date().toISOString();
  const [created] = runQuery(
    'INSERT INTO clients (name, contactEmail, createdAt, updatedAt) VALUES (@p0, @p1, @p2, @p2) RETURNING *;',
    [client.name, client.contactEmail, now],
  );
  return created;
}

function insertPublication(publication) {
  const now = new Date().toISOString();
  const [created] = runQuery(
    'INSERT INTO publications (name, website, clientId, createdAt, updatedAt) VALUES (@p0, @p1, @p2, @p3, @p3) RETURNING *;',
    [publication.name, publication.website, publication.clientId, now],
  );
  return created;
}

function insertMediaMention(mention) {
  const now = new Date().toISOString();
  const [created] = runQuery(
    'INSERT INTO mediaMentions (title, subjectMatter, mentionDate, reMentionDate, link, clientId, publicationId, pressReleaseId, createdAt, updatedAt) VALUES (@p0, @p1, @p2, @p3, @p4, @p5, @p6, @p7, @p8, @p8) RETURNING *;',
    [
      mention.title,
      mention.subjectMatter,
      mention.mentionDate,
      mention.reMentionDate || null,
      mention.link,
      mention.clientId,
      mention.publicationId,
      mention.pressReleaseId || null,
      now,
    ],
  );
  return created;
}

function seedDevData() {
  if (!shouldAutoSeed()) {
    return { seeded: false, reason: 'Seeding disabled for this environment.' };
  }

  const [{ count }] = runQuery('SELECT COUNT(*) as count FROM mediaMentions;');
  if (count > 0) {
    return { seeded: false, reason: 'Media mentions already exist.' };
  }

  const client = insertClient({ name: 'Acme Robotics', contactEmail: 'press@acmerobotics.test' });
  const publication = insertPublication({
    name: 'Tech Daily',
    website: 'https://techdaily.example',
    clientId: client.id,
  });

  const mentions = [
    insertMediaMention({
      title: 'Acme Robotics launches autonomous delivery fleet',
      subjectMatter: 'Product Launch',
      mentionDate: '2024-05-02',
      reMentionDate: '2024-05-09',
      link: 'https://techdaily.example/acme-autonomous-delivery',
      clientId: client.id,
      publicationId: publication.id,
    }),
    insertMediaMention({
      title: 'City hospitals pilot Acme robots for supply runs',
      subjectMatter: 'Healthcare',
      mentionDate: '2024-05-14',
      reMentionDate: null,
      link: 'https://techdaily.example/acme-hospital-pilot',
      clientId: client.id,
      publicationId: publication.id,
    }),
    insertMediaMention({
      title: 'Acme Robotics raises Series B to scale urban deliveries',
      subjectMatter: 'Funding',
      mentionDate: '2024-06-03',
      reMentionDate: null,
      link: 'https://techdaily.example/acme-series-b',
      clientId: client.id,
      publicationId: publication.id,
    }),
  ];

  return {
    seeded: true,
    client,
    publication,
    mentions,
  };
}

module.exports = { seedDevData };
