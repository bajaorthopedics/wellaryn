/**
 * Wellaryn — Readiness Score v1 Unit Tests
 *
 * Tests the core algorithm with known scenarios including the "Juan test case"
 * from the technical specification.
 *
 * Run: npx jest src/lib/__tests__/readiness.test.js
 */

import { calculateReadiness, calculateInjuryRisk } from '../readiness';
import { ewma, calculateACWR, mapACWRToScore, LAMBDA_ACUTE, LAMBDA_CHRONIC } from '../acwr';
import { generateHRVBaseline, generateRHRBaseline, calculateSleepDebt, CONFIDENCE } from '../baselines';
import { generateTestCaseJuan } from '../mock-data';

// --- ACWR Module Tests ---

describe('ACWR Module', () => {
  test('EWMA assigns more weight to recent values', () => {
    // With enough history, a recent spike should dominate over an old one
    const baseline = Array(20).fill(300);
    const spikeAtEnd = [...baseline, 600];   // 20 days normal, then spike
    const spikeAtStart = [600, ...baseline];  // Spike first, then 20 days normal

    const ewmaEnd = ewma(spikeAtEnd, LAMBDA_ACUTE);
    const ewmaStart = ewma(spikeAtStart, LAMBDA_ACUTE);

    // With 20+ days of history, EWMA should weight recent spike much more
    expect(ewmaEnd).toBeGreaterThan(ewmaStart);
  });

  test('EWMA produces different values than simple average', () => {
    const data = [300, 300, 300, 300, 300, 300, 600]; // Spike on last day
    const ewmaValue = ewma(data, LAMBDA_ACUTE);
    const simpleAvg = data.reduce((s, v) => s + v, 0) / data.length;

    // EWMA should weight the spike more heavily
    expect(ewmaValue).not.toBeCloseTo(simpleAvg, 0);
  });

  test('ACWR sweet spot (1.0) maps to score 85-100', () => {
    const score = mapACWRToScore(1.0);
    expect(score).toBeGreaterThanOrEqual(85);
    expect(score).toBeLessThanOrEqual(100);
  });

  test('ACWR spike (1.8) maps to score 30-60', () => {
    const score = mapACWRToScore(1.8);
    expect(score).toBeGreaterThanOrEqual(30);
    expect(score).toBeLessThanOrEqual(60);
  });

  test('ACWR extreme spike (2.5) maps to score 0-30', () => {
    const score = mapACWRToScore(2.5);
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(30);
  });

  test('ACWR detraining (0.5) maps to score 60-80', () => {
    const score = mapACWRToScore(0.5);
    expect(score).toBeGreaterThanOrEqual(60);
    expect(score).toBeLessThanOrEqual(80);
  });

  test('calculateACWR returns calibrating with <28 days', () => {
    const shortHistory = Array(14).fill(300);
    const result = calculateACWR(shortHistory);
    expect(result.status).toBe('calibrating');
    expect(result.acwr).not.toBeNull();
  });

  test('calculateACWR returns insufficient_data with <7 days', () => {
    const result = calculateACWR([300, 300, 300]);
    expect(result.status).toBe('insufficient_data');
    expect(result.acwr).toBeNull();
  });

  test('calculateACWR detects load spike', () => {
    // 21 days at 300, then 7 days at 600 (100% spike)
    const history = [
      ...Array(21).fill(300),
      ...Array(7).fill(600),
    ];
    const result = calculateACWR(history);
    expect(result.acwr).toBeGreaterThan(1.3);
  });
});

// --- Baselines Module Tests ---

describe('Baselines Module', () => {
  test('HRV baseline with 60 days is COMPLETE confidence', () => {
    const data = Array.from({ length: 60 }, () => 50 + Math.random() * 10);
    const baseline = generateHRVBaseline(data, 60);
    expect(baseline.confidence).toBe(CONFIDENCE.COMPLETE);
    expect(baseline.sampleCount).toBe(60);
    expect(baseline.mean).toBeGreaterThan(40);
    expect(baseline.lnMean).toBeGreaterThan(3); // ln(50) ≈ 3.91
  });

  test('HRV baseline with 10 days is CALIBRATING', () => {
    const data = Array.from({ length: 10 }, () => 50);
    const baseline = generateHRVBaseline(data, 60);
    expect(baseline.confidence).toBe(CONFIDENCE.CALIBRATING);
  });

  test('HRV baseline with 0 days is NONE', () => {
    const baseline = generateHRVBaseline([], 60);
    expect(baseline.confidence).toBe(CONFIDENCE.NONE);
  });

  test('Sleep debt calculates correctly', () => {
    // 3 nights: 6h, 5h, 7h with 8h need
    const debt = calculateSleepDebt([6, 5, 7], 8, 3);
    // Deficits: 2h + 3h + 1h = 6h
    expect(debt).toBe(6);
  });

  test('Sleep debt ignores surplus nights', () => {
    // 3 nights: 9h, 5h, 8h with 8h need
    const debt = calculateSleepDebt([9, 5, 8], 8, 3);
    // Only 5h night counts: 3h deficit
    expect(debt).toBe(3);
  });
});

// --- Readiness Score Tests ---

