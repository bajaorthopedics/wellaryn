'use client';

import { LanguageProvider } from '@/contexts/LanguageContext';

export default function LegalLayout({ children }) {
  return (
    <LanguageProvider>
      {children}
    </LanguageProvider>
  );
}
