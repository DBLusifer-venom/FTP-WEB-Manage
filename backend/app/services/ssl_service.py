import os
import subprocess
import ssl
import OpenSSL.crypto
from datetime import datetime, timedelta
from typing import Optional, Tuple
from pathlib import Path
from app.core.config import settings
from app.models import SSLCertificate


class SSLService:
    def __init__(self):
        self.cert_dir = Path(settings.SSL_CERT_DIR)
        self.cert_dir.mkdir(parents=True, exist_ok=True)
        self.vsftpd_cert = settings.VSFTPD_SSL_CERT
        self.vsftpd_key = settings.VSFTPD_SSL_KEY
    
    def generate_self_signed(self, domain: str, name: str) -> Tuple[str, str]:
        key_path = self.cert_dir / f"{name}.key"
        cert_path = self.cert_dir / f"{name}.pem"
        
        key = OpenSSL.crypto.PKey()
        key.generate_key(OpenSSL.crypto.TYPE_RSA, 2048)
        
        cert = OpenSSL.crypto.X509()
        cert.get_subject().CN = domain
        cert.set_serial_number(1000)
        cert.gmtime_adj_notBefore(0)
        cert.gmtime_adj_notAfter(365 * 24 * 60 * 60)
        cert.set_issuer(cert.get_subject())
        cert.set_pubkey(key)
        cert.sign(key, 'sha256')
        
        with open(key_path, 'wb') as f:
            f.write(OpenSSL.crypto.dump_privatekey(OpenSSL.crypto.FILETYPE_PEM, key))
        
        with open(cert_path, 'wb') as f:
            f.write(OpenSSL.crypto.dump_certificate(OpenSSL.crypto.FILETYPE_PEM, cert))
        
        os.chmod(key_path, 0o600)
        os.chmod(cert_path, 0o644)
        
        return str(cert_path), str(key_path)
    
    def create_csr(self, domain: str, name: str) -> Tuple[str, str]:
        key_path = self.cert_dir / f"{name}.key"
        csr_path = self.cert_dir / f"{name}.csr"
        
        key = OpenSSL.crypto.PKey()
        key.generate_key(OpenSSL.crypto.TYPE_RSA, 2048)
        
        req = OpenSSL.crypto.X509Req()
        req.get_subject().CN = domain
        req.set_pubkey(key)
        req.sign(key, 'sha256')
        
        with open(key_path, 'wb') as f:
            f.write(OpenSSL.crypto.dump_privatekey(OpenSSL.crypto.FILETYPE_PEM, key))
        
        with open(csr_path, 'wb') as f:
            f.write(OpenSSL.crypto.dump_certificate_request(OpenSSL.crypto.FILETYPE_PEM, req))
        
        os.chmod(key_path, 0o600)
        os.chmod(csr_path, 0o644)
        
        return str(csr_path), str(key_path)
    
    def install_certificate(self, cert_path: str, key_path: str, 
                           chain_path: Optional[str] = None) -> bool:
        try:
            cert_dest = Path(self.vsftpd_cert)
            key_dest = Path(self.vsftpd_key)
            
            cert_dest.parent.mkdir(parents=True, exist_ok=True)
            key_dest.parent.mkdir(parents=True, exist_ok=True)
            
            with open(cert_path, 'r') as src, open(cert_dest, 'w') as dst:
                dst.write(src.read())
            
            with open(key_path, 'r') as src, open(key_dest, 'w') as dst:
                dst.write(src.read())
            
            if chain_path:
                chain_dest = cert_dest.with_suffix('.chain.pem')
                with open(chain_path, 'r') as src, open(chain_dest, 'w') as dst:
                    dst.write(src.read())
            
            os.chmod(cert_dest, 0o644)
            os.chmod(key_dest, 0o600)
            
            return True
        except Exception as e:
            print(f"Error installing certificate: {e}")
            return False
    
    def get_certificate_info(self, cert_path: str) -> dict:
        try:
            with open(cert_path, 'r') as f:
                cert_data = f.read()
            
            cert = OpenSSL.crypto.load_certificate(OpenSSL.crypto.FILETYPE_PEM, cert_data)
            
            subject = cert.get_subject()
            issuer = cert.get_issuer()
            
            not_before = datetime.strptime(
                cert.get_notBefore().decode('ascii'), '%Y%m%d%H%M%SZ'
            )
            not_after = datetime.strptime(
                cert.get_notAfter().decode('ascii'), '%Y%m%d%H%M%SZ'
            )
            
            return {
                "subject": {k.decode(): v.decode() for k, v in subject.get_components()},
                "issuer": {k.decode(): v.decode() for k, v in issuer.get_components()},
                "not_before": not_before,
                "not_after": not_after,
                "serial_number": cert.get_serial_number(),
                "version": cert.get_version(),
                "signature_algorithm": cert.get_signature_algorithm().decode(),
                "is_expired": cert.has_expired(),
                "days_until_expiry": (not_after - datetime.utcnow()).days
            }
        except Exception as e:
            return {"error": str(e)}
    
    def renew_letsencrypt(self, domain: str, email: str) -> bool:
        try:
            cmd = [
                "certbot", "certonly", "--standalone",
                "-d", domain,
                "--email", email,
                "--agree-tos",
                "--non-interactive",
                "--expand"
            ]
            result = subprocess.run(cmd, capture_output=True, text=True)
            
            if result.returncode == 0:
                cert_path = f"/etc/letsencrypt/live/{domain}/fullchain.pem"
                key_path = f"/etc/letsencrypt/live/{domain}/privkey.pem"
                return self.install_certificate(cert_path, key_path)
            
            return False
        except Exception as e:
            print(f"Error renewing Let's Encrypt certificate: {e}")
            return False
    
    def setup_auto_renewal(self) -> bool:
        try:
            cron_job = "0 3 * * * root certbot renew --quiet --post-hook 'systemctl reload vsftpd'"
            with open("/etc/cron.d/certbot-renew", "w") as f:
                f.write(cron_job)
            return True
        except Exception as e:
            print(f"Error setting up auto-renewal: {e}")
            return False
    
    def verify_certificate_match(self, cert_path: str, key_path: str) -> bool:
        try:
            with open(cert_path, 'r') as f:
                cert_data = f.read()
            with open(key_path, 'r') as f:
                key_data = f.read()
            
            cert = OpenSSL.crypto.load_certificate(OpenSSL.crypto.FILETYPE_PEM, cert_data)
            key = OpenSSL.crypto.load_privatekey(OpenSSL.crypto.FILETYPE_PEM, key_data)
            
            ctx = ssl.create_default_context()
            ctx.load_cert_chain(cert_path, key_path)
            
            return True
        except Exception:
            return False


ssl_service = SSLService()