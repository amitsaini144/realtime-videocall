# Realtime Video Call

A peer-to-peer video calling app built with Next.js, WebRTC, and WebSockets. Users can see who's online and start a video/audio call directly from the browser.

## Tech Stack

- **Next.js 14** — frontend framework
- **WebRTC** — peer-to-peer video/audio
- **WebSocket (ws)** — signaling server
- **Socket.io** — real-time events
- **Clerk** — authentication
- **Tailwind CSS + Framer Motion** — UI & animations

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Set up environment variables

Copy `.env.example` to `.env.local` and fill in the values:

```bash
cp .env.example .env.local
```

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk publishable key |
| `CLERK_SECRET_KEY` | Clerk secret key |
| `NEXT_PUBLIC_WS_URL` | WebSocket server URL (e.g. `ws://localhost:8080`) |
| `PORT` | Port for the WebSocket server (default: `8080`) |

Get your Clerk keys from [clerk.com](https://clerk.com).

### 3. Run the app

You need to run both the Next.js frontend and the WebSocket signaling server.

**Development (frontend only):**
```bash
npm run dev
```

**Production / with signaling server:**
```bash
npm run start
```

The WebSocket server runs on port `8080` by default. The Next.js app runs on [http://localhost:3000](http://localhost:3000).

## How It Works

1. Sign in via Clerk
2. See other online users on the home screen
3. Click a user to initiate a video call
4. WebRTC handles the peer-to-peer media stream; the WebSocket server handles signaling
