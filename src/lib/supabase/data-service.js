import { getSupabaseBrowser } from './client';

// ─── Save today's metrics ─────────────────────────────────────
// Upsert by (user_id, date) — re-submitting the same day updates

export async function saveDailyMetrics(userId, metrics) {
  // metrics: { date, hrv_rmssd, rhr, sleep_total, sleep_deep, sleep_rem, sleep_light,
  //            training_load, training_rpe, training_duration, training_type,
  //            stress, mood, steps, calories, source }
  const supabase = getSupabaseBrowser();
  const { data, error } = await supabase
    .from('daily_metrics')
    .upsert({ user_id: userId, ...metrics }, { onConflict: 'user_id,date' })
    .select()
    .maybeSingle();
  if (error) throw error;
  return data;
}

// ─── Fetch N days of history for a user ───────────────────────

export async function fetchDailyMetrics(userId, days = 60) {
  const supabase = getSupabaseBrowser();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  const { data, error } = await supabase
    .from('daily_metrics')
    .select('*')
    .eq('user_id', userId)
    .gte('date', startDate.toISOString().split('T')[0])
    .order('date', { ascending: true });
  if (error) throw error;
  return data || [];
}

// ─── Fetch today's entry ──────────────────────────────────────

export async function fetchTodayMetrics(userId) {
  const supabase = getSupabaseBrowser();
  const today = new Date().toISOString().split('T')[0];
  const { data, error } = await supabase
    .from('daily_metrics')
    .select('*')
    .eq('user_id', userId)
    .eq('date', today)
    .maybeSingle();
  if (error) throw error;
  return data;
}

// ─── Save readiness score to audit trail ──────────────────────

export async function saveReadinessScore(userId, score) {
  const supabase = getSupabaseBrowser();
  const today = new Date().toISOString().split('T')[0];
  const { error } = await supabase
    .from('readiness_scores')
    .upsert({
      user_id: userId,
      date: today,
      score: score.score,
      band: score.band,
      zone: score.zone,
      hrv_score: score.subScores?.hrv?.score,
      sleep_score: score.subScores?.sleep?.score,
      acwr_score: score.subScores?.acwr?.score,
      rhr_score: score.subScores?.rhr?.score,
      confidence: score.confidence,
      weakest_component: score.weakestComponent,
      recommendations: JSON.stringify(score.recommendations),
    }, { onConflict: 'user_id,date' });
  if (error) console.error('Error saving readiness score:', error);
}

// ─── Convert daily_metrics rows → readiness.js input ──────────

export function metricsToReadinessInput(metrics, profile) {
  if (!metrics || metrics.length === 0) return null;

  const today = metrics[metrics.length - 1];
  const rmssdHistory = metrics.filter(m => m.hrv_rmssd != null).map(m => m.hrv_rmssd);
  const rhrHistory = metrics.filter(m => m.rhr != null).map(m => m.rhr);
  const sleepHistory = metrics.filter(m => m.sleep_total != null).map(m => m.sleep_total);
  const loadHistory = metrics.filter(m => m.training_load != null).map(m => m.training_load);

  const todayInput = {
    rmssd: today.hrv_rmssd,
    rhr: today.rhr,
    sleepHours: today.sleep_total,
    sleepNeed: profile?.sleep_need || 8,
    stress: today.stress,
    mood: today.mood,
  };

  const historyInput = { rmssdHistory, rhrHistory, sleepHistory, loadHistory };

  return { todayInput, historyInput };
}

// ─── Convert daily_metrics rows → chart data formats ──────────

export function metricsToChartData(metrics) {
  const hrvChartData = metrics
    .filter(m => m.hrv_rmssd != null)
    .slice(-7)
    .map(m => ({ date: m.date, rmssd: m.hrv_rmssd }));

  const sleepChartData = metrics
    .filter(m => m.sleep_total != null)
    .slice(-7)
    .map(m => ({
      date: m.date,
      deep: m.sleep_deep || 0,
      rem: m.sleep_rem || 0,
      light: m.sleep_light || 0,
      total: m.sleep_total,
    }));

  const trainingChartData = metrics
    .filter(m => m.training_load != null)
    .slice(-14)
    .map(m => ({ date: m.date, load: m.training_load }));

  return { hrvChartData, sleepChartData, trainingChartData };
}
