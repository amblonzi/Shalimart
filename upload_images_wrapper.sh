#!/bin/bash
apt-get update && apt-get install -y sshpass openssh-client curl python3

cat << 'EOF' > /app/extract_uploads.py
import tarfile
import os

with tarfile.open('/home/tesla/uploads.tar.gz', 'r:gz') as tar:
    tar.extractall('/home/tesla/Shalimart_app/backend')
print('Extraction complete.')
EOF

sshpass -p 'ControL.4028s' scp -o StrictHostKeyChecking=no /app/extract_uploads.py tesla@23.88.39.3:/home/tesla/extract_uploads.py

sshpass -p 'ControL.4028s' ssh -o StrictHostKeyChecking=no tesla@23.88.39.3 'mkdir -p ~/Shalimart_app/backend/uploads && chmod -R u+rwx ~/Shalimart_app/backend/uploads && python3 ~/extract_uploads.py && chmod -R u+rw ~/Shalimart_app/backend/uploads'
