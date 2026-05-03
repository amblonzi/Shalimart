import paramiko
import time

HOST = "91.98.40.198"
USER = "root"
PASSWORD = "ControL.4028s"

def execute_command(ssh, cmd):
    print(f"Executing: {cmd}")
    stdin, stdout, stderr = ssh.exec_command(cmd)
    out = stdout.read().decode('utf-8', errors='replace').strip()
    err = stderr.read().decode('utf-8', errors='replace').strip()
    if out: print("OUT:", out.encode('ascii', errors='replace').decode())
    if err: print("ERR:", err.encode('ascii', errors='replace').decode())
    return out, err

def main():
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    print("Connecting to server...")
    ssh.connect(HOST, username=USER, password=PASSWORD)
    
    # 1. Promote admin user
    sql_cmd = "UPDATE users SET is_admin = true WHERE email = 'admin@shalimart.co.ke';"
    execute_command(ssh, f"docker exec shalimart_db psql -U postgres -d shalimart -c \"{sql_cmd}\"")
    
    # 2. Add payment_method column if not exists
    add_col = "ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_method VARCHAR DEFAULT 'mpesa';"
    execute_command(ssh, f"docker exec shalimart_db psql -U postgres -d shalimart -c \"{add_col}\"")
    
    # 2.5 Add reviews table
    create_reviews = """
    CREATE TABLE IF NOT EXISTS reviews (
        id SERIAL PRIMARY KEY,
        product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        rating INTEGER NOT NULL,
        comment TEXT,
        created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
    """
    execute_command(ssh, f"docker exec shalimart_db psql -U postgres -d shalimart -c \"{create_reviews}\"")
    
    # 2.6 Add product_images table
    create_product_images = """
    CREATE TABLE IF NOT EXISTS product_images (
        id SERIAL PRIMARY KEY,
        product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
        url VARCHAR NOT NULL,
        sort_order INTEGER DEFAULT 0,
        created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
    """
    execute_command(ssh, f"docker exec shalimart_db psql -U postgres -d shalimart -c \"{create_product_images}\"")
    
    # 3. Upload files
    sftp = ssh.open_sftp()
    sftp.put("frontend/nginx.conf", "/root/shalimart/frontend/nginx.conf")
    sftp.put("frontend/src/pages/AdminDashboard.tsx", "/root/shalimart/frontend/src/pages/AdminDashboard.tsx")
    sftp.put("frontend/src/pages/Cart.tsx", "/root/shalimart/frontend/src/pages/Cart.tsx")
    sftp.put("frontend/src/pages/Shop.tsx", "/root/shalimart/frontend/src/pages/Shop.tsx")
    sftp.put("frontend/src/pages/Home.tsx", "/root/shalimart/frontend/src/pages/Home.tsx")
    sftp.put("frontend/src/pages/OrderHistory.tsx", "/root/shalimart/frontend/src/pages/OrderHistory.tsx")
    sftp.put("frontend/src/pages/ProductDetail.tsx", "/root/shalimart/frontend/src/pages/ProductDetail.tsx")
    sftp.put("frontend/src/components/Footer.tsx", "/root/shalimart/frontend/src/components/Footer.tsx")
    sftp.put("frontend/src/components/Navbar.tsx", "/root/shalimart/frontend/src/components/Navbar.tsx")
    sftp.put("frontend/src/components/SEO.tsx", "/root/shalimart/frontend/src/components/SEO.tsx")
    sftp.put("frontend/src/App.tsx", "/root/shalimart/frontend/src/App.tsx")
    sftp.put("frontend/src/store/useStore.ts", "/root/shalimart/frontend/src/store/useStore.ts")
    sftp.put("frontend/index.html", "/root/shalimart/frontend/index.html")
    sftp.put("frontend/package.json", "/root/shalimart/frontend/package.json")
    sftp.put("frontend/public/logo_full.png", "/root/shalimart/frontend/public/logo_full.png")
    sftp.put("frontend/public/logo_initials.png", "/root/shalimart/frontend/public/logo_initials.png")
    sftp.put("frontend/public/favicon.png", "/root/shalimart/frontend/public/favicon.png")
    sftp.put("frontend/public/logo.png", "/root/shalimart/frontend/public/logo.png")
    sftp.put("backend/main.py", "/root/shalimart/backend/main.py")
    sftp.put("backend/mpesa.py", "/root/shalimart/backend/mpesa.py")
    sftp.put("backend/models.py", "/root/shalimart/backend/models.py")
    sftp.put("backend/schemas.py", "/root/shalimart/backend/schemas.py")
    sftp.close()
    
    # 4. Build and deploy
    execute_command(ssh, "cd /root/shalimart && docker compose build frontend backend && docker compose up -d frontend backend")
    
    # 5. Check logs
    print("\n--- Backend Logs (Last 20 lines) ---")
    execute_command(ssh, "docker logs shalimart_backend --tail 20")
    
    ssh.close()
    print("Done.")

if __name__ == "__main__":
    main()
