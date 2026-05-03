#!/usr/bin/env python3
"""
Shalimart Deployment Script -- Hetzner Server 91.98.40.198
Uploads and deploys the full stack via Docker Compose over SSH.
"""

import paramiko
import tarfile
import os
import sys
import time
import io

# ─── Config ───────────────────────────────────────────────
SERVER_IP   = "91.98.40.198"
SERVER_PORT = 22
SERVER_USER = "root"
SERVER_PASS = "ControL.4028s"
APP_DIR     = "/root/shalimart"

# Files/dirs to exclude from upload
EXCLUDES = {
    "node_modules", ".git", "__pycache__", ".dockerignore",
    "cleanup.ps1",
    "Shalimart admin Details.txt",
    "uploads",
}

ROOT = os.path.dirname(os.path.abspath(__file__))


# ─── Helpers ──────────────────────────────────────────────

def progress(msg):
    print("\n" + ("=" * 55))
    print("  " + msg)
    print("=" * 55)

def run_ssh(client, cmd, timeout=180):
    """Run a command and return (stdout, stderr)."""
    print("  $ " + cmd[:100])
    stdin, stdout, stderr = client.exec_command(cmd, timeout=timeout, get_pty=False)
    out = stdout.read().decode("utf-8", errors="replace")
    err = stderr.read().decode("utf-8", errors="replace")
    if out.strip():
        for line in out.strip().split("\n")[:20]:
            print("    " + line)
    if err.strip():
        for line in err.strip().split("\n")[:10]:
            print("    [stderr] " + line)
    return out, err

def run_ssh_long(client, cmd, timeout=600):
    """Run a long-running command, streaming output."""
    print("  $ " + cmd[:100])
    stdin, stdout, stderr = client.exec_command(cmd, timeout=timeout, get_pty=True)
    lines_shown = 0
    for line in stdout:
        # Strip non-ASCII characters (Docker spinner glyphs crash Windows cp1252)
        clean = line.rstrip().encode("ascii", errors="replace").decode("ascii")
        if clean and lines_shown < 120:
            print("    " + clean)
            lines_shown += 1
    return stdout.channel.recv_exit_status()

def create_tarball():
    """Create an in-memory tarball of the project (excluding junk)."""
    progress("Creating project tarball...")
    buf = io.BytesIO()
    with tarfile.open(fileobj=buf, mode="w:gz") as tar:
        for item in os.listdir(ROOT):
            if item in EXCLUDES:
                continue
            full_path = os.path.join(ROOT, item)
            tar.add(full_path, arcname=item)
            print("  + " + item)
    buf.seek(0)
    size_mb = len(buf.getvalue()) / 1024 / 1024
    print("  Tarball size: {:.1f} MB".format(size_mb))
    return buf.getvalue()


# ─── Main Deployment ──────────────────────────────────────

