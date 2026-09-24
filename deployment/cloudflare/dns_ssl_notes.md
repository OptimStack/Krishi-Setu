# Cloudflare DNS & SSL Configuration Guide for Krishi-Setu

This document outlines the step-by-step procedure for configuring Cloudflare DNS, SSL/TLS certificates, reverse-proxy caching, and security rules for **Krishi-Setu** hosted on Azure.

---

## 1. Domain Registration & Cloudflare Setup

1. **Add Site:**
   - Log in to your [Cloudflare Dashboard](https://dash.cloudflare.com/).
   - Click **Add a Domain** and enter your registered domain (e.g., `krishisetu.in`).
   - Select the **Free** plan.
2. **Update Nameservers:**
   - Change your domain registrar's nameservers to the two Cloudflare nameservers provided (e.g., `bob.ns.cloudflare.com` and `lucy.ns.cloudflare.com`).
   - Wait for DNS propagation (typically 5–30 minutes).

---

## 2. DNS Records Setup

Add the following DNS records pointing to your Azure VM Public IP:

| Type | Name | IPv4 Address / Target | Proxy Status | TTL |
|---|---|---|---|---|
| **A** | `@` (apex) | `<AZURE_VM_PUBLIC_IP>` | **Proxied** (Orange Cloud) | Auto |
| **CNAME** | `www` | `@` | **Proxied** (Orange Cloud) | Auto |

> **Crucial:** Always enable the **Orange Cloud (Proxied)**. This masks your Azure VM IP address, protects against DDoS attacks, enables Cloudflare CDN for static React assets, and handles SSL termination.

---

## 3. SSL/TLS Configuration (End-to-End Encryption)

To achieve maximum security and prevent MITM attacks between Cloudflare and your Azure VM:

### Step 3.1: Choose Encryption Mode
- In Cloudflare Dashboard, navigate to **SSL/TLS** → **Overview**.
- Select **Full (strict)** for production with Origin CA certificates, or **Full** during initial setup before installing origin certificates.

### Step 3.2: Generate Cloudflare Origin CA Certificate
1. Go to **SSL/TLS** → **Origin Server**.
2. Click **Create Certificate**.
3. Keep default settings:
   - Key type: **RSA (2048)**
   - Hostnames: `your-domain.example`, `*.your-domain.example`
   - Validity: **15 years**
4. Click **Create**.
5. Copy the generated **Origin Certificate** and save it to a file, and copy the **Private Key** and save it to a file.

### Step 3.3: Install Certificates on Azure VM
On your Azure VM:

```bash
# Save Origin Certificate
sudo nano /etc/ssl/certs/cloudflare-origin.pem
# Paste the Origin Certificate content here

# Save Private Key
sudo nano /etc/ssl/private/cloudflare-origin.key
# Paste the Private Key content here

# Secure private key permissions
sudo chmod 600 /etc/ssl/private/cloudflare-origin.key
sudo chmod 644 /etc/ssl/certs/cloudflare-origin.pem
```

### Step 3.4: Activate HTTPS in Nginx
Edit `/etc/nginx/sites-available/krishi-setu.conf` on your VM, uncomment the port 443 SSL server block, and reload:

```bash
sudo nginx -t
sudo systemctl reload nginx
```

### Step 3.5: Force HTTPS
In Cloudflare Dashboard:
- Go to **SSL/TLS** → **Edge Certificates**.
- Enable **Always Use HTTPS** (automatically redirects all HTTP traffic to HTTPS).
- Enable **Automatic HTTPS Rewrites**.
- Set **Minimum TLS Version** to `TLS 1.2`.

---

## 4. Caching & Performance Rules

Krishi-Setu separates static SPA assets from dynamic JSON API traffic. Configure cache behavior to prevent caching API responses:

### Cache Rules (Rules → Cache Rules)

1. **Rule 1: Bypass Cache for API & Backend Services**
   - **Condition:** `URI Path starts with "/api/"` OR `URI Path starts with "/uploads/"`
   - **Cache Eligibility:** **Bypass cache**
2. **Rule 2: Cache Static Frontend Assets**
   - **Condition:** `URI Path starts with "/assets/"`
   - **Edge TTL:** 1 month
   - **Browser TTL:** 1 month

---

## 5. Security & WAF Configuration

1. **Security Level:** Set to **Medium** in **Security** → **Settings**.
2. **Bot Fight Mode:** Enable in **Security** → **Bots** to block malicious scrapers.
3. **Web Application Firewall (WAF):**
   - Default managed rules provide baseline SQLi and XSS protection.
   - Ensure file uploads to `/api/farmer/listings` and `/api/ml/grade-produce` are not blocked by request body inspection limits.

---

## 6. Common Issues & Troubleshooting

| Issue / Error | Cause | Resolution |
|---|---|---|
| **Error 521: Web Server is Down** | Nginx is stopped or Azure NSG blocks port 80/443. | Run `sudo systemctl status nginx` on VM; verify Azure NSG allows inbound ports 80 and 443. |
| **Error 522: Connection Timed Out** | Azure VM firewall (UFW) or NSG is blocking Cloudflare IPs. | Ensure UFW has `80/tcp` and `443/tcp` allowed. |
| **Error 520 / 525: SSL Handshake Failed** | SSL Mode set to `Full (strict)` but origin cert missing or expired. | Switch temporarily to `Full` or re-verify `/etc/ssl/certs/cloudflare-origin.pem`. |
| **Redirect Loop (Too Many Redirects)** | Cloudflare SSL set to `Flexible` while Nginx forces HTTPS. | Change Cloudflare SSL setting to `Full` or `Full (strict)`. |
| **CORS errors on API** | Frontend requesting full domain URL with mismatched origin. | Ensure frontend uses `/api` relative URL; Nginx handles reverse proxying without cross-origin trips. |
