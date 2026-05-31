'use client';

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  Cell,
} from 'recharts';
import styles from './TrainingLoadChart.module.css';

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const entry = payload[0]?.payload;
  return (
    <div className={styles.tooltip}>
      <div className={styles.tooltipLabel}>{label}</div>
      <div className={styles.tooltipValue}>Load: {payload[0].value}</div>
      {entry?.type && (
        <div className={styles.tooltipType}>{entry.type}</div>
      )}
    </div>
  );
}

export default function TrainingLoadChart({ data = [] }) {
  const chartData = data.slice(-14).map((d) => ({
    date: d.date.slice(5),
    load: d.load,
    type: d.type,
  }));

  // Calculate chronic average for reference line
  const loads = data.map((d) => d.load);
  const chronicAvg = loads.length > 0
    ? Math.round(loads.reduce((a, b) => a + b, 0) / loads.length)
    : 0;

  return (
    <div className={styles.container} id="training-load-chart">
      <div className={styles.header}>
        <div>
          <h3 className={styles.title}>Training Load</h3>
          <span className={styles.subtitle}>14-day history • Avg: {chronicAvg}</span>
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
              tick={{ fontSize: 10, fill: 'hsl(225, 10%, 55%)' }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              stroke="hsl(225, 10%, 35%)"
              tick={{ fontSize: 11, fill: 'hsl(225, 10%, 55%)' }}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'hsla(0, 0%, 100%, 0.03)' }} />
            <ReferenceLine
              y={chronicAvg}
              stroke="hsl(45, 93%, 58%)"
              strokeDasharray="6 4"
              strokeWidth={1.5}
              label={{
                value: 'Avg',
                position: 'right',
                fill: 'hsl(45, 93%, 58%)',
                fontSize: 11,
              }}
            />
            <Bar dataKey="load" radius={[4, 4, 0, 0]} maxBarSize={24}>
              {chartData.map((entry, index) => (
                <Cell
                  key={index}
                  fill={
                    entry.load > chronicAvg
                      ? 'hsl(152, 68%, 52%)'
                      : 'hsl(225, 10%, 35%)'
                  }
                  fillOpacity={entry.load > chronicAvg ? 0.85 : 0.5}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
