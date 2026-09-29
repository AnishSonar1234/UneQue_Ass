# 🚀 Real-time Meta Lead Ads Pipeline (Monorepo)

A production-ready monorepo demonstrating an end-to-end real-time lead ingestion system from **Meta Lead Ads (Facebook)** to a live web/mobile dashboard via **WebSockets**.

```
  ┌─────────────────────────┐
  │ Meta Lead Ad Form Submit│
  └────────────┬────────────┘
               │
               ▼
  ┌─────────────────────────┐
  │ Meta Webhook Event      │ ───► POST /webhook (HMAC SHA-256 Verified)
  └────────────┬────────────┘
               │
               ▼
  ┌─────────────────────────┐
  │ Node.js Backend Server  │ ───► Graph API Fetch + In-Memory & JSONL Store
  └────────────┬────────────┘
               │
               ▼
  ┌─────────────────────────┐
  │ Real-time WebSocket Broadcast (wss://)
  └────────────┬────────────┘
               │
               ▼
  ┌─────────────────────────┐
  │ Live Dashboard (Web/Expo)│ ───► Live Card Highlights & Relative Timestamps
  └─────────────────────────┘
```

---

## 📁 Repository Structure

```
UneQue/
├── backend/            # Node.js + Express + TypeScript + WebSockets
│   ├── src/
│   │   ├── server.ts   # Main Express server & route bootstrap
│   │   ├── store.ts    # Lead persistence (In-memory & JSONL file)
│   │   ├── ws.ts       # WebSocket server & client broadcaster
│   │   ├── webhook.ts  # Meta Webhook handler & HMAC signature validator
│   │   ├── graph.ts    # Meta Graph API client with auto-retry
│   │   └── config.ts   # Central environment configuration
│   ├── tests/          # Unit tests (Vitest)
│   ├── package.json
│   └── .env.example
├── mobile/             # React Native (Expo) & React Native Web Dashboard
│   ├── App.tsx         # Main UI Dashboard
│   ├── LeadRow.tsx     # Animated Lead Card component
│   ├── useLeadsSocket.ts # WebSocket hook with auto-reconnect & catch-up
│   ├── config.ts       # Smart environment resolution
│   ├── vercel.json     # Vercel deployment configuration
│   └── package.json
└── README.md           # Project Documentation
```

---

## 🛠️ Prerequisites

- **Node.js**: v20.x or higher
- **npm**: v9.x or higher
- **Git**: For version control & deployment

---

## 📥 Installation & Setup

### 1. Clone the Repository

```bash
git clone https://github.com/AnishSonar1234/UneQue_Ass.git
cd UneQue_Ass
```

---

### 2. Backend Setup

```bash
# Navigate to backend directory
cd backend

# Install dependencies
npm install

# Create environment file from template
cp .env.example .env
```

#### Edit `backend/.env`:
For **Local Development**:
```env
PORT=3000
VERIFY_TOKEN=mylocaltesttoken
APP_SECRET=placeholder_secret
PAGE_ACCESS_TOKEN=placeholder_token
GRAPH_VERSION=v21.0
NODE_ENV=development
```

---

### 3. Frontend Setup

```bash
# Navigate to mobile directory
cd mobile

# Install dependencies
npm install
```

---

## 🚀 How to Run Locally

### Step 1: Start Backend Server
From `backend/` directory:
```bash
npm run dev
```
- Server starts at: `http://localhost:3000`

### Step 2: Start Frontend App
From `mobile/` directory:
```bash
npm start
```
- Press **`w`** in the terminal to open the web dashboard in your browser (`http://localhost:8081`).
- Or scan the QR code with **Expo Go** on your physical phone (on the same Wi-Fi).

---

## 🧪 How to Test

### Method 1: Using the Dev Simulation Endpoint (Instant)
Inject a test lead directly into your running server:

```powershell
Invoke-RestMethod -Method Post -Uri "http://localhost:3000/dev/simulate" `
  -ContentType "application/json" `
  -Body '{"fields":{"full_name":"Ankush Test","email":"ankush@test.com","phone_number":"+91-9999999999"}}'
```
👉 The lead will instantly pop up on the dashboard with a blue highlight animation and live timestamp!

---

### Method 2: Test via Postman or Hoppscotch
- **Method**: `POST`
- **URL**: `http://localhost:3000/dev/simulate`
- **Headers**: `Content-Type: application/json`
- **Body**:
  ```json
  {
    "fields": {
      "full_name": "Sarah Connor",
      "email": "sarah@example.com",
      "phone_number": "+1-555-0199"
    }
  }
  ```

---

### Method 3: Real Meta Facebook Lead Ads Testing Tool
1. Open [Meta Lead Ads Testing Tool](https://developers.facebook.com/tools/lead-ads-testing/).
2. Select your **Facebook Page** and **Lead Form**.
3. Click **Create Lead**.
4. Click **Track Status** to verify `STATUS 200`.
5. The lead will appear live on your connected web dashboard.

---

## 🧪 Running Unit Tests

To run the backend test suite (HMAC signature verification, webhook parsing, deduplication):

```bash
cd backend
npm test
```

---

## ☁️ Deployment Guide

### Backend Deployment (e.g. Render.com / Railway / VPS)

> ⚠️ **Note:** The backend uses persistent WebSockets (`wss://`) and must be deployed on a server platform like Render, Railway, or a VPS.

1. Go to [Render Dashboard](https://dashboard.render.com/) > **New +** > **Web Service**.
2. Connect your GitHub repository (`AnishSonar1234/UneQue_Ass`).
3. Set configuration:
   - **Root Directory**: `backend`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
4. Environment Variables:
   - `PORT` = `3000`
   - `NODE_ENV` = `production`
   - `VERIFY_TOKEN` = `your_secret_verify_token`
   - `APP_SECRET` = `your_facebook_app_secret`
   - `PAGE_ACCESS_TOKEN` = `your_facebook_page_access_token`

---

### Frontend Deployment (Vercel)

1. Go to [Vercel Dashboard](https://vercel.com/new) and import your repo.
2. Set configuration:
   - **Root Directory**: `mobile`
   - **Framework Preset**: `Other`
   - **Build Command**: `npx expo export --platform web`
   - **Output Directory**: `dist`
3. Environment Variables (optional):
   - `EXPO_PUBLIC_API_URL` = `https://your-backend.onrender.com`
   - `EXPO_PUBLIC_WS_URL` = `wss://your-backend.onrender.com/ws`
4. Click **Deploy**.

---

## 📖 API Endpoints Reference

| Endpoint | Method | Description |
|---|---|---|
| `/health` | `GET` | System status & connected WebSocket client count |
| `/leads` | `GET` | List stored leads (supports `?since=<ISO_TIMESTAMP>`) |
| `/webhook` | `GET` | Meta Webhook hub verification challenge |
| `/webhook` | `POST` | Meta Webhook leadgen event receiver |
| `/dev/simulate` | `POST` | Simulate a lead payload without Meta Graph API |
| `/ws` | `WS` | WebSocket endpoint for real-time lead push |

---

## 🛡️ License

MIT License. Designed and built as a proof of concept for real-time lead ingestion systems.
