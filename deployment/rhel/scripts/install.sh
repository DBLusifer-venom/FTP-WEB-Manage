#!/bin/bash
# FTP Manager Installation Script for RHEL 9.6
# Run as root: sudo bash install.sh

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
INSTALL_DIR="/opt/ftp-manager"
SERVICE_USER="ftpmanager"
SERVICE_GROUP="ftpmanager"
PYTHON_VERSION="3.11"
NODE_VERSION="20"

log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

check_root() {
    if [[ $EUID -ne 0 ]]; then
        log_error "This script must be run as root"
        exit 1
    fi
}

check_rhel() {
    if ! grep -q "Red Hat Enterprise Linux\|RHEL" /etc/os-release 2>/dev/null; then
        log_warn "This script is designed for RHEL 9.6. Current OS: $(cat /etc/os-release | grep PRETTY_NAME)"
        read -p "Continue anyway? (y/N) " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    fi
}

install_dependencies() {
    log_info "Installing system dependencies..."
    
    # Enable required repositories
    subscription-manager repos --enable=rhel-9-for-x86_64-baseos-rpms --enable=rhel-9-for-x86_64-appstream-rpms 2>/dev/null || true
    dnf config-manager --set-enabled crb 2>/dev/null || dnf config-manager --set-enabled powertools 2>/dev/null || true
    
    # Install EPEL
    dnf install -y https://dl.fedoraproject.org/pub/epel/epel-release-latest-9.noarch.rpm 2>/dev/null || true
    
    # Install packages
    dnf update -y
    dnf install -y \
        python${PYTHON_VERSION} python${PYTHON_VERSION}-devel python${PYTHON_VERSION}-pip \
        nodejs-${NODE_VERSION} npm \
        postgresql-server postgresql-devel \
        redis \
        nginx \
        vsftpd \
        certbot python3-certbot-nginx \
        git \
        gcc gcc-c++ make \
        openssl-devel libffi-devel \
        firewalld \
        policycoreutils-python-utils \
        logrotate
    
    # Install pnpm for faster builds
    npm install -g pnpm
}

setup_database() {
    log_info "Setting up PostgreSQL..."
    
    # Initialize database if not already done
    if [[ ! -f /var/lib/pgsql/data/PG_VERSION ]]; then
        postgresql-setup --initdb
    fi
    
    systemctl enable --now postgresql
    
    # Create database and user
    sudo -u postgres psql <<EOF
CREATE DATABASE ftpmanager;
CREATE USER ftpuser WITH ENCRYPTED PASSWORD 'ftppass';
GRANT ALL PRIVILEGES ON DATABASE ftpmanager TO ftpuser;
ALTER USER ftpuser CREATEDB;
EOF
}

setup_redis() {
    log_info "Setting up Redis..."
    
    systemctl enable --now redis
    
    # Configure Redis for persistence
    sed -i 's/^# supervised systemd/supervised systemd/' /etc/redis.conf
    sed -i 's/^appendonly no/appendonly yes/' /etc/redis.conf
    systemctl restart redis
}

setup_vsftpd() {
    log_info "Setting up vsftpd..."
    
    # Backup original config
    cp /etc/vsftpd/vsftpd.conf /etc/vsftpd/vsftpd.conf.bak.$(date +%Y%m%d)
    
    # Create required directories
    mkdir -p /etc/vsftpd/user_config
    mkdir -p /var/log/vsftpd
    mkdir -p /home/ftp
    
    # Create ftp user for virtual users
    id -u ftp &>/dev/null || useradd -r -s /sbin/nologin -d /home/ftp ftp
    
    # Generate self-signed certificate for initial setup
    if [[ ! -f /etc/ssl/certs/vsftpd.pem ]]; then
        openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
            -keyout /etc/ssl/private/vsftpd.key \
            -out /etc/ssl/certs/vsftpd.pem \
            -subj "/C=US/ST=State/L=City/O=Organization/CN=ftp.local"
        chmod 600 /etc/ssl/private/vsftpd.key
        chmod 644 /etc/ssl/certs/vsftpd.pem
    fi
    
    # Create vsftpd PAM config for virtual users
    cat > /etc/pam.d/vsftpd <<'EOF'
auth required pam_userdb.so db=/etc/vsftpd/virtual_users
account required pam_userdb.so db=/etc/vsftpd/virtual_users
session required pam_loginuid.so
EOF
    
    # Create virtual users db (will be populated by application)
    touch /etc/vsftpd/virtual_users.txt
    db_load -T -t hash -f /etc/vsftpd/virtual_users.txt /etc/vsftpd/virtual_users.db
    chmod 600 /etc/vsftpd/virtual_users.db
    
    # SELinux contexts
    semanage fcontext -a -t vsftpd_etc_t "/etc/vsftpd(/.*)?" 2>/dev/null || true
    restorecon -R /etc/vsftpd
    setsebool -P ftp_home_dir on
    setsebool -P allow_ftpd_full_access on
    
    systemctl enable vsftpd
}

