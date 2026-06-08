import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, RefreshControl,
  TouchableOpacity, Dimensions,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import Svg, { Circle } from 'react-native-svg';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { calculateWellarynScore, metricsToWellarynInput, getBand } from '../../shared/wellaryn-score';
import { colors, spacing, radius, fonts } from '../theme';

const { width } = Dimensions.get('window');

function ScoreRing({ score, size = 180 }) {
  const strokeWidth = 12;
  const r = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * r;
  const progress = (score / 100) * circumference;
  const band = getBand(score);
  const scoreColor = score >= 80 ? colors.green : score >= 60 ? colors.yellow : colors.red;

  return (
    <View style={{ alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size}>
        <Circle
          cx={size / 2} cy={size / 2} r={r}
          stroke={colors.borderSubtle} strokeWidth={strokeWidth} fill="none"
        />
        <Circle
          cx={size / 2} cy={size / 2} r={r}
          stroke={scoreColor} strokeWidth={strokeWidth} fill="none"
          strokeDasharray={`${progress} ${circumference}`}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }]}>
        <Text style={[styles.scoreNumber, { color: scoreColor }]}>{score}</Text>
        <Text style={styles.scoreLabel}>READINESS</Text>
      </View>
    </View>
  );
}

function MetricCard({ icon, label, value, unit, color }) {
  return (
    <View style={styles.metricCard}>
      <Text style={styles.metricIcon}>{icon}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={[styles.metricValue, color && { color }]}>{value}</Text>
      {unit && <Text style={styles.metricUnit}>{unit}</Text>}
    </View>
  );
}

export default function DashboardScreen() {
  const { user, profile } = useAuth();
  const [metrics, setMetrics] = useState([]);
  const [score, setScore] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!user) return;
    try {
      const { data } = await supabase
        .from('daily_metrics')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: false })
        .limit(14);

      setMetrics(data || []);

      if (data && data.length > 0) {
        const input = metricsToWellarynInput(data, profile);
        const result = calculateWellarynScore(input);
        setScore(result);
      }
    } catch (err) {
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [user, profile]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  }, [fetchData]);

  const today = metrics[0] || {};
  const greeting = new Date().getHours() < 12 ? 'Buenos días' : new Date().getHours() < 18 ? 'Buenas tardes' : 'Buenas noches';
  const displayName = profile?.display_name?.split(' ')[0] || 'Atleta';

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
      >
        {/* Header */}
        <Text style={styles.greeting}>{greeting}, {displayName}</Text>
        <Text style={styles.dateText}>
          {new Date().toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </Text>

        {/* Score Ring */}
        <View style={styles.scoreContainer}>
          <ScoreRing score={score?.score || 0} />
          {score && (
            <View style={styles.bandBadge}>
              <Text style={styles.bandText}>{score.category}</Text>
            </View>
          )}
        </View>

        {/* Sub-scores */}
        {score && (
          <View style={styles.subScoresRow}>
            {[
              { label: 'Recovery', value: score.subScores.recovery, icon: '💚' },
              { label: 'Readiness', value: score.subScores.readiness, icon: '⚡' },
              { label: 'Training', value: score.subScores.trainingLoad, icon: '🏋️' },
              { label: 'Injury', value: score.subScores.injuryRisk, icon: '🦴' },
            ].map((sub) => (
              <View key={sub.label} style={styles.subScoreItem}>
                <Text style={styles.subScoreIcon}>{sub.icon}</Text>
                <Text style={styles.subScoreValue}>{sub.value}</Text>
                <Text style={styles.subScoreLabel}>{sub.label}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Today's Metrics */}
        <Text style={styles.sectionTitle}>Métricas de Hoy</Text>
        <View style={styles.metricsGrid}>
          <MetricCard icon="💓" label="HRV" value={today.hrv_rmssd?.toFixed(0) || '—'} unit="ms" color={colors.blue} />
          <MetricCard icon="❤️" label="RHR" value={today.resting_hr?.toFixed(0) || '—'} unit="bpm" color={colors.red} />
          <MetricCard icon="😴" label="Sueño" value={today.sleep_hours?.toFixed(1) || '—'} unit="hrs" color={colors.accent} />
          <MetricCard icon="👣" label="Pasos" value={today.steps?.toLocaleString() || '—'} color={colors.yellow} />
          <MetricCard icon="🔥" label="Calorías" value={today.calories?.toLocaleString() || '—'} color={colors.orange} />
          <MetricCard icon="⚡" label="Energía" value={today.energy || '—'} unit="/10" color={colors.green} />
        </View>

        {/* Recommendation */}
        {score && (
          <View style={styles.recommendationCard}>
            <Text style={styles.recommendationIcon}>💡</Text>
            <Text style={styles.recommendationText}>{score.message?.es || score.message?.en}</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  scrollContent: { padding: spacing.xl, paddingTop: 60 },
  greeting: { fontSize: 26, ...fonts.bold, color: colors.textPrimary },
  dateText: { fontSize: 14, color: colors.textMuted, marginTop: 4, marginBottom: spacing.xxl },
  scoreContainer: { alignItems: 'center', marginBottom: spacing.xl },
  scoreNumber: { fontSize: 52, ...fonts.bold },
  scoreLabel: { fontSize: 11, ...fonts.semibold, color: colors.textMuted, letterSpacing: 2 },
  bandBadge: {
    marginTop: spacing.md,
    backgroundColor: colors.accentSubtle,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.accent,
  },
  bandText: { fontSize: 13, ...fonts.bold, color: colors.accent, textTransform: 'uppercase' },
  subScoresRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: colors.bgElevated,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.xxl,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  subScoreItem: { alignItems: 'center' },
  subScoreIcon: { fontSize: 20, marginBottom: 4 },
  subScoreValue: { fontSize: 18, ...fonts.bold, color: colors.textPrimary },
  subScoreLabel: { fontSize: 10, color: colors.textMuted, marginTop: 2 },
  sectionTitle: { fontSize: 18, ...fonts.bold, color: colors.textPrimary, marginBottom: spacing.lg },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginBottom: spacing.xxl,
  },
  metricCard: {
    width: (width - spacing.xl * 2 - spacing.md * 2) / 3,
    backgroundColor: colors.bgElevated,
    borderRadius: radius.lg,
    padding: spacing.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  metricIcon: { fontSize: 22, marginBottom: spacing.sm },
  metricLabel: { fontSize: 11, color: colors.textMuted, marginBottom: 4, ...fonts.medium },
  metricValue: { fontSize: 20, ...fonts.bold, color: colors.textPrimary },
  metricUnit: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  recommendationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bgElevated,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    gap: spacing.md,
    marginBottom: spacing.xxxl,
  },
  recommendationIcon: { fontSize: 24 },
  recommendationText: { flex: 1, fontSize: 14, color: colors.textSecondary, lineHeight: 20 },
});
