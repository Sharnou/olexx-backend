# OLEXX Backend

Lightweight classifieds backend with in-memory search, optional Elasticsearch/RabbitMQ, AWS S3 presign, and demo UIs.

![CI](https://github.com/Sharnou/olexx-backend/actions/workflows/ci.yml/badge.svg?branch=main)

## Requirements
- Node.js 18+
- Optional services: Elasticsearch (`USE_ES=true`), RabbitMQ (`USE_RABBIT=true`), AWS S3 presign (`USE_AWS_PRESIGN=true`).

## Quick start
1) `npm install`
2) Copy `.env.example` → `.env` and fill values (set `SUPER_ADMIN_EMAIL`).
3) Ensure `data-index.json` exists (`[]` if empty).
4) `npm start` (default port 3000; set `PORT=4000` if you prefer).
5) Health: `GET /health`

## Available scripts
- `npm start` — run `server.js`
- `npm run dev` — nodemon reload
- `npm test` — classifier/search sanity script
- Example search (POST):
  ```bash
  curl -X POST http://localhost:4000/api/search \
    -H "Content-Type: application/json" \
    -d '{"text":"iphone","l1":"Electronics","country":"Egypt","page":1,"pageSize":5}'
  ```

## Handy API snippets (PowerShell)
- Admin check: requires bearer token whose user email matches `SUPER_ADMIN_EMAIL`.
- Mute/block seller (POST): `/api/admin/mute` or `/api/admin/block` with JSON `{ sellerId, value }` using bearer token auth.
- Chat send/thread: `/api/chat/send` (POST `{from?, whatsapp?, to, text?, audioUrl?, channel: "text"|"voice"|"whatsapp_voice"}`) and `/api/chat/thread?userA=&userB=&limit=`.
- Search: `/api/search` POST `{ text, l1, l2?, country?, city?, page, pageSize }`.

## Persisting the in-memory index
- Listings are saved to `data-index.json` on shutdown and loaded on startup.
- Run `npm test` once to seed sample docs, then stop the process to persist.

## UI demos
- `public/index.html` — marketplace UI (country-aware search, sell form, chat, admin actions, browser voice record upload to /api/chat/upload-voice).
- `public/admin.html` — admin console (health, mute/block, audit).
- Minimal fetch snippet:
```html
<script>
async function runSearch() {
  const res = await fetch('http://localhost:4000/api/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: 'iphone', l1: 'Electronics', country: 'Egypt', page: 1, pageSize: 5 })
  });
  console.log(await res.json());
}
runSearch();
</script>
```

## Environment variables
- `PORT`, `SUPER_ADMIN_EMAIL`, `DEV_MODE`
- `USE_ES`, `ES_HOST`, `ES_INDEX`
- `USE_RABBIT`, `RABBIT_URL`
- `USE_AWS_PRESIGN`, `AWS_REGION`, `S3_BUCKET`, `S3_UPLOAD_BASE`, `S3_CDN_BASE`
- `WHATSAPP_TOKEN`, `WHATSAPP_NUMBER_ID` (for WhatsApp Business API send)
- `AI_API_KEY`, `AI_API_URL`, `AI_MODEL` (vision/LLM suggestions)
- `OTP_EMAIL_FROM`, `SENDGRID_API_KEY` (email OTP)
- `TWILIO_SID`, `TWILIO_TOKEN`, `TWILIO_FROM` (SMS OTP)

## Notes
- For production, add structured logging and metrics.
- `SUPER_ADMIN_EMAIL` must be set before start; otherwise admin endpoints return non-admin.
