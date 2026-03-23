'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getCurrentUser, login, User } from '@/lib/auth';
import { AppLayout } from '@/components/AppLayout';
import ObjectiveForm from '@/components/ObjectiveForm';
import { userCanCreateObjectives } from '@/lib/roles';
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

  if (!userCanCreateObjectives(user.role)) {
    return (
      <AppLayout
        title="Create objective"
        description="Restricted to leadership roles"
      >
        <Card className="max-w-xl">
          <CardContent className="space-y-4 pt-6 text-muted-foreground">
            <p>
              OKRs are owned starting at the <strong className="text-foreground">manager</strong> level. Your account is
              not assigned a role that can create objectives (for example viewer or individual contributor).
            </p>
            <p>
              Ask an admin to assign a leadership role if you should own OKRs, or browse{' '}
              <Link href="/divisions" className="text-primary underline underline-offset-4">
                Organization
              </Link>{' '}
              and{' '}
              <Link href="/my-okrs" className="text-primary underline underline-offset-4">
                My OKRs
              </Link>{' '}
              to follow progress.
            </p>
            <p>
              <Link href="/docs#ownership" className="text-primary font-medium">
                Who owns and edits OKRs →
              </Link>
            </p>
          </CardContent>
        </Card>
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
