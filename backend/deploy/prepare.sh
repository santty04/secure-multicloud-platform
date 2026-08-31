#!/usr/bin/env bash
set -e

rm -rf /home/azureadmin/secure-multicloud-platform
mkdir -p /home/azureadmin/secure-multicloud-platform

tar -xzf /tmp/backend-deploy.tar.gz \
  -C /home/azureadmin/secure-multicloud-platform

chown -R azureadmin:azureadmin /home/azureadmin/secure-multicloud-platform

cd /home/azureadmin/secure-multicloud-platform/backend

echo "=== BACKEND ==="
pwd

echo "=== ENV_CHECK ==="

if [ -f .env ]; then
    echo "ENV_FOUND_ERROR"
    exit 1
else
    echo "ENV_NOT_PRESENT_OK"
fi

echo "=== PYTHON ==="

sudo -H -u azureadmin \
  /home/azureadmin/.local/bin/uv run \
  --python 3.13 \
  python --version

echo "=== UV_SYNC ==="

sudo -H -u azureadmin bash -c '
cd /home/azureadmin/secure-multicloud-platform/backend
/home/azureadmin/.local/bin/uv sync --python 3.13 --no-dev
'

echo "=== DEPLOY_PREP_OK ==="
