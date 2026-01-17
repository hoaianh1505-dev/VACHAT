# AVChat — Quick deploy notes

- Realtime (Socket.IO) requires a long‑running server. Vercel serverless DOES NOT support persistent WebSocket servers.
- Options:
  1. Deploy backend (Express + Socket.IO) to Render/Railway/Fly/VM and set SOCKET_URL to that URL in Vercel env. Frontend (Vercel) will connect to SOCKET_URL.
  2. Keep frontend & backend together on a host that supports WebSocket (Render/Railway) — simplest.
  3. Or replace realtime with a managed realtime provider (Pusher/Ably/Supabase/Firebase) if you must keep backend serverless.

Env vars to set on hosting (backend):
- MONGO_URI, SESSION_SECRET, NODE_ENV=production

Env vars to set on Vercel (frontend):
- SOCKET_URL=https://your-backend.example.com

After deploy:
- Ensure cookie sameSite/secure and CORS configured on backend when frontend and backend are different origins.
- Test with two browsers (incognito) connecting to frontend; messages should appear realtime.
