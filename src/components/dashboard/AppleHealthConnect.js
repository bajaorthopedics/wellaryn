'use client';

import styles from './OuraConnect.module.css';

const labels = {
  sectionTitle:     { en: 'Apple Health',                  es: 'Apple Health' },
  description:      { en: 'Apple Health syncs through the Wellaryn iOS app using HealthKit. Web-based syncing is not supported by Apple.',
                      es: 'Apple Health se sincroniza a través de la app de Wellaryn para iOS usando HealthKit. Apple no admite la sincronización web.' },
  badge:            { en: 'Available in iOS App',          es: 'Disponible en la App iOS' },
  features:         {
    en: ['Heart Rate & HRV', 'Sleep Analysis', 'Workouts & Activity', 'Steps & Distance'],
    es: ['Frecuencia Cardíaca y VFC', 'Análisis de Sueño', 'Entrenamientos y Actividad', 'Pasos y Distancia'],
  },
  comingSoon:       { en: 'Coming Soon',                   es: 'Próximamente' },
};

export default function AppleHealthConnect({ lang = 'en' }) {
  const L = (key) => labels[key]?.[lang] || labels[key]?.en || key;
  const features = labels.features[lang] || labels.features.en;

  return (
    <div className={styles.container}>
      {/* Header with icon */}
      <div className={styles.header}>
        <div className={styles.iconWrap}>
          <div className={styles.ringIcon}
               style={{ background: 'linear-gradient(135deg, hsla(0, 100%, 62%, 0.12), hsla(0, 100%, 62%, 0.04))' }}>
            ❤️
          </div>
        </div>
        <div className={styles.headerText}>
          <span className={styles.deviceName}>{L('sectionTitle')}</span>
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            fontSize: 'var(--font-size-xs)',
            fontWeight: 600,
            color: '#FF3B30',
            opacity: 0.85,
          }}>
            📱 {L('badge')}
          </span>
        </div>
      </div>

      {/* Info content */}
      <div className={styles.disconnectedState}>
        <p className={styles.description}>{L('description')}</p>
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '6px',
          marginTop: '4px',
        }}>
          {features.map((feat, i) => (
            <span key={i} style={{
              padding: '4px 10px',
              fontSize: 'var(--font-size-xs)',
              fontWeight: 500,
              color: 'var(--text-secondary)',
              background: 'var(--bg-elevated)',
              borderRadius: 'var(--radius-full)',
              border: '1px solid var(--border-subtle)',
            }}>
              {feat}
            </span>
          ))}
        </div>
        <button
          className={styles.connectBtn}
          disabled
          style={{
            background: 'var(--bg-elevated)',
            color: 'var(--text-muted)',
            boxShadow: 'none',
            cursor: 'not-allowed',
            opacity: 0.7,
            border: '1px solid var(--border-subtle)',
            marginTop: '8px',
          }}
        >
          {L('comingSoon')}
        </button>
      </div>
    </div>
  );
}
