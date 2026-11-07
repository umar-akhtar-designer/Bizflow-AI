from __future__ import annotations

from fastapi.testclient import TestClient


def test_register_provisions_workspace_and_starter_catalog(client: TestClient):
    response = client.post(
        "/api/auth/register",
        json={
            "full_name": "Ada Lovelace",
            "email": "ada@example.com",
            "password": "analytical-engine-1",
            "business_name": "Analytical Engines",
        },
    )
    assert response.status_code == 201, response.text
    body = response.json()
    assert body["token_type"] == "bearer"
    assert body["access_token"]
    assert body["role"] == "owner"
    assert body["business"]["name"] == "Analytical Engines"

    headers = {"Authorization": f"Bearer {body['access_token']}"}
    products = client.get("/api/products", headers=headers).json()
    customers = client.get("/api/customers", headers=headers).json()
    assert products["total"] == 4
    assert customers["total"] == 2

    me = client.get("/api/auth/me", headers=headers)
    assert me.status_code == 200
    assert me.json()["user"]["email"] == "ada@example.com"


def test_duplicate_registration_is_rejected(client: TestClient, account: dict):
    response = client.post(
        "/api/auth/register",
        json={
            "full_name": "Copy Cat",
            "email": account["email"],
            "password": "another-password-1",
        },
    )
    assert response.status_code == 409


def test_login_and_password_validation(client: TestClient, account: dict):
    ok = client.post(
        "/api/auth/login",
        json={"email": account["email"], "password": account["password"]},
    )
    assert ok.status_code == 200
    assert ok.json()["access_token"]

    wrong = client.post(
        "/api/auth/login",
        json={"email": account["email"], "password": "definitely-wrong"},
    )
    assert wrong.status_code == 401


def test_protected_routes_require_a_token(client: TestClient):
    assert client.get("/api/products").status_code == 401
    assert client.get("/api/dashboard").status_code == 401
    assert client.get("/api/orders").status_code == 401


def test_workspaces_are_isolated(client: TestClient, account: dict):
    other = client.post(
        "/api/auth/register",
        json={
            "full_name": "Other Person",
            "email": "other@example.com",
            "password": "another-password-1",
        },
    )
    assert other.status_code == 201
    other_headers = {"Authorization": f"Bearer {other.json()['access_token']}"}

    products = client.get("/api/products", headers=account["headers"]).json()["items"]
    product_id = products[0]["id"]

    # The other workspace cannot read a product that belongs to the first one.
    response = client.get(f"/api/products/{product_id}", headers=other_headers)
    assert response.status_code == 404
