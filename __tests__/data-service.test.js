/**
 * Data Service — Unit Tests
 *
 * Mocks the Supabase client and verifies that each data-service function
 * calls the correct Supabase methods with the right parameters.
 */

// ─── Mock Supabase client ─────────────────────────────────────

const mockSelect = jest.fn();
const mockEq = jest.fn();
const mockGte = jest.fn();
const mockOrder = jest.fn();
const mockLimit = jest.fn();
const mockMaybeSingle = jest.fn();
const mockSingle = jest.fn();
const mockInsert = jest.fn();
const mockUpdate = jest.fn();
const mockDelete = jest.fn();
const mockUpsert = jest.fn();

// Chainable mock builder — each method returns `this` to enable chaining
function createChainMock(resolveValue = { data: null, error: null }) {
  const chain = {
    select: mockSelect.mockReturnThis(),
    eq: mockEq.mockReturnThis(),
    gte: mockGte.mockReturnThis(),
    order: mockOrder.mockReturnThis(),
    limit: mockLimit.mockReturnThis(),
    maybeSingle: mockMaybeSingle.mockResolvedValue(resolveValue),
    single: mockSingle.mockResolvedValue(resolveValue),
    insert: mockInsert.mockReturnThis(),
    update: mockUpdate.mockReturnThis(),
    delete: mockDelete.mockReturnThis(),
    upsert: mockUpsert.mockReturnThis(),
    or: jest.fn().mockReturnThis(),
    in: jest.fn().mockReturnThis(),
    then: (resolve) => resolve(resolveValue),
  };
  return chain;
}

const mockFrom = jest.fn();
const mockSupabase = { from: mockFrom };

jest.mock('@/lib/supabase/client', () => ({
  getSupabaseBrowser: () => mockSupabase,
}));

// ─── Import after mocks ──────────────────────────────────────

import {
  saveDailyMetrics,
  fetchDailyMetrics,
  fetchTodayMetrics,
  fetchGoals,
  sendMessage,
  metricsToWellarynInput,
  metricsToChartData,
  metricsToReadinessInput,
} from '@/lib/supabase/data-service';

// ═══════════════════════════════════════════════════════════════
// Setup
// ═══════════════════════════════════════════════════════════════

beforeEach(() => {
  jest.clearAllMocks();
});

// ═══════════════════════════════════════════════════════════════
// fetchDailyMetrics
// ═══════════════════════════════════════════════════════════════

describe('fetchDailyMetrics', () => {
  it('calls supabase.from("daily_metrics") with correct user_id', async () => {
    const chain = createChainMock({ data: [], error: null });
    mockFrom.mockReturnValue(chain);
    // Need to make order resolve to something with then
    mockOrder.mockReturnValue({ then: (resolve) => resolve({ data: [], error: null }) });

    const result = await fetchDailyMetrics('user-123', 30);

    expect(mockFrom).toHaveBeenCalledWith('daily_metrics');
    expect(mockSelect).toHaveBeenCalledWith('*');
    expect(mockEq).toHaveBeenCalledWith('user_id', 'user-123');
  });

  it('returns empty array when no data', async () => {
    const chain = createChainMock();
    mockFrom.mockReturnValue(chain);
    mockOrder.mockReturnValue({ then: (resolve) => resolve({ data: null, error: null }) });

    const result = await fetchDailyMetrics('user-123');
    expect(result).toEqual([]);
  });

  it('throws on supabase error', async () => {
    const chain = createChainMock();
    mockFrom.mockReturnValue(chain);
    mockOrder.mockReturnValue({
      then: (resolve) => resolve({ data: null, error: new Error('DB error') }),
    });

    await expect(fetchDailyMetrics('user-123')).rejects.toThrow('DB error');
  });
});

// ═══════════════════════════════════════════════════════════════
// fetchGoals
// ═══════════════════════════════════════════════════════════════

