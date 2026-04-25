#!/bin/bash
apt-get update && apt-get install -y expect openssh-client
mkdir -p /root/.ssh
cp /root/.ssh_mount/id_ed25519_hetzner /root/.ssh/id_ed25519_hetzner
chmod 600 /root/.ssh/id_ed25519_hetzner

eval $(ssh-agent -s)

PASSWORDS=("ControL.4028s" "Control.4028s" "ControI.4028s" "ControL.4028S" "ControL.4028")

for PASS in "${PASSWORDS[@]}"; do
    echo "Testing passphrase: $PASS"
    expect <<EOF
spawn ssh-add /root/.ssh/id_ed25519_hetzner
expect "Enter passphrase for /root/.ssh/id_ed25519_hetzner:"
send "$PASS\r"
expect {
    "Identity added" { exit 0 }
    "Bad passphrase" { exit 1 }
}
EOF
    if [ $? -eq 0 ]; then
        echo "SUCCESS with $PASS"
        ssh -o StrictHostKeyChecking=no root@23.88.39.3 "uptime; docker ps"
        exit 0
    fi
done

echo "All variations failed."
exit 1
