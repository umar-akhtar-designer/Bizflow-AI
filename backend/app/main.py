from __future__ import annotations

import logging
import os
import time
from collections import defaultdict, deque
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles

from app.api import (
    agents,
    approvals,
    auth,
    customers,
    dashboard,
    health,
    invoices,
    notifications,
    orders,
    products,
    reports,
    settings as settings_routes,
    workflows,
)
from app.core.config import settings
from app.db.init import init_db
from app.orchestration.llm import ai_status

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s %(message)s",
)
logger = logging.getLogger("bizflow")


@asynccontextmanager
async def lifespan(_app: FastAPI):
    init_db()
    status = ai_status()
    logger.info("BizFlow AI starting — AI mode: %s", status["label"])
    if settings.jwt_secret.startswith("dev-only"):
        logger.warning(
            "Using the development JWT secret. Set JWT_SECRET before deploying."
        )
    yield


app = FastAPI(
    title="BizFlow AI",
    description=(
        "Autonomous business operations platform: natural-language instructions "
        "become verified, tool-bound multi-agent workflows."
    ),
    version=settings.version,
    lifespan=lifespan,
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "X-Idempotency-Key"],
)

# In-process sliding-window rate limiter. For multi-worker deployments use a
# shared store (Redis) — documented in README.
_buckets: dict[str, deque[float]] = defaultdict(deque)


@app.middleware("http")
async def security_and_rate_limit(request: Request, call_next):
    if request.url.path.startswith("/api") and request.method != "OPTIONS":
        key = f"{request.client.host if request.client else 'unknown'}:{request.url.path.split('/')[2] if len(request.url.path.split('/')) > 2 else ''}"
        now = time.monotonic()
        bucket = _buckets[key]
        while bucket and now - bucket[0] > 60:
            bucket.popleft()
        if len(bucket) >= settings.rate_limit_per_minute:
            return JSONResponse(
                status_code=429,
                content={"detail": "Too many requests. Please slow down."},
                headers={"Retry-After": "60"},
            )
        bucket.append(now)

    started = time.perf_counter()
    response = await call_next(request)
    response.headers["X-Process-Time-Ms"] = f"{(time.perf_counter() - started) * 1000:.1f}"
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
    return response


api_routers = [
    auth.router,
    dashboard.router,
    products.router,
    customers.router,
    orders.router,
    invoices.router,
    workflows.router,
    approvals.router,
    reports.router,
    settings_routes.router,
    notifications.router,
    agents.router,
    health.router,
]
for router in api_routers:
    app.include_router(router, prefix="/api")


@app.get("/api")
def api_index():
    return {
        "service": settings.app_name,
        "version": settings.version,
        "docs": "/api/docs",
        "health": "/api/health",
        "ai": ai_status(),
    }


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    logger.exception("Unhandled error on %s %s", request.method, request.url.path)
    return JSONResponse(
        status_code=500,
        content={"detail": "An unexpected error occurred. The action was not completed."},
    )


# Optional single-process deployment: serve the built React app from FastAPI.
FRONTEND_DIST = Path(
    os.getenv(
        "FRONTEND_DIST",
        str(Path(__file__).resolve().parents[2] / "frontend" / "dist"),
    )
)
if FRONTEND_DIST.is_dir() and (FRONTEND_DIST / "index.html").exists():
    assets = FRONTEND_DIST / "assets"
    if assets.is_dir():
        app.mount("/assets", StaticFiles(directory=assets), name="assets")

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        candidate = FRONTEND_DIST / full_path
        if candidate.is_file():
            return FileResponse(candidate)
        return FileResponse(FRONTEND_DIST / "index.html")

    logger.info("Serving frontend build from %s", FRONTEND_DIST)
