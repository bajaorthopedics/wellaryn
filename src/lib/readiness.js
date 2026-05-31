/**
 * Wellaryn — Readiness Score Algorithm
 * Based on HRV z-score methodology used in sports science
 * References: WHOOP recovery algorithm, Oura readiness, Plews et al. (2013)
 */

// --- Statistical Helpers ---

/**
 * Calculate the mean of an array of numbers
 */
function mean(arr) {
  if (arr.length === 0) return 0;
  return arr.reduce((sum, val) => sum + val, 0) / arr.length;
}

/**
 * Calculate standard deviation of an array
 */
function std(arr) {
  if (arr.length < 2) return 1; // Prevent division by zero
  const avg = mean(arr);
  const squaredDiffs = arr.map(val => Math.pow(val - avg, 2));
  return Math.sqrt(mean(squaredDiffs));
}

/**
 * Clamp a value between min and max
 */
function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

// --- Core Algorithm ---

/**
 * Calculate the Daily Readiness Score (0-100)
 *
 * @param {Object} today - Today's metrics
 * @param {number} today.rmssd - Heart Rate Variability (rMSSD in ms)
 * @param {number} today.rhr - Resting Heart Rate (bpm)
 * @param {number} today.sleepHours - Total sleep duration (hours)
 * @param {number} today.sleepNeed - Individual sleep need (hours, default 8)
 * @param {number} today.stress - Subjective stress (0-100)
 * @param {number} today.mood - Subjective mood (1-10)
 * @param {Object} history - Historical data arrays
 * @param {Array<number>} history.rmssdHistory - Past rMSSD values (7-30 days)
 * @param {Array<number>} history.rhrHistory - Past RHR values
 * @param {Array<number>} history.sleepHistory - Past sleep hours
 * @returns {Object} Readiness result with score, zone, z-scores, and interpretation
 */
export function calculateReadiness(today, history) {
  const window = 7; // 7-day rolling window

  // Step 1: Log-transform HRV (stabilizes variance)
  const lnHRV = Math.log(today.rmssd);
  const lnHRVHistory = history.rmssdHistory.slice(-window).map(v => Math.log(v));

  // Step 2: Calculate z-scores
  const zHRV = lnHRVHistory.length >= 3
    ? (lnHRV - mean(lnHRVHistory)) / std(lnHRVHistory)
    : 0;

  // RHR: inverted (lower is better)
  const rhrSlice = history.rhrHistory.slice(-window);
  const zRHR = rhrSlice.length >= 3
    ? -(today.rhr - mean(rhrSlice)) / std(rhrSlice)
    : 0;

  // Sleep: ratio vs need
  const sleepRatio = today.sleepHours / (today.sleepNeed || 8);
  const zSleep = (sleepRatio - 1) * 3; // Scale factor for sensitivity

  // Subjective: normalize stress (inverted) + mood
  const stressNorm = today.stress !== undefined ? -(today.stress - 50) / 25 : 0;
  const moodNorm = today.mood !== undefined ? (today.mood - 5.5) / 2.5 : 0;
  const zSubjective = (stressNorm + moodNorm) / 2;

  // Step 3: Weighted composite
  const weights = { hrv: 0.40, rhr: 0.25, sleep: 0.25, subjective: 0.10 };
  const rawScore =
    weights.hrv * zHRV +
    weights.rhr * zRHR +
    weights.sleep * zSleep +
    weights.subjective * zSubjective;

  // Step 4: Scale to 0-100
  const score = Math.round(clamp(50 + rawScore * 15, 0, 100));

  // Step 5: Determine zone
  const zone = score >= 67 ? 'green' : score >= 34 ? 'yellow' : 'red';
  const zoneLabel = {
    green: { en: 'Recovered', es: 'Recuperado' },
    yellow: { en: 'Moderate', es: 'Moderado' },
    red: { en: 'Strained', es: 'Agotado' },
  }[zone];

  return {
    score,
    zone,
    zoneLabel,
    zScores: {
      hrv: Math.round(zHRV * 100) / 100,
      rhr: Math.round(zRHR * 100) / 100,
      sleep: Math.round(zSleep * 100) / 100,
      subjective: Math.round(zSubjective * 100) / 100,
    },
    rawScore: Math.round(rawScore * 100) / 100,
    metrics: {
      lnHRV: Math.round(lnHRV * 100) / 100,
      sleepRatio: Math.round(sleepRatio * 100) / 100,
    },
  };
}

// --- Injury Risk (ACWR-based) ---

/**
 * Calculate Acute:Chronic Workload Ratio and injury risk
 *
 * @param {Array<number>} loadHistory - Training load values (at least 28 days)
 * @returns {Object} ACWR, risk level, and percentage
 */
