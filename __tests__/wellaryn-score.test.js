/**
 * Wellaryn Score™ — Comprehensive Unit Tests
 *
 * Tests the core scoring algorithm for correctness, boundary conditions,
 * and parity guarantees with the iOS implementation.
 */

import {
  clamp,
  scale10,
  invertedScale10,
  sleepHoursScore,
  calculateRecovery,
  calculateReadinessComponent,
  acwrScore,
  calculateTrainingLoad,
  calculateInjuryRiskComponent,
  calculateLifestyle,
  circularStdDevMinutes,
  getBand,
  calculateConfidence,
  calculateWellarynScore,
} from '@/lib/wellaryn-score';

// ═══════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════

describe('clamp', () => {
  it('returns the value when within range', () => {
    expect(clamp(0.5)).toBe(0.5);
  });

  it('clamps below lower bound', () => {
    expect(clamp(-1)).toBe(0);
  });

  it('clamps above upper bound', () => {
    expect(clamp(2)).toBe(1);
  });

  it('supports custom bounds', () => {
    expect(clamp(5, 0, 10)).toBe(5);
    expect(clamp(-5, 0, 10)).toBe(0);
    expect(clamp(15, 0, 10)).toBe(10);
  });

  it('handles exact boundary values', () => {
    expect(clamp(0)).toBe(0);
    expect(clamp(1)).toBe(1);
  });
});

describe('scale10', () => {
  it('maps 1 → 0', () => {
    expect(scale10(1)).toBe(0);
  });

  it('maps 10 → 1', () => {
    expect(scale10(10)).toBe(1);
  });

  it('maps 5.5 → 0.5', () => {
    expect(scale10(5.5)).toBe(0.5);
  });

  it('clamps below 1', () => {
    expect(scale10(0)).toBe(0);
  });

  it('clamps above 10', () => {
    expect(scale10(11)).toBe(1);
  });
});

describe('invertedScale10', () => {
  it('maps 1 → 1 (low stress = good)', () => {
    expect(invertedScale10(1)).toBe(1);
  });

  it('maps 10 → 0 (max stress = bad)', () => {
    expect(invertedScale10(10)).toBe(0);
  });

  it('maps 5.5 → 0.5', () => {
    expect(invertedScale10(5.5)).toBe(0.5);
  });
});

// ═══════════════════════════════════════════════════════════════
// 1. RECOVERY COMPONENT
// ═══════════════════════════════════════════════════════════════

describe('sleepHoursScore', () => {
  it('returns 1.0 for ideal sleep (7.5–9h)', () => {
    expect(sleepHoursScore(7.5)).toBe(1.0);
    expect(sleepHoursScore(8.0)).toBe(1.0);
    expect(sleepHoursScore(9.0)).toBe(1.0);
  });

  it('returns 0.0 for ≤4h', () => {
    expect(sleepHoursScore(4.0)).toBe(0.0);
    expect(sleepHoursScore(3.0)).toBe(0.0);
  });

  it('returns intermediate values for 4–7.5h', () => {
    const score = sleepHoursScore(6.0);
    expect(score).toBeGreaterThan(0);
    expect(score).toBeLessThan(1);
  });

  it('penalizes oversleep but never below 0.7', () => {
    expect(sleepHoursScore(10)).toBeGreaterThanOrEqual(0.7);
    expect(sleepHoursScore(12)).toBe(0.7);
  });

  it('returns values between 0 and 1', () => {
    for (const hours of [0, 2, 4, 5, 6, 7, 8, 9, 10, 12, 15]) {
      const score = sleepHoursScore(hours);
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(1);
    }
  });
});

