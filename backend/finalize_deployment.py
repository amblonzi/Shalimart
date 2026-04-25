import paramiko
import time

def finalize():
    hostname = "23.88.39.3"
    username = "tesla"
    password = "ControL.4028s"
    
    # Using multiple steps to avoid complex quoting
    commands = [
        # Create SQL file
        "echo \"UPDATE users SET is_admin=true WHERE email='admin@shalimart.co.ke';\" > ~/update_admin.sql",
        # Run SQL via psql using redirect
        "cd ~/Shalimart_app && ~/docker-compose exec -T db psql -U postgres -d shalimart < ~/update_admin.sql",
        # Re-run seeding
        "cd ~/Shalimart_app && ~/docker-compose exec -T backend python seed_data.py"
    ]
    
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    
    try:
        print(f"Connecting to {hostname}...")
        client.connect(hostname, username=username, password=password)
        
        for cmd in commands:
            print(f"Executing: {cmd}")
            stdin, stdout, stderr = client.exec_command(cmd)
            print(stdout.read().decode())
            print(stderr.read().decode())
            
        print("Finalization complete.")
    finally:
        client.close()

if __name__ == "__main__":
    finalize()
