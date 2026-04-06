'use client';

import { useEffect, useMemo, useState } from 'react';
import { clearUserCache, login, User } from '@/lib/auth';
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
import { Badge } from '@/components/ui/badge';
import { ASSIGNABLE_APP_ROLES, canManageUsersAccount } from '@/lib/roles';
import { cn } from '@/components/ui/utils';

type UserRecord = {
  _id: string;
  role: string;
  departmentId?: string;
  name?: string;
  email?: string;
  okrCreateDisabled?: boolean;
};

const ROLES = ASSIGNABLE_APP_ROLES as unknown as readonly string[];

/** Short hint for permission column (Spanish copy for admins). */
function rolePermissionSummary(role: string): string {
  switch (role) {
    case 'admin':
      return 'Acceso total: usuarios, datos, configuración.';
    case 'org_owner':
      return 'Gestión de organización: usuarios y permisos (no puede asignar administradores).';
    case 'view_only':
      return 'Solo lectura: no edita OKRs ni integraciones.';
    case 'standard':
    case 'developer':
      return 'Colaborador: crea/edita según políticas (objetivos si no están bloqueados).';
    default:
      return 'Liderazgo: crea y revisa OKRs en su ámbito.';
  }
}

function UserRow({
  user: u,
  saving,
  onUpdate,
  roles,
  roleEditLocked,
}: {
  user: UserRecord;
  saving: boolean;
  onUpdate: (updates: {
    role?: string;
    departmentId?: string | null;
    okrCreateDisabled?: boolean;
  }) => void;
  roles: readonly string[];
  /** Org owners cannot reassign admin accounts */
  roleEditLocked?: boolean;
}) {
  const [role, setRole] = useState(u.role);
  const [departmentId, setDepartmentId] = useState(u.departmentId ?? '');
  const [okrCreateDisabled, setOkrCreateDisabled] = useState(!!u.okrCreateDisabled);

  useEffect(() => {
    setRole(u.role);
    setDepartmentId(u.departmentId ?? '');
    setOkrCreateDisabled(!!u.okrCreateDisabled);
  }, [u._id, u.role, u.departmentId, u.okrCreateDisabled]);

  useEffect(() => {
    if (role === 'admin') setOkrCreateDisabled(false);
  }, [role]);

  const isAdminRole = role === 'admin';
  const canCreateObjectives = isAdminRole ? true : !okrCreateDisabled;

  const hasChanges =
    role !== u.role ||
    (departmentId.trim() || null) !== (u.departmentId ?? null) ||
    !!okrCreateDisabled !== !!u.okrCreateDisabled;

  const handleSave = () => {
    onUpdate({
      role,
      departmentId: departmentId.trim() || null,
      okrCreateDisabled,
    });
  };

  return (
    <div
      className={cn(
        'rounded-xl border border-border bg-card p-4 shadow-sm',
        'grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,0.9fr)_minmax(0,1fr)_auto]'
      )}
    >
      <div className="min-w-0 space-y-1">
        <p className="font-medium leading-snug truncate" title={u.name || u.email}>
          {u.name || u.email || 'Sin nombre'}
        </p>
        {u.email && u.name && <p className="text-xs text-muted-foreground truncate">{u.email}</p>}
        <p className="font-mono text-[11px] text-muted-foreground truncate" title={u._id}>
          {u._id}
        </p>
        <div className="flex flex-wrap gap-1 pt-1">
          {role === 'admin' && <Badge>Administrador</Badge>}
          {role === 'view_only' && (
            <Badge variant="secondary">Solo lectura</Badge>
          )}
          {!isAdminRole && (
            <Badge variant={canCreateObjectives ? 'outline' : 'destructive'}>
              {canCreateObjectives ? 'Puede crear OKRs' : 'Sin crear OKRs'}
            </Badge>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">Rol (nivel de acceso)</Label>
        {roleEditLocked ? (
          <div className="rounded-md border border-border bg-muted/40 px-3 py-2 text-sm font-medium">{role}</div>
        ) : (
          <Select value={role} onValueChange={setRole} disabled={saving}>
            <SelectTrigger className="h-9">
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
        )}
        <p className="text-[11px] leading-snug text-muted-foreground">{rolePermissionSummary(role)}</p>
      </div>

      <div className="space-y-3">
        <div>
          <Label className="text-xs text-muted-foreground">Departamento (ID)</Label>
          <Input
            className="mt-1 h-9"
            value={departmentId}
            placeholder="Opcional — UUID o vacío"
            onChange={(e) => setDepartmentId(e.target.value)}
            disabled={saving}
          />
        </div>
        <div className="rounded-lg border border-border/80 bg-muted/30 px-3 py-2">
          <label className="flex cursor-pointer items-start gap-2.5 text-sm">
            <input
              type="checkbox"
              className="mt-0.5 h-4 w-4 rounded border-input"
              checked={canCreateObjectives}
              disabled={saving || isAdminRole}
              onChange={(e) => {
                if (isAdminRole) return;
                setOkrCreateDisabled(!e.target.checked);
              }}
              title={isAdminRole ? 'Los administradores siempre pueden crear objetivos' : undefined}
            />
            <span>
              <span className="font-medium">Permitir crear objetivos</span>
              <span className="block text-xs text-muted-foreground">
                Desactiva para quitar solo la creación de OKRs (el rol sigue aplicando lo demás).
              </span>
            </span>
          </label>
        </div>
      </div>

      <div className="flex items-end lg:justify-end">
        <Button size="sm" onClick={handleSave} disabled={saving || !hasChanges} className="min-w-[88px]">
          {saving ? 'Guardando…' : 'Guardar'}
        </Button>
      </div>
    </div>
  );
}

export default function AdminUsersPage() {
  const { rolePreview, user: sessionUser, refetchUser, setRolePreview } = useViewRole();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const canAccessUserManagement = canManageUsersAccount(user);

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      setIsLoading(true);
      clearUserCache();
      // Llamada directa a la API: evita caché en memoria de getCurrentUser() que dejaba rol antiguo.
      const me = (await api.getCurrentUser()) as User;
      if (!me) {
        await login();
        return;
      }
      setUser(me);
      await refetchUser();
      if (canManageUsersAccount(me)) {
        await loadUsers();
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
    updates: { role?: string; departmentId?: string | null; okrCreateDisabled?: boolean }
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
                okrCreateDisabled:
                  updates.okrCreateDisabled !== undefined ? updates.okrCreateDisabled : u.okrCreateDisabled,
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

  if (isLoading) {
    return (
      <AppLayout title="Gestión de usuarios" description="Cargando…">
        <div className="text-center text-muted-foreground py-8">Cargando…</div>
      </AppLayout>
    );
  }

  if (!user) {
    return null;
  }

  const assignableRoles = useMemo(() => {
    if (user.role === 'org_owner') {
      return ROLES.filter((r) => r !== 'admin');
    }
    return ROLES;
  }, [user.role]);

  if (!canAccessUserManagement) {
    return (
      <AppLayout title="Acceso restringido" description="Se requiere administrador u organizador en el servidor">
        <Card className="max-w-lg">
          <CardHeader>
            <CardTitle>Sin permiso de gestión de usuarios</CardTitle>
            <p className="text-sm text-muted-foreground">
              Tu sesión es válida, pero el rol en el servidor no es <code className="text-xs">admin</code> ni{' '}
              <code className="text-xs">org_owner</code>.
            </p>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground">
            <p>
              <strong className="text-foreground">Rol en el servidor (cuenta real):</strong>{' '}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">{user.role ?? 'sin definir'}</code>
            </p>
            {rolePreview != null && (
              <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-100">
                <p className="font-medium text-amber-950 dark:text-amber-50">Vista previa de rol activa</p>
                <p className="mt-1">
                  La vista previa solo cambia partes de la interfaz; los permisos reales siguen siendo los de{' '}
                  <code className="text-xs">{user.role}</code> en el servidor.
                </p>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="mt-2"
                  onClick={() => {
                    setRolePreview(null);
                    void loadUser();
                  }}
                >
                  Quitar vista previa y reintentar
                </Button>
              </div>
            )}
            <p>
              Para acceder aquí hace falta <code className="text-xs">role: &quot;admin&quot;</code> o{' '}
              <code className="text-xs">role: &quot;org_owner&quot;</code> en MongoDB para tu usuario (Auth0{' '}
              <code className="text-xs">sub</code>), o usar <code className="text-xs">APP_ADMIN_USER_IDS</code> /{' '}
              <code className="text-xs">APP_ADMIN_EMAILS</code> para administradores.
            </p>
            <div className="flex flex-wrap gap-2 pt-2">
              <Button type="button" onClick={() => router.push('/dashboard')}>
                Ir al dashboard
              </Button>
              <Button type="button" variant="outline" onClick={() => void loadUser()}>
                Reintentar
              </Button>
            </div>
          </CardContent>
        </Card>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Gestión de usuarios" description="Roles, departamento y permisos (admin u org owner)">
      <div className="space-y-6 max-w-6xl">
        {rolePreview && sessionUser && rolePreview !== sessionUser.role && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30 px-4 py-3 text-sm text-amber-800 dark:text-amber-200">
            <strong>Vista previa de rol activa.</strong> La UI simula <strong>{rolePreview}</strong>; las API siguen
            usando tu rol real (<strong>{sessionUser.role}</strong>). Listado y cambios requieren{' '}
            <strong className="text-foreground">admin</strong> u <strong className="text-foreground">org_owner</strong> en
            el servidor.
          </div>
        )}
        {error && (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}
        <Card>
          <CardHeader className="border-b border-border">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle>Usuarios</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  Listado unión <strong className="text-foreground">Auth0 + MongoDB</strong>: verás a quienes aparecen
                  en el directorio y a quienes ya tienen fila en la app. El <strong>rol</strong> define el nivel general;{' '}
                  <strong>Permitir crear objetivos</strong> añade o quita solo ese permiso.
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Badge variant="secondary" className="text-xs font-normal">
                  {loadingUsers ? '…' : `${users.length} usuario${users.length !== 1 ? 's' : ''}`}
                </Badge>
                <Button variant="outline" size="sm" onClick={loadUsers} disabled={loadingUsers}>
                  Actualizar lista
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            {loadingUsers ? (
              <div className="text-center text-muted-foreground py-12">Cargando usuarios…</div>
            ) : users.length === 0 ? (
              <div className="space-y-3 text-center text-muted-foreground py-10 text-sm max-w-lg mx-auto">
                <p>No hay usuarios en la lista.</p>
                <p>
                  Tras el primer inicio de sesión debería crearse un documento en Mongo. Configura{' '}
                  <code className="text-xs rounded bg-muted px-1">APP_ADMIN_USER_IDS</code> o{' '}
                  <code className="text-xs rounded bg-muted px-1">role: &quot;admin&quot;</code>, luego{' '}
                  <button
                    type="button"
                    className="text-primary underline underline-offset-4 font-medium"
                    onClick={() => {
                      void refetchUser();
                      loadUsers();
                    }}
                  >
                    actualizar
                  </button>
                  .
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="hidden lg:grid lg:grid-cols-[minmax(0,1.4fr)_minmax(0,0.9fr)_minmax(0,1fr)_auto] gap-4 px-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  <span>Usuario</span>
                  <span>Rol</span>
                  <span>Departamento y permisos</span>
                  <span className="text-right">Acción</span>
                </div>
                {users.map((u) => (
                  <UserRow
                    key={u._id}
                    user={u}
                    saving={savingId === u._id}
                    onUpdate={(updates) => handleUpdate(u._id, updates)}
                    roles={assignableRoles}
                    roleEditLocked={user.role === 'org_owner' && u.role === 'admin'}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
