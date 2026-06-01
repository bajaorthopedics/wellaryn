'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { generateMockUser } from '@/lib/mock-data';
import { calculateWellarynScore } from '@/lib/wellaryn-score';
import {
  fetchDailyMetrics,
  metricsToWellarynInput,
} from '@/lib/supabase/data-service';
import ReadinessGauge from '@/components/dashboard/ReadinessGauge';
import styles from './page.module.css';

const labels = {
  title:          { en: 'Wellaryn Score Breakdown', es: 'Desglose del Puntaje Wellaryn' },
  subtitle:       { en: 'Detailed analysis of your 5 score components', es: 'Análisis detallado de tus 5 componentes' },
  back:           { en: '← Dashboard', es: '← Panel' },
  subScores:      { en: 'Component Scores', es: 'Puntajes por Componente' },
  recommendation: { en: 'Recommendation', es: 'Recomendación' },
  trend:          { en: '7-Day Trend', es: 'Tendencia 7 Días' },
  confidence:     { en: 'Data Confidence', es: 'Confianza de Datos' },
  loading:        { en: 'Loading readiness data…', es: 'Cargando datos de preparación…' },
  noData:         { en: 'No score', es: 'Sin puntaje' },
  confidenceHigh:   { en: 'Complete — baseline established', es: 'Completa — línea base establecida' },
  confidenceMed:    { en: 'Calibrating — keep logging daily', es: 'Calibrando — sigue registrando a diario' },
  confidenceLow:    { en: 'Low — limited data available', es: 'Baja — datos limitados disponibles' },
};

