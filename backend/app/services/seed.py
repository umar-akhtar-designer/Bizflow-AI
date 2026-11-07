"""Demo data and starter workspace provisioning.

All dashboard numbers are computed from these real rows. The showcase workspace
is generated once on first startup and includes historical orders, invoices,
payments and three genuinely executed agent workflows (two success, one failure).
"""
from __future__ import annotations

import logging
import uuid
from datetime import timedelta

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import hash_password
from app.core.utils import utcnow
from app.db.session import SessionLocal
from app.models import (
    Business,
    BusinessMembership,
    Customer,
    InventoryMovement,
    Invoice,
    Notification,
    Product,
    ProductCategory,
    User,
)
from app.services.audit import audit
from app.services.orders import create_order, record_payment

logger = logging.getLogger("bizflow.seed")

DEMO_EMAIL = "demo@bizflow.ai"
DEMO_PASSWORD = "demo1234"

PRODUCT_SEED = [
    # name, sku, category, price, cost, final_stock, reorder, description
    ("Product A — Smart Sensor Kit", "PRA-100", "Sensors & IoT", 149.00, 82.00, 64, 12,
     "Eight-sensor IoT kit with BLE gateway support and cloud telemetry."),
    ("Product B — Gateway Hub", "PRB-200", "Sensors & IoT", 329.00, 190.00, 18, 6,
     "Edge gateway hub for up to 64 devices with local failover."),
    ("Nimbus Wireless Mouse", "NIM-120", "Office Tech", 39.00, 17.00, 42, 15,
     "Low-profile wireless mouse with multi-device pairing."),
    ("Vertex Mechanical Keyboard", "VTX-440", "Office Tech", 119.00, 62.00, 23, 8,
     "Hot-swappable mechanical keyboard with per-key lighting."),
    ("Aurora Desk Lamp", "AUR-310", "Office Tech", 89.00, 41.00, 7, 10,
     "Full-spectrum desk lamp with presence sensing and USB-C charging."),
    ("Flux USB-C Dock", "FLX-220", "Power & Cables", 159.00, 88.00, 5, 10,
     "12-in-1 dock with 100W passthrough, dual 4K display support."),
    ("Terra Monitor Stand", "TER-510", "Office Tech", 74.00, 33.00, 31, 10,
     "Solid oak monitor riser with cable routing channel."),
    ("Halo Conference Speaker", "HAL-330", "Accessories", 219.00, 118.00, 12, 6,
     "Room-filling speakerphone with echo cancellation for hybrid teams."),
    ("Pulse Power Strip", "PLS-140", "Power & Cables", 49.00, 21.00, 3, 12,
     "Surge-protected strip with USB-C PD and smart scheduling."),
    ("Orbit Webcam 4K", "ORB-260", "Accessories", 129.00, 71.00, 19, 8,
     "4K webcam with auto framing and dual noise-cancelling mics."),
    ("Slate Laptop Sleeve", "SLA-610", "Accessories", 34.00, 12.00, 55, 20,
     "Water-resistant recycled-fibre sleeve with accessory pocket."),
    ("Echo Desk Mic", "ECH-350", "Accessories", 99.00, 47.00, 9, 10,
     "Cardioid USB microphone with hardware mute and gain dial."),
]

CUSTOMER_SEED = [
    ("Ahmed Raza", "ahmed.raza@atlaslogistics.com", "+1 415 555 0134", "Atlas Logistics", "San Francisco, CA"),
    ("Sara Khan", "sara@meridianlabs.io", "+1 206 555 0198", "Meridian Labs", "Seattle, WA"),
    ("Daniel Ortiz", "daniel@brightlineretail.com", "+1 512 555 0110", "Brightline Retail", "Austin, TX"),
    ("Fatima Noor", "fatima@noorhealth.org", "+1 646 555 0177", "Noor Health", "New York, NY"),
    ("James Whitfield", "james@whitfieldco.com", "+1 312 555 0142", "Whitfield & Co", "Chicago, IL"),
    ("Aisha Siddiqui", "aisha@vertexedu.org", "+1 617 555 0165", "Vertex Education", "Boston, MA"),
    ("Noah Bennett", "noah@bennettdesign.studio", "+1 503 555 0189", "Bennett Design", "Portland, OR"),
    ("Li Wei", "li.wei@pacificsupply.co", "+1 213 555 0123", "Pacific Supply", "Los Angeles, CA"),
]

