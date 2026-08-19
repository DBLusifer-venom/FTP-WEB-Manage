import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import type { Token, LoginCredentials, RegisterData, User, FTPUser, FTPUserCreate, FTPUserUpdate, SSLCertificate, SSLCertificateCreate, SSLCertificateUpdate, ServerConfig, ServerConfigCreate, ServerConfigUpdate, FileListResponse, FileItem, ServerStatus, AuditLog, PaginatedResponse, HealthCheck } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api/v1';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

let accessToken: string | null = null;

export const setAccessToken = (token: string | null) => {
  accessToken = token;
  if (token) {
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    localStorage.setItem('access_token', token);
  } else {
    delete api.defaults.headers.common['Authorization'];
    localStorage.removeItem('access_token');
  }
};

export const getAccessToken = () => accessToken;

api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    if (error.response?.status === 401) {
      setAccessToken(null);
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

const handleError = (error: unknown): never => {
  if (axios.isAxiosError(error)) {
    const message = error.response?.data?.detail || error.message;
    throw new Error(message);
  }
  throw error;
};

export const authApi = {
  login: async (credentials: LoginCredentials): Promise<Token> => {
    try {
      const formData = new FormData();
      formData.append('email', credentials.email);
      formData.append('password', credentials.password);
      const response = await api.post<Token>('/auth/login', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return response.data;
    } catch (error) {
      handleError(error);
    }
  },

  register: async (data: RegisterData): Promise<User> => {
    try {
      const response = await api.post<User>('/auth/register', data);
      return response.data;
    } catch (error) {
      handleError(error);
    }
  },

  getMe: async (): Promise<User> => {
    try {
      const response = await api.get<User>('/auth/me');
      return response.data;
    } catch (error) {
      handleError(error);
    }
  },

  updateMe: async (data: Partial<User>): Promise<User> => {
    try {
      const response = await api.put<User>('/auth/me', data);
      return response.data;
    } catch (error) {
      handleError(error);
    }
  },

  changePassword: async (currentPassword: string, newPassword: string): Promise<void> => {
    try {
      await api.post('/auth/change-password', { current_password: currentPassword, new_password: newPassword });
    } catch (error) {
      handleError(error);
    }
  },

  listUsers: async (skip = 0, limit = 100): Promise<User[]> => {
    try {
      const response = await api.get<User[]>(`/auth/users?skip=${skip}&limit=${limit}`);
      return response.data;
    } catch (error) {
      handleError(error);
    }
  },

  getUser: async (id: number): Promise<User> => {
    try {
      const response = await api.get<User>(`/auth/users/${id}`);
      return response.data;
    } catch (error) {
      handleError(error);
    }
  },

  updateUser: async (id: number, data: Partial<User>): Promise<User> => {
    try {
      const response = await api.put<User>(`/auth/users/${id}`, data);
      return response.data;
    } catch (error) {
      handleError(error);
    }
  },

  deleteUser: async (id: number): Promise<void> => {
    try {
      await api.delete(`/auth/users/${id}`);
    } catch (error) {
      handleError(error);
    }
  },
};

export const ftpUserApi = {
  list: async (skip = 0, limit = 100): Promise<FTPUser[]> => {
    try {
      const response = await api.get<FTPUser[]>(`/ftp-users/?skip=${skip}&limit=${limit}`);
      return response.data;
    } catch (error) {
      handleError(error);
    }
  },

  get: async (id: number): Promise<FTPUser> => {
    try {
      const response = await api.get<FTPUser>(`/ftp-users/${id}`);
      return response.data;
    } catch (error) {
      handleError(error);
    }
  },

  create: async (data: FTPUserCreate): Promise<FTPUser> => {
    try {
      const response = await api.post<FTPUser>('/ftp-users/', data);
      return response.data;
    } catch (error) {
      handleError(error);
    }
  },

  update: async (id: number, data: FTPUserUpdate): Promise<FTPUser> => {
    try {
      const response = await api.put<FTPUser>(`/ftp-users/${id}`, data);
      return response.data;
    } catch (error) {
      handleError(error);
    }
  },

  delete: async (id: number): Promise<void> => {
    try {
      await api.delete(`/ftp-users/${id}`);
    } catch (error) {
      handleError(error);
    }
  },

  toggleStatus: async (id: number): Promise<FTPUser> => {
    try {
      const response = await api.post<FTPUser>(`/ftp-users/${id}/toggle-status`);
      return response.data;
    } catch (error) {
      handleError(error);
    }
  },
};

export const fileApi = {
  list: async (path: string, ftpUserId?: number, useTls = true): Promise<FileListResponse> => {
    try {
      const params = new URLSearchParams({ path });
      if (ftpUserId) params.append('ftp_user_id', ftpUserId.toString());
      params.append('use_tls', useTls.toString());
      const response = await api.get<FileListResponse>(`/files/list?${params}`);
      return response.data;
    } catch (error) {
      handleError(error);
    }
  },

  upload: async (file: File, path: string, ftpUserId?: number, useTls = true): Promise<{ message: string; path: string }> => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('path', path);
      if (ftpUserId) formData.append('ftp_user_id', ftpUserId.toString());
      formData.append('use_tls', useTls.toString());
      const response = await api.post<{ message: string; path: string }>('/files/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return response.data;
    } catch (error) {
      handleError(error);
    }
  },

  download: async (path: string, ftpUserId?: number, useTls = true): Promise<Blob> => {
    try {
      const params = new URLSearchParams({ path });
      if (ftpUserId) params.append('ftp_user_id', ftpUserId.toString());
      params.append('use_tls', useTls.toString());
      const response = await api.get(`/files/download?${params}`, { responseType: 'blob' });
      return response.data;
    } catch (error) {
      handleError(error);
    }
  },

  delete: async (path: string, ftpUserId?: number, useTls = true): Promise<void> => {
    try {
      const params = new URLSearchParams({ path });
      if (ftpUserId) params.append('ftp_user_id', ftpUserId.toString());
      params.append('use_tls', useTls.toString());
      await api.delete(`/files/delete?${params}`);
    } catch (error) {
      handleError(error);
    }
  },

  mkdir: async (path: string, name: string, ftpUserId?: number, useTls = true): Promise<{ message: string; path: string }> => {
    try {
      const response = await api.post<{ message: string; path: string }>('/files/mkdir', { path, name, ftp_user_id: ftpUserId, use_tls: useTls });
      return response.data;
    } catch (error) {
      handleError(error);
    }
  },

  rename: async (oldPath: string, newPath: string, ftpUserId?: number, useTls = true): Promise<{ message: string; new_path: string }> => {
    try {
      const response = await api.post<{ message: string; new_path: string }>('/files/rename', { old_path: oldPath, new_path: newPath, ftp_user_id: ftpUserId, use_tls: useTls });
      return response.data;
    } catch (error) {
      handleError(error);
    }
  },
};

export const sslApi = {
  list: async (): Promise<SSLCertificate[]> => {
    try {
      const response = await api.get<SSLCertificate[]>('/ssl/');
      return response.data;
    } catch (error) {
      handleError(error);
    }
  },

  get: async (id: number): Promise<SSLCertificate> => {
    try {
      const response = await api.get<SSLCertificate>(`/ssl/${id}`);
      return response.data;
    } catch (error) {
      handleError(error);
    }
  },

  create: async (data: SSLCertificateCreate): Promise<SSLCertificate> => {
    try {
      const response = await api.post<SSLCertificate>('/ssl/', data);
      return response.data;
    } catch (error) {
      handleError(error);
    }
  },

  update: async (id: number, data: SSLCertificateUpdate): Promise<SSLCertificate> => {
    try {
      const response = await api.put<SSLCertificate>(`/ssl/${id}`, data);
      return response.data;
    } catch (error) {
      handleError(error);
    }
  },

  delete: async (id: number): Promise<void> => {
    try {
      await api.delete(`/ssl/${id}`);
    } catch (error) {
      handleError(error);
    }
  },

  generateSelfSigned: async (domain: string, name: string): Promise<{ cert_path: string; key_path: string }> => {
    try {
      const response = await api.post<{ cert_path: string; key_path: string }>('/ssl/generate-self-signed', { domain, name });
      return response.data;
    } catch (error) {
      handleError(error);
    }
  },

  createCSR: async (domain: string, name: string): Promise<{ csr_path: string; key_path: string }> => {
    try {
      const response = await api.post<{ csr_path: string; key_path: string }>('/ssl/create-csr', { domain, name });
      return response.data;
    } catch (error) {
      handleError(error);
    }
  },

  install: async (certPath: string, keyPath: string, chainPath?: string): Promise<void> => {
    try {
      await api.post('/ssl/install', { cert_path: certPath, key_path: keyPath, chain_path: chainPath });
    } catch (error) {
      handleError(error);
    }
  },

  renewLetsEncrypt: async (domain: string, email: string): Promise<void> => {
    try {
      await api.post('/ssl/renew-letsencrypt', { domain, email });
    } catch (error) {
      handleError(error);
    }
  },

  getInfo: async (certPath: string): Promise<any> => {
    try {
      const response = await api.post('/ssl/info', { cert_path: certPath });
      return response.data;
    } catch (error) {
      handleError(error);
    }
  },
};

export const serverApi = {
  getStatus: async (): Promise<ServerStatus> => {
    try {
      const response = await api.get<ServerStatus>('/server/status');
      return response.data;
    } catch (error) {
      handleError(error);
    }
  },

  getConfig: async (): Promise<Record<string, string>> => {
    try {
      const response = await api.get<Record<string, string>>('/server/config');
      return response.data;
    } catch (error) {
      handleError(error);
    }
  },

  updateConfig: async (config: Record<string, string>): Promise<void> => {
    try {
      await api.put('/server/config', config);
    } catch (error) {
      handleError(error);
    }
  },

  validateConfig: async (): Promise<{ valid: boolean; message: string }> => {
    try {
      const response = await api.get<{ valid: boolean; message: string }>('/server/config/validate');
      return response.data;
    } catch (error) {
      handleError(error);
    }
  },

  getSSLConfig: async (): Promise<Record<string, string>> => {
    try {
      const response = await api.get<Record<string, string>>('/server/config/ssl');
      return response.data;
    } catch (error) {
      handleError(error);
    }
  },

  updateSSLConfig: async (config: Record<string, string>): Promise<void> => {
    try {
      await api.put('/server/config/ssl', config);
    } catch (error) {
      handleError(error);
    }
  },

  enableSSL: async (certPath: string, keyPath: string): Promise<void> => {
    try {
      await api.post('/server/ssl/enable', { cert_path: certPath, key_path: keyPath });
    } catch (error) {
      handleError(error);
    }
  },

  disableSSL: async (): Promise<void> => {
    try {
      await api.post('/server/ssl/disable');
    } catch (error) {
      handleError(error);
    }
  },

  setPassivePorts: async (minPort: number, maxPort: number, address?: string): Promise<void> => {
    try {
      await api.post('/server/passive-ports', { min_port: minPort, max_port: maxPort, address });
    } catch (error) {
      handleError(error);
    }
  },

  setLimits: async (maxClients: number, maxPerIp: number, localMaxRate: number): Promise<void> => {
    try {
      await api.post('/server/limits', { max_clients: maxClients, max_per_ip: maxPerIp, local_max_rate: localMaxRate });
    } catch (error) {
      handleError(error);
    }
  },

  reload: async (): Promise<void> => {
    try {
      await api.post('/server/reload');
    } catch (error) {
      handleError(error);
    }
  },

  restart: async (): Promise<void> => {
    try {
      await api.post('/server/restart');
    } catch (error) {
      handleError(error);
    }
  },
};

export const auditApi = {
  list: async (skip = 0, limit = 100): Promise<PaginatedResponse<AuditLog>> => {
    try {
      const response = await api.get<PaginatedResponse<AuditLog>>(`/audit/?skip=${skip}&limit=${limit}`);
      return response.data;
    } catch (error) {
      handleError(error);
    }
  },
};

export const healthApi = {
  check: async (): Promise<HealthCheck> => {
    try {
      const response = await api.get<HealthCheck>('/health');
      return response.data;
    } catch (error) {
      handleError(error);
    }
  },
};

export default api;