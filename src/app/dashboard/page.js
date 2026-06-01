'use client';

import { useState, useEffect, useCallback } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { t } from '@/lib/i18n';
import { generateMockUser } from '@/lib/mock-data';
import { calculateWellarynScore } from '@/lib/wellaryn-score';
import {
  fetchDailyMetrics,
  fetchTodayMetrics,
  metricsToWellarynInput,
  metricsToChartData,
  saveReadinessScore,
} from '@/lib/supabase/data-service';
import ReadinessGauge from '@/components/dashboard/ReadinessGauge';
import InjuryRiskBadge from '@/components/dashboard/InjuryRiskBadge';
import RecommendationList from '@/components/dashboard/RecommendationList';
import DailyLogForm from '@/components/dashboard/DailyLogForm';
import HRVChart from '@/components/charts/HRVChart';
import SleepChart from '@/components/charts/SleepChart';
import TrainingLoadChart from '@/components/charts/TrainingLoadChart';
import MetricCard from '@/components/ui/MetricCard';
import styles from './page.module.css';

function getGreeting(lang) {
  const hour = new Date().getHours();
  if (hour < 12) return t('dashboard.greeting.morning', lang);
  if (hour < 18) return t('dashboard.greeting.afternoon', lang);
  return t('dashboard.greeting.evening', lang);
}

