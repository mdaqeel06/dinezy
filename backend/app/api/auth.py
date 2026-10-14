from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from ..database import get_db
from ..models import User
from ..schemas import UserRegister, UserLogin, UserResponse, TokenResponse
from ..security import hash_password, verify_password, create_access_token, get_current_user

router = APIRouter(prefix="/api/auth", tags=["auth"])

@router.post("/register", response_model=TokenResponse)
def register(user_in: UserRegister, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == user_in.email.lower().strip()).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email address already exists",
        )

    # All new self-registered users default to 'customer' role
    new_user = User(
        name=user_in.name.strip(),
        email=user_in.email.lower().strip(),
        hashed_password=hash_password(user_in.password),
        role="customer",
        phone=user_in.phone.strip() if user_in.phone else None,
        address=user_in.address.strip() if user_in.address else None,
        lat=user_in.lat,
        lon=user_in.lon,
        is_available=True,
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    token = create_access_token({"sub": str(new_user.id), "role": new_user.role})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": new_user,
    }

@router.post("/login", response_model=TokenResponse)
def login(credentials: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == credentials.email.lower().strip()).first()
    if not user or not verify_password(credentials.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = create_access_token({"sub": str(user.id), "role": user.role})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": user,
    }

@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user

@router.get("/demo-accounts")
def get_demo_accounts(db: Session = Depends(get_db)):
    """Returns list of pre-configured demo users for quick sign-in in UI"""
    demo_emails = [
        "admin@dinezy.com",
        "alex@dinezy.com",
        "marco@dinezy.com",
        "leo@dinezy.com",
    ]
    users = db.query(User).filter(User.email.in_(demo_emails)).all()
    return [
        {
            "id": u.id,
            "name": u.name,
            "email": u.email,
            "role": u.role,
            "default_password": "admin123" if u.role == "super_admin" else "password123",
        }
        for u in users
    ]

@router.patch("/users/{user_id}/availability", response_model=UserResponse)
def toggle_availability(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Only allow the user themselves or a super admin to toggle availability
    if current_user.id != user_id and current_user.role != "super_admin":
        raise HTTPException(status_code=403, detail="Not authorized to modify this user's availability")

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.is_available = not user.is_available
    db.commit()
    db.refresh(user)
    return user
