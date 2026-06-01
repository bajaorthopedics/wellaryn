/**
 * Wellaryn — Wellaryn Score v1
 *
 * Rules-based engine — transparent, auditable, no ML.
 * Based on evidence from sports medicine literature.
 *
 * Components (0-100 each, then weighted):
 *   HRV:   35% — Best individual marker of ANS recovery (Plews et al. 2013)
 *   Sleep: 25% — Sleep deficit predicts injury (Milewski 2014)
 *   ACWR:  30% — Gold standard for overload risk (Gabbett 2016)
 *   RHR:   10% — Complementary fatigue/illness marker
 *
 * Modifiers (optional):
 *   Stress/Mood: up to -8 points (only if user reports)
 *
 * This module does NOT compare users against each other.
 * All baselines are personal.
 */

import { calculateACWR, mapACWRToScore, getACWRRiskLevel } from './acwr';
import {
  generateHRVBaseline,
  generateRHRBaseline,
  calculateSleepDebt,
  zScore,
  CONFIDENCE,
} from './baselines';

// --- Sub-score calculators ---

/**
 * Calculate HRV sub-score (0-100)
 *
 * Uses log-transformed rMSSD z-score against personal 60-day baseline.
 * Mapping per user's spec (non-linear):
 *   z >= +1.0  → 100
 *   z ∈ [-0.5, +1.0] → 70-100 (linear)
 *   z ∈ [-1.0, -0.5] → 40-70 (linear)
 *   z < -1.0   → 0-40 (linear, clamped at 0)
 *
 * @param {number} rmssd - Today's rMSSD (ms)
 * @param {Object} baseline - From generateHRVBaseline()
 * @returns {Object} { score, zScore, confidence }
 */
function calculateHRVScore(rmssd, baseline) {
  if (!rmssd || rmssd <= 0 || baseline.confidence === CONFIDENCE.NONE) {
    return { score: null, zScore: null, confidence: CONFIDENCE.NONE };
  }

  const lnToday = Math.log(rmssd);
  const z = zScore(lnToday, baseline.lnMean, baseline.lnStd);

  let score;
  if (z >= 1.0) {
    score = 100;
  } else if (z >= -0.5) {
    // Linear: z=-0.5 → 70, z=+1.0 → 100
    score = 70 + ((z + 0.5) / 1.5) * 30;
  } else if (z >= -1.0) {
    // Linear: z=-1.0 → 40, z=-0.5 → 70
    score = 40 + ((z + 1.0) / 0.5) * 30;
  } else {
    // Linear: z=-2.0 → 0, z=-1.0 → 40
    score = Math.max(0, 40 + (z + 1.0) * 40);
  }

  return {
    score: Math.round(clamp(score, 0, 100)),
    zScore: round2(z),
    confidence: baseline.confidence,
  };
}

/**
 * Calculate Sleep sub-score (0-100)
 *
 * Based on:
 *   Duration ratio vs objective + sleep debt penalty
 *   Milewski 2014: <8h sleep → 1.7× injury risk
 *
 * @param {number} sleepHours - Last night's total sleep
 * @param {number} sleepNeed - User's configured need (default 8)
 * @param {Array<number>} recentSleep - Last 3+ days of sleep for debt calc
 * @returns {Object} { score, ratio, debt }
 */
function calculateSleepScore(sleepHours, sleepNeed = 8, recentSleep = []) {
  if (sleepHours === null || sleepHours === undefined) {
    return { score: null, ratio: null, debt: 0 };
  }

  const ratio = sleepHours / sleepNeed;
  let baseScore;

  if (ratio >= 1.0) {
    baseScore = 100;
  } else if (ratio >= 0.85) {
    // 85-100% of need → score 75-100
    baseScore = 75 + ((ratio - 0.85) / 0.15) * 25;
  } else if (ratio >= 0.70) {
    // 70-85% of need → score 50-75
    baseScore = 50 + ((ratio - 0.70) / 0.15) * 25;
  } else {
    // < 70% of need → score 0-50
    baseScore = Math.max(0, (ratio / 0.70) * 50);
  }

  // Cumulative sleep debt penalty (last 3 days, up to -15 points)
  const debt = calculateSleepDebt(recentSleep, sleepNeed, 3);
  const debtPenalty = Math.min(15, debt * 3); // 1h debt = -3pts, capped at -15

  const finalScore = Math.max(0, baseScore - debtPenalty);

  return {
    score: Math.round(clamp(finalScore, 0, 100)),
    ratio: round2(ratio),
    debt: round2(debt),
  };
}

/**
 * Calculate RHR sub-score (0-100)
 *
 * Uses z-score against 30-day baseline. Inverted (lower RHR = better).
 * >5 bpm above baseline → significant penalty (possible fatigue/illness).
 *
 * @param {number} rhr - Today's resting heart rate (bpm)
 * @param {Object} baseline - From generateRHRBaseline()
 * @returns {Object} { score, zScore, deviation, confidence }
 */
