"""Root entrypoint for single-process hosts (FastAPI Cloud).

The application lives in ``backend/app``. This module puts ``backend`` on the
import path and re-exports the FastAPI instance so a host that expects
``main:app`` at the repository root can run it without moving any code.

Local Docker/VPS deployments are unaffected: they still run
``uvicorn app.main:app`` from inside ``backend/``.
"""
from __future__ import annotations

import os
import sys
import tempfile
from pathlib import Path

BACKEND = Path(__file__).resolve().parent / "backend"
if str(BACKEND) not in sys.path:
    sys.path.insert(0, str(BACKEND))

# Single-process hosts often mount the code directory read-only. Keep the
# demo SQLite database on the writable temp volume unless the host provides
# a real DATABASE_URL (e.g. Postgres).
os.environ.setdefault(
    "DATABASE_URL", f"sqlite:///{Path(tempfile.gettempdir()) / 'bizflow.db'}"
)

from app.main import app  # noqa: E402,F401

__all__ = ["app"]
