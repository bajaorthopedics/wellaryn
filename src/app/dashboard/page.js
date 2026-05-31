'use client';

import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { t } from '@/lib/i18n';
import { generateMockUser } from '@/lib/mock-data';
import { calculateReadiness, calculateInjuryRisk } from '@/lib/readiness';
import ReadinessGauge from '@/components/dashboard/ReadinessGauge';
import InjuryRiskBadge from '@/components/dashboard/InjuryRiskBadge';
import RecommendationList from '@/components/dashboard/RecommendationList';
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

export default function DashboardPage() {
  const { lang } = useLanguage();
  const [data, setData] = useState(null);

  useEffect(() => {
    const mockUser = generateMockUser();
    const { user, today, hrvHistory, rhrHistory, sleepHistory, loadHistory,
            hrvChartData, sleepChartData, trainingChartData } = mockUser;

    // Build inputs matching the new readiness API shapes
    const todayInput = {
      rmssd: today.hrv.rmssd,
      rhr: today.rhr.rhr,
      sleepHours: today.sleep.total,
      sleepNeed: user.settings.sleepNeed,
      stress: today.stress,
      mood: today.mood,
    };

    const historyInput = {
      rmssdHistory: hrvHistory,
      rhrHistory: rhrHistory,
      sleepHistory: sleepHistory,
      loadHistory: loadHistory,
    };

    const readiness = calculateReadiness(todayInput, historyInput);
    const injuryRisk = calculateInjuryRisk(loadHistory);

    // RHR change vs yesterday (use chart data which has the objects)
    const rhrChartArr = mockUser.rhrChartData || [];
    const yesterdayRHR = rhrChartArr.length >= 2
      ? rhrChartArr[rhrChartArr.length - 2].rhr
      : today.rhr.rhr;
    const rhrChange = yesterdayRHR > 0
      ? Math.round(((today.rhr.rhr - yesterdayRHR) / yesterdayRHR) * 100)
      : 0;

    setData({
      user, today, readiness, injuryRisk,
      hrvChartData, sleepChartData, trainingChartData, rhrChange,
    });
  }, []);

  if (!data) {
    return (
      <div className={styles.loading}>
        <div className={styles.spinner} />
        <span className={styles.loadingText}>{t('dashboard.loading', lang)}</span>
      </div>
    );
  }

  const { user, today, readiness, injuryRisk,
          hrvChartData, sleepChartData, trainingChartData, rhrChange } = data;

  return (
    <div className={styles.page} id="dashboard-overview">
      {/* Header */}
      <header className={styles.header}>
        <h1 className={styles.greeting}>
          {getGreeting(lang)}, {user.displayName.split(' ')[0]}
        </h1>
        <p className={styles.date}>{formatDate(lang)}</p>
      </header>

      {/* Confidence badge — only shown when not 'complete' */}
      {readiness.confidence !== 'complete' && (
        <div className={styles.confidenceBadge} id="confidence-badge">
          <span className={styles.confidenceIcon}>⚠️</span>
          <span className={styles.confidenceText}>
            {readiness.confidence === 'calibrating'
              ? t('dashboard.confidence.calibrating', lang)
              : t('dashboard.confidence.low', lang)}
          </span>
        </div>
      )}

      {/* Bento Grid */}
      <div className={styles.grid}>
        {/* Row 1 */}
        <div className={`${styles.readinessCard} ${styles.span2}`}>
          <ReadinessGauge
            score={readiness.score}
            zone={readiness.zone}
            zoneLabel={readiness.zoneLabel[lang] || readiness.zoneLabel.en}
          />
        </div>

        <InjuryRiskBadge
          risk={injuryRisk.risk}
          label={injuryRisk.label}
          factor={injuryRisk.factor}
          acwr={injuryRisk.acwr}
        />

        <RecommendationList
          recommendations={readiness.recommendations}
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
              value={today.rhr.rhr}
              unit={t('dashboard.metrics.bpm', lang)}
              trend={rhrChange > 0 ? 'up' : rhrChange < 0 ? 'down' : 'flat'}
              change={rhrChange}
            />
            <MetricCard
              label={t('dashboard.metrics.steps', lang)}
              value={today.steps.toLocaleString()}
              unit={lang === 'es' ? 'pasos' : 'steps'}
              trend={today.steps > 8000 ? 'up' : 'down'}
              change={today.steps > 8000 ? Math.round((today.steps - 8000) / 80) : -Math.round((8000 - today.steps) / 80)}
            />
            <MetricCard
              label={t('dashboard.metrics.calories', lang)}
              value={today.calories.toLocaleString()}
              unit={t('dashboard.metrics.kcal', lang)}
              trend={today.calories > 2500 ? 'up' : 'flat'}
              change={Math.round(((today.calories - 2500) / 2500) * 100)}
            />
            <MetricCard
              label={t('dashboard.metrics.stress', lang)}
              value={today.stress}
              unit="/100"
              trend={today.stress > 50 ? 'up' : 'down'}
              change={today.stress > 50 ? Math.round(today.stress - 50) : -Math.round(50 - today.stress)}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

