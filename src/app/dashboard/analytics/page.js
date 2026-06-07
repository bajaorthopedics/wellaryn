'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  ResponsiveContainer,
  BarChart, Bar,
  ComposedChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Cell,
} from 'recharts';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { t } from '@/lib/i18n';
import { calculateWellarynScore } from '@/lib/wellaryn-score';
import {
  fetchCoachAthletes,
  fetchDailyMetrics,
  metricsToWellarynInput,
} from '@/lib/supabase/data-service';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import styles from './analytics.module.css';

// ─── Constants ──────────────────────────────────────────────────
const RANGES = [
  { key: '7d',  days: 7   },
  { key: '30d', days: 30  },
  { key: '90d', days: 90  },
];

const ZONE_COLORS = [
  { label: 'Peak',       min: 90, max: 100, color: 'hsl(152, 68%, 52%)', barClass: 'barPeak' },
  { label: 'Optimal',    min: 80, max: 89,  color: 'hsl(152, 68%, 42%)', barClass: 'barOptimal' },
  { label: 'Productive', min: 70, max: 79,  color: 'hsl(45, 93%, 58%)',  barClass: 'barProductive' },
  { label: 'Caution',    min: 60, max: 69,  color: 'hsl(30, 90%, 50%)',  barClass: 'barCaution' },
  { label: 'Recovery',   min: 0,  max: 59,  color: 'hsl(0, 72%, 56%)',   barClass: 'barRecovery' },
];

const ATHLETE_PALETTE = [
  'hsl(152, 68%, 52%)', 'hsl(187, 70%, 55%)', 'hsl(270, 60%, 60%)',
  'hsl(45, 93%, 58%)',  'hsl(0, 72%, 56%)',   'hsl(210, 70%, 55%)',
  'hsl(330, 60%, 55%)', 'hsl(120, 50%, 50%)', 'hsl(30, 90%, 55%)',
  'hsl(240, 55%, 60%)', 'hsl(170, 60%, 45%)', 'hsl(350, 65%, 50%)',
];

const CHART_COLORS = {
  accent: 'hsl(152, 68%, 52%)',
  muted: 'hsl(225, 10%, 35%)',
  tickFill: 'hsl(225, 10%, 55%)',
  grid: 'hsla(0, 0%, 100%, 0.06)',
  dotBg: 'hsl(225, 14%, 13%)',
};

// ─── Helpers ────────────────────────────────────────────────────

function getInitials(name) {
  if (!name) return '?';
  return name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();
}

function getScoreZone(score) {
  if (score == null) return null;
  return ZONE_COLORS.find((z) => score >= z.min && score <= z.max) || ZONE_COLORS[4];
}

function getScoreColorClass(score) {
  if (score == null) return '';
  if (score >= 70) return styles.scoreGreen;
  if (score >= 60) return styles.scoreYellow;
  return styles.scoreRed;
}

