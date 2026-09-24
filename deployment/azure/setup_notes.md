# Azure VM Deployment & Setup Guide for Krishi-Setu

This guide details the complete provisioning, configuration, and deployment workflow for hosting **Krishi-Setu** on an Azure Virtual Machine (Ubuntu 22.04 LTS / 24.04 LTS).

---

## 1. VM Provisioning & Networking

### Recommended Azure VM Specs
- **Size:** `Standard_B2s` (2 vCPUs, 4 GiB memory) or `Standard_B1s` (1 vCPU, 1 GiB memory + 2 GiB swap)
- **OS Image:** Ubuntu Server 22.04 LTS / 24.04 LTS - Gen2
- **Disk:** 30 GB Standard SSD
- **Authentication:** SSH public key (RSA or Ed25519)

### Network Security Group (NSG) Inbound Rules
Open the following inbound ports on the Azure VM's Network Security Group:

| Priority | Name | Port | Protocol | Source | Destination | Purpose |
|---|---|---|---|---|---|---|
| 300 | SSH | 22 | TCP | Any / Admin IP | Any | Server administration |
| 310 | HTTP | 80 | TCP | Any | Any | Web traffic & cert validation |
| 320 | HTTPS | 443 | TCP | Any | Any | Secure web traffic |

> **Security Note:** Port `8000` (Flask/Gunicorn) must **NOT** be exposed publicly. Gunicorn binds exclusively to `127.0.0.1:8000` and is reverse-proxied by Nginx.

---

## 2. Server Initial Configuration

Connect to your Azure VM:
```bash
ssh -i /path/to/azure_key.pem azureuser@<VM_PUBLIC_IP>
```

### Update Packages & Install Base Tooling
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y software-properties-common curl git build-essential nginx

# Install Python 3.11 and venv
sudo apt install -y python3.11 python3.11-venv python3.11-dev python3-pip
```

### Configure Swap Space (Crucial for 1GB/2GB VMs)
```bash
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

### Configure UFW Firewall
```bash
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw --force enable
```

---

## 3. Clone Repository & Setup Directory

We will locate the application in `/var/www/krishi-setu`:

```bash
sudo mkdir -p /var/www/krishi-setu
sudo chown -R $USER:$USER /var/www/krishi-setu

# Clone repo into /var/www/krishi-setu
git clone https://github.com/your-org/krishi-setu.git /var/www/krishi-setu
```

---

## 4. Backend Environment & Dependencies

```bash
cd /var/www/krishi-setu/backend

# Create Python virtual environment using Python 3.11
python3.11 -m venv venv
source venv/bin/activate

# Install requirements
pip install --upgrade pip
pip install -r requirements.txt

# Create environment configuration
cp .env.example .env
nano .env  # Add MongoDB URI, JWT Secret, Razorpay keys
```

### Prepare Uploads Directory
```bash
mkdir -p /var/www/krishi-setu/backend/uploads
# Set ownership so www-data can write uploaded produce photos
sudo chown -R www-data:www-data /var/www/krishi-setu/backend/uploads
sudo chmod -R 775 /var/www/krishi-setu/backend/uploads
```

---

## 5. Systemd Gunicorn Service

Install and start the Gunicorn service:

```bash
# Link or copy systemd unit file
sudo cp /var/www/krishi-setu/deployment/systemd/krishi-setu-api.service /etc/systemd/system/

# Reload systemd daemon
sudo systemctl daemon-reload

# Enable and start service
sudo systemctl enable krishi-setu-api
sudo systemctl start krishi-setu-api

# Verify status
sudo systemctl status krishi-setu-api
```

Check Gunicorn logs if needed:
```bash
sudo journalctl -u krishi-setu-api -f
```

---

## 6. Frontend Deployment

You have two options for deploying the Vite React SPA:

### Option A: Build on Local Machine / CI (Recommended)
Keeps Node.js off the Azure VM entirely:
```bash
# On local development machine:
cd frontend
npm install
npm run build

# Copy dist directory to VM
rsync -avz -e "ssh -i /path/to/key.pem" dist/ azureuser@<VM_PUBLIC_IP>:/var/www/krishi-setu/frontend/dist/
```

### Option B: Build Directly on Azure VM
```bash
# Install Node.js 18 LTS on VM
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

cd /var/www/krishi-setu/frontend
npm install
npm run build
```

Verify that `/var/www/krishi-setu/frontend/dist/index.html` exists.

---

## 7. Nginx Configuration

```bash
# Copy or symlink Nginx config
sudo cp /var/www/krishi-setu/deployment/nginx/krishi-setu.conf /etc/nginx/sites-available/krishi-setu.conf

# Replace placeholder domain with your domain or server IP
sudo sed -i 's/your-domain.example/<YOUR_DOMAIN_OR_PUBLIC_IP>/g' /etc/nginx/sites-available/krishi-setu.conf

# Enable site and remove default
sudo ln -sf /etc/nginx/sites-available/krishi-setu.conf /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# Test configuration
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
```

---

## 8. MongoDB Atlas Whitelist

Ensure MongoDB Atlas allows incoming connections from this Azure VM:
1. Go to **MongoDB Atlas Console** → **Network Access**.
2. Click **Add IP Address**.
3. Enter the VM's Public IP address (or allow `0.0.0.0/0` temporarily with strong credentials).
4. Save and wait 1 minute for rules to deploy.

---

## 9. Verification & Smoke Test

1. **Frontend Check:** Visit `http://<VM_PUBLIC_IP>/` in an incognito window. The React homepage should load immediately.
2. **API Health Check:** Visit `http://<VM_PUBLIC_IP>/api/health` or curl:
   ```bash
   curl http://127.0.0.1:8000/api/health
   curl http://<VM_PUBLIC_IP>/api/health
   ```
   Both should return `{ "status": "healthy" }`.
3. **Model Status Check:**
   ```bash
   curl http://<VM_PUBLIC_IP>/api/ml/model-status
   ```
4. **Permissions Check:** Ensure file uploads to `/uploads/` succeed through the farmer listing form.
