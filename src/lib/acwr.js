/**
 * Wellaryn — ACWR (Acute:Chronic Workload Ratio) Module
 *
 * Implements Exponentially Weighted Moving Average (EWMA) method
 * per Murray NB, Gabbett TJ, et al. Br J Sports Med. 2017;51(9):749-754.
 *
 * EWMA is superior to rolling averages because it:
 * - Assigns greater weight to recent sessions (physiologically realistic)
 * - Is more sensitive to detecting training load spikes
 * - Better accounts for the decaying nature of fitness and fatigue
 *
 * Sweet spot thresholds per Gabbett TJ. Br J Sports Med. 2016;50(5):273-280
 * and Blanch P, Gabbett TJ. Br J Sports Med. 2016;50(8):471-475.
 */

// --- Decay factors per Murray et al. 2017 ---
// λ = 2 / (N + 1)
const LAMBDA_ACUTE = 2 / (7 + 1);    // 0.25 — 7-day acute window
const LAMBDA_CHRONIC = 2 / (28 + 1); // ~0.069 — 28-day chronic window

/**
 * Calculate Exponentially Weighted Moving Average
 *
 * @param {Array<number>} data - Array of daily training load values (chronological)
 * @param {number} lambda - Decay factor (0 < λ ≤ 1)
 * @returns {number} EWMA value
 */
export function ewma(data, lambda) {
  if (data.length === 0) return 0;

  let current = data[0]; // Seed with first value
  for (let i = 1; i < data.length; i++) {
    current = data[i] * lambda + current * (1 - lambda);
  }
  return current;
}

/**
 * Calculate ACWR using EWMA method
 *
 * @param {Array<number>} loadHistory - Daily training load values (at least 28 days, chronological)
 * @returns {Object} { acwr, acuteLoad, chronicLoad, status }
 */
export function calculateACWR(loadHistory) {
  if (!loadHistory || loadHistory.length < 7) {
    return {
      acwr: null,
      acuteLoad: 0,
      chronicLoad: 0,
      status: 'insufficient_data',
    };
  }

  if (loadHistory.length < 28) {
    // Can still calculate but mark as calibrating
    const acuteLoad = ewma(loadHistory, LAMBDA_ACUTE);
    const chronicLoad = ewma(loadHistory, LAMBDA_CHRONIC);
    const acwr = chronicLoad > 0
      ? Math.round((acuteLoad / chronicLoad) * 100) / 100
      : 1.0;

    return {
      acwr,
      acuteLoad: Math.round(acuteLoad),
      chronicLoad: Math.round(chronicLoad),
      status: 'calibrating',
    };
  }

  const acuteLoad = ewma(loadHistory, LAMBDA_ACUTE);
  const chronicLoad = ewma(loadHistory, LAMBDA_CHRONIC);

  // Prevent division by zero — if chronic load is near zero, athlete is detrained
  const acwr = chronicLoad > 0.001
    ? Math.round((acuteLoad / chronicLoad) * 100) / 100
    : loadHistory[loadHistory.length - 1] > 0 ? 2.5 : 1.0;

  return {
    acwr,
    acuteLoad: Math.round(acuteLoad),
    chronicLoad: Math.round(chronicLoad),
    status: 'complete',
  };
}

/**
 * Map ACWR value to a 0-100 score
 *
 * Based on Gabbett's sweet spot model:
 * - 0.8–1.3 → "sweet spot" → 85–100
 * - 1.3–1.5 → caution → 60–85
 * - 1.5–2.0 → danger zone → 30–60
 * - > 2.0 → high risk → 0–30
 * - < 0.8 → detraining → 60–80
 *
 * @param {number} acwr - ACWR value
 * @returns {number} Score 0-100
 */
export function mapACWRToScore(acwr) {
  if (acwr === null) return 50; // Unknown

  if (acwr >= 0.8 && acwr <= 1.3) {
    // Sweet spot: linear 85-100, peak at 1.0
    const distFromPeak = Math.abs(acwr - 1.05);
    return Math.round(100 - distFromPeak * 60); // 85-100 range
  }

  if (acwr > 1.3 && acwr <= 1.5) {
    // Caution zone: linear interpolation 85 → 60
    return Math.round(85 - ((acwr - 1.3) / 0.2) * 25);
  }

  if (acwr > 1.5 && acwr <= 2.0) {
    // Danger zone: linear interpolation 60 → 30
    return Math.round(60 - ((acwr - 1.5) / 0.5) * 30);
  }

  if (acwr > 2.0) {
    // High risk: caps at 0
    return Math.round(Math.max(0, 30 - (acwr - 2.0) * 30));
  }

  if (acwr < 0.8 && acwr >= 0.4) {
    // Detraining: linear 80 → 60
    return Math.round(60 + ((acwr - 0.4) / 0.4) * 20);
  }

  // Very low ACWR (<0.4) — significant detraining
  return Math.round(Math.max(40, 60 * acwr));
}

/**
 * Get qualitative risk level from ACWR
 *
 * @param {number} acwr
 * @returns {Object} { risk, label, factor }
 */
export function getACWRRiskLevel(acwr) {
  if (acwr === null) {
    return {
      risk: 'unknown',
      label: { en: 'Insufficient Data', es: 'Datos Insuficientes' },
      factor: { en: 'Need at least 7 days of training data', es: 'Se necesitan al menos 7 días de datos' },
    };
  }

  if (acwr > 1.5) {
    const pctAbove = Math.round((acwr - 1.0) * 100);
    return {
      risk: 'high',
      label: { en: 'Elevated Overload Risk', es: 'Riesgo Elevado de Sobrecarga' },
      factor: {
        en: `Training load is ${pctAbove}% above your average`,
        es: `Tu carga de entrenamiento está ${pctAbove}% sobre tu promedio`,
      },
    };
  }

  if (acwr > 1.3) {
    const pctAbove = Math.round((acwr - 1.0) * 100);
    return {
      risk: 'moderate',
      label: { en: 'Moderate Overload Risk', es: 'Riesgo Moderado de Sobrecarga' },
      factor: {
        en: `Training load is ${pctAbove}% above your average`,
        es: `Tu carga de entrenamiento está ${pctAbove}% sobre tu promedio`,
      },
    };
  }

  if (acwr >= 0.8) {
    return {
      risk: 'optimal',
      label: { en: 'Optimal Zone', es: 'Zona Óptima' },
      factor: {
        en: 'Training load is well-managed',
        es: 'Tu carga de entrenamiento está bien manejada',
      },
    };
  }

  return {
    risk: 'detraining',
    label: { en: 'Detraining Risk', es: 'Riesgo de Desentrenamiento' },
    factor: {
      en: 'Training load is significantly below your average',
      es: 'Tu carga está significativamente bajo tu promedio',
    },
  };
}

export { LAMBDA_ACUTE, LAMBDA_CHRONIC };
