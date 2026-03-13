'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getCurrentUser, login, User } from '@/lib/auth';
import { AppLayout } from '@/components/AppLayout';
import { ObjectivesView } from '@/components/ObjectivesView';

export default function OKRsPage() {
  const router = useRouter();
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

  const handleUpdateProgress = (objective: { id: string }) => {
    router.push(`/okrs/${objective.id}?tab=progress`);
  };

  if (isLoading || !user) {
    return (
      <AppLayout title="Objectives" description="Manage strategic, functional, and tactical objectives" showNewObjective>
        <div className="text-center text-muted-foreground">Loading...</div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Objectives" description="Manage strategic, functional, and tactical objectives" showNewObjective>
      <ObjectivesView onUpdateProgress={handleUpdateProgress} />
    </AppLayout>
  );
}
