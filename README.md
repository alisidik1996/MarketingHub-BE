# Meta Ads Backend

Express.js backend — proxy ke Meta Graph API.

## Setup

```bash
npm install
```

Buat file `.env` dari `.env.example`:

```bash
copy .env.example .env
```

Isi nilai di `.env`:
```
META_APP_ID=your_meta_app_id
META_APP_SECRET=your_meta_app_secret
PORT=3001
NODE_ENV=development
ALLOWED_ORIGIN=https://your-frontend-domain.com
```

## Menjalankan

```bash
# Development (auto-restart on file change, Node 18+)
npm run dev

# Production
npm start
```

## Struktur

```
src/
├── index.js              # Entry point
├── app.js                # Express factory
├── config/
│   └── meta.js           # Meta API config
├── controllers/
│   └── metaController.js # Request handlers
├── middleware/
│   ├── auth.js           # Token extraction
│   └── errorHandler.js   # Global error handler
├── routes/
│   ├── index.js          # Route aggregator
│   └── meta.js           # Meta endpoints
└── services/
    └── metaService.js    # Meta Graph API calls
```

## Endpoints

| Method | Path                    | Deskripsi                     |
|--------|-------------------------|-------------------------------|
| GET    | /health                 | Health check                  |
| POST   | /api/meta/token/inspect | Inspect Meta token            |
| POST   | /api/meta/token/extend  | Extend Meta token (60 hari)   |
| POST   | /api/meta/account       | Info ad account               |
| POST   | /api/meta/campaigns     | Daftar kampanye               |
| POST   | /api/meta/insights      | Campaign insights             |
| POST   | /api/meta/adsets        | Ad sets per kampanye          |
| POST   | /api/meta/ads           | Ads per ad set / kampanye     |

## Deploy

Cocok untuk Railway, Render, atau Heroku. Set environment variables di dashboard deploy.
