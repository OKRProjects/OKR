'use client';

import { useEffect, useState } from 'react';
import { getCurrentUser, login, User } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import { AppLayout } from '@/components/AppLayout';
import ProfileForm from '@/components/ProfileForm';
import { api, Profile } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { IntegrationsSection } from '@/components/IntegrationsSection';
import { ProfileIntegrationsDemo } from '@/components/ProfileIntegrationsDemo';
import { SettingsAccountSection } from '@/components/SettingsAccountSection';
import Image from 'next/image';
import Link from 'next/link';
import { useViewPreferences } from '@/lib/useViewPreferences';
import { RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { DashboardSortField, SortDirection } from '@/lib/api';

const OKR_TAB_LABELS: Record<string, string> = {
  overview: 'Overview',
  progress: 'Progress',
  updates: 'Updates',
  history: 'History',
  dependencies: 'Dependencies',
  files: 'Files',
};

const OKR_TAB_IDS = Object.keys(OKR_TAB_LABELS);

const HISTORY_EVENT_FILTER_OPTIONS: { value: string; label: string }[] = [
  { value: 'all', label: 'All types' },
  { value: 'in_review', label: 'Submitted' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'draft', label: 'Back to draft' },
];

/** Customizable views (#24): tabs, dashboard sort/filter, history filter — persisted on profile */
function ProfileCustomizableViews() {
  const { preferences, updatePreferences, resetToDefault, loading } = useViewPreferences();
  if (loading) return <p className="text-sm text-muted-foreground">Loading view settings…</p>;

  const visibleTabCount = OKR_TAB_IDS.filter((id) => preferences.visibleTabs[id] !== false).length;

  const handleTabToggle = (id: string, checked: boolean) => {
    if (!checked && visibleTabCount <= 1) {
      toast.error('Debe quedar al menos una pestaña visible en el detalle del OKR.');
      return;
    }
    void updatePreferences({ visibleTabs: { [id]: checked } });
  };

  const sortCombo = `${preferences.dashboardSort}-${preferences.dashboardSortDirection}` as string;

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-semibold mb-1">Vistas personalizables</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Se guardan en tu perfil: última pestaña del modal OKR, pestañas visibles, orden del listado del
          dashboard y filtros.
        </p>
      </div>

      <div>
        <h3 className="text-base font-medium mb-2">Pestañas del detalle OKR</h3>
        <p className="text-sm text-muted-foreground mb-3">
          Oculta secciones (por ejemplo Historial). La última pestaña que elijas se recordará al abrir otro OKR.
        </p>
        <div className="flex flex-wrap gap-x-6 gap-y-2">
          {Object.entries(OKR_TAB_LABELS).map(([id, label]) => (
            <label key={id} className="flex items-center gap-2 cursor-pointer text-sm">
              <input
                type="checkbox"
                checked={preferences.visibleTabs[id] !== false}
                onChange={(e) => handleTabToggle(id, e.target.checked)}
                className="rounded border-input h-4 w-4"
              />
              {label}
            </label>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-base font-medium mb-2">Listado del dashboard</h3>
        <p className="text-sm text-muted-foreground mb-3">
          Mismo criterio que la barra de filtros del dashboard: orden y actividad reciente.
        </p>
        <div className="flex flex-col sm:flex-row flex-wrap gap-4 max-w-xl">
          <div className="space-y-2 flex-1 min-w-[200px]">
            <Label htmlFor="profile-sort">Ordenar por</Label>
            <Select
              value={sortCombo}
              onValueChange={(v) => {
                const [sort, dir] = v.split('-') as [DashboardSortField, SortDirection];
                void updatePreferences({ dashboardSort: sort, dashboardSortDirection: dir });
              }}
            >
              <SelectTrigger id="profile-sort">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="score-desc">Puntuación (mayor primero)</SelectItem>
                <SelectItem value="score-asc">Puntuación (menor primero)</SelectItem>
                <SelectItem value="owner-asc">Propietario (A–Z)</SelectItem>
                <SelectItem value="owner-desc">Propietario (Z–A)</SelectItem>
                <SelectItem value="updated-desc">Actualizado (más reciente)</SelectItem>
                <SelectItem value="updated-asc">Actualizado (más antiguo)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2 flex-1 min-w-[200px]">
            <Label htmlFor="profile-update-filter">Filtro por actividad</Label>
            <Select
              value={preferences.dashboardFilterUpdateType}
              onValueChange={(v) => void updatePreferences({ dashboardFilterUpdateType: v })}
            >
              <SelectTrigger id="profile-update-filter">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Cualquier actividad</SelectItem>
                <SelectItem value="recent">Actualizado en los últimos 7 días</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-base font-medium mb-2">Pestaña Historial (por defecto)</h3>
        <p className="text-sm text-muted-foreground mb-3">
          Tipo de evento de workflow mostrado al abrir la pestaña Historial en un OKR.
        </p>
        <div className="max-w-xs">
          <Select
            value={preferences.historyEventTypeFilter}
            onValueChange={(v) => void updatePreferences({ historyEventTypeFilter: v })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {HISTORY_EVENT_FILTER_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Button variant="outline" size="sm" onClick={() => void resetToDefault()} className="gap-2">
        <RotateCcw className="h-4 w-4" />
        Restablecer todo a valores por defecto
      </Button>
    </div>
  );
}

export default function ProfilePage() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const currentUser = await getCurrentUser();
      if (!currentUser) {
        await login();
        return;
      }
      setUser(currentUser);
      loadProfile();
    } catch (error) {
      console.error('Error loading user:', error);
      await login();
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadProfile();
    }
  }, [user]);

  const loadProfile = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      const data = await api.getProfile();
      setProfile(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      console.error('Error loading profile:', err);
      
      if (errorMessage.includes('404') || errorMessage.includes('not found') || errorMessage.includes('500')) {
        try {
          await new Promise(resolve => setTimeout(resolve, 1000));
          const retryData = await api.getProfile();
          setProfile(retryData);
        } catch (retryErr) {
          console.error('Retry failed:', retryErr);
          setProfile(null);
        }
      } else {
        setProfile(null);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleProfileUpdate = async () => {
    if (user) {
      try {
        const data = await api.getProfile();
        setProfile(data);
        setEditing(false);
      } catch (err) {
        if (err instanceof Error && err.message.includes('404')) {
          // Profile still doesn't exist
        }
      }
    }
  };

  if (isLoading || loading || !user) {
    return (
      <AppLayout title="Settings" description="Account, integrations, and preferences">
        <div className="text-center text-muted-foreground">Loading...</div>
      </AppLayout>
    );
  }

  if (!profile && !editing) {
    return (
      <AppLayout title="Settings" description="Account, integrations, and preferences">
        <div className="space-y-6">
          <Card>
            <CardContent className="pt-6 pb-6">
              <SettingsAccountSection />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-8 text-center">
              <p className="text-muted-foreground mb-4">You haven&apos;t created a profile yet.</p>
              <Button onClick={() => setEditing(true)}>
                Create Profile
              </Button>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  if (editing) {
    return (
      <AppLayout title={profile ? 'Edit Profile' : 'Create Profile'} description="Update your profile information">
        <Card>
          <CardContent className="pt-6">
            <div className="mb-6 flex items-center justify-between">
              {profile && (
                <Button variant="ghost" onClick={() => setEditing(false)}>
                  Cancel
                </Button>
              )}
            </div>
            <ProfileForm profile={profile || undefined} onSuccess={handleProfileUpdate} />
          </CardContent>
        </Card>
      </AppLayout>
    );
  }

  if (!profile) return null;

  return (
    <AppLayout title="Settings" description="Account, integrations, and preferences">
      <Card className="overflow-hidden">
        {/* Profile Header */}
        <div className="bg-gradient-to-r from-primary to-purple-600 px-6 py-12">
          <div className="flex items-center space-x-6">
            {profile.profileImageUrl ? (
              <div className="relative w-32 h-32 rounded-full overflow-hidden border-4 border-white shadow-lg flex-shrink-0">
                <Image
                  src={profile.profileImageUrl}
                  alt={profile.displayName}
                  fill
                  className="object-cover"
                />
              </div>
            ) : (
              <div className="w-32 h-32 rounded-full bg-white bg-opacity-20 flex items-center justify-center flex-shrink-0">
                <span className="text-5xl text-white font-bold">
                  {profile.displayName.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
            <div className="flex-1 text-white">
              <h1 className="text-4xl font-bold mb-2">{profile.displayName}</h1>
              {user?.email && (
                <p className="text-white/80 text-lg">{user.email}</p>
              )}
            </div>
            <Button
              onClick={() => setEditing(true)}
              variant="secondary"
            >
              Edit Profile
            </Button>
          </div>
        </div>

        {/* Profile Content */}
        <CardContent className="px-6 py-8">
          <SettingsAccountSection />

          <div className="border-t pt-8 mt-8 space-y-6">
          {profile.bio && (
            <div className="mb-6">
              <h2 className="text-xl font-semibold mb-2">About</h2>
              <p className="text-muted-foreground leading-relaxed">{profile.bio}</p>
            </div>
          )}

          <div className="border-t pt-6 mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Member since</span>
                <p className="font-medium">
                  {profile.createdAt
                    ? new Date(profile.createdAt).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })
                    : 'N/A'}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">Last updated</span>
                <p className="font-medium">
                  {profile.updatedAt
                    ? new Date(profile.updatedAt).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })
                    : 'N/A'}
                </p>
              </div>
            </div>
          </div>

          <div className="border-t pt-6 mt-6">
            <ProfileCustomizableViews />
          </div>

          <div className="border-t pt-6 mt-6">
            <IntegrationsSection />
          </div>

          <div className="border-t pt-6 mt-6">
            <ProfileIntegrationsDemo />
          </div>

          <div className="mt-8 flex space-x-4">
            <Button asChild>
              <Link href="/dashboard">Go to Dashboard</Link>
            </Button>
            <Button variant="outline" onClick={() => setEditing(true)}>
              Edit Profile
            </Button>
          </div>
          </div>
        </CardContent>
      </Card>
    </AppLayout>
  );
}
