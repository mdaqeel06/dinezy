import os
import json
import logging
from pathlib import Path
from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload
from dotenv import load_dotenv
import razorpay

from ..database import get_db
from ..models import Order, OrderItem, MenuItem, Restaurant, User
from ..schemas import OrderCreate, OrderResponse, OrderStatusUpdate, OrderAssignDelivery, PaymentVerifyRequest

# Setup logger for Razorpay requests and responses
logger = logging.getLogger("dinezy.razorpay")
if not logger.handlers:
    console_handler = logging.StreamHandler()
    console_handler.setFormatter(logging.Formatter("[%(asctime)s] [%(levelname)s] [RAZORPAY] %(message)s"))
    logger.addHandler(console_handler)
logger.setLevel(logging.INFO)
logger.propagate = False

# Load environment variables from .env
env_path = Path(__file__).resolve().parent.parent.parent / ".env"
load_dotenv(dotenv_path=env_path)

RAZORPAY_KEY_ID = os.getenv("RAZORPAY_KEY_ID", "")
RAZORPAY_KEY_SECRET = os.getenv("RAZORPAY_KEY_SECRET", "")

DELIVERY_FEE_INR = 40.0
TAX_RATE = 0.05

router = APIRouter(prefix="/api/orders", tags=["orders"])

def get_razorpay_client():
    if not RAZORPAY_KEY_ID or not RAZORPAY_KEY_SECRET:
        return None
    return razorpay.Client(auth=(RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET))

def build_order_response(order: Order) -> dict:
    rest_addr = order.restaurant.address if order.restaurant else (order.restaurant_address or "")
    rest_lat = order.restaurant.lat if (order.restaurant and order.restaurant.lat is not None) else order.restaurant_lat
    rest_lon = order.restaurant.lon if (order.restaurant and order.restaurant.lon is not None) else order.restaurant_lon

    return {
        "id": order.id,
        "customer_id": order.customer_id,
        "restaurant_id": order.restaurant_id,
        "delivery_partner_id": order.delivery_partner_id,
        "status": order.status,
        "order_status": getattr(order, "order_status", order.status) or order.status,
        "payment_status": getattr(order, "payment_status", "PENDING") or "PENDING",
        "razorpay_order_id": getattr(order, "razorpay_order_id", None),
        "razorpay_payment_id": getattr(order, "razorpay_payment_id", None),
        "razorpay_key_id": RAZORPAY_KEY_ID,
        "payment_link_url": getattr(order, "payment_link_url", None),
        "currency": getattr(order, "currency", "INR") or "INR",
        "total_amount": round(order.total_amount, 2),
        "delivery_address": order.delivery_address,
        "delivery_lat": order.delivery_lat,
        "delivery_lon": order.delivery_lon,
        "restaurant_address": rest_addr,
        "restaurant_lat": rest_lat,
        "restaurant_lon": rest_lon,
        "notes": order.notes,
        "created_at": order.created_at,
        "updated_at": order.updated_at,
        "customer_name": order.customer.name if order.customer else "Unknown Customer",
        "restaurant_name": order.restaurant.name if order.restaurant else "Unknown Restaurant",
        "delivery_partner_name": order.delivery_partner.name if order.delivery_partner else None,
        "items": [
            {
                "id": it.id,
                "menu_item_id": it.menu_item_id,
                "item_name": it.item_name,
                "unit_price": it.unit_price,
                "quantity": it.quantity,
                "subtotal": it.subtotal,
            }
            for it in order.items
        ]
    }

