# mentions

This repository hosts the backend service at the repository root and a React single-page application in the `client/` workspace. Use this layout to keep backend and frontend dependencies separated while sharing a single git repository.

## Repository structure
- **Backend (root):** API/server code lives at the repository root. Follow the backend's own README or docs for detailed setup, environment variables, and run/test commands.
- **Frontend (`client/`):** React + Vite app built with TypeScript and MUI.

## Backend quick start (reference)
If the backend provides a setup guide, prefer that. Typical steps:
1. Install backend dependencies (e.g., `npm install`, `pnpm install`, or language-specific tooling).
2. Configure environment variables (e.g., `.env` files) for database/API credentials.
3. Start the API server (commonly `npm run start` or `npm run dev`).

## Frontend quick start
1. `cd client`
2. Install dependencies: `npm install`
3. Run the dev server: `npm run dev`
4. Build for production: `npm run build`

The client assumes the backend exposes endpoints for mentions, press releases, publications, and an Excel export for client mentions. Update the frontend environment variables or request URLs as needed to match the backend.
