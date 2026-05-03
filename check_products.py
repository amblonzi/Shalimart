import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('91.98.40.198', username='root', password='ControL.4028s')
sql = "SELECT id, name, description, images FROM products WHERE name ILIKE '%V162%' OR name ILIKE '%Mesh Waiting%' OR name ILIKE '%Shoe Rack%';"
cmd = f'docker exec shalimart_db psql -U postgres -d shalimart -c "{sql}"'
_, stdout, stderr = ssh.exec_command(cmd)
print("OUT:\n", stdout.read().decode())
print("ERR:\n", stderr.read().decode())
