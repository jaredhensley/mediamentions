# Mentions tracker

This repository contains a lightweight scheduler and tracking pipeline that simulates daily media monitoring for client press releases. It normalizes provider results, deduplicates by client and URL, and records unverified media mention entries while logging job metadata.

## Getting started

1. Ensure Node.js 18+ is available.
2. Install dependencies (installs `node-cron` for scheduling):

```bash
npm install
```

3. Configure schedule and API keys via environment variables (optional) and run the tracking job.

> Note: when you start the backend locally, a `.env` file is generated automatically from `.env.example` (respecting any
> environment variables you already exported) so you don't have to manually create one for development.

### Configuration

| Variable | Purpose | Default |
| --- | --- | --- |
| `SCHEDULE_TIME` | Daily run time in 24h `HH:MM` format | `03:00` |
| `GOOGLE_API_KEY` | Stub Google search key | `demo-google-key` |
| `BING_API_KEY` | Stub Bing search key | `demo-bing-key` |
| `CUSTOM_SEARCH_KEY` | Stub custom API key | `demo-custom-key` |
| `INBOX_TOKEN` | Stub inbox token | `demo-inbox-token` |
| `MAX_RESULTS_PER_PROVIDER` | Cap on results fetched per provider | `10` |

### Running the tracker

Run a single tracking job:

```bash
npm run start:once
```

Start the scheduler (runs immediately and then at the configured daily time using a cron expression in UTC):

```bash
npm start
```

Provider errors are logged on the job record but do not stop the pipeline from querying subsequent sources.

## End-to-end local example (DB + backend + UI)

The UI renders data that comes from the backend APIs. Use the following concrete steps to make sure SQLite, the Node server, and the Vite app talk to each other:

1. **Install dependencies**
   - From the repo root (backend): `npm install`
   - From `client/` (frontend): `cd client && npm install`
2. **Configure the backend**
   - Start the API server from the repo root. It will create the SQLite file and schema if missing, and will also create a
     `.env` (if one doesn't exist) that prefers any existing environment variables and falls back to `.env.example` defaults:
     ```bash
     npm start
     ```
3. **Seed a bit of data so the UI has something to render**
   - The backend now auto-seeds three real media mentions for "Acme Robotics" the first time it finds an empty database in
     development. You can add more via the running API if you like:
     ```bash
     curl -X POST http://localhost:3000/clients \
       -H 'Content-Type: application/json' \
       -d '{"name":"Example Client","contactEmail":"press@example.com"}'

     curl -X POST http://localhost:3000/publications \
       -H 'Content-Type: application/json' \
       -d '{"name":"Tech Daily","website":"https://techdaily.example","clientId":1}'

     curl -X POST http://localhost:3000/media-mentions \
       -H 'Content-Type: application/json' \
       -d '{"title":"Launch coverage","subjectMatter":"Product","mentionDate":"2024-05-01","link":"https://techdaily.example/launch","clientId":1,"publicationId":1}'
     ```
4. **Proxy frontend API calls to the backend during development**
   - Add a dev proxy to `client/vite.config.ts` so `/api` calls from the browser go to the Node server when running `npm run dev`:
     ```ts
     import { defineConfig } from 'vite';
     import react from '@vitejs/plugin-react';

     export default defineConfig({
       plugins: [react()],
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
   - Restart the Vite dev server after saving the proxy settings: `cd client && npm run dev`
5. **Open the app**
   - Visit the Vite dev URL (default `http://localhost:5173`). The “Clients” page can now add mentions locally and the “Export” button will hit the backend because `/api/clients/:id/mentions/export` is forwarded through the proxy.

If you prefer to avoid a proxy, you can also run `npm run build` in `client/` and serve the static `client/dist` output from any web server that forwards `/api` requests to the Node process on port 3000.
# Mentions

This repository hosts a lightweight Node.js HTTP server at the repository root and a React single-page application in the `client/` workspace. Use this layout to keep backend and frontend dependencies separated while sharing a single git repository.

## Backend

A Node.js server exposes CRUD APIs for clients, publications, press releases, media mentions, feedback summaries, and search jobs. Data is stored in SQLite and the database schema is created automatically when the server starts.

### Environment

Set these environment variables (or rely on defaults):

- `PORT` – Port to bind the HTTP server. Defaults to `3000`.
- `DATABASE_URL` – Path to the SQLite database file. Defaults to `./data/mediamentions.db`.

> The server automatically copies `.env.example` to `.env` on first boot (merging in any variables you've already exported) so
> local development works without manual configuration.

### Running locally

1. Ensure Node.js 22+ and the `sqlite3` CLI are available in your shell (both are present in the container).
2. Start the server:

   ```bash
   npm start
   ```

   The server initializes the schema on first boot.
3. Development seeding: when `NODE_ENV` is anything other than `production` (the default when you run `npm start`), the server
   seeds the database with real media mentions for "Acme Robotics" the first time it finds an empty database. Set
   `AUTO_SEED=false` to skip this behavior or point `DATABASE_URL` at a separate file if you want a clean database.

### API overview

All endpoints accept and respond with JSON, except for the Excel export which returns an Excel-compatible XML file.

- **Clients:** `GET/POST /clients`, `GET/PUT/DELETE /clients/:id`
- **Publications:** `GET/POST /publications`, `GET/PUT/DELETE /publications/:id`
- **Press releases:** `GET/POST /press-releases`, `GET/PUT/DELETE /press-releases/:id`
- **Media mentions:** `GET/POST /media-mentions`, `GET/PUT/DELETE /media-mentions/:id`
  - Filtered listing: `GET /media-mentions?clientId=&publicationId=&pressReleaseId=&startDate=&endDate=&subject=`
- **Feedback summaries:** `GET/POST /feedback-summaries`, `GET/PUT/DELETE /feedback-summaries/:id`
- **Search jobs:** `GET/POST /search-jobs`, `GET/PUT/DELETE /search-jobs/:id`
- **Excel export:** `GET /clients/:id/mentions/export?publicationId=&startDate=&endDate=`

### Notes

- An Excel-compatible XML export is generated without external dependencies. It includes the columns Date, Publication, Title, Subject Matter, Re-Mention Date, and Link for the filtered client mentions.
- Because the app uses the SQLite CLI directly, no third-party Node packages are required to run the backend.

## Frontend (`client/`)

The React + Vite app is built with TypeScript and MUI.

### Frontend quick start

1. `cd client`
2. Install dependencies: `npm install`
3. Run the dev server: `npm run dev`
4. Build for production: `npm run build`

The client assumes the backend exposes the endpoints above, including the Excel export for client mentions. Update the frontend environment variables or request URLs as needed to match the backend.
