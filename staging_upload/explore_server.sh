#!/bin/bash
apt-get update && apt-get install -y sshpass openssh-client
SSH_CMD="sshpass -p 'efJbHkaCct7m' ssh -o StrictHostKeyChecking=no root@23.88.39.3"
$SSH_CMD "uptime"
echo "--- Docker PS ---"
$SSH_CMD "docker ps -a"
echo "--- /var/www ---"
$SSH_CMD "ls -la /var/www"
echo "--- /opt ---"
$SSH_CMD "ls -la /opt"
echo "--- Root Dir ---"
$SSH_CMD "ls -la /root"
