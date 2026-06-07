'use client';

import { useState, useEffect, useCallback } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { t } from '@/lib/i18n';
import styles from './PWAInstallPrompt.module.css';

const DISMISS_KEY = 'wellaryn-pwa-dismissed';
const DISMISS_DAYS = 7;

export default function PWAInstallPrompt() {
  const { lang } = useLanguage();
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Check if user already dismissed recently
    try {
      const dismissed = localStorage.getItem(DISMISS_KEY);
      if (dismissed) {
        const dismissedAt = parseInt(dismissed, 10);
        const daysSince = (Date.now() - dismissedAt) / (1000 * 60 * 60 * 24);
        if (daysSince < DISMISS_DAYS) return;
      }
    } catch {
      // localStorage not available
    }

    // Check if already installed (standalone mode)
    if (window.matchMedia('(display-mode: standalone)').matches) return;

    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      // Small delay so it doesn't pop immediately on page load
      setTimeout(() => setVisible(true), 2000);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = useCallback(async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setVisible(false);
    }
    setDeferredPrompt(null);
  }, [deferredPrompt]);

  const handleDismiss = useCallback(() => {
    setVisible(false);
    setDeferredPrompt(null);
    try {
      localStorage.setItem(DISMISS_KEY, Date.now().toString());
    } catch {
      // localStorage not available
    }
  }, []);

  if (!visible) return null;

  return (
    <div className={`${styles.banner} ${visible ? styles.bannerVisible : ''}`}>
      <div className={styles.content}>
        <div className={styles.iconWrap}>
          <img src="/icons/icon.svg" alt="Wellaryn" className={styles.icon} />
        </div>
        <div className={styles.text}>
          <p className={styles.title}>{t('pwa.installTitle', lang)}</p>
          <p className={styles.subtitle}>{t('pwa.installSubtitle', lang)}</p>
        </div>
      </div>
      <div className={styles.actions}>
        <button className={styles.installBtn} onClick={handleInstall}>
          {t('pwa.install', lang)}
        </button>
        <button className={styles.dismissBtn} onClick={handleDismiss}>
          {t('pwa.notNow', lang)}
        </button>
      </div>
    </div>
  );
}
