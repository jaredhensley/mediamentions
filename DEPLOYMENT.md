# Deploying MediaMentions to Render

This guide walks you through deploying MediaMentions to Render with Docker support for Puppeteer-based verification.

## Prerequisites

1. A GitHub account with this repo pushed to it
2. A Render account (free tier works for testing)
3. Google Custom Search API credentials (GOOGLE_API_KEY and GOOGLE_CSE_ID)

## Step 1: Push Code to GitHub

First, make sure all your changes are committed and pushed:

```bash
git add .
git commit -m "Add Render deployment configuration"
git push origin main
```

## Step 2: Create a Render Account

1. Go to [render.com](https://render.com)
2. Sign up with your GitHub account (recommended for easy repo access)

## Step 3: Create a New Web Service

1. From the Render dashboard, click **New +** > **Web Service**
2. Connect your GitHub account if not already connected
3. Select your `mediamentions` repository
4. Configure the service:

| Setting | Value |
|---------|-------|
| Name | `mediamentions` (or your preferred name) |
| Region | Oregon (or closest to you) |
| Branch | `main` |
| Runtime | Docker |
| Instance Type | Starter ($7/month) or Free (with limitations) |

## Step 4: Add a Persistent Disk

The SQLite database needs persistent storage:

1. Scroll down to **Disks**
2. Click **Add Disk**
3. Configure:
   - Name: `mediamentions-data`
   - Mount Path: `/app/data`
   - Size: 1 GB (plenty for SQLite)

## Step 5: Configure Environment Variables

In the **Environment** section, add these variables:

### Required Variables

| Key | Value |
|-----|-------|
| `NODE_ENV` | `production` |
| `DATABASE_URL` | `/app/data/mediamentions.db` |
| `GOOGLE_API_KEY` | Your Google API key |
| `GOOGLE_CSE_ID` | Your Google Custom Search Engine ID |
| `API_KEY` | Generate with: `node -e "console.log('mm_' + require('crypto').randomBytes(32).toString('hex'))"` |

### Optional Variables

| Key | Value | Description |
|-----|-------|-------------|
| `CORS_ORIGIN` | `*` | Set to your Render URL after deploy for security |
| `SCHEDULE_TIME` | `03:00` | Daily search time (24h format) |
| `TZ` | `America/New_York` | Timezone |
| `LOG_LEVEL` | `info` | Logging level |

## Step 6: Deploy

1. Click **Create Web Service**
2. Wait for the build to complete (first build takes ~5-10 minutes)
3. Once deployed, you'll get a URL like `https://mediamentions-xxxx.onrender.com`

## Step 7: Update CORS (Optional but Recommended)

After your first deploy, update `CORS_ORIGIN` to your Render URL:

1. Go to your service's **Environment** tab
2. Change `CORS_ORIGIN` from `*` to `https://mediamentions-xxxx.onrender.com`
3. Save changes (triggers a redeploy)

## Step 8: Configure Client

The client needs your API key to communicate with the backend. Since both are on the same origin in production, you only need to set the API key.

**Note:** The API key is visible in the browser. For a production app with multiple users, you'd want proper user authentication. For personal/internal use, this is fine.

## Accessing Your App

- **Web Interface:** `https://your-app.onrender.com`
- **API Health Check:** `https://your-app.onrender.com/api/health`

## Troubleshooting

### Build Fails

Check the build logs in Render. Common issues:
- Missing dependencies: Make sure `package-lock.json` is committed
- Docker issues: The Dockerfile installs Chromium for Puppeteer

### App Crashes on Start

Check the runtime logs. Common issues:
- Missing environment variables (especially GOOGLE_API_KEY, GOOGLE_CSE_ID)
- Database path issues: Ensure DATABASE_URL is set to `/app/data/mediamentions.db`

### WebSocket Connection Failed

If real-time updates aren't working:
- The app automatically uses WSS in production
- Check browser console for WebSocket errors
- Render supports WebSockets on all plans

### Database Not Persisting

Make sure you added a persistent disk:
- Mount path must be `/app/data`
- DATABASE_URL must point to a file in that directory

## Upgrading

To deploy updates:

```bash
git add .
git commit -m "Your changes"
git push origin main
```

Render automatically rebuilds when you push to the connected branch.

## Cost Estimate

- **Starter Plan:** $7/month (recommended for testing)
- **Persistent Disk:** Included in first 1GB
- **Free Plan:** Available but has cold starts (30 sec delay after inactivity)

## Alternative: Manual Deployment

If you prefer not to use the automatic Docker detection:

1. Use the `render.yaml` file as a Blueprint
2. Go to Render Dashboard > **Blueprints**
3. Connect your repo and Render will read the config

---

Need help? Check the [Render Docs](https://docs.render.com) or open an issue.
