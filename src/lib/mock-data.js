/**
 * Wellaryn — Mock Data Generator (v2)
 *
 * Generates 60+ days of realistic biometric history for baseline calculation.
 * Includes varied scenarios: rest weeks, load spikes, poor sleep nights.
 *
 * For development and demo purposes only.
 */

// --- Utilities ---

function randomBetween(min, max) {
  return min + Math.random() * (max - min);
}

function randomInt(min, max) {
  return Math.floor(randomBetween(min, max + 1));
}

function gaussianRandom(mean, std) {
  // Box-Muller transform for normally distributed values
  const u1 = Math.random();
  const u2 = Math.random();
  const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  return mean + z * std;
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

// --- History Generators ---

/**
 * Generate N days of HRV history with realistic variation
 * Includes natural day-to-day fluctuation + occasional dips (poor sleep, illness)
 */
function generateHRVHistory(days, baseRMSSD = 52) {
  const history = [];
  const today = new Date();

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);

    let rmssd = gaussianRandom(baseRMSSD, baseRMSSD * 0.15);

    // Simulate occasional bad days (poor sleep, stress)
    if (Math.random() < 0.12) {
      rmssd *= randomBetween(0.65, 0.80); // HRV dip
    }

    // Simulate occasional great days (rest day, good sleep)
    if (Math.random() < 0.08) {
      rmssd *= randomBetween(1.15, 1.30);
    }

    // Weekly pattern: slightly lower mid-week, higher on weekends
    const dow = date.getDay();
    if (dow === 0 || dow === 6) rmssd *= 1.05;
    if (dow === 3 || dow === 4) rmssd *= 0.95;

    history.push({
      date: date.toISOString().split('T')[0],
      rmssd: Math.round(clamp(rmssd, 15, 120) * 10) / 10,
    });
  }

  return history;
}

/**
 * Generate N days of RHR history
 */
function generateRHRHistory(days, baseRHR = 58) {
  const history = [];
  const today = new Date();

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);

    let rhr = gaussianRandom(baseRHR, 3);

    // Occasional elevated RHR (illness, heavy training day before)
    if (Math.random() < 0.08) {
      rhr += randomBetween(4, 10);
    }

    history.push({
      date: date.toISOString().split('T')[0],
      rhr: Math.round(clamp(rhr, 40, 90)),
    });
  }

  return history;
}

/**
 * Generate N days of sleep history with realistic patterns
 */
function generateSleepHistory(days, baseSleep = 7.2) {
  const history = [];
  const today = new Date();

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);

    let total = gaussianRandom(baseSleep, 0.8);

    // Weekend: tend to sleep more
    const dow = date.getDay();
    if (dow === 0 || dow === 6) total += randomBetween(0.3, 1.0);

    // Occasional bad night
    if (Math.random() < 0.10) {
      total = randomBetween(4.5, 5.5);
    }

    total = clamp(total, 3, 10);

    // Sleep phases (approximate proportions)
    const deep = total * randomBetween(0.13, 0.23);
    const rem = total * randomBetween(0.18, 0.25);
    const light = total - deep - rem;
    const efficiency = clamp(randomBetween(0.78, 0.95), 0, 1);

    history.push({
      date: date.toISOString().split('T')[0],
      total: Math.round(total * 100) / 100,
      deep: Math.round(deep * 100) / 100,
      rem: Math.round(rem * 100) / 100,
      light: Math.round(light * 100) / 100,
      efficiency: Math.round(efficiency * 100) / 100,
    });
  }

  return history;
}

/**
 * Generate N days of training load history
 * Uses session-RPE × duration (arbitrary units)
 * Includes a load spike scenario and a rest week
 */
function generateTrainingHistory(days) {
  const history = [];
  const today = new Date();

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);

    const dow = date.getDay();
    let load;

    // Rest day pattern: ~20% chance or Sundays
    if (dow === 0 || Math.random() < 0.15) {
      load = randomBetween(0, 100); // Light or rest
    }
    // Simulate a load spike in the last 5 days (~40% higher than normal)
    else if (i <= 5 && i >= 2 && Math.random() < 0.6) {
      load = randomBetween(450, 700); // Spike
    }
    // Normal training day
    else {
      load = randomBetween(200, 500);
    }

    // Simulate a deload/rest week (days 20-26)
    if (i >= 20 && i <= 26) {
      load *= 0.5;
    }

    history.push({
      date: date.toISOString().split('T')[0],
      load: Math.round(clamp(load, 0, 900)),
    });
  }

  return history;
}

