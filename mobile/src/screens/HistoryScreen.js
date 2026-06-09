import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  RefreshControl, Dimensions,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import Svg, { Polyline, Line, Circle, Text as SvgText } from 'react-native-svg';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { colors, spacing, radius, fonts } from '../theme';

const { width } = Dimensions.get('window');
const CHART_W = width - spacing.xl * 2 - spacing.lg * 2;
const CHART_H = 160;

function MiniChart({ data, label, unit, color, valueKey }) {
  if (!data || data.length < 2) {
    return (
      <View style={styles.chartCard}>
        <Text style={styles.chartLabel}>{label}</Text>
        <View style={[styles.chartArea, { justifyContent: 'center', alignItems: 'center' }]}>
          <Text style={styles.noData}>Sin datos suficientes</Text>
        </View>
      </View>
    );
  }

  const values = data.map(d => d[valueKey] || 0).reverse();
  const max = Math.max(...values, 1);
  const min = Math.min(...values);
  const range = max - min || 1;
  const latest = values[values.length - 1];
  const prev = values[values.length - 2];
  const trend = latest > prev ? '↑' : latest < prev ? '↓' : '→';
  const trendColor = latest >= prev ? colors.green : colors.red;

  const points = values.map((v, i) => {
    const x = (i / (values.length - 1)) * CHART_W;
    const y = CHART_H - ((v - min) / range) * (CHART_H - 20) - 10;
    return `${x},${y}`;
  }).join(' ');

  return (
    <View style={styles.chartCard}>
      <View style={styles.chartHeader}>
        <Text style={styles.chartLabel}>{label}</Text>
        <View style={styles.chartValueRow}>
          <Text style={[styles.chartValue, { color }]}>{latest?.toFixed(1)}</Text>
          <Text style={styles.chartUnit}>{unit}</Text>
          <Text style={[styles.chartTrend, { color: trendColor }]}>{trend}</Text>
        </View>
      </View>
      <Svg width={CHART_W} height={CHART_H} style={styles.chartSvg}>
        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((pct, i) => (
          <Line
            key={i}
            x1={0} y1={CHART_H * pct}
            x2={CHART_W} y2={CHART_H * pct}
            stroke={colors.borderSubtle} strokeWidth={1}
          />
        ))}
        {/* Line */}
        <Polyline
          points={points}
          fill="none"
          stroke={color}
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Last point dot */}
        {values.length > 0 && (() => {
          const lastX = CHART_W;
          const lastY = CHART_H - ((values[values.length - 1] - min) / range) * (CHART_H - 20) - 10;
          return <Circle cx={lastX} cy={lastY} r={4} fill={color} />;
        })()}
      </Svg>
    </View>
  );
}

export default function HistoryScreen() {
  const { user } = useAuth();
  const [metrics, setMetrics] = useState([]);
  const [range, setRange] = useState(7);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('daily_metrics')
      .select('*')
      .eq('user_id', user.id)
      .order('date', { ascending: false })
      .limit(range);
    setMetrics(data || []);
  }, [user, range]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  }, [fetchData]);

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
      >
        <Text style={styles.title}>Historial</Text>

        {/* Range Toggle */}
        <View style={styles.rangeToggle}>
          {[7, 14, 30].map(r => (
            <TouchableOpacity
              key={r}
              style={[styles.rangeBtn, range === r && styles.rangeBtnActive]}
              onPress={() => setRange(r)}
            >
              <Text style={[styles.rangeBtnText, range === r && styles.rangeBtnTextActive]}>
                {r}D
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Charts */}
        <MiniChart data={metrics} label="HRV" unit="ms" color={colors.blue} valueKey="hrv_rmssd" />
        <MiniChart data={metrics} label="Resting HR" unit="bpm" color={colors.red} valueKey="resting_hr" />
        <MiniChart data={metrics} label="Sueño" unit="hrs" color={colors.accent} valueKey="sleep_hours" />
        <MiniChart data={metrics} label="Pasos" unit="" color={colors.yellow} valueKey="steps" />
        <MiniChart data={metrics} label="Energía" unit="/10" color={colors.green} valueKey="energy" />
        <MiniChart data={metrics} label="Estrés" unit="/10" color={colors.orange} valueKey="stress" />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  scrollContent: { padding: spacing.xl, paddingTop: 60, paddingBottom: 100 },
  title: { fontSize: 28, ...fonts.bold, color: colors.textPrimary, marginBottom: spacing.lg },
  rangeToggle: {
    flexDirection: 'row', gap: spacing.sm,
    marginBottom: spacing.xxl, alignSelf: 'center',
  },
  rangeBtn: {
    paddingHorizontal: spacing.xl, paddingVertical: spacing.sm,
    borderRadius: radius.full, backgroundColor: colors.bgElevated,
    borderWidth: 1, borderColor: colors.glassBorder,
  },
  rangeBtnActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  rangeBtnText: { fontSize: 14, ...fonts.semibold, color: colors.textMuted },
  rangeBtnTextActive: { color: '#fff' },
  chartCard: {
    backgroundColor: colors.bgElevated, borderRadius: radius.lg,
    padding: spacing.lg, marginBottom: spacing.lg,
    borderWidth: 1, borderColor: colors.glassBorder,
  },
  chartHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
  chartLabel: { fontSize: 14, ...fonts.semibold, color: colors.textSecondary },
  chartValueRow: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
  chartValue: { fontSize: 22, ...fonts.bold },
  chartUnit: { fontSize: 12, color: colors.textMuted },
  chartTrend: { fontSize: 16, ...fonts.bold, marginLeft: 4 },
  chartSvg: { marginTop: spacing.sm },
  chartArea: { height: CHART_H },
  noData: { fontSize: 13, color: colors.textMuted },
});
