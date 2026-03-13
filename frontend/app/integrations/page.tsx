'use client';

import { useEffect, useState } from 'react';
import { getCurrentUser, login, User } from '@/lib/auth';
import { AppLayout } from '@/components/AppLayout';
import { IntegrationsSection } from '@/components/IntegrationsSection';

export default function IntegrationsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

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
    } catch (error) {
      console.error('Error loading user:', error);
      await login();
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <AppLayout title="Integrations" description="Webhooks and external channels">
        <div className="text-center text-muted-foreground">Loading...</div>
      </AppLayout>
    );
  }

  if (!user) return null;

  return (
    <AppLayout title="Integrations" description="Slack, Teams, and webhooks">
      <div className="space-y-8 max-w-2xl">
        <IntegrationsSection />
      </div>
    </AppLayout>
  );
}
