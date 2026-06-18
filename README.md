# Tapestry Backend

Daily vlog app backend powered by Fastify and FFmpeg.

## Quick Start

### Option 1: Standard Node.js (Dev)

1. **Install FFmpeg** (required for video processing)
   ```bash
   sudo apt-get update && sudo apt-get install -y ffmpeg
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Configure Environment**
   ```bash
   cp .env.example .env
   # Edit .env with your secrets
   ```

4. **Start the Server**
   ```bash
   npm start
   ```

### Option 2: Docker Compose (Production-like)

This option handles dependencies (like FFmpeg) and persistence automatically.

1. **Configure Environment**
   ```bash
   cp .env.example .env
   # Edit .env with your secrets
   ```

2. **Run with Docker Compose**
   ```bash
   docker compose up -d
   ```

The server will be available at `http://localhost:3000`.

## API Documentation

- **Health Check**: `GET /api/health`
- **Auth**: `POST /api/auth/register`, `POST /api/auth/login`
- **Profile**: `GET /api/users/me`
- **Clips**: `GET/POST /api/clips`, `POST /api/clips/:id/upload`
- **Vlogs**: `GET /api/vlogs/:date`, `POST /api/vlogs/:date/generate`
- **Groups**: `GET/POST /api/groups`, `POST /api/groups/:id/join`, `GET /api/groups/:id/members`, `GET /api/groups/:id/vlog/:date`

## Features

- **JWT Authentication**
- **FFmpeg Pipeline**: Auto-stitching with crossfades, background music, and timestamp captions.
- **Enhanced Scoring**: Daily scores based on capture consistency.
- **Group Vlogs**: Merged "reality show" recaps for friend groups.
- **Input Validation**: Fastify JSON schemas for all endpoints.
- **Rate Limiting & CORS**: Production-ready middleware.
