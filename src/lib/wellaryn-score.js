/**
 * Wellaryn Score™ — Exact web implementation matching iOS
 *
 * CRITICAL: This algorithm MUST produce identical output to the iOS app
 * for the same inputs. Do NOT change weights, thresholds, or bands.
 *
 * Score: 0–100 integer composed of 5 weighted sub-scores.
 */

// ─── Utility Functions ────────────────────────────────────────

export function clamp(x, lo = 0, hi = 1) {
  return Math.min(Math.max(x, lo), hi);
}

/** Scale 1–10 where MORE is BETTER (energy, motivation, etc.) */
export function scale10(v) {
  return clamp((v - 1) / 9);
}

/** Scale 1–10 where MORE is WORSE (stress, fatigue, pain, soreness) */
export function invertedScale10(v) {
  return clamp(1 - scale10(v));
}

// ─── 1. RECOVERY (weight: 0.30) ──────────────────────────────

export function sleepHoursScore(hours) {
  const idealLow = 7.5;
  const idealHigh = 9.0;
  const minViable = 4.0;

  if (hours >= idealLow && hours <= idealHigh) return 1.0;

  if (hours < idealLow) {
    if (hours <= minViable) return 0.0;
    return clamp((hours - minViable) / (idealLow - minViable));
  }

  // Oversleep: gradual decline, never below 0.7
  return clamp(1.0 - (hours - idealHigh) * 0.1, 0.7, 1.0);
}

/**
 * @param {object} input
 * @param {number|null} input.sleepHours - hours slept
 * @param {number|null} input.sleepQuality - 1–10 scale
 * @param {number|null} input.modalityCount - 0–6 active modalities
 * @param {number|null} input.recoveryScore - 1–10 subjective recovery
 * @param {boolean} input.hasRecoveryEntry - whether a recovery entry exists
 */
export function calculateRecovery(input) {
  const sleepH = input.sleepHours != null ? sleepHoursScore(input.sleepHours) : 0.5;
  const sleepQ = input.sleepQuality != null ? scale10(input.sleepQuality) : 0.5;

  let activity = 0.5; // default when no recovery entry
  if (input.hasRecoveryEntry) {
    const modalities = clamp((input.modalityCount || 0) / 4);
    const subjective = input.recoveryScore != null ? scale10(input.recoveryScore) : 0.5;
    activity = clamp(modalities * 0.5 + subjective * 0.5);
  }

  return clamp(sleepH * 0.45 + sleepQ * 0.35 + activity * 0.20);
}

// ─── 2. READINESS (weight: 0.25) ─────────────────────────────

/**
 * @param {object} input
 * @param {number|null} input.energy - 1–10
 * @param {number|null} input.motivation - 1–10
 * @param {number|null} input.stress - 1–10
 * @param {number|null} input.fatigue - 1–10
 * @param {boolean} input.hasCheckin
 */
export function calculateReadinessComponent(input) {
  if (!input.hasCheckin) return 0.5;

  const energy = input.energy != null ? scale10(input.energy) : 0.5;
  const motivation = input.motivation != null ? scale10(input.motivation) : 0.5;
  const lowStress = input.stress != null ? invertedScale10(input.stress) : 0.5;
  const lowFatigue = input.fatigue != null ? invertedScale10(input.fatigue) : 0.5;

  return clamp(energy * 0.30 + motivation * 0.25 + lowStress * 0.25 + lowFatigue * 0.20);
}

// ─── 3. TRAINING LOAD (weight: 0.20) ─────────────────────────

/**
 * @param {number} acuteDailyAvg - avg daily load over last 3 days
 * @param {number} chronicDailyAvg - avg daily load over last 14 days
 */
export function acwrScore(acuteDailyAvg, chronicDailyAvg) {
  if (chronicDailyAvg <= 0) return 0.6; // no history → neutral-ish

  const ratio = acuteDailyAvg / chronicDailyAvg;

  if (ratio >= 0.8 && ratio <= 1.3) return 1.0;
  if (ratio < 0.8) return clamp(ratio / 0.8); // detraining
  return clamp(1.0 - (ratio - 1.3) * 0.6);    // spike
}

/**
 * @param {Array<{durationMinutes: number, intensity: number, date: string|Date}>} sessions
 *   Sessions from the last 14+ days
 * @param {Date} [today] - reference date
 */
