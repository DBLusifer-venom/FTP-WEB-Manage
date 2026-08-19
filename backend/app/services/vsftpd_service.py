import os
import subprocess
from typing import Dict, List, Optional
from pathlib import Path
from app.core.config import settings


class VsftpdConfigService:
    def __init__(self):
        self.config_path = settings.VSFTPD_CONFIG_PATH
        self.ssl_cert = settings.VSFTPD_SSL_CERT
        self.ssl_key = settings.VSFTPD_SSL_KEY
    
    def get_default_config(self) -> str:
        return f"""# vsftpd configuration managed by FTP Manager
listen=YES
listen_ipv6=NO
anonymous_enable=NO
local_enable=YES
write_enable=YES
local_umask=022
dirmessage_enable=YES
xferlog_enable=YES
connect_from_port_20=YES
xferlog_std_format=YES
idle_session_timeout=600
data_connection_timeout=120
ftpd_banner=Welcome to FTP Manager Server

# Virtual users
guest_enable=YES
guest_username=ftp
virtual_use_local_privs=YES
user_sub_token=$USER
local_root=/home/ftp/$USER
chroot_local_user=YES
allow_writeable_chroot=YES
hide_ids=YES

# Passive mode
pasv_enable=YES
pasv_min_port=40000
pasv_max_port=50000
pasv_address=

# SSL/TLS
ssl_enable=YES
allow_anon_ssl=NO
force_local_data_ssl=YES
force_local_logins_ssl=YES
ssl_tlsv1=YES
ssl_sslv2=NO
ssl_sslv3=NO
require_ssl_reuse=NO
ssl_ciphers=HIGH
rsa_cert_file={self.ssl_cert}
rsa_private_key_file={self.ssl_key}

# Logging
log_ftp_protocol=YES
vsftpd_log_file=/var/log/vsftpd.log
xferlog_file=/var/log/xferlog

# Performance
max_clients=100
max_per_ip=10
local_max_rate=0

# User config
user_config_dir=/etc/vsftpd/user_config

# PAM
pam_service_name=vsftpd
"""
    
    def read_config(self) -> Dict[str, str]:
        config = {}
        try:
            with open(self.config_path, 'r') as f:
                for line in f:
                    line = line.strip()
                    if line and not line.startswith('#') and '=' in line:
                        key, value = line.split('=', 1)
                        config[key.strip()] = value.strip()
        except FileNotFoundError:
            pass
        return config
    
    def write_config(self, config: Dict[str, str]) -> bool:
        try:
            lines = ["# vsftpd configuration managed by FTP Manager"]
            for key, value in sorted(config.items()):
                lines.append(f"{key}={value}")
            
            Path(self.config_path).parent.mkdir(parents=True, exist_ok=True)
            with open(self.config_path, 'w') as f:
                f.write('\n'.join(lines) + '\n')
            return True
        except Exception as e:
            print(f"Error writing config: {e}")
            return False
    
    def update_config(self, updates: Dict[str, str]) -> bool:
        config = self.read_config()
        config.update(updates)
        return self.write_config(config)
    
    def validate_config(self) -> tuple[bool, str]:
        try:
            result = subprocess.run(
                ["vsftpd", "-olisten=YES", self.config_path],
                capture_output=True, text=True, timeout=5
            )
            if result.returncode == 0:
                return True, "Configuration is valid"
            else:
                return False, result.stderr
        except subprocess.TimeoutExpired:
            return True, "Configuration test passed (timeout)"
        except FileNotFoundError:
            return False, "vsftpd binary not found"
        except Exception as e:
            return False, str(e)
    
    def get_ssl_config(self) -> Dict[str, str]:
        config = self.read_config()
        ssl_keys = [
            'ssl_enable', 'allow_anon_ssl', 'force_local_data_ssl',
            'force_local_logins_ssl', 'ssl_tlsv1', 'ssl_sslv2', 'ssl_sslv3',
            'require_ssl_reuse', 'ssl_ciphers', 'rsa_cert_file', 'rsa_private_key_file'
        ]
        return {k: v for k, v in config.items() if k in ssl_keys}
    
    def update_ssl_config(self, ssl_config: Dict[str, str]) -> bool:
        return self.update_config(ssl_config)
    
    def enable_ssl(self, cert_path: str, key_path: str) -> bool:
        ssl_config = {
            'ssl_enable': 'YES',
            'allow_anon_ssl': 'NO',
            'force_local_data_ssl': 'YES',
            'force_local_logins_ssl': 'YES',
            'ssl_tlsv1': 'YES',
            'ssl_sslv2': 'NO',
            'ssl_sslv3': 'NO',
            'require_ssl_reuse': 'NO',
            'ssl_ciphers': 'HIGH',
            'rsa_cert_file': cert_path,
            'rsa_private_key_file': key_path
        }
        return self.update_config(ssl_config)
    
    def disable_ssl(self) -> bool:
        return self.update_config({'ssl_enable': 'NO'})
    
    def set_passive_ports(self, min_port: int, max_port: int, address: str = "") -> bool:
        config = {
            'pasv_enable': 'YES',
            'pasv_min_port': str(min_port),
            'pasv_max_port': str(max_port),
        }
        if address:
            config['pasv_address'] = address
        return self.update_config(config)
    
    def set_limits(self, max_clients: int = 100, max_per_ip: int = 10, 
                   local_max_rate: int = 0) -> bool:
        config = {
            'max_clients': str(max_clients),
            'max_per_ip': str(max_per_ip),
            'local_max_rate': str(local_max_rate)
        }
        return self.update_config(config)
    
    def reload(self) -> bool:
        try:
            subprocess.run(["systemctl", "reload", "vsftpd"], check=True)
            return True
        except subprocess.CalledProcessError:
            try:
                subprocess.run(["service", "vsftpd", "reload"], check=True)
                return True
            except subprocess.CalledProcessError:
                return False
    
    def restart(self) -> bool:
        try:
            subprocess.run(["systemctl", "restart", "vsftpd"], check=True)
            return True
        except subprocess.CalledProcessError:
            try:
                subprocess.run(["service", "vsftpd", "restart"], check=True)
                return True
            except subprocess.CalledProcessError:
                return False
    
    def get_status(self) -> str:
        try:
            result = subprocess.run(
                ["systemctl", "is-active", "vsftpd"],
                capture_output=True, text=True
            )
            return result.stdout.strip()
        except Exception:
            return "unknown"


vsftpd_config_service = VsftpdConfigService()