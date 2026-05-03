#!/usr/bin/env python3
"""
Resume deployment -- files are already on server, just build and start.
"""
import paramiko
import time
import sys

SERVER_IP   = "91.98.40.198"
SERVER_PORT = 22
SERVER_USER = "root"
SERVER_PASS = "ControL.4028s"
APP_DIR     = "/root/shalimart"

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

print("\n" + "="*55)
print("  Connecting to {}@{}...".format(SERVER_USER, SERVER_IP))
print("="*55)

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
try:
    client.connect(SERVER_IP, port=SERVER_PORT, username=SERVER_USER,
                   password=SERVER_PASS, timeout=15)
    print("  Connected!")
except Exception as e:
    print("  ERROR: " + str(e))
    sys.exit(1)

# Check what's on the server already
print("\n" + "="*55 + "\n  Checking server state...\n" + "="*55)
run_ssh(client, "ls -la {}".format(APP_DIR))
run_ssh(client, "docker ps -a 2>&1")

# Build and start
print("\n" + "="*55 + "\n  Running docker compose up --build...\n" + "="*55)
print("  (This will take 3-5 minutes for first build)")
run_ssh(client,
    "cd {} && docker compose up -d --build 2>&1".format(APP_DIR),
    timeout=600)

# Wait
print("\n  Waiting 20s for services...")
time.sleep(20)

# Check status
print("\n" + "="*55 + "\n  Container Status\n" + "="*55)
out = run_ssh(client, "docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'")

db_ok       = "shalimart_db"       in out
backend_ok  = "shalimart_backend"  in out
frontend_ok = "shalimart_frontend" in out

print("\n  [{}] shalimart_db".format("OK" if db_ok else "MISSING"))
print("  [{}] shalimart_backend".format("OK" if backend_ok else "MISSING"))
print("  [{}] shalimart_frontend".format("OK" if frontend_ok else "MISSING"))

if not backend_ok:
    print("\n  Backend logs:")
    run_ssh(client, "docker logs shalimart_backend --tail 30 2>&1")
if not frontend_ok:
    print("\n  Frontend logs:")
    run_ssh(client, "docker logs shalimart_frontend --tail 20 2>&1")

# Test endpoints
print("\n" + "="*55 + "\n  Testing Endpoints\n" + "="*55)
time.sleep(5)
run_ssh(client, "curl -s http://localhost:8000/ 2>&1")
run_ssh(client, "curl -s -o /dev/null -w 'Frontend HTTP: %{http_code}' http://localhost:80/ 2>&1")

client.close()

print("\n" + "="*55)
print("  DONE!")
print("  Visit: http://{}/".format(SERVER_IP))
print("  Admin: http://{}/admin".format(SERVER_IP))
print("="*55 + "\n")
