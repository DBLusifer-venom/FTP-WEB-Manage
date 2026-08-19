import React, { useState } from 'react';
import { useFileManager } from '../hooks/useFileManager';
import { useFTPUsers } from '../hooks/useApi';
import { useAuth } from '../context/AuthContext';
import { Folder, File, Upload, Download, Delete, Edit, Plus, Search, ChevronLeft, MoreVertical, Check, X } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { Checkbox } from '../components/ui/Checkbox';
import { cn, formatBytes, formatDate, getFileIcon } from '../utils/helpers';
import { FTPUser } from '../types';

export function FileManager() {
  const { user } = useAuth();
  const { data: ftpUsers } = useFTPUsers();
  const [selectedFtpUser, setSelectedFtpUser] = useState<FTPUser | null>(null);
  const [useTls, setUseTls] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [showRename, setShowRename] = useState<{ name: string; path: string } | null>(null);
  const [newFolderName, setNewFolderName] = useState('');
  const [renameValue, setRenameValue] = useState('');
  const [uploadFiles, setUploadFiles] = useState<File[]>([]);

  const fileManager = useFileManager({
    ftpUser: selectedFtpUser,
    useTls,
  });

  const handleFtpUserChange = (ftpUser: FTPUser) => {
    setSelectedFtpUser(ftpUser);
    fileManager.loadFiles('/');
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFiles.length) return;
    for (const file of uploadFiles) {
      await fileManager.uploadFile(file);
    }
    setUploadFiles([]);
    setShowUpload(false);
  };

  const handleNewFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;
    await fileManager.createDirectory(newFolderName.trim());
    setNewFolderName('');
    setShowNewFolder(false);
  };

  const handleRename = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showRename || !renameValue.trim()) return;
    await fileManager.renameFile(showRename.path, `${fileManager.currentPath}/${renameValue.trim()}`.replace('//', '/'));
    setShowRename(null);
    setRenameValue('');
  };

  const handleFileSelect = (file: any) => {
    if (file.is_dir) {
      fileManager.navigateTo(file.path);
    }
  };

  if (!selectedFtpUser) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">File Manager</h1>
            <p className="text-gray-500">Select an FTP user to browse files</p>
          </div>
        </div>
        <div className="card p-8 text-center">
          <Folder className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No FTP User Selected</h3>
          <p className="text-gray-500 mb-6">Choose an FTP user from the dropdown to start managing files</p>
          <select
            value={selectedFtpUser?.id || ''}
            onChange={(e) => {
              const ftpUser = ftpUsers?.find(u => u.id === Number(e.target.value));
              if (ftpUser) handleFtpUserChange(ftpUser);
            }}
            className="input w-auto mx-auto max-w-md"
          >
            <option value="">Select FTP User</option>
            {ftpUsers?.map(u => (
              <option key={u.id} value={u.id}>
                {u.username} ({u.permission})
              </option>
            ))}
          </select>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">File Manager</h1>
          <p className="text-gray-500">{selectedFtpUser.username} @ {selectedFtpUser.home_directory}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={selectedFtpUser.id}
            onChange={(e) => {
              const ftpUser = ftpUsers?.find(u => u.id === Number(e.target.value));
              if (ftpUser) handleFtpUserChange(ftpUser);
            }}
            className="input w-auto min-w-[200px]"
          >
            {ftpUsers?.map(u => (
              <option key={u.id} value={u.id}>
                {u.username} ({u.permission})
              </option>
            ))}
          </select>
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={useTls}
              onChange={e => setUseTls(e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
            Use TLS
          </label>
          {selectedFtpUser.permission !== 'read_only' && (
            <>
              <Button variant="secondary" size="sm" onClick={() => setShowNewFolder(true)}>
                <Plus className="w-4 h-4 mr-1" />
                New Folder
              </Button>
              <Button variant="primary" size="sm" onClick={() => setShowUpload(true)}>
                <Upload className="w-4 h-4 mr-1" />
                Upload
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="card">
        <div className="p-4 border-b border-gray-200 flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={fileManager.goUp} disabled={fileManager.currentPath === '/'} aria-label="Go up">
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <div className="flex-1 flex items-center gap-2">
            <Search className="w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Filter files..."
              className="flex-1 bg-transparent border-none focus:outline-none text-sm"
            />
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            {fileManager.files.length} items
          </div>
        </div>

        {fileManager.isLoading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto" />
            <p className="mt-2 text-gray-500">Loading files...</p>
          </div>
        ) : fileManager.error ? (
          <div className="p-8 text-center text-red-600">
            <p>{fileManager.error}</p>
            <Button variant="secondary" size="sm" className="mt-2" onClick={() => fileManager.loadFiles()}>
              Retry
            </Button>
          </div>
        ) : (
          <div className={cn('p-4', fileManager.viewMode === 'grid' ? 'file-grid' : '')}>
            {fileManager.currentPath !== '/' && (
              <div
                className={cn('file-item flex items-center gap-3 p-3', fileManager.viewMode === 'list' && 'w-full')}
                onClick={fileManager.goUp}
              >
                <Folder className="w-8 h-8 text-gray-400" />
                <span className="text-sm text-gray-700 font-medium">..</span>
                <span className="text-xs text-gray-400 ml-auto">Parent Directory</span>
              </div>
            )}
            {fileManager.files.map(file => {
              const Icon = getFileIcon(file.name, file.is_dir) === 'folder' ? Folder : File;
              const isSelected = fileManager.selectedFiles.has(file.name);
              return (
                <div
                  key={file.name}
                  className={cn(
                    'file-item flex items-center gap-3 p-3',
                    fileManager.viewMode === 'list' && 'w-full',
                    isSelected && 'selected'
                  )}
                  onClick={() => handleFileSelect(file)}
                  onContextMenu={e => e.preventDefault()}
                >
                  <Checkbox
                    checked={isSelected}
                    onChange={e => fileManager.handleSelectionToggle(file.name)}
                    className="mr-2"
                  />
                  <Icon className={cn('w-8 h-8', file.is_dir ? 'text-yellow-500' : 'text-gray-400')} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{file.name}</p>
                    <p className="text-xs text-gray-500">
                      {file.is_dir ? 'Directory' : formatBytes(file.size)} • {formatDate(file.modified)}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {!file.is_dir && (
                      <Button variant="ghost" size="sm" onClick={e => { e.stopPropagation(); fileManager.downloadFile(file.path); }} aria-label="Download">
                        <Download className="w-4 h-4" />
                      </Button>
                    )}
                    {selectedFtpUser.permission !== 'read_only' && (
                      <>
                        <Button variant="ghost" size="sm" onClick={e => { e.stopPropagation(); setShowRename({ name: file.name, path: file.path }); setRenameValue(file.name); }} aria-label="Rename">
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={e => { e.stopPropagation(); if (confirm(`Delete ${file.name}?`)) fileManager.deleteFile(file.path); }} aria-label="Delete">
                          <Delete className="w-4 h-4 text-red-500" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
            {fileManager.files.length === 0 && fileManager.currentPath === '/' && (
              <div className="col-span-full text-center py-12 text-gray-500">
                <Folder className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <p>This directory is empty</p>
                {selectedFtpUser.permission !== 'read_only' && (
                  <Button variant="primary" className="mt-4" onClick={() => setShowUpload(true)}>
                    <Upload className="w-4 h-4 mr-1" />
                    Upload Files
                  </Button>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <Modal isOpen={showUpload} onClose={() => setShowUpload(false)} title="Upload Files">
        <form onSubmit={handleUpload}>
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center mb-4">
            <Upload className="w-12 h-12 text-gray-400 mx-auto mb-2" />
            <p className="text-gray-600">Drag and drop files here, or click to select</p>
            <input
              type="file"
              multiple
              onChange={e => setUploadFiles(Array.from(e.target.files || []))}
              className="hidden"
              id="file-upload"
            />
            <label htmlFor="file-upload" className="text-primary-600 hover:underline cursor-pointer">Choose files</label>
          </div>
          {uploadFiles.length > 0 && (
            <div className="space-y-2 mb-4 max-h-40 overflow-y-auto">
              {uploadFiles.map((file, i) => (
                <div key={i} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <span className="text-sm truncate max-w-[200px]">{file.name} ({formatBytes(file.size)})</span>
                  <button type="button" onClick={() => setUploadFiles(f => f.filter((_, idx) => idx !== i))} className="text-gray-400 hover:text-red-500">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
          <div className="flex justify-end gap-3">
            <Button type="button" variant="secondary" onClick={() => setShowUpload(false)}>Cancel</Button>
            <Button type="submit" disabled={!uploadFiles.length}><Upload className="w-4 h-4 mr-1" />Upload</Button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={showNewFolder} onClose={() => setShowNewFolder(false)} title="New Folder">
        <form onSubmit={handleNewFolder}>
          <Input label="Folder Name" value={newFolderName} onChange={e => setNewFolderName(e.target.value)} placeholder="Enter folder name" autoFocus />
          <div className="flex justify-end gap-3 mt-4">
            <Button type="button" variant="secondary" onClick={() => setShowNewFolder(false)}>Cancel</Button>
            <Button type="submit"><Plus className="w-4 h-4 mr-1" />Create</Button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={!!showRename} onClose={() => setShowRename(null)} title="Rename">
        <form onSubmit={handleRename}>
          <Input label="New Name" value={renameValue} onChange={e => setRenameValue(e.target.value)} autoFocus />
          <div className="flex justify-end gap-3 mt-4">
            <Button type="button" variant="secondary" onClick={() => setShowRename(null)}>Cancel</Button>
            <Button type="submit"><Check className="w-4 h-4 mr-1" />Rename</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}