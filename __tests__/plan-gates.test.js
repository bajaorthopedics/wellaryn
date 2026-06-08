/**
 * Plan Gates — Unit Tests
 *
 * Tests subscription tier feature restrictions, limits, and the
 * requiredPlan() resolver for the Wellaryn gating system.
 */

import {
  PLAN_FEATURES,
  canAccess,
  getLimit,
  requiredPlan,
} from '@/lib/plan-gates';

// ═══════════════════════════════════════════════════════════════
// canAccess — Boolean feature checks
// ═══════════════════════════════════════════════════════════════

describe('canAccess', () => {
  // ─── Free plan ──────────────────────────────────────────────
  it('free → chat is false', () => {
    expect(canAccess('free', 'chat')).toBe(false);
  });

  it('free → goals is false', () => {
    expect(canAccess('free', 'goals')).toBe(false);
  });

  it('free → export is false', () => {
    expect(canAccess('free', 'export')).toBe(false);
  });

  it('free → reports is false', () => {
    expect(canAccess('free', 'reports')).toBe(false);
  });

  it('free → injuries is false', () => {
    expect(canAccess('free', 'injuries')).toBe(false);
  });

  it('free → analytics is false', () => {
    expect(canAccess('free', 'analytics')).toBe(false);
  });

  // ─── Pro plan ───────────────────────────────────────────────
  it('pro → chat is true', () => {
    expect(canAccess('pro', 'chat')).toBe(true);
  });

  it('pro → goals is true', () => {
    expect(canAccess('pro', 'goals')).toBe(true);
  });

  it('pro → export is true', () => {
    expect(canAccess('pro', 'export')).toBe(true);
  });

  it('pro → reports is true', () => {
    expect(canAccess('pro', 'reports')).toBe(true);
  });

  it('pro → injuries is true', () => {
    expect(canAccess('pro', 'injuries')).toBe(true);
  });

  it('pro → analytics is false', () => {
    expect(canAccess('pro', 'analytics')).toBe(false);
  });

  // ─── Team plan ──────────────────────────────────────────────
  it('team → analytics is true', () => {
    expect(canAccess('team', 'analytics')).toBe(true);
  });

  it('team → chat is true', () => {
    expect(canAccess('team', 'chat')).toBe(true);
  });

  it('team → all boolean features are true', () => {
    const boolFeatures = ['chat', 'goals', 'export', 'reports', 'injuries', 'analytics'];
    for (const feat of boolFeatures) {
      expect(canAccess('team', feat)).toBe(true);
    }
  });

  // ─── Edge cases ─────────────────────────────────────────────
  it('null plan defaults to free', () => {
    expect(canAccess(null, 'chat')).toBe(false);
  });

  it('undefined plan defaults to free', () => {
    expect(canAccess(undefined, 'chat')).toBe(false);
  });

  it('unknown feature returns false (via nullish coalescing)', () => {
    expect(canAccess('pro', 'nonexistent_feature')).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════
// getLimit — Numeric feature limits
// ═══════════════════════════════════════════════════════════════

describe('getLimit', () => {
  it('free → historyDays is 7', () => {
    expect(getLimit('free', 'historyDays')).toBe(7);
  });

  it('pro → historyDays is 365', () => {
    expect(getLimit('pro', 'historyDays')).toBe(365);
  });

  it('team → historyDays is 365', () => {
    expect(getLimit('team', 'historyDays')).toBe(365);
  });

  it('free → maxWearables is 1', () => {
    expect(getLimit('free', 'maxWearables')).toBe(1);
  });

  it('pro → maxWearables is 5', () => {
    expect(getLimit('pro', 'maxWearables')).toBe(5);
  });

  it('team → maxAthletes is 10', () => {
    expect(getLimit('team', 'maxAthletes')).toBe(10);
  });

  it('free → maxAthletes is 0', () => {
    expect(getLimit('free', 'maxAthletes')).toBe(0);
  });

  it('pro → maxAthletes is 0', () => {
    expect(getLimit('pro', 'maxAthletes')).toBe(0);
  });

  it('null plan defaults to free', () => {
    expect(getLimit(null, 'historyDays')).toBe(7);
  });

  it('undefined plan defaults to free', () => {
    expect(getLimit(undefined, 'maxWearables')).toBe(1);
  });
});

// ═══════════════════════════════════════════════════════════════
// requiredPlan — Minimum plan resolver
// ═══════════════════════════════════════════════════════════════

describe('requiredPlan', () => {
  it('chat requires pro', () => {
    expect(requiredPlan('chat')).toBe('pro');
  });

  it('goals requires pro', () => {
    expect(requiredPlan('goals')).toBe('pro');
  });

  it('export requires pro', () => {
    expect(requiredPlan('export')).toBe('pro');
  });

  it('reports requires pro', () => {
    expect(requiredPlan('reports')).toBe('pro');
  });

  it('injuries requires pro', () => {
    expect(requiredPlan('injuries')).toBe('pro');
  });

  it('analytics requires team', () => {
    expect(requiredPlan('analytics')).toBe('team');
  });

  it('unknown feature returns team (fallback)', () => {
    expect(requiredPlan('some_future_feature')).toBe('team');
  });
});

// ═══════════════════════════════════════════════════════════════
// PLAN_FEATURES structure integrity
// ═══════════════════════════════════════════════════════════════

describe('PLAN_FEATURES structure', () => {
  it('has all three tiers', () => {
    expect(PLAN_FEATURES).toHaveProperty('free');
    expect(PLAN_FEATURES).toHaveProperty('pro');
    expect(PLAN_FEATURES).toHaveProperty('team');
  });

  it('all tiers have the same keys', () => {
    const freeKeys = Object.keys(PLAN_FEATURES.free).sort();
    const proKeys = Object.keys(PLAN_FEATURES.pro).sort();
    const teamKeys = Object.keys(PLAN_FEATURES.team).sort();
    expect(freeKeys).toEqual(proKeys);
    expect(proKeys).toEqual(teamKeys);
  });

  it('team tier is always >= pro tier for numeric limits', () => {
    const numericKeys = ['historyDays', 'maxWearables', 'maxAthletes'];
    for (const key of numericKeys) {
      expect(PLAN_FEATURES.team[key]).toBeGreaterThanOrEqual(PLAN_FEATURES.pro[key]);
    }
  });

  it('pro tier is always >= free tier for numeric limits', () => {
    const numericKeys = ['historyDays', 'maxWearables', 'maxAthletes'];
    for (const key of numericKeys) {
      expect(PLAN_FEATURES.pro[key]).toBeGreaterThanOrEqual(PLAN_FEATURES.free[key]);
    }
  });

  it('no feature is available on free but not on pro', () => {
    const boolFeatures = ['chat', 'goals', 'export', 'reports', 'injuries', 'analytics'];
    for (const feat of boolFeatures) {
      if (PLAN_FEATURES.free[feat]) {
        expect(PLAN_FEATURES.pro[feat]).toBe(true);
      }
    }
  });

  it('no feature is available on pro but not on team', () => {
    const boolFeatures = ['chat', 'goals', 'export', 'reports', 'injuries', 'analytics'];
    for (const feat of boolFeatures) {
      if (PLAN_FEATURES.pro[feat]) {
        expect(PLAN_FEATURES.team[feat]).toBe(true);
      }
    }
  });
});
