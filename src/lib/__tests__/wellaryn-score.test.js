/**
 * Wellaryn Score™ — Validation Tests
 *
 * These 3 test cases MUST match the iOS implementation exactly.
 * If numbers don't match, fix the formula — NOT the test expectations.
 */

import {
  clamp, scale10, invertedScale10,
  sleepHoursScore, calculateRecovery,
  calculateReadinessComponent, acwrScore, calculateTrainingLoad,
  calculateInjuryRiskComponent, calculateLifestyle, circularStdDevMinutes,
  calculateConfidence, getBand, calculateWellarynScore,
} from '../wellaryn-score';

// ─── Unit Tests: Utility Functions ────────────────────────────

describe('Utility Functions', () => {
  test('clamp works correctly', () => {
    expect(clamp(0.5)).toBe(0.5);
    expect(clamp(-0.1)).toBe(0);
    expect(clamp(1.5)).toBe(1);
    expect(clamp(5, 0, 10)).toBe(5);
    expect(clamp(-1, 0, 10)).toBe(0);
    expect(clamp(15, 0, 10)).toBe(10);
  });

  test('scale10: 1→0, 10→1, 5.5→0.5', () => {
    expect(scale10(1)).toBeCloseTo(0.0);
    expect(scale10(10)).toBeCloseTo(1.0);
    expect(scale10(5.5)).toBeCloseTo(0.5);
  });

  test('invertedScale10: 1→1, 10→0', () => {
    expect(invertedScale10(1)).toBeCloseTo(1.0);
    expect(invertedScale10(10)).toBeCloseTo(0.0);
    expect(invertedScale10(5.5)).toBeCloseTo(0.5);
  });
});

// ─── Unit Tests: Sleep Hours Score ────────────────────────────

describe('Sleep Hours Score', () => {
  test('ideal band 7.5–9.0 → 1.0', () => {
    expect(sleepHoursScore(7.5)).toBe(1.0);
    expect(sleepHoursScore(8.0)).toBe(1.0);
    expect(sleepHoursScore(9.0)).toBe(1.0);
  });

  test('≤ 4h → 0.0', () => {
    expect(sleepHoursScore(4.0)).toBe(0.0);
    expect(sleepHoursScore(3.0)).toBe(0.0);
  });

  test('between 4 and 7.5 → linear', () => {
    expect(sleepHoursScore(5.75)).toBeCloseTo(0.5);
  });

  test('oversleep > 9h → declines but ≥ 0.7', () => {
    expect(sleepHoursScore(10.0)).toBeCloseTo(0.9);
    expect(sleepHoursScore(12.0)).toBeCloseTo(0.7);
    expect(sleepHoursScore(15.0)).toBeCloseTo(0.7); // capped
  });
});

// ─── Unit Tests: ACWR Score ──────────────────────────────────

describe('ACWR Score', () => {
  test('no chronic data → 0.6', () => {
    expect(acwrScore(100, 0)).toBe(0.6);
  });

  test('optimal ratio (1.0) → 1.0', () => {
    expect(acwrScore(100, 100)).toBe(1.0);
  });

  test('detraining (ratio 0.4) → 0.5', () => {
    expect(acwrScore(40, 100)).toBeCloseTo(0.5);
  });

  test('spike (ratio 2.0) → decline', () => {
    const score = acwrScore(200, 100);
    expect(score).toBeCloseTo(0.58);
  });
});

// ─── Unit Tests: Circular Stdev ──────────────────────────────

describe('Circular Stdev', () => {
  test('identical times → 0', () => {
    expect(circularStdDevMinutes([1380, 1380, 1380])).toBeCloseTo(0, 0);
  });

  test('times near midnight (23:30 & 00:30) are close', () => {
    // 23:30 = 1410 min, 00:30 = 30 min — should be ~60min apart, not 23h
    const stdev = circularStdDevMinutes([1410, 30, 1410, 30]);
    expect(stdev).toBeLessThan(60);
  });
});

// ─── Unit Tests: Confidence ──────────────────────────────────

describe('Confidence', () => {
  test('0 days → 0.25 (floor)', () => {
    expect(calculateConfidence(0)).toBe(0.25);
  });

  test('1 day → 0.25 (floor)', () => {
    expect(calculateConfidence(1)).toBeCloseTo(0.25);
  });

  test('7 days → 0.5', () => {
    expect(calculateConfidence(7)).toBeCloseTo(0.5);
  });

  test('14 days → 1.0', () => {
    expect(calculateConfidence(14)).toBe(1.0);
  });

  test('20 days → 1.0 (capped)', () => {
    expect(calculateConfidence(20)).toBe(1.0);
  });
});

