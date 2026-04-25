import csv
import io
import re
from sqlalchemy.orm import Session
from database import engine, SessionLocal
import models

def strip_tags(text):
    if not text:
        return ""
    return re.sub('<[^<]+?>', '', text)

def import_products(csv_path: str):
    db = SessionLocal()
    try:
        with open(csv_path, mode='r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            count = 0
            for row in reader:
                # Map WooCommerce headers to our model
                name = row.get("Name")
                reg_price_str = row.get("Regular Price")
                sale_price_str = row.get("Sale Price")
                
                if not name:
                    continue
                
                try:
                    # Logic for price and original_price
                    reg_price = float(reg_price_str) if reg_price_str else 0.0
                    sale_price = float(sale_price_str) if sale_price_str else None
                    
                    if sale_price and sale_price < reg_price:
                        price = sale_price
                        original_price = reg_price
                    else:
                        price = reg_price
                        original_price = None
                        
                    stock = int(row.get("Stock", 0)) if row.get("Stock") else 0
                except (ValueError, TypeError):
                    continue
                
                # Check if product exists to avoid duplicates
                existing = db.query(models.Product).filter(models.Product.name == name).first()
                if existing:
                    # Update existing product description if needed? 
                    # For now, let's just skip to avoid duplicates.
                    continue

                description = strip_tags(row.get("Description", ""))
                
                new_p = models.Product(
                    name=name,
                    category=row.get("Categories", "General"),
                    description=description,
                    price=price,
                    original_price=original_price,
                    stock=stock,
                    badge="Sale" if original_price else None,
                    images=row.get("Images")
                )
                db.add(new_p)
                db.flush()
                
                image_url = row.get("Images")
                if image_url:
                    urls = [u.strip() for u in image_url.split(",") if u.strip()]
                    for i, url in enumerate(urls):
                        img = models.ProductImage(product_id=new_p.id, url=url, sort_order=i)
                        db.add(img)
                
                count += 1
            db.commit()
            print(f"Successfully imported {count} products.")
    except Exception as e:
        db.rollback()
        print(f"Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    import_products("/app/products.csv")
