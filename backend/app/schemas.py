from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

# User Schemas
class UserBase(BaseModel):
    name: str
    email: str
    role: str
    phone: Optional[str] = None
    address: Optional[str] = None
    lat: Optional[float] = None
    lon: Optional[float] = None
    is_available: Optional[bool] = True

class UserRegister(BaseModel):
    name: str
    email: str
    password: str
    phone: Optional[str] = None
    address: Optional[str] = None
    lat: Optional[float] = None
    lon: Optional[float] = None

class UserLogin(BaseModel):
    email: str
    password: str

class UserRoleUpdate(BaseModel):
    role: str  # "customer", "restaurant_manager", "delivery_partner", "super_admin"

class UserResponse(UserBase):
    id: int
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

# MenuItem Schemas
class MenuItemBase(BaseModel):
    name: str
    description: Optional[str] = None
    price: float
    category: Optional[str] = "Main"
    image_url: Optional[str] = None
    is_veg: Optional[bool] = False
    is_available: Optional[bool] = True

class MenuItemCreate(MenuItemBase):
    restaurant_id: int

class MenuItemUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    price: Optional[float] = None
    category: Optional[str] = None
    image_url: Optional[str] = None
    is_veg: Optional[bool] = None
    is_available: Optional[bool] = None

class MenuItemResponse(MenuItemBase):
    id: int
    restaurant_id: int

    class Config:
        from_attributes = True

# Restaurant Schemas
class RestaurantBase(BaseModel):
    name: str
    cuisine: str
    description: Optional[str] = None
    image_url: Optional[str] = None
    address: str
    lat: Optional[float] = None
    lon: Optional[float] = None
    rating: Optional[float] = 4.5
    delivery_time_mins: Optional[int] = 30
    manager_id: Optional[int] = None

class RestaurantCreate(RestaurantBase):
    pass

class RestaurantUpdate(BaseModel):
    name: Optional[str] = None
    cuisine: Optional[str] = None
    description: Optional[str] = None
    image_url: Optional[str] = None
    address: Optional[str] = None
    lat: Optional[float] = None
    lon: Optional[float] = None
    rating: Optional[float] = None
    delivery_time_mins: Optional[int] = None

class RestaurantResponse(RestaurantBase):
    id: int
    menu_items: List[MenuItemResponse] = []

    class Config:
        from_attributes = True

# Order Schemas
class OrderItemCreate(BaseModel):
    menu_item_id: int
    quantity: int

class OrderItemResponse(BaseModel):
    id: int
    menu_item_id: Optional[int]
    item_name: str
    unit_price: float
    quantity: int
    subtotal: float

    class Config:
        from_attributes = True

class OrderCreate(BaseModel):
    customer_id: int
    restaurant_id: int
    delivery_address: str
    delivery_lat: Optional[float] = None
    delivery_lon: Optional[float] = None
    notes: Optional[str] = None
    items: List[OrderItemCreate]

class OrderStatusUpdate(BaseModel):
    status: str  # "accepted", "rejected", "delivery_accepted", "delivery_rejected", "out_for_delivery", "delivered"

class OrderAssignDelivery(BaseModel):
    delivery_partner_id: int

class PaymentVerifyRequest(BaseModel):
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str

class OrderResponse(BaseModel):
    id: int
    customer_id: int
    restaurant_id: int
    delivery_partner_id: Optional[int] = None
    status: str
    order_status: Optional[str] = "PENDING_PAYMENT"
    payment_status: Optional[str] = "PENDING"
    razorpay_order_id: Optional[str] = None
    razorpay_payment_id: Optional[str] = None
    razorpay_key_id: Optional[str] = None
    payment_link_url: Optional[str] = None
    currency: Optional[str] = "INR"
    total_amount: float
    delivery_address: str
    delivery_lat: Optional[float] = None
    delivery_lon: Optional[float] = None
    restaurant_address: Optional[str] = None
    restaurant_lat: Optional[float] = None
    restaurant_lon: Optional[float] = None
    notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    customer_name: Optional[str] = None
    restaurant_name: Optional[str] = None
    delivery_partner_name: Optional[str] = None
    items: List[OrderItemResponse] = []

    class Config:
        from_attributes = True