describe('Readiness Score v1', () => {
  test('TEST CASE JUAN: 5h40m sleep, HRV -18%, load +25% → orange/low band', () => {
    const testCase = generateTestCaseJuan();
    const result = calculateReadiness(testCase.today, testCase.history);

    // Score should fall in the expected range (35-58 → "low" band)
    expect(result.score).toBeGreaterThanOrEqual(testCase.expected.scoreRange[0]);
    expect(result.score).toBeLessThanOrEqual(testCase.expected.scoreRange[1]);

    // Band should be "low" (orange) or "risk" (red)
    expect(['low', 'risk']).toContain(result.band);

    // Zone should be orange or red
    expect(['orange', 'red']).toContain(result.zone);

    // Sub-scores should be stored for audit
    expect(result.subScores).toBeDefined();
    expect(result.subScores.hrv.score).toBeDefined();
    expect(result.subScores.sleep.score).toBeDefined();
    expect(result.subScores.acwr.score).toBeDefined();
    expect(result.subScores.rhr.score).toBeDefined();

    // Sleep score should be low (5h40m vs 8h need)
    expect(result.subScores.sleep.score).toBeLessThan(55);

    // HRV should be suppressed (-18%)
    expect(result.subScores.hrv.score).toBeLessThan(60);

    // Recommendations should exist
    expect(result.recommendations.length).toBeGreaterThan(0);
  });

  test('Perfect day → green/ready band', () => {
    const history = {
      rmssdHistory: Array.from({ length: 60 }, () => 55 + Math.random() * 5),
      rhrHistory: Array.from({ length: 30 }, () => 58 + Math.random() * 3),
      sleepHistory: Array.from({ length: 30 }, () => 7.5 + Math.random() * 0.5),
      loadHistory: Array.from({ length: 28 }, () => 300 + Math.random() * 50),
    };

    const today = {
      rmssd: 65, // Above baseline
      rhr: 55,   // Below baseline
      sleepHours: 8.5,
      sleepNeed: 8,
      stress: 25,
      mood: 8,
    };

    const result = calculateReadiness(today, history);
    expect(result.score).toBeGreaterThanOrEqual(70);
    expect(['ready', 'moderate']).toContain(result.band);
  });

  test('Terrible day → red/risk band', () => {
    const history = {
      rmssdHistory: Array.from({ length: 60 }, () => 55 + Math.random() * 5),
      rhrHistory: Array.from({ length: 30 }, () => 58),
      sleepHistory: Array.from({ length: 30 }, () => 7.5),
      loadHistory: [
        ...Array.from({ length: 21 }, () => 300),
        ...Array.from({ length: 7 }, () => 700), // Massive spike
      ],
    };

    const today = {
      rmssd: 30,    // Way below baseline
      rhr: 72,      // Way above baseline
      sleepHours: 4, // Very poor
      sleepNeed: 8,
      stress: 85,
      mood: 2,
    };

    const result = calculateReadiness(today, history);
    expect(result.score).toBeLessThanOrEqual(40);
    expect(['risk', 'low']).toContain(result.band);
  });

  test('Missing components → reduced confidence', () => {
    const result = calculateReadiness(
      { rmssd: 50, rhr: null, sleepHours: null, sleepNeed: 8 },
      { rmssdHistory: Array(5).fill(50), rhrHistory: [], sleepHistory: [], loadHistory: [] }
    );

    expect(result.confidence).not.toBe('complete');
  });

  test('Stress modifier applies penalty', () => {
    const history = {
      rmssdHistory: Array(60).fill(55),
      rhrHistory: Array(30).fill(58),
      sleepHistory: Array(30).fill(8),
      loadHistory: Array(28).fill(300),
    };

    const noStress = calculateReadiness(
      { rmssd: 55, rhr: 58, sleepHours: 8, sleepNeed: 8, stress: 30, mood: 7 },
      history
    );

    const highStress = calculateReadiness(
      { rmssd: 55, rhr: 58, sleepHours: 8, sleepNeed: 8, stress: 90, mood: 2 },
      history
    );

    // High stress should result in lower score
    expect(highStress.score).toBeLessThan(noStress.score);
  });

  test('Recommendations come from weakest component', () => {
    const history = {
      rmssdHistory: Array(60).fill(55),
      rhrHistory: Array(30).fill(58),
      sleepHistory: Array(30).fill(8),
      loadHistory: [
        ...Array(21).fill(300),
        ...Array(7).fill(650), // Big spike
      ],
    };

    const result = calculateReadiness(
      { rmssd: 55, rhr: 58, sleepHours: 8, sleepNeed: 8 },
      history
    );

    // With a load spike, ACWR should be flagged and recommendations should mention it
    const hasLoadRec = result.recommendations.some(
      r => r.en.toLowerCase().includes('load') || r.en.toLowerCase().includes('volume')
    );
    expect(hasLoadRec).toBe(true);
  });
});

// --- Injury Risk (Qualitative) Tests ---

describe('Injury Risk (Qualitative)', () => {
  test('Returns qualitative label, NOT percentage', () => {
    const result = calculateInjuryRisk(Array(28).fill(300));
    expect(result.label).toBeDefined();
    expect(result.label.en).toBeDefined();
    expect(result.label.es).toBeDefined();
    expect(result.factor).toBeDefined();
    // Should NOT have a riskPercent field
    expect(result.riskPercent).toBeUndefined();
  });

  test('Optimal zone with balanced load', () => {
    const result = calculateInjuryRisk(Array(28).fill(350));
    expect(result.risk).toBe('optimal');
  });

  test('High risk with load spike', () => {
    const history = [
      ...Array(21).fill(300),
      ...Array(7).fill(700),
    ];
    const result = calculateInjuryRisk(history);
    expect(['high', 'moderate']).toContain(result.risk);
    expect(result.factor.en).toContain('above');
  });

  test('Includes ACWR ratio', () => {
    const result = calculateInjuryRisk(Array(28).fill(300));
    expect(result.acwr).toBeDefined();
    expect(typeof result.acwr).toBe('number');
  });
});