def deploy():
    progress("Connecting to {}@{}...".format(SERVER_USER, SERVER_IP))
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())

    try:
        client.connect(SERVER_IP, port=SERVER_PORT, username=SERVER_USER,
                       password=SERVER_PASS, timeout=15)
        print("  Connected!")
    except Exception as e:
        print("  ERROR: Cannot connect -- {}".format(e))
        sys.exit(1)

    # 0. Detect OS
    progress("Detecting server OS...")
    out, _ = run_ssh(client, "cat /etc/os-release | head -5")
    is_ubuntu_debian = "ubuntu" in out.lower() or "debian" in out.lower()
    is_rhel = "centos" in out.lower() or "rhel" in out.lower() or "fedora" in out.lower()
    print("  OS detected: Ubuntu/Debian={}, RHEL/CentOS={}".format(is_ubuntu_debian, is_rhel))

    # 1. Check / install Docker
    progress("Checking Docker installation...")
    out, _ = run_ssh(client, "which docker || echo NOT_FOUND")
    if "NOT_FOUND" in out or not out.strip():
        print("  Docker not found -- installing via official script...")
        run_ssh(client, "curl -fsSL https://get.docker.com | sh", timeout=300)
        run_ssh(client, "systemctl enable --now docker || true")
        run_ssh(client, "systemctl start docker || true")
        out, _ = run_ssh(client, "docker --version")
        print("  Docker installed: " + out.strip())
    else:
        out, _ = run_ssh(client, "docker --version")
        print("  Docker OK: " + out.strip())

    # 2. Ensure docker compose (v2 plugin or v1 binary)
    progress("Checking Docker Compose...")
    out, _ = run_ssh(client, "docker compose version 2>&1 || docker-compose --version 2>&1 || echo NOT_FOUND")
    if "NOT_FOUND" in out:
        print("  Installing docker-compose-plugin...")
        if is_ubuntu_debian:
            run_ssh(client, "apt-get update -qq && apt-get install -y docker-compose-plugin || true")
        # Fallback: install standalone docker-compose v2 binary
        out2, _ = run_ssh(client, "docker compose version 2>&1 || echo NOT_FOUND")
        if "NOT_FOUND" in out2:
            print("  Installing standalone docker-compose binary...")
            run_ssh(client,
                "curl -SL https://github.com/docker/compose/releases/download/v2.24.7/docker-compose-linux-x86_64 "
                "-o /usr/local/bin/docker-compose && chmod +x /usr/local/bin/docker-compose",
                timeout=120)
    out, _ = run_ssh(client, "docker compose version 2>&1 || docker-compose --version 2>&1")
    print("  Compose: " + out.strip())

    # Determine correct compose command
    out_cv, _ = run_ssh(client, "docker compose version 2>&1 | head -1")
    COMPOSE_CMD = "docker compose" if "Docker Compose" in out_cv or "docker compose" in out_cv.lower() else "docker-compose"
    print("  Using compose command: " + COMPOSE_CMD)

    # 3. Prepare app directory
    progress("Preparing application directory...")
    run_ssh(client, "mkdir -p {}/uploads".format(APP_DIR))

    # 4. Stop existing containers (if any)
    progress("Stopping existing containers...")
    run_ssh(client, "cd {} && {} down 2>&1 || true".format(APP_DIR, COMPOSE_CMD), timeout=60)

    # 5. Upload project tarball
    progress("Uploading project files...")
    tarball = create_tarball()
    sftp = client.open_sftp()
    remote_tar = "{}/shalimart_deploy.tar.gz".format(APP_DIR)
    print("  Uploading {} MB to {}...".format(round(len(tarball)/1024/1024, 1), remote_tar))
    sftp.putfo(io.BytesIO(tarball), remote_tar)
    sftp.close()
    print("  Upload complete!")

    # 6. Extract
    progress("Extracting project...")
    run_ssh(client, "cd {} && tar -xzf shalimart_deploy.tar.gz --overwrite".format(APP_DIR))
    run_ssh(client, "rm {}".format(remote_tar))

    # 7. Build and start (long operation)
    progress("Building and starting containers (2-5 mins)...")
    exit_code = run_ssh_long(client,
        "cd {} && {} up -d --build 2>&1".format(APP_DIR, COMPOSE_CMD),
        timeout=600)
    print("  Compose exit code: {}".format(exit_code))

    # 8. Wait and verify
    print("\n  Waiting 15s for services to initialize...")
    time.sleep(15)

    progress("Verifying deployment...")
    out, _ = run_ssh(client, "docker ps --format 'table {{{{.Names}}}}\t{{{{.Status}}}}\t{{{{.Ports}}}}'")

    db_ok       = "shalimart_db"       in out
    backend_ok  = "shalimart_backend"  in out
    frontend_ok = "shalimart_frontend" in out

    print("\n  Container status:")
    print("    [{}] shalimart_db".format("OK" if db_ok else "MISSING"))
    print("    [{}] shalimart_backend".format("OK" if backend_ok else "MISSING"))
    print("    [{}] shalimart_frontend".format("OK" if frontend_ok else "MISSING"))

    if not (db_ok and backend_ok and frontend_ok):
        print("\n  Backend logs (last 30 lines):")
        run_ssh(client, "docker logs shalimart_backend --tail 30 2>&1")
        print("\n  Frontend logs:")
        run_ssh(client, "docker logs shalimart_frontend --tail 20 2>&1")

    # 9. Test API
    progress("Testing API endpoint...")
    time.sleep(5)
    out, _ = run_ssh(client, "curl -s http://localhost:8000/ 2>&1")
    if "Shalina Mart" in out or "Welcome" in out:
        print("  [OK] Backend API is responding!")
    else:
        print("  [WARN] API response: " + out[:200])

    # 10. Test frontend
    out, _ = run_ssh(client, "curl -s -o /dev/null -w '%{http_code}' http://localhost:80/ 2>&1")
    if "200" in out or "301" in out or "302" in out:
        print("  [OK] Frontend is serving on port 80!")
    else:
        print("  [WARN] Frontend HTTP status: " + out)

    client.close()

    progress("DEPLOYMENT COMPLETE!")
    print("""
  Site URL:   http://{ip}/
  Admin URL:  http://{ip}/admin
  API URL:    http://{ip}/api/

  Next steps:
    1. Browse to http://{ip}/ to verify the shop loads
    2. Login as admin and configure M-Pesa credentials in Settings tab
    3. Point DNS: shop.shalimart.co.ke -> {ip} for domain access
    4. Run Certbot for SSL once DNS is live
    """.format(ip=SERVER_IP))


if __name__ == "__main__":
    deploy()
