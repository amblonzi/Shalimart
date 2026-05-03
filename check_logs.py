import paramiko

HOST = "91.98.40.198"
USER = "root"
PASSWORD = "ControL.4028s"

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
    
    print("\n--- Backend Logs (Last 100 lines) ---")
    execute_command(ssh, "docker logs shalimart_backend --tail 100")
    
    ssh.close()
    print("Done.")

if __name__ == "__main__":
    main()
