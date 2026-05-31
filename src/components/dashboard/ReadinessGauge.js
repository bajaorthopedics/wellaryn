'use client';

import { useEffect, useState } from 'react';
import styles from './ReadinessGauge.module.css';

export default function ReadinessGauge({ score = 0, zone = 'yellow', zoneLabel = 'Moderate', size = 200 }) {
  const [animatedOffset, setAnimatedOffset] = useState(null);

  const strokeWidth = 12;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const arcLength = circumference * 0.75; // 270 degree arc
  const progress = (score / 100) * arcLength;
  const offset = arcLength - progress;

  // Trigger arc animation on mount
  useEffect(() => {
    // Start fully un-filled
    setAnimatedOffset(arcLength);
    const raf = requestAnimationFrame(() => {
      setAnimatedOffset(offset);
    });
    return () => cancelAnimationFrame(raf);
  }, [offset, arcLength]);

  const zoneColors = {
    green: { stroke: 'var(--color-green)', glow: 'var(--color-green-glow)' },
    yellow: { stroke: 'var(--color-yellow)', glow: 'var(--color-yellow-glow)' },
    red: { stroke: 'var(--color-red)', glow: 'var(--color-red-glow)' },
  };

  const colors = zoneColors[zone] || zoneColors.yellow;
  const zoneClass = zone === 'green' ? styles.zoneGreen : zone === 'red' ? styles.zoneRed : styles.zoneYellow;
  const center = size / 2;

  return (
    <div className={styles.container} id="readiness-gauge">
      <svg
        className={styles.gauge}
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        style={{ '--gauge-glow': colors.glow }}
      >
        {/* Background track */}
        <circle
          className={styles.trackCircle}
          cx={center}
          cy={center}
          r={radius}
          strokeWidth={strokeWidth}
          strokeDasharray={`${arcLength} ${circumference}`}
          strokeDashoffset={0}
          transform={`rotate(-225 ${center} ${center})`}
        />

        {/* Progress arc */}
        <circle
          className={styles.progressCircle}
          cx={center}
          cy={center}
          r={radius}
          strokeWidth={strokeWidth}
          stroke={colors.stroke}
          strokeDasharray={`${arcLength} ${circumference}`}
          strokeDashoffset={animatedOffset !== null ? animatedOffset : arcLength}
          transform={`rotate(-225 ${center} ${center})`}
        />

        {/* Score text */}
        <g className={styles.scoreGroup}>
          <text
            className={styles.scoreValue}
            x={center}
            y={center - 4}
            fontSize={size * 0.22}
          >
            {score}
          </text>
          <text
            className={styles.scoreLabel}
            x={center}
            y={center + size * 0.12}
          >
            READINESS
          </text>
        </g>
      </svg>

      <span className={`${styles.zoneLabel} ${zoneClass}`}>
        {zoneLabel}
      </span>
    </div>
  );
}
