'use client';

import Link from 'next/link';
import { useLanguage } from '@/contexts/LanguageContext';
import { t } from '@/lib/i18n';
import { requiredPlan } from '@/lib/plan-gates';
import styles from './UpgradePrompt.module.css';

/**
 * UpgradePrompt — shown when a user tries to access a feature not available on their plan.
 * 
 * @param {Object} props
 * @param {string} props.feature - Feature key (e.g. 'goals', 'chat', 'export')
 * @param {'inline'|'overlay'} [props.variant='inline'] - Display mode
 * @param {string} [props.className] - Optional additional className
 */
export default function UpgradePrompt({ feature, variant = 'inline', className = '' }) {
  const { lang } = useLanguage();
  const plan = requiredPlan(feature);
  const planName = plan.charAt(0).toUpperCase() + plan.slice(1);

  const T = (key) => t(`upgrade.${key}`, lang);

  return (
    <div className={`${styles.wrapper} ${variant === 'overlay' ? styles.overlay : styles.inline} ${className}`}>
      <div className={styles.card}>
        <div className={styles.iconWrap}>
          <svg className={styles.lockIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
        </div>

        <h3 className={styles.title}>
          {T('title')} {planName}
        </h3>

        <p className={styles.description}>
          {T('featurePrefix')} <strong>{T(`features.${feature}`)}</strong> {T('featureSuffix')} {planName}.
        </p>

        <div className={styles.actions}>
          <Link href="/pricing" className={styles.upgradeBtn}>
            {T('upgradeNow')}
          </Link>
          <Link href="/pricing" className={styles.learnMore}>
            {T('learnMore')}
          </Link>
        </div>
      </div>
    </div>
  );
}
