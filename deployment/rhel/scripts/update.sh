#!/bin/bash
# FTP Manager Update Script for RHEL 9.6
# Run as root: sudo bash update.sh

set -euo pipefail

INSTALL_DIR="/opt/ftp-manager"
SERVICE_USER="ftpmanager"

log_info() { echo -e "\033[0;32m[INFO]\033[0m $1"; }
log_error() { echo -e "\033[0;31m[ERROR]\033[0m $1"; }

main() {
    log_info "Updating FTP Manager..."
    
    # Backup current version
    BACKUP_DIR="/opt/ftp-manager-backup-$(date +%Y%m%d-%H%M%S)"
    log_info "Creating backup at $BACKUP_DIR"
    cp -r $INSTALL_DIR $BACKUP_DIR
    
    # Pull latest code (assuming git repo)
    cd $INSTALL_DIR
    if [[ -d .git ]]; then
        log_info "Pulling latest changes..."
        sudo -u $SERVICE_USER git pull
    else
        log_warn "Not a git repository. Please manually update the code."
    fi
    
    # Update Python dependencies
    log_info "Updating Python dependencies..."
    sudo -u $SERVICE_USER $INSTALL_DIR/venv/bin/pip install --upgrade pip
    sudo -u $SERVICE_USER $INSTALL_DIR/venv/bin/pip install -r $INSTALL_DIR/backend/requirements.txt
    
    # Run migrations
    log_info "Running database migrations..."
    cd $INSTALL_DIR/backend
    sudo -u $SERVICE_USER $INSTALL_DIR/venv/bin/alembic upgrade head
    
    # Build frontend
    log_info "Building frontend..."
    cd $INSTALL_DIR/frontend
    sudo -u $SERVICE_USER pnpm install
    sudo -u $SERVICE_USER pnpm run build
    
    # Deploy frontend
    log_info "Deploying frontend..."
    mkdir -p /var/www/ftp-manager
    cp -r $INSTALL_DIR/frontend/dist/* /var/www/ftp-manager/
    chown -R nginx:nginx /var/www/ftp-manager
    
    # Restart services
    log_info "Restarting services..."
    systemctl restart ftp-manager-backend
    systemctl reload nginx
    
    log_info "Update complete!"
}

main "$@"