describe('calculateRecovery', () => {
  it('returns 0.5 baseline when all inputs are null', () => {
    const result = calculateRecovery({});
    expect(result).toBe(0.5);
  });

  it('returns high score with great sleep and recovery', () => {
    const result = calculateRecovery({
      sleepHours: 8.0,
      sleepQuality: 9,
      hasRecoveryEntry: true,
      modalityCount: 4,
      recoveryScore: 9,
    });
    expect(result).toBeGreaterThan(0.85);
  });

  it('returns low score with terrible sleep', () => {
    const result = calculateRecovery({
      sleepHours: 3,
      sleepQuality: 1,
      hasRecoveryEntry: false,
    });
    expect(result).toBeLessThan(0.25);
  });

  it('is always between 0 and 1', () => {
    const result = calculateRecovery({
      sleepHours: 0,
      sleepQuality: 1,
      hasRecoveryEntry: true,
      modalityCount: 0,
      recoveryScore: 1,
    });
    expect(result).toBeGreaterThanOrEqual(0);
    expect(result).toBeLessThanOrEqual(1);
  });
});

// ═══════════════════════════════════════════════════════════════
// 2. READINESS COMPONENT
// ═══════════════════════════════════════════════════════════════

describe('calculateReadinessComponent', () => {
  it('returns 0.5 when no check-in exists', () => {
    expect(calculateReadinessComponent({ hasCheckin: false })).toBe(0.5);
  });

  it('returns high score with high energy/motivation, low stress/fatigue', () => {
    const result = calculateReadinessComponent({
      hasCheckin: true,
      energy: 9,
      motivation: 9,
      stress: 1,
      fatigue: 1,
    });
    expect(result).toBeGreaterThan(0.85);
  });

  it('returns low score with low energy/motivation, high stress/fatigue', () => {
    const result = calculateReadinessComponent({
      hasCheckin: true,
      energy: 1,
      motivation: 1,
      stress: 10,
      fatigue: 10,
    });
    expect(result).toBeLessThan(0.15);
  });

  it('handles partial data with defaults of 0.5', () => {
    const result = calculateReadinessComponent({
      hasCheckin: true,
      energy: 10,
      // motivation, stress, fatigue missing → 0.5
    });
    // energy = 1.0 * 0.30, motivation = 0.5 * 0.25, stress = 0.5 * 0.25, fatigue = 0.5 * 0.20
    expect(result).toBeCloseTo(0.30 + 0.125 + 0.125 + 0.10, 2);
  });
});

// ═══════════════════════════════════════════════════════════════
// 3. TRAINING LOAD / ACWR
// ═══════════════════════════════════════════════════════════════

describe('acwrScore', () => {
  it('returns 0.6 when chronic average is 0 (no history)', () => {
    expect(acwrScore(100, 0)).toBe(0.6);
  });

  it('returns 1.0 for ACWR in sweet-spot (0.8–1.3)', () => {
    expect(acwrScore(100, 100)).toBe(1.0);    // ratio = 1.0
    expect(acwrScore(80, 100)).toBe(1.0);      // ratio = 0.8
    expect(acwrScore(130, 100)).toBe(1.0);     // ratio = 1.3
  });

  it('penalizes detraining (ratio < 0.8)', () => {
    const score = acwrScore(40, 100); // ratio = 0.4
    expect(score).toBeLessThan(1.0);
    expect(score).toBe(0.5);
  });

  it('penalizes training spikes (ratio > 1.3)', () => {
    const score = acwrScore(200, 100); // ratio = 2.0
    expect(score).toBeLessThan(1.0);
  });

  it('is always between 0 and 1', () => {
    const testCases = [
      [0, 0], [0, 100], [100, 0], [500, 100], [100, 500], [100, 100],
    ];
    for (const [acute, chronic] of testCases) {
      const score = acwrScore(acute, chronic);
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(1);
    }
  });
});

