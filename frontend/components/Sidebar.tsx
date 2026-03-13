'use client';

import React, { useState, useEffect } from 'react';
import { 
  Home,
  Target,
  BarChart3,
  Building2,
  Settings,
  Plus,
  TrendingUp,
  Calendar,
  ChevronLeft,
  ChevronRight,
  BookOpen,
  Eye,
  Users,
} from 'lucide-react';
import { Button } from './ui/button';
import { cn } from './ui/utils';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { api } from '@/lib/api';
import { useViewRole } from '@/lib/ViewRoleContext';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface SidebarProps {
  onNewObjective?: () => void;
}

export function Sidebar({ onNewObjective }: SidebarProps) {
  const { setRolePreview, roleForUI, rolePreview, userForPermissions } = useViewRole();
  const role = roleForUI;
  const [collapsed, setCollapsed] = useState(false);
  const [stats, setStats] = useState({
    strategic: 0,
    functional: 0,
    tactical: 0,
    keyResults: 0,
  });
  const pathname = usePathname();

  const mainNavigation = [
    { id: 'dashboard', name: 'Dashboard', icon: Home, href: '/dashboard' },
    { id: 'objectives', name: 'Objectives', icon: Target, href: '/okrs' },
    { id: 'analytics', name: 'Analytics', icon: BarChart3, href: '/analytics' },
    { id: 'divisions', name: 'Divisions', icon: Building2, href: '/divisions' },
  ];

  const bottomNavigation = [
    { id: 'docs', name: 'Documentation', icon: BookOpen, href: '/docs' },
    { id: 'profile', name: 'Settings', icon: Settings, href: '/profile' },
  ];

  useEffect(() => {
    loadStats();
  }, [userForPermissions?.departmentId]);

  const loadStats = async () => {
    try {
      const fiscalYear = new Date().getFullYear();
      const isScoped = (role === 'leader' || role === 'view_only') && userForPermissions?.departmentId;
      const departmentId = isScoped ? userForPermissions!.departmentId! : undefined;
      const data = await api.getObjectivesStats({ fiscalYear, departmentId: departmentId ?? undefined });
      setStats({
        strategic: data.strategic,
        functional: data.functional,
        tactical: data.tactical,
        keyResults: data.keyResults,
      });
    } catch {
      // Ignore errors
    }
  };

  const isActive = (href: string) => {
    if (href === '/dashboard') {
      return pathname === '/dashboard';
    }
    if (href === '/okrs') {
      return pathname?.startsWith('/okrs');
    }
    if (href === '/analytics') {
      return pathname === '/analytics';
    }
    if (href === '/divisions') {
      return pathname === '/divisions';
    }
    if (href === '/profile') {
      return pathname === '/profile';
    }
    if (href === '/docs') {
      return pathname === '/docs';
    }
    return false;
  };

  const statsData = [
    { label: 'Strategic', value: String(stats.strategic), icon: TrendingUp, color: 'text-purple-600' },
    { label: 'Functional', value: String(stats.functional), icon: Building2, color: 'text-blue-600' },
    { label: 'Tactical', value: String(stats.tactical), icon: Calendar, color: 'text-green-600' },
    { label: 'Key Results', value: String(stats.keyResults), icon: Target, color: 'text-orange-600' },
  ];

  return (
    <div
      className={cn(
        'relative flex flex-col border-r border-border bg-sidebar transition-all duration-300',
        collapsed ? 'w-[72px]' : 'w-60'
      )}
    >
      {/* Logo / Header */}
      <div className="flex h-14 items-center border-b border-border px-4">
        {!collapsed && (
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <Target className="h-5 w-5" />
            </div>
            <span className="font-semibold tracking-tight text-sidebar-foreground">Goals</span>
          </div>
        )}
        {collapsed && (
          <div className="mx-auto flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Target className="h-5 w-5" />
          </div>
        )}
      </div>

      {/* New Objective Button (hidden for view_only) */}
      {role !== 'view_only' && (
        <div className="p-3">
          <Button
            onClick={onNewObjective || (() => (window.location.href = '/okrs/new'))}
            className="w-full rounded-lg"
            size={collapsed ? 'icon' : 'default'}
          >
            <Plus className="h-4 w-4" />
            {!collapsed && <span className="ml-2">New objective</span>}
          </Button>
        </div>
      )}

      {/* Main navigation */}
      <nav className="flex-1 space-y-0.5 px-2 pt-2">
        {mainNavigation.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);
          return (
            <Link
              key={item.id}
              href={item.href}
              className={cn(
                'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                active
                  ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                  : 'text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
              )}
            >
              <Icon className="h-4.5 w-4.5 flex-shrink-0 opacity-90" />
              {!collapsed && <span>{item.name}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Admin: User management */}
      {role === 'admin' && (
        <div className="border-t border-sidebar-border space-y-0.5 px-2 py-2">
          {!collapsed && (
            <p className="mb-1.5 px-3 text-[11px] font-semibold uppercase tracking-wider text-sidebar-foreground/50">
              Admin
            </p>
          )}
          <Link
            href="/admin/users"
            className={cn(
              'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
              pathname?.startsWith('/admin/users')
                ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                : 'text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
            )}
          >
            <Users className="h-4.5 w-4.5 flex-shrink-0 opacity-90" />
            {!collapsed && <span>User management</span>}
          </Link>
        </div>
      )}

      {/* Overview stats (hidden for view_only) */}
      {!collapsed && role !== 'view_only' && (
        <div className="border-t border-sidebar-border p-3">
          <p className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-wider text-sidebar-foreground/50">
            Overview
          </p>
          <div className="space-y-1.5">
            {statsData.map((stat) => {
              const Icon = stat.icon;
              return (
                <div key={stat.label} className="flex items-center justify-between rounded-md px-2 py-1.5 text-sm">
                  <div className="flex items-center gap-2">
                    <Icon className={cn('h-3.5 w-3.5', stat.color)} />
                    <span className="text-sidebar-foreground/70">{stat.label}</span>
                  </div>
                  <span className="font-semibold tabular-nums text-sidebar-foreground">{stat.value}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Account: Documentation, Integrations, Settings */}
      <div className="border-t border-sidebar-border space-y-0.5 px-2 py-3">
        {!collapsed && (
          <p className="mb-1.5 px-3 text-[11px] font-semibold uppercase tracking-wider text-sidebar-foreground/50">
            Account
          </p>
        )}
        {bottomNavigation.map((item: { id: string; name: string; icon: typeof BookOpen; href: string }) => {
          const Icon = item.icon;
          const active = isActive(item.href);
          return (
            <Link
              key={item.id}
              href={item.href}
              className={cn(
                'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                active
                  ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                  : 'text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
              )}
            >
              <Icon className="h-4.5 w-4.5 flex-shrink-0 opacity-90" />
              {!collapsed && <span>{item.name}</span>}
            </Link>
          );
        })}
      </div>

      {/* Test role — switch between roles to test UI and permissions */}
      {!collapsed && (
        <div className="border-t border-sidebar-border p-3">
          <p className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-sidebar-foreground/50">
            <Eye className="h-3.5 w-3.5" />
            Test role
          </p>
          <Select
            value={rolePreview ?? 'actual'}
            onValueChange={(v) => setRolePreview(v === 'actual' ? null : (v as 'admin' | 'leader' | 'standard' | 'view_only' | 'developer'))}
          >
            <SelectTrigger className="h-9 text-xs">
              <SelectValue placeholder="Actual (my real role)" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="actual">Actual (my real role)</SelectItem>
              <SelectItem value="view_only">View only</SelectItem>
              <SelectItem value="standard">Standard</SelectItem>
              <SelectItem value="leader">Leader</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
              <SelectItem value="developer">Developer</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Collapse Button */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-16 flex h-6 w-6 items-center justify-center rounded-full border border-border bg-background shadow-sm hover:bg-muted"
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {collapsed ? (
          <ChevronRight className="h-4 w-4" />
        ) : (
          <ChevronLeft className="h-4 w-4" />
        )}
      </button>
    </div>
  );
}
