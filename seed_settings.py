import paramiko

HOST = "91.98.40.198"
USER = "root"
PASSWORD = "ControL.4028s"

SETTINGS = [
    ("mpesa_consumer_key", "", "M-Pesa Consumer Key"),
    ("mpesa_consumer_secret", "", "M-Pesa Consumer Secret"),
    ("mpesa_shortcode", "", "M-Pesa Shortcode / Paybill"),
    ("mpesa_passkey", "", "M-Pesa Passkey"),
    ("mpesa_env", "sandbox", "M-Pesa Environment (sandbox/production)"),
    ("mpesa_paybill", "", "Public Display Paybill Number"),
    ("mpesa_account_name", "SHALINA MART", "Display Account Name")
]

def execute_command(ssh, cmd):
    print(f"Executing: {cmd}")
    stdin, stdout, stderr = ssh.exec_command(cmd)
    out = stdout.read().decode().strip()
    err = stderr.read().decode().strip()
    if out: print("OUT:", out)
    if err: print("ERR:", err)
    return out, err

def main():
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    print("Connecting to server...")
    ssh.connect(HOST, username=USER, password=PASSWORD)
    
    for key, value, desc in SETTINGS:
        sql = f"INSERT INTO system_settings (key, value, description, updated_at) VALUES ('{key}', '{value}', '{desc}', now()) ON CONFLICT (key) DO UPDATE SET updated_at = now();"
        cmd = f"docker exec shalimart_db psql -U postgres -d shalimart -c \"{sql}\""
        execute_command(ssh, cmd)
    
    ssh.close()
    print("Done.")

if __name__ == "__main__":
    main()
