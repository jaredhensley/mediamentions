# MediaMentions

**Automated media monitoring for PR teams** - Track when and where your clients appear in the news, automatically verify mentions, and export reports for stakeholders.

## What It Does

MediaMentions solves a common problem for PR agencies: tracking media coverage across the web is time-consuming and easy to miss. This system automates the entire workflow:

1. **Discovers mentions** - Runs daily searches across Google to find articles mentioning your clients
2. **Monitors RSS feeds** - Polls priority publication feeds every 2 hours for faster detection
3. **Verifies accuracy** - Automatically checks if the client name actually appears in the article (filtering out false positives)
4. **Real-time updates** - WebSocket notifications keep the dashboard current as mentions are processed
5. **Exports reports** - One-click Excel exports for client reporting and internal reviews

### Key Features

| Feature | Description |
|---------|-------------|
| Multi-client tracking | Monitor multiple clients with customized search profiles |
| Smart verification | Uses headless browser to bypass paywalls and verify content |
| False positive filtering | Automatically rejects mentions where the client name doesn't appear |
| Listing page detection | Identifies and extracts individual articles from index/category pages |
| Rate limiting | Protects export endpoints from abuse |
| API authentication | Secure API key protection with timing-safe comparison |

## Quick Start

### Prerequisites

- Node.js 18+
- `sqlite3` CLI
- Google Custom Search API credentials ([get them here](https://console.cloud.google.com/))

### Installation

```bash
# Clone and install
git clone <repository-url>
cd mediamentions
npm install

# Install frontend dependencies
cd client && npm install && cd ..

# Configure environment
cp .env.example .env
# Edit .env with your Google API credentials
```

### Running Locally

```bash
# Start both backend and frontend in development mode
npm run dev
```

The app will be available at:
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3000

## Architecture Overview

```
mediamentions/
├── src/                    # Backend (Node.js)
│   ├── server.js           # HTTP server entry point
│   ├── config.js           # Centralized configuration
│   ├── db.js               # SQLite database layer
│   ├── routes/             # API route handlers
│   ├── services/           # Business logic
│   │   ├── searchService.js      # Search orchestration
│   │   ├── browserService.js     # Puppeteer browser management
│   │   ├── websocket.js          # Real-time notifications
│   │   └── scheduler.js          # Cron job management
│   ├── providers/          # Search provider integrations
│   ├── middleware/         # Auth, rate limiting
│   └── utils/              # Shared utilities
├── client/                 # Frontend (React + Vite + TypeScript)
├── data/                   # SQLite database storage
└── Dockerfile              # Production container config
```

## How Searches Work

### Daily Search Flow

```
Every day at 3 AM (configurable):
┌─────────────────┐
│  Load Clients   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Build Queries   │ ← Uses client search profiles
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Google Search  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Filter Results  │ ← Remove social media, old articles, blocked domains
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Save as Pending │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│    Verify       │ ← Check if client name appears in article
└─────────────────┘
```

### Verification Process

Each pending mention goes through verification:

1. **HTTP Fetch** - Try to fetch the article content directly
2. **Content Check** - Search for client name in the text
3. **Browser Fallback** - If blocked (403, Cloudflare), use Puppeteer with stealth mode
4. **Result Classification**:
   - `verified = 1` - Client name found, show in dashboard
   - `verified = 0` - Client name NOT found, mark as false positive
   - `verified = null` - Could not verify (blocked, error), needs manual review

## Configuration

### Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `GOOGLE_API_KEY` | Yes | - | Google Custom Search API key |
| `GOOGLE_CSE_ID` | Yes | - | Custom Search Engine ID |
| `API_KEY` | Production | - | API authentication key |
| `PORT` | No | 3000 | HTTP server port |
| `SCHEDULE_TIME` | No | 03:00 | Daily search time (24h format) |
| `TZ` | No | UTC | Timezone for scheduler |
| `MAX_RESULTS_PER_PROVIDER` | No | 10 | Results per search |
| `ARTICLE_AGE_DAYS` | No | 180 | Max article age to include |

See `.env.example` for the complete list with descriptions.

### Client Search Profiles

Customize how each client is searched in `src/data/clientSearchProfiles.js`:

```javascript
{
  name: 'Acme Corp',
  searchTerms: '"Acme Corp" OR "Acme Corporation"',
  contextWords: ['CEO', 'acquisition', 'partnership'],
  excludeWords: ['acme anvils'],  // Different company
  excludeDomains: ['acme.com'],   // Own website
  priorityPublications: ['forbes.com', 'techcrunch.com']
}
```

## API Reference

### Authentication

All API requests require the `X-API-Key` header (when `API_KEY` is configured):

```bash
curl -H "X-API-Key: mm_your_api_key_here" http://localhost:3000/api/clients
```

### Core Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/health` | Health check (no auth required) |
| `GET` | `/clients` | List all clients |
| `GET` | `/clients/:id/mentions` | Get mentions for a client |
| `GET` | `/clients/:id/mentions/export` | Export mentions as Excel |
| `GET` | `/publications` | List publications |
| `POST` | `/admin/verify` | Trigger manual verification |
| `POST` | `/admin/search` | Trigger manual search |

### WebSocket Events

Connect to `ws://localhost:3000` for real-time updates:

```javascript
const ws = new WebSocket('ws://localhost:3000');

ws.onmessage = (event) => {
  const { type, ...data } = JSON.parse(event.data);

  switch(type) {
    case 'verification_status':
      // { status: { phase, progress, total } }
      break;
    case 'mention_verified':
      // { mentionId, verified, reason, title }
      break;
    case 'new_mention':
      // { mention: {...} }
      break;
  }
};
```

## Development

### Available Scripts

```bash
npm run dev           # Start backend + frontend (recommended)
npm run dev:backend   # Start backend only with hot reload
npm run dev:frontend  # Start frontend only
npm start             # Production server
npm test              # Run test suite
npm run lint          # Check code style
npm run lint:fix      # Auto-fix lint issues
```

### Testing

```bash
# Run all tests
npm test

# Run specific test file
npm test -- --testPathPatterns=auth.test

# Watch mode
npm run test:watch
```

Test coverage includes:
- Route handlers (clients, mentions, exports, admin)
- Middleware (authentication, rate limiting)
- Services (search, verification, WebSocket)
- Utilities (URL validation, content analysis)

### Code Quality

The project uses:
- **ESLint** for JavaScript linting
- **Prettier** for code formatting
- **Husky** for pre-commit hooks
- **lint-staged** for staged file checks

All commits are automatically formatted and linted.

## Deployment

### Docker

```bash
# Build the image
docker build -t mediamentions \
  --build-arg VITE_API_KEY=your_api_key \
  .

# Run the container
docker run -p 3000:3000 \
  -e GOOGLE_API_KEY=xxx \
  -e GOOGLE_CSE_ID=xxx \
  -e API_KEY=xxx \
  -v mediamentions-data:/app/data \
  mediamentions
```

### Railway / Render

See `DEPLOYMENT.md` for platform-specific deployment guides.

**Important**: Configure these environment variables in your platform:
- `GOOGLE_API_KEY`
- `GOOGLE_CSE_ID`
- `API_KEY`
- `NODE_ENV=production`

## Database Schema

The SQLite database includes these main tables:

| Table | Purpose |
|-------|---------|
| `clients` | Companies being tracked |
| `publications` | Known news sources |
| `mediaMentions` | Discovered articles and verification status |
| `searchJobs` | Search run history and results |
| `deletedMentions` | Archive of removed mentions |

### Inspecting the Database

```bash
# Open with sqlite3 CLI
sqlite3 data/mediamentions.db

# Show tables
.tables

# Query recent mentions
SELECT title, link, verified FROM mediaMentions ORDER BY id DESC LIMIT 10;
```

Or use [DB Browser for SQLite](https://sqlitebrowser.org/) for a graphical interface.

## Troubleshooting

### Common Issues

**"403 Forbidden" on many verifications**
- Some sites block automated requests. The system will automatically retry with Puppeteer browser mode.
- Check the `verified = null` mentions for sites that need manual review.

**"Missing required environment variable: GOOGLE_API_KEY"**
- Copy `.env.example` to `.env` and fill in your Google API credentials.
- Don't use quotes around values in the `.env` file.

**Search not finding expected articles**
- Adjust the client's search profile in `src/data/clientSearchProfiles.js`
- Check `ARTICLE_AGE_DAYS` isn't filtering out older articles
- Verify the Google CSE is configured correctly

**High false positive rate**
- Add exclusion terms to the client's search profile
- Add blocked domains to `config.filters.blockedDomains`
- Check if competitor names are being matched

## License

MIT

---

Built with Node.js, React, SQLite, and Puppeteer.
