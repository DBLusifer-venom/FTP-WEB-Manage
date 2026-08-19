import React, { useState, useEffect } from 'react';
import { useServerConfig, useSSLConfig, useUpdateServerConfig, useValidateConfig, useEnableSSL, useDisableSSL, useSetPassivePorts, useSetLimits, useReloadServer, useRestartServer, useServerStatus } from '../hooks/useApi';
import { Save, RefreshCw, Play, Pause, Shield, CheckCircle, XCircle, AlertTriangle, Settings, Server, HardDrive, Network, Lock } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Switch } from '../components/ui/Switch';
import { Modal } from '../components/ui/Modal';
import { Card, CardHeader, CardBody } from '../components/ui/Card';
import { Badge } from '../components/ui/Card';
import { cn, getStatusBadge } from '../utils/helpers';

const configSections = [
  { key: 'general', label: 'General', icon: Settings },
  { key: 'ssl', label: 'SSL/TLS', icon: Lock },
  { key: 'network', label: 'Network', icon: Network },
  { key: 'limits', label: 'Limits', icon: HardDrive },
];

const generalKeys = [
  { key: 'listen', label: 'Listen on IPv4', type: 'boolean' },
  { key: 'listen_ipv6', label: 'Listen on IPv6', type: 'boolean' },
  { key: 'anonymous_enable', label: 'Anonymous Enable', type: 'boolean' },
  { key: 'local_enable', label: 'Local Users Enable', type: 'boolean' },
  { key: 'write_enable', label: 'Write Enable', type: 'boolean' },
  { key: 'local_umask', label: 'Local Umask', type: 'text' },
  { key: 'dirmessage_enable', label: 'Directory Messages', type: 'boolean' },
  { key: 'xferlog_enable', label: 'Transfer Log Enable', type: 'boolean' },
  { key: 'connect_from_port_20', label: 'Connect from Port 20', type: 'boolean' },
  { key: 'xferlog_std_format', label: 'Standard Log Format', type: 'boolean' },
  { key: 'idle_session_timeout', label: 'Idle Session Timeout (s)', type: 'number' },
  { key: 'data_connection_timeout', label: 'Data Connection Timeout (s)', type: 'number' },
  { key: 'ftpd_banner', label: 'FTP Banner', type: 'text' },
];

const sslKeys = [
  { key: 'ssl_enable', label: 'SSL Enable', type: 'boolean' },
  { key: 'allow_anon_ssl', label: 'Allow Anonymous SSL', type: 'boolean' },
  { key: 'force_local_data_ssl', label: 'Force Local Data SSL', type: 'boolean' },
  { key: 'force_local_logins_ssl', label: 'Force Local Logins SSL', type: 'boolean' },
  { key: 'ssl_tlsv1', label: 'TLS v1', type: 'boolean' },
  { key: 'ssl_sslv2', label: 'SSL v2', type: 'boolean' },
  { key: 'ssl_sslv3', label: 'SSL v3', type: 'boolean' },
  { key: 'require_ssl_reuse', label: 'Require SSL Reuse', type: 'boolean' },
  { key: 'ssl_ciphers', label: 'SSL Ciphers', type: 'text' },
  { key: 'rsa_cert_file', label: 'RSA Certificate File', type: 'text' },
  { key: 'rsa_private_key_file', label: 'RSA Private Key File', type: 'text' },
];

const networkKeys = [
  { key: 'pasv_enable', label: 'Passive Mode Enable', type: 'boolean' },
  { key: 'pasv_min_port', label: 'Passive Min Port', type: 'number' },
  { key: 'pasv_max_port', label: 'Passive Max Port', type: 'number' },
  { key: 'pasv_address', label: 'Passive Address (external IP)', type: 'text' },
  { key: 'port_enable', label: 'Active Mode Enable', type: 'boolean' },
  { key: 'connect_from_port_20', label: 'Connect from Port 20', type: 'boolean' },
];

