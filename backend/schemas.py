from pydantic import BaseModel, EmailStr
from typing import List, Optional
from datetime import datetime


# --- User Schemas ---

class UserBase(BaseModel):
    email: EmailStr
    full_name: Optional[str] = None
    phone_number: Optional[str] = None


class UserCreate(UserBase):
    password: str


class User(UserBase):
    id: int
    is_active: bool
    is_admin: bool
    created_at: datetime

    class Config:
        from_attributes = True


# --- Token Schemas ---

class Token(BaseModel):
    access_token: str
    token_type: str


class TokenData(BaseModel):
    email: Optional[str] = None
    is_admin: bool = False


# --- Product Image Schemas ---

class ProductImageOut(BaseModel):
    id: int
    url: str
    sort_order: int

    class Config:
        from_attributes = True


# --- Product Schemas ---

class ProductBase(BaseModel):
    name: str
    category: str
    description: Optional[str] = ""
    price: float
    original_price: Optional[float] = None
    stock: int = 0
    badge: Optional[str] = None


class ProductCreate(ProductBase):
    pass


class ProductUpdate(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    description: Optional[str] = None
    price: Optional[float] = None
    original_price: Optional[float] = None
    stock: Optional[int] = None
    badge: Optional[str] = None


class Product(ProductBase):
    id: int
    images: Optional[str] = None
    product_images: List[ProductImageOut] = []
    created_at: datetime

    class Config:
        from_attributes = True


# --- Wishlist Schemas ---

class WishlistItemBase(BaseModel):
    product_id: int


class WishlistItem(WishlistItemBase):
    id: int
    product: Product

    class Config:
        from_attributes = True


# --- Order Schemas ---

class OrderItemBase(BaseModel):
    product_id: int
    quantity: int


class OrderItemOut(OrderItemBase):
    id: int
    price_at_purchase: float
    product: Optional[Product] = None

    class Config:
        from_attributes = True


class OrderCreate(BaseModel):
    items: List[OrderItemBase]
    delivery_address: Optional[str] = None
    delivery_phone: Optional[str] = None


class OrderStatusUpdate(BaseModel):
    status: str  # pending, paid, shipped, delivered, cancelled


class Order(BaseModel):
    id: int
    total_amount: float
    status: str
    delivery_address: Optional[str] = None
    delivery_phone: Optional[str] = None
    created_at: datetime
    items: List[OrderItemOut] = []

    class Config:
        from_attributes = True


# --- Pagination ---

class PaginatedProducts(BaseModel):
    items: List[Product]
    total: int
    page: int
    per_page: int
    pages: int


# --- Admin Management Schemas ---

class UserAdminUpdate(BaseModel):
    is_active: Optional[bool] = None
    is_admin: Optional[bool] = None


class SystemSettingsBase(BaseModel):
    key: str
    value: str
    description: Optional[str] = None


class SystemSettingsOut(SystemSettingsBase):
    id: int
    updated_at: datetime

    class Config:
        from_attributes = True
