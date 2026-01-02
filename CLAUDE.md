# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

MediaMentions is an automated media monitoring system for PR teams. It discovers, verifies, and tracks media mentions of clients across the web using Google Custom Search and RSS feeds.

## Common Commands

```bash
# Development (runs backend + frontend concurrently)
npm run dev

# Backend only with hot reload
npm run dev:backend

# Run all tests
npm test

# Run specific test file
npm test -- --testPathPattern=auth.test

# Linting and formatting
npm run lint
npm run lint:fix
npm run format
npm run format:check

# Production server
npm start
```

Frontend (in `/client`):
```bash
npm run dev      # Vite dev server
npm run build    # TypeScript + Vite build
npm run lint
```

## Architecture

### Backend (Node.js, CommonJS)

**No framework** - uses raw `http.createServer` with custom routing in `src/routes/index.js`. Routes are matched via `matchRoute()` in `src/utils/http.js`.

**Database**: SQLite accessed via `sqlite3` CLI (not a Node library). Queries use `@p0, @p1` parameter placeholders. See `src/db.js` for `runQuery()` and `runExecute()`.

**Key services**:
- `searchService.js` - Orchestrates Google searches for each client
- `browserService.js` - Puppeteer with stealth plugin for sites that block direct HTTP
- `websocket.js` - Real-time updates to frontend during verification
- `scheduler.js` - Cron jobs for daily search (3 AM) and RSS polling (every 2 hours)
- `verificationHelper.js` - Checks if client name actually appears in article content

**Verification flow**: HTTP fetch first, browser fallback on 403/503/Cloudflare. Results are `verified=1` (found), `verified=0` (false positive), or `verified=null` (needs manual review).

### Frontend (React + TypeScript + Vite)

Located in `/client`. Uses MUI components and Nivo for charts. Connects to backend WebSocket for live updates.

### Data Flow

1. `scheduler.js` triggers daily/RSS searches
2. `searchService.js` builds queries from client profiles in `src/data/clientSearchProfiles.js`
3. Results saved as `status='new'` mentions
4. `verifyMentions.js` processes pending mentions
5. WebSocket broadcasts `verification_status`, `mention_verified`, `new_mention` events

## Key Files

- `src/config.js` - Centralized config, reads from env vars
- `src/db.js` - All database operations (runQuery/runExecute)
- `src/routes/index.js` - Route registry
- `src/data/clientSearchProfiles.js` - Per-client search customization
- `src/scripts/verifyMentions.js` - Main verification script

## Database

SQLite at `data/mediamentions.db`. Core tables:
- `clients` - Companies being tracked
- `mediaMentions` - Articles with `verified` status (1/0/null)
- `publications` - News sources
- `searchJobs` - Search run history

Inspect with: `sqlite3 data/mediamentions.db`

## Testing

Jest for backend tests. Test files are co-located with source (`*.test.js`). Tests cover routes, middleware, services, and utilities.

## Environment

Required: `GOOGLE_API_KEY`, `GOOGLE_CSE_ID`
Required in production: `API_KEY` (for auth)

Copy `.env.example` to `.env` for local development.
