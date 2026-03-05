'use client';

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { getCurrentUser } from '@/lib/auth';

const VIEW_AS_KEY = 'viewAsRole';

export type ViewRole = 'developer' | 'view_only';

type ViewRoleContextValue = {
  effectiveRole: ViewRole;
  setEffectiveRole: (role: ViewRole) => void;
  actualRole: string | undefined;
};

const ViewRoleContext = createContext<ViewRoleContextValue | null>(null);

function getStoredViewRole(): ViewRole | null {
  if (typeof window === 'undefined') return null;
  const v = localStorage.getItem(VIEW_AS_KEY);
  if (v === 'view_only' || v === 'developer') return v;
  return null;
}

export function ViewRoleProvider({ children }: { children: React.ReactNode }) {
  const [actualRole, setActualRole] = useState<string | undefined>(undefined);
  const [override, setOverrideState] = useState<ViewRole | null>(() => getStoredViewRole());

  useEffect(() => {
    getCurrentUser().then((u) => setActualRole(u?.role)).catch(() => setActualRole(undefined));
  }, []);

  const setEffectiveRole = useCallback((role: ViewRole) => {
    if (typeof window !== 'undefined') localStorage.setItem(VIEW_AS_KEY, role);
    setOverrideState(role);
  }, []);

  const effectiveRole: ViewRole =
    override ?? (actualRole === 'view_only' ? 'view_only' : 'developer');

  return (
    <ViewRoleContext.Provider value={{ effectiveRole, setEffectiveRole, actualRole }}>
      {children}
    </ViewRoleContext.Provider>
  );
}

export function useViewRole(): ViewRoleContextValue {
  const ctx = useContext(ViewRoleContext);
  if (!ctx) {
    return {
      effectiveRole: 'developer',
      setEffectiveRole: () => {},
      actualRole: undefined,
    };
  }
  return ctx;
}
