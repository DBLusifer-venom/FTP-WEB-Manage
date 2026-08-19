import { useQuery, useMutation, useQueryClient, UseQueryOptions, UseMutationOptions } from '@tanstack/react-query';
import { 
  authApi, 
  ftpUserApi, 
  sslApi, 
  serverApi, 
  auditApi, 
  healthApi 
} from '../services/api';
import type { User, FTPUser, FTPUserCreate, FTPUserUpdate, SSLCertificate, SSLCertificateCreate, SSLCertificateUpdate, ServerConfig, ServerConfigCreate, ServerConfigUpdate, ServerStatus, AuditLog, PaginatedResponse, HealthCheck } from '../types';

export function useUsers(options?: UseQueryOptions<User[]>): ReturnType<typeof useQuery<User[]>> {
  return useQuery<User[]>({
    queryKey: ['users'],
    queryFn: () => authApi.listUsers(),
    ...options,
  });
}

export function useUser(id: number, options?: UseQueryOptions<User>): ReturnType<typeof useQuery<User>> {
  return useQuery<User>({
    queryKey: ['users', id],
    queryFn: () => authApi.getUser(id),
    enabled: !!id,
    ...options,
  });
}

export function useFTPUsers(options?: UseQueryOptions<FTPUser[]>): ReturnType<typeof useQuery<FTPUser[]>> {
  return useQuery<FTPUser[]>({
    queryKey: ['ftpUsers'],
    queryFn: () => ftpUserApi.list(),
    ...options,
  });
}

export function useFTPUser(id: number, options?: UseQueryOptions<FTPUser>): ReturnType<typeof useQuery<FTPUser>> {
  return useQuery<FTPUser>({
    queryKey: ['ftpUsers', id],
    queryFn: () => ftpUserApi.get(id),
    enabled: !!id,
    ...options,
  });
}

export function useCreateFTPUser(options?: UseMutationOptions<FTPUser, Error, FTPUserCreate>) {
  const queryClient = useQueryClient();
  return useMutation<FTPUser, Error, FTPUserCreate>({
    mutationFn: ftpUserApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ftpUsers'] });
    },
    ...options,
  });
}

export function useUpdateFTPUser(options?: UseMutationOptions<FTPUser, Error, { id: number; data: FTPUserUpdate }>) {
  const queryClient = useQueryClient();
  return useMutation<FTPUser, Error, { id: number; data: FTPUserUpdate }>({
    mutationFn: ({ id, data }) => ftpUserApi.update(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['ftpUsers'] });
      queryClient.invalidateQueries({ queryKey: ['ftpUsers', id] });
    },
    ...options,
  });
}

export function useDeleteFTPUser(options?: UseMutationOptions<void, Error, number>) {
  const queryClient = useQueryClient();
  return useMutation<void, Error, number>({
    mutationFn: ftpUserApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ftpUsers'] });
    },
    ...options,
  });
}

export function useToggleFTPUserStatus(options?: UseMutationOptions<FTPUser, Error, number>) {
  const queryClient = useQueryClient();
  return useMutation<FTPUser, Error, number>({
    mutationFn: ftpUserApi.toggleStatus,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ftpUsers'] });
    },
    ...options,
  });
}

export function useSSLCertificates(options?: UseQueryOptions<SSLCertificate[]>): ReturnType<typeof useQuery<SSLCertificate[]>> {
  return useQuery<SSLCertificate[]>({
    queryKey: ['sslCertificates'],
    queryFn: () => sslApi.list(),
    ...options,
  });
}

export function useSSLCertificate(id: number, options?: UseQueryOptions<SSLCertificate>): ReturnType<typeof useQuery<SSLCertificate>> {
  return useQuery<SSLCertificate>({
    queryKey: ['sslCertificates', id],
    queryFn: () => sslApi.get(id),
    enabled: !!id,
    ...options,
  });
}

export function useCreateSSLCertificate(options?: UseMutationOptions<SSLCertificate, Error, SSLCertificateCreate>) {
  const queryClient = useQueryClient();
  return useMutation<SSLCertificate, Error, SSLCertificateCreate>({
    mutationFn: sslApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sslCertificates'] });
    },
    ...options,
  });
}

export function useUpdateSSLCertificate(options?: UseMutationOptions<SSLCertificate, Error, { id: number; data: SSLCertificateUpdate }>) {
  const queryClient = useQueryClient();
  return useMutation<SSLCertificate, Error, { id: number; data: SSLCertificateUpdate }>({
    mutationFn: ({ id, data }) => sslApi.update(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['sslCertificates'] });
      queryClient.invalidateQueries({ queryKey: ['sslCertificates', id] });
    },
    ...options,
  });
}

export function useDeleteSSLCertificate(options?: UseMutationOptions<void, Error, number>) {
  const queryClient = useQueryClient();
  return useMutation<void, Error, number>({
    mutationFn: sslApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sslCertificates'] });
    },
    ...options,
  });
}

export function useGenerateSelfSignedCert(options?: UseMutationOptions<{ cert_path: string; key_path: string }, Error, { domain: string; name: string }>) {
  return useMutation<{ cert_path: string; key_path: string }, Error, { domain: string; name: string }>({
    mutationFn: ({ domain, name }) => sslApi.generateSelfSigned(domain, name),
    ...options,
  });
}

