'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { generateMockUser } from '@/lib/mock-data';
import { calculateReadiness } from '@/lib/readiness';
import {
  fetchDailyMetrics,
  metricsToReadinessInput,
  metricsToChartData,
} from '@/lib/supabase/data-service';
import ReadinessGauge from '@/components/dashboard/ReadinessGauge';
import styles from './page.module.css';

const labels = {
  title:          { en: 'Wellaryn Score Breakdown', es: 'Desglose del Puntaje Wellaryn' },
  subtitle:       { en: 'Detailed analysis of your readiness components', es: 'Análisis detallado de tus componentes de preparación' },
  back:           { en: '← Dashboard', es: '← Panel' },
  subScores:      { en: 'Component Scores', es: 'Puntajes por Componente' },
  recommendations:{ en: 'Recommendations', es: 'Recomendaciones' },
  trend:          { en: '7-Day Trend', es: 'Tendencia 7 Días' },
  confidence:     { en: 'Data Confidence', es: 'Confianza de Datos' },
  loading:        { en: 'Loading readiness data…', es: 'Cargando datos de preparación…' },
  noData:         { en: 'No score', es: 'Sin puntaje' },
  confidenceComplete:   { en: 'Complete — baseline established', es: 'Completa — línea base establecida' },
  confidenceCalibrating:{ en: 'Calibrating — keep logging daily', es: 'Calibrando — sigue registrando a diario' },
  confidenceLow:        { en: 'Low — limited data available', es: 'Baja — datos limitados disponibles' },
};

const componentLabels = {
  hrv: {
    icon: '💓',
    name: { en: 'HRV', es: 'VFC' },
    weight: '35%',
  },
  sleep: {
    icon: '🌙',
    name: { en: 'Sleep', es: 'Sueño' },
    weight: '25%',
  },
  acwr: {
    icon: '🏋️',
    name: { en: 'Training Load (ACWR)', es: 'Carga de Entrenamiento (ACWR)' },
    weight: '30%',
  },
  rhr: {
    icon: '❤️',
    name: { en: 'Resting Heart Rate', es: 'FC en Reposo' },
    weight: '10%',
  },
};

function getScoreColor(score) {
  if (score === null || score === undefined) return styles.scoreYellow;
  if (score >= 75) return styles.scoreGreen;
  if (score >= 50) return styles.scoreYellow;
  return styles.scoreRed;
}

function getScoreColorVar(score) {
  if (score === null || score === undefined) return 'var(--text-muted)';
  if (score >= 75) return 'var(--color-green)';
  if (score >= 50) return 'var(--color-yellow)';
  return 'var(--color-red)';
}

function getSubScoreDetail(key, subScores, lang) {
  const sub = subScores[key];
  if (!sub || sub.score === null) {
    return lang === 'es' ? 'Sin datos suficientes' : 'Insufficient data';
  }

  switch (key) {
    case 'hrv':
      return lang === 'es'
        ? `z-score: ${sub.zScore ?? '—'} | Base: ${sub.baseline?.mean ?? '—'} ms`
        : `z-score: ${sub.zScore ?? '—'} | Baseline: ${sub.baseline?.mean ?? '—'} ms`;
    case 'sleep':
      return lang === 'es'
        ? `Ratio: ${sub.ratio ?? '—'} | Deuda: ${sub.debt ?? 0}h`
        : `Ratio: ${sub.ratio ?? '—'} | Debt: ${sub.debt ?? 0}h`;
    case 'acwr':
      return lang === 'es'
        ? `ACWR: ${sub.acwr ?? '—'} | Aguda: ${sub.acuteLoad ?? '—'} | Crónica: ${sub.chronicLoad ?? '—'}`
        : `ACWR: ${sub.acwr ?? '—'} | Acute: ${sub.acuteLoad ?? '—'} | Chronic: ${sub.chronicLoad ?? '—'}`;
    case 'rhr':
      return lang === 'es'
        ? `Desviación: ${sub.deviation > 0 ? '+' : ''}${sub.deviation ?? '—'} bpm vs base`
        : `Deviation: ${sub.deviation > 0 ? '+' : ''}${sub.deviation ?? '—'} bpm vs baseline`;
    default:
      return '';
  }
}