# days_ago, customer index, [(product index, qty)], payment state
HISTORY = [
    (26, 7, [(0, 2), (1, 1), (7, 1)], "paid"),
    (23, 6, [(10, 4), (4, 1)], "paid"),
    (20, 5, [(11, 2), (6, 1)], "paid"),
    (18, 4, [(8, 3), (9, 2)], "paid"),
    (16, 3, [(0, 3), (2, 1)], "paid"),
    (14, 2, [(7, 1), (3, 1)], "paid"),
    (12, 1, [(4, 1), (10, 3)], "paid"),
    (10, 0, [(6, 2), (5, 1)], "paid"),
    (8, 7, [(1, 1), (11, 1)], "paid"),
    (7, 0, [(0, 2), (2, 1)], "paid"),
    (6, 1, [(1, 1)], "partial"),
    (5, 2, [(4, 2), (6, 1)], "paid"),
    (4, 3, [(5, 1), (7, 1)], "partial"),
    (3, 4, [(0, 1), (9, 1)], "pending"),
    (2, 5, [(3, 2), (2, 2)], "pending"),
    (1, 6, [(10, 5), (8, 2)], "pending"),
]


def seed_starter_business(db: Session, business: Business) -> None:
    """Give a brand-new workspace enough data to use the AI manager immediately."""
    existing = db.scalar(
        select(func.count()).select_from(Product).where(
            Product.business_id == business.id
        )
    )
    if existing:
        return
    categories = [
        ProductCategory(business_id=business.id, name="General", color="#0B7A5C"),
        ProductCategory(business_id=business.id, name="Hardware", color="#B45309"),
        ProductCategory(business_id=business.id, name="Accessories", color="#1D4ED8"),
    ]
    db.add_all(categories)
    db.flush()
    starter = [
        ("Starter Sensor Kit", "STR-100", 0, 129.00, 68.00, 40, 10,
         "A compact sensor kit to get your first connected product live."),
        ("Workspace Hub", "STR-200", 1, 249.00, 140.00, 15, 5,
         "Central hub for the starter sensor range."),
        ("USB-C Cable Pack", "STR-300", 2, 29.00, 9.00, 60, 20,
         "Three braided USB-C cables in one pack."),
        ("Desk Organiser", "STR-400", 2, 44.00, 18.00, 8, 12,
         "Modular desk organiser with a magnetic base."),
    ]
    for name, sku, cat_index, price, cost, stock, reorder, description in starter:
        product = Product(
            business_id=business.id,
            category_id=categories[cat_index].id,
            sku=sku,
            name=name,
            description=description,
            price=price,
            cost=cost,
            stock_quantity=stock,
            reorder_level=reorder,
        )
        db.add(product)
        db.flush()
        db.add(
            InventoryMovement(
                business_id=business.id,
                product_id=product.id,
                movement_type="in",
                quantity=stock,
                stock_after=stock,
                reason="Opening stock",
                reference="starter",
            )
        )
    db.add_all(
        [
            Customer(
                business_id=business.id,
                name="Alex Morgan",
                email="alex@northstar-demo.com",
                company="Northstar Demo",
                address="Remote",
            ),
            Customer(
                business_id=business.id,
                name="Priya Sharma",
                email="priya@harbor-demo.com",
                company="Harbor Demo",
                address="Remote",
            ),
        ]
    )
    audit(
        db,
        business.id,
        "workspace.provisioned",
        "business",
        business.id,
        {"starter_products": 4, "starter_customers": 2},
    )


