# Deploying the demo without a credit card

The hackathon asks for a Vultr VM. If Vultr credits are unavailable, **FastAPI
Cloud** is the honest fallback used for the public demo URL: a free Hobby plan
with no credit card, built by the FastAPI team.

This is **not** a Vultr deployment. Say so in the submission.

## What is already set up

| File | Why |
|---|---|
| `main.py` | Root entrypoint: adds `backend/` to `sys.path`, re-exports `app`, and points SQLite at `/tmp` |
| `requirements.txt` | `-r backend/requirements.txt` plus `fastapi[standard]` (the host's CLI) |
| `.python-version` | Pins Python 3.12 |
| `.fastapicloudignore` | Un-ignores `frontend/dist/` so the built SPA is uploaded |

## Deploy / redeploy

```bash
cd bizflow-ai

# the host does not run your frontend build — do it locally first
cd frontend && npm ci && npm run build && cd ..

# one command; opens a browser the first time
fastapi deploy
```

The CLI prints the app URL, for example
`https://<app>.fastapicloud.dev`.

## Runtime notes

- **Database:** SQLite at `/tmp/bizflow.db`. The demo reseeds on a cold start,
  so data written by a visitor is not permanent. That is fine for a demo.
- **Cold start:** the free Hobby plan scales to zero. The first request after
  idle can take a few seconds.
- **AI mode:** deterministic. No Vultr key is set, so the UI and `/api/health`
  report demo mode honestly.
- **Login:** `demo@bizflow.ai` / `demo1234`.

## If you later get Vultr credits

Deploy the Compose stack instead and change the lablab platform to **Vultr**:

```bash
docker compose up -d --build
```

`docs/DEPLOYMENT.md` covers the Vultr VM steps (Nginx, TLS, migrations).
