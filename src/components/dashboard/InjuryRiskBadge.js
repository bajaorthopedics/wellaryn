'use client';

import { useLanguage } from '@/contexts/LanguageContext';
import { t } from '@/lib/i18n';
import styles from './InjuryRiskBadge.module.css';

export default function InjuryRiskBadge({ risk = 'optimal', label = {}, factor = {}, acwr }) {
  const { lang } = useLanguage();
  const riskClass = styles[risk] || styles.optimal;

  const displayLabel = (label && typeof label === 'object')
    ? (label[lang] || label.en || '')
    : label;

  const displayFactor = (factor && typeof factor === 'object')
    ? (factor[lang] || factor.en || '')
    : factor;

  return (
    <div className={`${styles.badge} ${riskClass}`} id="injury-risk-badge">
      <span className={styles.header}>{t('dashboard.widgets.injuryRisk', lang)}</span>

      <div className={styles.riskDisplay}>
        <span className={styles.riskIcon}>
          {risk === 'optimal' ? '✅' : risk === 'moderate' ? '⚠️' : risk === 'high' ? '🔴' : 'ℹ️'}
        </span>
        <span className={styles.riskLabel}>{displayLabel}</span>
      </div>

      {displayFactor && (
        <div className={styles.factorWrapper}>
          <span className={styles.factorPrefix}>{t('dashboard.risk.factor_prefix', lang)}</span>
          <span className={styles.factorText}>{displayFactor}</span>
        </div>
      )}

      {acwr !== null && acwr !== undefined && (
        <span className={styles.acwr}>
          {t('dashboard.risk.acwr_label', lang)}: {acwr}
        </span>
      )}
    </div>
  );
}
