from __future__ import annotations


def _order_payload(catalog, quantity=2, key=None):
    product = catalog["products"]["Starter Sensor Kit"]
    customer = catalog["customers"]["Alex Morgan"]
    payload = {
        "customer_id": customer["id"],
        "items": [{"product_id": product["id"], "quantity": quantity}],
        "notes": "Created by the test suite",
    }
    if key:
        payload["idempotency_key"] = key
    return payload


def test_order_creates_order_sale_and_invoice_atomically(client, account, catalog):
    product = catalog["products"]["Starter Sensor Kit"]
    before = product["stock_quantity"]

    response = client.post(
        "/api/orders", headers=account["headers"], json=_order_payload(catalog)
    )
    assert response.status_code == 201, response.text
    order = response.json()
    assert order["order_number"].startswith("ORD-")
    assert order["total"] > 0
    assert len(order["items"]) == 1

    # Stock was decremented by exactly the ordered quantity.
    updated = client.get(
        f"/api/products/{product['id']}", headers=account["headers"]
    ).json()
    assert updated["stock_quantity"] == before - 2

    # An invoice exists for the order and starts as pending.
    invoices = client.get("/api/invoices", headers=account["headers"]).json()["items"]
    invoice = next(i for i in invoices if i["order_number"] == order["order_number"])
    assert invoice["status"] == "pending"
    assert invoice["total"] == order["total"]
    assert invoice["balance"] == order["total"]

    # The sale is reflected in analytics, computed from persisted records.
    analytics = client.get(
        "/api/sales/analytics",
        headers=account["headers"],
        params={"days": "7"},
    ).json()
    assert analytics["orders"] >= 1
    assert analytics["revenue"] >= order["total"]


def test_insufficient_stock_fails_without_writes(client, account, catalog):
    product = catalog["products"]["Starter Sensor Kit"]
    before_stock = product["stock_quantity"]
    before_orders = client.get("/api/orders", headers=account["headers"]).json()["total"]
    before_invoices = client.get(
        "/api/invoices", headers=account["headers"]
    ).json()["total"]

    response = client.post(
        "/api/orders",
        headers=account["headers"],
        json=_order_payload(catalog, quantity=100000),
    )
    assert response.status_code == 400
    assert "Insufficient stock" in response.json()["detail"]

    after_orders = client.get("/api/orders", headers=account["headers"]).json()["total"]
    after_invoices = client.get(
        "/api/invoices", headers=account["headers"]
    ).json()["total"]
    after_stock = client.get(
        f"/api/products/{product['id']}", headers=account["headers"]
    ).json()["stock_quantity"]

    assert after_orders == before_orders
    assert after_invoices == before_invoices
    assert after_stock == before_stock


def test_idempotency_key_returns_the_same_order(client, account, catalog):
    key = "test-idempotent-order-1"
    first = client.post(
        "/api/orders",
        headers=account["headers"],
        json=_order_payload(catalog, key=key),
    )
    assert first.status_code == 201
    second = client.post(
        "/api/orders",
        headers=account["headers"],
        json=_order_payload(catalog, key=key),
    )
    assert second.status_code == 201
    assert first.json()["id"] == second.json()["id"]

    orders = client.get("/api/orders", headers=account["headers"]).json()["items"]
    matching = [o for o in orders if o["id"] == first.json()["id"]]
    assert len(matching) == 1


def test_payments_transition_invoice_status(client, account, catalog):
    order = client.post(
        "/api/orders", headers=account["headers"], json=_order_payload(catalog, quantity=1)
    ).json()
    invoices = client.get("/api/invoices", headers=account["headers"]).json()["items"]
    invoice = next(i for i in invoices if i["order_number"] == order["order_number"])
    url = f"/api/invoices/{invoice['id']}/payments"

    half = round(invoice["total"] / 2, 2)
    partial = client.post(
        url,
        headers=account["headers"],
        json={"amount": half, "method": "bank_transfer", "reference": "TEST-1"},
    )
    assert partial.status_code == 201, partial.text
    assert partial.json()["status"] == "partial"
    assert partial.json()["balance"] > 0

    overpay = client.post(
        url,
        headers=account["headers"],
        json={"amount": invoice["total"] * 2, "method": "card"},
    )
    assert overpay.status_code == 400

    remaining = client.get(
        f"/api/invoices/{invoice['id']}", headers=account["headers"]
    ).json()["balance"]
    final = client.post(
        url,
        headers=account["headers"],
        json={"amount": remaining, "method": "card", "reference": "TEST-2"},
    )
    assert final.status_code == 201, final.text
    assert final.json()["status"] == "paid"
    assert final.json()["balance"] == 0

    summary = client.get("/api/finance/summary", headers=account["headers"]).json()
    assert summary["collected"] >= invoice["total"]


def test_paid_order_cannot_be_cancelled_without_refund(client, account, catalog):
    product = catalog["products"]["Starter Sensor Kit"]
    stock_after_order = product["stock_quantity"] - 1
    order = client.post(
        "/api/orders",
        headers=account["headers"],
        json=_order_payload(catalog, quantity=1),
    ).json()
    invoices = client.get("/api/invoices", headers=account["headers"]).json()["items"]
    invoice = next(i for i in invoices if i["order_number"] == order["order_number"])
    paid = client.post(
        f"/api/invoices/{invoice['id']}/payments",
        headers=account["headers"],
        json={"amount": 10.0, "method": "cash"},
    )
    assert paid.status_code == 201

    blocked = client.patch(
        f"/api/orders/{order['id']}/status",
        headers=account["headers"],
        json={"status": "cancelled"},
    )
    assert blocked.status_code == 400
    assert "refund approval" in blocked.json()["detail"].lower()

    # Stock was not restored and the invoice was not voided by the refused action.
    latest_product = client.get(
        f"/api/products/{product['id']}", headers=account["headers"]
    ).json()
    latest_invoice = client.get(
        f"/api/invoices/{invoice['id']}", headers=account["headers"]
    ).json()
    assert latest_product["stock_quantity"] == stock_after_order
    assert latest_invoice["status"] == "partial"


def test_unpaid_order_cancellation_restores_stock(client, account, catalog):
    product = catalog["products"]["Starter Sensor Kit"]
    stock_after_order = product["stock_quantity"] - 1
    order = client.post(
        "/api/orders",
        headers=account["headers"],
        json=_order_payload(catalog, quantity=1),
    ).json()

    cancelled = client.patch(
        f"/api/orders/{order['id']}/status",
        headers=account["headers"],
        json={"status": "cancelled"},
    )
    assert cancelled.status_code == 200
    assert cancelled.json()["status"] == "cancelled"

    restored = client.get(
        f"/api/products/{product['id']}", headers=account["headers"]
    ).json()
    assert restored["stock_quantity"] == stock_after_order + 1
