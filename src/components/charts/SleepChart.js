'use client';

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import styles from './SleepChart.module.css';

const SLEEP_COLORS = {
  deep: 'hsl(239, 60%, 55%)',   // indigo
  rem: 'hsl(187, 70%, 55%)',    // cyan
  light: 'hsl(225, 10%, 40%)',  // gray
};

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className={styles.tooltip}>
      <div className={styles.tooltipLabel}>{label}</div>
      {payload.reverse().map((entry) => (
        <div key={entry.dataKey} className={styles.tooltipRow}>
          <span
            className={styles.tooltipDot}
            style={{ background: entry.color }}
          />
          <span style={{ color: entry.color, fontWeight: 600 }}>
            {entry.name}: {entry.value}h
          </span>
        </div>
      ))}
    </div>
  );
}

export default function SleepChart({ data = [] }) {
  const chartData = data.slice(-7).map((d) => ({
    date: d.date.slice(5),
    Deep: d.deep,
    REM: d.rem,
    Light: d.light,
  }));

  return (
    <div className={styles.container} id="sleep-chart">
      <div className={styles.header}>
        <div>
          <h3 className={styles.title}>Sleep Phases</h3>
          <span className={styles.subtitle}>7-day breakdown</span>
        </div>
      </div>
      <div className={styles.chartWrapper}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="hsla(0, 0%, 100%, 0.06)"
              vertical={false}
            />
            <XAxis
              dataKey="date"
              stroke="hsl(225, 10%, 35%)"
              tick={{ fontSize: 11, fill: 'hsl(225, 10%, 55%)' }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              stroke="hsl(225, 10%, 35%)"
              tick={{ fontSize: 11, fill: 'hsl(225, 10%, 55%)' }}
              tickLine={false}
              axisLine={false}
              unit="h"
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'hsla(0, 0%, 100%, 0.03)' }} />
            <Bar dataKey="Deep" stackId="sleep" fill={SLEEP_COLORS.deep} radius={[0, 0, 0, 0]} />
            <Bar dataKey="REM" stackId="sleep" fill={SLEEP_COLORS.rem} radius={[0, 0, 0, 0]} />
            <Bar dataKey="Light" stackId="sleep" fill={SLEEP_COLORS.light} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className={styles.legend}>
        <div className={styles.legendItem}>
          <span className={styles.legendDot} style={{ background: SLEEP_COLORS.deep }} />
          Deep
        </div>
        <div className={styles.legendItem}>
          <span className={styles.legendDot} style={{ background: SLEEP_COLORS.rem }} />
          REM
        </div>
        <div className={styles.legendItem}>
          <span className={styles.legendDot} style={{ background: SLEEP_COLORS.light }} />
          Light
        </div>
      </div>
    </div>
  );
}
