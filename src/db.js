const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const databasePath = process.env.DATABASE_URL || path.join(__dirname, '..', 'data', 'mediamentions.db');

function ensureColumn(table, column, definition) {
  const columns = runQuery(`PRAGMA table_info(${table});`);
  const hasColumn = columns.some((col) => col.name === column);
  if (!hasColumn) {
    runExecute(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition};`);
  }
}

function buildArgs(sql, params, asJson = true) {
  const args = [databasePath];
  const commands = ['PRAGMA foreign_keys = ON;', '.parameter init'];
  params.forEach((value, index) => {
    const serialized = JSON.stringify(value);
    commands.push(`.parameter set @p${index} ${serialized}`);
  });
  commands.forEach((cmd) => args.push('-cmd', cmd));
  if (asJson) {
    args.push('-json');
  }
  args.push(sql);
  return args;
}

function runQuery(sql, params = []) {
  const output = execFileSync('sqlite3', buildArgs(sql, params, true), { encoding: 'utf8' }).trim();
  if (!output) {
    return [];
  }
  return JSON.parse(output);
}

function runExecute(sql, params = []) {
  execFileSync('sqlite3', buildArgs(sql, params, false), { encoding: 'utf8' });
}

function initializeDatabase() {
  const directory = path.dirname(databasePath);
  if (directory && directory !== '.') {
    fs.mkdirSync(directory, { recursive: true });
  }

  const schema = `
  PRAGMA foreign_keys = ON;

  CREATE TABLE IF NOT EXISTS clients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    contactEmail TEXT NOT NULL,
    createdAt TEXT NOT NULL DEFAULT (datetime('now')),
    updatedAt TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS publications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    website TEXT,
    clientId INTEGER,
    createdAt TEXT NOT NULL DEFAULT (datetime('now')),
    updatedAt TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (clientId) REFERENCES clients(id) ON DELETE SET NULL
  );

  CREATE TABLE IF NOT EXISTS pressReleases (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    content TEXT,
    releaseDate TEXT NOT NULL,
    clientId INTEGER NOT NULL,
    createdAt TEXT NOT NULL DEFAULT (datetime('now')),
    updatedAt TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (clientId) REFERENCES clients(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS mediaMentions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    subjectMatter TEXT,
    mentionDate TEXT NOT NULL,
    reMentionDate TEXT,
    link TEXT,
    source TEXT,
    sentiment TEXT,
    status TEXT,
    clientId INTEGER NOT NULL,
    publicationId INTEGER NOT NULL,
    pressReleaseId INTEGER,
    createdAt TEXT NOT NULL DEFAULT (datetime('now')),
    updatedAt TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (clientId) REFERENCES clients(id) ON DELETE CASCADE,
    FOREIGN KEY (publicationId) REFERENCES publications(id) ON DELETE CASCADE,
    FOREIGN KEY (pressReleaseId) REFERENCES pressReleases(id) ON DELETE SET NULL
  );

  CREATE TABLE IF NOT EXISTS feedbackSummaries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    clientId INTEGER NOT NULL,
    summary TEXT NOT NULL,
    rating INTEGER,
    period TEXT,
    createdAt TEXT NOT NULL DEFAULT (datetime('now')),
    updatedAt TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (clientId) REFERENCES clients(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS searchJobs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    clientId INTEGER NOT NULL,
    query TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    scheduledAt TEXT NOT NULL,
    completedAt TEXT,
    createdAt TEXT NOT NULL DEFAULT (datetime('now')),
    updatedAt TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (clientId) REFERENCES clients(id) ON DELETE CASCADE
  );
  `;

  execFileSync('sqlite3', [databasePath, schema], { encoding: 'utf8' });

  // Backfill columns for existing databases where the schema already exists.
  ensureColumn('mediaMentions', 'source', 'TEXT');
  ensureColumn('mediaMentions', 'sentiment', 'TEXT');
  ensureColumn('mediaMentions', 'status', 'TEXT');

  // Create indices for performance and unique constraints
  const indices = [
    'CREATE INDEX IF NOT EXISTS idx_mentions_client ON mediaMentions(clientId);',
    'CREATE INDEX IF NOT EXISTS idx_mentions_date ON mediaMentions(mentionDate);',
    'CREATE INDEX IF NOT EXISTS idx_mentions_publication ON mediaMentions(publicationId);',
    'CREATE INDEX IF NOT EXISTS idx_mentions_link ON mediaMentions(link);',
    'CREATE INDEX IF NOT EXISTS idx_mentions_press_release ON mediaMentions(pressReleaseId);',
    'CREATE INDEX IF NOT EXISTS idx_press_client ON pressReleases(clientId);',
    'CREATE INDEX IF NOT EXISTS idx_publications_website ON publications(website);',
    'CREATE INDEX IF NOT EXISTS idx_feedback_client ON feedbackSummaries(clientId);',
    'CREATE INDEX IF NOT EXISTS idx_search_jobs_client ON searchJobs(clientId);',
    'CREATE INDEX IF NOT EXISTS idx_search_jobs_status ON searchJobs(status);',
    'CREATE UNIQUE INDEX IF NOT EXISTS idx_clients_name_unique ON clients(LOWER(name));',
    'CREATE UNIQUE INDEX IF NOT EXISTS idx_mentions_url_client_unique ON mediaMentions(link, clientId);'
  ];

  indices.forEach(sql => {
    try {
      runExecute(sql);
    } catch (err) {
      // Index might already exist, ignore
    }
  });
}

module.exports = {
  initializeDatabase,
  runQuery,
  runExecute,
  databasePath,
};
