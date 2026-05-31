import styles from './InjuryRiskBadge.module.css';

export default function InjuryRiskBadge({ risk = 'optimal', riskPercent = 0, label = '', acwr }) {
  const riskClass = styles[risk] || styles.optimal;

  return (
    <div className={`${styles.badge} ${riskClass}`} id="injury-risk-badge">
      <span className={styles.header}>Injury Risk</span>
      <div className={styles.percentWrapper}>
        <span className={styles.percent}>
          {riskPercent}
          <span className={styles.percentSymbol}>%</span>
        </span>
      </div>
      <span className={styles.label}>{label}</span>
      {acwr !== null && acwr !== undefined && (
        <span className={styles.acwr}>ACWR: {acwr}</span>
      )}
    </div>
  );
}