function avg(arr) {
  if (arr.length === 0) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function formatDateLabel(dateStr) {
  const parts = dateStr.split('-');
  return `${parts[1]}/${parts[2]}`;
}

// Process a single athlete from fetchCoachAthletes response
function processAthleteData(athlete) {
  const { profile, recentMetrics } = athlete;
  const metrics = recentMetrics || [];
  const name = profile?.display_name || profile?.email?.split('@')[0] || 'Athlete';
  const sortedMetrics = [...metrics].sort((a, b) => a.date.localeCompare(b.date));

  let wellarynResult = null;
  let latestMetric = null;

  if (sortedMetrics.length > 0) {
    latestMetric = sortedMetrics[sortedMetrics.length - 1];
    try {
      const input = metricsToWellarynInput(sortedMetrics, profile);
      if (input) {
        wellarynResult = calculateWellarynScore(input);
      }
    } catch (err) {
      console.error(`Error calculating score for ${name}:`, err);
    }
  }

  const score = wellarynResult?.score ?? null;

  return {
    id: profile?.id || athlete.id,
    name,
    initials: getInitials(name),
    score,
    wellarynResult,
    latestMetric,
    hrv: latestMetric?.hrv_rmssd ?? null,
    sleepTotal: latestMetric?.sleep_total ?? null,
    trainingLoad: latestMetric?.training_load ?? null,
    readiness: wellarynResult?.subScores?.readiness ?? null,
    profileData: profile,
    metricsHistory: sortedMetrics,
    trainingDays: sortedMetrics.filter((m) => m.training_load != null && m.training_load > 0).length,
  };
}

// ─── Shared Chart Config ────────────────────────────────────────

const xAxisProps = {
  stroke: CHART_COLORS.muted,
  tick: { fontSize: 11, fill: CHART_COLORS.tickFill },
  tickLine: false,
  axisLine: false,
};

const yAxisProps = {
  stroke: CHART_COLORS.muted,
  tick: { fontSize: 11, fill: CHART_COLORS.tickFill },
  tickLine: false,
  axisLine: false,
};

const gridProps = {
  strokeDasharray: '3 3',
  stroke: CHART_COLORS.grid,
  vertical: false,
};

// ─── Shared Tooltip ─────────────────────────────────────────────

function ChartTooltip({ active, payload, label, keys }) {
  if (!active || !payload?.length) return null;
  return (
    <div className={styles.tooltip}>
      <div className={styles.tooltipLabel}>{label}</div>
      {payload.map((entry) => (
        <div key={entry.dataKey} className={styles.tooltipRow}>
          <span className={styles.tooltipDot} style={{ background: entry.color || entry.stroke }} />
          <span style={{ color: entry.color || entry.stroke, fontWeight: 600, fontSize: '12px' }}>
            {keys?.[entry.dataKey] || entry.dataKey}: {typeof entry.value === 'number' ? (
              Number.isInteger(entry.value) ? entry.value : entry.value.toFixed(1)
            ) : entry.value}
          </span>
        </div>
      ))}
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────

function TeamAnalyticsPage() {
  const { lang } = useLanguage();
  const { user, profile } = useAuth();

  const [athletes, setAthletes] = useState(null);
  const [allMetrics, setAllMetrics] = useState({}); // { athleteId: metrics[] }
  const [selectedRange, setSelectedRange] = useState('30d');
  const [visibleAthletes, setVisibleAthletes] = useState(new Set());
  const [hoveredRiskDot, setHoveredRiskDot] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const currentDays = RANGES.find((r) => r.key === selectedRange)?.days || 30;

  // ─── Fetch Athletes ────────────────────────────────────────────
  const loadData = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const raw = await fetchCoachAthletes(user.id);
      const accepted = (raw || []).filter((r) => r.status === 'accepted');
      const processed = accepted.map(processAthleteData);
      setAthletes(processed);
      setVisibleAthletes(new Set(processed.map((a) => a.id)));

      // Fetch extended metrics for each athlete for trends
      const metricsMap = {};
      await Promise.all(
        processed.map(async (a) => {
          try {
            const data = await fetchDailyMetrics(a.id, 90);
            metricsMap[a.id] = data || [];
          } catch {
            metricsMap[a.id] = [];
          }
        })
      );
      setAllMetrics(metricsMap);
    } catch (err) {
      console.error('Error loading analytics:', err);
      setAthletes([]);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ─── Compute Analytics ────────────────────────────────────────

  const analytics = useMemo(() => {
    if (!athletes || athletes.length === 0) return null;

    const withScore = athletes.filter((a) => a.score != null);
    const scores = withScore.map((a) => a.score);
    const teamAvg = scores.length > 0 ? Math.round(avg(scores)) : null;
    const alertCount = withScore.filter((a) => a.score < 60).length;

    const hrvValues = athletes.map((a) => a.hrv).filter((v) => v != null);
    const sleepValues = athletes.map((a) => a.sleepTotal).filter((v) => v != null);
    const teamHRV = hrvValues.length > 0 ? Math.round(avg(hrvValues)) : null;
    const teamSleep = sleepValues.length > 0 ? avg(sleepValues).toFixed(1) : null;

    // Score distribution
    const distribution = ZONE_COLORS.map((z) => ({
      ...z,
      count: withScore.filter((a) => a.score >= z.min && a.score <= z.max).length,
    }));

    // Score comparison (sorted descending)
    const comparison = [...withScore].sort((a, b) => b.score - a.score);

    // Leaderboard (sorted descending)
    const leaderboard = [...athletes].sort((a, b) => (b.score ?? -1) - (a.score ?? -1));

    // Compute consecutive days logged streak
    leaderboard.forEach((a) => {
      const metrics = allMetrics[a.id] || a.metricsHistory || [];
      let streak = 0;
      const today = new Date();
      for (let i = 0; i < 90; i++) {
        const checkDate = new Date(today);
        checkDate.setDate(checkDate.getDate() - i);
        const dateStr = checkDate.toISOString().split('T')[0];
        if (metrics.some((m) => m.date === dateStr)) {
          streak++;
        } else {
          break;
        }
      }
      a.streak = streak;
    });

    // Most improved (biggest score increase — compare first vs last in window)
    let mostImproved = null;
    let bestDelta = -Infinity;
    athletes.forEach((a) => {
      const mets = allMetrics[a.id] || [];
      if (mets.length < 2) return;
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - currentDays);
      const cutoffStr = cutoff.toISOString().split('T')[0];
      const inRange = mets.filter((m) => m.date >= cutoffStr).sort((x, y) => x.date.localeCompare(y.date));
      if (inRange.length < 2) return;

      const firstSlice = inRange.slice(0, Math.min(3, inRange.length));
      const lastSlice = inRange.slice(-Math.min(3, inRange.length));

      const firstInput = metricsToWellarynInput(firstSlice, a.profileData);
      const lastInput = metricsToWellarynInput(lastSlice, a.profileData);
      if (!firstInput || !lastInput) return;

      try {
        const firstScore = calculateWellarynScore(firstInput).score;
        const lastScore = calculateWellarynScore(lastInput).score;
        const delta = lastScore - firstScore;
        if (delta > bestDelta) {
          bestDelta = delta;
          mostImproved = { name: a.name, delta };
        }
      } catch { /* skip */ }
    });

    // Team trends data
    const trendData = [];
    const allDates = new Set();
    Object.values(allMetrics).forEach((mets) => {
      mets.forEach((m) => allDates.add(m.date));
    });

    const sortedDates = [...allDates].sort();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - currentDays);
    const cutoffStr = cutoffDate.toISOString().split('T')[0];
    const filteredDates = sortedDates.filter((d) => d >= cutoffStr);

    filteredDates.forEach((date) => {
      const point = { date: formatDateLabel(date), fullDate: date };
      athletes.forEach((a) => {
        const mets = allMetrics[a.id] || [];
        const upTo = mets.filter((m) => m.date <= date).slice(-7);
        if (upTo.length > 0) {
          const input = metricsToWellarynInput(upTo, a.profileData);
          if (input) {
            try {
              const result = calculateWellarynScore(input);
              point[a.id] = result.score;
            } catch { /* skip */ }
          }
        }
      });
      trendData.push(point);
    });

    // Risk matrix data
    const riskData = athletes.map((a) => {
      const readiness = a.readiness ?? 50;
      const load = a.trainingLoad ?? 0;
      return { ...a, readinessScore: readiness, loadScore: load };
    });

    return {
      teamAvg,
      alertCount,
      teamHRV,
      teamSleep,
      distribution,
      comparison,
      leaderboard,
      mostImproved,
      trendData,
      riskData,
    };
  }, [athletes, allMetrics, currentDays]);

  // ─── Toggle athlete visibility in trends ─────────────────────

  const toggleAthleteVisibility = (id) => {
    setVisibleAthletes((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // ─── Loading ────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className={styles.page}>
        <header className={styles.header}>
          <h1 className={styles.title}>{t('dashboard.analytics.title', lang)}</h1>
          <p className={styles.subtitle}>{t('dashboard.analytics.subtitle', lang)}</p>
        </header>
        <div className={styles.skeletonGrid}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className={styles.skeletonCard} />
          ))}
        </div>
        <div className={styles.chartsGrid}>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className={styles.skeletonChart} />
          ))}
        </div>
      </div>
    );
  }

  // ─── Empty State ──────────────────────────────────────────────
  if (!athletes || athletes.length === 0) {
    return (
      <div className={styles.page}>
        <header className={styles.header}>
          <h1 className={styles.title}>{t('dashboard.analytics.title', lang)}</h1>
          <p className={styles.subtitle}>{t('dashboard.analytics.subtitle', lang)}</p>
        </header>
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>📊</div>
          <h2 className={styles.emptyTitle}>{t('dashboard.analytics.title', lang)}</h2>
          <p className={styles.emptyText}>{t('dashboard.analytics.noData', lang)}</p>
        </div>
      </div>
    );
  }

  if (!analytics) return null;

  const {
    teamAvg, alertCount, teamHRV, teamSleep,
    distribution, comparison, leaderboard,
    mostImproved, trendData, riskData,
  } = analytics;

  // Comparison chart data
  const comparisonData = comparison.map((a) => ({
    name: a.name.length > 10 ? a.name.slice(0, 10) + '…' : a.name,
    score: a.score,
    zone: getScoreZone(a.score),
  }));

  // Max load for risk matrix normalization
  const maxLoad = Math.max(...riskData.map((a) => a.loadScore || 0), 1);

  // ─── Render ───────────────────────────────────────────────────
  return (
    <div className={styles.page}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.headerRow}>
          <div>
            <h1 className={styles.title}>{t('dashboard.analytics.title', lang)}</h1>
            <p className={styles.subtitle}>{t('dashboard.analytics.subtitle', lang)}</p>
          </div>
          <div className={styles.timeRange}>
            {RANGES.map((r) => (
              <button
                key={r.key}
                className={`${styles.timePill} ${selectedRange === r.key ? styles.timePillActive : ''}`}
                onClick={() => setSelectedRange(r.key)}
              >
                {r.key.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* 1. Summary Cards */}
      <div className={styles.summaryGrid}>
        <div className={styles.summaryCard}>
          <div className={styles.summaryIcon}>👥</div>
          <div className={styles.summaryLabel}>{t('dashboard.analytics.totalAthletes', lang)}</div>
          <div className={styles.summaryValue}>{athletes.length}</div>
          <div className={styles.summaryMeta}>
            {athletes.filter((a) => a.score != null).length} {lang === 'es' ? 'activos' : 'active'}
          </div>
        </div>

        <div className={styles.summaryCard}>
          <div className={styles.summaryIcon}>🎯</div>
          <div className={styles.summaryLabel}>{t('dashboard.analytics.teamAvg', lang)}</div>
          <div className={styles.summaryValue}>{teamAvg ?? '—'}</div>
          {teamAvg != null && (
            <div className={styles.summaryMeta} style={{ color: getScoreZone(teamAvg)?.color }}>
              {getScoreZone(teamAvg)?.label}
            </div>
          )}
        </div>

        <div className={`${styles.summaryCard} ${alertCount > 0 ? styles.summaryCardAlert : ''}`}>
          <div className={styles.summaryIcon}>⚠️</div>
          <div className={styles.summaryLabel}>{t('dashboard.analytics.alertZone', lang)}</div>
          <div className={styles.summaryValue} style={alertCount > 0 ? { color: 'var(--color-red)' } : {}}>
            {alertCount}
          </div>
          <div className={styles.summaryMeta}>
            {lang === 'es' ? 'score < 60' : 'score < 60'}
          </div>
        </div>

        <div className={styles.summaryCard}>
          <div className={styles.summaryIcon}>😴</div>
          <div className={styles.summaryLabel}>{lang === 'es' ? 'Sueño Promedio' : 'Avg Sleep'}</div>
          <div className={styles.summaryValue}>{teamSleep ?? '—'}<span style={{ fontSize: '0.6em', color: 'var(--text-secondary)' }}>h</span></div>
        </div>

        <div className={styles.summaryCard}>
          <div className={styles.summaryIcon}>💓</div>
          <div className={styles.summaryLabel}>{lang === 'es' ? 'HRV Promedio' : 'Avg HRV'}</div>
          <div className={styles.summaryValue}>{teamHRV ?? '—'}<span style={{ fontSize: '0.6em', color: 'var(--text-secondary)' }}> ms</span></div>
        </div>

        <div className={styles.summaryCard}>
          <div className={styles.summaryIcon}>📈</div>
          <div className={styles.summaryLabel}>{t('dashboard.analytics.mostImproved', lang)}</div>
          <div className={styles.summaryValue} style={{ fontSize: 'var(--font-size-lg)' }}>
            {mostImproved ? mostImproved.name : '—'}
          </div>
          {mostImproved && (
            <div className={`${styles.summaryMeta} ${mostImproved.delta > 0 ? styles.trendUp : styles.trendDown}`}>
              {mostImproved.delta > 0 ? '↑' : '↓'} {Math.abs(mostImproved.delta)} pts
            </div>
          )}
        </div>
      </div>

      {/* Charts Row */}
      <div className={styles.chartsGrid}>

        {/* 2. Score Distribution */}
        <div className={styles.chartCard}>
          <div className={styles.chartHeader}>
            <div>
              <h3 className={styles.chartTitle}>{t('dashboard.analytics.distribution', lang)}</h3>
              <span className={styles.chartSubtitle}>{athletes.length} {lang === 'es' ? 'atletas' : 'athletes'}</span>
            </div>
          </div>
          <div className={styles.distributionChart}>
            {distribution.map((zone) => {
              const pct = athletes.length > 0 ? (zone.count / athletes.length) * 100 : 0;
              return (
                <div key={zone.label} className={styles.distributionRow}>
                  <div className={styles.distributionLabel}>
                    {zone.label} ({zone.min}–{zone.max})
                  </div>
                  <div className={styles.distributionBarWrap}>
                    <div
                      className={`${styles.distributionBar} ${styles[zone.barClass]}`}
                      style={{ width: `${Math.max(pct, zone.count > 0 ? 8 : 0)}%` }}
                    >
                      {zone.count > 0 && (
                        <span className={styles.distributionCount}>
                          {zone.count} ({Math.round(pct)}%)
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 3. Score Comparison Bar Chart */}
        <div className={styles.chartCard}>
          <div className={styles.chartHeader}>
            <div>
              <h3 className={styles.chartTitle}>{t('dashboard.analytics.comparison', lang)}</h3>
              <span className={styles.chartSubtitle}>{lang === 'es' ? 'Mayor a menor' : 'Highest to lowest'}</span>
            </div>
          </div>
          <div className={styles.chartWrapper}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={comparisonData} margin={{ top: 10, right: 10, left: -10, bottom: 20 }}>
                <CartesianGrid {...gridProps} />
                <XAxis
                  dataKey="name"
                  {...xAxisProps}
                  angle={-35}
                  textAnchor="end"
                  height={60}
                  interval={0}
                  tick={{ fontSize: 10, fill: CHART_COLORS.tickFill }}
                />
                <YAxis {...yAxisProps} domain={[0, 100]} />
                <Tooltip content={<ChartTooltip keys={{ score: 'Score' }} />} />
                <Bar dataKey="score" radius={[4, 4, 0, 0]} maxBarSize={40}>
                  {comparisonData.map((entry, index) => (
                    <Cell
                      key={index}
                      fill={entry.zone?.color || CHART_COLORS.muted}
                      fillOpacity={0.75}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 4. Team Trends (full-width) */}
        <div className={`${styles.chartCard} ${styles.chartCardFull}`}>
          <div className={styles.chartHeader}>
            <div>
              <h3 className={styles.chartTitle}>{t('dashboard.analytics.trends', lang)}</h3>
              <span className={styles.chartSubtitle}>
                {currentDays}{lang === 'es' ? ' días' : '-day trend'}
              </span>
            </div>
          </div>
          <div className={styles.chartWrapper} style={{ height: 320 }}>
            {trendData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={trendData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid {...gridProps} />
                  <XAxis
                    dataKey="date"
                    {...xAxisProps}
                    interval={Math.max(0, Math.floor(trendData.length / 10))}
                  />
                  <YAxis {...yAxisProps} domain={[0, 100]} />
                  <Tooltip
                    content={
                      <ChartTooltip
                        keys={Object.fromEntries(
                          athletes.map((a) => [a.id, a.name])
                        )}
                      />
                    }
                  />
                  {athletes.map((a, i) => (
                    visibleAthletes.has(a.id) && (
                      <Line
                        key={a.id}
                        type="monotone"
                        dataKey={a.id}
                        stroke={ATHLETE_PALETTE[i % ATHLETE_PALETTE.length]}
                        strokeWidth={2}
                        dot={false}
                        connectNulls
                        strokeOpacity={0.85}
                      />
                    )
                  ))}
                </ComposedChart>
              </ResponsiveContainer>
            ) : (
              <div className={styles.emptyState} style={{ padding: '2rem' }}>
                <p className={styles.emptyText}>{t('dashboard.analytics.noData', lang)}</p>
              </div>
            )}
          </div>
          {/* Legend / toggles */}
          <div className={styles.legend}>
            {athletes.map((a, i) => (
              <div
                key={a.id}
                className={`${styles.legendItem} ${!visibleAthletes.has(a.id) ? styles.legendItemDisabled : ''}`}
                onClick={() => toggleAthleteVisibility(a.id)}
              >
                <span
                  className={styles.legendDot}
                  style={{ background: ATHLETE_PALETTE[i % ATHLETE_PALETTE.length] }}
                />
                {a.name}
              </div>
            ))}
          </div>
        </div>

        {/* 5. Risk Matrix */}
        <div className={styles.chartCard}>
          <div className={styles.chartHeader}>
            <div>
              <h3 className={styles.chartTitle}>{t('dashboard.analytics.riskMatrix', lang)}</h3>
              <span className={styles.chartSubtitle}>
                {lang === 'es' ? 'Carga vs Preparación' : 'Load vs Readiness'}
              </span>
            </div>
          </div>
          <div className={styles.riskMatrix}>
            {/* Quadrants */}
            <div className={styles.riskQuadrant} data-zone="high-ready-low-load" />
            <div className={styles.riskQuadrant} data-zone="high-ready-high-load" />
            <div className={styles.riskQuadrant} data-zone="low-ready-low-load" />
            <div className={styles.riskQuadrant} data-zone="low-ready-high-load" />

            {/* Zone labels */}
            <span className={`${styles.riskZoneLabel} ${styles.riskZoneTL}`}>
              {lang === 'es' ? 'Óptimo' : 'Optimal'}
            </span>
            <span className={`${styles.riskZoneLabel} ${styles.riskZoneTR}`}>
              {lang === 'es' ? 'Monitorear' : 'Monitor'}
            </span>
            <span className={`${styles.riskZoneLabel} ${styles.riskZoneBL}`}>
              {lang === 'es' ? 'Subentrenado' : 'Undertrained'}
            </span>
            <span className={`${styles.riskZoneLabel} ${styles.riskZoneBR}`}>
              ⚠ {lang === 'es' ? 'Riesgo' : 'At Risk'}
            </span>

            {/* Axis labels */}
            <span className={`${styles.riskAxisLabel} ${styles.riskAxisX}`}>
              {lang === 'es' ? 'Carga →' : 'Load →'}
            </span>
            <span className={`${styles.riskAxisLabel} ${styles.riskAxisY}`}>
              {lang === 'es' ? 'Preparación →' : 'Readiness →'}
            </span>

            {/* Athlete dots */}
            {riskData.map((a) => {
              const xPct = maxLoad > 0 ? Math.min(((a.loadScore || 0) / maxLoad) * 80 + 10, 92) : 50;
              const yPct = 92 - (Math.min(a.readinessScore, 100) / 100) * 80;

              let dotClass = styles.riskDotMuted;
              if (a.readinessScore >= 60 && xPct < 55) dotClass = styles.riskDotGreen;
              else if (a.readinessScore < 50 && xPct > 55) dotClass = styles.riskDotRed;
              else if (a.score != null) dotClass = styles.riskDotYellow;

              return (
                <div
                  key={a.id}
                  className={`${styles.riskDot} ${dotClass}`}
                  style={{ left: `${xPct}%`, top: `${yPct}%` }}
                  title={`${a.name}: ${lang === 'es' ? 'Prep' : 'Ready'} ${a.readinessScore}, ${lang === 'es' ? 'Carga' : 'Load'} ${a.loadScore || 0}`}
                  onMouseEnter={() => setHoveredRiskDot(a.id)}
                  onMouseLeave={() => setHoveredRiskDot(null)}
                >
                  {a.initials}
                  {hoveredRiskDot === a.id && (
                    <div className={styles.riskTooltip}>
                      {a.name} — {lang === 'es' ? 'Prep' : 'Ready'}: {a.readinessScore}, {lang === 'es' ? 'Carga' : 'Load'}: {a.loadScore || 0}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Placeholder for visual balance */}
        <div />
      </div>

      {/* 6. Leaderboard */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>
          <span className={styles.sectionIcon}>🏆</span>
          {t('dashboard.analytics.leaderboard', lang)}
        </h2>
        <div className={styles.leaderboard}>
          <table className={styles.leaderboardTable}>
            <thead>
              <tr>
                <th>{t('dashboard.analytics.rank', lang)}</th>
                <th>{lang === 'es' ? 'Atleta' : 'Athlete'}</th>
                <th>Score</th>
                <th>HRV</th>
                <th>{lang === 'es' ? 'Sueño' : 'Sleep'}</th>
                <th>{lang === 'es' ? 'Días Entreno' : 'Training Days'}</th>
                <th>{t('dashboard.analytics.streak', lang)}</th>
              </tr>
            </thead>
            <tbody>
              {leaderboard.map((a, i) => {
                const rank = i + 1;
                const medals = ['🥇', '🥈', '🥉'];
                const isWarning = a.score != null && a.score < 60;
                return (
                  <tr key={a.id} className={isWarning ? styles.warningRow : ''}>
                    <td className={styles.rankCell}>
                      {rank <= 3 ? (
                        <span className={styles.medal}>{medals[rank - 1]}</span>
                      ) : (
                        rank
                      )}
                    </td>
                    <td>
                      <div className={styles.athleteCell}>
                        <div className={styles.leaderAvatar}>{a.initials}</div>
                        <span className={styles.athleteName}>{a.name}</span>
                      </div>
                    </td>
                    <td className={`${styles.scoreCell} ${getScoreColorClass(a.score)}`}>
                      {a.score ?? '—'}
                    </td>
                    <td className={styles.metricCell}>
                      {a.hrv != null ? Math.round(a.hrv) : '—'}
                    </td>
                    <td className={styles.metricCell}>
                      {a.sleepTotal != null ? `${a.sleepTotal.toFixed(1)}h` : '—'}
                    </td>
                    <td className={styles.metricCell}>{a.trainingDays}</td>
                    <td className={styles.metricCell}>
                      {a.streak > 0 ? `${a.streak}🔥` : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// Wrap with ProtectedRoute
export default function AnalyticsPageWrapper() {
  return (
    <ProtectedRoute allowedRoles={['coach', 'doctor']}>
      <TeamAnalyticsPage />
    </ProtectedRoute>
  );
}
