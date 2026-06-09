'use client';

import { useState, useEffect } from 'react';
import styles from './CookieConsent.module.css';

const CONSENT_KEY = 'wellaryn-cookie-consent';

export default function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      const consent = localStorage.getItem(CONSENT_KEY);
      if (!consent) {
        // Show after 1.5s delay
        const timer = setTimeout(() => setVisible(true), 1500);
        return () => clearTimeout(timer);
      }
    } catch {
      // localStorage not available
    }
  }, []);

  const handleAccept = () => {
    try { localStorage.setItem(CONSENT_KEY, 'accepted'); } catch {}
    setVisible(false);
  };

  const handleDecline = () => {
    try { localStorage.setItem(CONSENT_KEY, 'declined'); } catch {}
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className={`${styles.banner} ${visible ? styles.bannerVisible : ''}`}>
      <div className={styles.content}>
        <p className={styles.text}>
          Usamos cookies esenciales para el funcionamiento del sitio y analytics sin cookies (Plausible) para mejorar tu experiencia.
          <a href="/legal/privacy" className={styles.link}> Política de Privacidad</a>
        </p>
      </div>
      <div className={styles.actions}>
        <button className={styles.acceptBtn} onClick={handleAccept}>
          Aceptar
        </button>
        <button className={styles.declineBtn} onClick={handleDecline}>
          Solo esenciales
        </button>
      </div>
    </div>
  );
}
