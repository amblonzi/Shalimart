import paramiko
import sys
import time

def deploy():
    hostname = "23.88.39.3"
    username = "tesla"
    password = "ControL.4028s"
    
    extract_script = """import tarfile
import os

with tarfile.open('/home/tesla/shalimart.tar.gz', 'r:gz') as tar:
    def is_within_directory(directory, target):
        abs_directory = os.path.abspath(directory)
        abs_target = os.path.abspath(target)
        prefix = os.path.commonprefix([abs_directory, abs_target])
        return prefix == abs_directory

    def safe_extract(tar, path=".", members=None, *, numeric_owner=False):
        for member in tar.getmembers():
            member_path = os.path.join(path, member.name)
            if not is_within_directory(path, member_path):
                raise Exception("Attempted Path Traversal in Tar File")
        tar.extractall(path, members, numeric_owner=numeric_owner)

    safe_extract(tar, '/home/tesla/Shalimart_app')
print('Extraction complete.')
"""
    
    commands = [
        "mkdir -p ~/Shalimart_app",
        f"cat << 'PYTHONEOF' > ~/extract.py\\n{extract_script}\\nPYTHONEOF",
        "python3 ~/extract.py",
        "chmod -R u+rw ~/Shalimart_app",
        "if [ ! -f ~/docker-compose ]; then curl -SL https://github.com/docker/compose/releases/download/v2.27.0/docker-compose-linux-x86_64 -o ~/docker-compose && chmod +x ~/docker-compose; fi",
        "cd ~/Shalimart_app && ~/docker-compose up -d --build"
    ]
    
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    
    print(f"Connecting to {username}@{hostname}...")
    try:
        client.connect(hostname, username=username, password=password, timeout=10)
        
        combined_cmd = " && ".join(commands)
        print(f"Executing commands...")
        
        stdin, stdout, stderr = client.exec_command(combined_cmd)
        
        while not stdout.channel.exit_status_ready():
            if stdout.channel.recv_ready():
                print(stdout.channel.recv(1024).decode('utf-8', errors='replace'), end='')
            if stderr.channel.recv_stderr_ready():
                print(stderr.channel.recv_stderr(1024).decode('utf-8', errors='replace'), end='', file=sys.stderr)
            time.sleep(0.1)
            
        status = stdout.channel.recv_exit_status()
        if stdout.channel.recv_ready():
            print(stdout.channel.recv(1024).decode('utf-8', errors='replace'), end='')
        if stderr.channel.recv_stderr_ready():
            print(stderr.channel.recv_stderr(1024).decode('utf-8', errors='replace'), end='', file=sys.stderr)
        
        print(f"\\nExit status: {status}")
        if status == 0:
            print("Deployment successful!")
        else:
            print(f"Deployment failed.")
                
    except Exception as e:
        print(f"Error: {e}")
    finally:
        client.close()

if __name__ == "__main__":
    deploy()