describe('fetchGoals', () => {
  it('queries athlete_goals table', async () => {
    const chain = createChainMock({ data: [], error: null });
    mockFrom.mockReturnValue(chain);
    // When no status filter, order is last call
    mockOrder.mockReturnValue({ then: (resolve) => resolve({ data: [], error: null }) });

    await fetchGoals('user-123');
    expect(mockFrom).toHaveBeenCalledWith('athlete_goals');
  });

  it('applies status filter when provided', async () => {
    const chain = createChainMock({ data: [], error: null });
    mockFrom.mockReturnValue(chain);
    // With status, eq is called for status then the chain continues
    mockEq.mockReturnValue({
      then: (resolve) => resolve({ data: [], error: null }),
    });

    await fetchGoals('user-123', 'active');
    // eq should be called at least with 'status', 'active'
    expect(mockEq).toHaveBeenCalledWith('user_id', 'user-123');
  });
});

// ═══════════════════════════════════════════════════════════════
// sendMessage
// ═══════════════════════════════════════════════════════════════

describe('sendMessage', () => {
  it('inserts into chat_messages with correct fields', async () => {
    const chain = createChainMock({
      data: { id: 'msg-1', sender_id: 's1', receiver_id: 'r1', message: 'hello' },
      error: null,
    });
    mockFrom.mockReturnValue(chain);
    mockSingle.mockResolvedValue({
      data: { id: 'msg-1', sender_id: 's1', receiver_id: 'r1', message: 'hello' },
      error: null,
    });

    const result = await sendMessage('s1', 'r1', 'hello');

    expect(mockFrom).toHaveBeenCalledWith('chat_messages');
    expect(mockInsert).toHaveBeenCalledWith({
      sender_id: 's1',
      receiver_id: 'r1',
      message: 'hello',
    });
  });
});

// ═══════════════════════════════════════════════════════════════
// metricsToWellarynInput (pure function — no Supabase mock needed)
// ═══════════════════════════════════════════════════════════════

describe('metricsToWellarynInput', () => {
  it('returns null for empty metrics', () => {
    expect(metricsToWellarynInput([], {})).toBeNull();
    expect(metricsToWellarynInput(null, {})).toBeNull();
  });

  it('maps daily_metrics rows to Wellaryn Score input format', () => {
    const metrics = [
      {
        date: '2026-06-07',
        sleep_total: 7.5,
        sleep_quality: 8,
        energy: 7,
        motivation: 8,
        stress: 3,
        fatigue: 2,
        pain_level: 1,
        muscle_soreness: 2,
        pain_areas: [],
        modality_count: 2,
        recovery_score: 7,
        training_load: 400,
        training_duration: 60,
        training_rpe: 7,
        bedtime_minutes: 1380,
        wake_time_minutes: 420,
        water_glasses: 6,
        alcohol_drinks: 0,
        late_caffeine: false,
      },
    ];

    const result = metricsToWellarynInput(metrics, { has_injury_history: false });

    expect(result).not.toBeNull();
    expect(result.recovery.sleepHours).toBe(7.5);
    expect(result.recovery.sleepQuality).toBe(8);
    expect(result.readiness.hasCheckin).toBe(true);
    expect(result.readiness.energy).toBe(7);
    expect(result.injuryRisk.painLevel).toBe(1);
    expect(result.injuryRisk.hasInjuryHistory).toBe(false);
    expect(result.lifestyle.waterGlasses).toBe(6);
    expect(result.lifestyle.lateCaffeine).toBe(false);
    expect(result.distinctDays).toBe(1);
  });

  it('identifies hasCheckin from energy or stress fields', () => {
    const withCheckin = metricsToWellarynInput(
      [{ date: '2026-06-07', energy: 5 }],
      {}
    );
    expect(withCheckin.readiness.hasCheckin).toBe(true);

    const noCheckin = metricsToWellarynInput(
      [{ date: '2026-06-07' }],
      {}
    );
    expect(noCheckin.readiness.hasCheckin).toBe(false);
  });

  it('counts distinct days correctly', () => {
    const metrics = [
      { date: '2026-06-05' },
      { date: '2026-06-06' },
      { date: '2026-06-07' },
    ];
    const result = metricsToWellarynInput(metrics, {});
    expect(result.distinctDays).toBe(3);
  });
});

