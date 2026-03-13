'use client';

import React from 'react';
import { Sidebar } from './Sidebar';
import { UserMenu } from './UserMenu';
import { useRouter } from 'next/navigation';
import { Button } from './ui/button';
import { Plus } from 'lucide-react';

interface AppLayoutProps {
  children: React.ReactNode;
  title?: string;
  description?: string;
  showNewObjective?: boolean;
  /** When true, hide the top header (e.g. dashboard has its own header with user menu). */
  hideHeader?: boolean;
}

export function AppLayout({ children, title, description, showNewObjective = false, hideHeader = false }: AppLayoutProps) {
  const router = useRouter();

  const handleNewObjective = () => {
    router.push('/okrs/new');
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Sidebar */}
      <Sidebar onNewObjective={handleNewObjective} />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header: title/description left, user menu right (hidden when hideHeader, e.g. dashboard) */}
        {!hideHeader && (
          <header className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-background px-6">
            <div className="min-w-0">
              {title && (
                <>
                  <h1 className="text-lg font-semibold tracking-tight">{title}</h1>
                  {description && (
                    <span className="ml-3 text-sm text-muted-foreground hidden sm:inline">— {description}</span>
                  )}
                </>
              )}
            </div>
            <div className="shrink-0">
              <UserMenu />
            </div>
          </header>
        )}

        {/* Content Area */}
        <main className="flex-1 overflow-y-auto p-6">
          <div className="mx-auto max-w-7xl">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
