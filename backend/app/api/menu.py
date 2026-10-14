from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from ..database import get_db
from ..models import MenuItem, Restaurant
from ..schemas import MenuItemCreate, MenuItemUpdate, MenuItemResponse
from ..cache import invalidate_restaurants_and_menu_cache

router = APIRouter(prefix="/api/menu-items", tags=["menu"])

@router.post("", response_model=MenuItemResponse)
def create_menu_item(item_in: MenuItemCreate, db: Session = Depends(get_db)):
    restaurant = db.query(Restaurant).filter(Restaurant.id == item_in.restaurant_id).first()
    if not restaurant:
        raise HTTPException(status_code=404, detail="Restaurant not found")

    new_item = MenuItem(**item_in.dict())
    db.add(new_item)
    db.commit()
    db.refresh(new_item)
    # Evict cache so newly added dish shows up immediately
    invalidate_restaurants_and_menu_cache()
    return new_item

@router.put("/{item_id}", response_model=MenuItemResponse)
def update_menu_item(item_id: int, item_in: MenuItemUpdate, db: Session = Depends(get_db)):
    item = db.query(MenuItem).filter(MenuItem.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Menu item not found")

    update_data = item_in.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(item, key, value)

    db.commit()
    db.refresh(item)
    # Evict cache so updated price/details show up immediately
    invalidate_restaurants_and_menu_cache()
    return item

@router.patch("/{item_id}/toggle-availability", response_model=MenuItemResponse)
def toggle_menu_item_availability(item_id: int, db: Session = Depends(get_db)):
    item = db.query(MenuItem).filter(MenuItem.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Menu item not found")

    item.is_available = not item.is_available
    db.commit()
    db.refresh(item)
    # Evict cache so out-of-stock/available status shows up immediately
    invalidate_restaurants_and_menu_cache()
    return item

@router.delete("/{item_id}")
def delete_menu_item(item_id: int, db: Session = Depends(get_db)):
    item = db.query(MenuItem).filter(MenuItem.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Menu item not found")

    db.delete(item)
    db.commit()
    # Evict cache so deleted dish is immediately removed for customers
    invalidate_restaurants_and_menu_cache()
    return {"message": "Menu item deleted successfully", "id": item_id}

