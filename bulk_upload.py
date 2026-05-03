import csv
import os
import requests
import time
from typing import Dict

BASE_URL = "https://shalimart.co.ke/api"
UPLOADS_DIR = "uploads"
CSV_FILE = os.path.join(UPLOADS_DIR, "shalina-mart-final-images.csv")

ADMIN_EMAIL = "admin@shalimart.co.ke"
ADMIN_PASSWORD = "admin123456"

# Category mapping
CATEGORY_MAP = {
    "Home & Furniture": "Home and furniture",
    "Appliances": "Appliances",
    "Kits Products": "Kits products",
    "Outdoor": "Outdoor",
    "Health & Wellness": "Health and wellness",
    "Fashion & Beauty Accessories": "Fashion and Beauty Accessories",
    # Additional mappings if needed
    "Agro": "Agro (Farm Equipment and Machinery)"
}

def login() -> str:
    print(f"Logging in as {ADMIN_EMAIL}...")
    response = requests.post(f"{BASE_URL}/token", data={
        "username": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    })
    
    if response.status_code == 200:
        print("Login successful.")
        return response.json().get("access_token")
    else:
        print(f"Login failed: {response.status_code} - {response.text}")
        return None

def seed_admin_if_needed():
    # If login fails, maybe admin doesn't exist. Let's try to register it.
    print("Attempting to register admin user if it doesn't exist...")
    resp = requests.post(f"{BASE_URL}/register", json={
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD,
        "full_name": "Admin User",
        "phone_number": "0000000000"
    })
    if resp.status_code == 200:
        print("Admin user registered.")
        # Make the user an admin via raw database call if needed, but let's hope it's already an admin 
        # or we can do it via a direct script to the server.
    else:
        print(f"Admin registration response: {resp.status_code} - {resp.text}")

def upload_product(token: str, name: str, category: str, description: str, price: float, images: list):
    headers = {
        "Authorization": f"Bearer {token}"
    }
    
    # We must send multipart/form-data
    data = {
        "name": name,
        "category": category,
        "description": description,
        "price": str(price),
        "stock": "100" # Default stock
    }
    
    files = []
    opened_files = []
    
    for img_path in images:
        if os.path.exists(img_path):
            f = open(img_path, 'rb')
            opened_files.append(f)
            files.append(('files', (os.path.basename(img_path), f, 'image/png')))
        else:
            print(f"Warning: Image not found at {img_path}")
            
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
        seed_admin_if_needed()
        token = login()
        if not token:
            print("Could not obtain access token. Exiting.")
            return

    # Parse CSV
    print(f"Reading CSV: {CSV_FILE}")
    
    # We need to collect parent variables to map their data to variations
    parents: Dict[str, dict] = {}
    
    with open(CSV_FILE, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        
        # Pass 1: Collect Parents
        f.seek(0)
        next(reader) # skip header
        for row in reader:
            if row['Type'] == 'variable':
                sku = row['SKU']
                parents[sku] = {
                    'Name': row['Name'],
                    'Description': row['Description'],
                    'Categories': row['Categories'],
                    'Images': row['Images']
                }
                
        # Pass 2: Process variations and simple products
        f.seek(0)
        next(reader)
        for row in reader:
            p_type = row['Type']
            
            if p_type == 'variable':
                continue # Variations will handle these
            
            # Extract basic data
            raw_category = row['Categories']
            
            # Map category
            category = CATEGORY_MAP.get(raw_category, raw_category)
            
            if p_type == 'simple':
                name = row['Name']
                if row['Attribute 1 Value(s)']:
                     name += f" ({row['Attribute 1 Value(s)']})"
                description = row['Description']
                price_str = row['Regular Price'] or row['Sale Price'] or "0"
                price = float(price_str.replace(',', ''))
                
                # Image mapping
                # Images column looks like: https://shalimart.co.ke/wp-content/uploads/shalina-mart-images/SHA-HW-001.png
                # We need to map to local uploads folder
                img_urls = [u.strip() for u in row['Images'].split(',')] if row['Images'] else []
                local_images = []
                for url in img_urls:
                    filename = url.split('/')[-1]
                    if filename:
                        local_images.append(os.path.join(UPLOADS_DIR, filename))
                
                upload_product(token, name, category, description, price, local_images)
                time.sleep(0.5) # Rate limiting
                
            elif p_type == 'variation':
                # The SKU for variation is often Parent-SKU-1, etc.
                # Let's derive the parent SKU
                sku = row['SKU']
                # Assume parent SKU is derived by removing the last hyphen and number
                # Or wait, the CSV parent SKU ends with '-PARENT'
                # Variation SKU is like 'SHA-OD-001-1'
                
                # Find matching parent
                # We can't rely just on '-PARENT' since the variation doesn't have it.
                # Variation: SHA-OD-001-1. Parent: SHA-OD-001-PARENT
                # Let's match by prefix
                parent_data = None
                for p_sku, p_data in parents.items():
                    base_p_sku = p_sku.replace('-PARENT', '')
                    if sku.startswith(base_p_sku):
                        parent_data = p_data
                        break
                
                if parent_data:
                    name = f"{parent_data['Name']} ({row['Attribute 1 Value(s)']})"
                    description = parent_data['Description']
                    
                    raw_cat = parent_data['Categories']
                    category = CATEGORY_MAP.get(raw_cat, raw_cat)
                    
                    price_str = row['Regular Price'] or row['Sale Price'] or "0"
                    price = float(price_str.replace(',', ''))
                    
                    img_urls = [u.strip() for u in parent_data['Images'].split(',')] if parent_data['Images'] else []
                    local_images = []
                    for url in img_urls:
                        filename = url.split('/')[-1]
                        if filename:
                            local_images.append(os.path.join(UPLOADS_DIR, filename))
                            
                    upload_product(token, name, category, description, price, local_images)
                    time.sleep(0.5)
                else:
                    print(f"Warning: Could not find parent for variation SKU {sku}")

if __name__ == "__main__":
    main()