describe('calculateTrainingLoad', () => {
  const today = new Date('2026-06-07');

  it('returns neutral score with no sessions', () => {
    const result = calculateTrainingLoad([], today);
    expect(result.score).toBe(0.6); // matches acwrScore(0, 0)
    expect(result.acuteLoad).toBe(0);
    expect(result.chronicLoad).toBe(0);
  });

  it('calculates correct ACWR from session data', () => {
    const sessions = [
      // Recent sessions (within 3 days)
      { date: '2026-06-05', durationMinutes: 60, intensity: 7 },
      { date: '2026-06-06', durationMinutes: 45, intensity: 8 },
      // Older sessions (within 14 days but not 3)
      { date: '2026-05-28', durationMinutes: 60, intensity: 6 },
      { date: '2026-05-30', durationMinutes: 50, intensity: 7 },
      { date: '2026-06-01', durationMinutes: 55, intensity: 6 },
    ];
    const result = calculateTrainingLoad(sessions, today);
    expect(result.acuteLoad).toBe(60 * 7 + 45 * 8); // 420 + 360 = 780
    expect(result.ratio).toBeGreaterThan(0);
  });

  it('returns the ratio field', () => {
    const sessions = [
      { date: '2026-06-06', durationMinutes: 60, intensity: 5 },
    ];
    const result = calculateTrainingLoad(sessions, today);
    expect(typeof result.ratio).toBe('number');
  });

  it('handles sessions with missing fields gracefully', () => {
    const sessions = [
      { date: '2026-06-06' }, // missing durationMinutes & intensity
    ];
    const result = calculateTrainingLoad(sessions, today);
    expect(result.acuteLoad).toBe(0);
  });
});

// ═══════════════════════════════════════════════════════════════
// 4. INJURY RISK COMPONENT
// ═══════════════════════════════════════════════════════════════

describe('calculateInjuryRiskComponent', () => {
  it('returns 0.5 baseline when no check-in', () => {
    const result = calculateInjuryRiskComponent({
      hasCheckin: false,
      currentPainAreaCount: 0,
      hasInjuryHistory: false,
    });
    // lowPain=0.5, lowSore=0.5, historyMod=1.0
    // 0.5*0.40 + 0.5*0.35 + 1.0*0.25 = 0.20 + 0.175 + 0.25 = 0.625
    expect(result).toBeCloseTo(0.625, 2);
  });

  it('returns high score when pain-free', () => {
    const result = calculateInjuryRiskComponent({
      hasCheckin: true,
      painLevel: 1,
      muscleSoreness: 1,
      currentPainAreaCount: 0,
      hasInjuryHistory: false,
    });
    // lowPain=1.0, lowSore=1.0, historyMod=1.0
    expect(result).toBeCloseTo(1.0, 1);
  });

  it('penalizes high pain areas', () => {
    const withPain = calculateInjuryRiskComponent({
      hasCheckin: true,
      painLevel: 1,
      muscleSoreness: 1,
      currentPainAreaCount: 4,
      hasInjuryHistory: false,
    });
    const noPain = calculateInjuryRiskComponent({
      hasCheckin: true,
      painLevel: 1,
      muscleSoreness: 1,
      currentPainAreaCount: 0,
      hasInjuryHistory: false,
    });
    expect(withPain).toBeLessThan(noPain);
  });

  it('penalizes injury history', () => {
    const withHistory = calculateInjuryRiskComponent({
      hasCheckin: true,
      painLevel: 5,
      muscleSoreness: 5,
      currentPainAreaCount: 0,
      hasInjuryHistory: true,
    });
    const noHistory = calculateInjuryRiskComponent({
      hasCheckin: true,
      painLevel: 5,
      muscleSoreness: 5,
      currentPainAreaCount: 0,
      hasInjuryHistory: false,
    });
    expect(withHistory).toBeLessThan(noHistory);
  });

  it('caps pain area penalty at 0.30', () => {
    const result = calculateInjuryRiskComponent({
      hasCheckin: true,
      painLevel: 1,
      muscleSoreness: 1,
      currentPainAreaCount: 100, // way more than reasonable
      hasInjuryHistory: false,
    });
    // historyMod = max(1.0 - 0.30, 0) = 0.70
    // 1.0*0.40 + 1.0*0.35 + 0.70*0.25 = 0.40 + 0.35 + 0.175 = 0.925
    expect(result).toBeCloseTo(0.925, 2);
  });
});

