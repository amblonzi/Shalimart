import paramiko
import os
from paramiko.ed25519key import Ed25519Key
import io

key_path = os.path.expanduser("~/.ssh/id_ed25519_hetzner")
passphrase = "ControL.4028s"

def diagnostic():
    print(f"Reading key from {key_path}...")
    try:
        with open(key_path, "r") as f:
            key_data = f.read()
        
        # Try to load with passphrase
        print("Attempting to load Ed25519 key with passphrase...")
        key = Ed25519Key.from_private_key(io.StringIO(key_data), password=passphrase)
        print("Success! Key loaded.")
        print(f"Fingerprint: {key.get_fingerprint().hex()}")
    except Exception as e:
        print(f"Failed to load key: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    diagnostic()
