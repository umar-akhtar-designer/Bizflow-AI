from __future__ import annotations


def _create_product(client, headers, **overrides):
    payload = {
        "name": "Test Widget",
        "sku": "TST-001",
        "price": 25.0,
        "cost": 10.0,
        "stock_quantity": 20,
        "reorder_level": 5,
    }
    payload.update(overrides)
    return client.post("/api/products", headers=headers, json=payload)


def test_create_product_records_opening_stock(client, account):
    response = _create_product(client, account["headers"])
    assert response.status_code == 201, response.text
    product = response.json()
    assert product["sku"] == "TST-001"
    assert product["stock_quantity"] == 20

    detail = client.get(
        f"/api/products/{product['id']}", headers=account["headers"]
    ).json()
    movements = detail["movements"]
    assert movements[0]["movement_type"] == "in"
    assert movements[0]["quantity"] == 20


def test_duplicate_sku_is_rejected(client, account):
    assert _create_product(client, account["headers"]).status_code == 201
    duplicate = _create_product(
        client, account["headers"], name="Another Widget", sku="tst-001"
    )
    assert duplicate.status_code == 409


def test_stock_adjustments_are_validated(client, account):
    product = _create_product(client, account["headers"]).json()
    url = f"/api/products/{product['id']}/stock"

    inbound = client.post(
        url,
        headers=account["headers"],
        json={"quantity": 5, "movement_type": "in", "reason": "Supplier delivery"},
    )
    assert inbound.status_code == 200
    assert inbound.json()["stock_quantity"] == 25

    outbound = client.post(
        url,
        headers=account["headers"],
        json={"quantity": 10, "movement_type": "out", "reason": "Damaged units"},
    )
    assert outbound.status_code == 200
    assert outbound.json()["stock_quantity"] == 15

    overdraw = client.post(
        url,
        headers=account["headers"],
        json={"quantity": 999, "movement_type": "out", "reason": "Impossible"},
    )
    assert overdraw.status_code == 400

    # The failed adjustment must not have changed the stock level.
    latest = client.get(
        f"/api/products/{product['id']}", headers=account["headers"]
    ).json()
    assert latest["stock_quantity"] == 15


def test_low_stock_filter_uses_real_levels(client, account):
    response = client.get(
        "/api/products", headers=account["headers"], params={"low_stock": "true"}
    )
    assert response.status_code == 200
    items = response.json()["items"]
    assert items
    # Desk Organiser ships with 8 units and a reorder level of 12.
    assert any(item["name"] == "Desk Organiser" for item in items)
    assert all(
        item["stock_quantity"] <= item["reorder_level"] for item in items
    )
