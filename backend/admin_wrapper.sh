#!/bin/bash
apt-get update && apt-get install -y sshpass openssh-client

cat << 'EOF' > /app/update_admin.sh
#!/bin/bash
echo "UPDATE users SET is_admin=true WHERE email='admin@shalimart.co.ke';" > /home/tesla/update.sql
cd /home/tesla/Shalimart_app
~/docker-compose exec -T db psql -U postgres -d shalimart -f /home/tesla/update.sql
EOF

sshpass -p 'ControL.4028s' scp -o StrictHostKeyChecking=no /app/update_admin.sh tesla@23.88.39.3:/home/tesla/update_admin.sh
sshpass -p 'ControL.4028s' ssh -o StrictHostKeyChecking=no tesla@23.88.39.3 'bash /home/tesla/update_admin.sh'
