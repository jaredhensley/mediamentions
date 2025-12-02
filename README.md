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