def seed_demo_data() -> None:
    db = SessionLocal()
    try:
        existing = db.scalar(select(User).where(User.email == DEMO_EMAIL))
        if existing:
            return
        logger.info("Seeding BizFlow demo workspace...")
        user = User(
            email=DEMO_EMAIL,
            full_name="Maya Chen",
            password_hash=hash_password(DEMO_PASSWORD),
            avatar_color="#0B7A5C",
        )
        business = Business(
            name="Northwind Supply Co.",
            legal_name="Northwind Supply Company LLC",
            email="ops@northwindsupply.co",
            phone="+1 415 555 0100",
            address="2140 Harrison St, San Francisco, CA",
            currency="USD",
            tax_rate=8.5,
            low_stock_threshold=10,
            invoice_prefix="INV",
        )
        db.add_all([user, business])
        db.flush()
        db.add(
            BusinessMembership(
                user_id=user.id, business_id=business.id, role="owner"
            )
        )
        db.flush()

        category_specs = [
            ("Sensors & IoT", "#0B7A5C"),
            ("Office Tech", "#B45309"),
            ("Power & Cables", "#1D4ED8"),
            ("Accessories", "#7C3AED"),
        ]
        categories = {}
        for name, color in category_specs:
            category = ProductCategory(
                business_id=business.id, name=name, color=color
            )
            db.add(category)
            db.flush()
            categories[name] = category

        # Compute opening stock so that after historical orders the stock lands
        # exactly on the intended current quantity.
        sold: dict[int, int] = {}
        for _days, _customer, items, _payment in HISTORY:
            for index, qty in items:
                sold[index] = sold.get(index, 0) + qty

        products = []
        for index, (
            name,
            sku,
            cat,
            price,
            cost,
            final_stock,
            reorder,
            description,
        ) in enumerate(PRODUCT_SEED):
            product = Product(
                business_id=business.id,
                category_id=categories[cat].id,
                sku=sku,
                name=name,
                description=description,
                price=price,
                cost=cost,
                stock_quantity=final_stock + sold.get(index, 0),
                reorder_level=reorder,
            )
            db.add(product)
            products.append(product)
        db.flush()

        customers = []
        for name, email, phone, company, address in CUSTOMER_SEED:
            customer = Customer(
                business_id=business.id,
                name=name,
                email=email,
                phone=phone,
                company=company,
                address=address,
            )
            db.add(customer)
            customers.append(customer)
        db.flush()

        now = utcnow()
        for index, (days_ago, customer_index, items, payment_state) in enumerate(HISTORY):
            product_items = [(products[p], qty) for p, qty in items]
            order, sale, invoice = create_order(
                db,
                business,
                customers[customer_index],
                product_items,
                channel="storefront",
                tax_rate=business.tax_rate,
            )
            created = now - timedelta(days=days_ago, hours=(index * 3) % 9, minutes=12)
            old_reference = order.order_number
            date_key = created.strftime("%Y%m%d")
            new_order_number = f"ORD-{date_key}-{1000 + index}"
            new_invoice_number = f"INV-{date_key}-{1000 + index}"
            order.order_number = new_order_number
            invoice.invoice_number = new_invoice_number
            order.created_at = created
            sale.sold_at = created
            invoice.issued_at = created
            invoice.due_date = created + timedelta(days=14)
            if days_ago > 10:
                order.status = "fulfilled"
            elif days_ago > 3:
                order.status = "processing"
            else:
                order.status = "confirmed"
            for movement in db.scalars(
                select(InventoryMovement).where(
                    InventoryMovement.reference == old_reference
                )
            ).all():
                movement.reference = new_order_number
                movement.created_at = created
            if payment_state in {"paid", "partial"}:
                amount = (
                    invoice.total
                    if payment_state == "paid"
                    else round(invoice.total * 0.5, 2)
                )
                record_payment(
                    db,
                    invoice,
                    amount,
                    method="bank_transfer",
                    reference=f"WIRE-{date_key}-{index}",
                )
                from app.models import Payment

                payment = db.scalar(
                    select(Payment)
                    .where(Payment.invoice_id == invoice.id)
                    .order_by(Payment.paid_at.desc())
                )
                if payment:
                    payment.paid_at = created + timedelta(days=1, hours=4)
                if payment_state == "paid":
                    invoice.paid_at = created + timedelta(days=1, hours=4)
            db.flush()

        audit(
            db,
            business.id,
            "demo.seeded",
            "business",
            business.id,
            {"orders": len(HISTORY), "products": len(products), "customers": len(customers)},
            user.id,
        )
        db.add_all(
            [
                Notification(
                    business_id=business.id,
                    title="Welcome to BizFlow AI",
                    message="Your workspace is ready. Try the AI Business Manager with a real order.",
                    level="info",
                    link="/app/manager",
                ),
                Notification(
                    business_id=business.id,
                    title="Low stock detected",
                    message="Pulse Power Strip is down to 3 units (reorder level 12).",
                    level="warning",
                    link="/app/inventory",
                ),
            ]
        )
        db.commit()
        business_id = business.id
        user_id = user.id
        db.close()

        # Execute real demo workflows so history, verification and approvals are
        # backed by actual agent runs rather than mocked cards.
        _run_demo_workflows(business_id, user_id)
        logger.info("Demo workspace ready — %s / %s", DEMO_EMAIL, DEMO_PASSWORD)
    finally:
        try:
            db.close()
        except Exception:
            pass


def _run_demo_workflows(business_id: str, user_id: str) -> None:
    from app.orchestration.executor import create_workflow, execute_workflow

    original_delay = settings.step_delay_ms
    object.__setattr__(settings, "step_delay_ms", 0)
    db = SessionLocal()
    try:
        business = db.get(Business, business_id)
        user = db.get(User, user_id)
        if not business or not user:
            return
        instructions = [
            "Process an order for Ahmed Raza for 2 units of Nimbus Wireless Mouse, generate the invoice, record the sale and prepare a confirmation message.",
            "Check low stock and prepare a restock request for the warehouse.",
            "Process an order for Sara Khan for 9999 units of Pulse Power Strip.",
        ]
        for instruction in instructions:
            workflow = create_workflow(
                db,
                business=business,
                user_id=user.id,
                instruction=instruction,
                idempotency_key=f"seed-{uuid.uuid4().hex}",
            )
            execute_workflow(workflow.id)
        db.commit()
    finally:
        object.__setattr__(settings, "step_delay_ms", original_delay)
        db.close()
