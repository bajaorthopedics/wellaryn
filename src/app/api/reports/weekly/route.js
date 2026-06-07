import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import { calculateWellarynScore } from '@/lib/wellaryn-score';
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

// ─── Helpers ──────────────────────────────────────────────────

function avg(arr) {
  if (arr.length === 0) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

const DAY_NAMES = {
  en: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
  es: ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'],
};

const MONTH_NAMES = {
  en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
  es: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'],
};

function formatDate(dateStr, lang) {
  const d = new Date(dateStr + 'T00:00:00Z');
  const months = MONTH_NAMES[lang] || MONTH_NAMES.en;
  return `${months[d.getUTCMonth()]} ${d.getUTCDate()}`;
}

function getDayName(dateStr, lang) {
  const d = new Date(dateStr + 'T00:00:00Z');
  const days = DAY_NAMES[lang] || DAY_NAMES.en;
  return days[d.getUTCDay()];
}

function scoreColor(score) {
  if (score >= 80) return '#00C896';
  if (score >= 60) return '#F5A623';
  if (score >= 40) return '#FF6B35';
  return '#FF4757';
}

function scoreEmoji(score) {
  if (score >= 80) return '🟢';
  if (score >= 60) return '🟡';
  if (score >= 40) return '🟠';
  return '🔴';
}

function scoreCategory(score, lang) {
  const categories = {
    en: { peak: 'Peak State', optimal: 'Optimal', productive: 'Productive', caution: 'Caution', recovery: 'Recovery Required' },
    es: { peak: 'Estado Pico', optimal: 'Óptimo', productive: 'Productivo', caution: 'Precaución', recovery: 'Recuperación Necesaria' },
  };
  const c = categories[lang] || categories.en;
  if (score >= 90) return c.peak;
  if (score >= 80) return c.optimal;
  if (score >= 70) return c.productive;
  if (score >= 60) return c.caution;
  return c.recovery;
}

function trendArrow(diff) {
  if (diff > 2) return '↑';
  if (diff < -2) return '↓';
  return '→';
}

function trendLabel(diff, lang) {
  if (diff > 2) return lang === 'es' ? 'Mejorando' : 'Improving';
  if (diff < -2) return lang === 'es' ? 'Declinando' : 'Declining';
  return lang === 'es' ? 'Estable' : 'Stable';
}

// ─── Compute weekly stats for a set of metrics ────────────────

function computeWeeklyStats(weekMetrics, allMetrics, profile, lang) {
  // Calculate daily Wellaryn scores for each day in the week
  const dailyScores = [];
  for (let i = 0; i < weekMetrics.length; i++) {
    // Build a sliding window from allMetrics ending at this day
    const dayDate = weekMetrics[i].date;
    const dayIndex = allMetrics.findIndex(m => m.date === dayDate);
    if (dayIndex >= 0) {
      const windowStart = Math.max(0, dayIndex - 13);
      const window = allMetrics.slice(windowStart, dayIndex + 1);
      const input = metricsToWellarynInput(window, profile);
      if (input) {
        const result = calculateWellarynScore(input);
        dailyScores.push({ date: dayDate, score: result.score, details: result });
      }
    }
  }

  const validScores = dailyScores.filter(d => d.score != null);
  const avgScore = validScores.length > 0 ? Math.round(avg(validScores.map(d => d.score))) : null;

  // HRV, RHR, Sleep averages
  const hrvValues = weekMetrics.filter(m => m.hrv_rmssd != null).map(m => m.hrv_rmssd);
  const rhrValues = weekMetrics.filter(m => m.rhr != null).map(m => m.rhr);
  const sleepValues = weekMetrics.filter(m => m.sleep_total != null).map(m => m.sleep_total);
  const trainingDays = weekMetrics.filter(m => m.training_load != null && m.training_load > 0).length;

  const avgHRV = hrvValues.length > 0 ? Math.round(avg(hrvValues)) : null;
  const avgRHR = rhrValues.length > 0 ? Math.round(avg(rhrValues)) : null;
  const avgSleep = sleepValues.length > 0 ? parseFloat(avg(sleepValues).toFixed(1)) : null;

  // Best and worst day
  let bestDay = null;
  let worstDay = null;
  if (validScores.length > 0) {
    bestDay = validScores.reduce((a, b) => a.score > b.score ? a : b);
    worstDay = validScores.reduce((a, b) => a.score < b.score ? a : b);
  }

  // ACWR from latest result
  let acwr = null;
  if (validScores.length > 0) {
    const latestDetails = validScores[validScores.length - 1].details;
    acwr = latestDetails.trainingLoadDetails?.ratio
      ? parseFloat(latestDetails.trainingLoadDetails.ratio.toFixed(2))
      : null;
  }

  return {
    avgScore,
    avgHRV,
    avgRHR,
    avgSleep,
    trainingDays,
    totalDays: weekMetrics.length,
    bestDay: bestDay ? { date: bestDay.date, score: bestDay.score, dayName: getDayName(bestDay.date, lang) } : null,
    worstDay: worstDay ? { date: worstDay.date, score: worstDay.score, dayName: getDayName(worstDay.date, lang) } : null,
    acwr,
    dailyScores,
  };
}

// ─── Generate recommendation based on stats ───────────────────

function generateRecommendation(stats, lang) {
  const recs = [];

  if (stats.avgScore != null) {
    if (stats.avgScore < 50) {
      recs.push(lang === 'es'
        ? 'Tu cuerpo necesita más recuperación. Prioriza el descanso y reduce la intensidad.'
        : 'Your body needs more recovery. Prioritize rest and reduce intensity.');
    } else if (stats.avgScore < 70) {
      recs.push(lang === 'es'
        ? 'Monitorea tu esfuerzo esta semana. Considera días de recuperación activa.'
        : 'Monitor your effort this week. Consider active recovery days.');
    } else {
      recs.push(lang === 'es'
        ? '¡Excelente semana! Mantén la consistencia en tu entrenamiento.'
        : 'Excellent week! Keep your training consistent.');
    }
  }

  if (stats.avgSleep != null && stats.avgSleep < 7) {
    recs.push(lang === 'es'
      ? 'Tu sueño promedio está por debajo de 7h. Intenta dormir más para optimizar la recuperación.'
      : 'Your average sleep is below 7h. Try to sleep more to optimize recovery.');
  }

  if (stats.acwr != null && stats.acwr > 1.5) {
    recs.push(lang === 'es'
      ? `Tu ACWR (${stats.acwr}) está en zona de riesgo. Reduce la carga de entrenamiento.`
      : `Your ACWR (${stats.acwr}) is in the risk zone. Reduce training load.`);
  }

  if (recs.length === 0) {
    recs.push(lang === 'es'
      ? 'Sigue monitoreando tus métricas diarias para obtener mejores recomendaciones.'
      : 'Keep tracking your daily metrics for better recommendations.');
  }

  return recs;
}

// ─── Athlete Email HTML Template ──────────────────────────────

function buildAthleteEmailHtml({ athleteName, stats, prevStats, dateRange, lang }) {
  const isEn = lang === 'en';
  const sc = stats.avgScore != null ? scoreColor(stats.avgScore) : '#888';
  const diff = (stats.avgScore != null && prevStats?.avgScore != null)
    ? stats.avgScore - prevStats.avgScore
    : null;
  const hrvDiff = (stats.avgHRV != null && prevStats?.avgHRV != null)
    ? stats.avgHRV - prevStats.avgHRV
    : null;
  const rhrDiff = (stats.avgRHR != null && prevStats?.avgRHR != null)
    ? stats.avgRHR - prevStats.avgRHR
    : null;
  const sleepDiff = (stats.avgSleep != null && prevStats?.avgSleep != null)
    ? parseFloat((stats.avgSleep - prevStats.avgSleep).toFixed(1))
    : null;

  const recommendations = generateRecommendation(stats, lang);
  const acwrZone = stats.acwr != null
    ? (stats.acwr <= 1.3 ? (isEn ? 'Safe Zone' : 'Zona Segura')
      : stats.acwr <= 1.5 ? (isEn ? 'Caution' : 'Precaución')
      : (isEn ? 'Danger Zone' : 'Zona de Peligro'))
    : (isEn ? 'N/A' : 'N/D');

  return `<!DOCTYPE html>
<html lang="${lang}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${isEn ? 'Weekly Performance Report' : 'Reporte Semanal de Rendimiento'}</title>
</head>
<body style="margin:0;padding:0;background-color:#0a0a0f;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#0a0a0f;padding:40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" width="580" cellpadding="0" cellspacing="0" style="background-color:#13131a;border-radius:16px;border:1px solid #1e1e2e;overflow:hidden;">

          <!-- Header -->
          <tr>
            <td style="padding:32px 32px 24px;border-bottom:1px solid #1e1e2e;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <span style="font-size:24px;font-weight:800;letter-spacing:0.08em;background:linear-gradient(135deg,#00C896,#55C4CF);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;">Wellaryn</span>
                    <span style="display:block;font-size:11px;color:#555;text-transform:uppercase;letter-spacing:0.15em;margin-top:2px;">Fitness AI</span>
                  </td>
                  <td align="right">
                    <span style="display:inline-block;padding:4px 12px;border-radius:20px;background:#00C89622;color:#00C896;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;border:1px solid #00C89644;">📊 ${isEn ? 'WEEKLY REPORT' : 'REPORTE SEMANAL'}</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Title -->
          <tr>
            <td style="padding:28px 32px 8px;">
              <p style="margin:0 0 4px;font-size:13px;color:#888;text-transform:uppercase;letter-spacing:0.1em;">
                ${isEn ? 'Weekly Performance Report' : 'Reporte Semanal de Rendimiento'}
              </p>
              <p style="margin:0 0 4px;font-size:20px;font-weight:700;color:#f2f2f2;">
                ${athleteName}
              </p>
              <p style="margin:0;font-size:13px;color:#666;">
                ${dateRange}
              </p>
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
                          <span style="font-size:48px;font-weight:800;color:${sc};">${stats.avgScore != null ? stats.avgScore : '--'}</span>
                          <span style="font-size:16px;color:#888;margin-left:4px;">/ 100</span>
                          ${stats.avgScore != null ? `<p style="margin:4px 0 0;font-size:13px;color:${sc};font-weight:600;">${scoreCategory(stats.avgScore, lang)}</p>` : ''}
                        </td>
                        <td align="right" valign="top">
                          ${diff != null ? `
                          <span style="display:inline-block;padding:6px 14px;border-radius:20px;background:${diff >= 0 ? '#00C896' : '#FF4757'}18;color:${diff >= 0 ? '#00C896' : '#FF4757'};font-size:14px;font-weight:700;">
                            ${trendArrow(diff)} ${diff >= 0 ? '+' : ''}${diff} ${isEn ? 'vs last week' : 'vs sem. anterior'}
                          </span>` : ''}
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Weekly Summary -->
          <tr>
            <td style="padding:8px 32px 20px;">
              <p style="margin:0 0 16px;font-size:14px;font-weight:700;color:#f2f2f2;text-transform:uppercase;letter-spacing:0.08em;">
                ${isEn ? 'Weekly Summary' : 'Resumen Semanal'}
              </p>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <!-- HRV -->
                <tr>
                  <td style="padding:8px 0;border-bottom:1px solid #1e1e2e;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="font-size:14px;color:#ccc;">
                          ${isEn ? 'Avg HRV' : 'HRV Promedio'}
                        </td>
                        <td align="right" style="font-size:14px;font-weight:600;color:#f2f2f2;">
                          ${stats.avgHRV != null ? `${stats.avgHRV}ms` : '--'}
                          ${hrvDiff != null ? `<span style="color:${hrvDiff >= 0 ? '#00C896' : '#FF4757'};font-size:12px;margin-left:6px;">${trendArrow(hrvDiff)} ${hrvDiff >= 0 ? '+' : ''}${hrvDiff}ms</span>` : ''}
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <!-- RHR -->
                <tr>
                  <td style="padding:8px 0;border-bottom:1px solid #1e1e2e;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="font-size:14px;color:#ccc;">
                          ${isEn ? 'Avg RHR' : 'RHR Promedio'}
                        </td>
                        <td align="right" style="font-size:14px;font-weight:600;color:#f2f2f2;">
                          ${stats.avgRHR != null ? `${stats.avgRHR}bpm` : '--'}
                          ${rhrDiff != null ? `<span style="color:${rhrDiff <= 0 ? '#00C896' : '#FF4757'};font-size:12px;margin-left:6px;">${rhrDiff <= 0 ? '↓' : '↑'} ${rhrDiff <= 0 ? '' : '+'}${rhrDiff}bpm ${rhrDiff <= 0 ? '✔' : ''}</span>` : ''}
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <!-- Sleep -->
                <tr>
                  <td style="padding:8px 0;border-bottom:1px solid #1e1e2e;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="font-size:14px;color:#ccc;">
                          ${isEn ? 'Avg Sleep' : 'Sueño Promedio'}
                        </td>
                        <td align="right" style="font-size:14px;font-weight:600;color:#f2f2f2;">
                          ${stats.avgSleep != null ? `${stats.avgSleep}h` : '--'}
                          ${sleepDiff != null ? `<span style="color:${sleepDiff >= 0 ? '#00C896' : '#FF4757'};font-size:12px;margin-left:6px;">${trendArrow(sleepDiff)} ${sleepDiff >= 0 ? '+' : ''}${sleepDiff}h</span>` : ''}
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <!-- Training Days -->
                <tr>
                  <td style="padding:8px 0;border-bottom:1px solid #1e1e2e;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="font-size:14px;color:#ccc;">
                          ${isEn ? 'Training Days' : 'Días de Entrenamiento'}
                        </td>
                        <td align="right" style="font-size:14px;font-weight:600;color:#f2f2f2;">
                          ${stats.trainingDays}/${stats.totalDays}
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <!-- ACWR -->
                <tr>
                  <td style="padding:8px 0;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="font-size:14px;color:#ccc;">ACWR</td>
                        <td align="right" style="font-size:14px;font-weight:600;color:#f2f2f2;">
                          ${stats.acwr != null ? stats.acwr : '--'}
                          <span style="color:${stats.acwr != null && stats.acwr <= 1.3 ? '#00C896' : stats.acwr != null && stats.acwr <= 1.5 ? '#F5A623' : '#FF4757'};font-size:12px;margin-left:6px;">(${acwrZone})</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Best / Worst Day -->
          ${stats.bestDay || stats.worstDay ? `
          <tr>
            <td style="padding:0 32px 20px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="8">
                <tr>
                  ${stats.bestDay ? `
                  <td width="50%" style="background:#00C89612;border:1px solid #00C89633;border-radius:10px;padding:14px 16px;">
                    <p style="margin:0 0 2px;font-size:11px;color:#00C896;text-transform:uppercase;letter-spacing:0.1em;font-weight:600;">${isEn ? 'Best Day' : 'Mejor Día'}</p>
                    <p style="margin:0;font-size:15px;font-weight:700;color:#f2f2f2;">${stats.bestDay.dayName}</p>
                    <p style="margin:2px 0 0;font-size:13px;color:#00C896;">Score: ${stats.bestDay.score}</p>
                  </td>` : ''}
                  ${stats.worstDay ? `
                  <td width="50%" style="background:#FF475712;border:1px solid #FF475733;border-radius:10px;padding:14px 16px;">
                    <p style="margin:0 0 2px;font-size:11px;color:#FF4757;text-transform:uppercase;letter-spacing:0.1em;font-weight:600;">${isEn ? 'Worst Day' : 'Peor Día'}</p>
                    <p style="margin:0;font-size:15px;font-weight:700;color:#f2f2f2;">${stats.worstDay.dayName}</p>
                    <p style="margin:2px 0 0;font-size:13px;color:#FF4757;">Score: ${stats.worstDay.score}</p>
                  </td>` : ''}
                </tr>
              </table>
            </td>
          </tr>` : ''}

          <!-- Recommendations -->
          <tr>
            <td style="padding:0 32px 24px;">
              <p style="margin:0 0 12px;font-size:14px;font-weight:700;color:#f2f2f2;text-transform:uppercase;letter-spacing:0.08em;">
                ${isEn ? 'Recommendations' : 'Recomendaciones'}
              </p>
              ${recommendations.map(rec => `
              <p style="margin:0 0 8px;font-size:14px;color:#ccc;line-height:1.5;padding-left:16px;border-left:2px solid #00C896;">
                ${rec}
              </p>`).join('')}
            </td>
          </tr>

          <!-- CTA Button -->
          <tr>
            <td style="padding:0 32px 32px;" align="center">
              <table role="presentation" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="border-radius:999px;background:#00C896;box-shadow:0 0 20px rgba(0,200,150,0.25);">
                    <a href="https://wellaryn.com/dashboard/reports" style="display:inline-block;padding:14px 32px;color:#0a0a0f;font-size:14px;font-weight:700;text-decoration:none;letter-spacing:0.02em;">
                      ${isEn ? 'View Full Dashboard' : 'Ver Dashboard Completo'} →
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:24px 32px;border-top:1px solid #1e1e2e;text-align:center;">
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

// ─── Coach Email HTML Template ────────────────────────────────

function buildCoachEmailHtml({ coachName, athleteRows, teamAvgScore, dateRange, lang }) {
  const isEn = lang === 'en';
  const tc = teamAvgScore != null ? scoreColor(teamAvgScore) : '#888';

  const athleteTableRows = athleteRows.map(a => {
    const sc = a.avgScore != null ? scoreColor(a.avgScore) : '#888';
    const emoji = a.avgScore != null ? scoreEmoji(a.avgScore) : '⚪';
    const needsAttention = a.avgScore != null && (a.avgScore < 60 || (a.acwr != null && a.acwr > 1.5));
    return `
                <tr style="border-bottom:1px solid #1e1e2e;">
                  <td style="padding:10px 12px;font-size:13px;color:#f2f2f2;font-weight:600;">${a.name}</td>
                  <td style="padding:10px 8px;font-size:14px;font-weight:700;color:${sc};text-align:center;">${a.avgScore != null ? a.avgScore : '--'} ${emoji}</td>
                  <td style="padding:10px 8px;font-size:13px;color:#ccc;text-align:center;">${a.avgHRV != null ? a.avgHRV : '--'}</td>
                  <td style="padding:10px 8px;font-size:13px;color:#ccc;text-align:center;">${a.avgRHR != null ? a.avgRHR : '--'}</td>
                  <td style="padding:10px 8px;font-size:13px;color:#ccc;text-align:center;">${a.avgSleep != null ? a.avgSleep + 'h' : '--'}</td>
                  <td style="padding:10px 8px;font-size:13px;text-align:center;">${needsAttention ? '⚠️' : ''}</td>
                </tr>`;
  }).join('');

  // Athletes needing attention
  const alertAthletes = athleteRows.filter(a =>
    (a.avgScore != null && a.avgScore < 60) || (a.acwr != null && a.acwr > 1.5)
  );
  const alertSection = alertAthletes.length > 0
    ? `
          <tr>
            <td style="padding:20px 32px 24px;">
              <p style="margin:0 0 12px;font-size:14px;font-weight:700;color:#FF4757;text-transform:uppercase;letter-spacing:0.08em;">
                ${isEn ? 'Athletes Needing Attention' : 'Atletas que Necesitan Atención'}
              </p>
              ${alertAthletes.map(a => {
                const reasons = [];
                if (a.avgScore != null && a.avgScore < 60) reasons.push(`Score ${a.avgScore}`);
                if (a.acwr != null && a.acwr > 1.5) reasons.push(`ACWR ${a.acwr}`);
                return `<p style="margin:0 0 6px;font-size:13px;color:#ccc;line-height:1.4;">
                  🚨 <strong style="color:#f2f2f2;">${a.name}</strong> — ${reasons.join(', ')}
                </p>`;
              }).join('')}
            </td>
          </tr>`
    : '';

  return `<!DOCTYPE html>
<html lang="${lang}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${isEn ? 'Weekly Team Report' : 'Reporte Semanal del Equipo'}</title>
</head>
<body style="margin:0;padding:0;background-color:#0a0a0f;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#0a0a0f;padding:40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" width="620" cellpadding="0" cellspacing="0" style="background-color:#13131a;border-radius:16px;border:1px solid #1e1e2e;overflow:hidden;">

          <!-- Header -->
          <tr>
            <td style="padding:32px 32px 24px;border-bottom:1px solid #1e1e2e;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <span style="font-size:24px;font-weight:800;letter-spacing:0.08em;background:linear-gradient(135deg,#00C896,#55C4CF);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;">Wellaryn</span>
                    <span style="display:block;font-size:11px;color:#555;text-transform:uppercase;letter-spacing:0.15em;margin-top:2px;">Fitness AI</span>
                  </td>
                  <td align="right">
                    <span style="display:inline-block;padding:4px 12px;border-radius:20px;background:#00C89622;color:#00C896;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;border:1px solid #00C89644;">👥 ${isEn ? 'TEAM REPORT' : 'REPORTE DE EQUIPO'}</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Title + Team Score -->
          <tr>
            <td style="padding:28px 32px 20px;">
              <p style="margin:0 0 4px;font-size:13px;color:#888;text-transform:uppercase;letter-spacing:0.1em;">
                ${isEn ? 'Weekly Team Report' : 'Reporte Semanal del Equipo'}
              </p>
              <p style="margin:0 0 4px;font-size:20px;font-weight:700;color:#f2f2f2;">
                ${isEn ? 'Coach' : 'Coach'} ${coachName}
              </p>
              <p style="margin:0 0 16px;font-size:13px;color:#666;">${dateRange}</p>
              <table role="presentation" cellpadding="0" cellspacing="0" style="background:linear-gradient(135deg,${tc}11,${tc}05);border:1px solid ${tc}33;border-radius:10px;">
                <tr>
                  <td style="padding:14px 24px;">
                    <span style="font-size:12px;color:#888;text-transform:uppercase;letter-spacing:0.1em;">${isEn ? 'Team Average Score' : 'Score Promedio del Equipo'}: </span>
                    <span style="font-size:28px;font-weight:800;color:${tc};margin-left:8px;">${teamAvgScore != null ? teamAvgScore : '--'}</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Athlete Table -->
          <tr>
            <td style="padding:0 32px 20px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #1e1e2e;border-radius:10px;overflow:hidden;">
                <tr style="background:#1a1a25;">
                  <td style="padding:10px 12px;font-size:11px;color:#888;text-transform:uppercase;letter-spacing:0.08em;font-weight:700;">${isEn ? 'Athlete' : 'Atleta'}</td>
                  <td style="padding:10px 8px;font-size:11px;color:#888;text-transform:uppercase;letter-spacing:0.08em;font-weight:700;text-align:center;">Score</td>
                  <td style="padding:10px 8px;font-size:11px;color:#888;text-transform:uppercase;letter-spacing:0.08em;font-weight:700;text-align:center;">HRV</td>
                  <td style="padding:10px 8px;font-size:11px;color:#888;text-transform:uppercase;letter-spacing:0.08em;font-weight:700;text-align:center;">RHR</td>
                  <td style="padding:10px 8px;font-size:11px;color:#888;text-transform:uppercase;letter-spacing:0.08em;font-weight:700;text-align:center;">${isEn ? 'Sleep' : 'Sueño'}</td>
                  <td style="padding:10px 8px;font-size:11px;color:#888;text-transform:uppercase;letter-spacing:0.08em;font-weight:700;text-align:center;">${isEn ? 'Alert' : 'Alerta'}</td>
                </tr>
                ${athleteTableRows}
              </table>
            </td>
          </tr>

          ${alertSection}

          <!-- CTA Button -->
          <tr>
            <td style="padding:8px 32px 32px;" align="center">
              <table role="presentation" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="border-radius:999px;background:#00C896;box-shadow:0 0 20px rgba(0,200,150,0.25);">
                    <a href="https://wellaryn.com/dashboard/team" style="display:inline-block;padding:14px 32px;color:#0a0a0f;font-size:14px;font-weight:700;text-decoration:none;letter-spacing:0.02em;">
                      ${isEn ? 'View Team Dashboard' : 'Ver Dashboard del Equipo'} →
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:24px 32px;border-top:1px solid #1e1e2e;text-align:center;">
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

// ─── Send email via Resend ────────────────────────────────────

async function sendEmail({ to, subject, html }) {
  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) return false;

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Wellaryn <reports@wellaryn.com>',
        to: [to],
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
    const now = new Date();

    // Date range: last 7 days
    const weekEnd = new Date(now);
    weekEnd.setDate(weekEnd.getDate() - 1); // yesterday
    const weekStart = new Date(weekEnd);
    weekStart.setDate(weekStart.getDate() - 6); // 7 days total

    // Previous week for comparison
    const prevWeekEnd = new Date(weekStart);
    prevWeekEnd.setDate(prevWeekEnd.getDate() - 1);
    const prevWeekStart = new Date(prevWeekEnd);
    prevWeekStart.setDate(prevWeekStart.getDate() - 6);

    const weekEndStr = weekEnd.toISOString().split('T')[0];
    const weekStartStr = weekStart.toISOString().split('T')[0];
    const prevWeekStartStr = prevWeekStart.toISOString().split('T')[0];

    // Need 28 days of data for ACWR calculations (14 days before current week start)
    const dataStartDate = new Date(weekStart);
    dataStartDate.setDate(dataStartDate.getDate() - 14);
    const dataStartStr = dataStartDate.toISOString().split('T')[0];

    // 1. Fetch all profiles
    const { data: allProfiles, error: profileError } = await supabase
      .from('profiles')
      .select('id, display_name, email, language, role, has_injury_history');

    if (profileError) {
      console.error('Error fetching profiles:', profileError);
      return NextResponse.json({ error: 'Failed to fetch profiles' }, { status: 500 });
    }

    if (!allProfiles || allProfiles.length === 0) {
      return NextResponse.json({ athletes_reported: 0, coaches_reported: 0, emails_sent: 0 });
    }

    const profileMap = {};
    for (const p of allProfiles) {
      profileMap[p.id] = p;
    }

    const athletes = allProfiles.filter(p => p.role === 'athlete' || !p.role);
    const coachesAndDoctors = allProfiles.filter(p => p.role === 'coach' || p.role === 'doctor');

    // 2. Fetch metrics for all athletes (last ~28 days)
    const athleteIds = athletes.map(a => a.id);

    let allMetrics = [];
    if (athleteIds.length > 0) {
      const { data: metricsData } = await supabase
        .from('daily_metrics')
        .select('*')
        .in('user_id', athleteIds)
        .gte('date', dataStartStr)
        .lte('date', weekEndStr)
        .order('date', { ascending: true });

      allMetrics = metricsData || [];
    }

    // Group metrics by athlete
    const metricsByAthlete = {};
    for (const m of allMetrics) {
      if (!metricsByAthlete[m.user_id]) metricsByAthlete[m.user_id] = [];
      metricsByAthlete[m.user_id].push(m);
    }

    let athletesReported = 0;
    let coachesReported = 0;
    let emailsSent = 0;

    // Store computed stats per athlete for coach reports
    const athleteStatsMap = {};

    // 3. Process each athlete
    for (const athlete of athletes) {
      const allAthleteMetrics = metricsByAthlete[athlete.id] || [];
      if (allAthleteMetrics.length === 0) continue;

      const lang = athlete.language || 'es';
      const weekMetrics = allAthleteMetrics.filter(m => m.date >= weekStartStr && m.date <= weekEndStr);
      const prevWeekMetrics = allAthleteMetrics.filter(m => m.date >= prevWeekStartStr && m.date < weekStartStr);

      if (weekMetrics.length === 0) continue;

      const stats = computeWeeklyStats(weekMetrics, allAthleteMetrics, athlete, lang);
      const prevStats = prevWeekMetrics.length > 0
        ? computeWeeklyStats(prevWeekMetrics, allAthleteMetrics, athlete, lang)
        : null;

      // Store for coach usage
      athleteStatsMap[athlete.id] = { stats, prevStats };

      const dateRange = `${formatDate(weekStartStr, lang)} - ${formatDate(weekEndStr, lang)}, ${weekEnd.getUTCFullYear()}`;

      const html = buildAthleteEmailHtml({
        athleteName: athlete.display_name || (lang === 'es' ? 'Atleta' : 'Athlete'),
        stats,
        prevStats,
        dateRange,
        lang,
      });

      athletesReported++;

      // Send email
      if (process.env.RESEND_API_KEY && athlete.email) {
        const subject = lang === 'es'
          ? `📊 Tu Reporte Semanal Wellaryn — Score: ${stats.avgScore ?? '--'}`
          : `📊 Your Weekly Wellaryn Report — Score: ${stats.avgScore ?? '--'}`;

        const sent = await sendEmail({ to: athlete.email, subject, html });
        if (sent) emailsSent++;
      }
    }

    // 4. Process each coach/doctor
    for (const coach of coachesAndDoctors) {
      // Fetch accepted relationships
      const { data: relationships } = await supabase
        .from('coach_athletes')
        .select('athlete_id')
        .eq('coach_id', coach.id)
        .eq('status', 'accepted');

      if (!relationships || relationships.length === 0) continue;

      const lang = coach.language || 'es';
      const dateRange = `${formatDate(weekStartStr, lang)} - ${formatDate(weekEndStr, lang)}, ${weekEnd.getUTCFullYear()}`;

      const athleteRows = [];

      for (const rel of relationships) {
        const athleteProfile = profileMap[rel.athlete_id];
        if (!athleteProfile) continue;

        // Use pre-computed stats or compute
        let stats, prevStats;
        if (athleteStatsMap[rel.athlete_id]) {
          stats = athleteStatsMap[rel.athlete_id].stats;
          prevStats = athleteStatsMap[rel.athlete_id].prevStats;
        } else {
          // Athlete wasn't in the athlete loop (maybe no role set), compute now
          const athleteMetrics = metricsByAthlete[rel.athlete_id];
          if (!athleteMetrics || athleteMetrics.length === 0) continue;

          // Also fetch metrics if not already loaded
          if (!athleteMetrics) {
            const { data: mData } = await supabase
              .from('daily_metrics')
              .select('*')
              .eq('user_id', rel.athlete_id)
              .gte('date', dataStartStr)
              .lte('date', weekEndStr)
              .order('date', { ascending: true });

            if (!mData || mData.length === 0) continue;
            metricsByAthlete[rel.athlete_id] = mData;
          }

          const am = metricsByAthlete[rel.athlete_id];
          const wm = am.filter(m => m.date >= weekStartStr && m.date <= weekEndStr);
          const pm = am.filter(m => m.date >= prevWeekStartStr && m.date < weekStartStr);

          if (wm.length === 0) continue;

          stats = computeWeeklyStats(wm, am, athleteProfile, lang);
          prevStats = pm.length > 0 ? computeWeeklyStats(pm, am, athleteProfile, lang) : null;
        }

        athleteRows.push({
          name: athleteProfile.display_name || (lang === 'es' ? 'Atleta' : 'Athlete'),
          avgScore: stats.avgScore,
          avgHRV: stats.avgHRV,
          avgRHR: stats.avgRHR,
          avgSleep: stats.avgSleep,
          acwr: stats.acwr,
          trainingDays: stats.trainingDays,
        });
      }

      if (athleteRows.length === 0) continue;

      const validTeamScores = athleteRows.filter(a => a.avgScore != null).map(a => a.avgScore);
      const teamAvgScore = validTeamScores.length > 0 ? Math.round(avg(validTeamScores)) : null;

      const html = buildCoachEmailHtml({
        coachName: coach.display_name || 'Coach',
        athleteRows,
        teamAvgScore,
        dateRange,
        lang,
      });

      coachesReported++;

      // Send email
      if (process.env.RESEND_API_KEY && coach.email) {
        const subject = lang === 'es'
          ? `👥 Reporte Semanal del Equipo — ${athleteRows.length} atletas`
          : `👥 Weekly Team Report — ${athleteRows.length} athletes`;

        const sent = await sendEmail({ to: coach.email, subject, html });
        if (sent) emailsSent++;
      }
    }

    return NextResponse.json({
      athletes_reported: athletesReported,
      coaches_reported: coachesReported,
      emails_sent: emailsSent,
    });
  } catch (err) {
    console.error('Weekly report error:', err);
    return NextResponse.json({ error: 'Report generation failed', details: err.message }, { status: 500 });
  }
}
