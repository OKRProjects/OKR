'use client';

import { useEffect, useState } from 'react';
import { getCurrentUser, login, User } from '@/lib/auth';
import { AppLayout } from '@/components/AppLayout';
import { DashboardView } from '@/components/DashboardView';

export default function Dashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

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
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <AppLayout title="Dashboard" description="Overview of your OKR performance">
        <div className="text-center text-muted-foreground">Loading...</div>
      </AppLayout>
    );
  }

  if (!user) return null;

  return (
    <AppLayout title="Dashboard" description="Overview of your OKR performance">
      <DashboardView />
    </AppLayout>
  );
}
