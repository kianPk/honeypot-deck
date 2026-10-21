# Honeypot Deck

**Decoy service console** — SSH / HTTP / RDP / MySQL lures with a live attack stream (Socket.IO or offline sim).

Live demo: **https://kianpk.github.io/honeypot-deck/**

## Stack

Vue 3 · Vite · Express · Socket.IO

## Run

```bash
cd server && npm i && node index.js   # :8822
cd client && npm i && npm run dev
cd client && npm run build
```

Defensive honeypot monitoring UI — not an attack tool.
