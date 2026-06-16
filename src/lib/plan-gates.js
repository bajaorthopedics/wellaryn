/**
 * Wellaryn — Plan Gates
 * Feature restrictions per subscription tier
 */

export const PLAN_FEATURES = {
  free: {
    historyDays: 7,
    maxWearables: 1,
    chat: false,
    goals: false,
    export: false,
    reports: false,
    injuries: false,
    maxAthletes: 0,
    analytics: false,
  },
  pro: {
    historyDays: 365,
    maxWearables: 5,
    chat: true,
    goals: true,
    export: true,
    reports: true,
    injuries: true,
    maxAthletes: 0,
    analytics: false,
  },
  team: {
    historyDays: 365,
    maxWearables: 5,
    chat: true,
    goals: true,
    export: true,
    reports: true,
    injuries: true,
    maxAthletes: 10,
    analytics: true,
  },
};

/**
 * Check if a plan has access to a boolean feature
 * @param {string} plan - 'free' | 'pro' | 'team'
 * @param {string} feature - Feature key from PLAN_FEATURES
 * @returns {boolean}
 */
export function canAccess(plan, feature, role) {
  // Admin bypasses all plan restrictions
  if (role === 'admin') return true;
  return PLAN_FEATURES[plan || 'free'][feature] ?? false;
}

/**
 * Get the numeric limit for a feature
 * @param {string} plan - 'free' | 'pro' | 'team'
 * @param {string} feature - Feature key from PLAN_FEATURES
 * @returns {*}
 */
export function getLimit(plan, feature, role) {
  // Admin gets team-level limits
  if (role === 'admin') return PLAN_FEATURES.team[feature];
  return PLAN_FEATURES[plan || 'free'][feature];
}

/**
 * Get the minimum plan required for a feature
 * @param {string} feature - Feature key
 * @returns {'free' | 'pro' | 'team'}
 */
export function requiredPlan(feature) {
  if (PLAN_FEATURES.free[feature]) return 'free';
  if (PLAN_FEATURES.pro[feature]) return 'pro';
  return 'team';
}