export function calculateTrainingLoad(sessions, today = new Date()) {
  const acuteWindowDays = 3;
  const chronicWindowDays = 14;

  const todayMs = today.getTime();
  const msPerDay = 86400000;

  let acuteLoad = 0;
  let chronicLoad = 0;

  for (const s of sessions) {
    const sessionDate = new Date(s.date);
    const daysAgo = (todayMs - sessionDate.getTime()) / msPerDay;
    const load = (s.durationMinutes || 0) * (s.intensity || 0);

    if (daysAgo >= 0 && daysAgo < acuteWindowDays) {
      acuteLoad += load;
    }
    if (daysAgo >= 0 && daysAgo < chronicWindowDays) {
      chronicLoad += load;
    }
  }

  const acuteDailyAvg = acuteLoad / acuteWindowDays;
  const chronicDailyAvg = chronicLoad / chronicWindowDays;

  return {
    score: acwrScore(acuteDailyAvg, chronicDailyAvg),
    acuteLoad,
    chronicLoad,
    acuteDailyAvg,
    chronicDailyAvg,
    ratio: chronicDailyAvg > 0 ? acuteDailyAvg / chronicDailyAvg : 0,
  };
}

// ─── 4. INJURY RISK (weight: 0.15) ──────────────────────────

/**
 * @param {object} input
 * @param {number|null} input.painLevel - 1–10 from check-in
 * @param {number|null} input.muscleSoreness - 1–10 from check-in
 * @param {number} input.currentPainAreaCount - zones with active pain
 * @param {boolean} input.hasInjuryHistory
 * @param {boolean} input.hasCheckin
 */
export function calculateInjuryRiskComponent(input) {
  const lowPain = input.hasCheckin && input.painLevel != null
    ? invertedScale10(input.painLevel)
    : 0.5;
  const lowSore = input.hasCheckin && input.muscleSoreness != null
    ? invertedScale10(input.muscleSoreness)
    : 0.5;

  let historyMod = 1.0;
  const penalty = Math.min((input.currentPainAreaCount || 0) * 0.08, 0.30);
  historyMod -= penalty;
  if (input.hasInjuryHistory) historyMod -= 0.05;
  historyMod = clamp(historyMod);

  return clamp(lowPain * 0.40 + lowSore * 0.35 + historyMod * 0.25);
}

// ─── 5. LIFESTYLE (weight: 0.10) ─────────────────────────────

/**
 * Circular standard deviation for time-of-day data.
 * Converts minute-of-day to angle (min/1440 * 2π), uses vector mean,
 * circular variance = -2*ln(R).
 *
 * @param {number[]} minutesOfDay - array of minute-of-day values (0–1439)
 * @returns {number} circular stdev in minutes
 */
export function circularStdDevMinutes(minutesOfDay) {
  if (minutesOfDay.length < 2) return 0;

  const n = minutesOfDay.length;
  let sinSum = 0;
  let cosSum = 0;

  for (const m of minutesOfDay) {
    const angle = (m / 1440) * 2 * Math.PI;
    sinSum += Math.sin(angle);
    cosSum += Math.cos(angle);
  }

  const R = Math.sqrt((sinSum / n) ** 2 + (cosSum / n) ** 2);
  // Circular variance = -2 * ln(R), stdev = sqrt(variance)
  // Convert from radians back to minutes
  if (R >= 1) return 0; // perfect alignment
  const varianceRad = -2 * Math.log(R);
  const stdRad = Math.sqrt(varianceRad);
  return stdRad * (1440 / (2 * Math.PI)); // radians → minutes
}

/**
 * @param {object} input
 * @param {number[]|null} input.bedtimeMinutes - minute-of-day bedtimes (last 7 days)
 * @param {number[]|null} input.wakeTimeMinutes - minute-of-day wake times (last 7 days)
 * @param {number} input.recoveryDaysCount - days (of last 7) with ≥1 recovery modality
 * @param {number|null} input.waterGlasses - glasses of water today
 * @param {number|null} input.alcoholDrinks - alcoholic drinks today
 * @param {boolean} input.lateCaffeine - caffeine after 2pm
 * @param {boolean} input.hasCheckin - has today's check-in
 */
export function calculateLifestyle(input) {
  // Sleep regularity
  let regularity = 0.5; // default for < 3 nights
  const bedtimes = input.bedtimeMinutes || [];
  const wakeTimes = input.wakeTimeMinutes || [];

  if (bedtimes.length >= 3 && wakeTimes.length >= 3) {
    const bedStd = circularStdDevMinutes(bedtimes);
    const wakeStd = circularStdDevMinutes(wakeTimes);
    const avg = (bedStd + wakeStd) / 2;

    const tight = 30;
    const loose = 120;

    if (avg <= tight) {
      regularity = 1.0;
    } else if (avg >= loose) {
      regularity = 0.0;
    } else {
      regularity = clamp(1.0 - (avg - tight) / (loose - tight));
    }
  }

  // Recovery habits
  const recoveryHabits = clamp((input.recoveryDaysCount || 0) / 7);

  // Daily factors
  let dailyFactors = 0.5; // default if no check-in
  if (input.hasCheckin) {
    const idealWater = 8;
    const hydration = clamp((input.waterGlasses || 0) / idealWater);
    let penalty = Math.min((input.alcoholDrinks || 0) * 0.20, 0.80);
    if (input.lateCaffeine) penalty += 0.25;
    dailyFactors = clamp(hydration - penalty);
  }

  return clamp(regularity * 0.40 + recoveryHabits * 0.30 + dailyFactors * 0.30);
}

