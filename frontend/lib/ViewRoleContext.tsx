'use client';

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { getCurrentUser, clearUserCache, type User } from '@/lib/auth';

const VIEW_AS_KEY = 'viewAsRole';

export type ViewRole = 'developer' | 'view_only';

export type AppRole = 'admin' | 'leader' | 'standard' | 'view_only' | 'developer';

type ViewRoleContextValue = {
  effectiveRole: ViewRole;
  setEffectiveRole: (role: ViewRole) => void;
  actualRole: string | undefined;
  /** Current user from backend (role, departmentId). Refetched on focus so permission changes apply. */
  user: User | null;
  refetchUser: () => Promise<void>;
};

const ViewRoleContext = createContext<ViewRoleContextValue | null>(null);

function getStoredViewRole(): ViewRole | null {
  if (typeof window === 'undefined') return null;
  const v = localStorage.getItem(VIEW_AS_KEY);
  if (v === 'view_only' || v === 'developer') return v;
  return null;
}

export function ViewRoleProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [override, setOverrideState] = useState<ViewRole | null>(() => getStoredViewRole());

  const refetchUser = useCallback(async () => {
    try {
      clearUserCache();
      const u = await getCurrentUser();
      setUser(u);
    } catch {
      setUser(null);
    }
  }, []);

  useEffect(() => {
    refetchUser();
  }, [refetchUser]);

  useEffect(() => {
    const onVisibilityChange = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        refetchUser();
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => document.removeEventListener('visibilitychange', onVisibilityChange);
  }, [refetchUser]);

  const setEffectiveRole = useCallback((role: ViewRole) => {
    if (typeof window !== 'undefined') localStorage.setItem(VIEW_AS_KEY, role);
    setOverrideState(role);
  }, []);

  const actualRole = user?.role;
  const effectiveRole: ViewRole =
    override ?? (actualRole === 'view_only' ? 'view_only' : 'developer');

  return (
    <ViewRoleContext.Provider value={{ effectiveRole, setEffectiveRole, actualRole, user, refetchUser }}>
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
      user: null,
      refetchUser: async () => {},
    };
  }
  return ctx;
}
