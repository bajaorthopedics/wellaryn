import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import { calculateWellarynScore, calculateTrainingLoad } from '@/lib/wellaryn-score';
import { metricsToWellarynInput } from '@/lib/supabase/data-service';

// ─── Auth: Verify cron secret ─────────────────────────────────

function verifyCronSecret(request) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  // If no CRON_SECRET is configured, allow (dev mode)
  if (!cronSecret) return true;

  return authHeader === `Bearer ${cronSecret}`;
}

// ─── Supabase service client (bypasses RLS) ───────────────────

function getServiceClient() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
      cookies: {
        getAll() { return []; },
        setAll() {},
      },
    }
  );
}

// ─── Email template ───────────────────────────────────────────

function buildEmailHtml({ athleteName, score, alertType, severity, message, athleteId, lang = 'es' }) {
  const severityColors = {
    critical: '#EF4444',
    warning: '#F59E0B',
    info: '#3B82F6',
  };
  const severityIcons = {
    critical: '🔴',
    warning: '⚠️',
    info: 'ℹ️',
  };
  const severityLabels = {
    critical: { en: 'CRITICAL', es: 'CRÍTICO' },
    warning: { en: 'WARNING', es: 'ADVERTENCIA' },
    info: { en: 'INFO', es: 'INFORMACIÓN' },
  };

  const alertTypeLabels = {
    low_score: { en: 'Low Wellaryn Score', es: 'Score Wellaryn Bajo' },
    high_acwr: { en: 'High Training Load', es: 'Carga de Entrenamiento Alta' },
    high_injury_risk: { en: 'Elevated Injury Risk', es: 'Riesgo de Lesión Elevado' },
    no_data: { en: 'No Recent Data', es: 'Sin Datos Recientes' },
    score_drop: { en: 'Score Drop', es: 'Caída del Score' },
  };

  const isEn = lang === 'en';
  const color = severityColors[severity] || severityColors.warning;
  const icon = severityIcons[severity] || '⚠️';
  const sevLabel = severityLabels[severity]?.[lang] || severity.toUpperCase();
  const typeLabel = alertTypeLabels[alertType]?.[lang] || alertType;
  const athleteUrl = `https://wellaryn.com/dashboard/team/${athleteId}`;

  return `
<!DOCTYPE html>
<html lang="${lang}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Wellaryn Alert</title>
</head>
<body style="margin:0;padding:0;background-color:#0d0f14;font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#0d0f14;padding:40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="background-color:#141720;border-radius:16px;border:1px solid rgba(255,255,255,0.06);overflow:hidden;">
          
          <!-- Header -->
          <tr>
            <td style="padding:32px 32px 24px;border-bottom:1px solid rgba(255,255,255,0.06);">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <span style="font-size:24px;font-weight:800;letter-spacing:0.08em;background:linear-gradient(135deg,#00C896,#55C4CF);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;">Wellaryn</span>
                    <span style="display:block;font-size:11px;color:#555;text-transform:uppercase;letter-spacing:0.15em;margin-top:2px;">Fitness AI</span>
                  </td>
                  <td align="right">
                    <span style="display:inline-block;padding:4px 12px;border-radius:20px;background:${color}22;color:${color};font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;border:1px solid ${color}44;">${icon} ${sevLabel}</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Alert Content -->
          <tr>
            <td style="padding:32px;">
              <!-- Athlete Name -->
              <p style="margin:0 0 8px;font-size:13px;color:#888;text-transform:uppercase;letter-spacing:0.1em;">
                ${isEn ? 'Athlete' : 'Atleta'}
              </p>
              <p style="margin:0 0 24px;font-size:22px;font-weight:700;color:#f2f2f2;">
                ${athleteName}
              </p>

              <!-- Score Badge -->
              ${score != null ? `
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
                <tr>
                  <td style="background:linear-gradient(135deg,${score >= 60 ? '#00C896' : score >= 40 ? '#F59E0B' : '#EF4444'}22,transparent);border:1px solid ${score >= 60 ? '#00C896' : score >= 40 ? '#F59E0B' : '#EF4444'}33;border-radius:12px;padding:16px 24px;">
                    <span style="font-size:42px;font-weight:800;color:${score >= 60 ? '#00C896' : score >= 40 ? '#F59E0B' : '#EF4444'};">${score}</span>
                    <span style="font-size:14px;color:#888;margin-left:8px;">/ 100</span>
                  </td>
                </tr>
              </table>
              ` : ''}

              <!-- Alert Type -->
              <p style="margin:0 0 8px;font-size:13px;color:#888;text-transform:uppercase;letter-spacing:0.1em;">
                ${isEn ? 'Alert Type' : 'Tipo de Alerta'}
              </p>
              <p style="margin:0 0 16px;font-size:16px;font-weight:600;color:${color};">
                ${typeLabel}
              </p>

              <!-- Message -->
              <p style="margin:0 0 32px;font-size:15px;color:#ccc;line-height:1.6;">
                ${message}
              </p>

              <!-- CTA Button -->
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto;">
                <tr>
                  <td style="border-radius:999px;background:#00C896;box-shadow:0 0 20px rgba(0,200,150,0.25);">
                    <a href="${athleteUrl}" style="display:inline-block;padding:14px 32px;color:#0d0f14;font-size:14px;font-weight:700;text-decoration:none;letter-spacing:0.02em;">
                      ${isEn ? 'View Athlete Detail' : 'Ver Detalle del Atleta'} →
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:24px 32px;border-top:1px solid rgba(255,255,255,0.06);text-align:center;">
              <p style="margin:0;font-size:12px;color:#555;line-height:1.5;">
                ${isEn
                  ? 'Wellaryn is a wellness and performance tool. It does not replace professional medical advice.'
                  : 'Wellaryn es una herramienta de bienestar y rendimiento. No sustituye el consejo médico profesional.'}
              </p>
              <p style="margin:8px 0 0;font-size:11px;color:#444;">
                © ${new Date().getFullYear()} Wellaryn
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`.trim();
}

