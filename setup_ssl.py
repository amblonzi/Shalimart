#!/usr/bin/env python3
"""
SSL Setup Script for Shalimart (Hetzner Server 91.98.40.198)
This script connects via SSH, installs Certbot, gets a Let's Encrypt cert,
configures auto-renewal hooks, uploads updated config files, and restarts docker.
"""

import paramiko
import os
import sys
import time

SERVER_IP   = "91.98.40.198"
SERVER_PORT = 22
SERVER_USER = "root"
SERVER_PASS = "ControL.4028s"
APP_DIR     = "/root/shalimart"

ROOT = os.path.dirname(os.path.abspath(__file__))

def progress(msg):
    print("\n" + ("=" * 55))
    print("  " + msg)
    print("=" * 55)

def run_ssh(client, cmd, timeout=180):
    print("  $ " + cmd[:120])
    stdin, stdout, stderr = client.exec_command(cmd, timeout=timeout, get_pty=True)
    out_lines = []
    for line in stdout:
        clean = line.rstrip().encode("ascii", errors="replace").decode("ascii")
        if clean:
            print("    " + clean)
            out_lines.append(clean)
    return "\n".join(out_lines)

def setup_ssl():
    progress("Connecting to {}@{}...".format(SERVER_USER, SERVER_IP))
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())

    try:
        client.connect(SERVER_IP, port=SERVER_PORT, username=SERVER_USER,
                       password=SERVER_PASS, timeout=15)
        print("  Connected!")
    except Exception as e:
        print("  ERROR: " + str(e))
        sys.exit(1)

    # 1. Install certbot
    progress("Installing Certbot...")
    run_ssh(client, "apt-get update -qq && apt-get install -y certbot")

    # 2. Stop containers that might be using port 80
    progress("Stopping containers to free port 80...")
    run_ssh(client, "cd {} && docker compose down".format(APP_DIR))

    # 3. Generate certificate
    progress("Generating Let's Encrypt certificate...")
    # Using standalone mode. If certificates already exist, it will just say so, or we can use certbot certonly
    cmd_certbot = "certbot certonly --standalone --non-interactive --agree-tos --email admin@shalimart.co.ke -d shalimart.co.ke -d www.shalimart.co.ke"
    out = run_ssh(client, cmd_certbot)
    
    if "Congratulations" not in out and "Certificate not yet due for renewal" not in out:
        print("  WARNING: Certbot did not succeed. Check output above.")
        
    # Ensure directory exists for renewal hooks
    run_ssh(client, "mkdir -p /etc/letsencrypt/renewal-hooks/pre/")
    run_ssh(client, "mkdir -p /etc/letsencrypt/renewal-hooks/post/")

    # Create pre-hook script to stop frontend
    pre_hook = f"""#!/bin/bash
cd {APP_DIR}
docker compose stop frontend
"""
    # Create post-hook script to start frontend
    post_hook = f"""#!/bin/bash
cd {APP_DIR}
docker compose start frontend
"""
    
    # Write hooks
    progress("Configuring auto-renewal hooks...")
    sftp = client.open_sftp()
    
    with sftp.file('/etc/letsencrypt/renewal-hooks/pre/stop_frontend.sh', 'w') as f:
        f.write(pre_hook)
    with sftp.file('/etc/letsencrypt/renewal-hooks/post/start_frontend.sh', 'w') as f:
        f.write(post_hook)
        
    # Make executable
    run_ssh(client, "chmod +x /etc/letsencrypt/renewal-hooks/pre/stop_frontend.sh")
    run_ssh(client, "chmod +x /etc/letsencrypt/renewal-hooks/post/start_frontend.sh")
    
    # 4. Upload modified local files
    progress("Uploading updated configuration files...")
    files_to_upload = [
        (".env", ".env"),
        ("docker-compose.yml", "docker-compose.yml"),
        ("frontend/nginx.conf", "frontend/nginx.conf")
    ]
    
    for local_file, remote_file in files_to_upload:
        local_path = os.path.join(ROOT, local_file)
        remote_path = f"{APP_DIR}/{remote_file}"
        print(f"  Uploading {local_file} -> {remote_path}")
        sftp.put(local_path, remote_path)
        
    sftp.close()

    # 5. Restart containers
    progress("Rebuilding and starting containers...")
    run_ssh(client, f"cd {APP_DIR} && docker compose up -d --build", timeout=300)
    
    # Wait for services
    print("  Waiting 10 seconds for services to initialize...")
    time.sleep(10)
    
    run_ssh(client, "docker ps")
    
    progress("SSL Setup Complete!")
    print(f"  Try accessing: https://shalimart.co.ke")

    client.close()

if __name__ == "__main__":
    setup_ssl()
