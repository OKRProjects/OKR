'use client';

import { useEffect, useState } from 'react';
import { getCurrentUser, login, User } from '@/lib/auth';
import { AppLayout } from '@/components/AppLayout';
import ObjectiveForm from '@/components/ObjectiveForm';
import { api, Objective } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';

export default function NewObjectivePage() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [parentOptions, setParentOptions] = useState<Objective[]>([]);

  useEffect(() => {
    loadUser();
  }, []);

  useEffect(() => {
    if (user) loadParents();
  }, [user]);

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

  const loadParents = async () => {
    try {
      const year = new Date().getFullYear();
      const all = await api.getObjectives({ fiscalYear: year });
      setParentOptions(all);
    } catch {
      setParentOptions([]);
    }
  };

  if (isLoading || !user) {
    return (
      <AppLayout title="Create Objective" description="Create a new objective">
        <div className="text-center text-muted-foreground">Loading...</div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Create Objective" description="Create a new objective">
      <Card className="max-w-2xl">
        <CardContent className="pt-6">
          <ObjectiveForm parentOptions={parentOptions} />
        </CardContent>
      </Card>
    </AppLayout>
  );
}
