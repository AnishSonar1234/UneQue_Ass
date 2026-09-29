# Meta Lead Ads → Real-time Proof of Concept

A monorepo demonstrating an end-to-end pipeline:

```
Meta Lead Ad Form Submit
       ↓
Meta Webhook (leadgen event) → POST /webhook
       ↓
Node.js verifies HMAC signature → fetches full lead from Graph API
       ↓
In-memory store + JSONL persistence
       ↓
WebSocket broadcast
       ↓
React Native screen updates LIVE (no manual action)
```

## Repository Layout

```
/backend    Node.js 20 + TypeScript + Express + ws
/mobile     Expo (React Native) + TypeScript
README.md   This file
```

---

## Prerequisites

| Tool | Version |
|------|---------|
| Node.js | 20+ |
| npm | 9+ |
| Expo CLI | latest (`npm i -g expo-cli` or `npx expo`) |
| ngrok | latest |

---

## 1 — Backend Setup

### 1.1 Install dependencies

```bash
cd backend
npm install
```

### 1.2 Configure environment variables

```bash
cp .env.example .env
# Then edit .env with your real values
```

| Variable | Description |
|----------|-------------|
| `PORT` | HTTP port (default `3000`) |
| `VERIFY_TOKEN` | Any secret string you choose — used for Meta webhook verification |
| `APP_SECRET` | Found in Meta Developer Console → App → Settings → Basic → App Secret |
| `PAGE_ACCESS_TOKEN` | Your Facebook Page Access Token (see §4 below) |
| `GRAPH_VERSION` | Graph API version (default `v21.0`) |
| `NODE_ENV` | `development` enables `/dev/simulate` |

### 1.3 Run the backend

```bash
npm run dev
```

Server starts at `http://localhost:3000`.

Available endpoints:
- `GET  /health` — `{ ok: true, clients: N }`
- `GET  /leads` — Latest 100 leads (JSON array)
- `GET  /leads?since=<ISO>` — Leads newer than ISO timestamp
- `GET  /webhook` — Meta webhook verification
- `POST /webhook` — Receive leadgen events
- `POST /dev/simulate` — Inject a fake lead (dev only)
- `WS   /ws` — WebSocket for real-time lead push

---

## 2 — ngrok Setup

ngrok tunnels your local backend to a public HTTPS URL that Meta can reach.

### 2.1 Install ngrok

Download from https://ngrok.com/download or:
```bash
# macOS/Linux
brew install ngrok/ngrok/ngrok

# Windows (winget)
winget install ngrok.ngrok
```

### 2.2 Authenticate (once)

```bash
ngrok authtoken <YOUR_NGROK_AUTH_TOKEN>
```

Get your auth token at https://dashboard.ngrok.com/get-started/your-authtoken

### 2.3 Start tunnel

```bash
ngrok http 3000
```

You'll see output like:
```
Forwarding  https://abc123.ngrok-free.app -> http://localhost:3000
```

**Copy the HTTPS URL** (e.g., `https://abc123.ngrok-free.app`). You'll need it for:
1. Meta webhook callback URL
2. Mobile app config

> ⚠️ The ngrok URL changes every time you restart (on the free plan). Update it in both places.

---

## 3 — Meta App Configuration

### 3.1 Create a Meta Developer App

1. Go to https://developers.facebook.com/
2. Click **My Apps → Create App**
3. Choose **Business** type → fill in name → Create
4. Under **Add Products**, find **Webhooks** and click **Set Up**

### 3.2 Configure Webhook

1. In your app dashboard, go to **Webhooks**
2. Click **Subscribe to this object** → select **Page**
3. Fill in:
   - **Callback URL**: `https://your-ngrok-url.ngrok-free.app/webhook`
   - **Verify Token**: Same value as `VERIFY_TOKEN` in your `.env`
4. Click **Verify and Save**

The backend will respond to the challenge and return 200.

### 3.3 Subscribe to `leadgen` field

After verifying, in the Page subscription section:
- Check the box next to **`leadgen`**
- Click **Save**

### 3.4 Subscribe your Page to the App

You must call the subscribed_apps endpoint. Replace `{PAGE_ID}` and `{PAGE_ACCESS_TOKEN}`:

```bash
curl -X POST \
  "https://graph.facebook.com/v21.0/{PAGE_ID}/subscribed_apps" \
  -d "access_token={PAGE_ACCESS_TOKEN}" \
  -d "subscribed_fields=leadgen"
```

Expected response: `{ "success": true }`

---

## 4 — Getting a Page Access Token

### Required Permissions

Your app needs these permissions:
- `leads_retrieval`
- `pages_manage_metadata`
- `pages_read_engagement`
- `pages_show_list`

### Steps

1. Go to **Meta Developer Console → Tools → Graph API Explorer**
2. Select your app from the **Application** dropdown
3. Click **Generate Access Token** → log in and grant permissions
4. Change the **User or Page** dropdown from User Token to your **Page**
5. Copy the **Page Access Token**
6. *(For production)* Use the Token Debugger to exchange for a long-lived token