export function useCreateCSR(options?: UseMutationOptions<{ csr_path: string; key_path: string }, Error, { domain: string; name: string }>) {
  return useMutation<{ csr_path: string; key_path: string }, Error, { domain: string; name: string }>({
    mutationFn: ({ domain, name }) => sslApi.createCSR(domain, name),
    ...options,
  });
}

export function useInstallCertificate(options?: UseMutationOptions<void, Error, { certPath: string; keyPath: string; chainPath?: string }>) {
  return useMutation<void, Error, { certPath: string; keyPath: string; chainPath?: string }>({
    mutationFn: ({ certPath, keyPath, chainPath }) => sslApi.install(certPath, keyPath, chainPath),
    ...options,
  });
}

export function useRenewLetsEncrypt(options?: UseMutationOptions<void, Error, { domain: string; email: string }>) {
  return useMutation<void, Error, { domain: string; email: string }>({
    mutationFn: ({ domain, email }) => sslApi.renewLetsEncrypt(domain, email),
    ...options,
  });
}

export function useServerStatus(options?: UseQueryOptions<ServerStatus>): ReturnType<typeof useQuery<ServerStatus>> {
  return useQuery<ServerStatus>({
    queryKey: ['serverStatus'],
    queryFn: () => serverApi.getStatus(),
    refetchInterval: 30000,
    ...options,
  });
}

export function useServerConfig(options?: UseQueryOptions<Record<string, string>>): ReturnType<typeof useQuery<Record<string, string>>> {
  return useQuery<Record<string, string>>({
    queryKey: ['serverConfig'],
    queryFn: () => serverApi.getConfig(),
    ...options,
  });
}

export function useSSLConfig(options?: UseQueryOptions<Record<string, string>>): ReturnType<typeof useQuery<Record<string, string>>> {
  return useQuery<Record<string, string>>({
    queryKey: ['sslConfig'],
    queryFn: () => serverApi.getSSLConfig(),
    ...options,
  });
}

export function useUpdateServerConfig(options?: UseMutationOptions<void, Error, Record<string, string>>) {
  const queryClient = useQueryClient();
  return useMutation<void, Error, Record<string, string>>({
    mutationFn: serverApi.updateConfig,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['serverConfig'] });
    },
    ...options,
  });
}

export function useValidateConfig(options?: UseMutationOptions<{ valid: boolean; message: string }, Error, void>) {
  return useMutation<{ valid: boolean; message: string }, Error, void>({
    mutationFn: serverApi.validateConfig,
    ...options,
  });
}

export function useEnableSSL(options?: UseMutationOptions<void, Error, { certPath: string; keyPath: string }>) {
  const queryClient = useQueryClient();
  return useMutation<void, Error, { certPath: string; keyPath: string }>({
    mutationFn: ({ certPath, keyPath }) => serverApi.enableSSL(certPath, keyPath),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sslConfig'] });
      queryClient.invalidateQueries({ queryKey: ['serverStatus'] });
    },
    ...options,
  });
}

export function useDisableSSL(options?: UseMutationOptions<void, Error, void>) {
  const queryClient = useQueryClient();
  return useMutation<void, Error, void>({
    mutationFn: serverApi.disableSSL,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sslConfig'] });
      queryClient.invalidateQueries({ queryKey: ['serverStatus'] });
    },
    ...options,
  });
}

export function useSetPassivePorts(options?: UseMutationOptions<void, Error, { minPort: number; maxPort: number; address?: string }>) {
  return useMutation<void, Error, { minPort: number; maxPort: number; address?: string }>({
    mutationFn: ({ minPort, maxPort, address }) => serverApi.setPassivePorts(minPort, maxPort, address),
    ...options,
  });
}

export function useSetLimits(options?: UseMutationOptions<void, Error, { maxClients: number; maxPerIp: number; localMaxRate: number }>) {
  return useMutation<void, Error, { maxClients: number; maxPerIp: number; localMaxRate: number }>({
    mutationFn: ({ maxClients, maxPerIp, localMaxRate }) => serverApi.setLimits(maxClients, maxPerIp, localMaxRate),
    ...options,
  });
}

export function useReloadServer(options?: UseMutationOptions<void, Error, void>) {
  const queryClient = useQueryClient();
  return useMutation<void, Error, void>({
    mutationFn: serverApi.reload,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['serverStatus'] });
    },
    ...options,
  });
}

export function useRestartServer(options?: UseMutationOptions<void, Error, void>) {
  const queryClient = useQueryClient();
  return useMutation<void, Error, void>({
    mutationFn: serverApi.restart,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['serverStatus'] });
    },
    ...options,
  });
}

export function useAuditLogs(page = 1, pageSize = 50, options?: UseQueryOptions<PaginatedResponse<AuditLog>>): ReturnType<typeof useQuery<PaginatedResponse<AuditLog>>> {
  return useQuery<PaginatedResponse<AuditLog>>({
    queryKey: ['auditLogs', page, pageSize],
    queryFn: () => auditApi.list((page - 1) * pageSize, pageSize),
    ...options,
  });
}

export function useHealthCheck(options?: UseQueryOptions<HealthCheck>): ReturnType<typeof useQuery<HealthCheck>> {
  return useQuery<HealthCheck>({
    queryKey: ['health'],
    queryFn: () => healthApi.check(),
    refetchInterval: 60000,
    ...options,
  });
}