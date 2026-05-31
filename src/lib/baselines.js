/**
 * Wellaryn — Personal Baselines Module
 *
 * Generates individual baselines for HRV, RHR, and sleep.
 * Baselines are ALWAYS personal — never compare across users.
 *
 * Different wearable brands calculate HRV differently, so absolute
 * values cannot be compared between users or devices.
 *
 * References:
 * - Plews DJ, et al. Int J Sports Physiol Perform. 2013;8(6):688-694.
 * - HRV is log-transformed (lnRMSSD) to stabilize variance.
 */

// --- Statistical Helpers ---

function mean(arr) {
  if (!arr || arr.length === 0) return 0;
  return arr.reduce((sum, val) => sum + val, 0) / arr.length;
}

function standardDeviation(arr) {
  if (!arr || arr.length < 2) return 0;
  const avg = mean(arr);
  const squaredDiffs = arr.map(val => Math.pow(val - avg, 2));
  return Math.sqrt(squaredDiffs.reduce((sum, val) => sum + val, 0) / (arr.length - 1)); // sample SD
}

// --- Confidence Levels ---

const CONFIDENCE = {
  COMPLETE: 'complete',      // Enough data for reliable baseline
  LOW: 'low',                // Some data but below ideal window
  CALIBRATING: 'calibrating', // Very little data, score has limited precision
  NONE: 'none',              // No data at all
};

/**
 * Generate HRV baseline from historical data
 *
 * Uses natural log transform (lnRMSSD) for variance stabilization.
 * Ideal window: 60 days. Minimum: 14 days.
 *
 * @param {Array<number>} rmssdHistory - Array of daily rMSSD values (ms), chronological
 * @param {number} windowDays - Baseline window (default 60)
 * @returns {Object} { mean, std, sampleCount, confidence, lnMean, lnStd }
 */
export function generateHRVBaseline(rmssdHistory, windowDays = 60) {
  if (!rmssdHistory || rmssdHistory.length === 0) {
    return { mean: 0, std: 0, sampleCount: 0, confidence: CONFIDENCE.NONE, lnMean: 0, lnStd: 1 };
  }

  // Take the most recent N days
  const data = rmssdHistory.slice(-windowDays).filter(v => v > 0);

  if (data.length === 0) {
    return { mean: 0, std: 0, sampleCount: 0, confidence: CONFIDENCE.NONE, lnMean: 0, lnStd: 1 };
  }

  // Log-transform for variance stabilization
  const lnData = data.map(v => Math.log(v));

  const rawMean = mean(data);
  const rawStd = standardDeviation(data);
  const lnMean = mean(lnData);
  const lnStd = standardDeviation(lnData) || 1; // Prevent division by zero

  let confidence;
  if (data.length >= 30) {
    confidence = CONFIDENCE.COMPLETE;
  } else if (data.length >= 14) {
    confidence = CONFIDENCE.LOW;
  } else {
    confidence = CONFIDENCE.CALIBRATING;
  }

  return {
    mean: Math.round(rawMean * 100) / 100,
    std: Math.round(rawStd * 100) / 100,
    lnMean: Math.round(lnMean * 1000) / 1000,
    lnStd: Math.round(lnStd * 1000) / 1000,
    sampleCount: data.length,
    confidence,
  };
}

/**
 * Generate RHR baseline from historical data
 *
 * Ideal window: 30 days. Minimum: 7 days.
 *
 * @param {Array<number>} rhrHistory - Array of daily resting heart rate values (bpm), chronological
 * @param {number} windowDays - Baseline window (default 30)
 * @returns {Object} { mean, std, sampleCount, confidence }
 */
export function generateRHRBaseline(rhrHistory, windowDays = 30) {
  if (!rhrHistory || rhrHistory.length === 0) {
    return { mean: 0, std: 0, sampleCount: 0, confidence: CONFIDENCE.NONE };
  }

  const data = rhrHistory.slice(-windowDays).filter(v => v > 0);

  if (data.length === 0) {
    return { mean: 0, std: 0, sampleCount: 0, confidence: CONFIDENCE.NONE };
  }

  const avg = mean(data);
  const sd = standardDeviation(data) || 1;

  let confidence;
  if (data.length >= 14) {
    confidence = CONFIDENCE.COMPLETE;
  } else if (data.length >= 7) {
    confidence = CONFIDENCE.LOW;
  } else {
    confidence = CONFIDENCE.CALIBRATING;
  }

  return {
    mean: Math.round(avg * 10) / 10,
    std: Math.round(sd * 10) / 10,
    sampleCount: data.length,
    confidence,
  };
}

/**
 * Generate sleep baseline from historical data
 *
 * @param {Array<number>} sleepHistory - Array of daily total sleep hours, chronological
 * @param {number} windowDays - Baseline window (default 30)
 * @returns {Object} { mean, std, sampleCount, confidence }
 */
export function generateSleepBaseline(sleepHistory, windowDays = 30) {
  if (!sleepHistory || sleepHistory.length === 0) {
    return { mean: 0, std: 0, sampleCount: 0, confidence: CONFIDENCE.NONE };
  }

  const data = sleepHistory.slice(-windowDays).filter(v => v > 0);

  if (data.length === 0) {
    return { mean: 0, std: 0, sampleCount: 0, confidence: CONFIDENCE.NONE };
  }

  const avg = mean(data);
  const sd = standardDeviation(data) || 0.5;

  let confidence;
  if (data.length >= 14) {
    confidence = CONFIDENCE.COMPLETE;
  } else if (data.length >= 7) {
    confidence = CONFIDENCE.LOW;
  } else {
    confidence = CONFIDENCE.CALIBRATING;
  }

  return {
    mean: Math.round(avg * 10) / 10,
    std: Math.round(sd * 10) / 10,
    sampleCount: data.length,
    confidence,
  };
}

/**
 * Calculate cumulative sleep debt over the last N days
 *
 * @param {Array<number>} recentSleep - Last N days of sleep (hours)
 * @param {number} sleepNeed - User's sleep need (hours, default 8)
 * @param {number} days - Number of days to look back (default 3)
 * @returns {number} Total sleep debt in hours (positive = debt, negative = surplus)
 */
export function calculateSleepDebt(recentSleep, sleepNeed = 8, days = 3) {
  if (!recentSleep || recentSleep.length === 0) return 0;

  const slice = recentSleep.slice(-days);
  let debt = 0;

  for (const hours of slice) {
    const deficit = sleepNeed - hours;
    if (deficit > 0) {
      debt += deficit; // Only count deficits, not surplus
    }
  }

  return Math.round(debt * 10) / 10;
}

/**
 * Calculate z-score for a value against its baseline
 *
 * @param {number} value - Today's value
 * @param {number} baselineMean - Baseline mean
 * @param {number} baselineStd - Baseline standard deviation
 * @returns {number} z-score
 */
export function zScore(value, baselineMean, baselineStd) {
  if (baselineStd === 0 || !baselineStd) return 0;
  return (value - baselineMean) / baselineStd;
}

export { CONFIDENCE };