// ─── Validation Test 1: Peak Day → ≈ 95, Peak State ──────────

describe('Validation: Peak Day', () => {
  test('totalScore ≈ 95, Peak State, confidence 1.0', () => {
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
        stress: 2,
        fatigue: 2,
      },
      trainingLoad: {
        score: 1.0, // ACWR ~1.0 (ideal)
      },
      injuryRisk: {
        hasCheckin: true,
        painLevel: 1,
        muscleSoreness: 1,
        currentPainAreaCount: 0,
        hasInjuryHistory: false,
      },
      lifestyle: {
        bedtimeMinutes: [1410, 1400, 1420, 1415, 1405, 1410, 1408],  // ~23:30 ±15min
        wakeTimeMinutes: [390, 380, 400, 395, 385, 390, 388],        // ~06:30 ±15min
        recoveryDaysCount: 5,
        hasCheckin: true,
        waterGlasses: 8,
        alcoholDrinks: 0,
        lateCaffeine: false,
      },
      distinctDays: 14,
    });

    console.log('Peak Day result:', JSON.stringify(result, null, 2));

    // Score should be approximately 95
    expect(result.score).toBeGreaterThanOrEqual(93);
    expect(result.score).toBeLessThanOrEqual(97);
    expect(result.category).toBe('Peak State');
    expect(result.confidence).toBe(1.0);
  });
});

// ─── Validation Test 2: Destroyed Day → ≤ 16, Recovery Required ─

describe('Validation: Destroyed Day', () => {
  test('totalScore ≤ 16, Recovery Required', () => {
    const result = calculateWellarynScore({
      recovery: {
        sleepHours: 4.0,
        sleepQuality: 2,
        hasRecoveryEntry: false,
      },
      readiness: {
        hasCheckin: true,
        energy: 2,
        motivation: 2,
        stress: 9,
        fatigue: 9,
      },
      trainingLoad: {
        score: acwrScore(300, 100), // heavy spike
      },
      injuryRisk: {
        hasCheckin: true,
        painLevel: 9,
        muscleSoreness: 9,
        currentPainAreaCount: 3,
        hasInjuryHistory: true,
      },
      lifestyle: {
        bedtimeMinutes: [60, 180, 300],  // wildly irregular bedtimes
        wakeTimeMinutes: [480, 600, 360],
        recoveryDaysCount: 0,
        hasCheckin: true,
        waterGlasses: 2,
        alcoholDrinks: 4,
        lateCaffeine: true,
      },
      distinctDays: 14,
    });

    console.log('Destroyed Day result:', JSON.stringify(result, null, 2));

    expect(result.score).toBeLessThanOrEqual(16);
    expect(result.category).toBe('Recovery Required');
  });
});

// ─── Validation Test 3: Cold Start → ≈ 67, confidence 0.25 ──

describe('Validation: Cold Start', () => {
  test('totalScore ≈ 67, confidence 0.25', () => {
    // Day 1, decent check-in, 1 day of history
    const result = calculateWellarynScore({
      recovery: {
        sleepHours: 7.0,
        sleepQuality: 6,
        hasRecoveryEntry: false, // no recovery logged yet
      },
      readiness: {
        hasCheckin: true,
        energy: 7,
        motivation: 7,
        stress: 4,
        fatigue: 4,
      },
      trainingLoad: {
        score: 0.6, // no chronic history → default
      },
      injuryRisk: {
        hasCheckin: true,
        painLevel: 2,
        muscleSoreness: 3,
        currentPainAreaCount: 0,
        hasInjuryHistory: false,
      },
      lifestyle: {
        bedtimeMinutes: [],   // < 3 nights → regularity = 0.5
        wakeTimeMinutes: [],
        recoveryDaysCount: 0, // day 1
        hasCheckin: true,
        waterGlasses: 6,
        alcoholDrinks: 0,
        lateCaffeine: false,
      },
      distinctDays: 1,
    });

    console.log('Cold Start result:', JSON.stringify(result, null, 2));

    // Score should be approximately 67
    expect(result.score).toBeGreaterThanOrEqual(64);
    expect(result.score).toBeLessThanOrEqual(70);
    expect(result.confidence).toBeCloseTo(0.25);
  });
});
