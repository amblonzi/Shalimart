import paramiko
import os

hostname = "23.88.39.3"
username = "root"
password = "ControL.4028s"
key_path = os.path.expanduser("~/.ssh/id_ed25519_hetzner")

def test_ssh():
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    
    print(f"Connecting to {hostname}...")
    try:
        # Try with key first
        print("Attempting connection with SSH key and passphrase...")
        client.connect(hostname, username=username, key_filename=key_path, passphrase=password, timeout=10)
        print("Success! Connected with SSH key.")
    except Exception as e:
        print(f"SSH key connection failed: {e}")
        try:
            # Try with password
            print("Attempting connection with password...")
            client.connect(hostname, username=username, password=password, timeout=10)
            print("Success! Connected with password.")
        except Exception as e2:
            print(f"Password connection failed: {e2}")
            return

    stdin, stdout, stderr = client.exec_command("uptime; docker ps")
    print("Output:")
    print(stdout.read().decode())
    print("Errors:")
    print(stderr.read().decode())
    
    client.close()

if __name__ == "__main__":
    test_ssh()
