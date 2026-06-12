# SAHAYI Civic Platform

> Citizen-facing civic complaint management for Kerala, India

A production-ready Progressive Web App that allows residents to report local infrastructure issues (roads, water, electricity, street lights), track their resolution in real-time, and provide feedback — built on React + Node.js + Supabase + Firebase.

---

## Architecture Overview

```
sahayi/
├── apps/
│   ├── citizen-app/          # React PWA (Vite + Tailwind + TanStack Query)
│   └── api/                  # Node.js + Express REST API
├── packages/
│   ├── schemas/              # Shared Zod validation schemas
│   └── types/                # Shared TypeScript types
└── supabase/
    └── migrations/           # PostgreSQL schema with PostGIS + RLS
```

**Stack:**
| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite + Tailwind CSS + TanStack Query v5 |
| Auth | Firebase Authentication (Google OAuth) |
| Push notifications | Firebase Cloud Messaging (FCM) |
| Backend API | Node.js 20 + Express.js |
| Database | PostgreSQL 15 via Supabase (PostGIS for geo queries) |
| File storage | Supabase Storage |
| Maps | @vis.gl/react-google-maps |
| Deployment | Vercel (frontend) + Railway (backend) |

---

## Complaint Lifecycle

```
DRAFT → SUBMITTED → PENDING → ASSIGNED → IN_PROGRESS → RESOLVED → CLOSED
                                                ↓
                                         MORE_INFO_REQUIRED
                                                ↓
                                         (citizen uploads evidence)
                                                ↓
                                            PENDING
                                         
RESOLVED → REOPENED → PENDING (if citizen rejects resolution)
```

---

## Quick Start (Local Development)

### Prerequisites

