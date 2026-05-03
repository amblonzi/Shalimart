import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('91.98.40.198', username='root', password='ControL.4028s')

# Check backend container
_, stdout, _ = ssh.exec_command('curl -s -o /dev/null -w "%{http_code}" http://localhost:8000/sitemap.xml')
print("Backend sitemap status code:", stdout.read().decode().strip())

# Check Nginx config syntax
_, stdout, _ = ssh.exec_command('docker exec shalimart_frontend nginx -t')
print("Nginx syntax:\n", stdout.read().decode())

# Check frontend container via public domain mapping
_, stdout, _ = ssh.exec_command('curl -s -o /dev/null -w "%{http_code}" https://shalimart.co.ke/sitemap.xml')
print("Public sitemap status code:", stdout.read().decode().strip())

# Check backend logs for any 500 errors regarding sitemap
_, stdout, _ = ssh.exec_command('docker logs shalimart_backend --tail 50 | grep sitemap')
print("Backend Logs for sitemap:\n", stdout.read().decode())

ssh.close()
