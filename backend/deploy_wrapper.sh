#!/bin/bash
apt-get update && apt-get install -y sshpass openssh-client curl python3

cat << 'EOF' > /app/extract.py
import tarfile
import os

with tarfile.open('/home/tesla/shalimart.tar.gz', 'r:gz') as tar:
    tar.extractall('/home/tesla/Shalimart_app')
print('Extraction complete.')
EOF

sshpass -p 'ControL.4028s' scp -o StrictHostKeyChecking=no /app/extract.py tesla@23.88.39.3:/home/tesla/extract.py

sshpass -p 'ControL.4028s' ssh -o StrictHostKeyChecking=no tesla@23.88.39.3 'mkdir -p ~/Shalimart_app && python3 ~/extract.py && chmod -R u+rw ~/Shalimart_app && if [ ! -f ~/docker-compose ]; then curl -SL https://github.com/docker/compose/releases/download/v2.27.0/docker-compose-linux-x86_64 -o ~/docker-compose && chmod +x ~/docker-compose; fi && cd ~/Shalimart_app && ~/docker-compose up -d --build'
