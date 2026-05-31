/**
 * Wellaryn — Mock Data Generator
 * Generates realistic fitness data for the MVP demo
 */

// Generate a random number within a range
function rand(min, max) {
  return Math.random() * (max - min) + min;
}

// Generate realistic HRV data (rMSSD in ms)
function generateHRVHistory(days = 30) {
  const baseline = rand(40, 70); // Individual baseline
  const data = [];
  const now = new Date();

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);

    // Add realistic variation (±20%) with occasional dips
    const dayOfWeek = date.getDay();
    const weekendBoost = (dayOfWeek === 0 || dayOfWeek === 6) ? 5 : 0;
    const variation = rand(-0.2, 0.2) * baseline;
    const heavyTrainingDip = Math.random() > 0.7 ? -rand(5, 15) : 0;

    const rmssd = Math.max(20, baseline + variation + weekendBoost + heavyTrainingDip);

    data.push({
      date: date.toISOString().split('T')[0],
      rmssd: Math.round(rmssd * 10) / 10,
      lnRmssd: Math.round(Math.log(rmssd) * 100) / 100,
    });
  }

  return data;
}

// Generate resting heart rate history
function generateRHRHistory(days = 30) {
  const baseline = rand(52, 68);
  const data = [];
  const now = new Date();

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);

    const variation = rand(-3, 3);
    const stressBump = Math.random() > 0.8 ? rand(2, 6) : 0;

    data.push({
      date: date.toISOString().split('T')[0],
      rhr: Math.round(baseline + variation + stressBump),
    });
  }

  return data;
}

// Generate sleep data
function generateSleepHistory(days = 30) {
  const data = [];
  const now = new Date();

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);

    const total = rand(5, 9);
    const deep = total * rand(0.15, 0.25);
    const rem = total * rand(0.18, 0.28);
    const light = total - deep - rem;

    data.push({
      date: date.toISOString().split('T')[0],
      total: Math.round(total * 10) / 10,
      deep: Math.round(deep * 10) / 10,
      rem: Math.round(rem * 10) / 10,
      light: Math.round(light * 10) / 10,
      quality: Math.round((deep + rem) / total * 100),
    });
  }

  return data;
}

// Generate training load history
function generateTrainingHistory(days = 30) {
  const data = [];
  const now = new Date();

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);

    const dayOfWeek = date.getDay();
    const isRestDay = dayOfWeek === 0 || (Math.random() > 0.7);

    const load = isRestDay ? rand(0, 50) : rand(100, 500);
    const type = isRestDay
      ? 'rest'
      : ['strength', 'cardio', 'hiit', 'sport', 'mobility'][Math.floor(rand(0, 5))];

    data.push({
      date: date.toISOString().split('T')[0],
      load: Math.round(load),
      type,
      duration: isRestDay ? 0 : Math.round(rand(30, 90)),
    });
  }

  return data;
}

// Generate a complete user profile with all data
export function generateMockUser() {
  const hrvHistory = generateHRVHistory(30);
  const rhrHistory = generateRHRHistory(30);
  const sleepHistory = generateSleepHistory(30);
  const trainingHistory = generateTrainingHistory(30);

  return {
    user: {
      id: 'demo-user-001',
      displayName: 'Juan Martínez',
      email: 'juan@wellaryn.com',
      role: 'athlete',
      sport: 'CrossFit',
      age: 28,
      avatar: null,
      settings: {
        sleepNeed: 8,
        units: 'metric',
      },
      createdAt: new Date().toISOString(),
    },
    hrvHistory,
    rhrHistory,
    sleepHistory,
    trainingHistory,
    today: {
      hrv: hrvHistory[hrvHistory.length - 1],
      rhr: rhrHistory[rhrHistory.length - 1],
      sleep: sleepHistory[sleepHistory.length - 1],
      training: trainingHistory[trainingHistory.length - 1],
      steps: Math.round(rand(3000, 15000)),
      calories: Math.round(rand(1800, 3200)),
      stress: Math.round(rand(20, 80)),
      mood: Math.round(rand(4, 9)),
      respiratoryRate: Math.round(rand(12, 18) * 10) / 10,
    },
  };
}

// Generate mock data for different scenarios
export function generateScenarios() {
  return {
    recovered: {
      label: 'Recovered',
      labelEs: 'Recuperado',
      hrv: { rmssd: 68.5, lnRmssd: 4.23 },
      rhr: 52,
      sleep: { total: 8.2, deep: 2.1, rem: 2.0, light: 4.1, quality: 85 },
      training: { load: 180, type: 'cardio', duration: 45 },
      steps: 12400,
      calories: 2650,
      stress: 25,
      mood: 8,
    },
    moderate: {
      label: 'Moderate',
      labelEs: 'Moderado',
      hrv: { rmssd: 45.2, lnRmssd: 3.81 },
      rhr: 62,
      sleep: { total: 6.5, deep: 1.4, rem: 1.6, light: 3.5, quality: 62 },
      training: { load: 320, type: 'strength', duration: 65 },
      steps: 8500,
      calories: 2400,
      stress: 55,
      mood: 6,
    },
    strained: {
      label: 'Strained',
      labelEs: 'Agotado',
      hrv: { rmssd: 28.1, lnRmssd: 3.34 },
      rhr: 71,
      sleep: { total: 5.1, deep: 0.8, rem: 1.0, light: 3.3, quality: 42 },
      training: { load: 450, type: 'hiit', duration: 80 },
      steps: 5200,
      calories: 2100,
      stress: 78,
      mood: 4,
    },
  };
}
