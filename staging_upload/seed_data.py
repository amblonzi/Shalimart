import requests
import os

# Configuration — works both inside Docker and locally
API_URL = os.getenv("API_URL", "http://backend:8000")
ADMIN_EMAIL = "admin@shalimart.co.ke"
ADMIN_PASS = "admin123456"


def seed():
    # 1. Register Admin
    print("Registering admin...")
    requests.post(f"{API_URL}/register", json={
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASS,
        "full_name": "Shalina Admin",
        "phone_number": "254700000000"
    })

    # 2. Login to get token
    print("Logging in...")
    login_res = requests.post(f"{API_URL}/token", data={
        "username": ADMIN_EMAIL,
        "password": ADMIN_PASS
    })
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 3. Promote to admin (manually via DB since no endpoint exists)
    # This step requires the admin to be promoted via DB or an initial seed script
    print("Note: You must manually set is_admin=True for this user in the database.")
    print("  Run: UPDATE users SET is_admin=true WHERE email='admin@shalimart.co.ke';")

    # 4. Seed Products
    products = [
        {"name": "Heavy Duty Jembe", "category": "Agro / Farm Equipment", "price": 1200, "original_price": 1500, "stock": 50, "badge": "Sale", "description": "Ideal for small-scale farming. Strong steel head with ergonomic handle."},
        {"name": "Car Seat Cover Set", "category": "Automotive", "price": 3500, "stock": 30, "description": "Universal fit for most Kenyan sedans and SUVs. Durable PU leather."},
        {"name": "Adjustable Dumbbell 10kg", "category": "Fitness", "price": 2800, "stock": 20, "description": "Cast iron with rubber grip. Adjustable weight plates."},
        {"name": "Ankara Print Dress", "category": "Fashion & Beauty", "price": 1800, "original_price": 2200, "stock": 40, "badge": "Hot", "description": "Vibrant African fabric, suitable for all occasions."},
        {"name": "Non-stick Sufuria Set", "category": "Household Items", "price": 2200, "stock": 60, "description": "Set of 3 premium aluminium sufurias with non-stick coating."},
        {"name": "Moringa Capsules 60s", "category": "Health & Wellness", "price": 950, "stock": 100, "badge": "New", "description": "100% organic Kenyan moringa. Boosts immunity and energy."},
        {"name": "Solar Panel 100W", "category": "Agro / Farm Equipment", "price": 8500, "original_price": 9800, "stock": 15, "badge": "Featured", "description": "Monocrystalline solar panel. Perfect for off-grid homes and farms."},
        {"name": "Ceramic Dinner Set 16pc", "category": "Household Items", "price": 3200, "stock": 25, "description": "Elegant floral design. Includes plates, bowls, cups, and saucers."},
    ]

    print("Seeding products...")
    for p in products:
        res = requests.post(f"{API_URL}/products", data=p, files=[
            ("files", ("placeholder.jpg", b"placeholder_image_data", "image/jpeg"))
        ], headers=headers)
        if res.status_code == 200:
            print(f"  ✓ Added: {p['name']}")
        else:
            print(f"  ✗ Failed: {p['name']} — {res.text}")


if __name__ == "__main__":
    try:
        seed()
        print("\nSeeding complete!")
    except Exception as e:
        print(f"Error: {e}")
