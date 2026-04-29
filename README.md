# TalentNode

AI-powered job search assistant that combines LLM reasoning with MCP (Model Context Protocol) tool integration to find and display job listings.

## Tech Stack

- **Backend**: Node.js, Express, TypeScript, Prisma + PostgreSQL
- **Frontend**: React, Vite, TypeScript
- **LLM**: OpenRouter (free models) with streaming responses
- **MCP**: Custom LinkedIn job search server (stdio transport)

## Project Structure

```
TalentNode/
├── backend/          # Express API + OpenRouter client + MCP client
├── frontend/         # React + Vite frontend
├── mcp-servers/     # Custom MCP servers (linkedin)
├── .env.template     # Env templates for backend/frontend
└── README.md
```

## Setup

### Prerequisites
- Node.js 18+
- PostgreSQL running locally
- OpenRouter API key

### Backend
```bash
cd backend
npm install
cp .env.template .env   # then add your OPENROUTER_API_KEY and DATABASE_URL
npx prisma db push
npm run dev
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

### LinkedIn MCP Server
```bash
cd mcp-servers/linkedin
npm install
npm run build
```

## Environment Variables

**backend/.env:**
```
PORT=5000
DATABASE_URL="postgresql://postgres:password@localhost:5432/talentnode"
OPENROUTER_API_KEY="sk-or-v1-..."
OPENROUTER_BASE_URL="https://openrouter.ai/api/v1"
```

**frontend/.env:**
```
VITE_API_URL=http://localhost:5000
```

## Alpha Features

- Streaming LLM responses (SSE)
- Mock LinkedIn job search via MCP (post-alpha: real data)
- Save jobs to database
- Glassmorphism UI with skeleton loaders
- Error handling (rate limits, empty results, MCP crashes)

## Post-Alpha Roadmap

- Real LinkedIn job data (API/scraping)
- User authentication
- Advanced search filters
- Job application tracking