> ⚠️ Short-lived tokens expire in ~1 hour. For extended testing, exchange for a long-lived token via:
> ```
> GET /oauth/access_token?grant_type=fb_exchange_token&client_id=APP_ID&client_secret=APP_SECRET&fb_exchange_token=SHORT_LIVED_TOKEN
> ```

---

## 5 — Mobile App Setup

### 5.1 Install dependencies

```bash
cd mobile
npm install
```

### 5.2 Update the config

Edit `mobile/config.ts`:

```typescript
// For testing on the same machine (Expo web / Android emulator):
const DEV_HOST = "localhost:3000";

// For a physical device via Expo Go — use your ngrok URL:
const DEV_HOST = "abc123.ngrok-free.app";
// Then also change WS_URL to use wss:// for ngrok HTTPS tunnels:
// WS_URL: `wss://${DEV_HOST}/ws`
```

### 5.3 Run the app

```bash
cd mobile
npx expo start
```

- Press **`a`** for Android emulator
- Press **`i`** for iOS simulator
- Scan the QR code with **Expo Go** on a physical device

---

## 6 — Testing Without Meta (dev/simulate)

Before connecting Meta, verify the full pipeline works end-to-end:

### Inject a fake lead

```bash
curl -X POST http://localhost:3000/dev/simulate \
  -H "Content-Type: application/json" \
  -d '{
    "leadgen_id": "test_lead_001",
    "form_id": "form_abc",
    "page_id": "page_xyz",
    "fields": {
      "full_name": "Alice Smith",
      "email": "alice@example.com",
      "phone_number": "+1-555-0101"
    }
  }'
```

Expected response:
```json
{
  "ok": true,
  "lead": {
    "id": "test_lead_001",
    "formId": "form_abc",
    "pageId": "page_xyz",
    "fields": {
      "full_name": "Alice Smith",
      "email": "alice@example.com",
      "phone_number": "+1-555-0101"
    },
    "status": "ok",
    "receivedAt": "..."
  }
}
```

The lead should appear **instantly** in the open React Native screen.

### Quick sanity checks

```bash
# Check server health and WS client count
curl http://localhost:3000/health

# List all stored leads
curl http://localhost:3000/leads

# Inject a lead with just a timestamp, no custom ID
curl -X POST http://localhost:3000/dev/simulate \
  -H "Content-Type: application/json" \
  -d '{}'
```

---

## 7 — Using the Meta Lead Ads Testing Tool

1. Go to **Meta Developer Console → Lead Ads Testing Tool**:  
   `https://developers.facebook.com/tools/lead-ads-testing`
2. Select your **Page** and **Lead Form**
3. Click **Preview Form** — fill it in as a user would
4. Click **Submit**
5. Meta sends a `leadgen` webhook event to your backend
6. The backend fetches the lead from Graph API and broadcasts via WebSocket
7. The lead appears live in your React Native app

> ℹ️ The Testing Tool bypasses campaign requirements. You don't need active ads running.

---

## 8 — Run Tests

```bash
cd backend
npm test
```

Tests cover:
- HMAC SHA-256 signature verification (valid, invalid, tampered)
- Webhook payload parsing and field normalization

---

## 9 — Production Checklist

- [ ] Set `NODE_ENV=production` (disables `/dev/simulate`)
- [ ] Use a long-lived Page Access Token
- [ ] Replace `console.*` logs with a structured logger (pino) if needed
- [ ] Use a static ngrok domain or deploy to a real server (Railway, Fly.io, etc.)
- [ ] Set `wss://` (not `ws://`) in mobile config for production
- [ ] Add rate limiting to `/webhook` if needed

---

## Troubleshooting

### "Verification challenge failed"
- Check `VERIFY_TOKEN` in `.env` matches exactly what you entered in Meta console
- Make sure the backend is running and ngrok is forwarding to the correct port

### Webhook events not arriving
- Verify `leadgen` is checked in the Page subscription fields
- Confirm `POST /{PAGE_ID}/subscribed_apps` returned `{ "success": true }`
- Check ngrok dashboard at `http://localhost:4040` for incoming requests

### "Invalid signature" (401)
- `APP_SECRET` in `.env` must be the raw App Secret, not URL-encoded
- Make sure `express.raw()` is applied to `POST /webhook` (already done)

### Lead appears with `status: "fetch_failed"`
- The Graph API fetch failed after 3 retries
- Common cause: Page Access Token expired → generate a new one
- The lead ID and form ID are still stored and visible in the app

### Mobile app not receiving leads
- Check `config.ts` — `API_URL` and `WS_URL` must point to your ngrok URL when using a physical device
- Use `wss://` (not `ws://`) for ngrok HTTPS URLs
- Check the connection badge in the app: green = connected

### ngrok "session limit exceeded"
- Free ngrok allows 1 concurrent session. Kill any other ngrok processes.
- On Windows: `taskkill /f /im ngrok.exe`

### Duplicate leads
- Expected behavior — Meta may deliver the same event multiple times
- The backend deduplicates by `leadgen_id` in both memory and JSONL storage
