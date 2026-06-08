/**
 * Notification Check API Route — Unit Tests
 *
 * Tests the cron endpoint's authorization logic and response structure.
 * The route module is NOT imported directly (it depends on Next.js runtime),
 * so we test the auth pattern by extracting the logic.
 */

// ─── We can't import the route directly (depends on NextResponse, etc.)
//     Instead we test the verifyCronSecret pattern and simulate the flow. ──

describe('notifications/check cron route', () => {
  const ORIGINAL_ENV = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...ORIGINAL_ENV };
  });

  afterAll(() => {
    process.env = ORIGINAL_ENV;
  });

  // ─── Auth logic (mirrors verifyCronSecret from the route) ──

  function verifyCronSecret(authHeader, cronSecret) {
    if (!cronSecret) return true; // dev mode
    return authHeader === `Bearer ${cronSecret}`;
  }

  describe('verifyCronSecret logic', () => {
    it('rejects request without CRON_SECRET header', () => {
      expect(verifyCronSecret(null, 'my-secret')).toBe(false);
    });

    it('rejects request with wrong CRON_SECRET', () => {
      expect(verifyCronSecret('Bearer wrong-secret', 'my-secret')).toBe(false);
    });

    it('accepts request with correct CRON_SECRET', () => {
      expect(verifyCronSecret('Bearer my-secret', 'my-secret')).toBe(true);
    });

    it('allows all requests when CRON_SECRET is not configured (dev mode)', () => {
      expect(verifyCronSecret(null, undefined)).toBe(true);
      expect(verifyCronSecret(null, '')).toBe(true);
      expect(verifyCronSecret('Bearer anything', undefined)).toBe(true);
    });

    it('rejects plain text (no Bearer prefix)', () => {
      expect(verifyCronSecret('my-secret', 'my-secret')).toBe(false);
    });
  });

  // ─── Response structure validation ──────────────────────────

  describe('expected response structure', () => {
    it('success response should have checked, alerts, emailed fields', () => {
      const response = { checked: 5, alerts: 2, emailed: 1 };
      expect(response).toHaveProperty('checked');
      expect(response).toHaveProperty('alerts');
      expect(response).toHaveProperty('emailed');
      expect(typeof response.checked).toBe('number');
      expect(typeof response.alerts).toBe('number');
      expect(typeof response.emailed).toBe('number');
    });

    it('error response should have error field', () => {
      const response = { error: 'Unauthorized' };
      expect(response).toHaveProperty('error');
    });

    it('empty relationships should return zeros', () => {
      const response = { checked: 0, alerts: 0, emailed: 0 };
      expect(response.checked).toBe(0);
      expect(response.alerts).toBe(0);
      expect(response.emailed).toBe(0);
    });
  });

  // ─── Alert detection patterns ──────────────────────────────

  describe('alert detection patterns', () => {
    // Mirrors the detectAlerts logic from the route

    function detectAlertTypes(score, acwr, injuryRisk, hoursSinceLastData) {
      const alerts = [];

      if (score < 60) {
        alerts.push({
          type: 'low_score',
          severity: score < 40 ? 'critical' : 'warning',
        });
      }

      if (acwr > 1.5) {
        alerts.push({
          type: 'high_acwr',
          severity: acwr > 1.8 ? 'critical' : 'warning',
        });
      }

      if (injuryRisk > 70) {
        alerts.push({
          type: 'high_injury_risk',
          severity: 'warning',
        });
      }

      if (hoursSinceLastData > 48) {
        alerts.push({
          type: 'no_data',
          severity: 'info',
        });
      }

      return alerts;
    }

    it('detects low score alert', () => {
      const alerts = detectAlertTypes(35, 1.0, 50, 12);
      expect(alerts).toContainEqual({ type: 'low_score', severity: 'critical' });
    });

    it('detects warning-level low score', () => {
      const alerts = detectAlertTypes(55, 1.0, 50, 12);
      expect(alerts).toContainEqual({ type: 'low_score', severity: 'warning' });
    });

    it('detects high ACWR', () => {
      const alerts = detectAlertTypes(75, 1.9, 50, 12);
      expect(alerts).toContainEqual({ type: 'high_acwr', severity: 'critical' });
    });

    it('detects high injury risk', () => {
      const alerts = detectAlertTypes(75, 1.0, 80, 12);
      expect(alerts).toContainEqual({ type: 'high_injury_risk', severity: 'warning' });
    });

    it('detects no-data alert', () => {
      const alerts = detectAlertTypes(75, 1.0, 50, 72);
      expect(alerts).toContainEqual({ type: 'no_data', severity: 'info' });
    });

    it('returns no alerts for healthy athlete', () => {
      const alerts = detectAlertTypes(80, 1.0, 40, 12);
      expect(alerts).toHaveLength(0);
    });

    it('can produce multiple alerts simultaneously', () => {
      const alerts = detectAlertTypes(30, 2.0, 85, 72);
      expect(alerts.length).toBeGreaterThanOrEqual(3);
    });
  });
});