// --- Main Generator ---

/**
 * Generate a complete mock user with 60+ days of history
 *
 * @returns {Object} Full user data including today's metrics and history
 */
export function generateMockUser() {
  const DAYS = 60;

  const hrvHistory = generateHRVHistory(DAYS, 52);
  const rhrHistory = generateRHRHistory(DAYS, 58);
  const sleepHistory = generateSleepHistory(DAYS, 7.2);
  const trainingHistory = generateTrainingHistory(DAYS);

  const todayHRV = hrvHistory[hrvHistory.length - 1];
  const todayRHR = rhrHistory[rhrHistory.length - 1];
  const todaySleep = sleepHistory[sleepHistory.length - 1];
  const todayTraining = trainingHistory[trainingHistory.length - 1];

  const today = {
    hrv: { rmssd: todayHRV.rmssd },
    rhr: { rhr: todayRHR.rhr },
    sleep: {
      total: todaySleep.total,
      deep: todaySleep.deep,
      rem: todaySleep.rem,
      light: todaySleep.light,
      efficiency: todaySleep.efficiency,
    },
    training: { load: todayTraining.load },
    steps: randomInt(4000, 14000),
    calories: randomInt(1800, 3200),
    stress: randomInt(20, 80),
    mood: randomInt(3, 9),
  };

  const user = {
    id: 'usr_demo_001',
    displayName: 'Juan Martínez',
    email: 'juan@wellaryn.com',
    sport: 'Running',
    role: 'athlete',
    settings: {
      sleepNeed: 8,
      age: 34,
      weight: 78,
      height: 178,
    },
    onboardedAt: new Date(Date.now() - DAYS * 86400000).toISOString(),
  };

  return {
    user,
    today,
    hrvHistory: hrvHistory.map(h => h.rmssd),         // Flat array for baselines
    rhrHistory: rhrHistory.map(h => h.rhr),             // Flat array for baselines
    sleepHistory: sleepHistory.map(h => h.total),       // Flat array for baselines
    loadHistory: trainingHistory.map(h => h.load),      // Flat array for ACWR
    // Detailed history for charts
    hrvChartData: hrvHistory,
    rhrChartData: rhrHistory,
    sleepChartData: sleepHistory,
    trainingChartData: trainingHistory,
  };
}

/**
 * Generate the "Juan test case" from the spec
 * 5h40m sleep, HRV -18% vs baseline, load +25% → should be orange/red band
 */
export function generateTestCaseJuan() {
  // Build 60 days of "normal" history
  const baseRMSSD = 52;
  const rmssdHistory = Array.from({ length: 60 }, () =>
    clamp(gaussianRandom(baseRMSSD, 5), 30, 75)
  );

  const rhrHistory = Array.from({ length: 60 }, () =>
    Math.round(clamp(gaussianRandom(58, 3), 48, 70))
  );

  const sleepHistory = Array.from({ length: 60 }, () =>
    clamp(gaussianRandom(7.5, 0.5), 6, 9)
  );

  // Normal chronic load ~350, then spike last 7 days to ~440 (+25%)
  const loadHistory = [
    ...Array.from({ length: 53 }, () => Math.round(clamp(gaussianRandom(350, 50), 100, 500))),
    ...Array.from({ length: 7 }, () => Math.round(clamp(gaussianRandom(440, 40), 300, 600))),
  ];

  // Today: bad day
  const todayRMSSD = baseRMSSD * 0.82; // -18% vs baseline
  const todaySleep = 5.67; // 5h40m
  const todayRHR = 62; // Slightly elevated

  return {
    today: {
      rmssd: Math.round(todayRMSSD * 10) / 10,
      rhr: todayRHR,
      sleepHours: todaySleep,
      sleepNeed: 8,
      stress: 55,
      mood: 5,
    },
    history: {
      rmssdHistory,
      rhrHistory,
      sleepHistory,
      loadHistory,
    },
    expected: {
      band: 'low', // Orange band (40-59)
      scoreRange: [35, 58], // Should fall in this range
    },
  };
}
