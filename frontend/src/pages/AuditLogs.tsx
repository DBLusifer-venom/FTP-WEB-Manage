import React, { useState } from 'react';
import { useAuditLogs } from '../hooks/useApi';
import { Search, Filter, Download, ChevronLeft, ChevronRight, Eye, FileText } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { Table, Pagination } from '../components/ui/Table';
import { Badge } from '../components/ui/Card';
import { cn, formatDate } from '../utils/helpers';
import { AuditLog } from '../types';

const actionColors: Record<string, string> = {
  create: 'bg-blue-100 text-blue-800',
  update: 'bg-yellow-100 text-yellow-800',
  delete: 'bg-red-100 text-red-800',
  login: 'bg-green-100 text-green-800',
  logout: 'bg-gray-100 text-gray-800',
  enable: 'bg-green-100 text-green-800',
  disable: 'bg-red-100 text-red-800',
  config_change: 'bg-purple-100 text-purple-800',
  ssl_install: 'bg-indigo-100 text-indigo-800',
  ssl_renew: 'bg-blue-100 text-blue-800',
};

export function AuditLogs() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [showDetail, setShowDetail] = useState<AuditLog | null>(null);

  const { data: auditData, isLoading } = useAuditLogs(page, pageSize);
  const logs = auditData?.items || [];
  const totalItems = auditData?.total || 0;
  const totalPages = Math.ceil(totalItems / pageSize);

  const uniqueActions = [...new Set(logs.map(l => l.action))].sort();

  const getActionBadge = (action: string) => (
    <Badge variant="gray" className={actionColors[action] || 'bg-gray-100 text-gray-800'}>
      {action.replace('_', ' ')}
    </Badge>
  );

  const columns = [
    { key: 'created_at', header: 'Timestamp', render: (l: AuditLog) => formatDate(l.created_at) },
    { key: 'action', header: 'Action', render: getActionBadge },
    { key: 'resource_type', header: 'Resource', render: (l: AuditLog) => l.resource_type || '-' },
    { key: 'resource_id', header: 'Resource ID', render: (l: AuditLog) => l.resource_id || '-' },
    { key: 'user_id', header: 'User ID', render: (l: AuditLog) => l.user_id ? `#${l.user_id}` : 'System' },
    { key: 'ip_address', header: 'IP Address', render: (l: AuditLog) => l.ip_address || '-' },
    { key: 'details', header: 'Details', render: (l: AuditLog) => (
      <span className="max-w-xs truncate block" title={l.details || ''}>{l.details || '-'}</span>
    )},
  ];

  const handleViewDetails = (log: AuditLog) => {
    setShowDetail(log);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Audit Logs</h1>
          <p className="text-gray-500">Track all administrative actions and system events</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary">
            <Download className="w-4 h-4 mr-1" />
            Export
          </Button>
        </div>
      </div>

      <div className="card">
        <div className="p-4 border-b border-gray-200 flex flex-col sm:flex-row gap-4">
          <Input
            placeholder="Search logs..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            leftIcon={<Search className="w-4 h-4" />}
            className="flex-1 max-w-md"
          />
          <Select
            value={actionFilter}
            onChange={e => setActionFilter(e.target.value)}
            options={[
              { value: '', label: 'All Actions' },
              ...uniqueActions.map(a => ({ value: a, label: a.replace('_', ' ') })),
            ]}
            className="w-48"
          />
        </div>
        <Table
          columns={columns}
          data={logs}
          keyExtractor={l => l.id.toString()}
          loading={isLoading}
          emptyMessage="No audit logs found"
          onRowClick={handleViewDetails}
        />
        <Pagination
          currentPage={page}
          totalPages={totalPages}
          totalItems={totalItems}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
        />
      </div>

      <Modal isOpen={!!showDetail} onClose={() => setShowDetail(null)} title="Log Details" size="lg">
        {showDetail && (
          <div className="space-y-4">
            <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <dt className="text-sm text-gray-500">Timestamp</dt>
                <dd className="mt-1 font-mono text-sm">{formatDate(showDetail.created_at)}</dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500">Action</dt>
                <dd className="mt-1">{getActionBadge(showDetail.action)}</dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500">Resource Type</dt>
                <dd className="mt-1 font-mono text-sm">{showDetail.resource_type || '-'}</dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500">Resource ID</dt>
                <dd className="mt-1 font-mono text-sm">{showDetail.resource_id || '-'}</dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500">User ID</dt>
                <dd className="mt-1 font-mono text-sm">{showDetail.user_id ? `#${showDetail.user_id}` : 'System'}</dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500">IP Address</dt>
                <dd className="mt-1 font-mono text-sm">{showDetail.ip_address || '-'}</dd>
              </div>
              <div className="md:col-span-2">
                <dt className="text-sm text-gray-500">User Agent</dt>
                <dd className="mt-1 font-mono text-xs text-gray-600 break-all">{showDetail.user_agent || '-'}</dd>
              </div>
              <div className="md:col-span-2">
                <dt className="text-sm text-gray-500">Details</dt>
                <dd className="mt-1 p-3 bg-gray-50 rounded-lg font-mono text-sm whitespace-pre-wrap">{showDetail.details || 'No details'}</dd>
              </div>
            </dl>
            <div className="flex justify-end border-t pt-4">
              <Button variant="secondary" onClick={() => setShowDetail(null)}>Close</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}