# syntax=docker/dockerfile:1
#
# Single-container image: builds the React SPA and serves it together with the
# FastAPI backend on one port.
#
# Use this for free single-service hosts (Render, Hugging Face Spaces, Koyeb,
# Fly.io). The existing docker-compose.yml keeps the 3-service setup
# (Postgres + API + Nginx) for a real VPS.

# ---------- build the frontend ----------
FROM node:20-slim AS web
WORKDIR /web
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# ---------- runtime ----------
FROM python:3.12-slim AS runtime

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    FRONTEND_DIST=/app/frontend-dist \
    PORT=8000

WORKDIR /app

RUN groupadd --system bizflow && useradd --system --gid bizflow --home /app bizflow

COPY backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY backend/ ./
COPY --from=web /web/dist ./frontend-dist

RUN chmod +x docker-entrypoint.sh && chown -R bizflow:bizflow /app

USER bizflow

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=25s --retries=3 \
  CMD python -c "import urllib.request,os; urllib.request.urlopen('http://127.0.0.1:'+os.getenv('PORT','8000')+'/api/health', timeout=4)"

ENTRYPOINT ["./docker-entrypoint.sh"]