function calculateRHRScore(rhr, baseline) {
  if (!rhr || rhr <= 0 || baseline.confidence === CONFIDENCE.NONE) {
    return { score: null, zScore: null, deviation: 0, confidence: CONFIDENCE.NONE };
  }

  const deviation = rhr - baseline.mean;
  const z = zScore(rhr, baseline.mean, baseline.std);

  let score;
  if (deviation <= -3) {
    // RHR well below baseline = excellent recovery
    score = 100;
  } else if (deviation <= 0) {
    // At or below baseline = good
    score = 85 + ((-deviation) / 3) * 15;
  } else if (deviation <= 5) {
    // 0-5 bpm above baseline = moderate concern
    score = 85 - (deviation / 5) * 35; // 85 → 50
  } else if (deviation <= 10) {
    // 5-10 bpm above = significant concern
    score = 50 - ((deviation - 5) / 5) * 30; // 50 → 20
  } else {
    // >10 bpm above = major red flag (illness, severe fatigue)
    score = Math.max(0, 20 - (deviation - 10) * 4);
  }

  return {
    score: Math.round(clamp(score, 0, 100)),
    zScore: round2(-z), // Inverted: positive z = bad for RHR
    deviation: round2(deviation),
    confidence: baseline.confidence,
  };
}

// --- Main Wellaryn Score ---

/**
 * Calculate the Wellaryn Score (0-100)
 *
 * @param {Object} today - Today's metrics
 * @param {number} today.rmssd - HRV rMSSD (ms)
 * @param {number} today.rhr - Resting Heart Rate (bpm)
 * @param {number} today.sleepHours - Total sleep (hours)
 * @param {number} today.sleepNeed - Individual sleep need (hours, default 8)
 * @param {number} [today.stress] - Subjective stress (0-100, optional)
 * @param {number} [today.mood] - Subjective mood (1-10, optional)
 * @param {Object} history - Historical data
 * @param {Array<number>} history.rmssdHistory - Past rMSSD values (ideally 60+ days)
 * @param {Array<number>} history.rhrHistory - Past RHR values (ideally 30+ days)
 * @param {Array<number>} history.sleepHistory - Past sleep hours (ideally 30+ days)
 * @param {Array<number>} history.loadHistory - Past daily training load values (ideally 28+ days)
 * @returns {Object} Full readiness result
 */
