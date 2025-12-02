# Mentions tracker

This repository contains a lightweight scheduler and tracking pipeline that simulates daily media monitoring for client press releases. It normalizes provider results, deduplicates by client and URL, and records unverified media mention entries while logging job metadata.

## Getting started

1. Ensure Node.js 18+ is available.
2. Install dependencies (installs `node-cron` for scheduling):

```bash
npm install
```

3. Configure schedule and API keys via environment variables (optional) and run the tracking job.

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
# Mentions

This repository hosts a lightweight Node.js HTTP server at the repository root and a React single-page application in the `client/` workspace. Use this layout to keep backend and frontend dependencies separated while sharing a single git repository.

## Backend

A Node.js server exposes CRUD APIs for clients, publications, press releases, media mentions, feedback summaries, and search jobs. Data is stored in SQLite and the database schema is created automatically when the server starts.

### Environment

Set these environment variables (or rely on defaults):

- `PORT` – Port to bind the HTTP server. Defaults to `3000`.
- `DATABASE_URL` – Path to the SQLite database file. Defaults to `./data/mediamentions.db`.

### Running locally

1. Ensure Node.js 22+ and the `sqlite3` CLI are available in your shell (both are present in the container).
2. Start the server:

   ```bash
   npm start
   ```

   The server initializes the schema on first boot.

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
