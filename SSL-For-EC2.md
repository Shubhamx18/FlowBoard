# NGINX Reverse Proxy Setup Guide

## Prerequisites

- A domain name (e.g., `example.com`)
- An app running on a local port (e.g., `3000`)
- Ubuntu/Debian server with `sudo` access

---

## 1. Install NGINX

```bash
sudo apt update && sudo apt install nginx -y
sudo systemctl enable nginx && sudo systemctl start nginx
```

---

## 2. Create Site Configuration

```bash
sudo nano /etc/nginx/sites-available/myapp
```

```nginx
server {
    listen 80;
    server_name example.com www.example.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

> Replace `example.com` and `3000` with your domain and port.

---

## 3. Enable the Site

```bash
sudo ln -s /etc/nginx/sites-available/myapp /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl restart nginx
```

---

## 4. Configure Firewall

```bash
sudo ufw allow 'Nginx Full'
sudo ufw allow ssh
sudo ufw enable
```

---

## 5. Install SSL (HTTPS)

```bash
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d example.com -d www.example.com
sudo certbot renew --dry-run
```

---

## Advanced Configurations

### Multiple Apps on Different Paths

```nginx
server {
    listen 80;
    server_name example.com;

    location /     { proxy_pass http://localhost:3000; }
    location /api  { proxy_pass http://localhost:8000; }
    location /admin { proxy_pass http://localhost:5000; }
}
```

### Multiple Apps on Subdomains

```nginx
server {
    listen 80;
    server_name example.com;
    location / { proxy_pass http://localhost:3000; }
}

server {
    listen 80;
    server_name api.example.com;
    location / { proxy_pass http://localhost:8000; }
}
```

> Add a DNS A record for each subdomain.

### Serve Static Files Directly

```nginx
location /static { alias /var/www/myapp/static; expires 30d; }
location /media  { alias /var/www/myapp/media;  expires 7d;  }
location /       { proxy_pass http://localhost:8000; }
```

### Load Balancing

```nginx
upstream backend {
    server localhost:3000;
    server localhost:3001;
    server localhost:3002;
}

server {
    listen 80;
    server_name example.com;
    location / { proxy_pass http://backend; }
}
```

### Password Protection

```bash
sudo apt install apache2-utils -y
sudo htpasswd -c /etc/nginx/.htpasswd your_username
```

```nginx
server {
    listen 80;
    server_name example.com;

    auth_basic "Restricted Access";
    auth_basic_user_file /etc/nginx/.htpasswd;

    location / { proxy_pass http://localhost:3000; }
}
```

### File Upload Size

```nginx
server {
    client_max_body_size 100M;
    location / { proxy_pass http://localhost:3000; }
}
```

### Rate Limiting

```nginx
limit_req_zone $binary_remote_addr zone=mylimit:10m rate=10r/s;

server {
    location / {
        limit_req zone=mylimit burst=20;
        proxy_pass http://localhost:3000;
    }
}
```

### Gzip Compression

```nginx
server {
    gzip on;
    gzip_types text/plain text/css application/json application/javascript;
    gzip_min_length 1000;
}
```

### Security Headers

```nginx
server {
    add_header X-Frame-Options "SAMEORIGIN";
    add_header X-Content-Type-Options "nosniff";
    add_header X-XSS-Protection "1; mode=block";
}
```

### Gateway Timeout Fix

```nginx
location / {
    proxy_read_timeout 300s;
    proxy_connect_timeout 300s;
    proxy_pass http://localhost:3000;
}
```

---

## Common Ports

| Framework         | Default Port |
|-------------------|--------------|
| Node.js           | 3000, 8080   |
| Python Flask      | 5000         |
| Python Django     | 8000         |
| Java Spring Boot  | 8080         |
| Ruby on Rails     | 3000         |
| .NET              | 5000, 5001   |
| Docker            | 8080         |

---

## Useful Commands

```bash
# Control
sudo systemctl start|stop|restart|reload|status nginx

# Config
sudo nginx -t
sudo nano /etc/nginx/sites-available/myapp

# Logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log

# SSL
sudo certbot certificates
sudo certbot renew --dry-run

# Debugging
sudo lsof -i :3000        # Check if app is running
sudo lsof -i :80          # Check what's on port 80
sudo netstat -tlnp        # All listening ports
sudo journalctl -u nginx -n 50
```

---

## Troubleshooting

| Problem | Fix |
|--------|-----|
| Can't access site | Check app is running, DNS, firewall |
| 502 Bad Gateway | App not running or wrong port in `proxy_pass` |
| 504 Gateway Timeout | Add `proxy_read_timeout 300s` to config |
| NGINX won't start | Run `sudo nginx -t`, check port 80 with `lsof` |
| SSL fails | Verify DNS, ensure ports 80/443 are open |