export function calculateInjuryRisk(loadHistory) {
  if (loadHistory.length < 7) {
    return { acwr: null, risk: 'unknown', riskPercent: 0, label: { en: 'Insufficient data', es: 'Datos insuficientes' } };
  }

  const acuteWindow = loadHistory.slice(-7);
  const chronicWindow = loadHistory.slice(-28);

  const acuteLoad = mean(acuteWindow);
  const chronicLoad = mean(chronicWindow);

  // Prevent division by zero
  const acwr = chronicLoad > 0
    ? Math.round((acuteLoad / chronicLoad) * 100) / 100
    : 1.0;

  let risk, riskPercent, label;

  if (acwr > 1.5) {
    risk = 'high';
    riskPercent = Math.round(clamp(50 + (acwr - 1.5) * 40, 60, 95));
    label = { en: 'High Risk', es: 'Riesgo Alto' };
  } else if (acwr > 1.3) {
    risk = 'moderate';
    riskPercent = Math.round(clamp(30 + (acwr - 1.3) * 100, 35, 55));
    label = { en: 'Moderate Risk', es: 'Riesgo Moderado' };
  } else if (acwr >= 0.8) {
    risk = 'optimal';
    riskPercent = Math.round(clamp(10 + (1 - acwr) * 20, 8, 25));
    label = { en: 'Optimal Zone', es: 'Zona Óptima' };
  } else {
    risk = 'detraining';
    riskPercent = Math.round(clamp(20 + (0.8 - acwr) * 30, 15, 40));
    label = { en: 'Detraining Risk', es: 'Riesgo de Desentrenamiento' };
  }

  return { acwr, risk, riskPercent, label };
}

// --- Recommendation Engine ---

/**
 * Generate personalized recommendations based on readiness and injury risk
 *
 * @param {Object} readiness - Result from calculateReadiness
 * @param {Object} injuryRisk - Result from calculateInjuryRisk
 * @param {Object} todayData - Today's metrics
 * @returns {Array<Object>} Recommendations with icon, text, and priority
 */
export function generateRecommendations(readiness, injuryRisk, todayData) {
  const recommendations = [];

  // Sleep-based recommendations
  if (readiness.zScores.sleep < -0.5) {
    recommendations.push({
      icon: '🌙',
      priority: 'high',
      en: `You slept ${todayData.sleepHours}h — aim for ${todayData.sleepNeed || 8}h tonight`,
      es: `Dormiste ${todayData.sleepHours}h — apunta a ${todayData.sleepNeed || 8}h esta noche`,
    });
  }

  // HRV-based recommendations
  if (readiness.zScores.hrv < -1) {
    recommendations.push({
      icon: '❤️‍🩹',
      priority: 'high',
      en: 'HRV dropped significantly — prioritize recovery today',
      es: 'Tu HRV bajó significativamente — prioriza recuperación hoy',
    });
  } else if (readiness.zScores.hrv > 1) {
    recommendations.push({
      icon: '🚀',
      priority: 'low',
      en: 'HRV is above baseline — great day for high intensity',
      es: 'Tu HRV está por encima de tu base — buen día para alta intensidad',
    });
  }

  // Injury risk recommendations
  if (injuryRisk.risk === 'high') {
    recommendations.push({
      icon: '⚠️',
      priority: 'critical',
      en: 'Training load spike detected — reduce volume by 30%',
      es: 'Pico de carga detectado — reduce volumen un 30%',
    });
    recommendations.push({
      icon: '🚫',
      priority: 'high',
      en: 'Avoid explosive movements and sprints today',
      es: 'Evita movimientos explosivos y sprints hoy',
    });
  } else if (injuryRisk.risk === 'detraining') {
    recommendations.push({
      icon: '📈',
      priority: 'medium',
      en: 'Training load is low — consider gradually increasing volume',
      es: 'Tu carga de entrenamiento es baja — considera aumentar volumen gradualmente',
    });
  }

  // RHR-based recommendations
  if (readiness.zScores.rhr < -1) {
    recommendations.push({
      icon: '💓',
      priority: 'medium',
      en: 'Resting heart rate is elevated — consider active recovery',
      es: 'Tu frecuencia cardíaca en reposo está elevada — considera recuperación activa',
    });
  }

  // Stress-based recommendations
  if (todayData.stress > 65) {
    recommendations.push({
      icon: '🧘',
      priority: 'medium',
      en: 'Stress levels are high — try breathing exercises or meditation',
      es: 'Tu estrés está alto — prueba ejercicios de respiración o meditación',
    });
  }

  // General readiness recommendations
  if (readiness.zone === 'green' && injuryRisk.risk === 'optimal') {
    recommendations.push({
      icon: '✅',
      priority: 'low',
      en: 'You\'re in peak condition — push your limits today!',
      es: '¡Estás en condición óptima — supera tus límites hoy!',
    });
  } else if (readiness.zone === 'red') {
    recommendations.push({
      icon: '🛌',
      priority: 'high',
      en: 'Focus on mobility, stretching, and hydration',
      es: 'Enfócate en movilidad, estiramientos e hidratación',
    });
  }

  // Sort by priority
  const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
  recommendations.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

  return recommendations.slice(0, 4); // Max 4 recommendations
}

// --- Zone Color Mapping ---

export function getZoneColor(zone) {
  const colors = {
    green: { main: 'var(--color-green)', glow: 'var(--color-green-glow)' },
    yellow: { main: 'var(--color-yellow)', glow: 'var(--color-yellow-glow)' },
    red: { main: 'var(--color-red)', glow: 'var(--color-red-glow)' },
  };
  return colors[zone] || colors.yellow;
}

export function getZoneEmoji(zone) {
  return { green: '🟢', yellow: '🟡', red: '🔴' }[zone] || '🟡';
}