- Node.js ≥ 20
- A [Supabase](https://supabase.com) project
- A [Firebase](https://firebase.google.com) project with Google Auth + FCM enabled
- A [Google Cloud](https://console.cloud.google.com) project with Maps + Geocoding APIs enabled

### 1. Clone and install

```bash
git clone https://github.com/your-org/sahayi.git
cd sahayi
npm install
```

### 2. Database setup (Supabase)

1. Create a new Supabase project.
2. Open the **SQL Editor** in the Supabase dashboard.
3. Run the migration file:

```bash
# Copy the migration SQL
cat supabase/migrations/001_initial_schema.sql
# Paste and run in Supabase SQL Editor
```

4. Enable **Realtime** on the `notifications` and `complaints` tables (optional, for future real-time features).

5. Create a Storage bucket named `complaint-evidence` with the following policy:

```sql
-- In Supabase SQL Editor
CREATE POLICY "allow_authenticated_upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'complaint-evidence');

CREATE POLICY "allow_owner_select"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'complaint-evidence' AND auth.uid()::text = (storage.foldername(name))[1]);
```

### 3. Firebase setup

1. Create a Firebase project at [console.firebase.google.com](https://console.firebase.google.com)
2. Enable **Authentication → Google** sign-in provider
3. Add your domain to Authorized Domains (including `localhost`)
4. Enable **Cloud Messaging** and generate a **VAPID key** (Project Settings → Cloud Messaging → Web Push certificates)
5. Download the **Service Account JSON** (Project Settings → Service accounts → Generate new private key)

### 4. Configure environment variables

**Backend** — copy and fill in:

```bash
cp apps/api/.env.example apps/api/.env
```

```env
NODE_ENV=development
PORT=3001
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
FIREBASE_SERVICE_ACCOUNT=<paste the entire JSON as a single-line string>
GOOGLE_MAPS_API_KEY=your-geocoding-api-key
ALLOWED_ORIGINS=http://localhost:5173
```

**Frontend** — copy and fill in:

```bash
cp apps/citizen-app/.env.example apps/citizen-app/.env
```

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
VITE_FIREBASE_VAPID_KEY=your-vapid-key
VITE_GOOGLE_MAPS_API_KEY=your-maps-api-key
VITE_API_URL=http://localhost:3001/api/v1
```

### 5. Run development servers

```bash
# Both frontend and backend concurrently
npm run dev

# Or individually:
npm run dev --workspace=apps/api        # API on :3001
npm run dev --workspace=apps/citizen-app # Frontend on :5173
```

Open [http://localhost:5173](http://localhost:5173)

---

## Running Tests

```bash
# All tests
npm run test

# API tests only
npm run test --workspace=apps/api

# Watch mode
npm run test:watch --workspace=apps/api
```

---

## Production Deployment

### Frontend → Vercel

1. Import the repo into [Vercel](https://vercel.com)
2. Set **Root Directory** to `apps/citizen-app`
3. Set **Framework Preset** to Vite
4. Add all `VITE_*` environment variables in Vercel project settings
5. Deploy — the `vercel.json` handles SPA routing and security headers automatically.

### Backend → Railway

1. Create a new Railway project
2. Connect your GitHub repo, select `apps/api` as the root
3. Add all environment variables (API key, Supabase, Firebase, etc.)
4. The `railway.toml` handles build and start commands automatically
5. Add a custom domain if needed and update `ALLOWED_ORIGINS`

### Update CORS after deployment

```env
# In Railway environment variables:
ALLOWED_ORIGINS=https://citizen.sahayi.in,https://sahayi-app.vercel.app
```

---

## API Reference

All endpoints require `Authorization: Bearer <firebase-id-token>` unless noted.

### Auth
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/auth/login` | Sync Firebase user, returns profile |
| GET  | `/api/v1/auth/me` | Get current user |
| PATCH| `/api/v1/auth/profile` | Update name/phone/FCM token |

### Complaints
| Method | Path | Description |
|--------|------|-------------|
| GET    | `/api/v1/complaints` | List user's complaints (filterable) |
| POST   | `/api/v1/complaints` | Create complaint or draft |
| GET    | `/api/v1/complaints/:id` | Get complaint with timeline |
| POST   | `/api/v1/complaints/:id/submit` | Submit a draft |
| POST   | `/api/v1/complaints/:id/evidence` | Upload evidence files (multipart) |
| POST   | `/api/v1/complaints/:id/reopen` | Reopen a resolved complaint |
| POST   | `/api/v1/complaints/:id/feedback` | Submit rating + close complaint |
| DELETE | `/api/v1/complaints/:id` | Delete a draft |

### Notifications
| Method | Path | Description |
|--------|------|-------------|
| GET    | `/api/v1/notifications` | List notifications (paginated) |
| PATCH  | `/api/v1/notifications/read` | Mark specific notifications read |
| PATCH  | `/api/v1/notifications/read-all` | Mark all notifications read |

### Users
| Method | Path | Description |
|--------|------|-------------|
| GET    | `/api/v1/users/me` | Get user profile |
| GET    | `/api/v1/users/stats` | Get complaint statistics |

---

## Security

- **Firebase token verification** on every protected endpoint
- **Row Level Security (RLS)** on all Supabase tables — citizens can only access their own data
- **Helmet.js** sets production-safe HTTP headers (CSP, HSTS, X-Frame-Options, etc.)
- **Rate limiting** — 100 req/15min general, 30 req/min on complaint submission
- **CORS** — strict allowlist, no wildcard origins in production
- **File validation** — MIME type + extension checked server-side before storage upload
- **Input sanitization** — all inputs validated via Zod schemas before processing
- **Service role key** never exposed to frontend — API uses Supabase service role, frontend uses anon key + RLS
- **FCM token** stripped from all API responses — stored but never returned to client

---

## Background Jobs (Cron)

| Schedule | Job |
|----------|-----|
| Daily at 02:00 | Delete DRAFT complaints older than 30 days |
| Daily at 08:00 | Flag complaints breaching 7-day SLA |

---

## Logging

Winston structured logging with these levels:
- `info` — normal operations (complaint created, status transition)
- `warn` — degraded-but-recoverable (geocoding failed, FCM error)
- `error` — unexpected failures (DB errors, auth failures)
- `http` — HTTP access log via Morgan

Status transitions are always logged with `event: "status_transition"` for audit traceability.

---

## PWA Features

- **Installable** — Add to Home Screen on Android + iOS
- **Offline shell** — App shell cached by service worker
- **Background push notifications** — via Firebase Messaging service worker
- **Responsive** — Designed mobile-first, works on all screen sizes

---

## Phase 2 Roadmap (Government-side)

Once citizen MVP is validated:
- Officer mobile app (complaint assignment, field updates, resolution proof upload)
- Department admin dashboard (SLA monitoring, bulk assignment, analytics)
- Panchayat head portal (escalation management, performance reports)
- BullMQ job queue (replace cron with robust job processing)
- Sentry error tracking integration
- Redis caching for analytics queries
