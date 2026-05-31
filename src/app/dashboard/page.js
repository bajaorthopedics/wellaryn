'use client';

import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { t } from '@/lib/i18n';
import { generateMockUser } from '@/lib/mock-data';
import { calculateReadiness, calculateInjuryRisk, generateRecommendations } from '@/lib/readiness';
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
    const { today, hrvHistory, rhrHistory, sleepHistory, trainingHistory, user } = mockUser;

    const readiness = calculateReadiness(
      {
        rmssd: today.hrv.rmssd,
        rhr: today.rhr.rhr,
        sleepHours: today.sleep.total,
        sleepNeed: user.settings.sleepNeed,
        stress: today.stress,
        mood: today.mood,
      },
      {
        rmssdHistory: hrvHistory.map((h) => h.rmssd),
        rhrHistory: rhrHistory.map((h) => h.rhr),
        sleepHistory: sleepHistory.map((h) => h.total),
      }
    );

    const injuryRisk = calculateInjuryRisk(
      trainingHistory.map((t) => t.load)
    );

    const recommendations = generateRecommendations(readiness, injuryRisk, {
      sleepHours: today.sleep.total,
      sleepNeed: user.settings.sleepNeed,
      stress: today.stress,
    });

    const yesterdayRHR = rhrHistory.length >= 2 ? rhrHistory[rhrHistory.length - 2].rhr : today.rhr.rhr;
    const rhrChange = yesterdayRHR > 0
      ? Math.round(((today.rhr.rhr - yesterdayRHR) / yesterdayRHR) * 100)
      : 0;

    setData({
      user, today, readiness, injuryRisk, recommendations,
      hrvHistory, sleepHistory, trainingHistory, rhrChange,
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

  const { user, today, readiness, injuryRisk, recommendations, hrvHistory, sleepHistory, trainingHistory, rhrChange } = data;

  return (
    <div className={styles.page} id="dashboard-overview">
      {/* Header */}
      <header className={styles.header}>
        <h1 className={styles.greeting}>
          {getGreeting(lang)}, {user.displayName.split(' ')[0]}
        </h1>
        <p className={styles.date}>{formatDate(lang)}</p>
      </header>

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
          riskPercent={injuryRisk.riskPercent}
          label={injuryRisk.label[lang] || injuryRisk.label.en}
          acwr={injuryRisk.acwr}
        />

        <RecommendationList
          recommendations={recommendations}
          lang={lang}
        />

        {/* Row 2: Charts */}
        <div className={styles.span2}>
          <HRVChart data={hrvHistory} />
        </div>

        <div className={styles.span2}>
          <SleepChart data={sleepHistory} />
        </div>

        {/* Row 3: Training Load + Quick Stats */}
        <div className={styles.span2}>
          <TrainingLoadChart data={trainingHistory} />
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
