'use client';

import { useState, useEffect, useCallback, useTransition } from 'react';
import {
  ResponsiveContainer,
  AreaChart, Area,
  BarChart, Bar,
  ComposedChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ReferenceArea, Cell,
} from 'recharts';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { t } from '@/lib/i18n';
import { calculateWellarynScore } from '@/lib/wellaryn-score';
import { fetchDailyMetrics, metricsToWellarynInput } from '@/lib/supabase/data-service';
import styles from './history.module.css';

// ─── Constants ──────────────────────────────────────────────────
const RANGES = [
  { key: '7d',  days: 7,   label: 'dashboard.history.7d'  },
  { key: '30d', days: 30,  label: 'dashboard.history.30d' },
  { key: '90d', days: 90,  label: 'dashboard.history.90d' },
  { key: '6m',  days: 180, label: 'dashboard.history.6m'  },
  { key: '1y',  days: 365, label: 'dashboard.history.1y'  },
];

const CHART_COLORS = {
  accent: 'hsl(152, 68%, 52%)',
  accentDim: 'hsla(152, 68%, 52%, 0.3)',
  yellow: 'hsl(45, 93%, 58%)',
  yellowDim: 'hsla(45, 93%, 58%, 0.15)',
  red: 'hsl(0, 72%, 56%)',
  redDim: 'hsla(0, 72%, 56%, 0.15)',
  cyan: 'hsl(187, 70%, 55%)',
  cyanDim: 'hsla(187, 70%, 55%, 0.3)',
  indigo: 'hsl(239, 60%, 55%)',
  indigoDim: 'hsla(239, 60%, 55%, 0.3)',
  purple: 'hsl(270, 60%, 60%)',
  purpleDim: 'hsla(270, 60%, 60%, 0.3)',
  muted: 'hsl(225, 10%, 35%)',
  mutedDim: 'hsl(225, 10%, 40%)',
  grid: 'hsla(0, 0%, 100%, 0.06)',
  tickFill: 'hsl(225, 10%, 55%)',
  dotBg: 'hsl(225, 14%, 13%)',
};

// ─── Helpers ────────────────────────────────────────────────────

function computeMovingAverage(arr, key, window = 7) {
  return arr.map((_, i) => {
    const slice = arr.slice(Math.max(0, i - window + 1), i + 1);
    const vals = slice.map(d => d[key]).filter(v => v != null);
    return vals.length > 0 ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : null;
  });
}

function getTrend(current, previous) {
  if (previous === 0 || previous == null) return { dir: 'flat', pct: 0 };
  const pct = Math.round(((current - previous) / Math.abs(previous)) * 100);
  if (pct > 2) return { dir: 'up', pct };
  if (pct < -2) return { dir: 'down', pct };
  return { dir: 'flat', pct };
}

function avg(arr) {
  if (arr.length === 0) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function formatDateLabel(dateStr, totalDays) {
  // dateStr is YYYY-MM-DD
  const parts = dateStr.split('-');
  if (totalDays <= 14) return `${parts[1]}/${parts[2]}`;
  if (totalDays <= 90) return `${parts[1]}/${parts[2]}`;
  return `${parts[1]}/${parts[2]}`;
}

// Calculate Wellaryn Score for a sliding window ending at each day
function computeDailyScores(metrics, profile) {
  const scores = [];
  for (let i = 0; i < metrics.length; i++) {
    // Use up to 14 days of history ending at this day
    const windowStart = Math.max(0, i - 13);
    const window = metrics.slice(windowStart, i + 1);
    const input = metricsToWellarynInput(window, profile);
    if (input) {
      const result = calculateWellarynScore(input);
      scores.push(result.score);
    } else {
      scores.push(null);
    }
  }
  return scores;
}

// ─── Shared Tooltip ─────────────────────────────────────────────

function ChartTooltip({ active, payload, label, unit, keys }) {
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
            ) : entry.value}{unit || ''}
          </span>
        </div>
      ))}
    </div>
  );
}

// ─── Shared Axis Config ─────────────────────────────────────────

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

// ─── Main Component ─────────────────────────────────────────────

