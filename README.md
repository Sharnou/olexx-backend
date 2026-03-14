# OLEXX Backend

Small HTTP backend for classifieds-style listings with an in-memory search index and optional integrations (Elasticsearch, RabbitMQ workers, AWS S3 presigned uploads).

![CI](https://github.com/Sharnou/olexx-backend/actions/workflows/ci.yml/badge.svg?branch=main)

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
- Example search call (POST):
  ```bash
  curl -X POST http://localhost:4000/api/search ^
    -H "Content-Type: application/json" ^
    -d "{\"text\":\"iphone\",\"l1\":\"Electronics\",\"page\":1,\"pageSize\":5}"
  ```

## Handy API snippets (PowerShell)

Admin check (requires `SUPER_ADMIN_EMAIL` set):
```powershell
Invoke-RestMethod -Headers @{'x-admin-email'='Ahmed_sharnou@yahoo.com'} -Uri "http://localhost:4000/api/admin/me"
```

Admin mute/block seller:
```powershell
Invoke-RestMethod -Method POST -Headers @{'x-admin-email'='Ahmed_sharnou@yahoo.com'} `
  -Uri "http://localhost:4000/api/admin/mute" `
  -ContentType "application/json" `
  -Body (@{ sellerId="seller-123"; value=$true } | ConvertTo-Json)

Invoke-RestMethod -Method POST -Headers @{'x-admin-email'='Ahmed_sharnou@yahoo.com'} `
  -Uri "http://localhost:4000/api/admin/block" `
  -ContentType "application/json" `
  -Body (@{ sellerId="seller-123"; value=$true } | ConvertTo-Json)
```

Chat send + fetch thread:
```powershell
Invoke-RestMethod -Method POST -Uri "http://localhost:4000/api/chat/send" `
  -ContentType "application/json" `
  -Body (@{ from="userA"; to="userB"; text="Hi there" } | ConvertTo-Json)

Invoke-RestMethod -Uri "http://localhost:4000/api/chat/thread?userA=userA&userB=userB&limit=10"
```

Search (POST):
```powershell
Invoke-RestMethod -Method POST -Uri "http://localhost:4000/api/search" `
  -ContentType "application/json" `
  -Body (@{ text="iphone"; l1="Electronics"; page=1; pageSize=5 } | ConvertTo-Json)
```

## Persisting the in-memory index
- The in-memory search adapter saves listings to `data-index.json` on process exit and loads it on startup.
- To seed data once, you can run `npm test` (indexes sample docs) then stop the process; `data-index.json` will be written. Keep that file to retain listings across restarts.
- You can also call your own indexing logic to add docs and then stop the server cleanly to persist.

## Quick UI hook (minimal demo)
- Use the existing `public/index.html` to call the search API on port 4000. Example fetch snippet you can drop into the page:
```html
<script>
async function runSearch() {
  const res = await fetch('http://localhost:4000/api/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: 'iphone', l1: 'Electronics', page: 1, pageSize: 5 })
  });
  const data = await res.json();
  console.log(data);
}
runSearch();
</script>
```

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
