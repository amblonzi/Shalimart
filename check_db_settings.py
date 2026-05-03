import paramiko

HOST = "91.98.40.198"
USER = "root"
PASSWORD = "ControL.4028s"

def execute_command(ssh, cmd):
    stdin, stdout, stderr = ssh.exec_command(cmd)
    return stdout.read().decode().strip(), stderr.read().decode().strip()

def main():
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(HOST, username=USER, password=PASSWORD)
    
    out, err = execute_command(ssh, "docker exec shalimart_db psql -U postgres -d shalimart -c 'SELECT key, value FROM system_settings;'")
    print(out)
    if err: print("ERR:", err)
    
    ssh.close()

if __name__ == "__main__":
    main()
