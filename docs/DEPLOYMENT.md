# Deployment

This document describes the intended production path: **Vultr Cloud Compute + Docker Compose + PostgreSQL**, with TLS terminated on the host.

> **Status:** the application was built and tested locally. It has **not** been deployed to Vultr from this workspace, and no public URL is claimed. The steps below are complete and reproducible; treat them as the deployment runbook, not a report of a completed deployment.

---

## 1. Provision the server

1. In the Vultr customer portal, deploy **Cloud Compute**.
2. Recommended starting size: **2 vCPU / 4 GB RAM / 80 GB SSD**, Ubuntu 24.04 LTS.
3. Add your SSH key and create the instance.
4. Create a DNS `A` record, e.g. `bizflow.example.com → <public IP>`.
5. Allow inbound ports `22`, `80`, `443` in the Vultr firewall. Do **not** expose PostgreSQL or the backend port publicly.

```bash
ssh root@<public-ip>
adduser --disabled-password --gecos "" bizflow
usermod -aG sudo bizflow
rsync --archive --chown=bizflow:bizflow ~/.ssh /home/bizflow
```

## 2. Install Docker

```bash
sudo apt-get update
sudo apt-get install -y ca-certificates curl git ufw
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker bizflow
```

Log out and back in so the group change applies.

```bash
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw --force enable
```

## 3. Fetch and configure the app

```bash
sudo mkdir -p /opt/bizflow && sudo chown bizflow:bizflow /opt/bizflow
git clone <your-repository-url> /opt/bizflow
cd /opt/bizflow

cp .env.example .env
```

Edit `.env`:

```dotenv
ENVIRONMENT=production
POSTGRES_PASSWORD=<long-random-password>
JWT_SECRET=<openssl rand -hex 48>
CORS_ORIGINS=https://bizflow.example.com
SEED_DEMO_DATA=true          # set false for a private production workspace
APP_PORT=8080
BIND_ADDRESS=127.0.0.1       # only the host Nginx should reach the web container
VULTR_INFERENCE_API_KEY=     # optional, see section 6
```

Generate secrets:

```bash
openssl rand -hex 48   # JWT_SECRET
openssl rand -hex 24   # POSTGRES_PASSWORD
```

Never commit `.env`. The repository ignores it.

## 4. Start the stack

```bash
cd /opt/bizflow
docker compose up -d --build
docker compose ps
```

What happens:

- `db` starts PostgreSQL 16 and waits for `pg_isready`.
- `backend` runs `alembic upgrade head`, then starts uvicorn. Startup ensures the schema and seeds the demo workspace if enabled.
- `web` builds the React SPA and serves it through Nginx, proxying `/api` to `backend:8000`.

Verify:

```bash
curl -fsS http://127.0.0.1:8080/api/health | python3 -m json.tool
```

Expected: `"status":"ok"` and `"database":"ok"`.

Logs:

```bash
docker compose logs -f backend
docker compose logs -f web
```

## 5. TLS with host Nginx and Certbot

Install host Nginx and Certbot:

```bash
sudo apt-get install -y nginx certbot python3-certbot-nginx
```

Create `/etc/nginx/sites-available/bizflow`:

```nginx
server {
    listen 80;
    server_name bizflow.example.com;

    client_max_body_size 2m;

    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 130s;
    }
}
```

Enable and issue the certificate:

```bash
sudo ln -s /etc/nginx/sites-available/bizflow /etc/nginx/sites-enabled/bizflow
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d bizflow.example.com
```

Certbot rewrites the server block for HTTPS and installs a renewal timer. Verify auto-renewal:

```bash
sudo certbot renew --dry-run
```

Open `https://bizflow.example.com` and sign in.

## 6. Enable Vultr Serverless Inference (optional)

The app runs fully without an LLM key, using the deterministic planner and labeling itself honestly. To enable model-assisted intent extraction and report narratives:

1. In the Vultr portal, open **Serverless Inference** and create an API key.
2. Add it to `/opt/bizflow/.env`:

```dotenv
AI_PROVIDER=auto
VULTR_INFERENCE_API_KEY=<your-key>
VULTR_INFERENCE_BASE_URL=https://api.vultrinference.com/v1
VULTR_MODEL=deepseek-v4.1-flash-1017
AI_TIMEOUT_SECONDS=15
AI_MAX_RETRIES=1
```

3. Recreate the backend:

```bash
docker compose up -d backend
```

