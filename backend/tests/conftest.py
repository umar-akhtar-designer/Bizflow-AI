"""Test harness for BizFlow AI.

The environment is configured *before* importing the app so the SQLAlchemy
engine points at a disposable SQLite database and demo seeding is disabled.
"""
from __future__ import annotations

import os
import tempfile
import uuid
from pathlib import Path

_TMP = Path(tempfile.mkdtemp(prefix="bizflow-tests-"))

os.environ["DATABASE_URL"] = f"sqlite:///{_TMP / 'test.db'}"
os.environ["SEED_DEMO_DATA"] = "false"
os.environ["WORKFLOW_STEP_DELAY_MS"] = "0"
os.environ["RATE_LIMIT_PER_MINUTE"] = "100000"
os.environ["JWT_SECRET"] = "test-only-secret-not-for-production"
os.environ["ENVIRONMENT"] = "test"

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

from app.db.session import Base, SessionLocal, engine  # noqa: E402
from app.main import app  # noqa: E402


@pytest.fixture(scope="session", autouse=True)
def _schema():
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)
    engine.dispose()


@pytest.fixture()
def client():
    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture()
def account(client: TestClient):
    """Register an isolated workspace and return auth headers + workspace info."""
    email = f"tester-{uuid.uuid4().hex[:10]}@example.com"
    response = client.post(
        "/api/auth/register",
        json={
            "full_name": "Test Operator",
            "email": email,
            "password": "strong-pass-123",
            "business_name": "Test Workspace",
        },
    )
    assert response.status_code == 201, response.text
    payload = response.json()
    headers = {"Authorization": f"Bearer {payload['access_token']}"}
    return {
        "headers": headers,
        "email": email,
        "password": "strong-pass-123",
        "user": payload["user"],
        "business": payload["business"],
    }


@pytest.fixture()
def catalog(client: TestClient, account: dict):
    """Resolve the starter products and customers provisioned on registration."""
    products = client.get("/api/products", headers=account["headers"]).json()["items"]
    customers = client.get("/api/customers", headers=account["headers"]).json()["items"]
    return {
        "products": {product["name"]: product for product in products},
        "customers": {customer["name"]: customer for customer in customers},
    }


def db_session():
    return SessionLocal()
