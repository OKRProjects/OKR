'use client';

import React, { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Settings, LogOut, ChevronDown, Check } from 'lucide-react';
import { useViewRole } from '@/lib/ViewRoleContext';
import { logout } from '@/lib/auth';
import { api } from '@/lib/api';
import { cn } from '@/components/ui/utils';

const ROLE_LABELS: Record<string, string> = {
  admin: 'Admin',
  leader: 'Leader',
  standard: 'Standard',
  view_only: 'View only',
  developer: 'Developer',
};

const ROLE_DESCRIPTIONS: Record<string, string> = {
  admin: 'Full access; manage users and all objectives.',
  leader: 'Lead a division; approve objectives and see department metrics.',
  standard: 'Create and edit objectives; submit for approval.',
  view_only: 'View objectives only; no edits.',
  developer: 'Same as standard with developer tools.',
};

const ROLES: { value: 'actual' | 'admin' | 'leader' | 'standard' | 'view_only' | 'developer'; label: string }[] = [
  { value: 'actual', label: 'Actual (my real role)' },
  { value: 'view_only', label: 'View only' },
  { value: 'standard', label: 'Standard' },
  { value: 'leader', label: 'Leader' },
  { value: 'admin', label: 'Admin' },
  { value: 'developer', label: 'Developer' },
];

export function UserMenu() {
  const { user, roleForUI, rolePreview, setRolePreview } = useViewRole();
  const [open, setOpen] = useState(false);
  const [departments, setDepartments] = useState<{ _id: string; name: string }[]>([]);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api.getDepartments().then(setDepartments).catch(() => setDepartments([]));
  }, []);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('click', onDocClick);
    return () => document.removeEventListener('click', onDocClick);
  }, [open]);

  const handleLogout = async () => {
    setOpen(false);
    await logout();
  };

  const displayName = user?.name || user?.email || 'User';
  const initial = (displayName.charAt(0) || 'U').toUpperCase();
  const role = roleForUI ?? 'standard';
  const roleLabel = ROLE_LABELS[role] ?? role;
  const roleDescription = ROLE_DESCRIPTIONS[role] ?? '';
  const departmentId = user?.departmentId;
  const departmentName = departmentId && departments.length
    ? (departments.find((d) => d._id === departmentId)?.name ?? departmentId)
    : null;
  const divisionText = departmentName ? departmentName : 'All divisions';

  if (!user) return null;

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={cn(
          'flex items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm font-medium transition-colors',
          'hover:bg-muted',
          open && 'bg-muted'
        )}
        aria-expanded={open}
        aria-haspopup="true"
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
          {user.picture ? (
            <Image
              src={user.picture}
              alt=""
              width={32}
              height={32}
              className="rounded-full object-cover"
            />
          ) : (
            <span className="text-sm font-semibold">{initial}</span>
          )}
        </span>
        <span className="max-w-[140px] truncate text-foreground">{displayName}</span>
        <ChevronDown className={cn('h-4 w-4 shrink-0 text-muted-foreground transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div
          className="absolute right-0 top-full z-50 mt-1 w-72 rounded-lg border bg-popover text-popover-foreground shadow-md"
          role="menu"
        >
          <div className="p-3">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Role</p>
            <p className="mt-0.5 text-sm font-medium">{roleLabel}</p>
            <p className="text-xs text-muted-foreground">{roleDescription}</p>
          </div>
          <div className="border-t px-3 py-2">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Division</p>
            <p className="mt-0.5 text-sm">{divisionText}</p>
          </div>
          <div className="border-t p-2">
            <p className="mb-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">Switch role (preview)</p>
            <div className="space-y-0.5">
              {ROLES.map(({ value, label }) => {
                const isActive = (rolePreview ?? 'actual') === value;
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setRolePreview(value === 'actual' ? null : value)}
                    className={cn(
                      'flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-sm',
                      isActive ? 'bg-accent text-accent-foreground' : 'hover:bg-muted'
                    )}
                  >
                    {label}
                    {isActive && <Check className="h-4 w-4 shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="border-t p-1">
            <Link
              href="/profile"
              onClick={() => setOpen(false)}
              className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-sm hover:bg-muted"
            >
              <Settings className="h-4 w-4 shrink-0" />
              Settings
            </Link>
            <button
              type="button"
              onClick={handleLogout}
              className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-sm text-destructive hover:bg-destructive/10"
            >
              <LogOut className="h-4 w-4 shrink-0" />
              Log out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
