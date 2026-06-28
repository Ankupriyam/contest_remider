# Contest Reminder

Automatically sync competitive programming contests from **LeetCode**, **Codeforces**, **CodeChef**, and **AtCoder** to your **Google Calendar** with customizable reminders.

## Features

- Google OAuth sign-in with Calendar permissions
- Platform selection (enable/disable per platform)
- Global reminder time (5, 10, 15, 30, 60 minutes)
- Automatic contest discovery every 15 minutes
- Automatic Google Calendar event creation and updates
- Encrypted storage of OAuth refresh tokens
- Structured logging and API rate limiting

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | TanStack Start, React 19, TypeScript, Tailwind CSS |
| Backend | TanStack Start server routes (Nitro / Node.js) |
| Database | MongoDB Atlas + Mongoose |
| Auth | Google OAuth 2.0 + signed HTTP-only session cookies |
| Scheduler | node-cron (every 15 minutes) |
| Calendar | Google Calendar API (googleapis) |
| Contests | CLIST API (preferred) + platform fallbacks |

> **Note:** The frontend was built with TanStack Start (Lovable template). Backend APIs are implemented as TanStack Start server routes under `src/routes/api/`, which is equivalent to Next.js Route Handlers.

## Project Structure

```
src/
  routes/
    api/              # REST API endpoints
    dashboard.tsx     # Dashboard UI (connected to APIs)
    index.tsx         # Login page
  lib/
    server/           # Auth, DB, contest fetch, calendar sync
    api/client.ts     # Frontend API client
  models/             # Mongoose models (User, Contest, CalendarEvent)
  types/              # Shared TypeScript types
server/
  plugins/cron.ts     # Background scheduler
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/auth/signin/google` | Start Google OAuth flow |
| GET | `/api/auth/callback/google` | OAuth callback |
| GET | `/api/auth/session` | Current session |
| POST | `/api/auth/signout` | Sign out |
| GET | `/api/user` | Get user profile |
| PUT | `/api/user/preferences` | Update platforms & reminder |
| GET | `/api/contests` | Upcoming contests for user |
| POST | `/api/calendar/sync` | Manual calendar sync |
| GET | `/api/health` | Health check |

## Getting Started

### 1. Prerequisites

- Node.js 20+
- MongoDB Atlas cluster
- Google Cloud project with OAuth credentials

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment

Copy the example env file and fill in your values:

```bash
cp .env.example .env
```

Generate secrets:

```bash
# 32-byte hex key for token encryption
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Session signing secret (use a long random string)
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

### 4. Google OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create or select a project
3. Enable **Google Calendar API**:
   - APIs & Services → Library → search "Google Calendar API" → Enable
4. Configure OAuth consent screen:
   - APIs & Services → OAuth consent screen
   - User type: External (or Internal for workspace)
   - Add scopes:
     - `openid`
     - `email`
     - `profile`
     - `https://www.googleapis.com/auth/calendar.events`
5. Create OAuth client:
   - APIs & Services → Credentials → Create Credentials → OAuth client ID
   - Application type: **Web application**
   - Authorized redirect URIs:
     - `http://localhost:8080/api/auth/callback/google` (local)
     - `https://your-domain.com/api/auth/callback/google` (production)
6. Copy **Client ID** and **Client Secret** to `.env`

### 5. Google Calendar API

The Calendar API is enabled in the same Google Cloud project (step 4.3). No separate API key is required for user-delegated OAuth flows — the app uses each user's OAuth tokens to create events in their primary calendar.

### 6. MongoDB Atlas

1. Create a free cluster at [MongoDB Atlas](https://www.mongodb.com/atlas)
2. Database Access → Add a database user
3. Network Access → Allow your IP (or `0.0.0.0/0` for cloud deployment)
4. Connect → Drivers → copy the connection string
5. Set `MONGODB_URI` in `.env`

### 7. Optional: CLIST API

CLIST aggregates contests from all supported platforms.

1. Register at [clist.by](https://clist.by/)
2. Get your username and API key from your profile
3. Set `CLIST_USERNAME` and `CLIST_API_KEY` in `.env`

If CLIST is not configured, the app falls back to individual platform APIs.

### 8. Run locally

```bash
npm run dev
```

Open [http://localhost:8080](http://localhost:8080).

For production-like local runs:

```bash
npm run build
npm start
```

## Deployment

### Architecture

- **Frontend + API:** Vercel or Render (Node.js server)
- **Database:** MongoDB Atlas
- **Scheduler:** Runs inside the Node.js process via node-cron

### Vercel

1. Push to GitHub and import in Vercel
2. Set all environment variables from `.env.example`
3. Set `APP_URL` to your Vercel domain (e.g. `https://contest-reminder.vercel.app`)
4. Update Google OAuth redirect URI to match
5. Deploy

> Vercel serverless functions may not keep cron running continuously. For reliable 15-minute sync, use Render or a dedicated Node.js host.

### Render

1. Create a **Web Service** connected to your repo
2. Build command: `npm run build`
3. Start command: `npm start`
4. Set environment variables
5. Set `APP_URL` to your Render URL (e.g. `https://contest-reminder.onrender.com`)
6. Keep `ENABLE_CRON=true` for background sync

### MongoDB Atlas (production)

- Use a dedicated database user with least privilege
- Restrict network access to your deployment IPs where possible
- Enable backup and monitoring

## Security

- OAuth refresh tokens are **AES-256-GCM encrypted** before storage
- Access tokens are encrypted and auto-refreshed
- Tokens are never sent to the frontend
- Session cookies are HTTP-only and signed with `AUTH_SECRET`
- API routes are rate-limited per IP
- All configuration via environment variables

## Data Models

### User
`googleId`, `name`, `email`, `image`, encrypted `refreshToken` / `accessToken`, `tokenExpiry`, `reminderMinutes`, `selectedPlatforms[]`

### Contest
`contestId`, `platform`, `title`, `startTime`, `endTime`, `url`

### CalendarEvent
`userId`, `contestId`, `googleEventId`, `status` — unique per user + contest

## Logging

Structured JSON logs include:

- User login
- Contest fetch (created/updated counts)
- Calendar event create/update
- Cron execution start/end
- Errors (OAuth, Calendar API, contest fetch)

## Troubleshooting

| Issue | Fix |
|-------|-----|
| OAuth redirect mismatch | Ensure `APP_URL` and Google redirect URI match exactly |
| No contests showing | Enable platforms on dashboard; wait for cron or call `POST /api/calendar/sync` |
| Calendar events not created | Re-login to refresh Google Calendar scope consent |
| `Invalid environment configuration` | Check all required `.env` variables are set |
| Cron not running locally | Set `ENABLE_CRON=true` and use `npm start` (not just Vite dev) |

## License

Private project.
