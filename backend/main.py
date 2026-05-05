from fastapi import FastAPI, Depends, HTTPException, status, File, UploadFile, Form, Query, Request
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional
import datetime
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
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    sort: Optional[str] = None, # price_asc, price_desc, name_asc, newest
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db)
):
    query = db.query(models.Product).options(
        joinedload(models.Product.product_images),
        joinedload(models.Product.reviews)
    )
    if category:
        query = query.filter(models.Product.category == category)
    if search:
        query = query.filter(models.Product.name.ilike(f"%{search}%"))
    if min_price is not None:
        query = query.filter(models.Product.price >= min_price)
    if max_price is not None:
        query = query.filter(models.Product.price <= max_price)

    # Sorting
    if sort == "price_asc":
        query = query.order_by(models.Product.price.asc())
    elif sort == "price_desc":
        query = query.order_by(models.Product.price.desc())
    elif sort == "name_asc":
        query = query.order_by(models.Product.name.asc())
    else:
        query = query.order_by(models.Product.created_at.desc())

    total = query.count()
    pages = math.ceil(total / per_page) if total > 0 else 1
    items = query.offset((page - 1) * per_page).limit(per_page).all()
    
    for p in items:
        p.review_count = len(p.reviews) if p.reviews else 0
        p.average_rating = sum(r.rating for r in p.reviews) / p.review_count if p.review_count > 0 else 0.0

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
        joinedload(models.Product.product_images),
        joinedload(models.Product.reviews)
    ).filter(models.Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
        
    product.review_count = len(product.reviews) if product.reviews else 0
    product.average_rating = sum(r.rating for r in product.reviews) / product.review_count if product.review_count > 0 else 0.0
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
async def update_product(
    product_id: int,
    name: Optional[str] = Form(None),
    category: Optional[str] = Form(None),
    description: Optional[str] = Form(None),
    price: Optional[float] = Form(None),
    original_price: Optional[float] = Form(None),
    stock: Optional[int] = Form(None),
    badge: Optional[str] = Form(None),
    files: Optional[List[UploadFile]] = File(None),
    db: Session = Depends(get_db),
    admin: models.User = Depends(get_admin_user)
):
    product = db.query(models.Product).filter(models.Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    if name is not None:
        product.name = name
    if category is not None:
        product.category = category
    if description is not None:
        product.description = description
    if price is not None:
        product.price = price
    if original_price is not None:
        product.original_price = original_price
    if stock is not None:
        product.stock = stock
    if badge is not None:
        product.badge = badge

    if files:
        saved_images = []
        existing_count = db.query(models.ProductImage).filter(models.ProductImage.product_id == product.id).count()
        for i, file in enumerate(files):
            file_ext = file.filename.split('.')[-1].lower() if file.filename else ''
            if file_ext not in ALLOWED_IMAGE_EXTENSIONS:
                raise HTTPException(status_code=400, detail=f"File type '.{file_ext}' not allowed. Allowed: {', '.join(ALLOWED_IMAGE_EXTENSIONS)}")

            file_name = f"{uuid.uuid4()}.{file_ext}"
            file_path = os.path.join(UPLOAD_DIR, file_name)
            with open(file_path, 'wb') as buffer:
                shutil.copyfileobj(file.file, buffer)
            url = f"/uploads/{file_name}"
            saved_images.append(url)
            img = models.ProductImage(product_id=product.id, url=url, sort_order=existing_count + i)
            db.add(img)

        if product.images:
            product.images = ",".join([*product.images.split(','), *saved_images])
        else:
            product.images = ",".join(saved_images)

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
# REVIEWS
# ────────────────────────────────────────

@app.get("/products/{product_id}/reviews", response_model=List[schemas.ReviewOut])
def get_product_reviews(product_id: int, db: Session = Depends(get_db)):
    reviews = db.query(models.Review).filter(models.Review.product_id == product_id).order_by(models.Review.created_at.desc()).all()
    # Populate user_name manually
    for r in reviews:
        if r.user:
            r.user_name = r.user.full_name or r.user.email.split('@')[0]
    return reviews


@app.post("/products/{product_id}/reviews", response_model=schemas.ReviewOut)
def create_product_review(
    product_id: int,
    review: schemas.ReviewCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    product = db.query(models.Product).filter(models.Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
        
    # Check if user already reviewed
    existing = db.query(models.Review).filter(
        models.Review.product_id == product_id,
        models.Review.user_id == current_user.id
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="You have already reviewed this product")

    if not (1 <= review.rating <= 5):
        raise HTTPException(status_code=400, detail="Rating must be between 1 and 5")

    new_review = models.Review(
        product_id=product_id,
        user_id=current_user.id,
        rating=review.rating,
        comment=review.comment
    )
    db.add(new_review)
    db.commit()
    db.refresh(new_review)
    new_review.user_name = current_user.full_name or current_user.email.split('@')[0]
    return new_review


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
    payment_method = order_in.payment_method or "mpesa"
    db_order = models.Order(
        user_id=user.id,
        total_amount=total,
        status="pending",
        delivery_address=order_in.delivery_address,
        delivery_phone=order_in.delivery_phone or user.phone_number,
        payment_method=payment_method,
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

    # Cash on Delivery — no STK push needed
    if payment_method == "cash":
        return {"status": "success", "order_id": db_order.id, "message": "Order placed! Pay with cash on delivery."}

    # Trigger M-Pesa STK Push
    callback_url = os.getenv("MPESA_CALLBACK_URL", "http://91.98.40.198/api/mpesa/callback")
    phone = order_in.delivery_phone or user.phone_number or "254700000000"

    try:
        response = mpesa_client.stk_push(
            db=db,
            amount=int(total),
            phone_number=phone,
            callback_url=callback_url,
            account_ref=f"ORD-{db_order.id}"
        )

        print(f"DEBUG: M-Pesa Response for Order #{db_order.id}: {response}")
        if "CheckoutRequestID" in response:
            db_order.mpesa_checkout_id = response["CheckoutRequestID"]
            db.commit()
            return {"status": "success", "order_id": db_order.id, "mpesa": response}

        return {"status": "pending", "order_id": db_order.id, "message": "Order created. M-Pesa push may have failed.", "details": response}
    except Exception as e:
        print(f"ERROR: M-Pesa Push failed for Order #{db_order.id}: {str(e)}")
        return {"status": "pending", "order_id": db_order.id, "message": f"Order created. Payment pending. Error: {str(e)}"}


@app.get("/orders", response_model=List[schemas.Order])
def get_my_orders(db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    return db.query(models.Order).options(
        joinedload(models.Order.items).joinedload(models.OrderItem.product)
    ).filter(models.Order.user_id == user.id).order_by(models.Order.created_at.desc()).all()


@app.post("/orders/{order_id}/cancel")
def cancel_own_order(order_id: int, db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    order = db.query(models.Order).filter(models.Order.id == order_id, models.Order.user_id == user.id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    if order.status != "pending":
        raise HTTPException(status_code=400, detail="Only pending orders can be cancelled")
    
    # Restore stock
    for item in order.items:
        product = db.query(models.Product).filter(models.Product.id == item.product_id).first()
        if product:
            product.stock += item.quantity
    
    order.status = "cancelled"
    db.commit()
    return {"detail": "Order cancelled successfully"}


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

    if update.notes is not None:
        order.notes = update.notes

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
# ADMIN MANAGEMENT ROUTES
# ────────────────────────────────────────

@app.get("/admin/users", response_model=List[schemas.User])
def list_users(db: Session = Depends(get_db), admin: models.User = Depends(get_admin_user)):
    return db.query(models.User).all()


@app.patch("/admin/users/{user_id}", response_model=schemas.User)
def update_user_status(
    user_id: int,
    update: schemas.UserAdminUpdate,
    db: Session = Depends(get_db),
    admin: models.User = Depends(get_admin_user)
):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if update.is_active is not None:
        user.is_active = update.is_active
    if update.is_admin is not None:
        user.is_admin = update.is_admin
        
    db.commit()
    db.refresh(user)
    return user


@app.delete("/admin/orders/reset")
def reset_all_orders(
    db: Session = Depends(get_db),
    admin: models.User = Depends(get_admin_user)
):
    # Delete all order items first (due to FK)
    db.query(models.OrderItem).delete()
    # Delete all orders
    db.query(models.Order).delete()
    db.commit()
    return {"detail": "All orders have been deleted"}


@app.post("/admin/users", response_model=schemas.User)
def create_user_admin(
    user_in: schemas.UserAdminCreate,
    db: Session = Depends(get_db),
    admin: models.User = Depends(get_admin_user)
):
    # Check if email exists
    existing = db.query(models.User).filter(models.User.email == user_in.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="A user with this email already exists")
    
    # Create user
    hashed_pw = auth.get_password_hash(user_in.password)
    db_user = models.User(
        email=user_in.email,
        hashed_password=hashed_pw,
        full_name=user_in.full_name,
        phone_number=user_in.phone_number,
        is_admin=user_in.is_admin,
        is_active=True
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user


@app.get("/admin/analytics")
def get_admin_analytics(
    db: Session = Depends(get_db),
    admin: models.User = Depends(get_admin_user)
):
    # 1. Revenue
    total_revenue = db.query(func.sum(models.Order.total_amount))\
        .filter(models.Order.status.in_(["paid", "delivered"]))\
        .scalar() or 0.0
    
    # Monthly revenue
    start_of_month = datetime.datetime.utcnow().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    monthly_revenue = db.query(func.sum(models.Order.total_amount))\
        .filter(models.Order.status.in_(["paid", "delivered"]))\
        .filter(models.Order.created_at >= start_of_month)\
        .scalar() or 0.0
    
    # 2. Order Breakdown
    status_counts = db.query(models.Order.status, func.count(models.Order.id))\
        .group_by(models.Order.status)\
        .all()
    status_breakdown = {status: count for status, count in status_counts}
    
    # 3. Top Products
    top_products_query = db.query(
        models.Product.name,
        func.sum(models.OrderItem.quantity).label("total_sold")
    ).join(models.OrderItem)\
     .join(models.Order)\
     .filter(models.Order.status.in_(["paid", "delivered"]))\
     .group_by(models.Product.id)\
     .order_by(func.sum(models.OrderItem.quantity).desc())\
     .limit(5)\
     .all()
    
    top_products = [{"name": name, "sold": int(sold)} for name, sold in top_products_query]
    
    # 4. General Stats
    total_customers = db.query(func.count(models.User.id)).scalar()
    total_orders = db.query(func.count(models.Order.id)).scalar()
    
    return {
        "revenue": {
            "total": total_revenue,
            "monthly": monthly_revenue
        },
        "orders": {
            "total": total_orders,
            "breakdown": status_breakdown
        },
        "top_products": top_products,
        "total_customers": total_customers
    }


@app.get("/admin/settings", response_model=List[schemas.SystemSettingsOut])
def get_all_settings(db: Session = Depends(get_db), admin: models.User = Depends(get_admin_user)):
    return db.query(models.SystemSettings).all()


@app.post("/admin/settings", response_model=schemas.SystemSettingsOut)
def update_setting(
    setting: schemas.SystemSettingsBase,
    db: Session = Depends(get_db),
    admin: models.User = Depends(get_admin_user)
):
    db_setting = db.query(models.SystemSettings).filter(models.SystemSettings.key == setting.key).first()
    if db_setting:
        db_setting.value = setting.value
        if setting.description:
            db_setting.description = setting.description
    else:
        db_setting = models.SystemSettings(
            key=setting.key,
            value=setting.value,
            description=setting.description
        )
        db.add(db_setting)
    
    db.commit()
    db.refresh(db_setting)
    return db_setting


# ────────────────────────────────────────
# ROOT & SEO
# ────────────────────────────────────────

@app.get("/", tags=["Root"])
def root():
    return {"message": "Welcome to Shalina Mart API v2.0"}


@app.get("/robots.txt", response_class=JSONResponse)
def get_robots_txt():
    # Return as plain text
    content = """User-agent: *
Allow: /

Sitemap: https://shalimart.co.ke/sitemap.xml
"""
    from fastapi.responses import PlainTextResponse
    return PlainTextResponse(content)


@app.get("/sitemap.xml")
def get_sitemap(db: Session = Depends(get_db)):
    from fastapi.responses import Response
    
    # Base URL of the frontend
    base_url = "https://shalimart.co.ke"
    
    # Fetch all active products
    products = db.query(models.Product).all()
    
    # Build XML
    xml = ['<?xml version="1.0" encoding="UTF-8"?>']
    xml.append('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">')
    
    # Core pages
    static_pages = ["/", "/shop", "/contact", "/login", "/register"]
    for page in static_pages:
        xml.append('  <url>')
        xml.append(f'    <loc>{base_url}{page}</loc>')
        xml.append('    <changefreq>daily</changefreq>')
        xml.append('    <priority>0.8</priority>')
        xml.append('  </url>')
        
    # Product pages
    for product in products:
        xml.append('  <url>')
        xml.append(f'    <loc>{base_url}/product/{product.id}</loc>')
        xml.append('    <changefreq>weekly</changefreq>')
        xml.append('    <priority>0.9</priority>')
        xml.append('  </url>')
        
    xml.append('</urlset>')
    
    return Response(content="\n".join(xml), media_type="application/xml")
