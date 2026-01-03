# Pastebin Lite

A secure, ephemeral pastebin application built with Next.js and Redis.

## Overview
This application allows users to share text snippets with optional expiration (TTL) and view limits. 
It meets all functional requirements including deterministic testing support and robust view counting.

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Persistence**: Hybrid (Redis, SQLite, or Memory). Defaults to SQLite if Redis not configured.

## Setup & Running

1. **Install Dependencies**

   ```bash
   npm install
   ```

2. **Configure Environment**
   - Create a `.env.local` file (optional, defaults to Memory if not present).
   - Set `REDIS_URL` to your Redis connection string for persistence.
   - Example: `REDIS_URL=redis://localhost:6379`

3. **Run Locally**

   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000).

4. **Testing**
   The application supports `TEST_MODE=1` environment variable and `x-test-now-ms` header for deterministic expiry testing.

## Design Decisions

### Persistence Layer
- **Redis**: Primary choice for production (set `REDIS_URL`).
- **SQLite**: Automatic default for local development (creates `database.sqlite`).
- **In-Memory**: Fallback if others fail.

### View Limits logic
To strictly enforce "Max Views" and prevent negative counts or over-serving:
- I use atomic operations (LUA script in Redis) to check and decrement the view counter in a single step.
- The view count is checked *before* returning the content.

### API & Validation
- **GET /p/:id** returns HTML for user consumption.
- **GET /api/pastes/:id** returns JSON for programmatic access.
- Both endpoints count as a "view".

## Repository Structure
- `src/app/api`: API Routes
- `src/lib/storage.ts`: Storage Interface
- `src/lib/redis.ts`: Redis Implementation
- `src/lib/memory.ts`: In-Memory Implementation
