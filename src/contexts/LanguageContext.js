'use client';

import { createContext, useContext, useState, useEffect, useCallback } from 'react';

const LanguageContext = createContext({ lang: 'en', setLang: () => {}, toggleLang: () => {} });

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState('en');
  const [mounted, setMounted] = useState(false);

  // Load saved language on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('wellaryn-lang');
      if (saved === 'es' || saved === 'en') {
        setLangState(saved);
      } else {
        // Auto-detect from browser
        const browserLang = navigator.language?.toLowerCase();
        if (browserLang?.startsWith('es')) {
          setLangState('es');
        }
      }
    } catch (e) {
      // localStorage not available
    }
    setMounted(true);
  }, []);

  const setLang = useCallback((newLang) => {
    setLangState(newLang);
    try {
      localStorage.setItem('wellaryn-lang', newLang);
    } catch (e) {
      // localStorage not available
    }
  }, []);

  const toggleLang = useCallback(() => {
    setLang(lang === 'en' ? 'es' : 'en');
  }, [lang, setLang]);

  // Prevent hydration mismatch — render children only after mount
  if (!mounted) {
    return (
      <LanguageContext.Provider value={{ lang: 'en', setLang, toggleLang }}>
        {children}
      </LanguageContext.Provider>
    );
  }

  return (
    <LanguageContext.Provider value={{ lang, setLang, toggleLang }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}

export default LanguageContext;
