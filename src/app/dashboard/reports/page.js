'use client';

import { useState, useEffect, useCallback } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { t } from '@/lib/i18n';
import { calculateWellarynScore } from '@/lib/wellaryn-score';
import { fetchDailyMetrics, metricsToWellarynInput, fetchCoachAthletes } from '@/lib/supabase/data-service';
import styles from './reports.module.css';

// ─── Constants ────────────────────────────────────────────────

const DAY_NAMES = {
  en: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
  es: ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'],
};

const MONTH_NAMES = {
  en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
  es: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'],
};

// ─── Helpers ──────────────────────────────────────────────────

function avg(arr) {
  if (arr.length === 0) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function formatDate(dateStr, lang) {
  const d = new Date(dateStr + 'T00:00:00Z');
  const months = MONTH_NAMES[lang] || MONTH_NAMES.en;
  return `${months[d.getUTCMonth()]} ${d.getUTCDate()}`;
}

function getDayName(dateStr, lang) {
  const d = new Date(dateStr + 'T00:00:00Z');
  const days = DAY_NAMES[lang] || DAY_NAMES.en;
  return days[d.getUTCDay()];
}

function scoreColor(score) {
  if (score >= 80) return 'var(--color-green)';
  if (score >= 60) return 'var(--color-yellow)';
  if (score >= 40) return 'hsl(20, 100%, 60%)';
  return 'var(--color-red)';
}

function getMonday(d) {
  const date = new Date(d);
  const day = date.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setUTCDate(date.getUTCDate() + diff);
  return date;
}

function splitIntoWeeks(metrics) {
  if (metrics.length === 0) return [];

  // Find the most recent Monday (or yesterday's Monday)
  const today = new Date();
  const weeks = [];

  for (let i = 0; i < 4; i++) {
    const weekEnd = new Date(today);
    weekEnd.setUTCDate(weekEnd.getUTCDate() - 1 - (i * 7)); // end of each week (yesterday, 8d ago, etc.)
    const weekStart = new Date(weekEnd);
    weekStart.setUTCDate(weekStart.getUTCDate() - 6);

    const weekEndStr = weekEnd.toISOString().split('T')[0];
    const weekStartStr = weekStart.toISOString().split('T')[0];

    const weekMetrics = metrics.filter(m => m.date >= weekStartStr && m.date <= weekEndStr);

    if (weekMetrics.length > 0) {
      weeks.push({
        index: i,
        startDate: weekStartStr,
        endDate: weekEndStr,
        metrics: weekMetrics,
      });
    }
  }

  return weeks;
}

function computeWeeklyStats(weekMetrics, allMetrics, profile, lang) {
  const dailyScores = [];
  for (let i = 0; i < weekMetrics.length; i++) {
    const dayDate = weekMetrics[i].date;
    const dayIndex = allMetrics.findIndex(m => m.date === dayDate);
    if (dayIndex >= 0) {
      const windowStart = Math.max(0, dayIndex - 13);
      const window = allMetrics.slice(windowStart, dayIndex + 1);
      const input = metricsToWellarynInput(window, profile);
      if (input) {
        const result = calculateWellarynScore(input);
        dailyScores.push({ date: dayDate, score: result.score, details: result });
      }
    }
  }

  const validScores = dailyScores.filter(d => d.score != null);
  const avgScore = validScores.length > 0 ? Math.round(avg(validScores.map(d => d.score))) : null;

  const hrvValues = weekMetrics.filter(m => m.hrv_rmssd != null).map(m => m.hrv_rmssd);
  const rhrValues = weekMetrics.filter(m => m.rhr != null).map(m => m.rhr);
  const sleepValues = weekMetrics.filter(m => m.sleep_total != null).map(m => m.sleep_total);
  const trainingDays = weekMetrics.filter(m => m.training_load != null && m.training_load > 0).length;

  const avgHRV = hrvValues.length > 0 ? Math.round(avg(hrvValues)) : null;
  const avgRHR = rhrValues.length > 0 ? Math.round(avg(rhrValues)) : null;
  const avgSleep = sleepValues.length > 0 ? parseFloat(avg(sleepValues).toFixed(1)) : null;

  let bestDay = null;
  let worstDay = null;
  if (validScores.length > 0) {
    bestDay = validScores.reduce((a, b) => a.score > b.score ? a : b);
    worstDay = validScores.reduce((a, b) => a.score < b.score ? a : b);
  }

  let acwr = null;
  if (validScores.length > 0) {
    const latestDetails = validScores[validScores.length - 1].details;
    acwr = latestDetails.trainingLoadDetails?.ratio
      ? parseFloat(latestDetails.trainingLoadDetails.ratio.toFixed(2))
      : null;
  }

  return {
    avgScore,
    avgHRV,
    avgRHR,
    avgSleep,
    trainingDays,
    totalDays: weekMetrics.length,
    bestDay: bestDay ? { date: bestDay.date, score: bestDay.score, dayName: getDayName(bestDay.date, lang) } : null,
    worstDay: worstDay ? { date: worstDay.date, score: worstDay.score, dayName: getDayName(worstDay.date, lang) } : null,
    acwr,
  };
}

// ─── Main Component ───────────────────────────────────────────

export default function ReportsPage() {
  const { lang } = useLanguage();
  const { user, profile } = useAuth();
  const [metrics, setMetrics] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedWeek, setExpandedWeek] = useState(0);
  const [coachAthletes, setCoachAthletes] = useState([]);
  const [selectedAthlete, setSelectedAthlete] = useState(null);
  const [athleteMetrics, setAthleteMetrics] = useState(null);

  const isCoachOrDoctor = profile?.role === 'coach' || profile?.role === 'doctor';

  // ─── Load Data ──────────────────────────────────────────────
  const loadData = useCallback(async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    try {
      if (isCoachOrDoctor) {
        // Fetch coach's athletes
        const athletes = await fetchCoachAthletes(user.id);
        const accepted = athletes.filter(a => a.status === 'accepted');
        setCoachAthletes(accepted);

        // Also load own metrics
        const data = await fetchDailyMetrics(user.id, 42);
        setMetrics(data || []);

        // If has athletes, select first by default
        if (accepted.length > 0) {
          setSelectedAthlete(accepted[0].athlete_id);
        }
      } else {
        const data = await fetchDailyMetrics(user.id, 42);
        setMetrics(data || []);
      }
    } catch (err) {
      console.error('Error fetching reports data:', err);
      setMetrics([]);
    } finally {
      setIsLoading(false);
    }
  }, [user, isCoachOrDoctor]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ─── Load athlete metrics when selected (coach view) ────────
  useEffect(() => {
    if (!selectedAthlete || !isCoachOrDoctor) return;

    let cancelled = false;

    async function loadAthleteMetrics() {
      try {
        const data = await fetchDailyMetrics(selectedAthlete, 42);
        if (!cancelled) {
          setAthleteMetrics(data || []);
        }
      } catch (err) {
        console.error('Error fetching athlete metrics:', err);
        if (!cancelled) setAthleteMetrics([]);
      }
    }

    loadAthleteMetrics();
    return () => { cancelled = true; };
  }, [selectedAthlete, isCoachOrDoctor]);

  // ─── Toggle week ────────────────────────────────────────────
  function toggleWeek(index) {
    setExpandedWeek(prev => prev === index ? -1 : index);
  }

  // ─── Loading State ──────────────────────────────────────────
  if (isLoading) {
    return (
      <div className={styles.page}>
        <header className={styles.header}>
          <h1 className={styles.title}>{t('dashboard.reports.title', lang)}</h1>
          <p className={styles.subtitle}>{t('dashboard.reports.subtitle', lang)}</p>
        </header>
        <div className={styles.skeletonList}>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className={styles.skeletonCard} />
          ))}
        </div>
      </div>
    );
  }

  // Determine active metrics and profile
  const activeMetrics = isCoachOrDoctor && selectedAthlete ? (athleteMetrics || []) : (metrics || []);
  const activeProfile = isCoachOrDoctor && selectedAthlete
    ? coachAthletes.find(a => a.athlete_id === selectedAthlete)?.profile || profile
    : profile;

  // Split into weeks
  const weeks = splitIntoWeeks(activeMetrics);

  // Compute stats per week
  const weekStats = weeks.map((week, i) => {
    const stats = computeWeeklyStats(week.metrics, activeMetrics, activeProfile, lang);
    // Previous week stats for trend
    const prevWeek = weeks[i + 1];
    const prevStats = prevWeek
      ? computeWeeklyStats(prevWeek.metrics, activeMetrics, activeProfile, lang)
      : null;
    return { ...week, stats, prevStats };
  });

  // ─── Empty State ────────────────────────────────────────────
  if (weekStats.length === 0) {
    return (
      <div className={styles.page}>
        <header className={styles.header}>
          <div className={styles.headerRow}>
            <div>
              <h1 className={styles.title}>{t('dashboard.reports.title', lang)}</h1>
              <p className={styles.subtitle}>{t('dashboard.reports.subtitle', lang)}</p>
            </div>
          </div>
        </header>

        {isCoachOrDoctor && coachAthletes.length > 0 && (
          <div className={styles.selectorRow}>
            <select
              className={styles.athleteSelect}
              value={selectedAthlete || ''}
              onChange={(e) => setSelectedAthlete(e.target.value)}
            >
              {coachAthletes.map(a => (
                <option key={a.athlete_id} value={a.athlete_id}>
                  {a.profile?.display_name || a.athlete_id}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>📊</div>
          <h2 className={styles.emptyTitle}>
            {lang === 'es' ? 'Sin reportes disponibles' : 'No Reports Available'}
          </h2>
          <p className={styles.emptyText}>{t('dashboard.reports.noData', lang)}</p>
        </div>
      </div>
    );
  }

  // ─── Render ─────────────────────────────────────────────────
  return (
    <div className={styles.page}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.headerRow}>
          <div>
            <h1 className={styles.title}>{t('dashboard.reports.title', lang)}</h1>
            <p className={styles.subtitle}>{t('dashboard.reports.subtitle', lang)}</p>
          </div>
          <div className={styles.emailNote}>
            📧 {t('dashboard.reports.weeklyEmail', lang)}
          </div>
        </div>
      </header>

      {/* Coach: Athlete Selector */}
      {isCoachOrDoctor && coachAthletes.length > 0 && (
        <div className={styles.selectorRow}>
          <label style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', fontWeight: 600 }}>
            {t('dashboard.reports.selectAthlete', lang)}:
          </label>
          <select
            className={styles.athleteSelect}
            value={selectedAthlete || ''}
            onChange={(e) => setSelectedAthlete(e.target.value)}
          >
            {coachAthletes.map(a => (
              <option key={a.athlete_id} value={a.athlete_id}>
                {a.profile?.display_name || a.athlete_id}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Week Cards */}
      <div className={styles.weeksList}>
        {weekStats.map((week) => {
          const isOpen = expandedWeek === week.index;
          const { stats, prevStats } = week;
          const diff = (stats.avgScore != null && prevStats?.avgScore != null)
            ? stats.avgScore - prevStats.avgScore
            : null;

          return (
            <div key={week.index} className={styles.weekCard}>
              {/* Collapsed Header */}
              <div className={styles.weekHeader} onClick={() => toggleWeek(week.index)}>
                <div className={styles.weekHeaderLeft}>
                  <div className={styles.weekNumber}>{week.index + 1}</div>
                  <div className={styles.weekMeta}>
                    <span className={styles.weekLabel}>
                      {t('dashboard.reports.weekOf', lang)} {formatDate(week.startDate, lang)}
                    </span>
                    <span className={styles.weekDateRange}>
                      {formatDate(week.startDate, lang)} – {formatDate(week.endDate, lang)}
                    </span>
                  </div>
                </div>

                <div className={styles.weekHeaderRight}>
                  <span
                    className={styles.weekScore}
                    style={{ color: stats.avgScore != null ? scoreColor(stats.avgScore) : 'var(--text-muted)' }}
                  >
                    {stats.avgScore != null ? stats.avgScore : '--'}
                  </span>

                  {diff != null && (
                    <span className={`${styles.weekTrend} ${
                      diff > 2 ? styles.trendUp : diff < -2 ? styles.trendDown : styles.trendStable
                    }`}>
                      {diff > 2 ? '↑' : diff < -2 ? '↓' : '→'} {diff > 0 ? '+' : ''}{diff}
                    </span>
                  )}

                  <span className={`${styles.chevron} ${isOpen ? styles.chevronOpen : ''}`}>▼</span>
                </div>
              </div>

              {/* Expandable Body */}
              <div className={`${styles.weekBody} ${isOpen ? styles.weekBodyOpen : ''}`}>
                <div className={styles.weekBodyInner}>
                  <div className={styles.weekContent}>
                    {/* Stats Grid */}
                    <div className={styles.statsGrid}>
                      <StatItem
                        label={t('dashboard.reports.avgScore', lang)}
                        value={stats.avgScore ?? '--'}
                        color={stats.avgScore != null ? scoreColor(stats.avgScore) : undefined}
                        diff={diff}
                      />
                      <StatItem
                        label="HRV"
                        value={stats.avgHRV ?? '--'}
                        unit="ms"
                        diff={stats.avgHRV != null && prevStats?.avgHRV != null
                          ? stats.avgHRV - prevStats.avgHRV : null}
                      />
                      <StatItem
                        label="RHR"
                        value={stats.avgRHR ?? '--'}
                        unit="bpm"
                        diff={stats.avgRHR != null && prevStats?.avgRHR != null
                          ? stats.avgRHR - prevStats.avgRHR : null}
                        invertDiff
                      />
                      <StatItem
                        label={lang === 'es' ? 'Sueño' : 'Sleep'}
                        value={stats.avgSleep ?? '--'}
                        unit="h"
                        diff={stats.avgSleep != null && prevStats?.avgSleep != null
                          ? parseFloat((stats.avgSleep - prevStats.avgSleep).toFixed(1)) : null}
                      />
                      <StatItem
                        label={t('dashboard.reports.trainingDays', lang)}
                        value={`${stats.trainingDays}/${stats.totalDays}`}
                      />
                    </div>

                    {/* Best / Worst Day */}
                    {(stats.bestDay || stats.worstDay) && (
                      <div className={styles.bestWorstRow}>
                        {stats.bestDay && (
                          <div className={styles.bestDay}>
                            <div className={`${styles.dayLabel} ${styles.dayLabelGreen}`}>
                              {t('dashboard.reports.bestDay', lang)}
                            </div>
                            <div className={styles.dayName}>{stats.bestDay.dayName}</div>
                            <div className={styles.dayScore}>Score: {stats.bestDay.score}</div>
                          </div>
                        )}
                        {stats.worstDay && (
                          <div className={styles.worstDay}>
                            <div className={`${styles.dayLabel} ${styles.dayLabelRed}`}>
                              {t('dashboard.reports.worstDay', lang)}
                            </div>
                            <div className={styles.dayName}>{stats.worstDay.dayName}</div>
                            <div className={styles.dayScore}>Score: {stats.worstDay.score}</div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* ACWR */}
                    {stats.acwr != null && (
                      <div className={styles.acwrRow}>
                        <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)', fontWeight: 600 }}>
                          ACWR:
                        </span>
                        <span className={`${styles.acwrBadge} ${
                          stats.acwr <= 1.3 ? styles.acwrSafe
                            : stats.acwr <= 1.5 ? styles.acwrCaution
                            : styles.acwrDanger
                        }`}>
                          {stats.acwr}
                          {' '}
                          ({stats.acwr <= 1.3
                            ? (lang === 'es' ? 'Zona Segura' : 'Safe Zone')
                            : stats.acwr <= 1.5
                            ? (lang === 'es' ? 'Precaución' : 'Caution')
                            : (lang === 'es' ? 'Zona de Peligro' : 'Danger Zone')
                          })
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── StatItem Component ───────────────────────────────────────

function StatItem({ label, value, unit, diff, invertDiff, color }) {
  const isPositive = invertDiff ? diff < 0 : diff > 0;
  const diffColor = diff != null
    ? (Math.abs(diff) <= 2 ? 'var(--color-yellow)' : isPositive ? 'var(--color-green)' : 'var(--color-red)')
    : undefined;
  const arrow = diff != null
    ? (diff > 2 ? '↑' : diff < -2 ? '↓' : '→')
    : '';

  return (
    <div className={styles.statItem}>
      <div className={styles.statLabel}>{label}</div>
      <div className={styles.statValue} style={color ? { color } : undefined}>
        {value}
        {unit && <span className={styles.statUnit}>{unit}</span>}
      </div>
      {diff != null && (
        <span className={styles.statDiff} style={{ color: diffColor }}>
          {arrow} {diff > 0 ? '+' : ''}{diff}{unit || ''}
        </span>
      )}
    </div>
  );
}
