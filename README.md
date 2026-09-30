# Meta Lead Ads Integration 

Real-time lead ingestion system that captures Facebook Lead Ads webhooks, fetches lead details via the Meta Graph API, and broadcasts updates instantly to a React Native / Web dashboard over WebSockets.

## Overview

1. User submits a Lead Ad form on Facebook or Instagram.
2. Meta sends a `POST` webhook notification to `/webhook`.
3. The server validates the request HMAC signature (`X-Hub-Signature-256`).
4. The server fetches user field data (name, email, phone) from the Graph API.
5. Lead data is saved to memory and logged to `leads.jsonl`.
6. The lead is broadcast via WebSockets to connected client dashboards.

## Project Structure

```
.
├── backend/            # Express + TypeScript + WebSockets backend
│   ├── src/
│   │   ├── server.ts   # Express app and route setup
│   │   ├── webhook.ts  # Webhook handler and signature verification
│   │   ├── graph.ts    # Meta Graph API client
│   │   ├── store.ts    # In-memory lead store + file logging
│   │   ├── ws.ts       # WebSocket server and broadcasting
│   │   └── config.ts   # Environment configuration
│   └── tests/          # Webhook unit tests
└── mobile/             # React Native (Expo) web & mobile dashboard
    ├── App.tsx         # Dashboard screen
    ├── LeadRow.tsx     # Animated lead card
    ├── useLeadsSocket.ts # WebSocket connection hook
    └── config.ts       # API/WS URL configuration
```

## Quick Start

### 1. Backend Setup

```bash
cd backend
npm install
cp .env.example .env
```

Edit `backend/.env` with your values:

```env
PORT=3000
VERIFY_TOKEN=mylocaltesttoken
APP_SECRET=your_app_secret
PAGE_ACCESS_TOKEN=your_page_access_token
GRAPH_VERSION=v21.0
NODE_ENV=development
```

Start the dev server:

```bash
npm run dev
```

### 2. Frontend Setup

```bash
cd mobile
npm install
npm start
```

Press `w` in the terminal to view the web dashboard at `http://localhost:8081`.

---

## Testing

### Local Simulation (No Meta account required)

You can trigger a test lead using the `/dev/simulate` endpoint:

```bash
curl -X POST http://localhost:3000/dev/simulate \
  -H "Content-Type: application/json" \
  -d '{
    "fields": {
      "full_name": "Test User",
      "email": "test@example.com",
      "phone_number": "+91-9999999999"
    }
  }'
```

The new lead will render on the open dashboard immediately.

### Meta Lead Ads Testing Tool

To test with Meta's official testing suite:
1. Open the [Meta Lead Ads Testing Tool](https://developers.facebook.com/tools/lead-ads-testing/).
2. Choose your Page and Form.
3. Click **Create Lead**.

---

## API Reference

- `GET /health` - Returns server status and connected WebSocket count.
- `GET /leads` - Returns stored leads (supports `?since=<ISO_DATE>`).
- `GET /webhook` - Meta webhook verification handler.
- `POST /webhook` - Meta leadgen webhook receiver.
- `POST /dev/simulate` - Injects test lead data (dev mode only).
- `WS /ws` - WebSocket connection for real-time lead updates.

---

## Deployment

### Backend (Render / Railway / VPS)

Deploy `backend/` to a platform supporting persistent WebSockets.

Build command:
```bash
npm install && npm run build
```

Start command:
```bash
npm start
```

### Frontend (Vercel)

Deploy `mobile/` to Vercel as a static web build.

Build command:
```bash
npx expo export --platform web
```

Output directory: `dist`