export default function HistoryPage() {
  const { lang } = useLanguage();
  const { user, profile } = useAuth();
  const [selectedRange, setSelectedRange] = useState('30d');
  const [metrics, setMetrics] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isFading, setIsFading] = useState(false);
  const [, startTransition] = useTransition();

  const currentDays = RANGES.find(r => r.key === selectedRange)?.days || 30;

  // ─── Data Fetching ────────────────────────────────────────────
  const loadData = useCallback(async (days) => {
    if (!user) {
      setIsLoading(false);
      return;
    }
    try {
      // Fetch double the range to compare current vs previous period
      const data = await fetchDailyMetrics(user.id, days * 2);
      setMetrics(data || []);
    } catch (err) {
      console.error('Error fetching history data:', err);
      setMetrics([]);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    setIsLoading(true);
    loadData(currentDays);
  }, [loadData, currentDays]);

  // ─── Range Change Handler ─────────────────────────────────────
  const handleRangeChange = (key) => {
    if (key === selectedRange) return;
    setIsFading(true);
    setTimeout(() => {
      startTransition(() => {
        setSelectedRange(key);
        setIsFading(false);
      });
    }, 200);
  };

  // ─── Loading State ────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className={styles.page}>
        <header className={styles.header}>
          <h1 className={styles.title}>{t('dashboard.history.title', lang)}</h1>
          <p className={styles.subtitle}>{t('dashboard.history.subtitle', lang)}</p>
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
  if (!metrics || metrics.length === 0) {
    return (
      <div className={styles.page}>
        <header className={styles.header}>
          <h1 className={styles.title}>{t('dashboard.history.title', lang)}</h1>
          <p className={styles.subtitle}>{t('dashboard.history.subtitle', lang)}</p>
        </header>
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>📈</div>
          <h2 className={styles.emptyTitle}>
            {lang === 'es' ? 'Sin datos históricos' : 'No Historical Data'}
          </h2>
          <p className={styles.emptyText}>{t('dashboard.history.noData', lang)}</p>
        </div>
      </div>
    );
  }

  // ─── Process Data ─────────────────────────────────────────────

  // Split into current & previous period
  const allSorted = [...metrics].sort((a, b) => a.date.localeCompare(b.date));
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - currentDays);
  const cutoffStr = cutoffDate.toISOString().split('T')[0];

  const currentPeriod = allSorted.filter(m => m.date >= cutoffStr);
  const previousPeriod = allSorted.filter(m => m.date < cutoffStr);

  // Daily Wellaryn scores
  const dailyScores = computeDailyScores(currentPeriod, profile);
  const prevScores = computeDailyScores(previousPeriod, profile).filter(s => s != null);

  // Build unified chart data
  const chartData = currentPeriod.map((m, i) => {
    const score = dailyScores[i];
    return {
      date: formatDateLabel(m.date, currentDays),
      fullDate: m.date,
      score,
      hrv: m.hrv_rmssd,
      rhr: m.rhr,
      sleepTotal: m.sleep_total,
      sleepQuality: m.sleep_quality,
      sleepDeep: m.sleep_deep || 0,
      sleepRem: m.sleep_rem || 0,
      sleepLight: m.sleep_light || 0,
      trainingLoad: m.training_load,
      stress: m.stress,
      energy: m.energy,
      mood: m.mood,
    };
  });

  // Moving averages
  const scoreMA = computeMovingAverage(chartData, 'score');
  const hrvMA = computeMovingAverage(chartData, 'hrv');
  const rhrMA = computeMovingAverage(chartData, 'rhr');

  // Augment chart data with moving averages
  chartData.forEach((d, i) => {
    d.scoreMA = scoreMA[i];
    d.hrvMA = hrvMA[i];
    d.rhrMA = rhrMA[i];
  });

  // ─── Summary Stats ─────────────────────────────────────────
  const validScores = chartData.map(d => d.score).filter(s => s != null);
  const validHRV = chartData.map(d => d.hrv).filter(v => v != null);
  const validRHR = chartData.map(d => d.rhr).filter(v => v != null);
  const validSleep = chartData.map(d => d.sleepTotal).filter(v => v != null);
  const trainingDays = chartData.filter(d => d.trainingLoad != null && d.trainingLoad > 0).length;

  const prevValidScores = prevScores.filter(s => s != null);
  const prevHRV = previousPeriod.map(m => m.hrv_rmssd).filter(v => v != null);
  const prevRHR = previousPeriod.map(m => m.rhr).filter(v => v != null);
  const prevSleep = previousPeriod.map(m => m.sleep_total).filter(v => v != null);

  const stats = {
    avgScore: { val: Math.round(avg(validScores)), prev: Math.round(avg(prevValidScores)) },
    avgHRV: { val: Math.round(avg(validHRV)), prev: Math.round(avg(prevHRV)) },
    avgRHR: { val: Math.round(avg(validRHR)), prev: Math.round(avg(prevRHR)) },
    avgSleep: { val: avg(validSleep).toFixed(1), prev: avg(prevSleep).toFixed(1) },
    trainingDays: { val: trainingDays },
    bestScore: { val: validScores.length > 0 ? Math.max(...validScores) : '--' },
    worstScore: { val: validScores.length > 0 ? Math.min(...validScores) : '--' },
  };

  // Trend helpers — for RHR "down" is good (inverted)
  const scoreTrend = getTrend(stats.avgScore.val, stats.avgScore.prev);
  const hrvTrend = getTrend(stats.avgHRV.val, stats.avgHRV.prev);
  const rhrTrend = getTrend(stats.avgRHR.val, stats.avgRHR.prev);
  const sleepTrend = getTrend(parseFloat(stats.avgSleep.val), parseFloat(stats.avgSleep.prev));

  // Baselines
  const hrvBaseline = validHRV.length > 0 ? Math.round(avg(validHRV)) : null;
  const rhrBaseline = validRHR.length > 0 ? Math.round(avg(validRHR)) : null;
  const sleepTarget = profile?.sleep_need || 8;

  // ACWR for training load chart
  const trainingLoadData = chartData.filter(d => d.trainingLoad != null);
  const acwrData = trainingLoadData.map((d, i) => {
    const acuteSlice = trainingLoadData.slice(Math.max(0, i - 6), i + 1);
    const chronicSlice = trainingLoadData.slice(Math.max(0, i - 27), i + 1);
    const acuteAvg = avg(acuteSlice.map(x => x.trainingLoad || 0));
    const chronicAvg = avg(chronicSlice.map(x => x.trainingLoad || 0));
    return {
      ...d,
      acwr: chronicAvg > 0 ? parseFloat((acuteAvg / chronicAvg).toFixed(2)) : 0,
    };
  });

  // Score trend direction
  const overallScoreTrend = scoreTrend.dir === 'up'
    ? t('dashboard.history.improving', lang)
    : scoreTrend.dir === 'down'
    ? t('dashboard.history.declining', lang)
    : t('dashboard.history.stable', lang);

  const trendBadgeClass = scoreTrend.dir === 'up'
    ? styles.badgeGreen
    : scoreTrend.dir === 'down'
    ? styles.badgeRed
    : styles.badgeYellow;

  // Tick interval for X axis
  const tickInterval = currentDays <= 7 ? 0 : currentDays <= 30 ? 3 : currentDays <= 90 ? 7 : 14;

  // ─── Render ───────────────────────────────────────────────────
  return (
    <div className={styles.page}>
      {/* Header */}
      <header className={styles.header}>
        <h1 className={styles.title}>{t('dashboard.history.title', lang)}</h1>
        <p className={styles.subtitle}>{t('dashboard.history.subtitle', lang)}</p>
      </header>

      {/* Time Range Selector */}
      <div className={styles.timeRange}>
        {RANGES.map(r => (
          <button
            key={r.key}
            className={`${styles.timePill} ${selectedRange === r.key ? styles.timePillActive : ''}`}
            onClick={() => handleRangeChange(r.key)}
          >
            {t(r.label, lang)}
          </button>
        ))}
      </div>

      <div className={`${styles.contentTransition} ${isFading ? styles.contentFading : ''}`}>
        {/* Summary Stats */}
        <div className={styles.statsRow}>
          <StatCard
            label={t('dashboard.history.avgScore', lang)}
            value={stats.avgScore.val || '--'}
            trend={scoreTrend}
            vsPrev={t('dashboard.history.vsPrevious', lang)}
            lang={lang}
          />
          <StatCard
            label={t('dashboard.history.avgHRV', lang)}
            value={stats.avgHRV.val || '--'}
            unit=" ms"
            trend={hrvTrend}
            vsPrev={t('dashboard.history.vsPrevious', lang)}
            lang={lang}
          />
          <StatCard
            label={t('dashboard.history.avgRHR', lang)}
            value={stats.avgRHR.val || '--'}
            unit=" bpm"
            trend={rhrTrend}
            invertTrend
            vsPrev={t('dashboard.history.vsPrevious', lang)}
            lang={lang}
          />
          <StatCard
            label={t('dashboard.history.avgSleep', lang)}
            value={stats.avgSleep.val || '--'}
            unit="h"
            trend={sleepTrend}
            vsPrev={t('dashboard.history.vsPrevious', lang)}
            lang={lang}
          />
          <StatCard
            label={t('dashboard.history.trainingDays', lang)}
            value={stats.trainingDays.val}
            lang={lang}
          />
          <StatCard
            label={t('dashboard.history.bestScore', lang)}
            value={stats.bestScore.val}
            subValue={`${t('dashboard.history.worstScore', lang)}: ${stats.worstScore.val}`}
            lang={lang}
          />
        </div>

        {/* ─── Charts ────────────────────────────────────────── */}
        <div className={styles.chartsGrid}>

          {/* 1. Wellaryn Score Timeline */}
          <div className={`${styles.chartCard} ${styles.chartCardFull}`}>
            <div className={styles.chartHeader}>
              <div>
                <h3 className={styles.chartTitle}>{t('dashboard.history.scoreTimeline', lang)}</h3>
                <span className={styles.chartSubtitle}>{currentDays}{lang === 'es' ? ' días' : '-day trend'}</span>
              </div>
              <span className={`${styles.chartBadge} ${trendBadgeClass}`}>
                {scoreTrend.dir === 'up' ? '↑' : scoreTrend.dir === 'down' ? '↓' : '→'} {overallScoreTrend}
              </span>
            </div>
            <div className={styles.chartWrapper} style={{ height: 280 }}>
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="scoreGreenZone" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={CHART_COLORS.accent} stopOpacity={0.08} />
                      <stop offset="100%" stopColor={CHART_COLORS.accent} stopOpacity={0.02} />
                    </linearGradient>
                    <linearGradient id="scoreGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={CHART_COLORS.accent} stopOpacity={0.3} />
                      <stop offset="100%" stopColor={CHART_COLORS.accent} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid {...gridProps} />
                  {/* Zone backgrounds */}
                  <ReferenceArea y1={80} y2={100} fill={CHART_COLORS.accent} fillOpacity={0.04} />
                  <ReferenceArea y1={60} y2={80} fill={CHART_COLORS.yellow} fillOpacity={0.03} />
                  <ReferenceArea y1={0} y2={60} fill={CHART_COLORS.red} fillOpacity={0.03} />
                  <XAxis dataKey="date" {...xAxisProps} interval={tickInterval} />
                  <YAxis {...yAxisProps} domain={[0, 100]} />
                  <Tooltip content={<ChartTooltip keys={{ score: 'Score', scoreMA: t('dashboard.history.movingAvg', lang) }} />} />
                  <Area
                    type="monotone"
                    dataKey="score"
                    stroke={CHART_COLORS.accent}
                    strokeWidth={2}
                    fill="url(#scoreGradient)"
                    dot={{ r: currentDays <= 30 ? 3 : 0, fill: CHART_COLORS.dotBg, stroke: CHART_COLORS.accent, strokeWidth: 2 }}
                    activeDot={{ r: 5, fill: CHART_COLORS.accent, stroke: CHART_COLORS.dotBg, strokeWidth: 2 }}
                    connectNulls
                  />
                  <Line
                    type="monotone"
                    dataKey="scoreMA"
                    stroke={CHART_COLORS.yellow}
                    strokeWidth={2}
                    strokeDasharray="6 4"
                    dot={false}
                    connectNulls
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
            <div className={styles.legend}>
              <div className={styles.legendItem}>
                <span className={styles.legendDot} style={{ background: CHART_COLORS.accent }} />
                {t('dashboard.history.scoreTimeline', lang)}
              </div>
              <div className={styles.legendItem}>
                <span className={styles.legendDashed} style={{ borderColor: CHART_COLORS.yellow }} />
                {t('dashboard.history.movingAvg', lang)}
              </div>
              <div className={styles.legendItem}>
                <span className={styles.legendDot} style={{ background: CHART_COLORS.accent, opacity: 0.3 }} />
                80-100 {lang === 'es' ? 'Óptimo' : 'Optimal'}
              </div>
              <div className={styles.legendItem}>
                <span className={styles.legendDot} style={{ background: CHART_COLORS.yellow, opacity: 0.3 }} />
                60-79 {lang === 'es' ? 'Precaución' : 'Caution'}
              </div>
              <div className={styles.legendItem}>
                <span className={styles.legendDot} style={{ background: CHART_COLORS.red, opacity: 0.3 }} />
                0-59 {lang === 'es' ? 'Recuperación' : 'Recovery'}
              </div>
            </div>
          </div>

          {/* 2. HRV Trend */}
          <div className={styles.chartCard}>
            <div className={styles.chartHeader}>
              <div>
                <h3 className={styles.chartTitle}>{t('dashboard.history.hrvTrend', lang)}</h3>
                <span className={styles.chartSubtitle}>rMSSD (ms)</span>
              </div>
            </div>
            <div className={styles.chartWrapper}>
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="hrvHistGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={CHART_COLORS.accent} stopOpacity={0.25} />
                      <stop offset="100%" stopColor={CHART_COLORS.accent} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid {...gridProps} />
                  <XAxis dataKey="date" {...xAxisProps} interval={tickInterval} />
                  <YAxis {...yAxisProps} domain={['auto', 'auto']} />
                  <Tooltip content={<ChartTooltip unit=" ms" keys={{ hrv: 'HRV', hrvMA: t('dashboard.history.movingAvg', lang) }} />} />
                  {hrvBaseline && (
                    <ReferenceLine
                      y={hrvBaseline}
                      stroke={CHART_COLORS.cyan}
                      strokeDasharray="6 4"
                      strokeWidth={1.5}
                      label={{ value: t('dashboard.history.baseline', lang), position: 'right', fill: CHART_COLORS.cyan, fontSize: 10 }}
                    />
                  )}
                  <Area
                    type="monotone"
                    dataKey="hrv"
                    stroke={CHART_COLORS.accent}
                    strokeWidth={2}
                    fill="url(#hrvHistGradient)"
                    dot={{ r: currentDays <= 30 ? 3 : 0, fill: CHART_COLORS.dotBg, stroke: CHART_COLORS.accent, strokeWidth: 2 }}
                    activeDot={{ r: 5, fill: CHART_COLORS.accent, stroke: CHART_COLORS.dotBg, strokeWidth: 2 }}
                    connectNulls
                  />
                  <Line
                    type="monotone"
                    dataKey="hrvMA"
                    stroke={CHART_COLORS.yellow}
                    strokeWidth={2}
                    strokeDasharray="6 4"
                    dot={false}
                    connectNulls
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
            <div className={styles.legend}>
              <div className={styles.legendItem}>
                <span className={styles.legendDot} style={{ background: CHART_COLORS.accent }} /> HRV
              </div>
              <div className={styles.legendItem}>
                <span className={styles.legendDashed} style={{ borderColor: CHART_COLORS.yellow }} />
                {t('dashboard.history.movingAvg', lang)}
              </div>
              <div className={styles.legendItem}>
                <span className={styles.legendDashed} style={{ borderColor: CHART_COLORS.cyan }} />
                {t('dashboard.history.baseline', lang)}
              </div>
            </div>
          </div>

          {/* 3. Resting Heart Rate */}
          <div className={styles.chartCard}>
            <div className={styles.chartHeader}>
              <div>
                <h3 className={styles.chartTitle}>{t('dashboard.history.rhrTrend', lang)}</h3>
                <span className={styles.chartSubtitle}>bpm</span>
              </div>
            </div>
            <div className={styles.chartWrapper}>
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="rhrGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={CHART_COLORS.cyan} stopOpacity={0.25} />
                      <stop offset="100%" stopColor={CHART_COLORS.cyan} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid {...gridProps} />
                  {/* Normal RHR band 50-80 */}
                  <ReferenceArea y1={50} y2={80} fill={CHART_COLORS.accent} fillOpacity={0.04} />
                  <XAxis dataKey="date" {...xAxisProps} interval={tickInterval} />
                  <YAxis {...yAxisProps} domain={['auto', 'auto']} />
                  <Tooltip content={<ChartTooltip unit=" bpm" keys={{ rhr: 'RHR', rhrMA: t('dashboard.history.movingAvg', lang) }} />} />
                  {rhrBaseline && (
                    <ReferenceLine
                      y={rhrBaseline}
                      stroke={CHART_COLORS.purple}
                      strokeDasharray="6 4"
                      strokeWidth={1.5}
                      label={{ value: t('dashboard.history.baseline', lang), position: 'right', fill: CHART_COLORS.purple, fontSize: 10 }}
                    />
                  )}
                  <Area
                    type="monotone"
                    dataKey="rhr"
                    stroke={CHART_COLORS.cyan}
                    strokeWidth={2}
                    fill="url(#rhrGradient)"
                    dot={{ r: currentDays <= 30 ? 3 : 0, fill: CHART_COLORS.dotBg, stroke: CHART_COLORS.cyan, strokeWidth: 2 }}
                    activeDot={{ r: 5, fill: CHART_COLORS.cyan, stroke: CHART_COLORS.dotBg, strokeWidth: 2 }}
                    connectNulls
                  />
                  <Line
                    type="monotone"
                    dataKey="rhrMA"
                    stroke={CHART_COLORS.yellow}
                    strokeWidth={2}
                    strokeDasharray="6 4"
                    dot={false}
                    connectNulls
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
            <div className={styles.legend}>
              <div className={styles.legendItem}>
                <span className={styles.legendDot} style={{ background: CHART_COLORS.cyan }} /> RHR
              </div>
              <div className={styles.legendItem}>
                <span className={styles.legendDashed} style={{ borderColor: CHART_COLORS.yellow }} />
                {t('dashboard.history.movingAvg', lang)}
              </div>
              <div className={styles.legendItem}>
                <span className={styles.legendDot} style={{ background: CHART_COLORS.accent, opacity: 0.3 }} />
                50-80 bpm {lang === 'es' ? 'Normal' : 'Normal'}
              </div>
            </div>
          </div>

          {/* 4. Sleep Analysis */}
          <div className={styles.chartCard}>
            <div className={styles.chartHeader}>
              <div>
                <h3 className={styles.chartTitle}>{t('dashboard.history.sleepAnalysis', lang)}</h3>
                <span className={styles.chartSubtitle}>
                  {t('dashboard.history.sleepTarget', lang)}: {sleepTarget}h
                </span>
              </div>
            </div>
            <div className={styles.chartWrapper}>
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid {...gridProps} />
                  <XAxis dataKey="date" {...xAxisProps} interval={tickInterval} />
                  <YAxis {...yAxisProps} unit="h" />
                  <Tooltip content={<ChartTooltip unit="h" keys={{
                    sleepDeep: lang === 'es' ? 'Profundo' : 'Deep',
                    sleepRem: 'REM',
                    sleepLight: lang === 'es' ? 'Ligero' : 'Light',
                  }} />} />
                  <ReferenceLine
                    y={sleepTarget}
                    stroke={CHART_COLORS.accent}
                    strokeDasharray="6 4"
                    strokeWidth={1.5}
                    label={{ value: t('dashboard.history.target', lang), position: 'right', fill: CHART_COLORS.accent, fontSize: 10 }}
                  />
                  <Bar dataKey="sleepDeep" stackId="sleep" fill={CHART_COLORS.indigo} radius={[0, 0, 0, 0]} maxBarSize={currentDays <= 30 ? 20 : 8} />
                  <Bar dataKey="sleepRem" stackId="sleep" fill={CHART_COLORS.cyan} radius={[0, 0, 0, 0]} maxBarSize={currentDays <= 30 ? 20 : 8} />
                  <Bar dataKey="sleepLight" stackId="sleep" fill={CHART_COLORS.mutedDim} radius={[4, 4, 0, 0]} maxBarSize={currentDays <= 30 ? 20 : 8} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
            <div className={styles.legend}>
              <div className={styles.legendItem}>
                <span className={styles.legendDot} style={{ background: CHART_COLORS.indigo }} />
                {lang === 'es' ? 'Profundo' : 'Deep'}
              </div>
              <div className={styles.legendItem}>
                <span className={styles.legendDot} style={{ background: CHART_COLORS.cyan }} />
                REM
              </div>
              <div className={styles.legendItem}>
                <span className={styles.legendDot} style={{ background: CHART_COLORS.mutedDim }} />
                {lang === 'es' ? 'Ligero' : 'Light'}
              </div>
              <div className={styles.legendItem}>
                <span className={styles.legendDashed} style={{ borderColor: CHART_COLORS.accent }} />
                {t('dashboard.history.target', lang)} ({sleepTarget}h)
              </div>
            </div>
          </div>

          {/* 5. Training Load + ACWR */}
          <div className={styles.chartCard}>
            <div className={styles.chartHeader}>
              <div>
                <h3 className={styles.chartTitle}>{t('dashboard.history.trainingLoad', lang)}</h3>
                <span className={styles.chartSubtitle}>{t('dashboard.history.acwr', lang)}</span>
              </div>
            </div>
            <div className={styles.chartWrapper}>
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={acwrData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid {...gridProps} />
                  {/* Danger zone ACWR > 1.5 */}
                  <ReferenceArea y1={1.5} y2={2.5} yAxisId="acwrAxis" fill={CHART_COLORS.red} fillOpacity={0.06} />
                  <XAxis dataKey="date" {...xAxisProps} interval={tickInterval} />
                  <YAxis yAxisId="loadAxis" {...yAxisProps} orientation="left" />
                  <YAxis yAxisId="acwrAxis" {...yAxisProps} orientation="right" domain={[0, 2.5]} />
                  <Tooltip content={<ChartTooltip keys={{
                    trainingLoad: lang === 'es' ? 'Carga' : 'Load',
                    acwr: 'ACWR',
                  }} />} />
                  <ReferenceLine
                    yAxisId="acwrAxis"
                    y={1.5}
                    stroke={CHART_COLORS.red}
                    strokeDasharray="6 4"
                    strokeWidth={1}
                    label={{ value: '1.5', position: 'right', fill: CHART_COLORS.red, fontSize: 10 }}
                  />
                  <Bar yAxisId="loadAxis" dataKey="trainingLoad" maxBarSize={currentDays <= 30 ? 16 : 6} radius={[3, 3, 0, 0]}>
                    {acwrData.map((entry, index) => (
                      <Cell
                        key={index}
                        fill={entry.acwr > 1.5 ? CHART_COLORS.red : CHART_COLORS.accent}
                        fillOpacity={entry.acwr > 1.5 ? 0.85 : 0.6}
                      />
                    ))}
                  </Bar>
                  <Line
                    yAxisId="acwrAxis"
                    type="monotone"
                    dataKey="acwr"
                    stroke={CHART_COLORS.yellow}
                    strokeWidth={2}
                    dot={false}
                    connectNulls
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
            <div className={styles.legend}>
              <div className={styles.legendItem}>
                <span className={styles.legendDot} style={{ background: CHART_COLORS.accent }} />
                {lang === 'es' ? 'Carga' : 'Load'}
              </div>
              <div className={styles.legendItem}>
                <span className={styles.legendLine} style={{ background: CHART_COLORS.yellow }} />
                ACWR
              </div>
              <div className={styles.legendItem}>
                <span className={styles.legendDot} style={{ background: CHART_COLORS.red, opacity: 0.3 }} />
                {t('dashboard.history.dangerZone', lang)} ({'>'}1.5)
              </div>
            </div>
          </div>

          {/* 6. Stress & Recovery */}
          <div className={styles.chartCard}>
            <div className={styles.chartHeader}>
              <div>
                <h3 className={styles.chartTitle}>{t('dashboard.history.stressRecovery', lang)}</h3>
                <span className={styles.chartSubtitle}>1-10 {lang === 'es' ? 'escala' : 'scale'}</span>
              </div>
            </div>
            <div className={styles.chartWrapper}>
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="stressGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={CHART_COLORS.red} stopOpacity={0.2} />
                      <stop offset="100%" stopColor={CHART_COLORS.red} stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="energyGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={CHART_COLORS.accent} stopOpacity={0.2} />
                      <stop offset="100%" stopColor={CHART_COLORS.accent} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid {...gridProps} />
                  <XAxis dataKey="date" {...xAxisProps} interval={tickInterval} />
                  <YAxis {...yAxisProps} domain={[0, 10]} />
                  <Tooltip content={<ChartTooltip keys={{
                    stress: lang === 'es' ? 'Estrés' : 'Stress',
                    energy: lang === 'es' ? 'Energía' : 'Energy',
                    mood: lang === 'es' ? 'Ánimo' : 'Mood',
                  }} />} />
                  <Area
                    type="monotone"
                    dataKey="stress"
                    stroke={CHART_COLORS.red}
                    strokeWidth={2}
                    fill="url(#stressGradient)"
                    dot={false}
                    connectNulls
                  />
                  <Area
                    type="monotone"
                    dataKey="energy"
                    stroke={CHART_COLORS.accent}
                    strokeWidth={2}
                    fill="url(#energyGradient)"
                    dot={false}
                    connectNulls
                  />
                  <Line
                    type="monotone"
                    dataKey="mood"
                    stroke={CHART_COLORS.purple}
                    strokeWidth={2}
                    strokeDasharray="4 3"
                    dot={false}
                    connectNulls
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
            <div className={styles.legend}>
              <div className={styles.legendItem}>
                <span className={styles.legendDot} style={{ background: CHART_COLORS.red }} />
                {lang === 'es' ? 'Estrés' : 'Stress'}
              </div>
              <div className={styles.legendItem}>
                <span className={styles.legendDot} style={{ background: CHART_COLORS.accent }} />
                {lang === 'es' ? 'Energía' : 'Energy'}
              </div>
              <div className={styles.legendItem}>
                <span className={styles.legendDashed} style={{ borderColor: CHART_COLORS.purple }} />
                {lang === 'es' ? 'Ánimo' : 'Mood'}
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

// ─── Stat Card Sub-Component ────────────────────────────────────

function StatCard({ label, value, unit = '', trend, invertTrend, vsPrev, subValue, lang }) {
  const hasTrend = trend && trend.dir !== 'flat' && trend.pct !== 0;
  // For RHR, "down" is good
  const trendDir = invertTrend
    ? (trend?.dir === 'up' ? 'down' : trend?.dir === 'down' ? 'up' : 'flat')
    : trend?.dir;

  const trendClass = trendDir === 'up' ? styles.trendUp
    : trendDir === 'down' ? styles.trendDown
    : styles.trendFlat;

  return (
    <div className={styles.statCard}>
      <div className={styles.statLabel}>{label}</div>
      <div className={styles.statValue}>{value}{unit}</div>
      {hasTrend && (
        <>
          <div className={`${styles.statTrend} ${trendClass}`}>
            {trend.dir === 'up' ? '↑' : '↓'} {Math.abs(trend.pct)}%
          </div>
          {vsPrev && <div className={styles.trendLabel}>{vsPrev}</div>}
        </>
      )}
      {subValue && <div className={styles.trendLabel}>{subValue}</div>}
    </div>
  );
}
