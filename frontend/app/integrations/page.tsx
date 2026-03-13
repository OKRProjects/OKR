'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function IntegrationsRedirectPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/profile');
  }, [router]);
  return (
    <div className="flex min-h-[200px] items-center justify-center text-muted-foreground">
      Redirecting to Settings…
    </div>
  );
}
