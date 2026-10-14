from sqlalchemy import Column, Integer, String, Float, Boolean, ForeignKey, DateTime, Text
from sqlalchemy.orm import relationship
from datetime import datetime
from .database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    email = Column(String(120), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    role = Column(String(50), nullable=False, default="customer")  # "customer", "restaurant_manager", "delivery_partner", "super_admin"
    phone = Column(String(20), nullable=True)
    address = Column(String(250), nullable=True)
    lat = Column(Float, nullable=True)
    lon = Column(Float, nullable=True)
    is_available = Column(Boolean, default=True)  # Used for delivery partner online status
    created_at = Column(DateTime, default=datetime.utcnow)

    restaurants = relationship("Restaurant", back_populates="manager")
    orders_as_customer = relationship("Order", foreign_keys="Order.customer_id", back_populates="customer")
    orders_as_delivery = relationship("Order", foreign_keys="Order.delivery_partner_id", back_populates="delivery_partner")

class Restaurant(Base):
    __tablename__ = "restaurants"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(150), nullable=False)
    cuisine = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)
    image_url = Column(String(500), nullable=True)
    address = Column(String(250), nullable=False)
    lat = Column(Float, nullable=True)
    lon = Column(Float, nullable=True)
    rating = Column(Float, default=4.5)
    delivery_time_mins = Column(Integer, default=30)
    manager_id = Column(Integer, ForeignKey("users.id"), nullable=True)

    manager = relationship("User", back_populates="restaurants")
    menu_items = relationship("MenuItem", back_populates="restaurant", cascade="all, delete-orphan")
    orders = relationship("Order", back_populates="restaurant")

class MenuItem(Base):
    __tablename__ = "menu_items"

    id = Column(Integer, primary_key=True, index=True)
    restaurant_id = Column(Integer, ForeignKey("restaurants.id"), nullable=False)
    name = Column(String(150), nullable=False)
    description = Column(Text, nullable=True)
    price = Column(Float, nullable=False)
    category = Column(String(50), default="Main")  # Pizza, Burger, Bowls, Drinks, Desserts
    image_url = Column(Text, nullable=True)
    is_veg = Column(Boolean, default=False)
    is_available = Column(Boolean, default=True)

    restaurant = relationship("Restaurant", back_populates="menu_items")

class Order(Base):
    __tablename__ = "orders"

    id = Column(Integer, primary_key=True, index=True)
    customer_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    restaurant_id = Column(Integer, ForeignKey("restaurants.id"), nullable=False)
    delivery_partner_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    
    # Statuses: PENDING_PAYMENT -> placed -> accepted / rejected -> assigned -> delivery_accepted / delivery_rejected -> out_for_delivery -> delivered
    status = Column(String(50), default="PENDING_PAYMENT")
    order_status = Column(String(50), default="PENDING_PAYMENT")
    payment_status = Column(String(50), default="PENDING")  # "PENDING", "PAID", "FAILED"
    razorpay_order_id = Column(String(100), nullable=True)
    razorpay_payment_id = Column(String(100), nullable=True)
    razorpay_signature = Column(String(255), nullable=True)
    payment_link_url = Column(Text, nullable=True)
    currency = Column(String(10), default="INR")
    total_amount = Column(Float, nullable=False)
    delivery_address = Column(String(300), nullable=False)
    delivery_lat = Column(Float, nullable=True)
    delivery_lon = Column(Float, nullable=True)
    restaurant_address = Column(String(300), nullable=True)
    restaurant_lat = Column(Float, nullable=True)
    restaurant_lon = Column(Float, nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    customer = relationship("User", foreign_keys=[customer_id], back_populates="orders_as_customer")
    restaurant = relationship("Restaurant", back_populates="orders")
    delivery_partner = relationship("User", foreign_keys=[delivery_partner_id], back_populates="orders_as_delivery")
    items = relationship("OrderItem", back_populates="order", cascade="all, delete-orphan")

class OrderItem(Base):
    __tablename__ = "order_items"

    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.id"), nullable=False)
    menu_item_id = Column(Integer, ForeignKey("menu_items.id"), nullable=True)
    item_name = Column(String(150), nullable=False)
    unit_price = Column(Float, nullable=False)
    quantity = Column(Integer, nullable=False)
    subtotal = Column(Float, nullable=False)

    order = relationship("Order", back_populates="items")