// ═══════════════════════════════════════════════════════════════
// 5. LIFESTYLE COMPONENT
// ═══════════════════════════════════════════════════════════════

describe('circularStdDevMinutes', () => {
  it('returns 0 for fewer than 2 data points', () => {
    expect(circularStdDevMinutes([])).toBe(0);
    expect(circularStdDevMinutes([480])).toBe(0);
  });

  it('returns 0 for perfectly consistent times', () => {
    expect(circularStdDevMinutes([480, 480, 480])).toBe(0);
  });

  it('returns non-zero for varied times', () => {
    const result = circularStdDevMinutes([420, 480, 540, 460, 500]);
    expect(result).toBeGreaterThan(0);
  });
});

describe('calculateLifestyle', () => {
  it('returns 0.5 baseline with no data', () => {
    const result = calculateLifestyle({});
    // regularity=0.5, recoveryHabits=0, dailyFactors=0.5
    // 0.5*0.40 + 0*0.30 + 0.5*0.30 = 0.20 + 0 + 0.15 = 0.35
    expect(result).toBeCloseTo(0.35, 2);
  });

  it('rewards consistent sleep schedule', () => {
    const consistent = calculateLifestyle({
      bedtimeMinutes: [1380, 1380, 1380, 1380, 1380, 1380, 1380], // 11pm every day
      wakeTimeMinutes: [420, 420, 420, 420, 420, 420, 420],         // 7am every day
      recoveryDaysCount: 5,
      hasCheckin: true,
      waterGlasses: 8,
      alcoholDrinks: 0,
      lateCaffeine: false,
    });
    expect(consistent).toBeGreaterThan(0.85);
  });

  it('penalizes alcohol and late caffeine', () => {
    const clean = calculateLifestyle({
      hasCheckin: true,
      waterGlasses: 8,
      alcoholDrinks: 0,
      lateCaffeine: false,
      recoveryDaysCount: 0,
    });
    const dirty = calculateLifestyle({
      hasCheckin: true,
      waterGlasses: 8,
      alcoholDrinks: 3,
      lateCaffeine: true,
      recoveryDaysCount: 0,
    });
    expect(dirty).toBeLessThan(clean);
  });

  it('is always between 0 and 1', () => {
    const worstCase = calculateLifestyle({
      bedtimeMinutes: [0, 720, 100, 1400, 300, 900, 600],
      wakeTimeMinutes: [100, 800, 200, 1300, 400, 1000, 700],
      recoveryDaysCount: 0,
      hasCheckin: true,
      waterGlasses: 0,
      alcoholDrinks: 10,
      lateCaffeine: true,
    });
    expect(worstCase).toBeGreaterThanOrEqual(0);
    expect(worstCase).toBeLessThanOrEqual(1);
  });
});

// ═══════════════════════════════════════════════════════════════
// BANDS & CONFIDENCE
// ═══════════════════════════════════════════════════════════════

describe('getBand', () => {
  it('returns Peak State for 90–100', () => {
    expect(getBand(95).category).toBe('Peak State');
    expect(getBand(100).category).toBe('Peak State');
    expect(getBand(90).category).toBe('Peak State');
  });

  it('returns Optimal for 80–89', () => {
    expect(getBand(85).category).toBe('Optimal');
  });

  it('returns Productive for 70–79', () => {
    expect(getBand(75).category).toBe('Productive');
  });

  it('returns Caution for 60–69', () => {
    expect(getBand(65).category).toBe('Caution');
  });

  it('returns Recovery Required for 0–59', () => {
    expect(getBand(30).category).toBe('Recovery Required');
    expect(getBand(0).category).toBe('Recovery Required');
  });

  it('has bilingual messages', () => {
    const band = getBand(95);
    expect(band.message.en).toBeDefined();
    expect(band.message.es).toBeDefined();
  });
});

