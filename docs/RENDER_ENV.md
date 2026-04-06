# Environment variables on Render

All values below are **Render dashboard → Environment** unless the blueprint wires them automatically.

## Auto-injected (do not set manually)

| Variable | Where |
|----------|--------|
| `PORT` | Render injects for the listening port. |
| `RENDER_EXTERNAL_URL` | Public `https://…onrender.com` URL for **each** web service. |
| `DATABASE_URL` | Backend only: from Postgres via `render.yaml` `fromDatabase`. |
| `FRONTEND_URL` | Backend only: from `render.yaml` `fromService` → `hackathon-frontend` `RENDER_EXTERNAL_URL`. |
| `BACKEND_URL` | Frontend only: from `render.yaml` → `hackathon-backend` `RENDER_EXTERNAL_URL`. |

## Backend (`hackathon-backend`)

| Variable | Required | Notes |
|----------|----------|--------|
| `FLASK_ENV` | Yes | `production` in blueprint. |
| `OKR_REPOSITORY` | Yes | `postgres` in blueprint. |
| `FLASK_SECRET_KEY` | Yes | Blueprint uses `generateValue: true`. |
| `MONGODB_URI` | Yes* | MongoDB Atlas connection string. |
| `MONGODB_DB_NAME` | Optional | Defaults in app if unset. |
| `AUTH0_ISSUER_BASE_URL` | Yes* | e.g. `https://YOUR_TENANT.us.auth0.com` (same as Next). Replaces separate `AUTH0_DOMAIN`. |
| `AUTH0_CLIENT_ID` | Yes* | Same **application** as the frontend. |
| `AUTH0_CLIENT_SECRET` | Yes* | Same as frontend. |
| `AUTH0_AUDIENCE` | Optional | API audience; backend derives Management API audience from domain if empty. |
| `FRONTEND_URL` | Auto | Blueprint wires it from the frontend service (`fromService`). |
| `APP_ADMIN_USER_IDS` | Optional | Comma-separated Auth0 `sub` values. |
| `APP_ADMIN_EMAILS` | Optional | Comma-separated emails → admin on login. |

\* Marked secrets must be set in the dashboard.

**Not needed on the backend** (handled in code or Render):

- `BACKEND_URL` — defaults to `RENDER_EXTERNAL_URL`.
- `AUTH0_BASE_URL` — use `FRONTEND_URL` instead (same meaning).
- `CORS_ORIGINS` — omit to allow **only** `FRONTEND_URL`; set `CORS_ORIGINS` only if you need comma-separated extra origins.

## Frontend (`hackathon-frontend`)

| Variable | Required | Notes |
|----------|----------|--------|
| `NODE_ENV` | Yes | `production` in blueprint. |
| `BACKEND_URL` | Auto | Blueprint: `fromService` → `hackathon-backend` `RENDER_EXTERNAL_URL`. |
| `AUTH0_SECRET` | Yes* | Session cookie secret for Next Auth0 SDK. |
| `AUTH0_ISSUER_BASE_URL` | Yes* | Same issuer string as backend. |
| `AUTH0_CLIENT_ID` | Yes* | Same as backend. |
| `AUTH0_CLIENT_SECRET` | Yes* | Same as backend. |
| `AUTH0_AUDIENCE` | Optional | Often same as backend. |

**Not needed on the frontend** (unless you override):

- `AUTH0_BASE_URL` — defaults to `RENDER_EXTERNAL_URL` or `NEXT_PUBLIC_APP_URL`.
- `NEXT_PUBLIC_API_URL` — omit to keep same-origin `/api` → rewrites to `BACKEND_URL`.
- `NEXT_PUBLIC_APP_URL` — optional; only if the client must know the public URL at build time.

## Auth0 Dashboard

This app completes OAuth on the **Flask** service. Add:

- **Allowed Callback URLs:** `{BACKEND_URL}/api/auth/callback` (copy `RENDER_EXTERNAL_URL` from `hackathon-backend` + path).
- **Allowed Logout URLs** and **Allowed Web Origins:** `{FRONTEND_URL}` (auto from blueprint on the backend, or copy from `hackathon-frontend`).

After the first deploy, copy the two `https://…onrender.com` URLs from Render into Auth0.
