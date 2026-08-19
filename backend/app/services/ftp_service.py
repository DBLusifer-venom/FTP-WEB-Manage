import os
import subprocess
import ftplib
import ssl
from typing import List, Optional, Tuple
from datetime import datetime
from pathlib import Path
import aioftp
from app.core.config import settings
from app.models import FTPUser, UserRole


class FTPService:
    def __init__(self):
        self.config_path = settings.VSFTPD_CONFIG_PATH
        self.user_db_path = settings.VSFTPD_USER_DB_PATH
        self.user_config_dir = settings.VSFTPD_USER_CONFIG_DIR
        self.ssl_cert = settings.VSFTPD_SSL_CERT
        self.ssl_key = settings.VSFTPD_SSL_KEY
    
    async def create_ftp_user(self, ftp_user: FTPUser) -> bool:
        try:
            os.makedirs(self.user_config_dir, exist_ok=True)
            
            user_config = f"""
local_root={ftp_user.home_directory}
write_enable={'YES' if ftp_user.permission == UserRole.READ_WRITE else 'NO'}
anon_upload_enable=NO
anon_mkdir_write_enable=NO
anon_other_write_enable=NO
virtual_use_local_privs=YES
local_umask=022
file_open_mode=0644
"""
            if ftp_user.max_files > 0:
                user_config += f"max_per_ip={ftp_user.max_files}\n"
            if ftp_user.bandwidth_up > 0:
                user_config += f"local_max_rate={ftp_user.bandwidth_up}\n"
            
            config_file = os.path.join(self.user_config_dir, ftp_user.username)
            with open(config_file, 'w') as f:
                f.write(user_config)
            
            await self._update_virtual_users_db()
            await self.reload_vsftpd()
            return True
        except Exception as e:
            print(f"Error creating FTP user: {e}")
            return False
    
    async def update_ftp_user(self, ftp_user: FTPUser) -> bool:
        return await self.create_ftp_user(ftp_user)
    
    async def delete_ftp_user(self, username: str) -> bool:
        try:
            config_file = os.path.join(self.user_config_dir, username)
            if os.path.exists(config_file):
                os.remove(config_file)
            
            await self._update_virtual_users_db()
            await self.reload_vsftpd()
            return True
        except Exception as e:
            print(f"Error deleting FTP user: {e}")
            return False
    
    async def _update_virtual_users_db(self):
        pass
    
    async def reload_vsftpd(self) -> bool:
        try:
            subprocess.run(["systemctl", "reload", "vsftpd"], check=True)
            return True
        except subprocess.CalledProcessError:
            try:
                subprocess.run(["service", "vsftpd", "reload"], check=True)
                return True
            except subprocess.CalledProcessError:
                return False
    
    async def get_server_status(self) -> dict:
        try:
            result = subprocess.run(
                ["systemctl", "is-active", "vsftpd"],
                capture_output=True, text=True
            )
            status = result.stdout.strip()
            
            uptime_result = subprocess.run(
                ["systemctl", "show", "vsftpd", "--property=ActiveEnterTimestamp"],
                capture_output=True, text=True
            )
            
            connections = await self._get_active_connections()
            
            version_result = subprocess.run(
                ["vsftpd", "-v"],
                capture_output=True, text=True
            )
            
            return {
                "status": status,
                "uptime": uptime_result.stdout.strip() if uptime_result.returncode == 0 else None,
                "connections": connections,
                "version": version_result.stdout.strip() if version_result.returncode == 0 else "unknown",
                "config": await self._get_config_summary()
            }
        except Exception as e:
            return {"status": "error", "error": str(e)}
    
    async def _get_active_connections(self) -> int:
        try:
            result = subprocess.run(
                ["netstat", "-tn"],
                capture_output=True, text=True
            )
            count = sum(1 for line in result.stdout.split('\n') 
                       if f":{settings.FTP_PORT} " in line or f":{settings.FTP_TLS_PORT} " in line)
            return count
        except Exception:
            return 0
    
    async def _get_config_summary(self) -> dict:
        config = {}
        try:
            with open(self.config_path, 'r') as f:
                for line in f:
                    line = line.strip()
                    if line and not line.startswith('#') and '=' in line:
                        key, value = line.split('=', 1)
                        config[key.strip()] = value.strip()
        except Exception:
            pass
        return config
    
    async def list_files(self, host: str, username: str, password: str, 
                        path: str = "/", use_tls: bool = True) -> List[dict]:
        try:
            if use_tls:
                ctx = ssl.create_default_context()
                ctx.check_hostname = False
                ctx.verify_mode = ssl.CERT_NONE
                
                async with aioftp.Client.context(ctx) as client:
                    await client.connect(host, settings.FTP_TLS_PORT)
                    await client.login(username, password)
                    await client.change_directory(path)
                    
                    files = []
                    async for entry in client.list():
                        name, info = entry
                        files.append({
                            "name": name,
                            "path": f"{path}/{name}".replace("//", "/"),
                            "size": info.get("size", 0),
                            "modified": datetime.fromtimestamp(info.get("modify", 0)),
                            "is_dir": info.get("type") == "dir",
                            "permissions": info.get("perm", ""),
                            "owner": info.get("owner", ""),
                            "group": info.get("group", "")
                        })
                    return files
            else:
                with ftplib.FTP() as ftp:
                    ftp.connect(host, settings.FTP_PORT)
                    ftp.login(username, password)
                    ftp.cwd(path)
                    
                    files = []
                    ftp.dir(files.append)
                    return self._parse_ftp_list(files, path)
        except Exception as e:
            raise Exception(f"Failed to list files: {str(e)}")
    
    def _parse_ftp_list(self, lines: List[str], path: str) -> List[dict]:
        files = []
        for line in lines:
            parts = line.split()
            if len(parts) >= 9:
                permissions = parts[0]
                is_dir = permissions.startswith('d')
                size = int(parts[4])
                name = ' '.join(parts[8:])
                files.append({
                    "name": name,
                    "path": f"{path}/{name}".replace("//", "/"),
                    "size": size,
                    "modified": datetime.now(),
                    "is_dir": is_dir,
                    "permissions": permissions,
                    "owner": parts[2],
                    "group": parts[3]
                })
        return files
    
    async def upload_file(self, host: str, username: str, password: str,
                         local_path: str, remote_path: str, use_tls: bool = True) -> bool:
        try:
            if use_tls:
                ctx = ssl.create_default_context()
                ctx.check_hostname = False
                ctx.verify_mode = ssl.CERT_NONE
                
                async with aioftp.Client.context(ctx) as client:
                    await client.connect(host, settings.FTP_TLS_PORT)
                    await client.login(username, password)
                    await client.upload(local_path, remote_path)
            else:
                with ftplib.FTP() as ftp:
                    ftp.connect(host, settings.FTP_PORT)
                    ftp.login(username, password)
                    with open(local_path, 'rb') as f:
                        ftp.storbinary(f'STOR {remote_path}', f)
            return True
        except Exception as e:
            raise Exception(f"Failed to upload file: {str(e)}")
    
    async def download_file(self, host: str, username: str, password: str,
                           remote_path: str, local_path: str, use_tls: bool = True) -> bool:
        try:
            if use_tls:
                ctx = ssl.create_default_context()
                ctx.check_hostname = False
                ctx.verify_mode = ssl.CERT_NONE
                
                async with aioftp.Client.context(ctx) as client:
                    await client.connect(host, settings.FTP_TLS_PORT)
                    await client.login(username, password)
                    await client.download(remote_path, local_path)
            else:
                with ftplib.FTP() as ftp:
                    ftp.connect(host, settings.FTP_PORT)
                    ftp.login(username, password)
                    with open(local_path, 'wb') as f:
                        ftp.retrbinary(f'RETR {remote_path}', f.write)
            return True
        except Exception as e:
            raise Exception(f"Failed to download file: {str(e)}")
    
    async def delete_file(self, host: str, username: str, password: str,
                         path: str, use_tls: bool = True) -> bool:
        try:
            if use_tls:
                ctx = ssl.create_default_context()
                ctx.check_hostname = False
                ctx.verify_mode = ssl.CERT_NONE
                
                async with aioftp.Client.context(ctx) as client:
                    await client.connect(host, settings.FTP_TLS_PORT)
                    await client.login(username, password)
                    await client.remove(path)
            else:
                with ftplib.FTP() as ftp:
                    ftp.connect(host, settings.FTP_PORT)
                    ftp.login(username, password)
                    ftp.delete(path)
            return True
        except Exception as e:
            raise Exception(f"Failed to delete file: {str(e)}")
    
    async def create_directory(self, host: str, username: str, password: str,
                              path: str, use_tls: bool = True) -> bool:
        try:
            if use_tls:
                ctx = ssl.create_default_context()
                ctx.check_hostname = False
                ctx.verify_mode = ssl.CERT_NONE
                
                async with aioftp.Client.context(ctx) as client:
                    await client.connect(host, settings.FTP_TLS_PORT)
                    await client.login(username, password)
                    await client.make_directory(path)
            else:
                with ftplib.FTP() as ftp:
                    ftp.connect(host, settings.FTP_PORT)
                    ftp.login(username, password)
                    ftp.mkd(path)
            return True
        except Exception as e:
            raise Exception(f"Failed to create directory: {str(e)}")
    
    async def rename_file(self, host: str, username: str, password: str,
                         old_path: str, new_path: str, use_tls: bool = True) -> bool:
        try:
            if use_tls:
                ctx = ssl.create_default_context()
                ctx.check_hostname = False
                ctx.verify_mode = ssl.CERT_NONE
                
                async with aioftp.Client.context(ctx) as client:
                    await client.connect(host, settings.FTP_TLS_PORT)
                    await client.login(username, password)
                    await client.rename(old_path, new_path)
            else:
                with ftplib.FTP() as ftp:
                    ftp.connect(host, settings.FTP_PORT)
                    ftp.login(username, password)
                    ftp.rename(old_path, new_path)
            return True
        except Exception as e:
            raise Exception(f"Failed to rename file: {str(e)}")


ftp_service = FTPService()