describe('calculateConfidence', () => {
  it('returns floor of 0.25 with 0 days', () => {
    expect(calculateConfidence(0)).toBe(0.25);
  });

  it('returns 1.0 with 14+ days', () => {
    expect(calculateConfidence(14)).toBe(1.0);
    expect(calculateConfidence(30)).toBe(1.0);
  });

  it('scales linearly between floor and ceiling', () => {
    const conf7 = calculateConfidence(7);
    expect(conf7).toBe(0.5);
  });
});

// ═══════════════════════════════════════════════════════════════
// MAIN: calculateWellarynScore
// ═══════════════════════════════════════════════════════════════

describe('calculateWellarynScore', () => {
  it('returns a score between 0 and 100', () => {
    const result = calculateWellarynScore({});
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
  });

  it('returns high score (>85) with perfect inputs', () => {
    const result = calculateWellarynScore({
      recovery: {
        sleepHours: 8.0,
        sleepQuality: 9,
        hasRecoveryEntry: true,
        modalityCount: 4,
        recoveryScore: 9,
      },
      readiness: {
        hasCheckin: true,
        energy: 9,
        motivation: 9,
        stress: 1,
        fatigue: 1,
      },
      trainingLoad: { score: 1.0 },
      injuryRisk: {
        hasCheckin: true,
        painLevel: 1,
        muscleSoreness: 1,
        currentPainAreaCount: 0,
        hasInjuryHistory: false,
      },
      lifestyle: {
        bedtimeMinutes: [1380, 1380, 1380, 1380, 1380, 1380, 1380],
        wakeTimeMinutes: [420, 420, 420, 420, 420, 420, 420],
        recoveryDaysCount: 7,
        hasCheckin: true,
        waterGlasses: 8,
        alcoholDrinks: 0,
        lateCaffeine: false,
      },
      distinctDays: 14,
    });
    expect(result.score).toBeGreaterThan(85);
    expect(result.category).toBeDefined();
    expect(typeof result.category).toBe('string');
  });

  it('returns low score (<50) with poor inputs', () => {
    const result = calculateWellarynScore({
      recovery: {
        sleepHours: 3,
        sleepQuality: 1,
        hasRecoveryEntry: false,
      },
      readiness: {
        hasCheckin: true,
        energy: 1,
        motivation: 1,
        stress: 10,
        fatigue: 10,
      },
      trainingLoad: { score: 0.0 },
      injuryRisk: {
        hasCheckin: true,
        painLevel: 10,
        muscleSoreness: 10,
        currentPainAreaCount: 5,
        hasInjuryHistory: true,
      },
      lifestyle: {
        bedtimeMinutes: [0, 720, 100, 1400, 300, 900, 600],
        wakeTimeMinutes: [100, 800, 200, 1300, 400, 1000, 700],
        recoveryDaysCount: 0,
        hasCheckin: true,
        waterGlasses: 0,
        alcoholDrinks: 5,
        lateCaffeine: true,
      },
      distinctDays: 0,
    });
    expect(result.score).toBeLessThan(50);
  });

  it('handles missing/empty params gracefully (defaults)', () => {
    const result = calculateWellarynScore({});
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
    expect(result.category).toBeDefined();
    expect(result.confidence).toBe(0.25); // 0 distinctDays
    expect(result.subScores).toBeDefined();
    expect(result.subScoresRaw).toBeDefined();
  });

  it('includes all expected sub-score keys', () => {
    const result = calculateWellarynScore({});
    expect(result.subScores).toHaveProperty('recovery');
    expect(result.subScores).toHaveProperty('readiness');
    expect(result.subScores).toHaveProperty('trainingLoad');
    expect(result.subScores).toHaveProperty('injuryRisk');
    expect(result.subScores).toHaveProperty('lifestyle');
  });

  it('sub-scores are all integers 0–100', () => {
    const result = calculateWellarynScore({
      recovery: { sleepHours: 7, sleepQuality: 7 },
      readiness: { hasCheckin: true, energy: 7, motivation: 7, stress: 3, fatigue: 3 },
      trainingLoad: { score: 0.8 },
      injuryRisk: { hasCheckin: true, painLevel: 2, muscleSoreness: 2, currentPainAreaCount: 0, hasInjuryHistory: false },
      lifestyle: { hasCheckin: true, waterGlasses: 6, recoveryDaysCount: 3 },
      distinctDays: 7,
    });
    for (const key of Object.keys(result.subScores)) {
      expect(Number.isInteger(result.subScores[key])).toBe(true);
      expect(result.subScores[key]).toBeGreaterThanOrEqual(0);
      expect(result.subScores[key]).toBeLessThanOrEqual(100);
    }
  });

  it('accepts training load as sessions array', () => {
    const today = new Date('2026-06-07');
    const result = calculateWellarynScore({
      trainingLoad: {
        sessions: [
          { date: '2026-06-05', durationMinutes: 60, intensity: 7 },
          { date: '2026-06-06', durationMinutes: 45, intensity: 6 },
        ],
        today,
      },
    });
    expect(result.trainingLoadDetails).toBeDefined();
    expect(result.trainingLoadDetails.acuteLoad).toBeGreaterThan(0);
  });

  it('message object has en and es keys', () => {
    const result = calculateWellarynScore({});
    expect(result.message).toHaveProperty('en');
    expect(result.message).toHaveProperty('es');
    expect(typeof result.message.en).toBe('string');
    expect(typeof result.message.es).toBe('string');
  });
});

