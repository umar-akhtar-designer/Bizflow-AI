from __future__ import annotations


def _run(client, account, instruction, key=None):
    payload = {"instruction": instruction}
    if key:
        payload["idempotency_key"] = key
    response = client.post("/api/workflows", headers=account["headers"], json=payload)
    assert response.status_code == 202, response.text
    workflow_id = response.json()["id"]
    # TestClient waits for FastAPI background tasks before returning, so the
    # workflow is already finished here. A GET confirms the persisted state.
    return client.get(
        f"/api/workflows/{workflow_id}", headers=account["headers"]
    ).json()


def test_order_to_cash_workflow_writes_and_verifies(client, account, catalog):
    product = catalog["products"]["Starter Sensor Kit"]
    before_stock = product["stock_quantity"]

    workflow = _run(
        client,
        account,
        "Process an order for Alex Morgan for 2 units of Starter Sensor Kit, "
        "generate the invoice, record the sale and prepare a confirmation message.",
    )

    assert workflow["intent"] == "order"
    assert workflow["status"] == "completed", workflow.get("error")
    assert workflow["verification_status"] == "verified"
    assert workflow["completed_tasks"] == workflow["task_count"]
    assert workflow["orders"], "the workflow must persist a real order"
    assert workflow["invoices"], "the workflow must persist a real invoice"

    order = workflow["orders"][0]
    invoice = workflow["invoices"][0]
    assert order["order_number"].startswith("ORD-")
    assert invoice["invoice_number"].startswith("INV-")
    assert invoice["total"] == order["total"]

    # Every completed task must be backed by an execution record.
    assert len(workflow["executions"]) == workflow["task_count"]
    assert all(item["status"] == "ok" for item in workflow["executions"])
    verified_tasks = [task for task in workflow["tasks"] if task["verified"]]
    assert verified_tasks, "verification must read records back"

    # Stock really changed, not just the response payload.
    updated = client.get(
        f"/api/products/{product['id']}", headers=account["headers"]
    ).json()
    assert updated["stock_quantity"] == before_stock - 2

    # The customer message is prepared but not executed.
    messages = [
        approval
        for approval in workflow["approvals"]
        if approval["action_type"] == "send_customer_message"
    ]
    assert messages
    assert messages[0]["status"] == "pending"
    assert messages[0]["payload"]["delivery_status"] == "not_sent"


def test_insufficient_stock_workflow_stops_before_writes(client, account, catalog):
    product = catalog["products"]["Starter Sensor Kit"]
    before_stock = product["stock_quantity"]
    before_orders = client.get("/api/orders", headers=account["headers"]).json()["total"]

    workflow = _run(
        client,
        account,
        "Process an order for Alex Morgan for 500 units of Starter Sensor Kit.",
    )

    assert workflow["status"] == "failed"
    assert workflow["verification_status"] == "failed"
    assert workflow["error"] and "Insufficient stock" in workflow["error"]
    assert workflow["orders"] == []
    assert workflow["invoices"] == []

    after_orders = client.get("/api/orders", headers=account["headers"]).json()["total"]
    after_stock = client.get(
        f"/api/products/{product['id']}", headers=account["headers"]
    ).json()["stock_quantity"]
    assert after_orders == before_orders
    assert after_stock == before_stock

    failed = [task for task in workflow["tasks"] if task["status"] == "failed"]
    assert failed, "the failing step must be recorded"
    skipped = [task for task in workflow["tasks"] if task["status"] == "skipped"]
    assert skipped, "later steps must be skipped, never silently completed"


def test_restock_workflow_prepares_without_changing_stock(client, account, catalog):
    product = catalog["products"]["Desk Organiser"]
    before_stock = product["stock_quantity"]

    workflow = _run(
        client,
        account,
        "Check low stock and prepare a restock request for the warehouse.",
    )

    assert workflow["intent"] == "restock"
    assert workflow["status"] == "completed", workflow.get("error")
    restocks = [
        approval
        for approval in workflow["approvals"]
        if approval["action_type"] == "restock_products"
    ]
    assert restocks
    approval = restocks[0]
    assert approval["status"] == "pending"
    assert approval["payload"]["delivery_status"] == "not_executed"

    # Preparation must not mutate stock.
    unchanged = client.get(
        f"/api/products/{product['id']}", headers=account["headers"]
    ).json()
    assert unchanged["stock_quantity"] == before_stock

    item = next(
        entry
        for entry in approval["payload"]["items"]
        if entry["product_id"] == product["id"]
    )
    approved = client.post(
        f"/api/approvals/{approval['id']}/approve",
        headers=account["headers"],
        json={"note": "Approved by the test suite"},
    )
    assert approved.status_code == 200, approved.text
    assert approved.json()["status"] == "approved"
    assert approved.json()["payload"]["delivery_status"] == "executed"

    after = client.get(
        f"/api/products/{product['id']}", headers=account["headers"]
    ).json()
    assert after["stock_quantity"] == before_stock + int(item["recommended_restock"])


def test_rejected_approval_never_executes(client, account, catalog):
    product = catalog["products"]["Desk Organiser"]
    before_stock = product["stock_quantity"]
    workflow = _run(
        client,
        account,
        "Check low stock and prepare a restock request for the warehouse.",
    )
    approval = next(
        a for a in workflow["approvals"] if a["action_type"] == "restock_products"
    )

    rejected = client.post(
        f"/api/approvals/{approval['id']}/reject",
        headers=account["headers"],
        json={"note": "Not this quarter"},
    )
    assert rejected.status_code == 200
    assert rejected.json()["status"] == "rejected"
    assert rejected.json()["payload"]["delivery_status"] == "rejected"

    after = client.get(
        f"/api/products/{product['id']}", headers=account["headers"]
    ).json()
    assert after["stock_quantity"] == before_stock

    # A decided request cannot be decided twice.
    again = client.post(
        f"/api/approvals/{approval['id']}/approve",
        headers=account["headers"],
        json={"note": "too late"},
    )
    assert again.status_code == 409


def test_workflow_idempotency_key_prevents_duplicates(client, account):
    key = "workflow-idempotency-test"
    first = client.post(
        "/api/workflows",
        headers=account["headers"],
        json={
            "instruction": "Give me a weekly business report with sales trends.",
            "idempotency_key": key,
        },
    )
    second = client.post(
        "/api/workflows",
        headers=account["headers"],
        json={
            "instruction": "Give me a weekly business report with sales trends.",
            "idempotency_key": key,
        },
    )
    assert first.status_code == 202
    assert second.status_code == 202
    assert first.json()["id"] == second.json()["id"]
