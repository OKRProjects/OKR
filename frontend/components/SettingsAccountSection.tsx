'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BookOpen, Eye, Plug, Users } from 'lucide-react';
import { useViewRole, type AppRole } from '@/lib/ViewRoleContext';
import { isAdminAccount, shouldShowUserManagementNav } from '@/lib/roles';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { cn } from '@/components/ui/utils';

/**
 * Role preview, docs/integrations shortcuts, admin user management — lives on Settings (/profile).
 */
export function SettingsAccountSection() {
  const { setRolePreview, roleForUI, rolePreview, user: sessionUser } = useViewRole();
  const pathname = usePathname();
  const role = roleForUI;
  const showUserManagement = shouldShowUserManagementNav(sessionUser, rolePreview);

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-semibold mb-1">Account &amp; access</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Preview roles for testing UI, open documentation and integrations, and manage users (admins).
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Button variant="outline" className="justify-start gap-2 h-auto py-3" asChild>
          <Link href="/docs">
            <BookOpen className="h-4 w-4 shrink-0" />
            Documentation
          </Link>
        </Button>
        {role !== 'view_only' && (
          <Button variant="outline" className="justify-start gap-2 h-auto py-3" asChild>
            <Link href="/integrations">
              <Plug className="h-4 w-4 shrink-0" />
              Integrations
            </Link>
          </Button>
        )}
      </div>

      {showUserManagement && (
        <div className="rounded-lg border border-border bg-muted/30 p-4">
          <h3 className="text-sm font-semibold mb-1 flex items-center gap-2">
            <Users className="h-4 w-4" />
            Admin
          </h3>
          <p className="text-sm text-muted-foreground mb-3">
            Manage user roles and access across the organization.
          </p>
          <Button asChild className="w-full sm:w-auto">
            <Link
              href="/admin/users"
              className={cn(pathname?.startsWith('/admin/users') && 'ring-2 ring-primary ring-offset-2')}
            >
              User management
            </Link>
          </Button>
        </div>
      )}

      <div className="rounded-lg border border-border p-4">
        <p className="mb-2 flex items-center gap-1.5 text-sm font-semibold">
          <Eye className="h-4 w-4" />
          Test role (preview)
        </p>
        <p className="text-xs text-muted-foreground mb-3">
          Switch how the UI behaves for demos; APIs still use your real account role unless noted.
        </p>
        <Select
          value={rolePreview ?? 'actual'}
          onValueChange={(v) => setRolePreview(v === 'actual' ? null : (v as AppRole))}
        >
          <SelectTrigger className="max-w-md">
            <SelectValue placeholder="Actual (my real role)" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="actual">Actual (my real role)</SelectItem>
            <SelectItem value="view_only">View only</SelectItem>
            <SelectItem value="standard">Standard (IC)</SelectItem>
            <SelectItem value="manager">Manager</SelectItem>
            <SelectItem value="director">Director</SelectItem>
            <SelectItem value="vp">VP</SelectItem>
            <SelectItem value="executive">Executive</SelectItem>
            <SelectItem value="org_owner">Org owner</SelectItem>
            <SelectItem value="leader">Leader (legacy)</SelectItem>
            {isAdminAccount(sessionUser) && <SelectItem value="admin">Admin</SelectItem>}
            <SelectItem value="developer">Developer</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
