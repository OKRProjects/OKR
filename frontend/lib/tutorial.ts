'use client';

const STORAGE_PREFIX = 'okr_tutorial_';

export function useFirstTimeTutorial(key: string): {
  hasSeenTutorial: boolean;
  dismissTutorial: () => void;
  shouldShowTutorial: boolean;
} {
  if (typeof window === 'undefined') {
    return { hasSeenTutorial: true, dismissTutorial: () => {}, shouldShowTutorial: false };
  }
  const storageKey = `${STORAGE_PREFIX}${key}`;
  const seen = localStorage.getItem(storageKey) === '1';

  const dismissTutorial = () => {
    try {
      localStorage.setItem(storageKey, '1');
    } catch {
      // ignore
    }
  };

  return {
    hasSeenTutorial: seen,
    dismissTutorial,
    shouldShowTutorial: !seen,
  };
}

export interface TutorialStep {
  id: string;
  title: string;
  body: string;
  /** Optional selector or ref target for highlight (not used in minimal version) */
  target?: string;
}

export function getDashboardTutorialSteps(): TutorialStep[] {
  return [
    {
      id: 'intro',
      title: 'Welcome to the OKR Dashboard',
      body: 'Here you can see all objectives by tier: Strategic (annual), Divisional (annual), and Tactical (quarterly). Use the filters to narrow by search, tier, department, status, or score.',
    },
    {
      id: 'cards',
      title: 'OKR cards',
      body: 'Click any card to open the full OKR detail: overview, progress, dependencies, files, and history. Use "Present" for an executive-style slide view.',
    },
    {
      id: 'done',
      title: 'You\'re all set',
      body: 'Create new objectives from the OKRs page. Add key results and update scores in the Progress tab to keep roll-ups accurate.',
    },
  ];
}

export function getNewOKRTutorialSteps(): TutorialStep[] {
  return [
    {
      id: 'form',
      title: 'Create your objective',
      body: 'Enter a clear title and optional description. Choose the level (Strategic, Functional, or Tactical) and fiscal year. For Tactical objectives, select a quarter.',
    },
    {
      id: 'key-results',
      title: 'Add key results after saving',
      body: 'Once the objective is created, open it and add measurable key results with targets and units. Update their scores in the Progress tab as you go.',
    },
  ];
}
