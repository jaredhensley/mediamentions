# Mentions tracker

A lightweight media monitoring playground that includes:

- A Node.js HTTP API that stores clients, publications, press releases, media mentions, and feedback summaries in SQLite.
- A scheduler that runs simple provider simulations to create daily media mentions for active press releases.
- A React + Vite frontend located in `client/`.

The backend uses the `sqlite3` CLI directly (no ORM) and can bootstrap a database with sample data when running in developer mode.

## Repository layout
- `src/` – SQLite schema creation, HTTP server, dev seeding helper, scheduler, and provider/search utilities.
- `client/` – React SPA (TypeScript + MUI) that consumes the backend APIs.
- `data/` – SQLite database file location when using defaults.

## Prerequisites
- Node.js 18+ installed and available on your PATH.
- `sqlite3` CLI installed (used by the backend to create and query the database).

## Setup
Install backend dependencies from the repository root:

```bash
npm install
```

Install frontend dependencies (kept separate to avoid conflicts):

```bash
cd client
npm install
```

## Running the backend API
The API starts an HTTP server on port 3000 by default and will create the SQLite database if it does not exist.

- Start with auto-seeded sample data and CORS enabled (recommended for local development):

  ```bash
  npm run dev
  ```

  Set `SKIP_DEV_SEED=1` to start without inserting demo records.

- Start the API without the dev helper (top-tier publications and core clients are still seeded on first run for convenience). The search scheduler also boots automatically and runs once at startup to populate mentions:

  ```bash
  npm start
  ```

### Environment variables
- `PORT` – HTTP port (default: `3000`).
- `DATABASE_URL` – Path to the SQLite database file (default: `./data/mediamentions.db`).

### API surface
JSON endpoints cover CRUD for core entities plus an Excel-compatible export:

- Clients: `GET/POST /clients`, `GET/PUT/DELETE /clients/:id`
- Publications: `GET/POST /publications`, `GET/PUT/DELETE /publications/:id`
- Press releases: `GET/POST /press-releases`, `GET/PUT/DELETE /press-releases/:id`
- Media mentions: `GET/POST /media-mentions`, `GET/PUT/DELETE /media-mentions/:id`
  - Filtered listing: `GET /media-mentions?clientId=&publicationId=&pressReleaseId=&startDate=&endDate=&subject=`
- Feedback summaries: `GET/POST /feedback-summaries`, `GET/PUT/DELETE /feedback-summaries/:id`
- Search jobs: `GET/POST /search-jobs`, `GET/PUT/DELETE /search-jobs/:id`
- Excel export: `GET /clients/:id/mentions/export?publicationId=&startDate=&endDate=`

Exports return SpreadsheetML XML without external dependencies. Error responses are JSON.

## Running the scheduler
The scheduler simulates daily provider queries for each active press release and records unverified mentions.

- Run once and exit:

  ```bash
  npm run scheduler:once
  ```

- Start the cron-driven scheduler (runs immediately, then on the configured time in UTC):

  ```bash
  npm run scheduler
  ```

Scheduler configuration (defaults are in `src/config.js`):

- `SCHEDULE_TIME` – Daily run time in 24h `HH:MM` format (default: `03:00`).
- `GOOGLE_API_KEY` – Server-side API key for Google Custom Search (required for real Google lookups).
- `GOOGLE_CSE_ID` – Custom Search Engine identifier that scopes Google results (required for Google lookups).
- `BING_API_KEY`, `CUSTOM_SEARCH_KEY`, `INBOX_TOKEN` – Stub keys used by provider simulations.
- `MAX_RESULTS_PER_PROVIDER` – Cap on results fetched per provider (default: `10`).

Copy `.env.example` to `.env` and populate the Google variables to enable live Google queries. Environment files are gitignored (with `.env.example` kept for reference) so keys stay out of version control. The runtime automatically loads `.env`, so you can restart the scheduler or API after editing the file—no extra wiring is needed. The Google provider requests results from the last 24 hours using the Custom Search `dateRestrict=d1` parameter and caps results according to `MAX_RESULTS_PER_PROVIDER`.

## Frontend (`client/`)
The React SPA expects the backend routes above. During development, proxy API calls to the Node server from the Vite dev server:

```ts
// client/vite.config.ts
export default defineConfig({
  server: {
    proxy: {
      '/api': 'http://localhost:3000',
      '/clients': 'http://localhost:3000',
      '/publications': 'http://localhost:3000',
      '/media-mentions': 'http://localhost:3000',
    },
  },
});
```

Run from the `client/` directory:

```bash
npm run dev   # start Vite
npm run build # produce static assets
```

## Inspecting the SQLite database
1. Start the backend once so the database exists at `./data/mediamentions.db` (or your `DATABASE_URL`).
2. Open the file with [DB Browser for SQLite](https://sqlitebrowser.org/).
3. Browse tables such as `clients`, `publications`, `pressReleases`, `mediaMentions`, and `searchJobs`, or run ad hoc SQL queries.
