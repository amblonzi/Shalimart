#!/bin/bash
apt-get update && apt-get install -y expect openssh-client

PASSWORDS=("vKUutncVuiEd" "VKUutncVuiEd" "vKUutncVuiED" "vKUutncVuiEd " " vKUutncVuiEd")

for PASS in "${PASSWORDS[@]}"; do
    echo "Testing password: $PASS"
    expect <<EOF
spawn ssh -o StrictHostKeyChecking=no root@23.88.39.3 "uptime"
expect "password:"
send "$PASS\r"
expect {
    "root@" { exit 0 }
    "uptime" { exit 0 }
    "Permission denied" { exit 1 }
}
EOF
    if [ $? -eq 0 ]; then
        echo "SUCCESS with $PASS"
        exit 0
    fi
done

echo "All variations failed."
exit 1
