from fastapi import FastAPI, Depends, HTTPException, status, File, UploadFile, Form, Query, Request
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional
from slowapi import Limiter
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from fastapi.responses import JSONResponse
import os
import shutil
import uuid
import math
import csv
import io

import models
import schemas
import auth
from database import engine, get_db, Base
from mpesa import mpesa as mpesa_client

# Create tables
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Shalina Mart API", version="2.0.0")

# Rate limiting
limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter


@app.exception_handler(RateLimitExceeded)
async def rate_limit_handler(request: Request, exc: RateLimitExceeded):
    return JSONResponse(
        status_code=429,
        content={"detail": "Too many requests. Please try again later."}
    )


# CORS — restrict to known origins
ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000,http://localhost:5173").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Uploads directory
UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

ALLOWED_IMAGE_EXTENSIONS = {"jpg", "jpeg", "png", "gif", "webp", "svg"}
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5MB

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")


# ────────────────────────────────────────
# AUTH DEPENDENCIES
# ────────────────────────────────────────

async def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = auth.decode_access_token(token)
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
    except Exception:
        raise credentials_exception
    user = db.query(models.User).filter(models.User.email == email).first()
    if user is None:
        raise credentials_exception
    return user


async def get_admin_user(current_user: models.User = Depends(get_current_user)):
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user


def get_optional_user(token: Optional[str] = Depends(OAuth2PasswordBearer(tokenUrl="token", auto_error=False)), db: Session = Depends(get_db)):
    """Returns user if authenticated, None otherwise."""
    if not token:
        return None
    try:
        payload = auth.decode_access_token(token)
        email = payload.get("sub")
        if email:
            return db.query(models.User).filter(models.User.email == email).first()
    except Exception:
        pass
    return None


# ────────────────────────────────────────
# AUTH ROUTES
# ────────────────────────────────────────

@app.post("/register", response_model=schemas.User)
def register(user: schemas.UserCreate, db: Session = Depends(get_db)):
    # Validate password strength
    pwd_error = auth.validate_password_strength(user.password)
    if pwd_error:
        raise HTTPException(status_code=400, detail=pwd_error)

    db_user = db.query(models.User).filter(models.User.email == user.email).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")

    hashed_pass = auth.get_password_hash(user.password)
    new_user = models.User(
        email=user.email,
        hashed_password=hashed_pass,
        full_name=user.full_name,
        phone_number=user.phone_number
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user


@app.post("/token", response_model=schemas.Token)
@limiter.limit("10/minute")
def login(request: Request, form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == form_data.username).first()
    if not user or not auth.verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token = auth.create_access_token(data={"sub": user.email, "is_admin": user.is_admin})
    return {"access_token": access_token, "token_type": "bearer"}


@app.get("/profile", response_model=schemas.User)
async def get_profile(current_user: models.User = Depends(get_current_user)):
    return current_user


# ────────────────────────────────────────
# PRODUCT ROUTES
# ────────────────────────────────────────

@app.get("/products", response_model=schemas.PaginatedProducts)
def get_products(
    category: Optional[str] = None,
    search: Optional[str] = None,
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db)
):
    query = db.query(models.Product).options(joinedload(models.Product.product_images))
    if category:
        query = query.filter(models.Product.category == category)
    if search:
        query = query.filter(models.Product.name.ilike(f"%{search}%"))

    total = query.count()
    pages = math.ceil(total / per_page) if total > 0 else 1
    items = query.order_by(models.Product.created_at.desc()).offset((page - 1) * per_page).limit(per_page).all()

    return schemas.PaginatedProducts(
        items=items,
        total=total,
        page=page,
        per_page=per_page,
        pages=pages,
    )


