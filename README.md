# TalentNode

AI-powered job search assistant that combines LLM reasoning with MCP (Model Context Protocol) tool integration to find and display job listings from multiple platforms.

## Tech Stack

| Layer | Technology |
|-------|------------|
| Backend | Node.js, Express, TypeScript, Prisma + PostgreSQL |
| Frontend | React, Vite, TypeScript |
| LLM | OpenRouter (free models) with streaming responses |
| MCP | Custom HTTP API servers (Remotive, Adzuna) |
| Auth | JWT (bcrypt hashing) |
| Logging | Pino (structured JSON logs) |

## Project Structure

```
TalentNode/
├── backend/                # Express API server
│   ├── src/
│   │   ├── index.ts           # App entry, middleware registration
│   │   ├── openrouter.ts       # OpenRouter client (chat + stream)
│   │   ├── mcp.ts              # HTTP MCP clients (Remotive, Adzuna)
│   │   ├── middleware/
│   │   │   ├── auth.ts          # JWT auth middleware
│   │   │   ├── optionalAuth.ts  # Optional auth for chat
│   │   │   └── requestId.ts     # UUID request tracing
│   │   ├── routes/
│   │   │   ├── chat.ts         # Streaming chat + MCP orchestration
│   │   │   ├── auth.ts         # Register/Login (JWT)
│   │   │   ├── saved-jobs.ts   # Save/unsave jobs
│   │   │   └── job-interactions.ts # Favorite/like/dislike/visited
│   │   └── utils/
│   │       └── logger.ts          # Pino structured logging
│   ├── prisma/
│   │   ├── schema.prisma     # User, SavedJob, SearchHistory, SearchResult, JobInteraction
│   │   └── .env              # Env vars (DATABASE_URL, OPENROUTER_API_KEY, JWT_SECRET)
│   └── package.json
│
├── frontend/               # React + Vite SPA
│   ├── src/
│   │   ├── App.tsx            # Main app (auth state, chat flow)
│   │   ├── api.ts             # API client (chat, auth, interactions)
│   │   ├── components/
│   │   │   ├── Login.tsx         # Login/Register form
│   │   │   ├── ChatInput.tsx     # Message input
│   │   │   ├── MessageList.tsx   # Chat messages + job cards
│   │   │   ├── JobCard.tsx       # Job card with platform badge + interaction buttons
│   │   │   └── SkeletonLoader.tsx # Glassmorphism loading state
│   │   └── App.css            # Styles (glassmorphism, badges, auth UI)
│   ├── .env                  # VITE_API_URL
│   └── package.json
│
├── mcp-servers/
│   ├── remotive/             # Remotive MCP (HTTP API)
│   │   └── src/index.ts     # Express server exposing /tools/call
│   └── adzuna/              # Adzuna MCP (HTTP API)
│       ├── .env             # ADZUNA_APP_ID, ADZUNA_APP_KEY
│       └── src/index.ts     # Express server exposing /tools/call
│
├── .gitignore              # Excludes node_modules, .env, dist, PLAN.md, etc.
├── PLAN.md                # Detailed phase-by-phase build log
└── README.md              # This file
```

## Features

### Phase 1-6: Alpha Core ✅
- [x] Project skeleton (Git, Express, React/Vite, TypeScript strict)
- [x] PostgreSQL + Prisma (User, SavedJob, SearchHistory, SearchResult, JobInteraction)
- [x] OpenRouter API client (direct fetch, streaming SSE)
- [x] Chat route with LLM + MCP tool orchestration
- [x] Glassmorphism UI with skeleton loaders
- [x] Error handling (rate limits, empty results, MCP crashes)
- [x] Streaming LLM responses (tokens stream in real-time)
- [x] Start script (`start-alpha.bat`)

### Phase 7: Multi-Platform Job Search ✅
- [x] **Remotive MCP server** — free remote jobs API (no key, HTTP transport)
- [x] **Adzuna MCP server** — free India jobs API (needs free API key, HTTP transport)
- [x] Backend queries both platforms simultaneously via HTTP
- [x] Frontend shows platform badge (green=Remotive, yellow=Adzuna)
- [x] No duplicate rendering (LLM gives 1-2 sentence response, jobs render as cards)