@router.post("", response_model=OrderResponse)
def create_order(order_in: OrderCreate, db: Session = Depends(get_db)):
    if not order_in.items:
        raise HTTPException(status_code=400, detail="Order must contain at least one item")

    customer = db.query(User).filter(User.id == order_in.customer_id).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")

    restaurant = db.query(Restaurant).filter(Restaurant.id == order_in.restaurant_id).first()
    if not restaurant:
        raise HTTPException(status_code=404, detail="Restaurant not found")

    # Calculate item subtotals
    items_subtotal = 0.0
    items_to_create = []

    for item_data in order_in.items:
        menu_item = db.query(MenuItem).filter(MenuItem.id == item_data.menu_item_id).first()
        if not menu_item:
            raise HTTPException(status_code=404, detail=f"Menu item id {item_data.menu_item_id} not found")
        if not menu_item.is_available:
            raise HTTPException(status_code=400, detail=f"'{menu_item.name}' is currently unavailable")

        subtotal = round(menu_item.price * item_data.quantity, 2)
        items_subtotal += subtotal

        items_to_create.append({
            "menu_item_id": menu_item.id,
            "item_name": menu_item.name,
            "unit_price": menu_item.price,
            "quantity": item_data.quantity,
            "subtotal": subtotal
        })

    # Add INR delivery fee (₹40.00) + 5% GST tax
    tax_amount = round(items_subtotal * TAX_RATE, 2)
    total_amount = round(items_subtotal + DELIVERY_FEE_INR + tax_amount, 2)

    # 1. Insert order initially with PENDING_PAYMENT / PENDING in DB
    new_order = Order(
        customer_id=order_in.customer_id,
        restaurant_id=order_in.restaurant_id,
        status="PENDING_PAYMENT",
        order_status="PENDING_PAYMENT",
        payment_status="PENDING",
        currency="INR",
        total_amount=total_amount,
        delivery_address=order_in.delivery_address,
        delivery_lat=order_in.delivery_lat,
        delivery_lon=order_in.delivery_lon,
        restaurant_address=restaurant.address,
        restaurant_lat=restaurant.lat,
        restaurant_lon=restaurant.lon,
        notes=order_in.notes,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow()
    )
    db.add(new_order)
    db.commit()
    db.refresh(new_order)

    for item_dict in items_to_create:
        order_item = OrderItem(
            order_id=new_order.id,
            **item_dict
        )
        db.add(order_item)

    # 2. Trigger Razorpay Order Creation API
    rzp_client = get_razorpay_client()
    if rzp_client:
        try:
            # Amount in paise (1 INR = 100 paise)
            amount_paise = int(round(total_amount * 100))
            order_create_payload = {
                "amount": amount_paise,
                "currency": "INR",
                "receipt": f"order_rcpt_{new_order.id}",
                "notes": {
                    "order_id": str(new_order.id),
                    "restaurant_name": restaurant.name,
                    "customer_name": customer.name,
                }
            }

            logger.info("=" * 70)
            logger.info(f"📤 [RAZORPAY ORDER CREATE] Sending Request for Dinezy Order #{new_order.id}:")
            logger.info(json.dumps(order_create_payload, indent=2))

            rzp_order = rzp_client.order.create(order_create_payload)

            logger.info(f"📥 [RAZORPAY ORDER CREATE] Received Response for Dinezy Order #{new_order.id}:")
            logger.info(json.dumps(rzp_order, indent=2))
            logger.info("=" * 70)

            new_order.razorpay_order_id = rzp_order.get("id")

            # Also create Razorpay hosted Payment Link (redirect option)
            try:
                phone_contact = customer.phone or "+919876543210"
                if not phone_contact.startswith("+"):
                    phone_contact = f"+91{phone_contact}"
                link_payload = {
                    "amount": amount_paise,
                    "currency": "INR",
                    "description": f"Dinezy Order #{new_order.id} from {restaurant.name}",
                    "customer": {
                        "name": customer.name,
                        "email": customer.email,
                        "contact": phone_contact
                    },
                    "notify": {"sms": False, "email": False},
                    "reminder_enable": False,
                    "notes": {"order_id": str(new_order.id)}
                }

                logger.info(f"📤 [RAZORPAY PAYMENT LINK] Sending Request for Dinezy Order #{new_order.id}:")
                logger.info(json.dumps(link_payload, indent=2))

                link = rzp_client.payment_link.create(link_payload)

                logger.info(f"📥 [RAZORPAY PAYMENT LINK] Received Response for Dinezy Order #{new_order.id}:")
                logger.info(json.dumps(link, indent=2))
                logger.info("=" * 70)

                new_order.payment_link_url = link.get("short_url")
            except Exception as link_err:
                logger.warning(f"⚠️ [RAZORPAY PAYMENT LINK WARNING] Could not generate payment link for Order #{new_order.id}: {link_err}")

        except Exception as e:
            logger.error(f"❌ [RAZORPAY ORDER CREATE] Error creating order for Dinezy Order #{new_order.id}: {str(e)}", exc_info=True)
            raise HTTPException(status_code=500, detail=f"Failed to create Razorpay payment order: {str(e)}")

    db.commit()
    db.refresh(new_order)
    return build_order_response(new_order)

