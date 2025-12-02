# Mentions backend

A lightweight Node.js HTTP server that exposes CRUD APIs for tracking clients, publications, press releases, media mentions, feedback summaries, and search jobs. Data is stored in SQLite and the database schema is created automatically when the server starts.

## Environment

Set these environment variables (or rely on defaults):

- `PORT` – Port to bind the HTTP server. Defaults to `3000`.
- `DATABASE_URL` – Path to the SQLite database file. Defaults to `./data/mediamentions.db`.

## Running locally

1. Ensure Node.js 22+ and the `sqlite3` CLI are available in your shell (both are present in the container).
2. Start the server:

   ```bash
   npm start
   ```

   The server initializes the schema on first boot.

## API overview

All endpoints accept and respond with JSON, except for the Excel export which returns an Excel-compatible XML file.

- **Clients:** `GET/POST /clients`, `GET/PUT/DELETE /clients/:id`
- **Publications:** `GET/POST /publications`, `GET/PUT/DELETE /publications/:id`
- **Press releases:** `GET/POST /press-releases`, `GET/PUT/DELETE /press-releases/:id`
- **Media mentions:** `GET/POST /media-mentions`, `GET/PUT/DELETE /media-mentions/:id`
  - Filtered listing: `GET /media-mentions?clientId=&publicationId=&pressReleaseId=&startDate=&endDate=&subject=`
- **Feedback summaries:** `GET/POST /feedback-summaries`, `GET/PUT/DELETE /feedback-summaries/:id`
- **Search jobs:** `GET/POST /search-jobs`, `GET/PUT/DELETE /search-jobs/:id`
- **Excel export:** `GET /clients/:id/mentions/export?publicationId=&startDate=&endDate=`

## Notes

- An Excel-compatible XML export is generated without external dependencies. It includes the columns Date, Publication, Title, Subject Matter, Re-Mention Date, and Link for the filtered client mentions.
- Because the app uses the SQLite CLI directly, no third-party Node packages are required to run the backend.
