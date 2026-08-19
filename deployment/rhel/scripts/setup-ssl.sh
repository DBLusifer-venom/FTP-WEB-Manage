#!/bin/bash
# FTP Manager SSL Setup Script for RHEL 9.6
# Run as root: sudo bash setup-ssl.sh <domain> <email>

set -euo pipefail

DOMAIN="${1:-}"
EMAIL="${2:-}"

if [[ -z "$DOMAIN" || -z "$EMAIL" ]]; then
    echo "Usage: $0 <domain> <email>"
    echo "Example: $0 ftp.example.com admin@example.com"
    exit 1
fi

log_info() { echo -e "\033[0;32m[INFO]\033[0m $1"; }
log_error() { echo -e "\033[0;31m[ERROR]\033[0m $1"; }

main() {
    log_info "Setting up SSL for $DOMAIN..."
    
    # Install certbot if not present
    if ! command -v certbot &> /dev/null; then
        log_info "Installing certbot..."
        dnf install -y certbot python3-certbot-nginx
    fi
    
    # Stop nginx temporarily for standalone mode
    systemctl stop nginx
    
    # Obtain certificate
    log_info "Obtaining Let's Encrypt certificate..."
    certbot certonly --standalone -d "$DOMAIN" --email "$EMAIL" --agree-tos --non-interactive --expand
    
    # Create SSL directory for FTP Manager
    mkdir -p /etc/ssl/ftpmanager
    
    # Copy certificates
    cp /etc/letsencrypt/live/$DOMAIN/fullchain.pem /etc/ssl/ftpmanager/
    cp /etc/letsencrypt/live/$DOMAIN/privkey.pem /etc/ssl/ftpmanager/
    cp /etc/letsencrypt/live/$DOMAIN/chain.pem /etc/ssl/ftpmanager/
    
    chmod 644 /etc/ssl/ftpmanager/fullchain.pem
    chmod 644 /etc/ssl/ftpmanager/chain.pem
    chmod 600 /etc/ssl/ftpmanager/privkey.pem
    chown -R ftpmanager:ftpmanager /etc/ssl/ftpmanager
    
    # Update vsftpd to use new certificates
    log_info "Updating vsftpd SSL configuration..."
    sed -i "s|^rsa_cert_file=.*|rsa_cert_file=/etc/ssl/ftpmanager/fullchain.pem|" /etc/vsftpd/vsftpd.conf
    sed -i "s|^rsa_private_key_file=.*|rsa_private_key_file=/etc/ssl/ftpmanager/privkey.pem|" /etc/vsftpd/vsftpd.conf
    
    # Enable SSL in vsftpd
    sed -i 's/^ssl_enable=.*/ssl_enable=YES/' /etc/vsftpd/vsftpd.conf
    
    # Update nginx configuration for HTTPS
    log_info "Updating Nginx configuration..."
    cat > /etc/nginx/conf.d/ftp-manager.conf <<EOF
upstream ftp_manager_backend {
    server 127.0.0.1:8000;
    keepalive 32;
}

server {
    listen 80;
    server_name $DOMAIN;
    
    # Redirect HTTP to HTTPS
    return 301 https://\$server_name\$request_uri;
}

server {
    listen 443 ssl http2;
    server_name $DOMAIN;
    
    ssl_certificate /etc/ssl/ftpmanager/fullchain.pem;
    ssl_certificate_key /etc/ssl/ftpmanager/privkey.pem;
    
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    
    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN";
    add_header X-Content-Type-Options "nosniff";
    add_header X-XSS-Protection "1; mode=block";
    
    root /var/www/ftp-manager;
    index index.html;
    
    location / {
        try_files \$uri \$uri/ /index.html;
    }
    
    location /api/ {
        proxy_pass http://ftp_manager_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 120s;
        proxy_send_timeout 120s;
    }
    
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        try_files \$uri =404;
    }
    
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml application/json;
}
EOF
    
    # Test nginx config
    nginx -t
    
    # Start nginx
    systemctl start nginx
    
    # Restart vsftpd
    systemctl restart vsftpd
    
    # Setup auto-renewal
    log_info "Setting up auto-renewal..."
    cat > /etc/cron.d/certbot-renew <<EOF
0 3 * * * root certbot renew --quiet --post-hook "systemctl reload nginx && systemctl restart vsftpd && cp /etc/letsencrypt/live/$DOMAIN/fullchain.pem /etc/ssl/ftpmanager/ && cp /etc/letsencrypt/live/$DOMAIN/privkey.pem /etc/ssl/ftpmanager/ && cp /etc/letsencrypt/live/$DOMAIN/chain.pem /etc/ssl/ftpmanager/ && chmod 600 /etc/ssl/ftpmanager/privkey.pem && chown -R ftpmanager:ftpmanager /etc/ssl/ftpmanager"
EOF
    
    # Update .env file
    sed -i "s|LETSENCRYPT_DOMAIN=.*|LETSENCRYPT_DOMAIN=$DOMAIN|" /opt/ftp-manager/.env
    sed -i "s|LETSENCRYPT_EMAIL=.*|LETSENCRYPT_EMAIL=$EMAIL|" /opt/ftp-manager/.env
    
    log_info "SSL setup complete!"
    echo
    echo "Certificate installed for: $DOMAIN"
    echo "HTTPS enabled on Nginx"
    echo "FTPS enabled on vsftpd"
    echo "Auto-renewal configured"
    echo
    echo "Access the web interface at: https://$DOMAIN"
}

main "$@"