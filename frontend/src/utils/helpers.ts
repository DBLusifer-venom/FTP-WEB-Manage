import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return formatDate(dateString);
}

export function getFileIcon(name: string, isDir: boolean): string {
  if (isDir) return 'folder';
  const ext = name.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'txt': case 'md': case 'log': return 'file-text';
    case 'pdf': return 'file-text';
    case 'doc': case 'docx': return 'file-text';
    case 'xls': case 'xlsx': case 'csv': return 'file-spreadsheet';
    case 'ppt': case 'pptx': return 'file-presentation';
    case 'jpg': case 'jpeg': case 'png': case 'gif': case 'webp': case 'svg': return 'file-image';
    case 'mp4': case 'webm': case 'mov': case 'avi': return 'file-video';
    case 'mp3': case 'wav': case 'ogg': case 'flac': return 'file-audio';
    case 'zip': case 'tar': case 'gz': case 'rar': case '7z': return 'file-archive';
    case 'js': case 'ts': case 'jsx': case 'tsx': case 'json': return 'file-code';
    case 'py': case 'rs': case 'go': case 'java': case 'cpp': case 'c': case 'h': return 'file-code';
    case 'html': case 'css': case 'scss': case 'vue': case 'svelte': return 'file-code';
    case 'sh': case 'bash': case 'zsh': case 'fish': return 'file-code';
    case 'yml': case 'yaml': case 'toml': case 'ini': case 'cfg': return 'file-code';
    default: return 'file';
  }
}

export function getRoleColor(role: string): string {
  switch (role) {
    case 'admin': return 'badge-danger';
    case 'read_write': return 'badge-warning';
    case 'read_only': return 'badge-info';
    default: return 'badge-gray';
  }
}

export function getRoleLabel(role: string): string {
  switch (role) {
    case 'admin': return 'Admin';
    case 'read_write': return 'Read/Write';
    case 'read_only': return 'Read Only';
    default: return role;
  }
}

export function getStatusColor(status: string): string {
  switch (status.toLowerCase()) {
    case 'active': case 'running': case 'enabled': return 'badge-success';
    case 'inactive': case 'stopped': case 'disabled': return 'badge-danger';
    case 'pending': case 'warning': return 'badge-warning';
    default: return 'badge-gray';
  }
}

export function debounce<T extends (...args: any[]) => any>(fn: T, ms = 300): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), ms);
  };
}

export function generateId(): string {
  return Math.random().toString(36).substring(2, 15);
}