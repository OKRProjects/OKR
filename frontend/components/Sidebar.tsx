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
  Plug,
  Eye,
  Users,
} from 'lucide-react';
import { Button } from './ui/button';
import { cn } from './ui/utils';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { api } from '@/lib/api';
import { useViewRole, type ViewRole } from '@/lib/ViewRoleContext';
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
  const { effectiveRole, setEffectiveRole, user } = useViewRole();
  const role = user?.role;
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
    { id: 'divisions', name: 'By Division', icon: Building2, href: '/divisions' },
  ];

  const bottomNavigation = [
    { id: 'docs', name: 'Documentation', icon: BookOpen, href: '/docs' },
    ...(role !== 'view_only' ? [{ id: 'integrations', name: 'Integrations', icon: Plug, href: '/integrations' }] : []),
    { id: 'profile', name: 'Settings', icon: Settings, href: '/profile' },
  ];

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const fiscalYear = new Date().getFullYear();
      const objectives = await api.getObjectives({ fiscalYear });
      
      const strategic = objectives.filter((o) => o.level === 'strategic' && !o.parentObjectiveId).length;
      const functional = objectives.filter((o) => o.level === 'functional' && !o.parentObjectiveId).length;
      const tactical = objectives.filter((o) => o.level === 'tactical').length;
      
      // Count key results
      let keyResultsCount = 0;
      for (const obj of objectives) {
        if (obj._id) {
          try {
            const krs = await api.getKeyResults(obj._id);
            keyResultsCount += krs.length;
          } catch {
            // Ignore errors for individual key result fetches
          }
        }
      }

      setStats({
        strategic,
        functional,
        tactical,
        keyResults: keyResultsCount,
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
    if (href === '/integrations') {
      return pathname === '/integrations';
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
        'relative flex flex-col border-r bg-card transition-all duration-300',
        collapsed ? 'w-20' : 'w-64'
      )}
    >
      {/* Logo / Header */}
      <div className="flex h-16 items-center border-b px-6">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Target className="h-5 w-5" />
            </div>
            <span className="font-bold">OKR System</span>
          </div>
        )}
        {collapsed && (
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground mx-auto">
            <Target className="h-5 w-5" />
          </div>
        )}
      </div>

      {/* New Objective Button (hidden for view_only) */}
      {role !== 'view_only' && (
        <div className="p-4">
          <Button 
            onClick={onNewObjective || (() => window.location.href = '/okrs/new')} 
            className="w-full"
            size={collapsed ? 'icon' : 'default'}
          >
            <Plus className="h-4 w-4" />
            {!collapsed && <span className="ml-2">New Objective</span>}
          </Button>
        </div>
      )}

      {/* Main navigation */}
      <nav className="flex-1 space-y-1 px-3 pt-2">
        {mainNavigation.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);
          return (
            <Link
              key={item.id}
              href={item.href}
              className={cn(
                'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                active
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              <Icon className="h-5 w-5 flex-shrink-0" />
              {!collapsed && <span>{item.name}</span>}
            </Link>
          );
        })}
      </nav>

      {/* User management (admin only) */}
      {role === 'admin' && (
        <div className="space-y-1 px-3">
          <Link
            href="/admin/users"
            className={cn(
              'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
              pathname?.startsWith('/admin/users')
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            )}
          >
            <Users className="h-5 w-5 flex-shrink-0" />
            {!collapsed && <span>User management</span>}
          </Link>
        </div>
      )}

      {/* Help & Settings (bottom group) */}
      <div className="border-t space-y-1 px-3 py-3">
        {!collapsed && (
          <h3 className="mb-2 px-3 text-xs font-semibold uppercase text-muted-foreground">
            Help & account
          </h3>
        )}
        {bottomNavigation.map((item: { id: string; name: string; icon: typeof BookOpen; href: string }) => {
          const Icon = item.icon;
          const active = isActive(item.href);
          return (
            <Link
              key={item.id}
              href={item.href}
              className={cn(
                'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
                active
                  ? 'bg-primary text-primary-foreground font-medium'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              <Icon className="h-5 w-5 flex-shrink-0" />
              {!collapsed && <span>{item.name}</span>}
            </Link>
          );
        })}
      </div>

      {/* Quick Stats (hidden for view_only to reduce clutter) */}
      {!collapsed && role !== 'view_only' && (
        <div className="border-t p-4">
          <h3 className="mb-3 text-xs font-semibold uppercase text-muted-foreground">
            Quick Stats
          </h3>
          <div className="space-y-2">
            {statsData.map((stat) => {
              const Icon = stat.icon;
              return (
                <div key={stat.label} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Icon className={cn('h-4 w-4', stat.color)} />
                    <span className="text-sm text-muted-foreground">{stat.label}</span>
                  </div>
                  <span className="text-sm font-semibold">{stat.value}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* View as (admin only - for testing) */}
      {!collapsed && role === 'admin' && (
        <div className="border-t p-4">
          <h3 className="mb-2 text-xs font-semibold uppercase text-muted-foreground flex items-center gap-1.5">
            <Eye className="h-3.5 w-3.5" />
            View as
          </h3>
          <Select
            value={effectiveRole}
            onValueChange={(v) => setEffectiveRole(v as ViewRole)}
          >
            <SelectTrigger className="h-9 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="developer">Developer</SelectItem>
              <SelectItem value="view_only">View only</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Collapse Button */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-20 flex h-6 w-6 items-center justify-center rounded-full border bg-background shadow-sm hover:bg-muted"
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