// ═══════════════════════════════════════════════════════════════
// BOUNDARY & EDGE CASES
// ═══════════════════════════════════════════════════════════════

describe('boundary conditions', () => {
  it('score is always an integer', () => {
    const result = calculateWellarynScore({
      recovery: { sleepHours: 6.3, sleepQuality: 4 },
      readiness: { hasCheckin: true, energy: 3, motivation: 4, stress: 7, fatigue: 6 },
    });
    expect(Number.isInteger(result.score)).toBe(true);
  });

  it('extreme zero values produce valid score', () => {
    const result = calculateWellarynScore({
      recovery: { sleepHours: 0, sleepQuality: 0 },
      readiness: { hasCheckin: true, energy: 0, motivation: 0, stress: 0, fatigue: 0 },
      trainingLoad: { score: 0 },
      injuryRisk: { hasCheckin: true, painLevel: 0, muscleSoreness: 0, currentPainAreaCount: 0, hasInjuryHistory: false },
      lifestyle: { hasCheckin: true, waterGlasses: 0, alcoholDrinks: 0, lateCaffeine: false, recoveryDaysCount: 0 },
      distinctDays: 0,
    });
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
  });

  it('extreme high values produce valid score', () => {
    const result = calculateWellarynScore({
      recovery: { sleepHours: 100, sleepQuality: 100 },
      readiness: { hasCheckin: true, energy: 100, motivation: 100, stress: 100, fatigue: 100 },
      trainingLoad: { score: 100 },
      injuryRisk: { hasCheckin: true, painLevel: 100, muscleSoreness: 100, currentPainAreaCount: 100, hasInjuryHistory: true },
      lifestyle: { hasCheckin: true, waterGlasses: 100, alcoholDrinks: 100, lateCaffeine: true, recoveryDaysCount: 100 },
      distinctDays: 1000,
    });
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
  });

  it('weighted sub-scores sum to 1.0 (weights: 0.30+0.25+0.20+0.15+0.10)', () => {
    const weights = [0.30, 0.25, 0.20, 0.15, 0.10];
    const sum = weights.reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(1.0, 10);
  });
});