// ─── Alert detection ──────────────────────────────────────────

function detectAlerts(wellarynResult, metrics, athleteProfile) {
  const alerts = [];
  const score = wellarynResult.score;
  const athleteName = athleteProfile?.display_name || 'Athlete';

  // 1. Low Score
  if (score < 60) {
    const severity = score < 40 ? 'critical' : 'warning';
    alerts.push({
      type: 'low_score',
      severity,
      title_en: `${athleteName}'s Wellaryn Score is ${score}`,
      title_es: `El Score Wellaryn de ${athleteName} es ${score}`,
      message_en: score < 40
        ? `${athleteName}'s score is critically low (${score}/100). Recovery is strongly recommended. Check their status immediately.`
        : `${athleteName}'s score is below the safe threshold (${score}/100). Consider reducing training intensity today.`,
      message_es: score < 40
        ? `El score de ${athleteName} está críticamente bajo (${score}/100). Se recomienda fuertemente la recuperación. Revisa su estado de inmediato.`
        : `El score de ${athleteName} está por debajo del umbral seguro (${score}/100). Considera reducir la intensidad hoy.`,
      score,
    });
  }

  // 2. High ACWR
  const trainingDetails = wellarynResult.trainingLoadDetails || {};
  const acwr = trainingDetails.ratio || 0;
  if (acwr > 1.5) {
    const severity = acwr > 1.8 ? 'critical' : 'warning';
    const acwrRounded = Math.round(acwr * 100) / 100;
    alerts.push({
      type: 'high_acwr',
      severity,
      title_en: `${athleteName}'s ACWR is ${acwrRounded}`,
      title_es: `El ACWR de ${athleteName} es ${acwrRounded}`,
      message_en: `${athleteName}'s acute:chronic workload ratio is ${acwrRounded}, indicating ${acwr > 1.8 ? 'a dangerous training spike' : 'elevated training load'}. Risk of injury is significantly increased.`,
      message_es: `La relación aguda:crónica de ${athleteName} es ${acwrRounded}, indicando ${acwr > 1.8 ? 'un pico peligroso de entrenamiento' : 'carga de entrenamiento elevada'}. El riesgo de lesión está significativamente aumentado.`,
      score,
    });
  }

  // 3. High Injury Risk
  const injuryRiskSubScore = wellarynResult.subScores?.injuryRisk || 0;
  if (injuryRiskSubScore > 70) {
    alerts.push({
      type: 'high_injury_risk',
      severity: 'warning',
      title_en: `${athleteName} has elevated injury risk`,
      title_es: `${athleteName} tiene riesgo de lesión elevado`,
      message_en: `${athleteName}'s injury risk sub-score is ${injuryRiskSubScore}/100. Pain and soreness indicators suggest caution. Consider modifying today's training.`,
      message_es: `El sub-score de riesgo de lesión de ${athleteName} es ${injuryRiskSubScore}/100. Los indicadores de dolor sugieren precaución. Considera modificar el entrenamiento de hoy.`,
      score,
    });
  }

  // 4. No Data (last 48 hours)
  if (metrics && metrics.length > 0) {
    const latestDate = new Date(metrics[metrics.length - 1].date);
    const hoursSinceLastData = (Date.now() - latestDate.getTime()) / (1000 * 60 * 60);
    if (hoursSinceLastData > 48) {
      alerts.push({
        type: 'no_data',
        severity: 'info',
        title_en: `No recent data from ${athleteName}`,
        title_es: `Sin datos recientes de ${athleteName}`,
        message_en: `${athleteName} hasn't submitted any data in the last 48 hours. Their readiness score may be inaccurate.`,
        message_es: `${athleteName} no ha registrado datos en las últimas 48 horas. Su score de preparación puede ser impreciso.`,
        score: null,
      });
    }
  } else {
    // No metrics at all
    alerts.push({
      type: 'no_data',
      severity: 'info',
      title_en: `No data available for ${athleteName}`,
      title_es: `Sin datos disponibles para ${athleteName}`,
      message_en: `${athleteName} has no recorded metrics. Encourage them to complete their daily check-in.`,
      message_es: `${athleteName} no tiene métricas registradas. Anímale a completar su registro diario.`,
      score: null,
    });
  }

  // 5. Score Drop (>15 points from previous day)
  if (metrics && metrics.length >= 2) {
    const todayMetrics = metrics.slice(-1);
    const yesterdayMetrics = metrics.slice(-2, -1);

    if (todayMetrics.length && yesterdayMetrics.length) {
      const todayInput = metricsToWellarynInput(metrics, athleteProfile);
      const yesterdayInput = metricsToWellarynInput(metrics.slice(0, -1), athleteProfile);

      if (todayInput && yesterdayInput) {
        const yesterdayResult = calculateWellarynScore(yesterdayInput);
        const drop = yesterdayResult.score - score;

        if (drop > 15) {
          alerts.push({
            type: 'score_drop',
            severity: 'warning',
            title_en: `${athleteName}'s score dropped ${drop} points`,
            title_es: `El score de ${athleteName} cayó ${drop} puntos`,
            message_en: `${athleteName}'s Wellaryn Score dropped from ${yesterdayResult.score} to ${score} (−${drop} points). Investigate potential causes: poor sleep, high stress, or sudden training increase.`,
            message_es: `El Wellaryn Score de ${athleteName} cayó de ${yesterdayResult.score} a ${score} (−${drop} puntos). Investiga posibles causas: mal sueño, estrés alto o aumento repentino de entrenamiento.`,
            score,
          });
        }
      }
    }
  }

  return alerts;
}