### Phase 8: Authentication + Data Optimization ✅
- [x] **JWT Auth** — Register/Login routes with bcrypt hashing
- [x] **Auth middleware** — protected routes (saved-jobs) + optional auth (chat)
- [x] **Frontend auth** — Login/Register UI, JWT in localStorage
- [x] **JobInteraction table** — favorite, liked, disliked, visited flags
- [x] **SearchResult child table** — normalized job data (replaced JSON blob)
- [x] **JobCard interaction buttons** — toggle favorite/like/dislike/visited
- [x] **Structured logging** — Pino with requestId tracing, timing metrics

## Database Schema

```prisma
model User {
  id        String   @id @default(cuid())
  email     String   @unique
  password  String   // bcrypt hash
  name      String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  savedJobs       SavedJob[]
  searchHistory   SearchHistory[]
  jobInteractions JobInteraction[]
}

model SavedJob {
  id          String   @id @default(cuid())
  userId      String
  jobData     Json
  source      String   // "remotive" | "adzuna"
  externalId  String
  title       String
  company     String
  location    String?
  savedAt     DateTime @default(now())
  user         User @relation(fields: [userId], references: [id], onDelete: Cascade)
  jobInteractions JobInteraction[]
  @@unique([userId, externalId, source])
}

model SearchHistory {
  id        String   @id @default(cuid())
  userId    String?
  query     String
  filters   Json?
  createdAt DateTime @default(now())
  user         User?        @relation(fields: [userId], references: [id], onDelete: SetNull)
  searchResults SearchResult[]
}

model SearchResult {
  id          String   @id @default(cuid())
  searchId    String
  jobId       String
  source      String
  title       String
  company     String
  location    String?
  url         String?
  postedAt    String?
  searchHistory SearchHistory @relation(fields: [searchId], references: [id], onDelete: Cascade)
}

model JobInteraction {
  id          String   @id @default(cuid())
  userId      String
  jobId       String
  source      String
  type        String   // "favorite" | "liked" | "disliked" | "visited"
  createdAt   DateTime @default(now())
  user         User @relation(fields: [userId], references: [id], onDelete: Cascade)
  @@unique([userId, jobId, source, type])
}
```

## Setup

