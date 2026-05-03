import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('91.98.40.198', username='root', password='ControL.4028s')
sql = "UPDATE products SET description = REPLACE(description, 'free delivery on orders above KSh 2,500', 'free delivery on orders over KSh 10,000');"
cmd = f'docker exec shalimart_db psql -U postgres -d shalimart -c "{sql}"'
_, stdout, stderr = ssh.exec_command(cmd)
print("OUT:\n", stdout.read().decode())
print("ERR:\n", stderr.read().decode())
