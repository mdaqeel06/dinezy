from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Dict, Any
from ..database import get_db
from ..models import User, Restaurant, Order
from ..schemas import UserResponse, UserRoleUpdate
from ..security import require_roles

router = APIRouter(prefix="/api/admin", tags=["admin"])

@router.get("/users")
def get_all_users(
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_roles(["super_admin"])),
):
    """Super Admin: View all registered platform users with activity stats"""
    users = db.query(User).order_by(User.id.asc()).all()

    result = []
    for u in users:
        customer_orders = db.query(func.count(Order.id)).filter(Order.customer_id == u.id).scalar() or 0
        delivery_orders = db.query(func.count(Order.id)).filter(Order.delivery_partner_id == u.id).scalar() or 0
        managed_restaurants = db.query(func.count(Restaurant.id)).filter(Restaurant.manager_id == u.id).scalar() or 0

        result.append({
            "id": u.id,
            "name": u.name,
            "email": u.email,
            "role": u.role,
            "phone": u.phone,
            "is_available": u.is_available,
            "created_at": u.created_at,
            "customer_orders_count": customer_orders,
            "delivery_orders_count": delivery_orders,
            "managed_restaurants_count": managed_restaurants,
        })
    return result

@router.patch("/users/{user_id}/role", response_model=UserResponse)
def update_user_role(
    user_id: int,
    role_update: UserRoleUpdate,
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_roles(["super_admin"])),
):
    """Super Admin: Promote or demote any user to a new role"""
    valid_roles = ["customer", "restaurant_manager", "delivery_partner", "super_admin"]
    new_role = role_update.role.lower().strip()
    if new_role not in valid_roles:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid role. Must be one of: {valid_roles}",
        )

    target_user = db.query(User).filter(User.id == user_id).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")

    if target_user.id == admin_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Super Admins cannot change their own role",
        )

    # Safety check: Prevent demoting the only super admin
    if target_user.role == "super_admin" and new_role != "super_admin":
        admin_count = db.query(func.count(User.id)).filter(User.role == "super_admin").scalar()
        if admin_count <= 1:
            raise HTTPException(
                status_code=400,
                detail="Cannot demote the only remaining Super Admin account",
            )

    target_user.role = new_role
    db.commit()
    db.refresh(target_user)
    return target_user

@router.delete("/users/{user_id}")
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_roles(["super_admin"])),
):
    """Super Admin: Delete a user account (cannot delete own account)"""
    if user_id == admin_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Super Admins cannot delete their own account",
        )

    target_user = db.query(User).filter(User.id == user_id).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")

    if target_user.role == "super_admin":
        admin_count = db.query(func.count(User.id)).filter(User.role == "super_admin").scalar()
        if admin_count <= 1:
            raise HTTPException(
                status_code=400,
                detail="Cannot delete the only remaining Super Admin account",
            )

    # Disassociate managed restaurants
    db.query(Restaurant).filter(Restaurant.manager_id == user_id).update({"manager_id": None})
    # Disassociate assigned delivery orders
    db.query(Order).filter(Order.delivery_partner_id == user_id).update({"delivery_partner_id": None})
    # Remove customer orders placed by this user
    customer_orders = db.query(Order).filter(Order.customer_id == user_id).all()
    for o in customer_orders:
        db.delete(o)

    db.delete(target_user)
    db.commit()
    return {"message": f"User '{target_user.name}' deleted successfully", "id": user_id}

@router.get("/stats")
def get_platform_stats(
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_roles(["super_admin"])),
):
    """Super Admin: Summary metrics of platform activity"""
    total_users = db.query(func.count(User.id)).scalar() or 0
    customers = db.query(func.count(User.id)).filter(User.role == "customer").scalar() or 0
    managers = db.query(func.count(User.id)).filter(User.role == "restaurant_manager").scalar() or 0
    riders = db.query(func.count(User.id)).filter(User.role == "delivery_partner").scalar() or 0
    admins = db.query(func.count(User.id)).filter(User.role == "super_admin").scalar() or 0

    total_restaurants = db.query(func.count(Restaurant.id)).scalar() or 0
    total_orders = db.query(func.count(Order.id)).scalar() or 0
    total_revenue = db.query(func.sum(Order.total_amount)).scalar() or 0.0

    return {
        "total_users": total_users,
        "roles_distribution": {
            "customer": customers,
            "restaurant_manager": managers,
            "delivery_partner": riders,
            "super_admin": admins,
        },
        "total_restaurants": total_restaurants,
        "total_orders": total_orders,
        "total_revenue": round(total_revenue, 2),
    }
