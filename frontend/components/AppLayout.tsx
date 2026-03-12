'use client';

import React from 'react';
import { Sidebar } from './Sidebar';
import { useRouter } from 'next/navigation';
import { Button } from './ui/button';
import { Plus } from 'lucide-react';

interface AppLayoutProps {
  children: React.ReactNode;
  title?: string;
  description?: string;
  showNewObjective?: boolean;
}

export function AppLayout({ children, title, description, showNewObjective = false }: AppLayoutProps) {
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
        {/* Header: minimal so dashboard owns its title and cycle */}
        {title && (
          <header className="flex h-14 shrink-0 items-center border-b border-border bg-background px-6">
            <h1 className="text-lg font-semibold tracking-tight">{title}</h1>
            {description && (
              <span className="ml-3 text-sm text-muted-foreground hidden sm:inline">— {description}</span>
            )}
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
