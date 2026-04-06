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
| `AUTH0_ISSUER_BASE_URL` | No* | Omit all three Auth0 vars below to run **without Auth0** (single demo API user; see `AUTH_DISABLED_USER_*`). |
| `AUTH0_CLIENT_ID` | No* | Same **application** as the frontend when using Auth0. |
| `AUTH0_CLIENT_SECRET` | No* | Same as frontend when using Auth0. |
| `AUTH0_AUDIENCE` | Optional | API audience; backend derives Management API audience from domain if empty. |
| `FRONTEND_URL` | Auto | Blueprint wires it from the frontend service (`fromService`). |
| `APP_ADMIN_USER_IDS` | Optional | Comma-separated Auth0 `sub` values. |
| `APP_ADMIN_EMAILS` | Optional | Comma-separated emails → admin on login. |
| `AUTH_DISABLED_USER_ID` | Optional | When Auth0 is unset: synthetic user id (default `auth0|demo_u1`). |
| `AUTH_DISABLED_USER_NAME` / `EMAIL` / `PICTURE` | Optional | Demo profile fields when Auth0 is unset. |

\* Secrets: set `MONGODB_URI` in the dashboard. Auth0 triple is optional; if omitted, the API uses demo mode (not for production-facing multi-tenant use).

**Not needed on the backend** (handled in code or Render):

- `BACKEND_URL` — defaults to `RENDER_EXTERNAL_URL`.
- `AUTH0_BASE_URL` — use `FRONTEND_URL` instead (same meaning).
- `CORS_ORIGINS` — omit to allow **only** `FRONTEND_URL`; set `CORS_ORIGINS` only if you need comma-separated extra origins.

## Frontend (`hackathon-frontend`)

| Variable | Required | Notes |
|----------|----------|--------|
| `NODE_ENV` | Yes | `production` in blueprint. |
| `BACKEND_URL` | Auto | Blueprint: `fromService` → `hackathon-backend` `RENDER_EXTERNAL_URL`. |
| `AUTH0_SECRET` | No* | Random string if you use Auth0 SDK routes; omit when not using Auth0 on the frontend. |
| `AUTH0_ISSUER_BASE_URL` | No* | Same issuer as backend when using Auth0. |
| `AUTH0_CLIENT_ID` | No* | Same as backend when using Auth0. |
| `AUTH0_CLIENT_SECRET` | No* | Same as backend when using Auth0. |
| `AUTH0_AUDIENCE` | Optional | Often same as backend. |

**Not needed on the frontend** (unless you override):

- `AUTH0_BASE_URL` — defaults to `RENDER_EXTERNAL_URL` or `NEXT_PUBLIC_APP_URL`.
- `NEXT_PUBLIC_API_URL` — omit to keep same-origin `/api` → rewrites to `BACKEND_URL`.
- `NEXT_PUBLIC_APP_URL` — optional; only if the client must know the public URL at build time.

## Auth0 Dashboard

**Only if** you configure `AUTH0_ISSUER_BASE_URL`, `AUTH0_CLIENT_ID`, and `AUTH0_CLIENT_SECRET` on both services.

This app completes OAuth on the **Flask** service. Add:

- **Allowed Callback URLs:** `{BACKEND_URL}/api/auth/callback` (copy `RENDER_EXTERNAL_URL` from `hackathon-backend` + path).
- **Allowed Logout URLs** and **Allowed Web Origins:** `{FRONTEND_URL}` (auto from blueprint on the backend, or copy from `hackathon-frontend`).

After the first deploy, copy the two `https://…onrender.com` URLs from Render into Auth0.
