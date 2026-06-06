import { getSupabaseBrowser } from './client';
import { calculateWellarynScore } from '../wellaryn-score';

// ─── Save today's metrics ─────────────────────────────────────
// Upsert by (user_id, date) — re-submitting the same day updates

export async function saveDailyMetrics(userId, metrics) {
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

// ─── Save Wellaryn Score to audit trail ───────────────────────

export async function saveReadinessScore(userId, wellarynResult) {
  const supabase = getSupabaseBrowser();
  const today = new Date().toISOString().split('T')[0];
  try {
    const { error } = await supabase
      .from('readiness_scores')
      .upsert({
        user_id: userId,
        date: today,
        score: wellarynResult.score,
        band: wellarynResult.category,
        zone: wellarynResult.score >= 80 ? 'green' : wellarynResult.score >= 60 ? 'yellow' : wellarynResult.score >= 40 ? 'orange' : 'red',
        // New sub-scores format
        recovery_score: wellarynResult.subScores?.recovery,
        readiness_score: wellarynResult.subScores?.readiness,
        training_load_score: wellarynResult.subScores?.trainingLoad,
        injury_risk_score: wellarynResult.subScores?.injuryRisk,
        lifestyle_score: wellarynResult.subScores?.lifestyle,
        confidence: wellarynResult.confidence,
        // Legacy columns — set to null if old columns still exist
        hrv_score: null,
        sleep_score: null,
        acwr_score: wellarynResult.subScores?.trainingLoad,
        rhr_score: null,
        weakest_component: null,
        recommendations: JSON.stringify(wellarynResult.message),
      }, { onConflict: 'user_id,date' });
    if (error) console.error('Error saving readiness score:', error);
  } catch (err) {
    console.error('Error saving readiness score:', err);
  }
}

// ─── Convert daily_metrics rows → Wellaryn Score input ────────

export function metricsToWellarynInput(allMetrics, profile) {
  if (!allMetrics || allMetrics.length === 0) return null;

  const today = allMetrics[allMetrics.length - 1];
  const hasCheckin = today.energy != null || today.stress != null;

  // Gather 7-day sleep schedule for regularity
  const last7 = allMetrics.slice(-7);
  const bedtimeMinutes = last7.filter(m => m.bedtime_minutes != null).map(m => m.bedtime_minutes);
  const wakeTimeMinutes = last7.filter(m => m.wake_time_minutes != null).map(m => m.wake_time_minutes);

  // Recovery days in last 7
  const recoveryDaysCount = last7.filter(m => (m.modality_count || 0) > 0).length;

  // Training sessions for ACWR (14 days)
  const last14 = allMetrics.slice(-14);
  const sessions = last14
    .filter(m => m.training_load != null && m.training_load > 0)
    .map(m => ({
      date: m.date,
      durationMinutes: m.training_duration || 0,
      intensity: m.training_rpe || 0,
    }));

  // Distinct days for confidence
  const distinctDays = new Set(allMetrics.map(m => m.date)).size;

  return {
    recovery: {
      sleepHours: today.sleep_total,
      sleepQuality: today.sleep_quality,
      hasRecoveryEntry: (today.modality_count || 0) > 0 || today.recovery_score != null,
      modalityCount: today.modality_count || 0,
      recoveryScore: today.recovery_score,
    },
    readiness: {
      hasCheckin,
      energy: today.energy,
      motivation: today.motivation,
      stress: today.stress,
      fatigue: today.fatigue,
    },
    trainingLoad: {
      sessions,
      today: new Date(),
    },
    injuryRisk: {
      hasCheckin,
      painLevel: today.pain_level,
      muscleSoreness: today.muscle_soreness,
      currentPainAreaCount: (today.pain_areas || []).length,
      hasInjuryHistory: profile?.has_injury_history || false,
    },
    lifestyle: {
      bedtimeMinutes,
      wakeTimeMinutes,
      recoveryDaysCount,
      hasCheckin,
      waterGlasses: today.water_glasses,
      alcoholDrinks: today.alcohol_drinks,
      lateCaffeine: today.late_caffeine || false,
    },
    distinctDays,
  };
}

// ─── LEGACY: Convert daily_metrics rows → old readiness.js input ─
// Kept for backward compatibility — pages should migrate to metricsToWellarynInput

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

// ─── Coach/Doctor Functions ──────────────────────────────────

export async function fetchCoachAthletes(coachId) {
  const supabase = getSupabaseBrowser();
  // Get all accepted athlete relationships with their profiles and latest metrics
  const { data: relationships, error: relError } = await supabase
    .from('coach_athletes')
    .select('id, athlete_id, coach_role, status, created_at, accepted_at')
    .eq('coach_id', coachId)
    .order('created_at', { ascending: false });

  if (relError) throw relError;
  if (!relationships || relationships.length === 0) return [];

  // For each accepted athlete, fetch their profile and latest metrics
  const athletes = await Promise.all(
    relationships.map(async (rel) => {
      const [profileRes, metricsRes] = await Promise.all([
        supabase.from('profiles').select('id, display_name, email, sport, age, role').eq('id', rel.athlete_id).maybeSingle(),
        rel.status === 'accepted'
          ? supabase.from('daily_metrics').select('*').eq('user_id', rel.athlete_id).order('date', { ascending: false }).limit(7)
          : Promise.resolve({ data: [], error: null }),
      ]);
      return {
        ...rel,
        profile: profileRes.data,
        recentMetrics: metricsRes.data || [],
      };
    })
  );

  return athletes;
}

export async function fetchPendingInvites(coachId) {
  const supabase = getSupabaseBrowser();
  const { data, error } = await supabase
    .from('coach_athletes')
    .select('id, athlete_id, invite_code, status, created_at')
    .eq('coach_id', coachId)
    .eq('status', 'pending');
  if (error) throw error;
  return data || [];
}

export async function inviteAthlete(coachId, coachRole) {
  const supabase = getSupabaseBrowser();
  const inviteCode = `WEL-${coachRole.toUpperCase().slice(0,1)}-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2,6).toUpperCase()}`;
  
  const { data, error } = await supabase
    .from('coach_athletes')
    .insert({
      coach_id: coachId,
      athlete_id: coachId, // placeholder — will be updated when athlete accepts
      coach_role: coachRole,
      invite_code: inviteCode,
      status: 'pending',
    })
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

export async function fetchInviteByCode(code) {
  const supabase = getSupabaseBrowser();
  const { data, error } = await supabase
    .from('coach_athletes')
    .select('id, coach_id, coach_role, invite_code, status')
    .eq('invite_code', code)
    .eq('status', 'pending')
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function acceptInvite(inviteId, athleteId) {
  const supabase = getSupabaseBrowser();
  const { data, error } = await supabase
    .from('coach_athletes')
    .update({
      athlete_id: athleteId,
      status: 'accepted',
      accepted_at: new Date().toISOString(),
    })
    .eq('id', inviteId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function removeAthlete(coachId, relationshipId) {
  const supabase = getSupabaseBrowser();
  const { error } = await supabase
    .from('coach_athletes')
    .delete()
    .eq('id', relationshipId)
    .eq('coach_id', coachId);
  if (error) throw error;
}