### Prerequisites
- Node.js 18+
- PostgreSQL running locally
- OpenRouter API key (free tier works)
- Adzuna API key (free at [developer.adzuna.com](https://developer.adzuna.com/))

### Backend
```bash
cd backend
npm install
cp .env.template .env   # then add: DATABASE_URL, OPENROUTER_API_KEY, JWT_SECRET
npx prisma db push
npm run dev          # starts at http://localhost:5000
```

**Required backend/.env:**
```
PORT=5000
DATABASE_URL="postgresql://postgres:password@localhost:5432/talentnode"
OPENROUTER_API_KEY="sk-or-v1-..."
OPENROUTER_BASE_URL="https://openrouter.ai/api/v1"
JWT_SECRET="your-random-secret-string"
REMOTIVE_URL="http://localhost:3002"   # local MCP
ADZUNA_URL="http://localhost:3001"      # local MCP
```

### Frontend
```bash
cd frontend
npm install
cp .env.template .env   # then set VITE_API_URL
npm run dev                 # starts at http://localhost:5173
```

**Required frontend/.env:**
```
VITE_API_URL=http://localhost:5000
```

### MCP Servers (for local dev)
```bash
# Remotive (port 3002)
cd mcp-servers/remotive && npm install && npm run build && node dist/index.js

# Adzuna (port 3001)
cd mcp-servers/adzuna
cp .env.template .env   # add ADZUNA_APP_ID, ADZUNA_APP_KEY
npm install && npm run build && node dist/index.js
```

**Get Adzuna credentials:**
- Sign up at https://developer.adzuna.com/
- Your App ID: `40790798`
- Your API Key: `8929ffaf073136b703120eb59055b5c2`

## API Endpoints

### Auth
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/auth/register` | Register new user | None |
| POST | `/api/auth/login` | Login, returns JWT | None |

### Chat (streaming SSE)
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/chat` | Streaming chat + job search | Optional |

**Request:**
```json
{
  "messages": [
    { "role": "user", "content": "find me react developer jobs" }
  ]
}
```

**Response (SSE stream):**
```
data: {"token": "I found"}
data: {"token": " several jobs"}
...
data: {"done": true, "jobs": [...]}
```

### Saved Jobs
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/saved-jobs` | List saved jobs | Required |
| POST | `/api/saved-jobs` | Save a job | Required |
| DELETE | `/api/saved-jobs/:id` | Unsave a job | Required |

### Job Interactions
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/job-interactions?jobId=...` | Get interactions for a job | Required |
| POST | `/api/job-interactions` | Toggle favorite/like/disliked/visited | Required |

## Request Flow

```
User → Frontend (React)
         ↓
     POST /api/chat (with JWT if logged in)
         ↓
     Backend (Express + optionalAuth)
         ↓
     ┌─────────────┐
     │ OpenRouter LLM │ ← streaming SSE
     └─────────────┘
         ↓ (if job query)
     ┌────────────────┐  ┌────────────────┐
     │ Remotive MCP  │  │  Adzuna MCP  │ (HTTP calls)
     └────────────────┘  └────────────────┘
         ↓
     Merge results + normalize
         ↓
     Save SearchHistory + SearchResult (if authenticated)
         ↓
     Stream response to frontend (tokens + jobs payload)
         ↓
     Frontend renders: chat message + JobCards with badges + interaction buttons
```

## Logging

Structured JSON logs via **Pino**:
- Every request gets a `requestId` (UUID prefix)
- Log levels: `debug` (dev), `info` (prod)
- Timing metrics: LLM latency, MCP latency, total request time
- Stages logged: `CHAT_ROUTE`, `LLM_REQUEST`, `LLM_RESPONSE`, `LLM_STREAM`, `MCP_REMOTIVE`, `MCP_ADZUNA`

**Example log:**
```json
{
  "level": 30,
  "requestId": "a1b2c3",
  "stage": "LLM_RESPONSE",
  "model": "meta-llama/llama-3.1-8b-instruct:free",
  "duration": 2340,
  "hasContent": true,
  "toolCalls": ["search_remotive_jobs", "search_adzuna_jobs"],
  "timestamp": "2026-05-02T..."
}
```

## Deployment (Render)

### 1. Push to GitHub
```bash
cd "C:\Users\krama\Downloads\Cohort-projects\TalentNode"
git add .
git commit -m "feat: complete alpha - auth, multi-platform, logging"
git push origin main
```

### 2. Render Services
| Service | Type | Root Directory | Build | Start |
|---------|------|---------------|-------|-------|
| talentnode-db | PostgreSQL | — | — | — |
| talentnode-backend | Web Service | `backend` | `npm install && npm run build` | `node dist/index.js` |
| talentnode-frontend | Static Site | `frontend` | `npm install && npm run build` | — (publish: `dist`) |
| talentnode-remotive | Web Service | `mcp-servers/remotive` | `npm install && npm run build` | `node dist/index.js` |
| talentnode-adzuna | Web Service | `mcp-servers/adzuna` | `npm install && npm run build` | `node dist/index.js` |

### 3. Environment Variables
- **Backend**: `DATABASE_URL` (from DB), `OPENROUTER_API_KEY`, `JWT_SECRET`, `REMOTIVE_URL`, `ADZUNA_URL`
- **Frontend**: `VITE_API_URL=https://talentnode-backend.onrender.com`

## Post-Alpha Roadmap

- [ ] Real LinkedIn job data (API or scraping)
- [ ] User profile + resume upload
- [ ] Advanced search filters (salary, experience, industry)
- [ ] Job application tracking (applied, interviewing, rejected)
- [ ] Email alerts for new matching jobs
- [ ] Mobile responsive design
- [ ] Render production deployment (all services live)

## License

MIT
