"""Database bootstrap."""
from __future__ import annotations

import logging

from app.core.config import settings
from app.db.session import Base, engine

logger = logging.getLogger("bizflow.db")


def init_db() -> None:
    import app.models  # noqa: F401 - registers all tables

    Base.metadata.create_all(bind=engine)
    logger.info("Database schema ensured at %s", settings.database_url.split("@")[-1])
    if settings.seed_demo_data:
        from app.services.seed import seed_demo_data

        try:
            seed_demo_data()
        except Exception:
            logger.exception("Demo seeding failed; application will still start")