export function calculateReadiness(today, history) {
  // --- Generate personal baselines ---
  const hrvBaseline = generateHRVBaseline(history.rmssdHistory || [], 60);
  const rhrBaseline = generateRHRBaseline(history.rhrHistory || [], 30);

  // --- Calculate sub-scores ---
  const hrvResult = calculateHRVScore(today.rmssd, hrvBaseline);
  const sleepResult = calculateSleepScore(
    today.sleepHours,
    today.sleepNeed || 8,
    (history.sleepHistory || []).slice(-3)
  );
  const acwrResult = calculateACWR(history.loadHistory || []);
  const acwrScore = mapACWRToScore(acwrResult.acwr);
  const acwrRisk = getACWRRiskLevel(acwrResult.acwr);
  const rhrResult = calculateRHRScore(today.rhr, rhrBaseline);

  // --- Count available components ---
  const components = {
    hrv: { score: hrvResult.score, weight: 0.35, available: hrvResult.score !== null },
    sleep: { score: sleepResult.score, weight: 0.25, available: sleepResult.score !== null },
    acwr: { score: acwrScore, weight: 0.30, available: acwrResult.status !== 'insufficient_data' },
    rhr: { score: rhrResult.score, weight: 0.10, available: rhrResult.score !== null },
  };

  const availableComponents = Object.values(components).filter(c => c.available);
  const missingCount = 4 - availableComponents.length;

  // --- Determine overall confidence ---
  let overallConfidence;
  if (missingCount >= 2) {
    overallConfidence = CONFIDENCE.LOW;
  } else if (
    hrvBaseline.confidence === CONFIDENCE.CALIBRATING ||
    acwrResult.status === 'calibrating'
  ) {
    overallConfidence = CONFIDENCE.CALIBRATING;
  } else {
    overallConfidence = CONFIDENCE.COMPLETE;
  }

  // --- Weighted composite ---
  let weightedScore;
  if (availableComponents.length === 0) {
    weightedScore = 50; // No data at all
  } else {
    // Redistribute weights proportionally among available components
    const totalWeight = availableComponents.reduce((sum, c) => sum + c.weight, 0);
    weightedScore = availableComponents.reduce((sum, c) => {
      return sum + (c.score * (c.weight / totalWeight));
    }, 0);
  }

  // --- Apply optional modifiers (stress/mood) ---
  let modifier = 0;
  let modifierDetails = null;

  if (today.stress !== undefined && today.stress !== null) {
    // Stress 0-100: only penalize if above 60 (high stress)
    if (today.stress > 60) {
      modifier -= Math.min(5, ((today.stress - 60) / 40) * 5);
    }
  }

  if (today.mood !== undefined && today.mood !== null) {
    // Mood 1-10: only penalize if below 4 (low mood)
    if (today.mood < 4) {
      modifier -= Math.min(3, ((4 - today.mood) / 3) * 3);
    }
  }

  // Cap total modifier at -8
  modifier = Math.max(-8, modifier);
  if (modifier !== 0) {
    modifierDetails = { stress: today.stress, mood: today.mood, adjustment: round2(modifier) };
  }

  // --- Final score ---
  const finalScore = Math.round(clamp(weightedScore + modifier, 0, 100));

  // --- Determine band ---
  const band = getBand(finalScore);

  // --- Find weakest component (for recommendations) ---
  const weakest = findWeakestComponent(components);

  // --- Generate recommendations ---
  const recommendations = generateRecommendations(
    { components, band, weakest, acwrRisk },
    today
  );

  return {
    score: finalScore,
    band: band.name,
    zone: band.zone,
    zoneLabel: band.label,
    confidence: overallConfidence,

    // Sub-scores for audit trail
    subScores: {
      hrv: {
        score: hrvResult.score,
        zScore: hrvResult.zScore,
        baseline: { mean: hrvBaseline.mean, std: hrvBaseline.std, confidence: hrvBaseline.confidence },
      },
      sleep: {
        score: sleepResult.score,
        ratio: sleepResult.ratio,
        debt: sleepResult.debt,
      },
      acwr: {
        score: acwrScore,
        acwr: acwrResult.acwr,
        acuteLoad: acwrResult.acuteLoad,
        chronicLoad: acwrResult.chronicLoad,
        status: acwrResult.status,
        risk: acwrRisk,
      },
      rhr: {
        score: rhrResult.score,
        deviation: rhrResult.deviation,
        baseline: { mean: rhrBaseline.mean, std: rhrBaseline.std, confidence: rhrBaseline.confidence },
      },
    },

    modifier: modifierDetails,
    weakestComponent: weakest,
    recommendations,
  };
}

// --- Band classification ---

function getBand(score) {
  if (score >= 80) {
    return {
      name: 'ready',
      zone: 'green',
      label: { en: 'Ready', es: 'Listo' },
    };
  }
  if (score >= 60) {
    return {
      name: 'moderate',
      zone: 'yellow',
      label: { en: 'Moderate', es: 'Moderado' },
    };
  }
  if (score >= 40) {
    return {
      name: 'low',
      zone: 'orange',
      label: { en: 'Low', es: 'Bajo' },
    };
  }
  return {
    name: 'risk',
    zone: 'red',
    label: { en: 'Rest', es: 'Descanso' },
  };
}

// --- Weakest component finder ---

function findWeakestComponent(components) {
  let weakest = null;
  let lowestScore = Infinity;

  for (const [name, comp] of Object.entries(components)) {
    if (comp.available && comp.score < lowestScore) {
      lowestScore = comp.score;
      weakest = name;
    }
  }

  return weakest;
}

// --- Recommendation Engine ---
// Recommendations come from the WEAKEST component, not the overall score.
// Tone: wellness suggestions, NOT medical prescriptions.

