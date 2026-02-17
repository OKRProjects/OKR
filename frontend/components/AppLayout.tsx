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
        {/* Header */}
        {title && (
          <header className="flex h-16 items-center justify-between border-b bg-card px-6">
            <div>
              <h1 className="text-2xl font-bold">{title}</h1>
              {description && (
                <p className="text-sm text-muted-foreground">{description}</p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                FY {new Date().getFullYear()} Q{Math.floor((new Date().getMonth() + 3) / 3)}
              </span>
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
