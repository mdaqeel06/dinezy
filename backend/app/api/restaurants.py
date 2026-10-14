from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from ..database import get_db
from ..models import Restaurant, User
from ..schemas import RestaurantResponse, RestaurantCreate, RestaurantUpdate
from ..cache import (
    get_cache,
    set_cache,
    invalidate_restaurants_and_menu_cache,
    get_redis_client,
    CACHE_KEY_ALL_RESTAURANTS,
    CACHE_PREFIX_RESTAURANT,
    DEFAULT_MENU_TTL_SECONDS,
)

router = APIRouter(prefix="/api/restaurants", tags=["restaurants"])

@router.get("/cache/status")
def get_cache_status():
    """Diagnostic endpoint to inspect Redis cache status and keys"""
    client = get_redis_client()
    if not client:
        return {"connected": False, "detail": "Redis not reachable"}
    try:
        keys = client.keys("dinezy:*")
        key_info = []
        for k in keys:
            key_info.append({"key": k, "ttl_remaining_seconds": client.ttl(k)})
        return {
            "connected": True,
            "ttl_default": DEFAULT_MENU_TTL_SECONDS,
            "cached_keys": key_info,
        }
    except Exception as e:
        return {"connected": False, "error": str(e)}

@router.post("/cache/clear")
def clear_cache():
    """Manual cache clear endpoint"""
    count = invalidate_restaurants_and_menu_cache()
    return {"message": "Cache cleared successfully", "keys_evicted": count}

@router.get("", response_model=List[RestaurantResponse])
def get_restaurants(db: Session = Depends(get_db)):
    # 1. Try to fetch from Redis
    cached = get_cache(CACHE_KEY_ALL_RESTAURANTS)
    if cached is not None:
        return cached

    # 2. On Cache MISS: query database
    restaurants = db.query(Restaurant).all()
    response_data = [RestaurantResponse.model_validate(r).model_dump() for r in restaurants]

    # 3. Cache in Redis for 5 minutes (300 seconds)
    set_cache(CACHE_KEY_ALL_RESTAURANTS, response_data, ttl_seconds=DEFAULT_MENU_TTL_SECONDS)
    return response_data

@router.post("", response_model=RestaurantResponse)
def create_restaurant(rest_in: RestaurantCreate, db: Session = Depends(get_db)):
    new_rest = Restaurant(**rest_in.dict())
    db.add(new_rest)
    db.commit()
    db.refresh(new_rest)
    # Evict cache so fresh restaurant list is served
    invalidate_restaurants_and_menu_cache()
    return new_rest

@router.put("/{restaurant_id}", response_model=RestaurantResponse)
def update_restaurant(restaurant_id: int, rest_in: RestaurantUpdate, db: Session = Depends(get_db)):
    restaurant = db.query(Restaurant).filter(Restaurant.id == restaurant_id).first()
    if not restaurant:
        raise HTTPException(status_code=404, detail="Restaurant not found")

    update_data = rest_in.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(restaurant, key, value)

    db.commit()
    db.refresh(restaurant)
    # Evict cache so updated restaurant details are served
    invalidate_restaurants_and_menu_cache()
    return restaurant

@router.get("/{restaurant_id}", response_model=RestaurantResponse)
def get_restaurant(restaurant_id: int, db: Session = Depends(get_db)):
    cache_key = f"{CACHE_PREFIX_RESTAURANT}{restaurant_id}"
    cached = get_cache(cache_key)
    if cached is not None:
        return cached

    restaurant = db.query(Restaurant).filter(Restaurant.id == restaurant_id).first()
    if not restaurant:
        raise HTTPException(status_code=404, detail="Restaurant not found")

    resp_data = RestaurantResponse.model_validate(restaurant).model_dump()
    set_cache(cache_key, resp_data, ttl_seconds=DEFAULT_MENU_TTL_SECONDS)
    return resp_data


@router.get("/manager/{manager_id}", response_model=List[RestaurantResponse])
def get_restaurants_by_manager(manager_id: int, db: Session = Depends(get_db)):
    restaurants = db.query(Restaurant).filter(Restaurant.manager_id == manager_id).all()
    if not restaurants:
        # If user is a restaurant manager or super admin without a linked restaurant, auto-create a kitchen for them
        user = db.query(User).filter(User.id == manager_id).first()
        if user and user.role in ["restaurant_manager", "super_admin"]:
            auto_rest = Restaurant(
                name=f"{user.name}'s Kitchen",
                cuisine="Authentic Biryani & South Indian Specials",
                description=f"Fresh artisanal culinary dishes prepared by Chef {user.name}.",
                image_url="https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=1000&q=80",
                address=user.address if user.address else "100 Feet Road, T. Nagar, Chennai - 600017",
                lat=user.lat,
                lon=user.lon,
                rating=4.8,
                delivery_time_mins=25,
                manager_id=user.id,
            )
            db.add(auto_rest)
            db.commit()
            db.refresh(auto_rest)
            return [auto_rest]

    return restaurants
