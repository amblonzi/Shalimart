import paramiko

def verify():
    hostname = "23.88.39.3"
    username = "tesla"
    password = "ControL.4028s"
    
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    
    try:
        client.connect(hostname, username=username, password=password)
        stdin, stdout, stderr = client.exec_command("cd ~/Shalimart_app && ~/docker-compose exec -T db psql -U postgres -d shalimart -c 'SELECT count(*) FROM products;'")
        print(stdout.read().decode())
    finally:
        client.close()

if __name__ == "__main__":
    verify()