4. Confirm the mode:

```bash
curl -fsS https://bizflow.example.com/api/health | python3 -m json.tool
```

`ai.mode` should be `vultr` and `ai.available` should be `true`. If the key is missing or invalid, the app falls back to the deterministic planner and says so — it never fabricates model output.

> Verify the exact model identifier available to your Vultr account before changing `VULTR_MODEL`. The chat-completions endpoint is OpenAI-compatible.

## 7. Database operations

### Migrations

Migrations run automatically in the backend entrypoint (`RUN_MIGRATIONS=true`). To run them manually:

```bash
docker compose exec backend alembic upgrade head
docker compose exec backend alembic current
```

The repository includes a baseline migration (`0001` equivalent) plus Alembic configuration. For future model changes:

```bash
docker compose exec backend alembic revision --autogenerate -m "describe change"
docker compose exec backend alembic upgrade head
```

Always review autogenerated migrations before applying them to production.

### Backups

```bash
mkdir -p /opt/bizflow-backups
docker compose exec -T db pg_dump -U bizflow bizflow \
  | gzip > /opt/bizflow-backups/bizflow-$(date +%F-%H%M).sql.gz
```

Example cron (daily at 02:15, retain 14 days):

```cron
15 2 * * * cd /opt/bizflow && docker compose exec -T db pg_dump -U bizflow bizflow | gzip > /opt/bizflow-backups/bizflow-$(date +\%F).sql.gz && find /opt/bizflow-backups -name '*.sql.gz' -mtime +14 -delete
```

Restore:

```bash
gunzip -c backup.sql.gz | docker compose exec -T db psql -U bizflow -d bizflow
```

### Reset (destructive)

```bash
docker compose down -v   # removes the PostgreSQL volume
docker compose up -d --build
```

## 8. Updating

```bash
cd /opt/bizflow
git pull
docker compose up -d --build
docker compose exec backend alembic upgrade head
```

Migrations are forward-only; keep a database backup before each release and roll back the application image if needed. A schema rollback requires a restore.

## 9. Hardening checklist

- [ ] `JWT_SECRET` is long, random and unique to this deployment.
- [ ] `.env` is not readable by other users (`chmod 600 .env`).
- [ ] PostgreSQL is not published to the host or internet.
- [ ] `BIND_ADDRESS=127.0.0.1` when using host Nginx.
- [ ] TLS is active and HTTP redirects to HTTPS.
- [ ] `SEED_DEMO_DATA=false` for a private workspace; demo credentials are public knowledge.
- [ ] Backups run and have been restored once in a test environment.
- [ ] Vultr firewall restricts SSH to known addresses where possible.
- [ ] `/api/health` reports `database: ok`.
- [ ] Rate limiting is adequate for expected traffic (move to Redis before scaling out).

## 10. Troubleshooting

| Symptom | Check |
| --- | --- |
| `502 Bad Gateway` | `docker compose ps`; backend health; `docker compose logs backend` |
| `JWT_SECRET is required` | `.env` missing or not loaded; copy `.env.example` |
| Migration failure | Database credentials, `DATABASE_URL` host (`db` inside compose), `alembic current` |
| CORS errors | `CORS_ORIGINS` must include the exact browser origin including scheme |
| Login fails after redeploy | `SEED_DEMO_DATA` only seeds on first boot; confirm the database volume persisted |
| AI still in demo mode | `VULTR_INFERENCE_API_KEY` empty/invalid; restart backend; check `/api/health` |
| Workflow stuck `running` | Inspect backend logs; the executor fails closed and persists the error |

## 11. Alternative: run without Docker

For a small single-host install:

```bash
sudo apt-get install -y python3.12 python3.12-venv nginx postgresql
cd /opt/bizflow
python3.12 -m venv .venv
.venv/bin/pip install -r backend/requirements.txt

cd frontend && npm ci && npm run build && cd ..

cd backend
DATABASE_URL='postgresql+psycopg://bizflow:password@127.0.0.1:5432/bizflow' \
JWT_SECRET='<random>' \
FRONTEND_DIST=/opt/bizflow/frontend/dist \
PYTHONPATH=. ../.venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8000
```

Place host Nginx in front, pointing `proxy_pass http://127.0.0.1:8000`. For a service unit, use `Restart=always`, `WorkingDirectory=/opt/bizflow/backend`, and `EnvironmentFile=/opt/bizflow/.env`.
