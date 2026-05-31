'use client';

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import styles from './HRVChart.module.css';

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className={styles.tooltip}>
      <div className={styles.tooltipLabel}>{label}</div>
      <div className={styles.tooltipValue}>{payload[0].value} ms</div>
    </div>
  );
}

export default function HRVChart({ data = [] }) {
  // Take last 7 days
  const chartData = data.slice(-7).map((d) => ({
    date: d.date.slice(5), // "MM-DD"
    rmssd: d.rmssd,
  }));

  return (
    <div className={styles.container} id="hrv-chart">
      <div className={styles.header}>
        <div>
          <h3 className={styles.title}>HRV Trend</h3>
          <span className={styles.subtitle}>7-day rMSSD</span>
        </div>
      </div>
      <div className={styles.chartWrapper}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
            <defs>
              <linearGradient id="hrvGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(152, 68%, 52%)" stopOpacity={0.3} />
                <stop offset="100%" stopColor="hsl(152, 68%, 52%)" stopOpacity={0} />
              </linearGradient>
            </defs>
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
              domain={['auto', 'auto']}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="rmssd"
              stroke="hsl(152, 68%, 52%)"
              strokeWidth={2.5}
              fill="url(#hrvGradient)"
              dot={{ r: 4, fill: 'hsl(225, 14%, 13%)', stroke: 'hsl(152, 68%, 52%)', strokeWidth: 2 }}
              activeDot={{ r: 6, fill: 'hsl(152, 68%, 52%)', stroke: 'hsl(225, 14%, 13%)', strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