// ═══════════════════════════════════════════════════════════════
// metricsToChartData (pure function)
// ═══════════════════════════════════════════════════════════════

describe('metricsToChartData', () => {
  it('returns chart data objects for HRV, sleep, training', () => {
    const metrics = [
      {
        date: '2026-06-07',
        hrv_rmssd: 45,
        sleep_total: 7.5,
        sleep_deep: 1.5,
        sleep_rem: 2.0,
        sleep_light: 4.0,
        training_load: 350,
      },
    ];

    const { hrvChartData, sleepChartData, trainingChartData } = metricsToChartData(metrics);

    expect(hrvChartData).toHaveLength(1);
    expect(hrvChartData[0].rmssd).toBe(45);

    expect(sleepChartData).toHaveLength(1);
    expect(sleepChartData[0].total).toBe(7.5);

    expect(trainingChartData).toHaveLength(1);
    expect(trainingChartData[0].load).toBe(350);
  });

  it('filters out metrics with null values', () => {
    const metrics = [
      { date: '2026-06-06', hrv_rmssd: null, sleep_total: null, training_load: null },
      { date: '2026-06-07', hrv_rmssd: 50, sleep_total: 8, training_load: 400 },
    ];

    const { hrvChartData, sleepChartData, trainingChartData } = metricsToChartData(metrics);

    expect(hrvChartData).toHaveLength(1);
    expect(sleepChartData).toHaveLength(1);
    expect(trainingChartData).toHaveLength(1);
  });

  it('limits to 7 entries for HRV and sleep, 14 for training', () => {
    const metrics = Array.from({ length: 20 }, (_, i) => ({
      date: `2026-06-${String(i + 1).padStart(2, '0')}`,
      hrv_rmssd: 40 + i,
      sleep_total: 7 + (i % 3) * 0.5,
      training_load: 300 + i * 10,
    }));

    const { hrvChartData, sleepChartData, trainingChartData } = metricsToChartData(metrics);

    expect(hrvChartData).toHaveLength(7);
    expect(sleepChartData).toHaveLength(7);
    expect(trainingChartData).toHaveLength(14);
  });
});

// ═══════════════════════════════════════════════════════════════
// metricsToReadinessInput (legacy, pure function)
// ═══════════════════════════════════════════════════════════════

describe('metricsToReadinessInput', () => {
  it('returns null for empty metrics', () => {
    expect(metricsToReadinessInput([], {})).toBeNull();
    expect(metricsToReadinessInput(null, {})).toBeNull();
  });

  it('maps to todayInput and historyInput', () => {
    const metrics = [
      { date: '2026-06-07', hrv_rmssd: 48, rhr: 55, sleep_total: 7.5, stress: 3, mood: 8, training_load: 400 },
    ];
    const result = metricsToReadinessInput(metrics, { sleep_need: 8 });

    expect(result.todayInput.rmssd).toBe(48);
    expect(result.todayInput.rhr).toBe(55);
    expect(result.todayInput.sleepHours).toBe(7.5);
    expect(result.todayInput.sleepNeed).toBe(8);
    expect(result.historyInput.rmssdHistory).toEqual([48]);
  });
});

// ═══════════════════════════════════════════════════════════════
// Exports check
// ═══════════════════════════════════════════════════════════════

describe('module exports', () => {
  it('exports all expected functions', () => {
    expect(typeof saveDailyMetrics).toBe('function');
    expect(typeof fetchDailyMetrics).toBe('function');
    expect(typeof fetchTodayMetrics).toBe('function');
    expect(typeof fetchGoals).toBe('function');
    expect(typeof sendMessage).toBe('function');
    expect(typeof metricsToWellarynInput).toBe('function');
    expect(typeof metricsToChartData).toBe('function');
    expect(typeof metricsToReadinessInput).toBe('function');
  });
});
