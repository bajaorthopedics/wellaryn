import styles from './RecommendationList.module.css';

export default function RecommendationList({ recommendations = [], lang = 'en' }) {
  if (recommendations.length === 0) {
    return (
      <div className={styles.container} id="recommendation-list">
        <h3 className={styles.title}>Recommendations</h3>
        <p className={styles.empty}>No recommendations right now ✨</p>
      </div>
    );
  }

  return (
    <div className={styles.container} id="recommendation-list">
      <h3 className={styles.title}>Recommendations</h3>
      <ul className={styles.list}>
        {recommendations.map((rec, index) => (
          <li
            key={index}
            className={`${styles.item} ${styles[rec.priority] || ''}`}
            id={`recommendation-${index}`}
          >
            <span className={styles.icon} aria-hidden="true">{rec.icon}</span>
            <span className={styles.text}>{rec[lang] || rec.en}</span>
            <span className={styles.priorityDot} title={rec.priority} />
          </li>
        ))}
      </ul>
    </div>
  );
}