// ─── Send email via Resend ────────────────────────────────────

async function sendAlertEmail({ coachEmail, coachName, alert, athleteId, lang }) {
  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) return false;

  const isEn = lang === 'en';
  const subject = isEn
    ? `⚠️ Wellaryn Alert: ${alert.title_en}`
    : `⚠️ Alerta Wellaryn: ${alert.title_es}`;

  const html = buildEmailHtml({
    athleteName: alert.title_en.split("'s")[0] || 'Athlete',
    score: alert.score,
    alertType: alert.type,
    severity: alert.severity,
    message: isEn ? alert.message_en : alert.message_es,
    athleteId,
    lang,
  });

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Wellaryn <alerts@wellaryn.com>',
        to: [coachEmail],
        subject,
        html,
      }),
    });

    return res.ok;
  } catch (err) {
    console.error('Resend email error:', err);
    return false;
  }
}

// ─── Main GET handler (called by Vercel cron) ─────────────────

export async function GET(request) {
  try {
    // Verify authorization
    if (!verifyCronSecret(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = getServiceClient();
    const today = new Date().toISOString().split('T')[0];

    // 1. Fetch all accepted coach-athlete relationships
    const { data: relationships, error: relError } = await supabase
      .from('coach_athletes')
      .select('coach_id, athlete_id')
      .eq('status', 'accepted');

    if (relError) {
      console.error('Error fetching relationships:', relError);
      return NextResponse.json({ error: 'Failed to fetch relationships' }, { status: 500 });
    }

    if (!relationships || relationships.length === 0) {
      return NextResponse.json({ checked: 0, alerts: 0, emailed: 0 });
    }

    // 2. Get unique coach IDs and fetch their profiles (for email + language)
    const coachIds = [...new Set(relationships.map(r => r.coach_id))];
    const athleteIds = [...new Set(relationships.map(r => r.athlete_id))];
    const allUserIds = [...new Set([...coachIds, ...athleteIds])];

    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, display_name, email, language, role, has_injury_history')
      .in('id', allUserIds);

    const profileMap = {};
    for (const p of (profiles || [])) {
      profileMap[p.id] = p;
    }

    // 3. Fetch metrics for all athletes (last 14 days for ACWR calculations)
    const fourteenDaysAgo = new Date();
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
    const startDate = fourteenDaysAgo.toISOString().split('T')[0];

    const { data: allMetrics } = await supabase
      .from('daily_metrics')
      .select('*')
      .in('user_id', athleteIds)
      .gte('date', startDate)
      .order('date', { ascending: true });

    // Group metrics by athlete
    const metricsByAthlete = {};
    for (const m of (allMetrics || [])) {
      if (!metricsByAthlete[m.user_id]) metricsByAthlete[m.user_id] = [];
      metricsByAthlete[m.user_id].push(m);
    }

    // 4. Process each coach-athlete pair
    let totalAlerts = 0;
    let totalEmailed = 0;

    for (const rel of relationships) {
      const coachProfile = profileMap[rel.coach_id];
      const athleteProfile = profileMap[rel.athlete_id];
      const metrics = metricsByAthlete[rel.athlete_id] || [];
      const lang = coachProfile?.language || 'es';

      // Calculate Wellaryn Score
      let wellarynResult = { score: 50, subScores: {}, trainingLoadDetails: {} };
      if (metrics.length > 0) {
        const input = metricsToWellarynInput(metrics, athleteProfile);
        if (input) {
          wellarynResult = calculateWellarynScore(input);
        }
      }

      // Detect alerts
      const alerts = detectAlerts(wellarynResult, metrics, athleteProfile);

      for (const alert of alerts) {
        // Deduplication: check if same alert was already sent today
        const { data: existing } = await supabase
          .from('coach_notifications')
          .select('id')
          .eq('coach_id', rel.coach_id)
          .eq('athlete_id', rel.athlete_id)
          .eq('type', alert.type)
          .gte('created_at', `${today}T00:00:00Z`)
          .limit(1);

        if (existing && existing.length > 0) continue; // Already sent today

        const isEn = lang === 'en';

        // Insert notification
        const { error: insertError } = await supabase
          .from('coach_notifications')
          .insert({
            coach_id: rel.coach_id,
            athlete_id: rel.athlete_id,
            type: alert.type,
            severity: alert.severity,
            title: isEn ? alert.title_en : alert.title_es,
            message: isEn ? alert.message_en : alert.message_es,
            score: alert.score,
            read: false,
            emailed: false,
          });

        if (insertError) {
          console.error('Error inserting notification:', insertError);
          continue;
        }

        totalAlerts++;

        // Send email if Resend is configured
        if (process.env.RESEND_API_KEY && coachProfile?.email) {
          const sent = await sendAlertEmail({
            coachEmail: coachProfile.email,
            coachName: coachProfile.display_name,
            alert,
            athleteId: rel.athlete_id,
            lang,
          });

          if (sent) {
            totalEmailed++;
            // Mark as emailed
            await supabase
              .from('coach_notifications')
              .update({ emailed: true })
              .eq('coach_id', rel.coach_id)
              .eq('athlete_id', rel.athlete_id)
              .eq('type', alert.type)
              .gte('created_at', `${today}T00:00:00Z`);
          }
        }
      }
    }

    return NextResponse.json({
      checked: relationships.length,
      alerts: totalAlerts,
      emailed: totalEmailed,
    });
  } catch (err) {
    console.error('Notification check error:', err);
    return NextResponse.json({ error: 'Check failed', details: err.message }, { status: 500 });
  }
}
