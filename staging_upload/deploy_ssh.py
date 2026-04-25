import paramiko
import sys
import time

def deploy():
    hostname = "23.88.39.3"
    username = "tesla"
    password = "ControL.4028s"
    
    commands = [
        "ls -lh ~/shalimart.tar.gz",
        "mkdir -p ~/Shalimart_app",
        "tar --no-same-permissions -xzvf ~/shalimart.tar.gz -C ~/Shalimart_app",
        "chmod -R u+rw ~/Shalimart_app",
        "if [ ! -f ~/docker-compose ]; then curl -SL https://github.com/docker/compose/releases/download/v2.27.0/docker-compose-linux-x86_64 -o ~/docker-compose && chmod +x ~/docker-compose; fi",
        "cd ~/Shalimart_app && ~/docker-compose up -d --build"
    ]
    
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    
    print(f"Connecting to {username}@{hostname}...")
    try:
        client.connect(hostname, username=username, password=password, timeout=10)
        
        for cmd in commands:
            print(f"\\nExecuting: {cmd}")
            stdin, stdout, stderr = client.exec_command(cmd)
            
            while not stdout.channel.exit_status_ready():
                if stdout.channel.recv_ready():
                    print(stdout.channel.recv(1024).decode('utf-8', errors='replace'), end='')
                if stderr.channel.recv_stderr_ready():
                    print(stderr.channel.recv_stderr(1024).decode('utf-8', errors='replace'), end='', file=sys.stderr)
                time.sleep(0.1)
                
            status = stdout.channel.recv_exit_status()
            # capture any remaining output
            if stdout.channel.recv_ready():
                print(stdout.channel.recv(1024).decode('utf-8', errors='replace'), end='')
            if stderr.channel.recv_stderr_ready():
                print(stderr.channel.recv_stderr(1024).decode('utf-8', errors='replace'), end='', file=sys.stderr)
            
            print(f"\\nExit status: {status}")
            if status != 0 and "tar" in cmd:
                print("Tar failed, but continuing anyway to see if files are there...")
            elif status != 0:
                print(f"Command failed with status {status}. Stop.")
                break
                
    except Exception as e:
        print(f"Error: {e}")
    finally:
        client.close()

if __name__ == "__main__":
    deploy()