function formatDate(lang) {
  return new Date().toLocaleDateString(lang === 'es' ? 'es-MX' : 'en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

// Map Wellaryn Score category → gauge zone color
function categoryToZone(category) {
  switch (category) {
    case 'Peak State':
    case 'Optimal':
      return 'green';
    case 'Productive':
      return 'yellow';
    case 'Caution':
      return 'yellow';
    case 'Recovery Required':
      return 'red';
    default:
      return 'yellow';
  }
}

// Map Wellaryn injury risk sub-score → qualitative risk
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

// Map Wellaryn confidence (0-1) → label
function confidenceLabel(confidence, lang) {
  if (confidence >= 0.9) return null; // complete — no badge needed
  if (confidence >= 0.5)
    return lang === 'es' ? 'Calibrando — sigue registrando a diario' : 'Calibrating — keep logging daily';
  return lang === 'es' ? 'Datos limitados — registra más días' : 'Limited data — log more days';
}

// Build a mock Wellaryn input from mock data for fallback
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

export default function DashboardPage() {
  const { lang } = useLanguage();
  const { user, profile } = useAuth();
  const [data, setData] = useState(null);
  const [showLogForm, setShowLogForm] = useState(false);
  const [todayEntry, setTodayEntry] = useState(null);
  const [hasRealData, setHasRealData] = useState(false);

  // ─── Load data: real from Supabase → fallback to mock ────────
  const loadData = useCallback(async () => {
    // Try real data first if user is authenticated
    if (user) {
      try {
        const metrics = await fetchDailyMetrics(user.id, 60);
        const todayData = await fetchTodayMetrics(user.id);
        setTodayEntry(todayData);

        if (metrics && metrics.length > 0) {
          setHasRealData(true);
          const input = metricsToWellarynInput(metrics, profile);
          if (input) {
            const wellarynResult = calculateWellarynScore(input);
            const charts = metricsToChartData(metrics);

            // Audit trail — save score (fire & forget)
            try { saveReadinessScore(user.id, wellarynResult); } catch (_) { /* noop */ }

            const todayMetric = metrics[metrics.length - 1];
            // RHR change vs yesterday
            const rhrValues = metrics.filter(m => m.rhr != null);
            const yesterdayRHR = rhrValues.length >= 2 ? rhrValues[rhrValues.length - 2].rhr : todayMetric.rhr;
            const currentRHR = todayMetric.rhr || 0;
            const rhrChange = yesterdayRHR > 0
              ? Math.round(((currentRHR - yesterdayRHR) / yesterdayRHR) * 100)
              : 0;

            setData({
              user: { displayName: profile?.display_name || user.email?.split('@')[0] || 'Athlete' },
              today: {
                hrv: { rmssd: todayMetric.hrv_rmssd },
                rhr: { rhr: todayMetric.rhr },
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
            });
            return; // done — real data loaded
          }
        }
      } catch (err) {
        console.error('Error fetching real data, falling back to mock:', err);
      }
    }

    // ─── Fallback: mock data ──────────────────────────────────
    setHasRealData(false);
    try {
      const mockUser = generateMockUser();
      const { user: mockUserObj, today, hrvChartData, sleepChartData, trainingChartData } = mockUser;

      const mockInput = buildMockWellarynInput(mockUser);
      const wellarynResult = calculateWellarynScore(mockInput);

      const rhrChartArr = mockUser.rhrChartData || [];
      const yesterdayRHR = rhrChartArr.length >= 2
        ? rhrChartArr[rhrChartArr.length - 2].rhr
        : today.rhr.rhr;
      const rhrChange = yesterdayRHR > 0
        ? Math.round(((today.rhr.rhr - yesterdayRHR) / yesterdayRHR) * 100)
        : 0;

      setData({
        user: mockUserObj,
        today,
        wellarynResult,
        injuryRisk: injuryRiskFromSubScore(wellarynResult.subScores.injuryRisk),
        hrvChartData,
        sleepChartData,
        trainingChartData,
        rhrChange,
      });
    } catch (err) {
      console.error('Error generating mock data:', err);
    }
  }, [user, profile]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ─── After a log save, re-fetch everything ──────────────────
  const handleLogSaved = useCallback(() => {
    loadData();
  }, [loadData]);

  // ─── Loading state ──────────────────────────────────────────
  if (!data) {
    return (
      <div className={styles.loading}>
        <div className={styles.spinner} />
        <span className={styles.loadingText}>{t('dashboard.loading', lang)}</span>
      </div>
    );
  }

  const { user: dataUser, today, wellarynResult, injuryRisk,
          hrvChartData, sleepChartData, trainingChartData, rhrChange } = data;

  const zone = categoryToZone(wellarynResult.category);
  const confLabel = confidenceLabel(wellarynResult.confidence, lang);

  // Build a recommendation from the Wellaryn message
  const recommendations = wellarynResult.message
    ? [{ icon: '💡', priority: 'medium', en: wellarynResult.message.en, es: wellarynResult.message.es }]
    : [];

  // ─── Empty state: authenticated but no real data ────────────
  if (user && !hasRealData) {
    return (
      <div className={styles.page} id="dashboard-overview">
        <header className={styles.header}>
          <h1 className={styles.greeting}>
            {getGreeting(lang)}, {(profile?.display_name || user.email?.split('@')[0] || 'Athlete').split(' ')[0]}
          </h1>
          <p className={styles.date}>{formatDate(lang)}</p>
        </header>

        {/* Demo data banner */}
        <div className={styles.demoBanner} id="demo-banner">
          <span className={styles.demoBannerIcon}>📊</span>
          <span className={styles.demoBannerText}>
            {lang === 'es'
              ? 'Estos son datos de demostración. Registra tu primer día para ver métricas reales.'
              : 'This is demo data. Log your first day to see real metrics.'}
          </span>
        </div>

        {/* Show mock dashboard behind the empty state prompt */}
        <div className={styles.emptyState} id="empty-state">
          <div className={styles.emptyStateIcon}>📝</div>
          <h2 className={styles.emptyStateTitle}>
            {lang === 'es' ? 'Comienza tu seguimiento' : 'Start your tracking'}
          </h2>
          <p className={styles.emptyStateText}>
            {lang === 'es'
              ? 'Registra las métricas de tu primer día para que Wellaryn pueda calcular tu puntaje personalizado.'
              : 'Log your first day\'s metrics so Wellaryn can calculate your personalized score.'}
          </p>
          <button
            className={styles.emptyStateBtn}
            onClick={() => setShowLogForm(true)}
            id="empty-state-log-btn"
          >
            + {lang === 'es' ? 'Registrar Hoy' : 'Log Today'}
          </button>
        </div>

        {/* Still show the mock dashboard below */}
        <div className={styles.grid}>
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

          <div className={styles.span2}>
            <HRVChart data={hrvChartData} />
          </div>

          <div className={styles.span2}>
            <SleepChart data={sleepChartData} />
          </div>

          <div className={styles.span2}>
            <TrainingLoadChart data={trainingChartData} />
          </div>

          <div className={styles.span2}>
            <div className={styles.statsGrid}>
              <MetricCard
                label={t('dashboard.metrics.rhr', lang)}
                value={today.rhr?.rhr || today.rhr || 0}
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
        </div>

        {/* FAB */}
        <button
          className={styles.fab}
          onClick={() => setShowLogForm(true)}
          title={lang === 'es' ? 'Registrar Hoy' : 'Log Today'}
          id="fab-log-today"
        >
          <span className={styles.fabIcon}>+</span>
          <span className={styles.fabLabel}>
            {lang === 'es' ? 'Registrar Día' : 'Log Today'}
          </span>
        </button>

        <DailyLogForm
          isOpen={showLogForm}
          onClose={() => setShowLogForm(false)}
          onSaved={handleLogSaved}
          existingData={todayEntry}
          lang={lang}
        />
      </div>
    );
  }

  // ─── Full dashboard (real data OR unauthenticated mock) ─────
  return (
    <div className={styles.page} id="dashboard-overview">
      {/* Header */}
      <header className={styles.header}>
        <h1 className={styles.greeting}>
          {getGreeting(lang)}, {(profile?.display_name || dataUser.displayName || 'Athlete').split(' ')[0]}
        </h1>
        <p className={styles.date}>{formatDate(lang)}</p>
      </header>

      {/* Demo banner for unauthenticated users */}
      {!user && (
        <div className={styles.demoBanner} id="demo-banner">
          <span className={styles.demoBannerIcon}>📊</span>
          <span className={styles.demoBannerText}>
            {lang === 'es'
              ? 'Estos son datos de demostración. Inicia sesión para ver métricas reales.'
              : 'This is demo data. Sign in to see real metrics.'}
          </span>
        </div>
      )}

      {/* Confidence badge */}
      {confLabel && (
        <div className={styles.confidenceBadge} id="confidence-badge">
          <span className={styles.confidenceIcon}>⚠️</span>
          <span className={styles.confidenceText}>{confLabel}</span>
        </div>
      )}

      {/* Bento Grid */}
      <div className={styles.grid}>
        {/* Row 1 */}
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

        {/* Row 2: Charts */}
        <div className={styles.span2}>
          <HRVChart data={hrvChartData} />
        </div>

        <div className={styles.span2}>
          <SleepChart data={sleepChartData} />
        </div>

        {/* Row 3: Training Load + Quick Stats */}
        <div className={styles.span2}>
          <TrainingLoadChart data={trainingChartData} />
        </div>

        <div className={styles.span2}>
          <div className={styles.statsGrid}>
            <MetricCard
              label={t('dashboard.metrics.rhr', lang)}
              value={today.rhr?.rhr || today.rhr || 0}
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
      </div>

      {/* FAB — only for authenticated users */}
      {user && (
        <button
          className={styles.fab}
          onClick={() => setShowLogForm(true)}
          title={todayEntry
            ? (lang === 'es' ? 'Editar' : 'Edit')
            : (lang === 'es' ? 'Registrar Día' : 'Log Today')}
          id="fab-log-today"
        >
          <span className={styles.fabIcon}>{todayEntry ? '✏️' : '+'}</span>
          <span className={styles.fabLabel}>
            {todayEntry
              ? (lang === 'es' ? 'Editar' : 'Edit')
              : (lang === 'es' ? 'Registrar Día' : 'Log Today')}
          </span>
        </button>
      )}

      <DailyLogForm
        isOpen={showLogForm}
        onClose={() => setShowLogForm(false)}
        onSaved={handleLogSaved}
        existingData={todayEntry}
        lang={lang}
      />
    </div>
  );
}
