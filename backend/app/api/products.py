from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.api.deps import AuthContext, get_auth_context, iso
from app.api.serializers import product_out
from app.db.session import get_db
from app.models import InventoryMovement, Product, ProductCategory
from app.schemas import CategoryCreate, ProductCreate, ProductUpdate, StockAdjustment
from app.services.audit import audit
from app.services.orders import BusinessRuleError

router = APIRouter(tags=["inventory"])


@router.get("/products")
def list_products(
    search: str | None = None,
    category_id: str | None = None,
    low_stock: bool = False,
    status: str | None = None,
    ctx: AuthContext = Depends(get_auth_context),
    db: Session = Depends(get_db),
):
    query = select(Product).where(Product.business_id == ctx.business.id)
    if search:
        term = f"%{search.strip().lower()}%"
        query = query.where(
            or_(
                func.lower(Product.name).like(term),
                func.lower(Product.sku).like(term),
                func.lower(Product.description).like(term),
            )
        )
    if category_id:
        query = query.where(Product.category_id == category_id)
    if low_stock:
        query = query.where(Product.stock_quantity <= Product.reorder_level)
    if status:
        query = query.where(Product.status == status)
    products = db.scalars(query.order_by(Product.name).limit(300)).all()
    return {
        "items": [product_out(db, p) for p in products],
        "total": len(products),
    }


@router.get("/products/{product_id}")
def get_product(
    product_id: str,
    ctx: AuthContext = Depends(get_auth_context),
    db: Session = Depends(get_db),
):
    product = db.get(Product, product_id)
    if not product or product.business_id != ctx.business.id:
        raise HTTPException(status_code=404, detail="Product not found")
    movements = db.scalars(
        select(InventoryMovement)
        .where(InventoryMovement.product_id == product.id)
        .order_by(InventoryMovement.created_at.desc())
        .limit(40)
    ).all()
    return {
        **product_out(db, product),
        "movements": [
            {
                "id": m.id,
                "movement_type": m.movement_type,
                "quantity": m.quantity,
                "stock_after": m.stock_after,
                "reason": m.reason,
                "reference": m.reference,
                "created_at": iso(m.created_at),
            }
            for m in movements
        ],
    }


@router.post("/products", status_code=201)
def create_product(
    payload: ProductCreate,
    ctx: AuthContext = Depends(get_auth_context),
    db: Session = Depends(get_db),
):
    sku = payload.sku.strip().upper()
    exists = db.scalar(
        select(Product).where(
            Product.business_id == ctx.business.id, Product.sku == sku
        )
    )
    if exists:
        raise HTTPException(status_code=409, detail="A product with this SKU already exists")
    if payload.category_id:
        category = db.get(ProductCategory, payload.category_id)
        if not category or category.business_id != ctx.business.id:
            raise HTTPException(status_code=400, detail="Invalid category")
    product = Product(
        business_id=ctx.business.id,
        category_id=payload.category_id,
        sku=sku,
        name=payload.name.strip(),
        description=payload.description,
        price=payload.price,
        cost=payload.cost,
        stock_quantity=payload.stock_quantity,
        reorder_level=payload.reorder_level,
        unit=payload.unit,
    )
    db.add(product)
    db.flush()
    if payload.stock_quantity:
        db.add(
            InventoryMovement(
                business_id=ctx.business.id,
                product_id=product.id,
                movement_type="in",
                quantity=payload.stock_quantity,
                stock_after=payload.stock_quantity,
                reason="Opening stock",
                reference="manual",
                created_by=ctx.user.id,
            )
        )
    audit(
        db,
        ctx.business.id,
        "product.created",
        "product",
        product.id,
        {"name": product.name, "stock": product.stock_quantity},
        ctx.user.id,
    )
    db.commit()
    db.refresh(product)
    return product_out(db, product)