function generateRecommendations(data, today) {
  const { components, band, weakest, acwrRisk } = data;
  const recommendations = [];

  // ACWR-based (overload risk)
  if (acwrRisk.risk === 'high') {
    recommendations.push({
      icon: '⚠️',
      priority: 'critical',
      en: 'Training load spike detected — reduce volume 25-30% today. Substitute high-intensity with Zone 2 work.',
      es: 'Pico de carga detectado — reduce volumen 25-30% hoy. Sustituye alta intensidad por trabajo en Zona 2.',
    });
  } else if (acwrRisk.risk === 'moderate') {
    recommendations.push({
      icon: '📊',
      priority: 'high',
      en: 'Training load is rising — monitor closely and avoid adding volume this week.',
      es: 'Tu carga de entrenamiento está subiendo — monitorea de cerca y evita agregar volumen esta semana.',
    });
  }

  // Sleep-based
  if (components.sleep.available && components.sleep.score < 50) {
    const hours = today.sleepHours || 0;
    const need = today.sleepNeed || 8;
    recommendations.push({
      icon: '🌙',
      priority: 'high',
      en: `You slept ${hours}h — aim for ${need}h+ tonight. Cumulative sleep debt detected.`,
      es: `Dormiste ${hours}h — apunta a ${need}h+ esta noche. Deuda de sueño acumulada detectada.`,
    });
  }

  // HRV-based
  if (components.hrv.available && components.hrv.score < 40) {
    recommendations.push({
      icon: '❤️‍🩹',
      priority: 'high',
      en: 'Nervous system under recovery. Prioritize sleep tonight; avoid sprints/HIIT.',
      es: 'Sistema nervioso en recuperación. Prioriza sueño esta noche; evita sprints/HIIT.',
    });
  } else if (components.hrv.available && components.hrv.score > 85) {
    recommendations.push({
      icon: '🚀',
      priority: 'low',
      en: 'HRV is above your baseline — great day for high intensity if load allows.',
      es: 'Tu HRV está por encima de tu base — buen día para alta intensidad si la carga lo permite.',
    });
  }

  // RHR-based
  if (components.rhr.available && components.rhr.score < 50) {
    recommendations.push({
      icon: '💓',
      priority: 'medium',
      en: 'Resting heart rate is elevated — consider active recovery or a rest day.',
      es: 'Tu FC en reposo está elevada — considera recuperación activa o día de descanso.',
    });
  }

  // Stress-based
  if (today.stress > 65) {
    recommendations.push({
      icon: '🧘',
      priority: 'medium',
      en: 'Stress levels are high — try 10 minutes of breathing exercises or a walk.',
      es: 'Tu estrés está alto — prueba 10 minutos de respiración o una caminata.',
    });
  }

  // Combined: HRV low + sleep low = strong rest signal
  if (
    components.hrv.available && components.hrv.score < 40 &&
    components.sleep.available && components.sleep.score < 50
  ) {
    recommendations.push({
      icon: '🛌',
      priority: 'critical',
      en: 'Both HRV and sleep are low — prioritize full recovery today. Mobility and stretching only.',
      es: 'HRV y sueño están bajos — prioriza recuperación completa hoy. Solo movilidad y estiramientos.',
    });
  }

  // Green light
  if (band.name === 'ready' && acwrRisk.risk === 'optimal') {
    recommendations.push({
      icon: '✅',
      priority: 'low',
      en: 'You\'re well-recovered and training load is optimal — push your limits today!',
      es: '¡Estás bien recuperado y tu carga es óptima — supera tus límites hoy!',
    });
  }

  // Always include mobility for orange/red
  if (band.name === 'low' || band.name === 'risk') {
    const alreadyHasMobility = recommendations.some(r =>
      r.en.toLowerCase().includes('mobility') || r.en.toLowerCase().includes('stretching')
    );
    if (!alreadyHasMobility) {
      recommendations.push({
        icon: '🤸',
        priority: 'medium',
        en: 'Include 15-20 minutes of mobility work and foam rolling today.',
        es: 'Incluye 15-20 minutos de movilidad y foam rolling hoy.',
      });
    }
  }

  // Sort by priority
  const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
  recommendations.sort((a, b) => (priorityOrder[a.priority] || 3) - (priorityOrder[b.priority] || 3));

  return recommendations.slice(0, 5); // Max 5
}

// --- Injury Risk (qualitative, NOT percentage) ---

/**
 * Calculate qualitative injury risk from ACWR + readiness context
 *
 * IMPORTANT: We do NOT output a percentage probability of injury.
 * That would be a clinical claim requiring validation.
 * Instead, we output a qualitative level + the triggering factor.
 *
 * @param {Array<number>} loadHistory - Training load values
 * @returns {Object} Qualitative risk assessment
 */
export function calculateInjuryRisk(loadHistory) {
  const acwrResult = calculateACWR(loadHistory);
  const riskLevel = getACWRRiskLevel(acwrResult.acwr);

  return {
    acwr: acwrResult.acwr,
    acuteLoad: acwrResult.acuteLoad,
    chronicLoad: acwrResult.chronicLoad,
    risk: riskLevel.risk,
    label: riskLevel.label,
    factor: riskLevel.factor,
    status: acwrResult.status,
  };
}

// --- Zone helpers (used by UI components) ---

export function getZoneColor(zone) {
  const colors = {
    green: { main: 'var(--color-green)', glow: 'var(--color-green-glow)' },
    yellow: { main: 'var(--color-yellow)', glow: 'var(--color-yellow-glow)' },
    orange: { main: 'var(--color-yellow)', glow: 'var(--color-yellow-glow)' },
    red: { main: 'var(--color-red)', glow: 'var(--color-red-glow)' },
  };
  return colors[zone] || colors.yellow;
}

export function getZoneEmoji(zone) {
  return { green: '🟢', yellow: '🟡', orange: '🟠', red: '🔴' }[zone] || '🟡';
}

// --- Utilities ---

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function round2(value) {
  return Math.round(value * 100) / 100;
}
