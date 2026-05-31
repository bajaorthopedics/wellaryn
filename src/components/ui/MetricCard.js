import styles from './MetricCard.module.css';

export default function MetricCard({ label, value, unit, trend, change }) {
  const trendArrow = trend === 'up' ? '↑' : trend === 'down' ? '↓' : '→';
  const trendClass = trend === 'up' ? styles.trendUp : trend === 'down' ? styles.trendDown : styles.trendFlat;
  const changeColor = trend === 'up' ? styles.trendUp : trend === 'down' ? styles.trendDown : styles.trendFlat;

  return (
    <div className={styles.card} id={`metric-${label?.toLowerCase().replace(/\s+/g, '-')}`}>
      <span className={styles.label}>{label}</span>
      <div className={styles.valueRow}>
        <span className={styles.value}>{value}</span>
        {unit && <span className={styles.unit}>{unit}</span>}
      </div>
      {(trend || change !== undefined) && (
        <div className={styles.trendRow}>
          <span className={`${styles.trendArrow} ${trendClass}`}>{trendArrow}</span>
          {change !== undefined && (
            <span className={`${styles.change} ${changeColor}`}>
              {change > 0 ? '+' : ''}{change}%
            </span>
          )}
        </div>
      )}
    </div>
  );
}