@router.patch("/products/{product_id}")
def update_product(
    product_id: str,
    payload: ProductUpdate,
    ctx: AuthContext = Depends(get_auth_context),
    db: Session = Depends(get_db),
):
    product = db.get(Product, product_id)
    if not product or product.business_id != ctx.business.id:
        raise HTTPException(status_code=404, detail="Product not found")
    if payload.category_id:
        category = db.get(ProductCategory, payload.category_id)
        if not category or category.business_id != ctx.business.id:
            raise HTTPException(status_code=400, detail="Invalid category")
    for field in ["name", "description", "category_id", "price", "cost", "reorder_level", "status"]:
        value = getattr(payload, field)
        if value is not None:
            setattr(product, field, value)
    audit(
        db,
        ctx.business.id,
        "product.updated",
        "product",
        product.id,
        payload.model_dump(exclude_unset=True),
        ctx.user.id,
    )
    db.commit()
    db.refresh(product)
    return product_out(db, product)


@router.post("/products/{product_id}/stock")
def adjust_stock(
    product_id: str,
    payload: StockAdjustment,
    ctx: AuthContext = Depends(get_auth_context),
    db: Session = Depends(get_db),
):
    product = db.get(Product, product_id)
    if not product or product.business_id != ctx.business.id:
        raise HTTPException(status_code=404, detail="Product not found")
    before = product.stock_quantity
    try:
        if payload.movement_type == "in":
            delta = payload.quantity
            product.stock_quantity += payload.quantity
        elif payload.movement_type == "out":
            if payload.quantity > product.stock_quantity:
                raise BusinessRuleError(
                    f"Cannot remove {payload.quantity}; only {product.stock_quantity} in stock"
                )
            delta = -payload.quantity
            product.stock_quantity -= payload.quantity
        else:
            delta = payload.quantity - product.stock_quantity
            product.stock_quantity = payload.quantity
        movement = InventoryMovement(
            business_id=ctx.business.id,
            product_id=product.id,
            movement_type=payload.movement_type,
            quantity=delta,
            stock_after=product.stock_quantity,
            reason=payload.reason,
            reference="manual",
            created_by=ctx.user.id,
        )
        db.add(movement)
        audit(
            db,
            ctx.business.id,
            "inventory.adjusted",
            "product",
            product.id,
            {"before": before, "after": product.stock_quantity, "reason": payload.reason},
            ctx.user.id,
        )
        db.commit()
        db.refresh(product)
        return product_out(db, product)
    except BusinessRuleError as exc:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.get("/categories")
def list_categories(
    ctx: AuthContext = Depends(get_auth_context),
    db: Session = Depends(get_db),
):
    categories = db.scalars(
        select(ProductCategory)
        .where(ProductCategory.business_id == ctx.business.id)
        .order_by(ProductCategory.name)
    ).all()
    counts = dict(
        db.execute(
            select(Product.category_id, func.count())
            .where(Product.business_id == ctx.business.id)
            .group_by(Product.category_id)
        ).all()
    )
    return {
        "items": [
            {
                "id": c.id,
                "name": c.name,
                "description": c.description,
                "color": c.color,
                "product_count": counts.get(c.id, 0),
            }
            for c in categories
        ]
    }


@router.post("/categories", status_code=201)
def create_category(
    payload: CategoryCreate,
    ctx: AuthContext = Depends(get_auth_context),
    db: Session = Depends(get_db),
):
    exists = db.scalar(
        select(ProductCategory).where(
            ProductCategory.business_id == ctx.business.id,
            func.lower(ProductCategory.name) == payload.name.lower(),
        )
    )
    if exists:
        raise HTTPException(status_code=409, detail="Category already exists")
    category = ProductCategory(
        business_id=ctx.business.id,
        name=payload.name,
        description=payload.description,
        color=payload.color,
    )
    db.add(category)
    db.commit()
    db.refresh(category)
    return {
        "id": category.id,
        "name": category.name,
        "color": category.color,
        "product_count": 0,
    }
