'use client';

import { useEffect, useState } from 'react';
import { getCurrentUser, login, User } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import { useViewRole } from '@/lib/ViewRoleContext';
import { AppLayout } from '@/components/AppLayout';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type UserRecord = { _id: string; role: string; departmentId?: string; name?: string; email?: string };

const ROLES = ['admin', 'leader', 'standard', 'view_only', 'developer'] as const;

function UserRow({
  user: u,
  saving,
  onUpdate,
  roles,
}: {
  user: UserRecord;
  saving: boolean;
  onUpdate: (updates: { role?: string; departmentId?: string | null }) => void;
  roles: readonly string[];
}) {
  const [role, setRole] = useState(u.role);
  const [departmentId, setDepartmentId] = useState(u.departmentId ?? '');

  useEffect(() => {
    setRole(u.role);
    setDepartmentId(u.departmentId ?? '');
  }, [u._id, u.role, u.departmentId]);

  const hasChanges =
    role !== u.role || (departmentId.trim() || null) !== (u.departmentId ?? null);

  const handleSave = () => {
    onUpdate({ role, departmentId: departmentId.trim() || null });
  };

  return (
    <div className="flex flex-wrap items-end gap-4 rounded-lg border p-4">
      <div className="min-w-0 flex-1">
        <Label className="text-xs text-muted-foreground">User ID</Label>
        <p className="truncate font-mono text-sm" title={u._id}>
          {u._id}
        </p>
        {(u.name || u.email) && (
          <p className="text-sm text-muted-foreground">{u.name ?? u.email}</p>
        )}
      </div>
      <div className="w-40">
        <Label className="text-xs">Role</Label>
        <Select value={role} onValueChange={setRole} disabled={saving}>
          <SelectTrigger className="mt-1">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {roles.map((r) => (
              <SelectItem key={r} value={r}>
                {r}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="w-40">
        <Label className="text-xs">Department ID</Label>
        <Input
          className="mt-1"
          value={departmentId}
          placeholder="Optional"
          onChange={(e) => setDepartmentId(e.target.value)}
          disabled={saving}
        />
      </div>
      <Button
        size="sm"
        onClick={handleSave}
        disabled={saving || !hasChanges}
      >
        {saving ? 'Saving...' : 'Save'}
      </Button>
    </div>
  );
}

export default function AdminUsersPage() {
  const { roleForUI } = useViewRole();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const canAccessAsAdmin = user?.role === 'admin' || roleForUI === 'admin';

  useEffect(() => {
    loadUser();
  }, []);

  useEffect(() => {
    if (canAccessAsAdmin) {
      loadUsers();
    }
  }, [canAccessAsAdmin]);

  const loadUser = async () => {
    try {
      const currentUser = await getCurrentUser();
      if (!currentUser) {
        await login();
        return;
      }
      setUser(currentUser);
      if (currentUser.role !== 'admin' && roleForUI !== 'admin') {
        router.replace('/dashboard');
        return;
      }
    } catch {
      await login();
    } finally {
      setIsLoading(false);
    }
  };

  const loadUsers = async () => {
    setLoadingUsers(true);
    setError(null);
    try {
      const list = await api.getUsers();
      setUsers(list);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load users');
      setUsers([]);
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleUpdate = async (
    uid: string,
    updates: { role?: string; departmentId?: string | null }
  ) => {
    setSavingId(uid);
    setError(null);
    try {
      await api.updateUser(uid, updates);
      setUsers((prev) =>
        prev.map((u) =>
          u._id === uid
            ? {
                ...u,
                role: updates.role ?? u.role,
                departmentId: updates.departmentId !== undefined ? (updates.departmentId ?? undefined) : u.departmentId,
              }
            : u
        )
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to update user');
    } finally {
      setSavingId(null);
    }
  };

  if (isLoading || !user) {
    return (
      <AppLayout title="User management" description="Manage roles and departments">
        <div className="text-center text-muted-foreground py-8">Loading...</div>
      </AppLayout>
    );
  }

  if (!canAccessAsAdmin) {
    return null;
  }

  return (
    <AppLayout title="User management" description="Manage user roles and departments (admin only)">
      <div className="space-y-6">
        {roleForUI === 'admin' && user?.role !== 'admin' && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30 px-4 py-3 text-sm text-amber-800 dark:text-amber-200">
            Testing as <strong>Admin</strong>. List and save will return 403 unless your real role is admin.
          </div>
        )}
        {error && (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}
        <Card>
          <CardHeader>
            <CardTitle>User management</CardTitle>
            <p className="text-sm text-muted-foreground">
              Users are loaded from Auth0 (everyone who can sign in). Set role and department here to control access and scope in this app; changes apply immediately.
            </p>
          </CardHeader>
          <CardContent>
            {loadingUsers ? (
              <div className="text-center text-muted-foreground py-8">Loading users...</div>
            ) : users.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                No users yet. If Auth0 is connected, anyone who has signed in will appear here. Otherwise add a user by saving a role for them after they log in once.
              </div>
            ) : (
              <div className="space-y-4">
                {users.map((u) => (
                  <UserRow
                    key={u._id}
                    user={u}
                    saving={savingId === u._id}
                    onUpdate={(updates) => handleUpdate(u._id, updates)}
                    roles={ROLES}
                  />
                ))}
              </div>
            )}
            <Button
              variant="outline"
              className="mt-4"
              onClick={loadUsers}
              disabled={loadingUsers}
            >
              Refresh list
            </Button>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
