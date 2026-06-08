'use client';

import { useState, useEffect, useCallback } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { t } from '@/lib/i18n';
import styles from './PWAInstallPrompt.module.css';

const DISMISS_KEY = 'wellaryn-pwa-dismissed';
const DISMISS_DAYS = 7;

function isIOS() {
  if (typeof navigator === 'undefined') return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

function isInStandaloneMode() {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
}

export default function PWAInstallPrompt() {
  const { lang } = useLanguage();
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [visible, setVisible] = useState(false);
  const [iosMode, setIosMode] = useState(false);

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

    // Already installed
    if (isInStandaloneMode()) return;

    // iOS Safari — show manual instructions
    if (isIOS()) {
      setIosMode(true);
      setTimeout(() => setVisible(true), 2000);
      return;
    }

    // Android/Chrome — beforeinstallprompt
    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
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

  const iosTitle = lang === 'es' ? 'Instala Wellaryn' : 'Install Wellaryn';
  const iosSubtitle = lang === 'es'
    ? 'Toca el botón Compartir ⬆ y selecciona "Agregar a pantalla de inicio"'
    : 'Tap the Share button ⬆ and select "Add to Home Screen"';

  return (
    <div className={`${styles.banner} ${visible ? styles.bannerVisible : ''}`}>
      <div className={styles.content}>
        <div className={styles.iconWrap}>
          <img src="/icons/icon.svg" alt="Wellaryn" className={styles.icon} />
        </div>
        <div className={styles.text}>
          <p className={styles.title}>{iosMode ? iosTitle : t('pwa.installTitle', lang)}</p>
          <p className={styles.subtitle}>{iosMode ? iosSubtitle : t('pwa.installSubtitle', lang)}</p>
        </div>
      </div>
      <div className={styles.actions}>
        {!iosMode && (
          <button className={styles.installBtn} onClick={handleInstall}>
            {t('pwa.install', lang)}
          </button>
        )}
        <button className={styles.dismissBtn} onClick={handleDismiss}>
          {iosMode ? 'OK' : t('pwa.notNow', lang)}
        </button>
      </div>
    </div>
  );
}

