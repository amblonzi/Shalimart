#!/bin/bash
apt-get update && apt-get install -y expect openssh-client
mkdir -p /root/.ssh
cp /root/.ssh_mount/id_ed25519_hetzner /root/.ssh/id_ed25519_hetzner
chmod 600 /root/.ssh/id_ed25519_hetzner
eval $(ssh-agent -s)
expect <<EOF
spawn ssh-add /root/.ssh/id_ed25519_hetzner
expect "Enter passphrase for /root/.ssh/id_ed25519_hetzner:"
send "ControL.4028s\r"
expect "Identity added"
EOF
ssh -o StrictHostKeyChecking=no root@23.88.39.3 "uptime; docker ps; ls -la"
