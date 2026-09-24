#!/usr/bin/env bash
# ==============================================================================
# Krishi-Setu Production Deployment Script
# Targets: Ubuntu / Debian VM (Azure / DigitalOcean / AWS EC2)
# Masterplan Section 7.4
# ==============================================================================

set -euo pipefail

APP_DIR="/var/www/krishi-setu"
BACKEND_DIR="${APP_DIR}/backend"
FRONTEND_DIR="${APP_DIR}/frontend"
NGINX_CONF_SRC="${APP_DIR}/deployment/nginx/krishi-setu.conf"
NGINX_CONF_DEST="/etc/nginx/sites-available/krishi-setu.conf"
SYSTEMD_SERVICE_SRC="${APP_DIR}/deployment/systemd/krishi-setu-api.service"
SYSTEMD_SERVICE_DEST="/etc/systemd/system/krishi-setu-api.service"

echo "===================================================================="
echo ">> Starting Krishi-Setu Production Deployment..."
echo "===================================================================="

# 1. Verify Sudo / Root
if [ "$EUID" -ne 0 ]; then
  echo "[-] ERROR: This script must be run with sudo or as root."
  exit 1
fi

# 2. Ensure application directories exist
echo "[+] Ensuring directory structure in ${APP_DIR}..."
mkdir -p "${APP_DIR}"
mkdir -p "${BACKEND_DIR}/uploads"
chown -R www-data:www-data "${BACKEND_DIR}/uploads"
chmod -R 775 "${BACKEND_DIR}/uploads"

# 3. Backend Setup
echo "[+] Setting up Python Virtual Environment..."
cd "${BACKEND_DIR}"
if [ ! -d "venv" ]; then
    python3 -m venv venv
fi

source venv/bin/activate
pip install --upgrade pip setuptools wheel
pip install -r requirements.txt

# Verify .env file exists
if [ ! -f ".env" ]; then
    if [ -f ".env.example" ]; then
        echo "[!] Warning: backend/.env not found! Copying from .env.example..."
        cp .env.example .env
        echo "[!] Please configure MONGODB_URI and JWT_SECRET_KEY in ${BACKEND_DIR}/.env"
    else
        echo "[-] ERROR: No .env or .env.example found in backend directory!"
        exit 1
    fi
fi

# 4. Frontend Build
echo "[+] Building React Vite Frontend..."
cd "${FRONTEND_DIR}"
if command -v npm &> /dev/null; then
    npm ci || npm install
    npm run build
    echo "[+] Frontend build completed: ${FRONTEND_DIR}/dist"
else
    echo "[!] Node.js not detected on VM. Verifying pre-built dist/ folder exists..."
    if [ ! -d "dist" ]; then
        echo "[-] ERROR: frontend/dist not found! Build locally and scp dist/ to server."
        exit 1
    fi
fi

# Set permissions for web server
chown -R www-data:www-data "${FRONTEND_DIR}/dist"
chmod -R 755 "${FRONTEND_DIR}/dist"

# 5. Configure systemd Service
echo "[+] Installing systemd service..."
cp "${SYSTEMD_SERVICE_SRC}" "${SYSTEMD_SERVICE_DEST}"
systemctl daemon-reload
systemctl enable krishi-setu-api.service
systemctl restart krishi-setu-api.service

# 6. Configure Nginx Reverse Proxy
echo "[+] Configuring Nginx..."
cp "${NGINX_CONF_SRC}" "${NGINX_CONF_DEST}"
ln -sf "${NGINX_CONF_DEST}" /etc/nginx/sites-enabled/krishi-setu.conf
rm -f /etc/nginx/sites-enabled/default

# Test Nginx configuration
nginx -t
systemctl reload nginx

# 7. Smoke Test Verification
echo "[+] Performing Local API Smoke Tests..."
sleep 2

STATUS_HEALTH=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:8000/api/health || true)
if [ "$STATUS_HEALTH" = "200" ]; then
    echo ">> [PASS] /api/health returned HTTP 200"
else
    echo ">> [WARN] /api/health returned HTTP ${STATUS_HEALTH}. Check journalctl -u krishi-setu-api"
fi

STATUS_ML=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:8000/api/ml/model-status || true)
if [ "$STATUS_ML" = "200" ]; then
    echo ">> [PASS] /api/ml/model-status returned HTTP 200"
else
    echo ">> [WARN] /api/ml/model-status returned HTTP ${STATUS_ML}"
fi

echo "===================================================================="
echo ">> Krishi-Setu Deployment Finished Successfully!"
echo ">> Monitor logs with: journalctl -u krishi-setu-api -f"
echo "===================================================================="