const limitKeys = [
  { key: 'max_clients', label: 'Max Clients', type: 'number' },
  { key: 'max_per_ip', label: 'Max Per IP', type: 'number' },
  { key: 'local_max_rate', label: 'Local Max Rate (KB/s, 0=unlimited)', type: 'number' },
  { key: 'max_per_ip', label: 'Max Connections Per IP', type: 'number' },
];

export function ServerConfig() {
  const [activeTab, setActiveTab] = useState('general');
  const [config, setConfig] = useState<Record<string, string>>({});
  const [sslConfig, setSslConfig] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [validating, setValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<{ valid: boolean; message: string } | null>(null);
  const [showSSLModal, setShowSSLModal] = useState(false);
  const [sslCertPath, setSslCertPath] = useState('');
  const [sslKeyPath, setSslKeyPath] = useState('');
  const [passiveMin, setPassiveMin] = useState(40000);
  const [passiveMax, setPassiveMax] = useState(50000);
  const [passiveAddr, setPassiveAddr] = useState('');
  const [maxClients, setMaxClients] = useState(100);
  const [maxPerIp, setMaxPerIp] = useState(10);
  const [localMaxRate, setLocalMaxRate] = useState(0);

  const { data: serverStatus } = useServerStatus();
  const { data: serverConfig, refetch: refetchConfig } = useServerConfig();
  const { data: sslConfigData, refetch: refetchSSL } = useSSLConfig();
  const updateConfigMutation = useUpdateServerConfig();
  const validateMutation = useValidateConfig();
  const enableSSLMutation = useEnableSSL();
  const disableSSLMutation = useDisableSSL();
  const setPassiveMutation = useSetPassivePorts();
  const setLimitsMutation = useSetLimits();
  const reloadMutation = useReloadServer();
  const restartMutation = useRestartServer();

  useEffect(() => {
    if (serverConfig) setConfig(serverConfig);
  }, [serverConfig]);

  useEffect(() => {
    if (sslConfigData) setSslConfig(sslConfigData);
  }, [sslConfigData]);

  const handleConfigChange = (key: string, value: string) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  };

  const handleSSLConfigChange = (key: string, value: string) => {
    setSslConfig(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateConfigMutation.mutateAsync(config);
      await refetchConfig();
      setValidationResult({ valid: true, message: 'Configuration saved successfully' });
    } catch (error) {
      setValidationResult({ valid: false, message: 'Failed to save configuration' });
    } finally {
      setSaving(false);
    }
  };

  const handleValidate = async () => {
    setValidating(true);
    try {
      const result = await validateMutation.mutateAsync();
      setValidationResult(result);
    } catch (error) {
      setValidationResult({ valid: false, message: 'Validation failed' });
    } finally {
      setValidating(false);
    }
  };

  const handleEnableSSL = async () => {
    try {
      await enableSSLMutation.mutateAsync({ certPath: sslCertPath, keyPath: sslKeyPath });
      setShowSSLModal(false);
      await refetchSSL();
      setValidationResult({ valid: true, message: 'SSL enabled successfully' });
    } catch (error) {
      setValidationResult({ valid: false, message: 'Failed to enable SSL' });
    }
  };

  const handleDisableSSL = async () => {
    try {
      await disableSSLMutation.mutateAsync();
      await refetchSSL();
      setValidationResult({ valid: true, message: 'SSL disabled successfully' });
    } catch (error) {
      setValidationResult({ valid: false, message: 'Failed to disable SSL' });
    }
  };

  const handleSetPassive = async () => {
    try {
      await setPassiveMutation.mutateAsync({ minPort: passiveMin, maxPort: passiveMax, address: passiveAddr });
      setValidationResult({ valid: true, message: 'Passive ports updated' });
    } catch (error) {
      setValidationResult({ valid: false, message: 'Failed to update passive ports' });
    }
  };

  const handleSetLimits = async () => {
    try {
      await setLimitsMutation.mutateAsync({ maxClients, maxPerIp, localMaxRate });
      setValidationResult({ valid: true, message: 'Limits updated' });
    } catch (error) {
      setValidationResult({ valid: false, message: 'Failed to update limits' });
    }
  };

  const handleReload = async () => {
    try {
      await reloadMutation.mutateAsync();
      setValidationResult({ valid: true, message: 'Server reloaded' });
    } catch (error) {
      setValidationResult({ valid: false, message: 'Failed to reload server' });
    }
  };

  const handleRestart = async () => {
    if (confirm('Are you sure you want to restart the FTP server? This will disconnect all clients.')) {
      try {
        await restartMutation.mutateAsync();
        setValidationResult({ valid: true, message: 'Server restarted' });
      } catch (error) {
        setValidationResult({ valid: false, message: 'Failed to restart server' });
      }
    }
  };

  const renderConfigSection = (keys: typeof generalKeys, configObj: Record<string, string>, onChange: (key: string, value: string) => void) => (
    <div className="space-y-4">
      {keys.map(({ key, label, type }) => (
        <div key={key} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
          <div className="flex items-center gap-3 min-w-[250px]">
            <label className="text-sm font-medium text-gray-700 w-64">{label}</label>
            {type === 'boolean' && (
              <Switch
                checked={configObj[key] === 'YES'}
                onChange={e => onChange(key, e.target.checked ? 'YES' : 'NO')}
              />
            )}
            {type === 'number' && (
              <Input
                type="number"
                value={configObj[key] || ''}
                onChange={e => onChange(key, e.target.value)}
                className="w-32"
              />
            )}
            {type === 'text' && (
              <Input
                value={configObj[key] || ''}
                onChange={e => onChange(key, e.target.value)}
                className="w-80"
              />
            )}
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Server Configuration</h1>
          <p className="text-gray-500">Configure vsftpd server settings</p>
        </div>
        <div className="flex items-center gap-3">
          <span className={cn('px-3 py-1 rounded-full text-sm font-medium', serverStatus?.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800')}>
            {serverStatus?.status === 'active' ? <CheckCircle className="w-4 h-4 inline mr-1" /> : <XCircle className="w-4 h-4 inline mr-1" />}
            {serverStatus?.status || 'Unknown'}
          </span>
          <Button variant="secondary" onClick={handleReload} loading={reloadMutation.isPending}>
            <RefreshCw className="w-4 h-4 mr-1" /> Reload
          </Button>
          <Button variant="secondary" onClick={handleRestart} loading={restartMutation.isPending}>
            <Play className="w-4 h-4 mr-1" /> Restart
          </Button>
        </div>
      </div>

      {validationResult && (
        <div className={cn('p-4 rounded-lg', validationResult.valid ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200')}>
          {validationResult.message}
        </div>
      )}

      <div className="card">
        <div className="border-b border-gray-200">
          <nav className="flex gap-4 p-4" aria-label="Configuration sections">
            {configSections.map(section => (
              <button
                key={section.key}
                onClick={() => setActiveTab(section.key)}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                  activeTab === section.key
                    ? 'bg-primary-50 text-primary-700'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                )}
              >
                <section.icon className="w-4 h-4" />
                {section.label}
              </button>
            ))}
          </nav>
        </div>
        <div className="p-6">
          {activeTab === 'general' && (
            <Card>
              <CardHeader><h3 className="font-semibold">General Settings</h3></CardHeader>
              <CardBody>{renderConfigSection(generalKeys, config, handleConfigChange)}</CardBody>
            </Card>
          )}
          {activeTab === 'ssl' && (
            <Card>
              <CardHeader><h3 className="font-semibold">SSL/TLS Settings</h3></CardHeader>
              <CardBody>
                <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">SSL Status</p>
                      <p className="text-sm text-gray-500">Configure SSL/TLS for secure FTP connections</p>
                    </div>
                    {sslConfig.ssl_enable === 'YES' ? (
                      <Button variant="danger" onClick={handleDisableSSL} loading={disableSSLMutation.isPending}>
                        <XCircle className="w-4 h-4 mr-1" /> Disable SSL
                      </Button>
                    ) : (
                      <Button variant="primary" onClick={() => setShowSSLModal(true)}>
                        <Shield className="w-4 h-4 mr-1" /> Enable SSL
                      </Button>
                    )}
                  </div>
                </div>
                {renderConfigSection(sslKeys, sslConfig, handleSSLConfigChange)}
              </CardBody>
            </Card>
          )}
          {activeTab === 'network' && (
            <Card>
              <CardHeader><h3 className="font-semibold">Network Settings</h3></CardHeader>
              <CardBody>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <Input label="Passive Min Port" type="number" value={passiveMin} onChange={e => setPassiveMin(Number(e.target.value))} />
                  <Input label="Passive Max Port" type="number" value={passiveMax} onChange={e => setPassiveMax(Number(e.target.value))} />
                  <Input label="Passive Address (External IP)" value={passiveAddr} onChange={e => setPassiveAddr(e.target.value)} placeholder="e.g., 203.0.113.10" />
                </div>
                <Button onClick={handleSetPassive} loading={setPassiveMutation.isPending}>
                  <Save className="w-4 h-4 mr-1" /> Save Passive Settings
                </Button>
                <div className="mt-6 pt-6 border-t">
                  {renderConfigSection(networkKeys.filter(k => k.key !== 'pasv_min_port' && k.key !== 'pasv_max_port' && k.key !== 'pasv_address'), config, handleConfigChange)}
                </div>
              </CardBody>
            </Card>
          )}
          {activeTab === 'limits' && (
            <Card>
              <CardHeader><h3 className="font-semibold">Connection Limits</h3></CardHeader>
              <CardBody>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <Input label="Max Clients" type="number" value={maxClients} onChange={e => setMaxClients(Number(e.target.value))} />
                  <Input label="Max Per IP" type="number" value={maxPerIp} onChange={e => setMaxPerIp(Number(e.target.value))} />
                  <Input label="Local Max Rate (KB/s)" type="number" value={localMaxRate} onChange={e => setLocalMaxRate(Number(e.target.value))} />
                </div>
                <Button onClick={handleSetLimits} loading={setLimitsMutation.isPending}>
                  <Save className="w-4 h-4 mr-1" /> Save Limits
                </Button>
                <div className="mt-6 pt-6 border-t">
                  {renderConfigSection(limitKeys.filter(k => k.key !== 'max_clients' && k.key !== 'max_per_ip' && k.key !== 'local_max_rate'), config, handleConfigChange)}
                </div>
              </CardBody>
            </Card>
          )}
        </div>
        <div className="p-4 border-t border-gray-200 flex justify-end gap-3">
          <Button variant="secondary" onClick={handleValidate} loading={validating}>
            <Shield className="w-4 h-4 mr-1" /> Validate Config
          </Button>
          <Button onClick={handleSave} loading={saving}>
            <Save className="w-4 h-4 mr-1" /> Save All Changes
          </Button>
        </div>
      </div>

      <Modal isOpen={showSSLModal} onClose={() => setShowSSLModal(false)} title="Enable SSL/TLS" size="lg">
        <div className="space-y-4">
          <p className="text-gray-600">Provide paths to your SSL certificate and private key files to enable FTPS.</p>
          <Input label="Certificate Path" value={sslCertPath} onChange={e => setSslCertPath(e.target.value)} placeholder="/etc/ssl/certs/vsftpd.pem" required />
          <Input label="Private Key Path" value={sslKeyPath} onChange={e => setSslKeyPath(e.target.value)} placeholder="/etc/ssl/private/vsftpd.key" required />
          <div className="flex justify-end gap-3 border-t pt-4">
            <Button variant="secondary" onClick={() => setShowSSLModal(false)}>Cancel</Button>
            <Button onClick={handleEnableSSL} loading={enableSSLMutation.isPending}>Enable SSL</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}