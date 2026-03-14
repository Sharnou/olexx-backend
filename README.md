# OLEXX Backend

Small HTTP backend for classifieds-style listings with an in-memory search index and optional integrations (Elasticsearch, RabbitMQ workers, AWS S3 presigned uploads).

## Requirements
- Node.js 18+
- Optional services depending on features you enable:
  - Elasticsearch (set `USE_ES=true`)
  - RabbitMQ (set `USE_RABBIT=true` for MQ + `worker-image.js`)
  - AWS S3 credentials (set `USE_AWS_PRESIGN=true` for presigned uploads)

## Quick start
1) Install deps: `npm install`
2) Create a `.env` from `.env.example` and fill values.
3) Ensure `data-index.json` exists (create an empty file `[]` if first run).
4) Run the API: `npm start` (or `npm run dev` with nodemon). Default port is `3000`.
5) Visit health check: `GET /health`

## Available scripts
- `npm start` — run HTTP server (`server.js`).
- `npm run dev` — same with nodemon reload.
- `npm test` — run the lightweight classifier/search sanity script.

## Environment variables
See `.env.example` for all supported variables. Key ones:
- `PORT` — HTTP port (default `3000`)
- `SUPER_ADMIN_EMAIL` — required for admin-only endpoints
- `USE_ES`, `ES_HOST`, `ES_INDEX` — enable/search with Elasticsearch
- `USE_RABBIT`, `RABBIT_URL` — enable MQ + workers
- `USE_AWS_PRESIGN`, `AWS_REGION`, `S3_BUCKET`, `S3_UPLOAD_BASE`, `S3_CDN_BASE` — enable S3 presign + URLs

## Data persistence
The in-memory search adapter persists listings to `data-index.json` on shutdown and load. When starting fresh, create the file with an empty array (`[]`). Add `data-index.json` to your `.gitignore` (already default) to avoid committing runtime data.

## Notes
- `SUPER_ADMIN_EMAIL` should be set via env, not hardcoded for production.
- Observability is minimal; consider adding structured logging and metrics if you deploy beyond local use.
