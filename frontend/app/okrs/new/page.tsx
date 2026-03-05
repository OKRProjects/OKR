'use client';

import { useEffect, useState } from 'react';
import { getCurrentUser, login, User } from '@/lib/auth';
import { AppLayout } from '@/components/AppLayout';
import ObjectiveForm from '@/components/ObjectiveForm';
import { api, Objective } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { TutorialOverlay } from '@/components/shared/TutorialOverlay';
import { useFirstTimeTutorial, getNewOKRTutorialSteps } from '@/lib/tutorial';
import { Button } from '@/components/ui/button';
import { HelpCircle } from 'lucide-react';

export default function NewObjectivePage() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [parentOptions, setParentOptions] = useState<Objective[]>([]);
  const { shouldShowTutorial, dismissTutorial } = useFirstTimeTutorial('new_okr');
  const [showTutorial, setShowTutorial] = useState(false);

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
      <div className="flex items-center justify-between gap-2 mb-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowTutorial(true)}
          className="text-muted-foreground hover:text-foreground"
        >
          <HelpCircle className="mr-2 h-4 w-4" />
          Take the tour
        </Button>
      </div>
      <Card className="max-w-2xl">
        <CardContent className="pt-6">
          <ObjectiveForm parentOptions={parentOptions} />
        </CardContent>
      </Card>
      {(showTutorial || shouldShowTutorial) && (
        <TutorialOverlay
          steps={getNewOKRTutorialSteps()}
          contextName="New OKR"
          onDismiss={() => { setShowTutorial(false); dismissTutorial(); }}
        />
      )}
    </AppLayout>
  );
}
