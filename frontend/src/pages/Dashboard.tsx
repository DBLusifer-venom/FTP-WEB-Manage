import React from 'react';
import { useServerStatus, useHealthCheck, useFTPUsers, useSSLCertificates } from '../hooks/useApi';
import { Server, Database, HardDrive, Shield, Users, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import { cn } from '../utils/helpers';
import { Card, CardHeader, CardBody, CardFooter } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';

const statCards = [
  { name: 'FTP Server', icon: Server, color: 'text-blue-600 bg-blue-100' },
  { name: 'Database', icon: Database, color: 'text-green-600 bg-green-100' },
  { name: 'Storage', icon: HardDrive, color: 'text-purple-600 bg-purple-100' },
  { name: 'SSL Status', icon: Shield, color: 'text-orange-600 bg-orange-100' },
];

export function Dashboard() {
  const { data: serverStatus, isLoading: serverLoading } = useServerStatus();
  const { data: health } = useHealthCheck();
  const { data: ftpUsers } = useFTPUsers();
  const { data: sslCerts } = useSSLCertificates();

  const activeUsers = ftpUsers?.filter(u => u.is_active).length || 0;
  const totalUsers = ftpUsers?.length || 0;
  const activeCerts = sslCerts?.filter(c => c.is_active).length || 0;
  const expiringCerts = sslCerts?.filter(c => {
    if (!c.expires_at) return false;
    const days = Math.ceil((new Date(c.expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return days <= 30 && days > 0;
  }).length || 0;
  const expiredCerts = sslCerts?.filter(c => {
    if (!c.expires_at) return false;
    return new Date(c.expires_at) < new Date();
  }).length || 0;

  const getStatusIcon = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'active':
      case 'running':
      case 'healthy':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'inactive':
      case 'stopped':
      case 'unhealthy':
        return <XCircle className="w-5 h-5 text-red-500" />;
      default:
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'active':
      case 'running':
      case 'healthy':
        return <Badge variant="success">{status}</Badge>;
      case 'inactive':
      case 'stopped':
      case 'unhealthy':
        return <Badge variant="danger">{status}</Badge>;
      default:
        return <Badge variant="warning">{status || 'Unknown'}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500">Overview of your FTP server infrastructure</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat, index) => (
          <Card key={stat.name} className="hover:shadow-md transition-shadow">
            <CardBody className="flex items-center gap-4">
              <div className={cn('p-3 rounded-xl', stat.color)}>
                <stat.icon className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm text-gray-500">{stat.name}</p>
                {index === 0 && (
                  <>
                    {getStatusIcon(serverStatus?.status)}
                    <p className="text-lg font-semibold text-gray-900">
                      {getStatusBadge(serverStatus?.status)}
                    </p>
                  </>
                )}
                {index === 1 && (
                  <>
                    {getStatusIcon(health?.database)}
                    <p className="text-lg font-semibold text-gray-900">
                      {getStatusBadge(health?.database || 'unknown')}
                    </p>
                  </>
                )}
                {index === 2 && (
                  <p className="text-lg font-semibold text-gray-900">
                    {activeUsers}/{totalUsers} Users
                  </p>
                )}
                {index === 3 && (
                  <>
                    {activeCerts > 0 ? (
                      <CheckCircle className="w-5 h-5 text-green-500" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-500" />
                    )}
                    <p className="text-lg font-semibold text-gray-900">
                      {activeCerts} Active
                      {expiringCerts > 0 && <span className="text-orange-600 ml-1">({expiringCerts} expiring)</span>}
                      {expiredCerts > 0 && <span className="text-red-600 ml-1">({expiredCerts} expired)</span>}
                    </p>
                  </>
                )}
              </div>
            </CardBody>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold text-gray-900">Server Status</h2>
          </CardHeader>
          <CardBody>
            {serverLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-8 bg-gray-200 rounded animate-pulse" />
                ))}
              </div>
            ) : serverStatus ? (
              <dl className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <dt className="text-sm text-gray-500">Status</dt>
                    <dd className="mt-1">{getStatusBadge(serverStatus.status)}</dd>
                  </div>
                  <div>
                    <dt className="text-sm text-gray-500">Version</dt>
                    <dd className="mt-1 font-mono text-sm">{serverStatus.version}</dd>
                  </div>
                  <div>
                    <dt className="text-sm text-gray-500">Connections</dt>
                    <dd className="mt-1 font-semibold">{serverStatus.connections}</dd>
                  </div>
                  <div>
                    <dt className="text-sm text-gray-500">Uptime</dt>
                    <dd className="mt-1 font-mono text-sm">{serverStatus.uptime || 'N/A'}</dd>
                  </div>
                </div>
              </dl>
            ) : (
              <p className="text-gray-500">Unable to load server status</p>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold text-gray-900">Quick Actions</h2>
          </CardHeader>
          <CardBody>
            <div className="grid grid-cols-2 gap-3">
              <button className="p-4 border border-gray-200 rounded-lg hover:border-primary-300 hover:bg-primary-50 transition-colors text-left">
                <Users className="w-6 h-6 text-primary-600 mb-2" />
                <p className="font-medium text-gray-900">Manage FTP Users</p>
                <p className="text-sm text-gray-500">{totalUsers} configured</p>
              </button>
              <button className="p-4 border border-gray-200 rounded-lg hover:border-primary-300 hover:bg-primary-50 transition-colors text-left">
                <Shield className="w-6 h-6 text-primary-600 mb-2" />
                <p className="font-medium text-gray-900">SSL Certificates</p>
                <p className="text-sm text-gray-500">{activeCerts} active</p>
              </button>
              <button className="p-4 border border-gray-200 rounded-lg hover:border-primary-300 hover:bg-primary-50 transition-colors text-left">
                <HardDrive className="w-6 h-6 text-primary-600 mb-2" />
                <p className="font-medium text-gray-900">File Manager</p>
                <p className="text-sm text-gray-500">Browse files</p>
              </button>
              <button className="p-4 border border-gray-200 rounded-lg hover:border-primary-300 hover:bg-primary-50 transition-colors text-left">
                <Server className="w-6 h-6 text-primary-600 mb-2" />
                <p className="font-medium text-gray-900">Server Config</p>
                <p className="text-sm text-gray-500">Configure vsftpd</p>
              </button>
            </div>
          </CardBody>
        </Card>
      </div>

      {expiringCerts > 0 && (
        <Card className="border-orange-200">
          <CardHeader className="bg-orange-50">
            <h2 className="text-lg font-semibold text-orange-800 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              SSL Certificates Expiring Soon
            </h2>
          </CardHeader>
          <CardBody>
            <p className="text-orange-700">
              {expiringCerts} certificate(s) will expire within 30 days. Consider renewing them to avoid service disruption.
            </p>
          </CardBody>
        </Card>
      )}
    </div>
  );
}