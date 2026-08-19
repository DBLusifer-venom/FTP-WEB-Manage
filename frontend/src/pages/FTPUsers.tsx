import React, { useState } from 'react';
import { useFTPUsers, useCreateFTPUser, useUpdateFTPUser, useDeleteFTPUser, useToggleFTPUserStatus } from '../hooks/useApi';
import { Plus, Edit, Delete, ToggleLeft, ToggleRight, Search, Eye, User, Shield, Lock } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { Table, Pagination } from '../components/ui/Table';
import { Badge } from '../components/ui/Card';
import { cn, getRoleLabel, getRoleColor } from '../utils/helpers';
import { FTPUser, FTPUserCreate, FTPUserUpdate } from '../types';

const permissionOptions = [
  { value: 'read_only', label: 'Read Only' },
  { value: 'read_write', label: 'Read / Write' },
  { value: 'admin', label: 'Admin' },
];

export function FTPUsers() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<FTPUser | null>(null);
  const [formData, setFormData] = useState<FTPUserCreate>({
    username: '',
    password: '',
    home_directory: '/home/ftp/',
    permission: 'read_only',
    uid: undefined,
    gid: undefined,
    max_files: 0,
    max_size: 0,
    ratio_upload: 0,
    ratio_download: 0,
    bandwidth_up: 0,
    bandwidth_down: 0,
  });

  const { data: ftpUsers, isLoading } = useFTPUsers();
  const createMutation = useCreateFTPUser();
  const updateMutation = useUpdateFTPUser();
  const deleteMutation = useDeleteFTPUser();
  const toggleMutation = useToggleFTPUserStatus();

  const filteredUsers = ftpUsers?.filter(u => 
    u.username.toLowerCase().includes(search.toLowerCase())
  ) || [];

  const totalPages = Math.ceil(filteredUsers.length / pageSize);
  const paginatedUsers = filteredUsers.slice((page - 1) * pageSize, page * pageSize);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingUser) {
        await updateMutation.mutateAsync({ id: editingUser.id, data: formData });
      } else {
        await createMutation.mutateAsync(formData);
      }
      setShowModal(false);
      resetForm();
    } catch (error) {
      console.error('Error saving FTP user:', error);
    }
  };

  const handleEdit = (user: FTPUser) => {
    setEditingUser(user);
    setFormData({
      username: user.username,
      password: '',
      home_directory: user.home_directory,
      permission: user.permission,
      uid: user.uid || undefined,
      gid: user.gid || undefined,
      max_files: user.max_files,
      max_size: user.max_size,
      ratio_upload: user.ratio_upload,
      ratio_download: user.ratio_download,
      bandwidth_up: user.bandwidth_up,
      bandwidth_down: user.bandwidth_down,
    });
    setShowModal(true);
  };

  const handleDelete = async (id: number) => {
    if (confirm('Are you sure you want to delete this FTP user?')) {
      await deleteMutation.mutateAsync(id);
    }
  };

  const handleToggle = async (id: number) => {
    await toggleMutation.mutateAsync(id);
  };

  const resetForm = () => {
    setEditingUser(null);
    setFormData({
      username: '',
      password: '',
      home_directory: '/home/ftp/',
      permission: 'read_only',
      uid: undefined,
      gid: undefined,
      max_files: 0,
      max_size: 0,
      ratio_upload: 0,
      ratio_download: 0,
      bandwidth_up: 0,
      bandwidth_down: 0,
    });
  };

  const columns = [
    { key: 'username', header: 'Username', render: (u: FTPUser) => <span className="font-mono">{u.username}</span> },
    { key: 'home_directory', header: 'Home Directory', render: (u: FTPUser) => <span className="font-mono text-sm">{u.home_directory}</span> },
    { key: 'permission', header: 'Permission', render: (u: FTPUser) => <Badge variant={getRoleColor(u.permission) as any}>{getRoleLabel(u.permission)}</Badge> },
    { key: 'max_files', header: 'Max Files', render: (u: FTPUser) => u.max_files > 0 ? u.max_files : 'Unlimited' },
    { key: 'bandwidth_up', header: 'BW Up (KB/s)', render: (u: FTPUser) => u.bandwidth_up > 0 ? u.bandwidth_up : 'Unlimited' },
    { key: 'bandwidth_down', header: 'BW Down (KB/s)', render: (u: FTPUser) => u.bandwidth_down > 0 ? u.bandwidth_down : 'Unlimited' },
    { key: 'is_active', header: 'Status', render: (u: FTPUser) => (
      <button
        onClick={() => handleToggle(u.id)}
        disabled={toggleMutation.isPending}
        className={cn('inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors', u.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800')}
      >
        {u.is_active ? <ToggleRight className="w-3 h-3" /> : <ToggleLeft className="w-3 h-3" />}
        {u.is_active ? 'Active' : 'Inactive'}
      </button>
    )},
    { key: 'last_login', header: 'Last Login', render: (u: FTPUser) => u.last_login ? new Date(u.last_login).toLocaleDateString() : 'Never' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">FTP Users</h1>
          <p className="text-gray-500">Manage virtual FTP users and their permissions</p>
        </div>
        <Button onClick={() => { resetForm(); setShowModal(true); }}>
          <Plus className="w-4 h-4 mr-1" />
          Add FTP User
        </Button>
      </div>

      <div className="card">
        <div className="p-4 border-b border-gray-200">
          <Input
            placeholder="Search users..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            leftIcon={<Search className="w-4 h-4" />}
            className="max-w-xs"
          />
        </div>
        <Table
          columns={columns}
          data={paginatedUsers}
          keyExtractor={u => u.id.toString()}
          loading={isLoading}
          emptyMessage="No FTP users found"
          selection={{
            selectedKeys: new Set(),
            onSelectionChange: () => {}
          }}
          renderRowActions={(user: FTPUser) => (
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="sm" onClick={() => handleEdit(user)} aria-label="Edit">
                <Edit className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={() => handleDelete(user.id)} aria-label="Delete" className="text-red-500 hover:text-red-700">
                <Delete className="w-4 h-4" />
              </Button>
            </div>
          )}
        />
        <Pagination
          currentPage={page}
          totalPages={totalPages}
          totalItems={filteredUsers.length}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
        />
      </div>

      <Modal isOpen={showModal} onClose={() => { setShowModal(false); resetForm(); }} title={editingUser ? 'Edit FTP User' : 'Add FTP User'} size="lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input label="Username" value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} disabled={!!editingUser} required />
            <Input label={editingUser ? 'New Password (leave blank to keep current)' : 'Password'} type="password" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} required={!editingUser} />
            <Input label="Home Directory" value={formData.home_directory} onChange={e => setFormData({...formData, home_directory: e.target.value})} required />
            <Select label="Permission" value={formData.permission} onChange={e => setFormData({...formData, permission: e.target.value as any})} options={permissionOptions} />
            <Input label="UID (optional)" type="number" value={formData.uid || ''} onChange={e => setFormData({...formData, uid: e.target.value ? Number(e.target.value) : undefined})} />
            <Input label="GID (optional)" type="number" value={formData.gid || ''} onChange={e => setFormData({...formData, gid: e.target.value ? Number(e.target.value) : undefined})} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t pt-4">
            <Input label="Max Files (0 = unlimited)" type="number" value={formData.max_files} onChange={e => setFormData({...formData, max_files: Number(e.target.value)})} />
            <Input label="Max Size MB (0 = unlimited)" type="number" value={formData.max_size} onChange={e => setFormData({...formData, max_size: Number(e.target.value)})} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 border-t pt-4">
            <Input label="Ratio Upload" type="number" value={formData.ratio_upload} onChange={e => setFormData({...formData, ratio_upload: Number(e.target.value)})} />
            <Input label="Ratio Download" type="number" value={formData.ratio_download} onChange={e => setFormData({...formData, ratio_download: Number(e.target.value)})} />
            <Input label="Bandwidth Up (KB/s)" type="number" value={formData.bandwidth_up} onChange={e => setFormData({...formData, bandwidth_up: Number(e.target.value)})} />
            <Input label="Bandwidth Down (KB/s)" type="number" value={formData.bandwidth_down} onChange={e => setFormData({...formData, bandwidth_down: Number(e.target.value)})} />
          </div>
          <div className="flex justify-end gap-3 border-t pt-4">
            <Button type="button" variant="secondary" onClick={() => { setShowModal(false); resetForm(); }}>Cancel</Button>
            <Button type="submit" loading={createMutation.isPending || updateMutation.isPending}>
              {editingUser ? 'Update' : 'Create'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}