@router.post("/{order_id}/verify-payment", response_model=OrderResponse)
def verify_payment(order_id: int, verify_in: PaymentVerifyRequest, db: Session = Depends(get_db)):
    """Verifies Razorpay payment signature and activates the order for the restaurant"""
    order = db.query(Order).options(
        joinedload(Order.customer),
        joinedload(Order.restaurant),
        joinedload(Order.delivery_partner),
        joinedload(Order.items)
    ).filter(Order.id == order_id).first()

    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    rzp_client = get_razorpay_client()
    if not rzp_client:
        raise HTTPException(status_code=500, detail="Razorpay credentials not configured")

    verification_payload = {
        "order_id": order_id,
        "razorpay_order_id": verify_in.razorpay_order_id,
        "razorpay_payment_id": verify_in.razorpay_payment_id,
        "razorpay_signature": verify_in.razorpay_signature
    }

    logger.info("=" * 70)
    logger.info(f"📤 [RAZORPAY SIGNATURE VERIFICATION] Verifying Payment for Dinezy Order #{order_id}:")
    logger.info(json.dumps(verification_payload, indent=2))

    try:
        rzp_client.utility.verify_payment_signature({
            "razorpay_order_id": verify_in.razorpay_order_id,
            "razorpay_payment_id": verify_in.razorpay_payment_id,
            "razorpay_signature": verify_in.razorpay_signature
        })
        logger.info(f"📥 [RAZORPAY SIGNATURE VERIFICATION] ✅ Signature VERIFIED successfully for Order #{order_id} (Payment ID: {verify_in.razorpay_payment_id})")
        logger.info("=" * 70)
    except Exception as e:
        logger.error(f"📥 [RAZORPAY SIGNATURE VERIFICATION] ❌ Verification FAILED for Order #{order_id}: {str(e)}")
        logger.info("=" * 70)
        order.payment_status = "FAILED"
        order.updated_at = datetime.utcnow()
        db.commit()
        raise HTTPException(status_code=400, detail=f"Invalid payment signature: {str(e)}")

    # On verified payment: move from PENDING_PAYMENT to placed
    order.status = "placed"
    order.order_status = "placed"
    order.payment_status = "PAID"
    order.razorpay_payment_id = verify_in.razorpay_payment_id
    order.razorpay_signature = verify_in.razorpay_signature
    order.updated_at = datetime.utcnow()

    db.commit()
    db.refresh(order)
    return build_order_response(order)

@router.get("", response_model=List[OrderResponse])
def get_orders(
    customer_id: Optional[int] = None,
    restaurant_id: Optional[int] = None,
    manager_id: Optional[int] = None,
    delivery_partner_id: Optional[int] = None,
    status: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(Order).options(
        joinedload(Order.customer),
        joinedload(Order.restaurant),
        joinedload(Order.delivery_partner),
        joinedload(Order.items)
    )

    if customer_id:
        query = query.filter(Order.customer_id == customer_id)
    if restaurant_id:
        query = query.filter(Order.restaurant_id == restaurant_id)
        # Restaurant managers only see orders where payment is completed
        if not status:
            query = query.filter(Order.status != "PENDING_PAYMENT")
    if manager_id:
        # Get restaurants managed by this manager
        restaurant_ids = [r.id for r in db.query(Restaurant).filter(Restaurant.manager_id == manager_id).all()]
        query = query.filter(Order.restaurant_id.in_(restaurant_ids))
        if not status:
            query = query.filter(Order.status != "PENDING_PAYMENT")
    if delivery_partner_id:
        query = query.filter(Order.delivery_partner_id == delivery_partner_id)
        if not status:
            query = query.filter(Order.status != "PENDING_PAYMENT")
    if status:
        query = query.filter(Order.status == status)

    orders = query.order_by(Order.created_at.desc()).all()
    return [build_order_response(o) for o in orders]

@router.get("/{order_id}", response_model=OrderResponse)
def get_order(order_id: int, db: Session = Depends(get_db)):
    order = db.query(Order).options(
        joinedload(Order.customer),
        joinedload(Order.restaurant),
        joinedload(Order.delivery_partner),
        joinedload(Order.items)
    ).filter(Order.id == order_id).first()

    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    return build_order_response(order)

@router.patch("/{order_id}/manager-action", response_model=OrderResponse)
def manager_order_action(order_id: int, action: OrderStatusUpdate, db: Session = Depends(get_db)):
    """Restaurant Manager accepts or rejects the customer's order"""
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    if action.status not in ["accepted", "rejected"]:
        raise HTTPException(status_code=400, detail="Action must be 'accepted' or 'rejected'")

    order.status = action.status
    order.order_status = action.status
    order.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(order)
    return build_order_response(order)

@router.post("/{order_id}/assign-delivery", response_model=OrderResponse)
def assign_delivery_partner(order_id: int, assign_in: OrderAssignDelivery, db: Session = Depends(get_db)):
    """Restaurant Manager assigns an accepted order to a delivery partner"""
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    partner = db.query(User).filter(User.id == assign_in.delivery_partner_id, User.role == "delivery_partner").first()
    if not partner:
        raise HTTPException(status_code=404, detail="Delivery partner not found")

    order.delivery_partner_id = partner.id
    order.status = "assigned"
    order.order_status = "assigned"
    order.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(order)
    return build_order_response(order)

@router.patch("/{order_id}/delivery-action", response_model=OrderResponse)
def delivery_partner_action(order_id: int, action: OrderStatusUpdate, db: Session = Depends(get_db)):
    """Delivery partner accepts, rejects, picks up, or delivers the order"""
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    allowed_statuses = ["delivery_accepted", "delivery_rejected", "out_for_delivery", "delivered"]
    if action.status not in allowed_statuses:
        raise HTTPException(status_code=400, detail=f"Status must be one of: {allowed_statuses}")

    if action.status == "delivery_rejected":
        # Reset delivery partner so restaurant can reassign
        order.delivery_partner_id = None
        order.status = "accepted"  # Back to accepted state awaiting a new driver
        order.order_status = "accepted"
    else:
        order.status = action.status
        order.order_status = action.status

    order.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(order)
    return build_order_response(order)

