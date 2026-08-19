export interface User {
  id: number;
  email: string;
  full_name: string | null;
  role: 'admin' | 'read_write' | 'read_only';
  is_active: boolean;
  is_superuser: boolean;
  created_at: string;
  updated_at: string | null;
  last_login: string | null;
}

export interface FTPUser {
  id: number;
  username: string;
  home_directory: string;
  permission: 'admin' | 'read_write' | 'read_only';
  uid: number | null;
  gid: number | null;
  max_files: number;
  max_size: number;
  ratio_upload: number;
  ratio_download: number;
  bandwidth_up: number;
  bandwidth_down: number;
  is_active: boolean;
  created_at: string;
  updated_at: string | null;
  last_login: string | null;
  owner_id: number | null;
}

export interface SSLCertificate {
  id: number;
  name: string;
  domain: string;
  cert_path: string;
  key_path: string;
  chain_path: string | null;
  issuer: string | null;
  expires_at: string | null;
  is_active: boolean;
  auto_renew: boolean;
  created_at: string;
  updated_at: string | null;
}

export interface ServerConfig {
  id: number;
  key: string;
  value: string;
  description: string | null;
  updated_at: string | null;
}

export interface FileItem {
  name: string;
  path: string;
  size: number;
  modified: string;
  is_dir: boolean;
  permissions: string;
  owner: string;
  group: string;
}

export interface FileListResponse {
  current_path: string;
  parent_path: string | null;
  items: FileItem[];
}

export interface ServerStatus {
  status: string;
  uptime: string | null;
  connections: number;
  version: string;
  config: Record<string, string>;
}

export interface AuditLog {
  id: number;
  user_id: number | null;
  action: string;
  resource_type: string | null;
  resource_id: string | null;
  details: string | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

export interface PaginatedResponse<T> {
  total: number;
  page: number;
  page_size: number;
  items: T[];
}

export interface HealthCheck {
  status: string;
  database: string;
  ftp_server: string;
  redis: string;
}

export interface Token {
  access_token: string;
  token_type: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  full_name?: string;
  role?: 'admin' | 'read_write' | 'read_only';
}

export interface FTPUserCreate {
  username: string;
  password: string;
  home_directory: string;
  permission: 'admin' | 'read_write' | 'read_only';
  uid?: number;
  gid?: number;
  max_files?: number;
  max_size?: number;
  ratio_upload?: number;
  ratio_download?: number;
  bandwidth_up?: number;
  bandwidth_down?: number;
}

export interface FTPUserUpdate {
  password?: string;
  home_directory?: string;
  permission?: 'admin' | 'read_write' | 'read_only';
  uid?: number;
  gid?: number;
  max_files?: number;
  max_size?: number;
  ratio_upload?: number;
  ratio_download?: number;
  bandwidth_up?: number;
  bandwidth_down?: number;
  is_active?: boolean;
}

export interface SSLCertificateCreate {
  name: string;
  domain: string;
  cert_path: string;
  key_path: string;
  chain_path?: string;
  auto_renew?: boolean;
}

export interface SSLCertificateUpdate {
  name?: string;
  domain?: string;
  cert_path?: string;
  key_path?: string;
  chain_path?: string;
  is_active?: boolean;
  auto_renew?: boolean;
}

export interface ServerConfigCreate {
  key: string;
  value: string;
  description?: string;
}

export interface ServerConfigUpdate {
  value?: string;
  description?: string;
}