'use client';

import { useLanguage } from '@/contexts/LanguageContext';
import { t } from '@/lib/i18n';
import styles from './Disclaimer.module.css';

export default function Disclaimer() {
  const { lang } = useLanguage();

  return (
    <div className={styles.disclaimer} id="disclaimer">
      <span className={styles.icon} aria-hidden="true">⚕️</span>
      <p className={styles.text}>{t('dashboard.disclaimer', lang)}</p>
    </div>
  );
}