export default function ReadinessPage() {
  const { lang } = useLanguage();
  const { user, profile } = useAuth();
  const [readiness, setReadiness] = useState(null);
  const [trendData, setTrendData] = useState([]);
  const [loading, setLoading] = useState(true);

  const L = (key) => labels[key]?.[lang] || labels[key]?.en || key;

  const loadData = useCallback(async () => {
    setLoading(true);

    if (user) {
      try {
        const metrics = await fetchDailyMetrics(user.id, 60);

        if (metrics && metrics.length > 0) {
          const input = metricsToReadinessInput(metrics, profile);
          if (input) {
            const result = calculateReadiness(input.todayInput, input.historyInput);
            setReadiness(result);

            // Build 7-day trend from recent readiness scores
            const last7 = metrics.slice(-7);
            const trend = last7.map((m) => {
              const dayInput = {
                rmssd: m.hrv_rmssd,
                rhr: m.rhr,
                sleepHours: m.sleep_total,
                sleepNeed: profile?.sleep_need || 8,
                stress: m.stress,
                mood: m.mood,
              };
              try {
                const dayResult = calculateReadiness(dayInput, input.historyInput);
                return { date: m.date, score: dayResult.score, zone: dayResult.zone };
              } catch {
                return { date: m.date, score: null, zone: 'yellow' };
              }
            });
            setTrendData(trend);
            setLoading(false);
            return;
          }
        }
      } catch (err) {
        console.error('Error fetching readiness data:', err);
      }
    }

    // Fallback: mock data
    try {
      const mock = generateMockUser();
      const todayInput = {
        rmssd: mock.today.hrv.rmssd,
        rhr: mock.today.rhr.rhr,
        sleepHours: mock.today.sleep.total,
        sleepNeed: mock.user.settings.sleepNeed,
        stress: mock.today.stress,
        mood: mock.today.mood,
      };
      const historyInput = {
        rmssdHistory: mock.hrvHistory,
        rhrHistory: mock.rhrHistory,
        sleepHistory: mock.sleepHistory,
        loadHistory: mock.loadHistory,
      };
      const result = calculateReadiness(todayInput, historyInput);
      setReadiness(result);

      // Build mock 7-day trend
      const mockTrend = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const variation = Math.round((Math.random() - 0.5) * 16);
        const score = Math.max(0, Math.min(100, result.score + variation));
        mockTrend.push({
          date: d.toISOString().split('T')[0],
          score,
          zone: score >= 80 ? 'green' : score >= 60 ? 'yellow' : score >= 40 ? 'orange' : 'red',
        });
      }
      setTrendData(mockTrend);
    } catch (err) {
      console.error('Error generating mock readiness:', err);
    }

    setLoading(false);
  }, [user, profile]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading || !readiness) {
    return (
      <div className={styles.loading}>
        <div className={styles.spinner} />
        <span className={styles.loadingText}>{L('loading')}</span>
      </div>
    );
  }

  const confidenceClass =
    readiness.confidence === 'complete'
      ? styles.confidenceComplete
      : readiness.confidence === 'calibrating'
        ? styles.confidenceCalibrating
        : styles.confidenceLow;

  const confidenceLabel =
    readiness.confidence === 'complete'
      ? L('confidenceComplete')
      : readiness.confidence === 'calibrating'
        ? L('confidenceCalibrating')
        : L('confidenceLow');

  return (
    <div className={styles.page}>
      <Link href="/dashboard" className={styles.backLink}>{L('back')}</Link>

      <header className={styles.header}>
        <h1 className={styles.title}>{L('title')}</h1>
        <p className={styles.subtitle}>{L('subtitle')}</p>
      </header>

      {/* Gauge */}
      <div className={styles.gaugeSection}>
        <div className={styles.gaugeCard}>
          <ReadinessGauge
            score={readiness.score}
            zone={readiness.zone}
            zoneLabel={readiness.zoneLabel[lang] || readiness.zoneLabel.en}
            size={220}
          />
          <div className={`${styles.confidenceBadge} ${confidenceClass}`}>
            {readiness.confidence === 'complete' ? '✅' : readiness.confidence === 'calibrating' ? '⏳' : '⚠️'}{' '}
            {confidenceLabel}
          </div>
        </div>
      </div>

      {/* Sub-scores */}
      <div className={styles.sectionLabel}>{L('subScores')}</div>
      <div className={styles.subScoresGrid}>
        {['hrv', 'sleep', 'acwr', 'rhr'].map((key) => {
          const comp = componentLabels[key];
          const score = readiness.subScores[key]?.score;
          const displayScore = score !== null && score !== undefined ? score : '—';

          return (
            <div className={styles.subScoreCard} key={key}>
              <div className={styles.subScoreHeader}>
                <span className={styles.subScoreIcon}>{comp.icon}</span>
                <span className={`${styles.subScoreValue} ${getScoreColor(score)}`}>
                  {displayScore}
                </span>
              </div>
              <div className={styles.subScoreName}>
                {comp.name[lang] || comp.name.en}
                <span style={{ color: 'var(--text-muted)', fontWeight: 400, fontSize: 'var(--font-size-xs)', marginLeft: '0.5rem' }}>
                  {comp.weight}
                </span>
              </div>
              <div className={styles.subScoreDetail}>
                {getSubScoreDetail(key, readiness.subScores, lang)}
              </div>
            </div>
          );
        })}
      </div>

      {/* Recommendations */}
      {readiness.recommendations && readiness.recommendations.length > 0 && (
        <div className={styles.recommendationsSection}>
          <div className={styles.sectionLabel}>{L('recommendations')}</div>
          <div className={styles.recList}>
            {readiness.recommendations.map((rec, i) => {
              const priorityClass =
                rec.priority === 'critical' ? styles.priorityCritical
                : rec.priority === 'high' ? styles.priorityHigh
                : rec.priority === 'low' ? styles.priorityLow
                : styles.priorityMedium;

              return (
                <div className={styles.recItem} key={i}>
                  <span className={styles.recIcon}>{rec.icon}</span>
                  <div className={styles.recContent}>
                    <div className={`${styles.recPriority} ${priorityClass}`}>
                      {rec.priority}
                    </div>
                    <div className={styles.recText}>
                      {rec[lang] || rec.en}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 7-day trend */}
      {trendData.length > 0 && (
        <div className={styles.trendSection}>
          <div className={styles.sectionLabel}>{L('trend')}</div>
          <div className={styles.trendList}>
            {trendData.map((day) => (
              <div className={styles.trendDay} key={day.date}>
                <span className={styles.trendDate}>{day.date.slice(5)}</span>
                <span
                  className={styles.trendScore}
                  style={{ color: getScoreColorVar(day.score) }}
                >
                  {day.score ?? '—'}
                </span>
                <div className={styles.trendBar}>
                  <div
                    className={styles.trendBarFill}
                    style={{
                      width: `${day.score ?? 0}%`,
                      background: getScoreColorVar(day.score),
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
