// ─── Wellaryn Transactional Email Templates ──────────────────
//
// Each template function returns { subject, html } and accepts
// dynamic data. All templates use the Wellaryn dark theme:
//   bg: #0a0a0f, card: #13131a, accent: #00C896, font: Inter
//
// Usage:
//   import { welcomeEmail } from '@/lib/email-templates';
//   const { subject, html } = welcomeEmail({ name: 'Juan' });
// ──────────────────────────────────────────────────────────────

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://wellaryn.com';

// ─── Shared layout wrapper ───────────────────────────────────

function emailWrapper(content, preheader = '') {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="dark">
  <meta name="supported-color-schemes" content="dark">
  <!--[if !mso]><!-->
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap" rel="stylesheet">
  <!--<![endif]-->
  <title>Wellaryn</title>
  <style>
    body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    body { margin: 0; padding: 0; width: 100% !important; }
    img { border: 0; outline: none; text-decoration: none; -ms-interpolation-mode: bicubic; }
  </style>
</head>
<body style="margin:0;padding:0;background-color:#0a0a0f;font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  ${preheader ? `<div style="display:none;font-size:1px;color:#0a0a0f;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">${preheader}</div>` : ''}
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#0a0a0f;padding:40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" width="580" cellpadding="0" cellspacing="0" style="background-color:#13131a;border-radius:16px;border:1px solid #1e1e2e;overflow:hidden;">

          <!-- Header -->
          <tr>
            <td style="padding:32px 32px 24px;border-bottom:1px solid #1e1e2e;">
              <span style="font-size:24px;font-weight:800;letter-spacing:0.08em;background:linear-gradient(135deg,#00C896,#55C4CF);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;">Wellaryn</span>
              <span style="display:block;font-size:11px;color:#555;text-transform:uppercase;letter-spacing:0.15em;margin-top:2px;">Fitness AI</span>
            </td>
          </tr>

          ${content}

          <!-- Footer -->
          <tr>
            <td style="padding:24px 32px;border-top:1px solid #1e1e2e;text-align:center;">
              <p style="margin:0 0 8px;font-size:12px;color:#555;line-height:1.5;">
                Wellaryn is a wellness and performance tool.<br>It does not replace professional medical advice.
              </p>
              <p style="margin:0;font-size:11px;color:#444;">
                © ${new Date().getFullYear()} Wellaryn · <a href="${SITE_URL}/legal/privacy" style="color:#00C896;text-decoration:none;">Privacy</a> · <a href="${SITE_URL}/legal/terms" style="color:#00C896;text-decoration:none;">Terms</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ─── CTA Button helper ───────────────────────────────────────

function ctaButton(text, href) {
  return `
          <tr>
            <td style="padding:8px 32px 32px;" align="center">
              <table role="presentation" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="border-radius:999px;background:#00C896;box-shadow:0 0 20px rgba(0,200,150,0.25);">
                    <a href="${href}" style="display:inline-block;padding:14px 32px;color:#0a0a0f;font-size:14px;font-weight:700;text-decoration:none;letter-spacing:0.02em;">
                      ${text} →
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>`;
}

// ═══════════════════════════════════════════════════════════════
// 1. WELCOME EMAIL
// ═══════════════════════════════════════════════════════════════

/**
 * @param {Object} data
 * @param {string} data.name - User's display name
 * @returns {{ subject: string, html: string }}
 */
export function welcomeEmail({ name }) {
  const displayName = name || 'there';

  const content = `
          <!-- Welcome Hero -->
          <tr>
            <td style="padding:40px 32px 24px;text-align:center;">
              <p style="margin:0 0 8px;font-size:40px;">🎉</p>
              <h1 style="margin:0 0 8px;font-size:28px;font-weight:800;color:#f2f2f2;line-height:1.2;">
                Welcome to Wellaryn, ${displayName}!
              </h1>
              <p style="margin:0;font-size:15px;color:#888;line-height:1.6;max-width:420px;display:inline-block;">
                Your personal AI-powered fitness and recovery platform is ready. Let's get you set up in 3 quick steps.
              </p>
            </td>
          </tr>

          <!-- Quick-Start Steps -->
          <tr>
            <td style="padding:8px 32px 24px;">
              <!-- Step 1 -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:12px;">
                <tr>
                  <td style="background:#00C89612;border:1px solid #00C89633;border-radius:12px;padding:20px 24px;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td width="48" valign="top">
                          <span style="display:inline-block;width:36px;height:36px;border-radius:50%;background:#00C896;color:#0a0a0f;font-size:16px;font-weight:800;line-height:36px;text-align:center;">1</span>
                        </td>
                        <td style="padding-left:12px;">
                          <p style="margin:0 0 4px;font-size:15px;font-weight:700;color:#f2f2f2;">Connect Your Wearable</p>
                          <p style="margin:0;font-size:13px;color:#888;line-height:1.5;">Link your WHOOP, Oura, Garmin, Fitbit, or Apple Health to auto-sync your biometrics.</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              <!-- Step 2 -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:12px;">
                <tr>
                  <td style="background:#00C89612;border:1px solid #00C89633;border-radius:12px;padding:20px 24px;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td width="48" valign="top">
                          <span style="display:inline-block;width:36px;height:36px;border-radius:50%;background:#00C896;color:#0a0a0f;font-size:16px;font-weight:800;line-height:36px;text-align:center;">2</span>
                        </td>
                        <td style="padding-left:12px;">
                          <p style="margin:0 0 4px;font-size:15px;font-weight:700;color:#f2f2f2;">Complete Your Daily Check-In</p>
                          <p style="margin:0;font-size:13px;color:#888;line-height:1.5;">Log your energy, stress, soreness, and training in under 60 seconds to get your Wellaryn Score.</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              <!-- Step 3 -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background:#00C89612;border:1px solid #00C89633;border-radius:12px;padding:20px 24px;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td width="48" valign="top">
                          <span style="display:inline-block;width:36px;height:36px;border-radius:50%;background:#00C896;color:#0a0a0f;font-size:16px;font-weight:800;line-height:36px;text-align:center;">3</span>
                        </td>
                        <td style="padding-left:12px;">
                          <p style="margin:0 0 4px;font-size:15px;font-weight:700;color:#f2f2f2;">Explore Your Dashboard</p>
                          <p style="margin:0;font-size:13px;color:#888;line-height:1.5;">View trends, recovery insights, training load ratios, and AI-powered recommendations.</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          ${ctaButton('Go to Dashboard', `${SITE_URL}/dashboard`)}`;

  return {
    subject: '🎉 Welcome to Wellaryn — Let\'s get started!',
    html: emailWrapper(content, `Welcome to Wellaryn, ${displayName}! Your AI fitness coach is ready.`),
  };
}

// ═══════════════════════════════════════════════════════════════
// 2. WEEKLY REPORT EMAIL
// ═══════════════════════════════════════════════════════════════

/**
 * @param {Object} data
 * @param {string} data.name - User's display name
 * @param {number|null} data.wellarynScore - Average Wellaryn Score for the week
 * @param {number|null} data.avgHRV - Average HRV (ms)
 * @param {number|null} data.avgSleep - Average sleep (hours)
 * @param {number|null} data.trainingDays - Number of training days
 * @param {number|null} data.prevScore - Previous week's score (for trend)
 * @param {number|null} data.prevHRV - Previous week's HRV
 * @param {number|null} data.prevSleep - Previous week's sleep
 * @param {string} data.dateRange - e.g. "Jun 1 - Jun 7, 2026"
 * @returns {{ subject: string, html: string }}
 */
export function weeklyReportEmail({
  name,
  wellarynScore,
  avgHRV,
  avgSleep,
  trainingDays,
  prevScore,
  prevHRV,
  prevSleep,
  dateRange,
}) {
  const displayName = name || 'Athlete';
  const score = wellarynScore ?? null;
  const scoreDiff = (score != null && prevScore != null) ? score - prevScore : null;

  function scoreColor(s) {
    if (s >= 80) return '#00C896';
    if (s >= 60) return '#F5A623';
    if (s >= 40) return '#FF6B35';
    return '#FF4757';
  }

  function trendArrow(diff) {
    if (diff > 2) return '↑';
    if (diff < -2) return '↓';
    return '→';
  }

  const sc = score != null ? scoreColor(score) : '#888';
  const hrvDiff = (avgHRV != null && prevHRV != null) ? avgHRV - prevHRV : null;
  const sleepDiff = (avgSleep != null && prevSleep != null) ? parseFloat((avgSleep - prevSleep).toFixed(1)) : null;

  function metricRow(label, value, unit, diff, diffUnit, invertColor = false) {
    const diffColor = diff != null
      ? (invertColor ? (diff <= 0 ? '#00C896' : '#FF4757') : (diff >= 0 ? '#00C896' : '#FF4757'))
      : null;
    return `
                <tr>
                  <td style="padding:10px 0;border-bottom:1px solid #1e1e2e;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="font-size:14px;color:#ccc;">${label}</td>
                        <td align="right" style="font-size:14px;font-weight:600;color:#f2f2f2;">
                          ${value != null ? `${value}${unit}` : '--'}
                          ${diff != null ? `<span style="color:${diffColor};font-size:12px;margin-left:6px;">${trendArrow(diff)} ${diff >= 0 ? '+' : ''}${diff}${diffUnit}</span>` : ''}
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>`;
  }

  const content = `
          <!-- Report Title -->
          <tr>
            <td style="padding:28px 32px 8px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <p style="margin:0 0 4px;font-size:13px;color:#888;text-transform:uppercase;letter-spacing:0.1em;">Weekly Performance Report</p>
                    <p style="margin:0 0 4px;font-size:20px;font-weight:700;color:#f2f2f2;">${displayName}</p>
                    <p style="margin:0;font-size:13px;color:#666;">${dateRange || ''}</p>
                  </td>
                  <td align="right" valign="top">
                    <span style="display:inline-block;padding:4px 12px;border-radius:20px;background:#00C89622;color:#00C896;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;border:1px solid #00C89644;">📊 WEEKLY REPORT</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Score Card -->
          <tr>
            <td style="padding:20px 32px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:linear-gradient(135deg,${sc}11,${sc}05);border:1px solid ${sc}33;border-radius:12px;">
                <tr>
                  <td style="padding:24px 28px;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td>
                          <p style="margin:0 0 4px;font-size:11px;color:#888;text-transform:uppercase;letter-spacing:0.12em;">WELLARYN SCORE</p>
                          <span style="font-size:48px;font-weight:800;color:${sc};">${score != null ? score : '--'}</span>
                          <span style="font-size:16px;color:#888;margin-left:4px;">/ 100</span>
                        </td>
                        <td align="right" valign="top">
                          ${scoreDiff != null ? `
                          <span style="display:inline-block;padding:6px 14px;border-radius:20px;background:${scoreDiff >= 0 ? '#00C896' : '#FF4757'}18;color:${scoreDiff >= 0 ? '#00C896' : '#FF4757'};font-size:14px;font-weight:700;">
                            ${trendArrow(scoreDiff)} ${scoreDiff >= 0 ? '+' : ''}${scoreDiff} vs last week
                          </span>` : ''}
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Metrics Summary -->
          <tr>
            <td style="padding:0 32px 24px;">
              <p style="margin:0 0 12px;font-size:14px;font-weight:700;color:#f2f2f2;text-transform:uppercase;letter-spacing:0.08em;">Key Metrics</p>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                ${metricRow('Avg HRV', avgHRV, 'ms', hrvDiff, 'ms')}
                ${metricRow('Avg Sleep', avgSleep, 'h', sleepDiff, 'h')}
                ${metricRow('Training Days', trainingDays, '', null, '')}
              </table>
            </td>
          </tr>

          ${ctaButton('View Full Report', `${SITE_URL}/dashboard/reports`)}`;

  return {
    subject: `📊 Your Weekly Wellaryn Report — Score: ${score ?? '--'}`,
    html: emailWrapper(content, `Your Wellaryn Score this week: ${score ?? '--'}. See your full report.`),
  };
}

// ═══════════════════════════════════════════════════════════════
// 3. PASSWORD RESET EMAIL
// ═══════════════════════════════════════════════════════════════

/**
 * @param {Object} data
 * @param {string} data.resetLink - Full URL with token for password reset
 * @param {string} [data.name] - User's display name (optional)
 * @returns {{ subject: string, html: string }}
 */
export function passwordResetEmail({ resetLink, name }) {
  const displayName = name || 'there';

  const content = `
          <!-- Reset Content -->
          <tr>
            <td style="padding:40px 32px 16px;text-align:center;">
              <p style="margin:0 0 8px;font-size:40px;">🔐</p>
              <h1 style="margin:0 0 8px;font-size:24px;font-weight:800;color:#f2f2f2;line-height:1.2;">
                Reset Your Password
              </h1>
              <p style="margin:0;font-size:15px;color:#888;line-height:1.6;max-width:420px;display:inline-block;">
                Hey ${displayName}, we received a request to reset your Wellaryn password. Click the button below to choose a new one.
              </p>
            </td>
          </tr>

          ${ctaButton('Reset Password', resetLink)}

          <!-- Security Note -->
          <tr>
            <td style="padding:0 32px 32px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#FF475712;border:1px solid #FF475733;border-radius:10px;">
                <tr>
                  <td style="padding:16px 20px;">
                    <p style="margin:0;font-size:13px;color:#ccc;line-height:1.5;">
                      <strong style="color:#FF4757;">⚠️ Security note:</strong> This link expires in 1 hour. If you didn't request a password reset, you can safely ignore this email — your account is still secure.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Fallback link -->
          <tr>
            <td style="padding:0 32px 24px;">
              <p style="margin:0;font-size:12px;color:#555;line-height:1.5;">
                If the button doesn't work, copy and paste this link into your browser:<br>
                <a href="${resetLink}" style="color:#00C896;word-break:break-all;font-size:11px;">${resetLink}</a>
              </p>
            </td>
          </tr>`;

  return {
    subject: '🔐 Reset your Wellaryn password',
    html: emailWrapper(content, 'You requested a password reset for your Wellaryn account.'),
  };
}

// ═══════════════════════════════════════════════════════════════
// 4. SUBSCRIPTION CONFIRMATION EMAIL
// ═══════════════════════════════════════════════════════════════

/**
 * @param {Object} data
 * @param {string} data.name - User's display name
 * @param {string} data.planName - e.g. "Pro", "Team"
 * @param {string} data.price - e.g. "$9.99/mo"
 * @param {string[]} data.features - List of included features
 * @param {string} data.billingDate - Next billing date, e.g. "July 8, 2026"
 * @returns {{ subject: string, html: string }}
 */
export function subscriptionConfirmationEmail({ name, planName, price, features, billingDate }) {
  const displayName = name || 'there';
  const plan = planName || 'Pro';
  const featureList = (features || []).map(f => `
                <tr>
                  <td style="padding:6px 0;">
                    <table role="presentation" cellpadding="0" cellspacing="0">
                      <tr>
                        <td width="28" valign="top" style="color:#00C896;font-size:14px;">✓</td>
                        <td style="font-size:14px;color:#ccc;line-height:1.4;">${f}</td>
                      </tr>
                    </table>
                  </td>
                </tr>`).join('');

  const content = `
          <!-- Confirmation Hero -->
          <tr>
            <td style="padding:40px 32px 24px;text-align:center;">
              <p style="margin:0 0 8px;font-size:40px;">🚀</p>
              <h1 style="margin:0 0 8px;font-size:24px;font-weight:800;color:#f2f2f2;line-height:1.2;">
                You're on ${plan}!
              </h1>
              <p style="margin:0;font-size:15px;color:#888;line-height:1.6;max-width:420px;display:inline-block;">
                Thanks ${displayName}, your subscription is now active. Here's a summary of your plan.
              </p>
            </td>
          </tr>

          <!-- Plan Details Card -->
          <tr>
            <td style="padding:0 32px 24px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#00C89612;border:1px solid #00C89633;border-radius:12px;">
                <tr>
                  <td style="padding:24px 28px;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td>
                          <p style="margin:0 0 2px;font-size:11px;color:#00C896;text-transform:uppercase;letter-spacing:0.12em;font-weight:700;">YOUR PLAN</p>
                          <p style="margin:0;font-size:28px;font-weight:800;color:#f2f2f2;">${plan}</p>
                        </td>
                        <td align="right" valign="top">
                          <p style="margin:0;font-size:24px;font-weight:800;color:#00C896;">${price || ''}</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Features List -->
          <tr>
            <td style="padding:0 32px 24px;">
              <p style="margin:0 0 12px;font-size:14px;font-weight:700;color:#f2f2f2;text-transform:uppercase;letter-spacing:0.08em;">What's Included</p>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                ${featureList}
              </table>
            </td>
          </tr>

          <!-- Billing Info -->
          <tr>
            <td style="padding:0 32px 24px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#1a1a25;border:1px solid #1e1e2e;border-radius:10px;">
                <tr>
                  <td style="padding:16px 20px;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="font-size:13px;color:#888;">Next billing date</td>
                        <td align="right" style="font-size:14px;font-weight:600;color:#f2f2f2;">${billingDate || 'N/A'}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          ${ctaButton('Go to Dashboard', `${SITE_URL}/dashboard`)}`;

  return {
    subject: `🚀 Welcome to Wellaryn ${plan} — Your subscription is active`,
    html: emailWrapper(content, `You're now on Wellaryn ${plan}! Your subscription is active.`),
  };
}