@app.get("/products/{product_id}", response_model=schemas.Product)
def get_product(product_id: int, db: Session = Depends(get_db)):
    product = db.query(models.Product).options(
        joinedload(models.Product.product_images)
    ).filter(models.Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return product


@app.post("/products", response_model=schemas.Product)
async def create_product(
    name: str = Form(...),
    category: str = Form(...),
    description: str = Form(""),
    price: float = Form(...),
    original_price: Optional[float] = Form(None),
    stock: int = Form(0),
    badge: Optional[str] = Form(None),
    files: List[UploadFile] = File(...),
    db: Session = Depends(get_db),
    admin: models.User = Depends(get_admin_user)
):
    saved_images = []
    for file in files:
        # Validate file type
        file_ext = file.filename.split(".")[-1].lower() if file.filename else ""
        if file_ext not in ALLOWED_IMAGE_EXTENSIONS:
            raise HTTPException(status_code=400, detail=f"File type '.{file_ext}' not allowed. Allowed: {', '.join(ALLOWED_IMAGE_EXTENSIONS)}")

        file_name = f"{uuid.uuid4()}.{file_ext}"
        file_path = os.path.join(UPLOAD_DIR, file_name)
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        saved_images.append(f"/uploads/{file_name}")

    new_p = models.Product(
        name=name,
        category=category,
        description=description,
        price=price,
        original_price=original_price,
        stock=stock,
        badge=badge,
        images=",".join(saved_images)  # Legacy compat
    )
    db.add(new_p)
    db.flush()

    # Create ProductImage records
    for i, url in enumerate(saved_images):
        img = models.ProductImage(product_id=new_p.id, url=url, sort_order=i)
        db.add(img)

    db.commit()
    db.refresh(new_p)
    return new_p


@app.put("/products/{product_id}", response_model=schemas.Product)
def update_product(
    product_id: int,
    updates: schemas.ProductUpdate,
    db: Session = Depends(get_db),
    admin: models.User = Depends(get_admin_user)
):
    product = db.query(models.Product).filter(models.Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    update_data = updates.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(product, key, value)

    db.commit()
    db.refresh(product)
    return product


@app.delete("/products/{product_id}")
def delete_product(
    product_id: int,
    db: Session = Depends(get_db),
    admin: models.User = Depends(get_admin_user)
):
    product = db.query(models.Product).filter(models.Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    # Clean up image files
    if product.images:
        for img_url in product.images.split(","):
            file_path = img_url.lstrip("/")
            if os.path.exists(file_path):
                os.remove(file_path)

    db.delete(product)
    db.commit()
    return {"detail": "Product deleted successfully"}


@app.get("/categories")
def get_categories(db: Session = Depends(get_db)):
    """Return list of unique product categories."""
    categories = db.query(models.Product.category).distinct().all()
    return [c[0] for c in categories if c[0]]


@app.post("/products/upload-csv")
async def upload_products_csv(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    admin: models.User = Depends(get_admin_user)
):
    """
    Bulk upload products via CSV.
    Expected headers: name, category, price, description, stock, badge, image_url
    """
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="Only CSV files are allowed")

    try:
        content = await file.read()
        decoded = content.decode("utf-8")
        csv_reader = csv.DictReader(io.StringIO(decoded))
        
        products_created = 0
        for row in csv_reader:
            # Basic validation
            name = row.get("name")
            price_str = row.get("price")
            
            if not name or not price_str:
                continue

            try:
                price = float(price_str)
                original_price = float(row.get("original_price")) if row.get("original_price") else None
                stock = int(row.get("stock", 0)) if row.get("stock") else 0
            except (ValueError, TypeError):
                continue # Skip rows with invalid numbers

            new_p = models.Product(
                name=name,
                category=row.get("category", "General"),
                description=row.get("description", ""),
                price=price,
                original_price=original_price,
                stock=stock,
                badge=row.get("badge"),
                images=row.get("image_url")
            )
            db.add(new_p)
            db.flush()
            
            # Handle image_url(s)
            image_url = row.get("image_url")
            if image_url:
                urls = [u.strip() for u in image_url.split(",") if u.strip()]
                for i, url in enumerate(urls):
                    img = models.ProductImage(product_id=new_p.id, url=url, sort_order=i)
                    db.add(img)
            
            products_created += 1
            
        db.commit()
        return {"detail": f"Successfully imported {products_created} products"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error processing CSV: {str(e)}")


# ────────────────────────────────────────
# WISHLIST ROUTES
# ────────────────────────────────────────

@app.post("/wishlist", response_model=schemas.WishlistItem)
def add_to_wishlist(item: schemas.WishlistItemBase, db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    # Check if already in wishlist
    existing = db.query(models.WishlistItem).filter(
        models.WishlistItem.user_id == user.id,
        models.WishlistItem.product_id == item.product_id
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Already in wishlist")

    db_item = models.WishlistItem(user_id=user.id, product_id=item.product_id)
    db.add(db_item)
    db.commit()
    db.refresh(db_item)
    return db_item


@app.get("/wishlist", response_model=List[schemas.WishlistItem])
def get_wishlist(db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    return db.query(models.WishlistItem).options(
        joinedload(models.WishlistItem.product)
    ).filter(models.WishlistItem.user_id == user.id).all()


@app.delete("/wishlist/{product_id}")
def remove_from_wishlist(product_id: int, db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    item = db.query(models.WishlistItem).filter(
        models.WishlistItem.user_id == user.id,
        models.WishlistItem.product_id == product_id
    ).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not in wishlist")
    db.delete(item)
    db.commit()
    return {"detail": "Removed from wishlist"}


# ────────────────────────────────────────
# ORDER ROUTES
# ────────────────────────────────────────

@app.post("/orders")
def create_order(
    order_in: schemas.OrderCreate,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user)
):
    total = 0
    order_items = []

    for item in order_in.items:
        product = db.query(models.Product).filter(models.Product.id == item.product_id).first()
        if not product:
            raise HTTPException(status_code=404, detail=f"Product {item.product_id} not found")

        # Stock validation
        if product.stock < item.quantity:
            raise HTTPException(
                status_code=400,
                detail=f"Insufficient stock for '{product.name}'. Available: {product.stock}, Requested: {item.quantity}"
            )

        total += product.price * item.quantity
        order_items.append((product, item.quantity))

    # Decrement stock
    for product, qty in order_items:
        product.stock -= qty

    # Create the order
    db_order = models.Order(
        user_id=user.id,
        total_amount=total,
        status="pending",
        delivery_address=order_in.delivery_address,
        delivery_phone=order_in.delivery_phone or user.phone_number,
    )
    db.add(db_order)
    db.flush()

    # Link items to order
    for product, qty in order_items:
        db_item = models.OrderItem(
            order_id=db_order.id,
            product_id=product.id,
            quantity=qty,
            price_at_purchase=product.price
        )
        db.add(db_item)

    db.commit()
    db.refresh(db_order)

    # Trigger M-Pesa STK Push
    callback_url = os.getenv("MPESA_CALLBACK_URL", "https://your-domain.com/mpesa/callback")
    phone = order_in.delivery_phone or user.phone_number or "254700000000"

    try:
        response = mpesa_client.stk_push(
            amount=int(total),
            phone_number=phone,
            callback_url=callback_url,
            account_ref=f"ORD-{db_order.id}"
        )

        if "CheckoutRequestID" in response:
            db_order.mpesa_checkout_id = response["CheckoutRequestID"]
            db.commit()
            return {"status": "success", "order_id": db_order.id, "mpesa": response}

        return {"status": "pending", "order_id": db_order.id, "message": "Order created. M-Pesa push may have failed.", "details": response}
    except Exception:
        # Order is still created even if M-Pesa fails
        return {"status": "pending", "order_id": db_order.id, "message": "Order created. Payment pending."}


@app.get("/orders", response_model=List[schemas.Order])
def get_my_orders(db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    return db.query(models.Order).options(
        joinedload(models.Order.items).joinedload(models.OrderItem.product)
    ).filter(models.Order.user_id == user.id).order_by(models.Order.created_at.desc()).all()


@app.get("/orders/admin", response_model=List[schemas.Order])
def get_all_orders(
    status_filter: Optional[str] = None,
    db: Session = Depends(get_db),
    admin: models.User = Depends(get_admin_user)
):
    query = db.query(models.Order).options(
        joinedload(models.Order.items).joinedload(models.OrderItem.product)
    )
    if status_filter:
        query = query.filter(models.Order.status == status_filter)
    return query.order_by(models.Order.created_at.desc()).all()


@app.put("/orders/{order_id}/status")
def update_order_status(
    order_id: int,
    update: schemas.OrderStatusUpdate,
    db: Session = Depends(get_db),
    admin: models.User = Depends(get_admin_user)
):
    order = db.query(models.Order).filter(models.Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    valid_statuses = {"pending", "paid", "shipped", "delivered", "cancelled", "failed"}
    if update.status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: {', '.join(valid_statuses)}")

    # If cancelling, restore stock
    if update.status == "cancelled" and order.status != "cancelled":
        for item in order.items:
            product = db.query(models.Product).filter(models.Product.id == item.product_id).first()
            if product:
                product.stock += item.quantity

    order.status = update.status
    db.commit()
    return {"detail": f"Order #{order_id} status updated to '{update.status}'"}


# ────────────────────────────────────────
# M-PESA CALLBACK
# ────────────────────────────────────────

@app.post("/mpesa/callback")
async def mpesa_callback(data: dict, db: Session = Depends(get_db)):
    stk_callback = data.get("Body", {}).get("stkCallback", {})
    result_code = stk_callback.get("ResultCode")
    checkout_id = stk_callback.get("CheckoutRequestID")

    order = db.query(models.Order).filter(models.Order.mpesa_checkout_id == checkout_id).first()
    if order:
        if result_code == 0:
            order.status = "paid"
        else:
            order.status = "failed"
            # Restore stock on payment failure
            for item in order.items:
                product = db.query(models.Product).filter(models.Product.id == item.product_id).first()
                if product:
                    product.stock += item.quantity
        db.commit()

    return {"ResultCode": 0, "ResultDesc": "Success"}


# ────────────────────────────────────────
# ROOT
# ────────────────────────────────────────

@app.get("/", tags=["Root"])
def root():
    return {"message": "Welcome to Shalina Mart API v2.0"}
