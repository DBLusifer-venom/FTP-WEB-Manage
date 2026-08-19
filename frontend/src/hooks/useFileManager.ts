import { useState, useCallback, useEffect } from 'react';
import { fileApi } from '../services/api';
import type { FileItem, FileListResponse, FTPUser } from '../types';

interface UseFileManagerOptions {
  ftpUser?: FTPUser;
  useTls?: boolean;
  initialPath?: string;
}

export function useFileManager({ ftpUser, useTls = true, initialPath = '/' }: UseFileManagerOptions) {
  const [currentPath, setCurrentPath] = useState(initialPath);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [parentPath, setParentPath] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState<'name' | 'size' | 'modified'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const loadFiles = useCallback(async (path?: string) => {
    if (!ftpUser) return;
    
    setIsLoading(true);
    setError(null);
    try {
      const targetPath = path || currentPath;
      const response = await fileApi.list(targetPath, ftpUser.id, useTls);
      setFiles(response.items);
      setCurrentPath(response.current_path);
      setParentPath(response.parent_path);
      setSelectedFiles(new Set());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load files');
    } finally {
      setIsLoading(false);
    }
  }, [ftpUser, useTls, currentPath]);

  useEffect(() => {
    loadFiles();
  }, [loadFiles]);

  const navigateTo = (path: string) => {
    loadFiles(path);
  };

  const goUp = () => {
    if (parentPath) {
      loadFiles(parentPath);
    }
  };

  const handleFileClick = (file: FileItem) => {
    if (file.is_dir) {
      navigateTo(file.path);
    }
  };

  const handleSelectionToggle = (fileName: string) => {
    setSelectedFiles(prev => {
      const next = new Set(prev);
      if (next.has(fileName)) {
        next.delete(fileName);
      } else {
        next.add(fileName);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedFiles.size === files.length) {
      setSelectedFiles(new Set());
    } else {
      setSelectedFiles(new Set(files.map(f => f.name)));
    }
  };

  const uploadFile = async (file: File) => {
    if (!ftpUser) throw new Error('No FTP user configured');
    await fileApi.upload(file, currentPath, ftpUser.id, useTls);
    await loadFiles();
  };

  const downloadFile = async (path: string) => {
    if (!ftpUser) throw new Error('No FTP user configured');
    const blob = await fileApi.download(path, ftpUser.id, useTls);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = path.split('/').pop() || 'download';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const deleteFile = async (path: string) => {
    if (!ftpUser) throw new Error('No FTP user configured');
    await fileApi.delete(path, ftpUser.id, useTls);
    await loadFiles();
  };

  const createDirectory = async (name: string) => {
    if (!ftpUser) throw new Error('No FTP user configured');
    await fileApi.mkdir(currentPath, name, ftpUser.id, useTls);
    await loadFiles();
  };

  const renameFile = async (oldPath: string, newPath: string) => {
    if (!ftpUser) throw new Error('No FTP user configured');
    await fileApi.rename(oldPath, newPath, ftpUser.id, useTls);
    await loadFiles();
  };

  const sortedFiles = [...files].sort((a, b) => {
    let comparison = 0;
    switch (sortBy) {
      case 'name':
        comparison = a.name.localeCompare(b.name);
        break;
      case 'size':
        comparison = a.size - b.size;
        break;
      case 'modified':
        comparison = new Date(a.modified).getTime() - new Date(b.modified).getTime();
        break;
    }
    return sortOrder === 'asc' ? comparison : -comparison;
  });

  return {
    currentPath,
    files: sortedFiles,
    parentPath,
    isLoading,
    error,
    selectedFiles,
    viewMode,
    setViewMode,
    sortBy,
    setSortBy,
    sortOrder,
    setSortOrder,
    loadFiles,
    navigateTo,
    goUp,
    handleFileClick,
    handleSelectionToggle,
    handleSelectAll,
    uploadFile,
    downloadFile,
    deleteFile,
    createDirectory,
    renameFile,
  };
}