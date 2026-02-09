'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { trackPageView } from '@/hooks/useTracking';

export default function PageViewTracker() {
  const pathname = usePathname();

  useEffect(() => {
    // ダッシュボードページは除外
    if (pathname && !pathname.includes('editor-secret-dashboard')) {
      trackPageView(pathname);
    }
  }, [pathname]);

  return null;
}
