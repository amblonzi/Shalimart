#!/bin/bash
echo "UPDATE users SET is_admin=true WHERE email='admin@shalimart.co.ke';" > /home/tesla/update.sql
cd /home/tesla/Shalimart_app
~/docker-compose exec -T db psql -U postgres -d shalimart -f /home/tesla/update.sql
