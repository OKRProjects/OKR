# Render.com (free tier blueprint)

The repo root [`render.yaml`](../render.yaml) defines:

- **Web service** `hackathon-backend`: Docker build from [`backend/Dockerfile`](../backend/Dockerfile), **Free** plan.
- **PostgreSQL** `hackathon-postgres`: **Free** plan (limits apply; check [Render pricing](https://render.com/pricing)).

## Deploy

1. In Render: **New** → **Blueprint** → connect this GitHub repo and select `render.yaml`.
2. After the first deploy, open the **Web Service** → **Environment** and set the variables marked `sync: false` in the blueprint (MongoDB, Auth0, `BACKEND_URL`, `CORS_ORIGINS`, `FRONTEND_URL`, etc.). `FLASK_SECRET_KEY` can stay auto-generated unless you rotate it.
3. Set **`BACKEND_URL`** to your public service URL (e.g. `https://hackathon-backend.onrender.com`) and **`CORS_ORIGINS`** / **`AUTH0_BASE_URL`** / **`FRONTEND_URL`** to match your frontend origin.

`DATABASE_URL` is wired from the Render Postgres instance; the backend normalizes `postgresql://` to `postgresql+psycopg://` for SQLAlchemy.

## Health checks

Render uses **`GET /live`** (always 200) for load balancer health. **`GET /health`** still checks MongoDB.