// ─── BANDS ───────────────────────────────────────────────────

const BANDS = [
  { min: 90, max: 100, category: 'Peak State',         message: { en: 'You are primed for high performance.', es: 'Estás en tu punto máximo de rendimiento.' } },
  { min: 80, max: 89,  category: 'Optimal',            message: { en: 'Great day to train with intensity.', es: 'Gran día para entrenar con intensidad.' } },
  { min: 70, max: 79,  category: 'Productive',         message: { en: 'You can train, but monitor your effort.', es: 'Puedes entrenar, pero monitorea tu esfuerzo.' } },
  { min: 60, max: 69,  category: 'Caution',            message: { en: 'Reduce intensity and prioritize recovery.', es: 'Reduce la intensidad y prioriza la recuperación.' } },
  { min: 0,  max: 59,  category: 'Recovery Required',  message: { en: 'Your body needs recovery today.', es: 'Tu cuerpo necesita recuperación hoy.' } },
];

export function getBand(score) {
  for (const band of BANDS) {
    if (score >= band.min && score <= band.max) return band;
  }
  return BANDS[BANDS.length - 1]; // fallback to lowest
}

// ─── CONFIDENCE ──────────────────────────────────────────────

/**
 * @param {number} distinctDays - number of distinct days with ANY data
 */
export function calculateConfidence(distinctDays) {
  const fullHistoryDays = 14;
  const floor = 0.25;
  return clamp(distinctDays / fullHistoryDays, floor, 1.0);
}

// ─── MAIN: Calculate Wellaryn Score ──────────────────────────

/**
 * Calculate the Wellaryn Score™.
 *
 * @param {object} params
 * @param {object} params.recovery - inputs for calculateRecovery
 * @param {object} params.readiness - inputs for calculateReadinessComponent
 * @param {object} params.trainingLoad - { score } or sessions array
 * @param {object} params.injuryRisk - inputs for calculateInjuryRiskComponent
 * @param {object} params.lifestyle - inputs for calculateLifestyle
 * @param {number} params.distinctDays - for confidence
 *
 * @returns {object} { score, category, message, confidence, subScores }
 */
export function calculateWellarynScore(params) {
  const recovery = calculateRecovery(params.recovery || {});
  const readiness = calculateReadinessComponent(params.readiness || {});

  // Training load can be passed as pre-calculated score or raw sessions
  let trainingLoadScore;
  let trainingLoadDetails = {};
  if (params.trainingLoad && typeof params.trainingLoad.score === 'number') {
    trainingLoadScore = params.trainingLoad.score;
    trainingLoadDetails = params.trainingLoad;
  } else if (params.trainingLoad && Array.isArray(params.trainingLoad.sessions)) {
    const result = calculateTrainingLoad(params.trainingLoad.sessions, params.trainingLoad.today);
    trainingLoadScore = result.score;
    trainingLoadDetails = result;
  } else {
    trainingLoadScore = 0.6; // no data → neutral-ish (matches acwrScore default)
  }

  const injuryRisk = calculateInjuryRiskComponent(params.injuryRisk || {});
  const lifestyle = calculateLifestyle(params.lifestyle || {});

  // Weighted sum
  const totalUnit = recovery * 0.30
    + readiness * 0.25
    + trainingLoadScore * 0.20
    + injuryRisk * 0.15
    + lifestyle * 0.10;

  const totalScore = Math.round(clamp(totalUnit) * 100);
  const band = getBand(totalScore);
  const confidence = calculateConfidence(params.distinctDays || 0);

  return {
    score: totalScore,
    category: band.category,
    message: band.message,
    confidence,
    subScores: {
      recovery: Math.round(recovery * 100),
      readiness: Math.round(readiness * 100),
      trainingLoad: Math.round(trainingLoadScore * 100),
      injuryRisk: Math.round(injuryRisk * 100),
      lifestyle: Math.round(lifestyle * 100),
    },
    subScoresRaw: {
      recovery,
      readiness,
      trainingLoad: trainingLoadScore,
      injuryRisk,
      lifestyle,
    },
    trainingLoadDetails,
  };
}
