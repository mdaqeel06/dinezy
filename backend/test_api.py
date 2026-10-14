import sys
import os

# Set path to import app
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from fastapi.testclient import TestClient
from app.main import app
from app.database import engine, Base, SessionLocal
from app.seed import seed_database

def run_tests():
    print("=== Running Dinezy Full-Stack Backend Verification Tests with JWT & Admin ===")

    # Initialize DB & seed
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    seed_database(db)
    db.close()

    client = TestClient(app)

    # 1. Health check
    res = client.get("/api/health")
    assert res.status_code == 200, f"Health check failed: {res.text}"
    print("[PASS] 1. Health check OK")

    import time
    test_email = f"alice_{int(time.time())}@test.com"

    # 2. Register a new user -> verify default role is 'customer'
    register_payload = {
        "name": "Alice Tester",
        "email": test_email,
        "password": "mypassword123",
        "phone": "+1 555-9876",
    }
    res = client.post("/api/auth/register", json=register_payload)
    assert res.status_code == 200, f"Registration failed: {res.text}"
    reg_data = res.json()
    assert "access_token" in reg_data, "Token missing in register response"
    assert reg_data["user"]["role"] == "customer", f"Expected default role 'customer', got {reg_data['user']['role']}"
    alice_token = reg_data["access_token"]
    alice_id = reg_data["user"]["id"]
    print(f"[PASS] 2. User registration OK: Default role is '{reg_data['user']['role']}' with JWT access token")

    # 3. Login with credentials
    login_res = client.post("/api/auth/login", json={
        "email": test_email,
        "password": "mypassword123"
    })
    assert login_res.status_code == 200
    assert "access_token" in login_res.json()
    print("[PASS] 3. Login with bcrypt verification OK")

    # 4. Access /api/auth/me with Bearer token
    me_res = client.get("/api/auth/me", headers={"Authorization": f"Bearer {alice_token}"})
    assert me_res.status_code == 200
    assert me_res.json()["email"] == test_email
    print(f"[PASS] 4. Authenticated /api/auth/me OK for {me_res.json()['name']}")

    # 5. Verify Alice (Customer) cannot access /api/admin/users (403 Forbidden)
    forbidden_res = client.get("/api/admin/users", headers={"Authorization": f"Bearer {alice_token}"})
    assert forbidden_res.status_code == 403, f"Expected 403 Forbidden, got {forbidden_res.status_code}"
    print("[PASS] 5. Role protection OK: Customer denied access to admin endpoint (403 Forbidden)")

    # 6. Login as Super Admin
    admin_login_res = client.post("/api/auth/login", json={
        "email": "admin@dinezy.com",
        "password": "admin123"
    })
    assert admin_login_res.status_code == 200, f"Admin login failed: {admin_login_res.text}"
    admin_token = admin_login_res.json()["access_token"]
    print("[PASS] 6. Super Admin login OK")

    # 7. Super Admin lists all users
    admin_users_res = client.get("/api/admin/users", headers={"Authorization": f"Bearer {admin_token}"})
    assert admin_users_res.status_code == 200
    all_users = admin_users_res.json()
    assert len(all_users) >= 5, "Expected users"
    print(f"[PASS] 7. Super Admin listed {len(all_users)} platform users")

    # 8. Super Admin promotes Alice from customer to restaurant_manager
    promote_res = client.patch(
        f"/api/admin/users/{alice_id}/role",
        json={"role": "restaurant_manager"},
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert promote_res.status_code == 200
    assert promote_res.json()["role"] == "restaurant_manager"
    print(f"[PASS] 8. Super Admin promoted Alice to '{promote_res.json()['role']}'")

    # 9. Super Admin demotes Alice from restaurant_manager to delivery_partner
    demote_res = client.patch(
        f"/api/admin/users/{alice_id}/role",
        json={"role": "delivery_partner"},
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert demote_res.status_code == 200
    assert demote_res.json()["role"] == "delivery_partner"
    print(f"[PASS] 9. Super Admin updated Alice role to '{demote_res.json()['role']}'")

    # 10. Customer Order and Delivery Lifecycle check
    restaurants_res = client.get("/api/restaurants")
    assert restaurants_res.status_code == 200
    rest = restaurants_res.json()[0]
    dish = rest["menu_items"][0]

    order_payload = {
        "customer_id": alice_id,
        "restaurant_id": rest["id"],
        "delivery_address": "456 Main St, Suite 10",
        "notes": "Leave at front door",
        "items": [
            {"menu_item_id": dish["id"], "quantity": 1}
        ]
    }
    order_res = client.post("/api/orders", json=order_payload)
    assert order_res.status_code == 200
    order_id = order_res.json()["id"]
    assert order_res.json()["status"] == "PENDING_PAYMENT"
    assert order_res.json()["payment_status"] == "PENDING"
    assert order_res.json()["currency"] == "INR"
    assert "razorpay_order_id" in order_res.json()

    # Accept order
    accept_res = client.patch(f"/api/orders/{order_id}/manager-action", json={"status": "accepted"})
    assert accept_res.status_code == 200

    # Assign a registered delivery partner
    partner = next((u for u in all_users if u["role"] == "delivery_partner"), None)
    if not partner:
        partner = next(u for u in all_users if u["email"] == "leo@dinezy.com")
    assign_res = client.post(f"/api/orders/{order_id}/assign-delivery", json={"delivery_partner_id": partner["id"]})
    assert assign_res.status_code == 200

    # Partner delivers
    deliv_res = client.patch(f"/api/orders/{order_id}/delivery-action", json={"status": "delivered"})
    assert deliv_res.status_code == 200
    assert deliv_res.json()["status"] == "delivered"
    print(f"[PASS] 10. Razorpay order placement (PENDING_PAYMENT / PENDING in INR), assignment, and delivery lifecycle verified")

    # 11. Super Admin cannot change their own role
    admin_self_id = admin_login_res.json()["user"]["id"]
    self_role_res = client.patch(
        f"/api/admin/users/{admin_self_id}/role",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"role": "customer"}
    )
    assert self_role_res.status_code == 400, f"Expected 400, got {self_role_res.status_code}"
    print("[PASS] 11. Super Admin prevented from changing their own role (HTTP 400)")

    # 12. Super Admin cannot delete their own account
    self_delete_res = client.delete(
        f"/api/admin/users/{admin_self_id}",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert self_delete_res.status_code == 400, f"Expected 400, got {self_delete_res.status_code}"
    print("[PASS] 12. Super Admin prevented from deleting their own account (HTTP 400)")

    # 13. Customer cannot delete a user
    cust_delete_res = client.delete(
        f"/api/admin/users/{alice_id}",
        headers={"Authorization": f"Bearer {alice_token}"}
    )
    assert cust_delete_res.status_code == 403, f"Expected 403, got {cust_delete_res.status_code}"
    print("[PASS] 13. Customer forbidden from deleting users (HTTP 403)")

    # 14. Super Admin can delete a user
    admin_delete_res = client.delete(
        f"/api/admin/users/{alice_id}",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert admin_delete_res.status_code == 200, f"Expected 200, got {admin_delete_res.status_code}"
    # Verify Alice is gone
    users_after_delete = client.get(
        "/api/admin/users",
        headers={"Authorization": f"Bearer {admin_token}"}
    ).json()
    assert not any(u["id"] == alice_id for u in users_after_delete)
    print("[PASS] 14. Super Admin deleted user successfully and verified user removal (HTTP 200)")

    print("\n[SUCCESS] ALL 14 TEST SUITES PASSED! JWT Auth, user deletion, and Super Admin guardrails verified.")

if __name__ == "__main__":
    run_tests()

