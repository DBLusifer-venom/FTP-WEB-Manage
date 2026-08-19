import React, { useState } from 'react';
import { useSSLCertificates, useCreateSSLCertificate, useUpdateSSLCertificate, useDeleteSSLCertificate, useGenerateSelfSignedCert, useCreateCSR, useInstallCertificate, useRenewLetsEncrypt } from '../hooks/useApi';
import { Plus, Edit, Delete, Shield, Key, Download, Upload, AlertTriangle, CheckCircle, XCircle, RefreshCw } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { Table, Pagination } from '../components/ui/Table';
import { Badge } from '../components/ui/Card';
import { cn, formatDate } from '../utils/helpers';
import { SSLCertificate, SSLCertificateCreate, SSLCertificateUpdate } from '../types';

export function SSLCertificates() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showGenModal, setShowGenModal] = useState(false);
  const [showCSRModal, setShowCSRModal] = useState(false);
  const [showInstallModal, setShowInstallModal] = useState(false);
  const [editingCert, setEditingCert] = useState<SSLCertificate | null>(null);
  const [genType, setGenType] = useState<'selfsigned' | 'csr'>('selfsigned');
  const [genDomain, setGenDomain] = useState('');
  const [genName, setGenName] = useState('');
  const [installCert, setInstallCert] = useState('');
  const [installKey, setInstallKey] = useState('');
  const [installChain, setInstallChain] = useState('');
  const [formData, setFormData] = useState<SSLCertificateCreate>({
    name: '',
    domain: '',
    cert_path: '',
    key_path: '',
    chain_path: '',
    auto_renew: false,
  });

  const { data: certs, isLoading } = useSSLCertificates();
  const createMutation = useCreateSSLCertificate();
  const updateMutation = useUpdateSSLCertificate();
  const deleteMutation = useDeleteSSLCertificate();
  const genSelfSigned = useGenerateSelfSignedCert();
  const genCSR = useCreateCSR();
  const installMutation = useInstallCertificate();
  const renewMutation = useRenewLetsEncrypt();

  const filteredCerts = certs?.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.domain.toLowerCase().includes(search.toLowerCase())
  ) || [];

  const totalPages = Math.ceil(filteredCerts.length / pageSize);
  const paginatedCerts = filteredCerts.slice((page - 1) * pageSize, page * pageSize);

  const getDaysUntilExpiry = (expiresAt: string | null) => {
    if (!expiresAt) return null;
    const diff = new Date(expiresAt).getTime() - Date.now();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  const getStatusBadge = (cert: SSLCertificate) => {
    if (!cert.is_active) return <Badge variant="gray">Inactive</Badge>;
    const days = getDaysUntilExpiry(cert.expires_at);
    if (days === null) return <Badge variant="info">No Expiry</Badge>;
    if (days < 0) return <Badge variant="danger">Expired</Badge>;
    if (days <= 30) return <Badge variant="warning">Expires in {days}d</Badge>;
    return <Badge variant="success">Valid ({days}d)</Badge>;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingCert) {
        await updateMutation.mutateAsync({ id: editingCert.id, data: formData });
      } else {
        await createMutation.mutateAsync(formData);
      }
      setShowModal(false);
      resetForm();
    } catch (error) {
      console.error('Error saving certificate:', error);
    }
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (genType === 'selfsigned') {
        const result = await genSelfSigned.mutateAsync({ domain: genDomain, name: genName });
        setFormData({...formData, cert_path: result.cert_path, key_path: result.key_path, name: genName, domain: genDomain });
      } else {
        const result = await genCSR.mutateAsync({ domain: genDomain, name: genName });
        setFormData({...formData, cert_path: result.csr_path, key_path: result.key_path, name: genName, domain: genDomain });
      }
      setShowGenModal(false);
    } catch (error) {
      console.error('Error generating:', error);
    }
  };

  const handleInstall = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await installMutation.mutateAsync({ certPath: installCert, keyPath: installKey, chainPath: installChain || undefined });
      setShowInstallModal(false);
      setInstallCert(''); setInstallKey(''); setInstallChain('');
    } catch (error) {
      console.error('Error installing certificate:', error);
    }
  };

  const handleEdit = (cert: SSLCertificate) => {
    setEditingCert(cert);
    setFormData({
      name: cert.name,
      domain: cert.domain,
      cert_path: cert.cert_path,
      key_path: cert.key_path,
      chain_path: cert.chain_path || '',
      auto_renew: cert.auto_renew,
    });
    setShowModal(true);
  };

  const handleDelete = async (id: number) => {
    if (confirm('Are you sure you want to delete this certificate?')) {
      await deleteMutation.mutateAsync(id);
    }
  };

  const handleRenew = async (domain: string, email: string) => {
    if (confirm(`Renew Let's Encrypt certificate for ${domain}?`)) {
      await renewMutation.mutateAsync({ domain, email });
    }
  };

  const resetForm = () => {
    setEditingCert(null);
    setFormData({ name: '', domain: '', cert_path: '', key_path: '', chain_path: '', auto_renew: false });
  };

  const columns = [
    { key: 'name', header: 'Name', render: (c: SSLCertificate) => <span className="font-medium">{c.name}</span> },
    { key: 'domain', header: 'Domain', render: (c: SSLCertificate) => <span className="font-mono text-sm">{c.domain}</span> },
    { key: 'issuer', header: 'Issuer', render: (c: SSLCertificate) => c.issuer || 'Self-signed' },
    { key: 'expires_at', header: 'Expires', render: (c: SSLCertificate) => c.expires_at ? formatDate(c.expires_at) : 'Never' },
    { key: 'status', header: 'Status', render: getStatusBadge },
    { key: 'auto_renew', header: 'Auto Renew', render: (c: SSLCertificate) => c.auto_renew ? <CheckCircle className="w-4 h-4 text-green-500 mx-auto" /> : <XCircle className="w-4 h-4 text-gray-400 mx-auto" /> },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">SSL Certificates</h1>
          <p className="text-gray-500">Manage SSL/TLS certificates for secure FTP connections</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => { setGenType('selfsigned'); setShowGenModal(true); }}>
            <Shield className="w-4 h-4 mr-1" />
            Generate Self-Signed
          </Button>
          <Button variant="secondary" onClick={() => { setGenType('csr'); setShowGenModal(true); }}>
            <Key className="w-4 h-4 mr-1" />
            Create CSR
          </Button>
          <Button onClick={() => { resetForm(); setShowModal(true); }}>
            <Plus className="w-4 h-4 mr-1" />
            Add Certificate
          </Button>
        </div>
      </div>

      <div className="card">
        <Table
          columns={columns}
          data={paginatedCerts}
          keyExtractor={c => c.id.toString()}
          loading={isLoading}
          emptyMessage="No certificates found"
        />
        <Pagination
          currentPage={page}
          totalPages={totalPages}
          totalItems={filteredCerts.length}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
        />
      </div>

      <Modal isOpen={showModal} onClose={() => { setShowModal(false); resetForm(); }} title={editingCert ? 'Edit Certificate' : 'Add Certificate'} size="lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input label="Name" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required />
            <Input label="Domain" value={formData.domain} onChange={e => setFormData({...formData, domain: e.target.value})} required />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input label="Certificate Path" value={formData.cert_path} onChange={e => setFormData({...formData, cert_path: e.target.value})} required />
            <Input label="Private Key Path" value={formData.key_path} onChange={e => setFormData({...formData, key_path: e.target.value})} required />
          </div>
          <Input label="Chain Path (optional)" value={formData.chain_path} onChange={e => setFormData({...formData, chain_path: e.target.value})} />
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={formData.auto_renew} onChange={e => setFormData({...formData, auto_renew: e.target.checked})} className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500" />
            <span className="text-sm text-gray-700">Auto Renew (Let's Encrypt)</span>
          </label>
          <div className="flex justify-end gap-3 border-t pt-4">
            <Button type="button" variant="secondary" onClick={() => { setShowModal(false); resetForm(); }}>Cancel</Button>
            <Button type="submit" loading={createMutation.isPending || updateMutation.isPending}>
              {editingCert ? 'Update' : 'Create'}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={showGenModal} onClose={() => { setShowGenModal(false); setGenDomain(''); setGenName(''); }} title={genType === 'selfsigned' ? 'Generate Self-Signed Certificate' : 'Create Certificate Signing Request'}>
        <form onSubmit={handleGenerate} className="space-y-4">
          <Input label="Certificate Name" value={genName} onChange={e => setGenName(e.target.value)} placeholder="e.g., ftp-server" required />
          <Input label="Domain" value={genDomain} onChange={e => setGenDomain(e.target.value)} placeholder="e.g., ftp.example.com" required />
          <p className="text-sm text-gray-500">
            {genType === 'selfsigned' 
              ? 'This will generate a self-signed certificate valid for 1 year. Browsers will show a warning.'
              : 'This will create a CSR and private key. Submit the CSR to a CA to get a signed certificate.'
            }
          </p>
          <div className="flex justify-end gap-3 border-t pt-4">
            <Button type="button" variant="secondary" onClick={() => { setShowGenModal(false); setGenDomain(''); setGenName(''); }}>Cancel</Button>
            <Button type="submit" loading={genSelfSigned.isPending || genCSR.isPending}>
              {genType === 'selfsigned' ? 'Generate' : 'Create CSR'}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={showInstallModal} onClose={() => { setShowInstallModal(false); setInstallCert(''); setInstallKey(''); setInstallChain(''); }} title="Install Certificate" size="lg">
        <form onSubmit={handleInstall} className="space-y-4">
          <div className="space-y-4">
            <div>
              <label className="label">Certificate (PEM)</label>
              <textarea
                value={installCert}
                onChange={e => setInstallCert(e.target.value)}
                rows={8}
                className="input font-mono text-sm"
                placeholder="-----BEGIN CERTIFICATE-----..."
                required
              />
            </div>
            <div>
              <label className="label">Private Key (PEM)</label>
              <textarea
                value={installKey}
                onChange={e => setInstallKey(e.target.value)}
                rows={8}
                className="input font-mono text-sm"
                placeholder="-----BEGIN PRIVATE KEY-----..."
                required
              />
            </div>
            <div>
              <label className="label">Chain/Intermediate (PEM, optional)</label>
              <textarea
                value={installChain}
                onChange={e => setInstallChain(e.target.value)}
                rows={4}
                className="input font-mono text-sm"
                placeholder="-----BEGIN CERTIFICATE-----..."
              />
            </div>
          </div>
          <div className="flex justify-end gap-3 border-t pt-4">
            <Button type="button" variant="secondary" onClick={() => { setShowInstallModal(false); setInstallCert(''); setInstallKey(''); setInstallChain(''); }}>Cancel</Button>
            <Button type="submit" loading={installMutation.isPending}>Install</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}