create_service_user() {
    log_info "Creating service user..."
    
    id -u $SERVICE_USER &>/dev/null || useradd -r -s /sbin/nologin -d $INSTALL_DIR -c "FTP Manager Service" $SERVICE_USER
    usermod -a -G ftp $SERVICE_USER
}

deploy_application() {
    log_info "Deploying application..."
    
    # Create directory structure
    mkdir -p $INSTALL_DIR/{backend,frontend,logs,ssl}
    chown -R $SERVICE_USER:$SERVICE_GROUP $INSTALL_DIR
    
    # Setup Python virtual environment
    sudo -u $SERVICE_USER python${PYTHON_VERSION} -m venv $INSTALL_DIR/venv
    sudo -u $SERVICE_USER $INSTALL_DIR/venv/bin/pip install --upgrade pip
    sudo -u $SERVICE_USER $INSTALL_DIR/venv/bin/pip install -r $INSTALL_DIR/backend/requirements.txt
    
    # Build frontend
    cd $INSTALL_DIR/frontend
    sudo -u $SERVICE_USER pnpm install
    sudo -u $SERVICE_USER pnpm run build
    
    # Copy built frontend to nginx
    mkdir -p /var/www/ftp-manager
    cp -r $INSTALL_DIR/frontend/dist/* /var/www/ftp-manager/
    chown -R nginx:nginx /var/www/ftp-manager
}

configure_nginx() {
    log_info "Configuring Nginx..."
    
    cat > /etc/nginx/conf.d/ftp-manager.conf <<'EOF'
upstream ftp_manager_backend {
    server 127.0.0.1:8000;
    keepalive 32;
}

server {
    listen 80;
    server_name _;
    
    # Redirect HTTP to HTTPS (uncomment after SSL is configured)
    # return 301 https://$server_name$request_uri;
    
    # For initial setup without SSL
    root /var/www/ftp-manager;
    index index.html;
    
    # Frontend
    location / {
        try_files $uri $uri/ /index.html;
        
        # Security headers
        add_header X-Frame-Options "SAMEORIGIN";
        add_header X-Content-Type-Options "nosniff";
        add_header X-XSS-Protection "1; mode=block";
    }
    
    # API Proxy
    location /api/ {
        proxy_pass http://ftp_manager_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 120s;
        proxy_send_timeout 120s;
    }
    
    # Static assets caching
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        try_files $uri =404;
    }
    
    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml application/json;
}

# HTTPS server (enable after SSL certificates are installed)
# server {
#     listen 443 ssl http2;
#     server_name ftp.example.com;
#     
#     ssl_certificate /etc/ssl/ftpmanager/fullchain.pem;
#     ssl_certificate_key /etc/ssl/ftpmanager/privkey.pem;
#     
#     ssl_protocols TLSv1.2 TLSv1.3;
#     ssl_ciphers HIGH:!aNULL:!MD5;
#     
#     root /var/www/ftp-manager;
#     index index.html;
#     
#     location / {
#         try_files $uri $uri/ /index.html;
#     }
#     
#     location /api/ {
#         proxy_pass http://ftp_manager_backend;
#         proxy_http_version 1.1;
#         proxy_set_header Upgrade $http_upgrade;
#         proxy_set_header Connection 'upgrade';
#         proxy_set_header Host $host;
#         proxy_set_header X-Real-IP $remote_addr;
#         proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
#         proxy_set_header X-Forwarded-Proto $scheme;
#         proxy_cache_bypass $http_upgrade;
#     }
# }
EOF
    
    # Test nginx config
    nginx -t
    
    systemctl enable --now nginx
}

configure_firewall() {
    log_info "Configuring firewall..."
    
    systemctl enable --now firewalld
    
    # Open required ports
    firewall-cmd --permanent --add-service=http
    firewall-cmd --permanent --add-service=https
    firewall-cmd --permanent --add-service=ftp
    firewall-cmd --permanent --add-port=40000-50000/tcp  # Passive FTP ports
    firewall-cmd --permanent --add-port=990/tcp         # FTPS
    
    firewall-cmd --reload
}

configure_selinux() {
    log_info "Configuring SELinux..."
    
    # Allow nginx to connect to backend
    setsebool -P httpd_can_network_connect on
    
    # Allow nginx to serve files
    semanage fcontext -a -t httpd_sys_content_t "/var/www/ftp-manager(/.*)?" 2>/dev/null || true
    restorecon -R /var/www/ftp-manager
    
    # Allow vsftpd
    setsebool -P ftp_home_dir on
    setsebool -P allow_ftpd_full_access on
}

install_systemd_services() {
    log_info "Installing systemd services..."
    
    cp deployment/rhel/systemd/ftp-manager-backend.service /etc/systemd/system/
    cp deployment/rhel/systemd/ftp-manager-frontend.service /etc/systemd/system/
    
    systemctl daemon-reload
    systemctl enable ftp-manager-backend
    systemctl enable ftp-manager-frontend
}

setup_logrotate() {
    log_info "Setting up log rotation..."
    
    cat > /etc/logrotate.d/ftp-manager <<'EOF'
/var/log/ftp-manager/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 0640 ftpmanager ftpmanager
    sharedscripts
    postrotate
        systemctl reload ftp-manager-backend > /dev/null 2>&1 || true
    endscript
}

/var/log/vsftpd.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 0640 root root
}

/var/log/xferlog {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 0640 root root
}
EOF
}

create_env_file() {
    log_info "Creating environment file..."
    
    cat > $INSTALL_DIR/.env <<EOF
# Database
DATABASE_URL=postgresql+asyncpg://ftpuser:ftppass@localhost:5432/ftpmanager

# Security
SECRET_KEY=$(openssl rand -hex 32)
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=10080

# FTP Server
FTP_HOST=localhost
FTP_PORT=21
FTP_TLS_PORT=990
FTP_PASSIVE_PORTS=40000:50000

# vsftpd paths
VSFTPD_CONFIG_PATH=/etc/vsftpd/vsftpd.conf
VSFTPD_USER_DB_PATH=/etc/vsftpd/virtual_users.db
VSFTPD_USER_CONFIG_DIR=/etc/vsftpd/user_config
VSFTPD_SSL_CERT=/etc/ssl/certs/vsftpd.pem
VSFTPD_SSL_KEY=/etc/ssl/private/vsftpd.key

# SSL
SSL_CERT_DIR=/etc/ssl/ftpmanager
LETSENCRYPT_EMAIL=admin@example.com
LETSENCRYPT_DOMAIN=ftp.example.com

# Redis
REDIS_URL=redis://localhost:6379/0

# CORS
BACKEND_CORS_ORIGINS=["https://ftp.example.com","http://localhost:3000"]
EOF
    
    chown $SERVICE_USER:$SERVICE_GROUP $INSTALL_DIR/.env
    chmod 600 $INSTALL_DIR/.env
}

run_migrations() {
    log_info "Running database migrations..."
    
    cd $INSTALL_DIR/backend
    sudo -u $SERVICE_USER $INSTALL_DIR/venv/bin/alembic upgrade head
}

create_admin_user() {
    log_info "Creating admin user..."
    
    cd $INSTALL_DIR/backend
    sudo -u $SERVICE_USER $INSTALL_DIR/venv/bin/python -c "
from app.core.database import init_db, async_session_maker
from app.models import User, UserRole
from app.core.security import get_password_hash
import asyncio

async def create_admin():
    await init_db()
    async with async_session_maker() as db:
        from sqlalchemy import select
        result = await db.execute(select(User).where(User.email == 'admin@ftp.local'))
        if not result.scalar_one_or_none():
            admin = User(
                email='admin@ftp.local',
                full_name='Administrator',
                hashed_password=get_password_hash('admin123'),
                role=UserRole.ADMIN,
                is_active=True,
                is_superuser=True
            )
            db.add(admin)
            await db.commit()
            print('Admin user created: admin@ftp.local / admin123')
        else:
            print('Admin user already exists')

asyncio.run(create_admin())
"
}

main() {
    log_info "Starting FTP Manager installation for RHEL 9.6..."
    
    check_root
    check_rhel
    
    install_dependencies
    setup_database
    setup_redis
    setup_vsftpd
    create_service_user
    deploy_application
    configure_nginx
    configure_firewall
    configure_selinux
    install_systemd_services
    setup_logrotate
    create_env_file
    run_migrations
    create_admin_user
    
    log_info "Starting services..."
    systemctl start ftp-manager-backend
    systemctl start ftp-manager-frontend
    systemctl restart vsftpd
    
    log_info "Installation complete!"
    echo
    echo "=================================="
    echo "FTP Manager installed successfully"
    echo "=================================="
    echo
    echo "Access the web interface at:"
    echo "  http://$(hostname -I | awk '{print $1}')"
    echo
    echo "Default admin credentials:"
    echo "  Email: admin@ftp.local"
    echo "  Password: admin123"
    echo
    echo "IMPORTANT: Change the default password after first login!"
    echo
    echo "Configuration files:"
    echo "  - Environment: $INSTALL_DIR/.env"
    echo "  - vsftpd: /etc/vsftpd/vsftpd.conf"
    echo "  - Nginx: /etc/nginx/conf.d/ftp-manager.conf"
    echo
    echo "Services:"
    echo "  - Backend: systemctl status ftp-manager-backend"
    echo "  - Frontend: systemctl status ftp-manager-frontend"
    echo "  - vsftpd: systemctl status vsftpd"
    echo "  - PostgreSQL: systemctl status postgresql"
    echo "  - Redis: systemctl status redis"
    echo "  - Nginx: systemctl status nginx"
    echo
    echo "To configure SSL with Let's Encrypt:"
    echo "  certbot --nginx -d ftp.example.com"
    echo "  Then update /etc/nginx/conf.d/ftp-manager.conf to enable HTTPS"
}

main "$@"