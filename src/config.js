const fs = require('fs');
const path = require('path');

const rootDir = path.join(__dirname, '..');
const envPath = path.join(rootDir, '.env');
const exampleEnvPath = path.join(rootDir, '.env.example');

function parseEnvFile(filePath) {
  const result = {};
  if (!fs.existsSync(filePath)) {
    return result;
  }
  const content = fs.readFileSync(filePath, 'utf8');
  content.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const [key, ...rest] = trimmed.split('=');
    const value = rest.join('=');
    if (key) {
      result[key.trim()] = value.trim();
    }
  });
  return result;
}

function writeEnvFile(values) {
  const serialized = Object.entries(values)
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');
  fs.writeFileSync(envPath, `${serialized}\n`, 'utf8');
}

function ensureEnvFile() {
  if (fs.existsSync(envPath) || !fs.existsSync(exampleEnvPath)) {
    return;
  }
  const defaults = parseEnvFile(exampleEnvPath);
  const merged = { ...defaults };
  Object.keys(defaults).forEach((key) => {
    if (process.env[key]) {
      merged[key] = process.env[key];
    }
  });
  writeEnvFile(merged);
}

function hydrateProcessEnv(values) {
  Object.entries(values).forEach(([key, value]) => {
    if (!process.env[key]) {
      process.env[key] = value;
    }
  });
}

function resolveDatabasePath(rawPath) {
  if (!rawPath) {
    return path.join(rootDir, 'data', 'mediamentions.db');
  }
  if (path.isAbsolute(rawPath)) {
    return rawPath;
  }
  return path.join(rootDir, rawPath);
}

function loadEnvironment() {
  ensureEnvFile();
  const envFromFile = parseEnvFile(envPath);
  const fallbackEnv = Object.keys(envFromFile).length ? envFromFile : parseEnvFile(exampleEnvPath);
  hydrateProcessEnv(fallbackEnv);

  const port = Number(process.env.PORT || fallbackEnv.PORT || 3000);
  const databasePath = resolveDatabasePath(process.env.DATABASE_URL || fallbackEnv.DATABASE_URL);
  const databaseDir = path.dirname(databasePath);
  if (!fs.existsSync(databaseDir)) {
    fs.mkdirSync(databaseDir, { recursive: true });
  }

  return { port, databasePath, rootDir };
}

const config = loadEnvironment();

module.exports = { config, loadEnvironment };
