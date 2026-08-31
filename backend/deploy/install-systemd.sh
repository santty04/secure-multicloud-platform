#!/usr/bin/env bash
set -e

echo "=== STOP TEMPORARY UVICORN ==="

pkill -f "uvicorn app.main:app" || true

sleep 2

echo "=== CREATE SYSTEMD SERVICE ==="

cat > /etc/systemd/system/secure-multicloud-api.service <<'EOF'
[Unit]
Description=Secure Multicloud Platform FastAPI Backend
After=network-online.target postgresql.service
Wants=network-online.target
Requires=postgresql.service

[Service]
Type=simple
User=azureadmin
Group=azureadmin

WorkingDirectory=/home/azureadmin/secure-multicloud-platform/backend

Environment=HOME=/home/azureadmin

ExecStart=/home/azureadmin/.local/bin/uv run uvicorn app.main:app --host 127.0.0.1 --port 8000

Restart=on-failure
RestartSec=5

NoNewPrivileges=true
PrivateTmp=true

[Install]
WantedBy=multi-user.target
EOF

echo "=== ENABLE SERVICE ==="

systemctl daemon-reload
systemctl enable secure-multicloud-api
systemctl start secure-multicloud-api

sleep 5

echo "=== SERVICE STATUS ==="

systemctl is-enabled secure-multicloud-api
systemctl is-active secure-multicloud-api

echo "=== HEALTH CHECK ==="

curl -sS -i http://127.0.0.1:8000/health

echo
echo "=== RECENT LOGS ==="

journalctl -u secure-multicloud-api --no-pager -n 20