// The 5 Wellaryn Score components
const componentLabels = {
  recovery: {
    icon: '🌙',
    name: { en: 'Recovery', es: 'Recuperación' },
    weight: '30%',
    detail: (score, lang) => lang === 'es'
      ? `Sueño, calidad del sueño y actividades de recuperación`
      : `Sleep, sleep quality, and recovery activities`,
  },
  readiness: {
    icon: '🧠',
    name: { en: 'Readiness', es: 'Preparación' },
    weight: '25%',
    detail: (score, lang) => lang === 'es'
      ? `Energía, motivación, estrés y fatiga`
      : `Energy, motivation, stress, and fatigue`,
  },
  trainingLoad: {
    icon: '🏋️',
    name: { en: 'Training Load', es: 'Carga de Entrenamiento' },
    weight: '20%',
    detail: (score, lang) => lang === 'es'
      ? `Ratio aguda:crónica (ACWR) de carga de trabajo`
      : `Acute:Chronic Workload Ratio (ACWR)`,
  },
  injuryRisk: {
    icon: '🩹',
    name: { en: 'Injury Risk', es: 'Riesgo de Lesión' },
    weight: '15%',
    detail: (score, lang) => lang === 'es'
      ? `Dolor, molestias musculares y áreas afectadas`
      : `Pain, muscle soreness, and affected areas`,
  },
  lifestyle: {
    icon: '🥤',
    name: { en: 'Lifestyle', es: 'Estilo de Vida' },
    weight: '10%',
    detail: (score, lang) => lang === 'es'
      ? `Regularidad del sueño, hidratación y hábitos`
      : `Sleep regularity, hydration, and habits`,
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

function categoryToZone(category) {
  switch (category) {
    case 'Peak State':
    case 'Optimal':
      return 'green';
    case 'Productive':
    case 'Caution':
      return 'yellow';
    case 'Recovery Required':
      return 'red';
    default:
      return 'yellow';
  }
}

// Build mock wellaryn input for fallback
function buildMockWellarynInput(mock) {
  return {
    recovery: {
      sleepHours: mock.today.sleep.total,
      sleepQuality: 7,
      hasRecoveryEntry: false,
    },
    readiness: {
      hasCheckin: true,
      energy: mock.today.mood || 7,
      motivation: 7,
      stress: Math.round((mock.today.stress || 30) / 10) || 3,
      fatigue: 3,
    },
    trainingLoad: {
      sessions: mock.loadHistory.slice(-14).map((load, i) => ({
        date: new Date(Date.now() - (13 - i) * 86400000).toISOString().split('T')[0],
        durationMinutes: load > 0 ? Math.round(load / 5) : 0,
        intensity: load > 0 ? Math.min(10, Math.max(1, Math.round(load / 50))) : 0,
      })).filter(s => s.durationMinutes > 0),
      today: new Date(),
    },
    injuryRisk: {
      hasCheckin: true,
      painLevel: 2,
      muscleSoreness: 3,
      currentPainAreaCount: 0,
      hasInjuryHistory: false,
    },
    lifestyle: {
      bedtimeMinutes: [],
      wakeTimeMinutes: [],
      recoveryDaysCount: 0,
      hasCheckin: true,
      waterGlasses: 6,
      alcoholDrinks: 0,
      lateCaffeine: false,
    },
    distinctDays: 14,
  };
}

export default function ReadinessPage() {
  const { lang } = useLanguage();
  const { user, profile } = useAuth();
  const [wellarynResult, setWellarynResult] = useState(null);
  const [trendData, setTrendData] = useState([]);
  const [loading, setLoading] = useState(true);

  const L = (key) => labels[key]?.[lang] || labels[key]?.en || key;

  const loadData = useCallback(async () => {
    setLoading(true);

    if (user) {
      try {
        const metrics = await fetchDailyMetrics(user.id, 60);

        if (metrics && metrics.length > 0) {
          const input = metricsToWellarynInput(metrics, profile);
          if (input) {
            const result = calculateWellarynScore(input);
            setWellarynResult(result);

            // Build 7-day trend — recalculate for each day
            const last7 = metrics.slice(-7);
            const trend = last7.map((m, idx) => {
              try {
                // Build a mini-input for that day
                const dayMetrics = metrics.slice(0, metrics.length - (last7.length - 1 - idx));
                const dayInput = metricsToWellarynInput(dayMetrics, profile);
                if (dayInput) {
                  const dayResult = calculateWellarynScore(dayInput);
                  return {
                    date: m.date,
                    score: dayResult.score,
                    zone: categoryToZone(dayResult.category),
                  };
                }
              } catch {
                // fallback
              }
              return { date: m.date, score: null, zone: 'yellow' };
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
      const mockInput = buildMockWellarynInput(mock);
      const result = calculateWellarynScore(mockInput);
      setWellarynResult(result);

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

  if (loading || !wellarynResult) {
    return (
      <div className={styles.loading}>
        <div className={styles.spinner} />
        <span className={styles.loadingText}>{L('loading')}</span>
      </div>
    );
  }

  // Confidence display
  const confValue = wellarynResult.confidence;
  const confidenceClass =
    confValue >= 0.9 ? styles.confidenceComplete
    : confValue >= 0.5 ? styles.confidenceCalibrating
    : styles.confidenceLow;

  const confidenceLabel =
    confValue >= 0.9 ? L('confidenceHigh')
    : confValue >= 0.5 ? L('confidenceMed')
    : L('confidenceLow');

  const zone = categoryToZone(wellarynResult.category);

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
            score={wellarynResult.score}
            zone={zone}
            zoneLabel={wellarynResult.category}
            size={220}
          />
          <div className={`${styles.confidenceBadge} ${confidenceClass}`}>
            {confValue >= 0.9 ? '✅' : confValue >= 0.5 ? '⏳' : '⚠️'}{' '}
            {confidenceLabel}
          </div>
        </div>
      </div>

      {/* Sub-scores — 5 Wellaryn Score components */}
      <div className={styles.sectionLabel}>{L('subScores')}</div>
      <div className={styles.subScoresGrid}>
        {['recovery', 'readiness', 'trainingLoad', 'injuryRisk', 'lifestyle'].map((key) => {
          const comp = componentLabels[key];
          const score = wellarynResult.subScores[key];
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
              {/* Score bar */}
              <div className={styles.subScoreBar}>
                <div
                  className={styles.subScoreBarFill}
                  style={{
                    width: `${score ?? 0}%`,
                    background: getScoreColorVar(score),
                  }}
                />
              </div>
              <div className={styles.subScoreDetail}>
                {comp.detail(score, lang)}
              </div>
            </div>
          );
        })}
      </div>

      {/* Recommendation */}
      {wellarynResult.message && (
        <div className={styles.recommendationsSection}>
          <div className={styles.sectionLabel}>{L('recommendation')}</div>
          <div className={styles.recList}>
            <div className={styles.recItem}>
              <span className={styles.recIcon}>💡</span>
              <div className={styles.recContent}>
                <div className={styles.recText}>
                  {wellarynResult.message[lang] || wellarynResult.message.en}
                </div>
              </div>
            </div>
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
