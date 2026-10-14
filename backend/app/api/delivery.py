from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from typing import List
from ..database import get_db
from ..models import User, Order
from ..schemas import UserResponse, OrderResponse
from .orders import build_order_response

router = APIRouter(prefix="/api/delivery", tags=["delivery"])

@router.get("/partners", response_model=List[UserResponse])
def get_delivery_partners(db: Session = Depends(get_db)):
    """List all delivery partners for assignment"""
    partners = db.query(User).filter(User.role == "delivery_partner").all()
    return partners

@router.get("/my-orders/{partner_id}", response_model=List[OrderResponse])
def get_partner_orders(partner_id: int, db: Session = Depends(get_db)):
    """Get all orders currently or previously assigned to this delivery partner"""
    orders = db.query(Order).options(
        joinedload(Order.customer),
        joinedload(Order.restaurant),
        joinedload(Order.delivery_partner),
        joinedload(Order.items)
    ).filter(Order.delivery_partner_id == partner_id).order_by(Order.updated_at.desc()).all()

    return [build_order_response(o) for o in orders]
