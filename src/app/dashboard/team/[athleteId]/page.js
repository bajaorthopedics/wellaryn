'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { t } from '@/lib/i18n';
import { calculateWellarynScore } from '@/lib/wellaryn-score';
import {
  fetchDailyMetrics,
  metricsToWellarynInput,
  metricsToChartData,
} from '@/lib/supabase/data-service';
import { getSupabaseBrowser } from '@/lib/supabase/client';
import ReadinessGauge from '@/components/dashboard/ReadinessGauge';
import InjuryRiskBadge from '@/components/dashboard/InjuryRiskBadge';
import RecommendationList from '@/components/dashboard/RecommendationList';
import HRVChart from '@/components/charts/HRVChart';
import SleepChart from '@/components/charts/SleepChart';
import TrainingLoadChart from '@/components/charts/TrainingLoadChart';
import MetricCard from '@/components/ui/MetricCard';
import styles from './athleteDetail.module.css';

// ─── Helpers (shared with main dashboard) ───────────────────

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

function injuryRiskFromSubScore(score) {
  if (score >= 80) return {
    risk: 'optimal',
    label: { en: 'Low Risk', es: 'Riesgo Bajo' },
    factor: { en: 'Pain and soreness are well-managed', es: 'El dolor y las molestias están bien controlados' },
  };
  if (score >= 60) return {
    risk: 'moderate',
    label: { en: 'Moderate Risk', es: 'Riesgo Moderado' },
    factor: { en: 'Some pain or soreness detected — monitor closely', es: 'Se detectó algo de dolor o molestias — monitorea de cerca' },
  };
  return {
    risk: 'high',
    label: { en: 'Elevated Risk', es: 'Riesgo Elevado' },
    factor: { en: 'High pain or soreness — reduce intensity today', es: 'Dolor o molestias altos — reduce la intensidad hoy' },
  };
}

function confidenceLabel(confidence, lang) {
  if (confidence >= 0.9) return null;
  if (confidence >= 0.5)
    return lang === 'es' ? 'Calibrando — sigue registrando a diario' : 'Calibrating — keep logging daily';
  return lang === 'es' ? 'Datos limitados — registra más días' : 'Limited data — log more days';
}

