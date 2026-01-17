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

- Cài phụ thuộc AI (nếu dùng Node <18 hoặc muốn SDK OpenAI):
  - npm install node-fetch@2 openai
- Nếu Node >=18 bạn có thể bỏ qua node-fetch (global fetch đã có sẵn).

Local AI fallback / forced mode
- Nếu muốn luôn dùng gợi ý cục bộ (không cần API key), đặt biến môi trường:
  - FORCE_LOCAL_AI=1  (hoặc FORCE_LOCAL_AI=true)
- Khi bật, server sẽ trả gợi ý ngắn 1 câu bằng tiếng Việt ngay cả khi không có key hoặc khi provider báo hạn ngạch.

Using your Gemini key (quick)
- Put your key into .env as:
  - GEMINI_API_KEY=your_key_here
- Restart server (npm run dev).
- Test provider from your browser/Postman (must be authenticated) or curl:
  - POST http://localhost:PORT/api/ai/debug
  - Body JSON: { "sample": "Hôm nay ngày mấy" }
- Server will return raw Gemini response or an error message (quota/auth) to help debug.

If you see "Request had invalid authentication credentials" or "Requested entity was not found":
- Preferred fix: configure a Service Account for server-to-server auth (recommended when API key fails or is restricted).

Quick steps (Service Account)
1. In Google Cloud Console → Select your Project.
2. APIs & Services → Enable "Generative Language API".
3. IAM & Admin → Service Accounts → Create Service Account.
4. Grant it a role with API access (e.g. Editor or specific roles for Generative AI).
5. Create a JSON key for the service account and download it.

Configure server to use the key:
- Option A (recommended): set env var pointing to file path:
  - GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json
- Option B: set raw JSON (if container) — be careful with secrets:
  - SERVICE_ACCOUNT_JSON='{"type":"...","private_key":"...","client_email":"..."}'

Then restart server.

Verify from app:
- While server running, POST to:
  - POST http://localhost:PORT/api/ai/debug
  - Body: { "sample": "Hôm nay ngày mấy" }
- Response field "attemptedWith" will show which auth method succeeded: "query", "api_key_header", or "service_account".
- If service_account used, the debug result should be ok:true.

If you cannot use a service account:
- Ensure GEMINI_API_KEY is an API key created in the same project where Generative Language API is enabled.
- Temporarily remove API key restrictions (IP/referrer) to test.

Security note:
- Do not expose keys to clients. Keep service account JSON or API key only on the backend.
