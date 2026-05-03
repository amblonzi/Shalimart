import csv
import os
import requests
import time

BASE_URL = "https://shalimart.co.ke/api"
UPLOADS_DIR = "uploads"

ADMIN_EMAIL = "admin@shalimart.co.ke"
ADMIN_PASSWORD = "admin123456"

def login() -> str:
    print(f"Logging in as {ADMIN_EMAIL}...")
    response = requests.post(f"{BASE_URL}/token", data={
        "username": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    })
    
    if response.status_code == 200:
        return response.json().get("access_token")
    return None

def upload_product(token: str, name: str, category: str, description: str, price: float, images: list):
    headers = {"Authorization": f"Bearer {token}"}
    data = {
        "name": name,
        "category": category,
        "description": description,
        "price": str(price),
        "stock": "100"
    }
    
    files = []
    opened_files = []
    for img_path in images:
        if os.path.exists(img_path):
            f = open(img_path, 'rb')
            opened_files.append(f)
            files.append(('files', (os.path.basename(img_path), f, 'image/png')))
            
    try:
        response = requests.post(f"{BASE_URL}/products", headers=headers, data=data, files=files)
        if response.status_code == 200:
            print(f"Successfully uploaded: {name}")
        else:
            print(f"Failed to upload {name}: {response.status_code} - {response.text}")
    finally:
        for f in opened_files:
            f.close()

def main():
    token = login()
    if not token:
        print("Failed to login.")
        return

    failed_products = [
        {
            "name": "Minimalist Nordic Round Decorative Mirror With A Leather Strap [BLACK/GOLD]",
            "category": "Home and furniture",
            "description": "<p>Premium quality Minimalist Nordic Round Decorative Mirror With A Leather Strap available in BLACK/GOLD.</p>",
            "price": 5000.0,
            "images": [os.path.join(UPLOADS_DIR, "SHA-HF-004.png")]
        },
        {
            "name": "7Pcs Luggage Travel Suitcase Organizers [BLACK/GREY/NAVY BLUE/BEIGE]",
            "category": "Kits products",
            "description": "<p>Premium quality 7Pcs Luggage Travel Suitcase Organizers available in BLACK/GREY/NAVY BLUE/BEIGE.</p>",
            "price": 1499.0,
            "images": [os.path.join(UPLOADS_DIR, "SHA-KIT-002.png")]
        },
        {
            "name": "200Ml Hip Whisky Bottle With Two Tot Cups [BLACK/BROWN]",
            "category": "Fashion and Beauty Accessories",
            "description": "<p>Premium quality 200Ml Hip Whisky Bottle With Two Tot Cups available in BLACK/BROWN.</p>",
            "price": 1299.0,
            "images": [os.path.join(UPLOADS_DIR, "SHA-FBA-003.png")]
        }
    ]

    for p in failed_products:
        upload_product(token, p["name"], p["category"], p["description"], p["price"], p["images"])
        time.sleep(1)

if __name__ == "__main__":
    main()