function formatDate(lang) {
  return new Date().toLocaleDateString(lang === 'es' ? 'es-MX' : 'en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

// ─── Component ──────────────────────────────────────────────

export default function AthleteDetailPage() {
  const { athleteId } = useParams();
  const { lang } = useLanguage();
  const { user, profile } = useAuth();

  const [athleteProfile, setAthleteProfile] = useState(null);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  const viewerRole = profile?.role; // 'coach' | 'doctor' | 'athlete'

  // ─── Fetch athlete profile + metrics ─────────────────────
  const loadAthleteData = useCallback(async () => {
    if (!user || !athleteId) return;

    try {
      const supabase = getSupabaseBrowser();

      // 1. Fetch athlete's profile
      const { data: athleteProf, error: profError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', athleteId)
        .maybeSingle();

      if (profError) throw profError;
      if (!athleteProf) {
        setError(lang === 'es' ? 'Atleta no encontrado' : 'Athlete not found');
        setLoading(false);
        return;
      }

      setAthleteProfile(athleteProf);

      // 2. Fetch athlete's metrics (60 days)
      const metrics = await fetchDailyMetrics(athleteId, 60);

      if (!metrics || metrics.length === 0) {
        setData({ empty: true, athleteProfile: athleteProf });
        setLoading(false);
        return;
      }

      // 3. Calculate Wellaryn Score
      const input = metricsToWellarynInput(metrics, athleteProf);
      const wellarynResult = input
        ? calculateWellarynScore(input)
        : { score: 0, category: 'Recovery Required', message: null, confidence: 0, subScores: { injuryRisk: 50 }, trainingLoadDetails: {} };

      // 4. Generate chart data
      const charts = metricsToChartData(metrics);

      // 5. Today's metrics
      const todayMetric = metrics[metrics.length - 1];
      const rhrValues = metrics.filter(m => m.rhr != null);
      const yesterdayRHR = rhrValues.length >= 2 ? rhrValues[rhrValues.length - 2].rhr : todayMetric.rhr;
      const currentRHR = todayMetric.rhr || 0;
      const rhrChange = yesterdayRHR > 0
        ? Math.round(((currentRHR - yesterdayRHR) / yesterdayRHR) * 100)
        : 0;

      setData({
        today: {
          hrv: { rmssd: todayMetric.hrv_rmssd },
          rhr: todayMetric.rhr || 0,
          sleep: { total: todayMetric.sleep_total },
          steps: todayMetric.steps || 0,
          calories: todayMetric.calories || 0,
          energy: todayMetric.energy || 0,
          stress: todayMetric.stress || 0,
          mood: todayMetric.mood || 0,
        },
        wellarynResult,
        injuryRisk: injuryRiskFromSubScore(wellarynResult.subScores.injuryRisk),
        hrvChartData: charts.hrvChartData,
        sleepChartData: charts.sleepChartData,
        trainingChartData: charts.trainingChartData,
        rhrChange,
        athleteProfile: athleteProf,
      });
    } catch (err) {
      console.error('Error loading athlete data:', err);
      setError(lang === 'es' ? 'Error al cargar datos del atleta' : 'Error loading athlete data');
    } finally {
      setLoading(false);
    }
  }, [user, athleteId, lang]);

  useEffect(() => {
    loadAthleteData();
  }, [loadAthleteData]);

  // ─── Loading state ────────────────────────────────────────
  if (loading) {
    return (
      <div className={styles.loading}>
        <div className={styles.spinner} />
        <span className={styles.loadingText}>{t('dashboard.loading', lang)}</span>
      </div>
    );
  }

  // ─── Error state ──────────────────────────────────────────
  if (error) {
    return (
      <div className={styles.errorState}>
        <div className={styles.errorIcon}>⚠️</div>
        <h2 className={styles.errorTitle}>{error}</h2>
        <Link href="/dashboard/team" className={styles.backLink}>
          ← {lang === 'es' ? 'Volver al Equipo' : 'Back to Team'}
        </Link>
      </div>
    );
  }

  // ─── Not authorized ───────────────────────────────────────
  if (!user) {
    return (
      <div className={styles.errorState}>
        <div className={styles.errorIcon}>🔒</div>
        <h2 className={styles.errorTitle}>
          {lang === 'es' ? 'Inicia sesión para continuar' : 'Sign in to continue'}
        </h2>
        <Link href="/auth/login" className={styles.backLink}>
          → {lang === 'es' ? 'Iniciar sesión' : 'Sign in'}
        </Link>
      </div>
    );
  }

  // ─── Empty state (athlete has no data) ────────────────────
  if (data?.empty) {
    const athlete = data.athleteProfile;
    return (
      <div className={styles.page}>
        <header className={styles.header}>
          <Link href="/dashboard/team" className={styles.backLink}>
            ← {lang === 'es' ? 'Volver al Equipo' : 'Back to Team'}
          </Link>
          <div className={styles.headerRow}>
            <div>
              <h1 className={styles.athleteName}>
                {athlete?.display_name || lang === 'es' ? 'Atleta' : 'Athlete'}
              </h1>
              {athlete?.sport && (
                <span className={styles.sportBadge}>{athlete.sport}</span>
              )}
            </div>
            <span className={styles.readOnlyBadge}>
              {lang === 'es' ? '👁 Solo lectura' : '👁 Read-only view'}
            </span>
          </div>
          <p className={styles.date}>{formatDate(lang)}</p>
        </header>

        <div className={styles.emptyState}>
          <div className={styles.emptyStateIcon}>📊</div>
          <h2 className={styles.emptyStateTitle}>
            {lang === 'es' ? 'Sin datos disponibles' : 'No data available'}
          </h2>
          <p className={styles.emptyStateText}>
            {lang === 'es'
              ? 'Este atleta aún no ha registrado métricas. Los datos aparecerán aquí una vez que comience a registrar.'
              : "This athlete hasn't logged any metrics yet. Data will appear here once they start logging."}
          </p>
        </div>
      </div>
    );
  }

  // ─── Full athlete detail view ─────────────────────────────
  const { today, wellarynResult, injuryRisk,
          hrvChartData, sleepChartData, trainingChartData, rhrChange } = data;

  const zone = categoryToZone(wellarynResult.category);
  const confLabel = confidenceLabel(wellarynResult.confidence, lang);
  const athlete = athleteProfile || data.athleteProfile;

  const recommendations = wellarynResult.message
    ? [{ icon: '💡', priority: 'medium', en: wellarynResult.message.en, es: wellarynResult.message.es }]
    : [];

  const isCoach = viewerRole === 'coach';
  const isDoctor = viewerRole === 'doctor';

  return (
    <div className={styles.page} id="athlete-detail">
      {/* Header */}
      <header className={styles.header}>
        <Link href="/dashboard/team" className={styles.backLink}>
          ← {lang === 'es' ? 'Volver al Equipo' : 'Back to Team'}
        </Link>
        <div className={styles.headerRow}>
          <div className={styles.headerInfo}>
            <h1 className={styles.athleteName}>
              {athlete?.display_name || (lang === 'es' ? 'Atleta' : 'Athlete')}
            </h1>
            {athlete?.sport && (
              <span className={styles.sportBadge}>{athlete.sport}</span>
            )}
          </div>
          <span className={styles.readOnlyBadge}>
            {lang === 'es' ? '👁 Solo lectura' : '👁 Read-only view'}
          </span>
        </div>
        <p className={styles.date}>{formatDate(lang)}</p>
      </header>

      {/* Viewer role indicator */}
      <div className={styles.roleBanner}>
        <span className={styles.roleBannerIcon}>
          {isDoctor ? '🩺' : isCoach ? '📋' : '👤'}
        </span>
        <span className={styles.roleBannerText}>
          {isDoctor
            ? (lang === 'es' ? 'Vista de Médico' : 'Doctor View')
            : isCoach
              ? (lang === 'es' ? 'Vista de Coach' : 'Coach View')
              : (lang === 'es' ? 'Vista de Equipo' : 'Team View')}
          {' — '}
          {lang === 'es'
            ? `Revisando a ${(athlete?.display_name || 'atleta').split(' ')[0]}`
            : `Reviewing ${(athlete?.display_name || 'athlete').split(' ')[0]}`}
        </span>
      </div>

      {/* Confidence badge */}
      {confLabel && (
        <div className={styles.confidenceBadge}>
          <span className={styles.confidenceIcon}>⚠️</span>
          <span className={styles.confidenceText}>{confLabel}</span>
        </div>
      )}

      {/* ─── Bento Grid ──────────────────────────────────── */}
      <div className={styles.grid}>

        {/* Row 1: Readiness Gauge + Injury Risk */}
        <div className={`${styles.readinessCard} ${styles.span2}`}>
          <ReadinessGauge
            score={wellarynResult.score}
            zone={zone}
            zoneLabel={wellarynResult.category}
          />
        </div>

        <InjuryRiskBadge
          risk={injuryRisk.risk}
          label={injuryRisk.label}
          factor={injuryRisk.factor}
          acwr={wellarynResult.trainingLoadDetails?.ratio?.toFixed(2) || null}
        />

        <RecommendationList
          recommendations={recommendations}
          lang={lang}
        />

        {/* Sub-scores breakdown */}
        <div className={`${styles.subScoresCard} ${styles.span2}`}>
          <h3 className={styles.sectionTitle}>
            {lang === 'es' ? 'Desglose del Wellaryn Score' : 'Wellaryn Score Breakdown'}
          </h3>
          <div className={styles.subScoresGrid}>
            {[
              { key: 'recovery', icon: '😴', label: { en: 'Recovery', es: 'Recuperación' } },
              { key: 'readiness', icon: '⚡', label: { en: 'Readiness', es: 'Preparación' } },
              { key: 'trainingLoad', icon: '🏋️', label: { en: 'Training Load', es: 'Carga' } },
              { key: 'injuryRisk', icon: '🛡️', label: { en: 'Injury Risk', es: 'Riesgo' } },
              { key: 'lifestyle', icon: '🌿', label: { en: 'Lifestyle', es: 'Estilo de vida' } },
            ].map(({ key, icon, label }) => (
              <div key={key} className={styles.subScoreItem}>
                <span className={styles.subScoreIcon}>{icon}</span>
                <span className={styles.subScoreLabel}>{label[lang]}</span>
                <div className={styles.subScoreBarTrack}>
                  <div
                    className={styles.subScoreBarFill}
                    style={{
                      width: `${wellarynResult.subScores[key] || 0}%`,
                      background: (wellarynResult.subScores[key] || 0) >= 80
                        ? 'var(--color-green)'
                        : (wellarynResult.subScores[key] || 0) >= 60
                          ? 'var(--color-yellow)'
                          : 'var(--color-red)',
                    }}
                  />
                </div>
                <span className={styles.subScoreValue}>{wellarynResult.subScores[key] || 0}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ─── Doctor-specific: Injury Risk Detailed Panel ─── */}
        {isDoctor && (
          <div className={`${styles.clinicalCard} ${styles.span2}`}>
            <div className={styles.clinicalHeader}>
              <span className={styles.clinicalIcon}>🩺</span>
              <h3 className={styles.sectionTitle}>
                {lang === 'es' ? 'Panel Clínico' : 'Clinical Panel'}
              </h3>
            </div>
            <div className={styles.clinicalContent}>
              <div className={styles.clinicalMetric}>
                <span className={styles.clinicalMetricLabel}>
                  {lang === 'es' ? 'Puntuación de Riesgo de Lesión' : 'Injury Risk Score'}
                </span>
                <span className={styles.clinicalMetricValue}>
                  {wellarynResult.subScores.injuryRisk}/100
                </span>
              </div>
              <div className={styles.clinicalMetric}>
                <span className={styles.clinicalMetricLabel}>
                  {lang === 'es' ? 'Puntuación de Recuperación' : 'Recovery Score'}
                </span>
                <span className={styles.clinicalMetricValue}>
                  {wellarynResult.subScores.recovery}/100
                </span>
              </div>
              <div className={styles.clinicalMetric}>
                <span className={styles.clinicalMetricLabel}>ACWR</span>
                <span className={styles.clinicalMetricValue}>
                  {wellarynResult.trainingLoadDetails?.ratio?.toFixed(2) || 'N/A'}
                </span>
              </div>
              <div className={styles.clinicalNotes}>
                <h4 className={styles.clinicalNotesTitle}>
                  {lang === 'es' ? 'Notas Clínicas' : 'Clinical Notes'}
                </h4>
                <p className={styles.clinicalNotesPlaceholder}>
                  {lang === 'es'
                    ? 'Las notas clínicas estarán disponibles en una próxima actualización.'
                    : 'Clinical notes will be available in an upcoming update.'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Row 2: Charts */}
        <div className={styles.span2}>
          <HRVChart data={hrvChartData} />
        </div>

        <div className={styles.span2}>
          <SleepChart data={sleepChartData} />
        </div>

        {/* Row 3: Training Load + Quick Stats */}
        <div className={`${styles.span2} ${isCoach ? styles.highlighted : ''}`}>
          <TrainingLoadChart data={trainingChartData} />
        </div>

        <div className={styles.span2}>
          <div className={styles.statsGrid}>
            <MetricCard
              label={t('dashboard.metrics.rhr', lang)}
              value={typeof today.rhr === 'object' ? (today.rhr?.rhr || 0) : (today.rhr || 0)}
              unit={t('dashboard.metrics.bpm', lang)}
              trend={rhrChange > 0 ? 'up' : rhrChange < 0 ? 'down' : 'flat'}
              change={rhrChange}
            />
            <MetricCard
              label={t('dashboard.metrics.steps', lang)}
              value={(today.steps || 0).toLocaleString()}
              unit={lang === 'es' ? 'pasos' : 'steps'}
              trend={(today.steps || 0) > 8000 ? 'up' : 'down'}
              change={(today.steps || 0) > 8000 ? Math.round(((today.steps || 0) - 8000) / 80) : -Math.round((8000 - (today.steps || 0)) / 80)}
            />
            <MetricCard
              label={t('dashboard.metrics.calories', lang)}
              value={(today.calories || 0).toLocaleString()}
              unit={t('dashboard.metrics.kcal', lang)}
              trend={(today.calories || 0) > 2500 ? 'up' : 'flat'}
              change={Math.round((((today.calories || 0) - 2500) / 2500) * 100)}
            />
            <MetricCard
              label={t('dashboard.metrics.stress', lang)}
              value={today.stress || today.energy || 0}
              unit="/10"
              trend={(today.stress || 0) > 5 ? 'up' : 'down'}
              change={0}
            />
          </div>
        </div>

        {/* ─── Coach-specific: Training Load Summary ─── */}
        {isCoach && (
          <div className={`${styles.coachCard} ${styles.span2}`}>
            <div className={styles.coachHeader}>
              <span className={styles.coachIcon}>📋</span>
              <h3 className={styles.sectionTitle}>
                {lang === 'es' ? 'Resumen de Carga para Coach' : 'Coach Load Summary'}
              </h3>
            </div>
            <div className={styles.coachContent}>
              <div className={styles.coachMetric}>
                <span className={styles.coachMetricLabel}>
                  {lang === 'es' ? 'Carga Aguda (3 días)' : 'Acute Load (3-day)'}
                </span>
                <span className={styles.coachMetricValue}>
                  {wellarynResult.trainingLoadDetails?.acuteLoad?.toFixed(0) || '0'}
                </span>
              </div>
              <div className={styles.coachMetric}>
                <span className={styles.coachMetricLabel}>
                  {lang === 'es' ? 'Carga Crónica (14 días)' : 'Chronic Load (14-day)'}
                </span>
                <span className={styles.coachMetricValue}>
                  {wellarynResult.trainingLoadDetails?.chronicLoad?.toFixed(0) || '0'}
                </span>
              </div>
              <div className={styles.coachMetric}>
                <span className={styles.coachMetricLabel}>ACWR</span>
                <span className={styles.coachMetricValue}>
                  {wellarynResult.trainingLoadDetails?.ratio?.toFixed(2) || 'N/A'}
                </span>
              </div>
              <div className={styles.coachMetric}>
                <span className={styles.coachMetricLabel}>
                  {lang === 'es' ? 'Puntuación de Carga' : 'Load Score'}
                </span>
                <span className={styles.coachMetricValue}>
                  {wellarynResult.subScores.trainingLoad}/100
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Disclaimer */}
      <div className={styles.disclaimer}>
        <p>{t('dashboard.disclaimer', lang)}</p>
      </div>
    </div>
  );
}
