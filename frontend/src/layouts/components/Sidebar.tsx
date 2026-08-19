import React from 'react';
import { NavLink } from 'react-router-dom';
import { cn } from '../../utils/helpers';
import { ChevronLeft, ChevronRight, Server } from 'lucide-react';

interface SidebarProps {
  navigation: Array<{ name: string; href: string; icon: string }>;
  currentPath: string;
  iconMap: Record<string, React.ReactNode>;
}

export function Sidebar({ navigation, currentPath, iconMap }: SidebarProps) {
  const [collapsed, setCollapsed] = React.useState(false);

  return (
    <>
      <aside
        className={cn(
          'sidebar fixed inset-y-0 left-0 z-40 bg-white border-r border-gray-200 transition-all duration-300 ease-in-out lg:translate-x-0',
          collapsed && 'w-16',
          !collapsed && 'w-64'
        )}
        aria-label="Main navigation"
      >
        <div className="flex h-16 items-center justify-between px-4 border-b border-gray-200">
          {!collapsed && (
            <NavLink to="/dashboard" className="flex items-center gap-2" aria-label="FTP Manager">
              <Server className="w-6 h-6 text-primary-600" />
              <span className="font-semibold text-gray-900">FTP Manager</span>
            </NavLink>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-expanded={!collapsed}
          >
            {collapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
          </button>
        </div>
        <nav className="flex-1 overflow-y-auto p-4 space-y-1" aria-label="Navigation">
          {navigation.map(item => (
            <NavLink
              key={item.href}
              to={item.href}
              className={({ isActive }) => cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary-50 text-primary-700'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900',
                collapsed && 'justify-center'
              )}
              title={collapsed ? item.name : undefined}
              aria-current={currentPath === item.href ? 'page' : undefined}
            >
              <span className="flex-shrink-0" aria-hidden="true">
                {iconMap[item.icon]}
              </span>
              {!collapsed && <span>{item.name}</span>}
            </NavLink>
          ))}
        </nav>
        <div className="p-4 border-t border-gray-200">
          {!collapsed && (
            <div className="text-xs text-gray-500 text-center">
              FTP Manager v1.0.0
            </div>
          )}
        </div>
      </aside>
      <div
        className={cn(
          'fixed inset-0 z-30 bg-black/50 lg:hidden transition-opacity',
          collapsed ? 'opacity-0 pointer-events-none' : 'opacity-100'
        )}
        onClick={() => setCollapsed(true)}
        aria-hidden="true"
      />
    </>
  );
}