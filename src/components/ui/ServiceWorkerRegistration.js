'use client';

import { useEffect } from 'react';

/**
 * Registers the service worker on mount.
 * This is a client component rendered once in the root layout.
 */
export default function ServiceWorkerRegistration() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .catch((err) => {
          console.warn('Wellaryn SW registration failed:', err);
        });
    }
  }, []);

  return null;
}
