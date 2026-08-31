#!/usr/bin/env bash
set -e

BACKEND_DIR="/home/azureadmin/secure-multicloud-platform/backend"
DB_NAME="${DB_NAME:-secure_multicloud}"
DB_USER="${DB_USER:-secure_app}"

required_vars="
AZURE_SUBSCRIPTION_ID
AZURE_VIEWER_CLIENT_ID
AZURE_OPERATOR_CLIENT_ID
AZURE_ADMINISTRATOR_CLIENT_ID
"

for var_name in $required_vars; do
    eval "value=\${$var_name:-}"

    if [ -z "$value" ]; then
        echo "ERROR: $var_name is required."
        exit 1
    fi
done

echo "=== INSTALL POSTGRESQL ==="

export DEBIAN_FRONTEND=noninteractive

apt-get update -qq
apt-get install -y postgresql postgresql-contrib openssl

systemctl enable postgresql
systemctl start postgresql

echo "=== CREATE DATABASE ==="

DB_PASS=$(openssl rand -hex 24)
SECRET_KEY=$(openssl rand -hex 32)

if sudo -u postgres psql -tAc \
    "SELECT 1 FROM pg_roles WHERE rolname='$DB_USER'" |
    grep -q 1
then
    sudo -u postgres psql \
        -c "ALTER USER $DB_USER WITH PASSWORD '$DB_PASS';"
else
    sudo -u postgres psql \
        -c "CREATE USER $DB_USER WITH PASSWORD '$DB_PASS';"
fi

if ! sudo -u postgres psql -tAc \
    "SELECT 1 FROM pg_database WHERE datname='$DB_NAME'" |
    grep -q 1
then
    sudo -u postgres createdb \
        -O "$DB_USER" \
        "$DB_NAME"
fi

echo "=== CREATE RUNTIME ENV ==="

cat > "$BACKEND_DIR/.env" <<EOF
APP_NAME=Secure Multicloud Platform API
APP_VERSION=0.1.0
APP_ENV=production
DEBUG=false

DATABASE_URL=postgresql+psycopg://$DB_USER:$DB_PASS@127.0.0.1:5432/$DB_NAME
TEST_DATABASE_URL=postgresql+psycopg://$DB_USER:$DB_PASS@127.0.0.1:5432/${DB_NAME}_test

SECRET_KEY=$SECRET_KEY
ACCESS_TOKEN_EXPIRE_MINUTES=30
JWT_ALGORITHM=HS256

AZURE_SUBSCRIPTION_ID=$AZURE_SUBSCRIPTION_ID
AZURE_WRITE_ENABLED=false

AZURE_VIEWER_CLIENT_ID=$AZURE_VIEWER_CLIENT_ID
AZURE_OPERATOR_CLIENT_ID=$AZURE_OPERATOR_CLIENT_ID
AZURE_ADMINISTRATOR_CLIENT_ID=$AZURE_ADMINISTRATOR_CLIENT_ID

AWS_REGION=${AWS_REGION:-us-east-2}
AWS_WRITE_ENABLED=false
EOF

chown azureadmin:azureadmin "$BACKEND_DIR/.env"
chmod 600 "$BACKEND_DIR/.env"

echo "=== RUN DATABASE MIGRATIONS ==="

sudo -H -u azureadmin bash -c "
cd '$BACKEND_DIR'
/home/azureadmin/.local/bin/uv run alembic upgrade head
"

echo "=== SEED RBAC ==="

sudo -H -u azureadmin bash -c "
cd '$BACKEND_DIR'
/home/azureadmin/.local/bin/uv run python -m scripts.seed_rbac
"

echo "=== VALIDATION ==="

systemctl is-active postgresql

sudo -H -u azureadmin bash -c "
cd '$BACKEND_DIR'
/home/azureadmin/.local/bin/uv run python -c '
from app.core.config import settings

print(\"APP_ENV=\" + settings.app_env)
print(\"AZURE_WRITE_ENABLED=\" + str(settings.azure_write_enabled))
print(\"DATABASE_CONFIGURED=\" + str(bool(settings.database_url)))
'
"

echo "=== DATABASE_RUNTIME_OK ==="