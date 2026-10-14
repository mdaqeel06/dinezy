from sqlalchemy.orm import Session
from .models import User, Restaurant, MenuItem, Order, OrderItem
from .security import hash_password
from datetime import datetime, timedelta

def seed_database(db: Session):
    # Check if data already exists
    if db.query(User).first():
        return

    print("[Dinezy] Seeding database with initial users, restaurants, and mouth-watering menus...")

    default_pwd = hash_password("password123")
    admin_pwd = hash_password("admin123")

    # 1. Users
    super_admin = User(
        name="Super Admin",
        email="admin@dinezy.com",
        hashed_password=admin_pwd,
        role="super_admin",
        phone="+1 555-0001",
        is_available=True
    )
    customer_alex = User(
        name="Alex Rivers",
        email="alex@dinezy.com",
        hashed_password=default_pwd,
        role="customer",
        phone="+1 555-0192",
        is_available=True
    )
    customer_sarah = User(
        name="Sarah Connor",
        email="sarah@dinezy.com",
        hashed_password=default_pwd,
        role="customer",
        phone="+1 555-0193",
        is_available=True
    )
    manager_marco = User(
        name="Chef Marco Rossi",
        email="marco@dinezy.com",
        hashed_password=default_pwd,
        role="restaurant_manager",
        phone="+1 555-0240",
        is_available=True
    )
    manager_kenji = User(
        name="Chef Kenji Tanaka",
        email="kenji@dinezy.com",
        hashed_password=default_pwd,
        role="restaurant_manager",
        phone="+1 555-0241",
        is_available=True
    )
    delivery_leo = User(
        name="Leo 'Lightning' Swift",
        email="leo@dinezy.com",
        hashed_password=default_pwd,
        role="delivery_partner",
        phone="+1 555-0333",
        is_available=True
    )
    delivery_maya = User(
        name="Maya Rider",
        email="maya@dinezy.com",
        hashed_password=default_pwd,
        role="delivery_partner",
        phone="+1 555-0334",
        is_available=True
    )

    db.add_all([super_admin, customer_alex, customer_sarah, manager_marco, manager_kenji, delivery_leo, delivery_maya])
    db.commit()

    # 2. Restaurants
    rest_italian = Restaurant(
        name="Bella Napoli Trattoria",
        cuisine="Authentic Italian & Woodfired Pizza",
        description="Fresh handcrafted sourdough pizzas, slow-simmered bolognese, and classic Italian desserts.",
        image_url="https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=1000&q=80",
        address="142 Via San Gregorio, Downtown",
        rating=4.8,
        delivery_time_mins=25,
        manager_id=manager_marco.id
    )

    rest_japanese = Restaurant(
        name="Tokyo Umami Ramen & Rolls",
        cuisine="Japanese Ramen, Donburi & Sushi",
        description="16-hour rich tonkotsu broth, springy artisan noodles, and fresh sashimi rolls.",
        image_url="https://images.unsplash.com/photo-1569718212165-3a8278d5f624?auto=format&fit=crop&w=1000&q=80",
        address="88 Sakura Boulevard, Midtown",
        rating=4.9,
        delivery_time_mins=30,
        manager_id=manager_kenji.id
    )

    rest_burgers = Restaurant(
        name="Flame & Bun Smokehouse",
        cuisine="Gourmet Smashed Burgers & Shakes",
        description="Dry-aged prime beef patties, melted sharp cheddar, brioche buns, and parmesan truffle fries.",
        image_url="https://images.unsplash.com/photo-1586190848861-99aa4a171e90?auto=format&fit=crop&w=1000&q=80",
        address="310 Oak Avenue, West End",
        rating=4.7,
        delivery_time_mins=20,
        manager_id=manager_marco.id
    )

    db.add_all([rest_italian, rest_japanese, rest_burgers])
    db.commit()

    # 3. Menu Items
    menu_items = [
        # Bella Napoli
        MenuItem(
            restaurant_id=rest_italian.id,
            name="Margherita Di Bufala",
            description="San Marzano tomato sauce, fresh buffalo mozzarella, basil leaves, and extra virgin olive oil.",
            price=299.00,
            category="Pizza",
            image_url="https://images.unsplash.com/photo-1604382355076-af4b0eb60143?auto=format&fit=crop&w=600&q=80",
            is_veg=True,
            is_available=True
        ),
        MenuItem(
            restaurant_id=rest_italian.id,
            name="Truffle Diavola Pizza",
            description="Spicy Calabrian salami, black truffle oil, smoked provolone, and hot honey drizzle.",
            price=399.00,
            category="Pizza",
            image_url="https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=600&q=80",
            is_veg=False,
            is_available=True
        ),
        MenuItem(
            restaurant_id=rest_italian.id,
            name="Handmade Tagliatelle Bolognese",
            description="Slow-braised beef and pork ragù served with aged Parmigiano Reggiano over fresh egg pasta.",
            price=349.00,
            category="Pasta",
            image_url="https://images.unsplash.com/photo-1621996346565-e3d5d6281699?auto=format&fit=crop&w=600&q=80",
            is_veg=False,
            is_available=True
        ),
        MenuItem(
            restaurant_id=rest_italian.id,
            name="Classic Tiramisu",
            description="Espresso-soaked savoiardi ladyfingers layered with rich mascarpone and Dutch cocoa.",
            price=199.00,
            category="Dessert",
            image_url="https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?auto=format&fit=crop&w=600&q=80",
            is_veg=True,
            is_available=True
        ),

        # Tokyo Umami
        MenuItem(
            restaurant_id=rest_japanese.id,
            name="Signature Tonkotsu Black Ramen",
            description="Rich pork bone broth infused with black garlic oil, tender chashu pork, nitamago egg, and bamboo shoots.",
            price=320.00,
            category="Ramen",
            image_url="https://images.unsplash.com/photo-1557872943-16a5ac26437e?auto=format&fit=crop&w=600&q=80",
            is_veg=False,
            is_available=True
        ),
        MenuItem(
            restaurant_id=rest_japanese.id,
            name="Spicy Miso Ramen",
            description="Savory miso blend, chili sesame oil, minced spicy pork, sweet corn, and scallions.",
            price=310.00,
            category="Ramen",
            image_url="https://images.unsplash.com/photo-1569718212165-3a8278d5f624?auto=format&fit=crop&w=600&q=80",
            is_veg=False,
            is_available=True
        ),
        MenuItem(
            restaurant_id=rest_japanese.id,
            name="Crispy Pan-Fried Pork Gyoza",
            description="6 pieces of pan-crisped Japanese dumplings served with spicy sesame ponzu dipping sauce.",
            price=180.00,
            category="Sides",
            image_url="https://images.unsplash.com/photo-1496116218417-1a781b1c416c?auto=format&fit=crop&w=600&q=80",
            is_veg=False,
            is_available=True
        ),
        MenuItem(
            restaurant_id=rest_japanese.id,
            name="Dragon Salmon Crunch Roll",
            description="Tempura prawn and avocado topped with seared salmon, spicy mayo, eel glaze, and crispy tobiko.",
            price=360.00,
            category="Sushi",
            image_url="https://images.unsplash.com/photo-1579871494447-9811cf80d66c?auto=format&fit=crop&w=600&q=80",
            is_veg=False,
            is_available=True
        ),

        # Flame & Bun
        MenuItem(
            restaurant_id=rest_burgers.id,
            name="The Double Smashed Truffle Burger",
            description="Twin Angus beef smash patties, melted swiss cheese, sautéed balsamic mushrooms, truffle aioli on toasted brioche.",
            price=249.00,
            category="Burger",
            image_url="https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=600&q=80",
            is_veg=False,
            is_available=True
        ),
        MenuItem(
            restaurant_id=rest_burgers.id,
            name="Crispy Nashville Hot Chicken Burger",
            description="Spiced buttermilk fried chicken thigh, slaw, bread & butter pickles, chipotle honey drizzle.",
            price=229.00,
            category="Burger",
            image_url="https://images.unsplash.com/photo-1625813506062-0aeb1d7a094b?auto=format&fit=crop&w=600&q=80",
            is_veg=False,
            is_available=True
        ),
        MenuItem(
            restaurant_id=rest_burgers.id,
            name="Loaded Parmesan Truffle Fries",
            description="Crispy golden skin-on fries tossed in white truffle oil, fresh rosemary, and grated aged parmesan.",
            price=149.00,
            category="Sides",
            image_url="https://images.unsplash.com/photo-1573080496219-bb080dd4f877?auto=format&fit=crop&w=600&q=80",
            is_veg=True,
            is_available=True
        ),
        MenuItem(
            restaurant_id=rest_burgers.id,
            name="Salted Caramel Bourbon Thickshake",
            description="Artisanal vanilla bean gelato spun with sea salt caramel and crushed butter toffee crumbs.",
            price=129.00,
            category="Drinks",
            image_url="https://images.unsplash.com/photo-1572490122747-3968b75cc699?auto=format&fit=crop&w=600&q=80",
            is_veg=True,
            is_available=True
        )
    ]

    db.add_all(menu_items)
    db.commit()

    # 4. Sample active order to showcase immediate dashboard state
    sample_order = Order(
        customer_id=customer_alex.id,
        restaurant_id=rest_italian.id,
        delivery_partner_id=delivery_leo.id,
        status="assigned",
        order_status="assigned",
        payment_status="PAID",
        currency="INR",
        total_amount=737.90,
        delivery_address="742 Evergreen Terrace, Apt 4B, Chennai",
        notes="Please leave on porch if no answer",
        created_at=datetime.utcnow() - timedelta(minutes=15)
    )
    db.add(sample_order)
    db.commit()

    item1 = OrderItem(
        order_id=sample_order.id,
        menu_item_id=menu_items[0].id,
        item_name=menu_items[0].name,
        unit_price=menu_items[0].price,
        quantity=1,
        subtotal=299.00
    )
    item2 = OrderItem(
        order_id=sample_order.id,
        menu_item_id=menu_items[1].id,
        item_name=menu_items[1].name,
        unit_price=menu_items[1].price,
        quantity=1,
        subtotal=399.00
    )
    db.add_all([item1, item2])
    db.commit()

    print("[Dinezy] Database seeded successfully!")
