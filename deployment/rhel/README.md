# FTP Manager - RHEL 9.6 Deployment Guide

## Prerequisites

- RHEL 9.6 (or compatible: Rocky Linux 9, AlmaLinux 9)
- Root/sudo access
- Valid RHEL subscription (for repositories)
- Domain name pointed to server (for SSL)

## Quick Installation

```bash
# Clone repository
git clone <your-repo> /opt/ftp-manager
cd /opt/ftp-manager/deployment/rhel/scripts

# Run installation (as root)
sudo bash install.sh
```

The installation script will:
1. Install all dependencies (Python 3.11, Node.js 20, PostgreSQL, Redis, Nginx, vsftpd)
2. Configure PostgreSQL database
3. Configure Redis
4. Configure vsftpd with virtual users and SSL
5. Create service user
6. Deploy backend and frontend
7. Configure Nginx as reverse proxy
8. Configure firewall (firewalld)
9. Configure SELinux policies
10. Install systemd services
11. Setup log rotation
12. Create admin user

## Post-Installation

### Access Web Interface
- URL: `http://your-server-ip`
- Default login: `admin@ftp.local` / `admin123`
- **Change password immediately after first login!**

### Enable HTTPS with Let's Encrypt

```bash
sudo bash /opt/ftp-manager/deployment/rhel/scripts/setup-ssl.sh ftp.example.com admin@example.com
```

This will:
- Obtain SSL certificate from Let's Encrypt
- Configure Nginx for HTTPS (with HSTS)
- Configure vsftpd for FTPS
- Setup automatic renewal via cron

## Service Management

```bash
# Backend API
systemctl status ftp-manager-backend
systemctl restart ftp-manager-backend
journalctl -u ftp-manager-backend -f

# Frontend (Nginx)
systemctl status ftp-manager-frontend
systemctl reload ftp-manager-frontend

# vsftpd
systemctl status vsftpd
systemctl restart vsftpd

# Database
systemctl status postgresql

# Redis
systemctl status redis

# Nginx
systemctl status nginx
```

## Configuration Files

| Component | Config File |
|-----------|-------------|
| Backend | `/opt/ftp-manager/.env` |
| vsftpd | `/etc/vsftpd/vsftpd.conf` |
| Nginx | `/etc/nginx/conf.d/ftp-manager.conf` |
| Systemd (backend) | `/etc/systemd/system/ftp-manager-backend.service` |

## Updating

```bash
cd /opt/ftp-manager/deployment/rhel/scripts
sudo bash update.sh
```

## Backup

```bash
# Database backup
pg_dump -U ftpuser ftpmanager > ftpmanager-$(date +%Y%m%d).sql

# Full backup
tar -czf ftp-manager-backup-$(date +%Y%m%d).tar.gz /opt/ftp-manager /etc/vsftpd /etc/ssl/ftpmanager /etc/nginx/conf.d/ftp-manager.conf
```

## Firewall Ports

| Port | Protocol | Service |
|------|----------|---------|
| 80 | TCP | HTTP (redirects to HTTPS) |
| 443 | TCP | HTTPS |
| 21 | TCP | FTP |
| 990 | TCP | FTPS (Implicit SSL) |
| 40000-50000 | TCP | Passive FTP |

## SELinux

The installation configures these SELinux booleans:
- `ftp_home_dir` - Allow FTP to read user home directories
- `allow_ftpd_full_access` - Allow full FTP access
- `httpd_can_network_connect` - Allow Nginx to proxy to backend

## Log Files

| Service | Log Location |
|---------|--------------|
| Backend | `/var/log/ftp-manager/` |
| vsftpd | `/var/log/vsftpd.log` |
| FTP Transfers | `/var/log/xferlog` |
| Nginx | `/var/log/nginx/` |
| Systemd | `journalctl -u ftp-manager-backend` |

## Troubleshooting

### Backend won't start
```bash
journalctl -u ftp-manager-backend -n 50
cd /opt/ftp-manager/backend && sudo -u ftpmanager /opt/ftp-manager/venv/bin/python -m app.main
```

### FTP connection fails
```bash
# Check vsftpd status
systemctl status vsftpd

# Check config
vsftpd -olisten=YES /etc/vsftpd/vsftpd.conf

# Check SELinux
ausearch -m avc -ts recent | grep vsftpd
```

### SSL issues
```bash
# Test certificate
openssl x509 -in /etc/ssl/ftpmanager/fullchain.pem -text -noout

# Test FTPS
openssl s_client -connect localhost:990 -starttls ftp
```

## Architecture

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Client    │────▶│   Nginx     │────▶│  Backend    │
│  (Browser)  │:443 │  (Reverse   │:8000│  (FastAPI)  │
└─────────────┘     │   Proxy)    │     └──────┬──────┘
                    └─────────────┘            │
                          │                    │
                    ┌─────▼─────┐       ┌──────▼──────┐
                    │  Static   │       │ PostgreSQL  │
                    │  Files    │       │  (Database) │
                    └───────────┘       └─────────────┘
                                                │
                    ┌───────────────────────────┘
                    ▼
            ┌─────────────┐
            │   vsftpd    │
            │  (FTP/FTPS) │
            └──────┬──────┘
                   │
            ┌──────▼──────┐
            │   Redis     │
            │  (Cache/    │
            │   Sessions) │
            └─────────────┘
```

## Security Notes

1. **Change default passwords** in `/opt/ftp-manager/.env`
2. **Use strong SECRET_KEY** - generate with `openssl rand -hex 32`
3. **Restrict CORS origins** to your domain only
4. **Keep system updated** - `dnf update -y`
5. **Monitor logs** for suspicious activity
6. **Use fail2ban** for additional protection

## Support

For issues, check:
1. Service logs: `journalctl -u <service> -f`
2. Application logs: `/var/log/ftp-manager/`
3. Nginx error log: `/var/log/nginx/error.log`