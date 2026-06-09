import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  RefreshControl, TextInput, Alert, Modal,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import Svg, { Circle } from 'react-native-svg';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { colors, spacing, radius, fonts } from '../theme';

function ProgressRing({ progress, size = 48, strokeWidth = 4, color = colors.accent }) {
  const r = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * r;
  const strokeDashoffset = circumference * (1 - Math.min(progress, 1));
  return (
    <Svg width={size} height={size}>
      <Circle cx={size/2} cy={size/2} r={r} fill="none" stroke={colors.bgElevated} strokeWidth={strokeWidth} />
      <Circle
        cx={size/2} cy={size/2} r={r} fill="none"
        stroke={color} strokeWidth={strokeWidth}
        strokeDasharray={circumference} strokeDashoffset={strokeDashoffset}
        strokeLinecap="round"
        transform={`rotate(-90 ${size/2} ${size/2})`}
      />
    </Svg>
  );
}

function GoalCard({ goal, onUpdate }) {
  const progress = goal.target_value > 0 ? goal.current_value / goal.target_value : 0;
  const pct = Math.round(progress * 100);
  const completed = goal.status === 'completed';
  const statusColors = {
    active: colors.accent,
    completed: colors.green,
    paused: colors.yellow,
  };
  const color = statusColors[goal.status] || colors.accent;

  return (
    <TouchableOpacity style={styles.goalCard} onPress={onUpdate} activeOpacity={0.7}>
      <View style={styles.goalRow}>
        <ProgressRing progress={progress} color={color} />
        <View style={styles.goalInfo}>
          <Text style={styles.goalTitle}>{goal.title}</Text>
          <Text style={styles.goalMeta}>
            {goal.current_value} / {goal.target_value} {goal.unit || ''}
          </Text>
        </View>
        <View style={styles.goalRight}>
          <Text style={[styles.goalPct, { color }]}>{pct}%</Text>
          {completed && <Text style={styles.goalCheck}>✓</Text>}
        </View>
      </View>
      {goal.description && (
        <Text style={styles.goalDesc} numberOfLines={2}>{goal.description}</Text>
      )}
      {/* Progress bar */}
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${Math.min(pct, 100)}%`, backgroundColor: color }]} />
      </View>
    </TouchableOpacity>
  );
}

export default function GoalsScreen() {
  const { user } = useAuth();
  const [goals, setGoals] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [newGoal, setNewGoal] = useState({ title: '', target_value: '', unit: '', description: '' });
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState('all');

  const fetchGoals = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('athlete_goals')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    setGoals(data || []);
  }, [user]);

  useEffect(() => { fetchGoals(); }, [fetchGoals]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchGoals();
    setRefreshing(false);
  }, [fetchGoals]);

  const handleCreate = async () => {
    if (!newGoal.title.trim() || !newGoal.target_value) return;
    setSaving(true);
    const { error } = await supabase.from('athlete_goals').insert({
      user_id: user.id,
      title: newGoal.title.trim(),
      target_value: parseFloat(newGoal.target_value),
      unit: newGoal.unit.trim() || null,
      description: newGoal.description.trim() || null,
      current_value: 0,
      status: 'active',
    });
    if (error) Alert.alert('Error', error.message);
    else {
      setShowModal(false);
      setNewGoal({ title: '', target_value: '', unit: '', description: '' });
      fetchGoals();
    }
    setSaving(false);
  };

  const handleUpdateProgress = (goal) => {
    Alert.prompt(
      'Actualizar progreso',
      `¿Cuál es tu progreso actual para "${goal.title}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Guardar',
          onPress: async (value) => {
            const newValue = parseFloat(value);
            if (isNaN(newValue)) return;
            const status = newValue >= goal.target_value ? 'completed' : 'active';
            await supabase.from('athlete_goals').update({ current_value: newValue, status }).eq('id', goal.id);
            fetchGoals();
          },
        },
      ],
      'plain-text',
      String(goal.current_value)
    );
  };

  const filteredGoals = filter === 'all' ? goals : goals.filter(g => g.status === filter);
  const activeCount = goals.filter(g => g.status === 'active').length;
  const completedCount = goals.filter(g => g.status === 'completed').length;

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Metas</Text>
          <TouchableOpacity style={styles.addBtn} onPress={() => setShowModal(true)}>
            <Text style={styles.addBtnText}>+ Nueva</Text>
          </TouchableOpacity>
        </View>

        {/* Stats row */}
        <View style={styles.statsRow}>
          <View style={styles.statBubble}>
            <Text style={styles.statNum}>{goals.length}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>
          <View style={styles.statBubble}>
            <Text style={[styles.statNum, { color: colors.accent }]}>{activeCount}</Text>
            <Text style={styles.statLabel}>Activas</Text>
          </View>
          <View style={styles.statBubble}>
            <Text style={[styles.statNum, { color: colors.green }]}>{completedCount}</Text>
            <Text style={styles.statLabel}>Completadas</Text>
          </View>
        </View>

        {/* Filter */}
        <View style={styles.filterRow}>
          {[['all', 'Todas'], ['active', 'Activas'], ['completed', 'Logradas']].map(([key, label]) => (
            <TouchableOpacity
              key={key}
              style={[styles.filterBtn, filter === key && styles.filterBtnActive]}
              onPress={() => setFilter(key)}
            >
              <Text style={[styles.filterBtnText, filter === key && styles.filterBtnTextActive]}>{label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Goals list */}
        {filteredGoals.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>🎯</Text>
            <Text style={styles.emptyTitle}>Sin metas</Text>
            <Text style={styles.emptyDesc}>Crea tu primera meta para empezar a trackear tu progreso</Text>
          </View>
        ) : (
          filteredGoals.map(goal => (
            <GoalCard key={goal.id} goal={goal} onUpdate={() => handleUpdateProgress(goal)} />
          ))
        )}
      </ScrollView>

      {/* Create Goal Modal */}
      <Modal visible={showModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Nueva Meta</Text>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.modalInput}
              placeholder="Nombre de la meta"
              placeholderTextColor={colors.textMuted}
              value={newGoal.title}
              onChangeText={v => setNewGoal(g => ({ ...g, title: v }))}
            />
            <View style={styles.modalRow}>
              <TextInput
                style={[styles.modalInput, { flex: 2 }]}
                placeholder="Valor objetivo"
                placeholderTextColor={colors.textMuted}
                keyboardType="numeric"
                value={newGoal.target_value}
                onChangeText={v => setNewGoal(g => ({ ...g, target_value: v }))}
              />
              <TextInput
                style={[styles.modalInput, { flex: 1 }]}
                placeholder="Unidad"
                placeholderTextColor={colors.textMuted}
                value={newGoal.unit}
                onChangeText={v => setNewGoal(g => ({ ...g, unit: v }))}
              />
            </View>
            <TextInput
              style={[styles.modalInput, { height: 80 }]}
              placeholder="Descripción (opcional)"
              placeholderTextColor={colors.textMuted}
              multiline
              value={newGoal.description}
              onChangeText={v => setNewGoal(g => ({ ...g, description: v }))}
            />
            <TouchableOpacity
              style={[styles.modalSaveBtn, saving && { opacity: 0.5 }]}
              onPress={handleCreate}
              disabled={saving}
            >
              <Text style={styles.modalSaveBtnText}>{saving ? 'Guardando...' : 'Crear Meta'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  scrollContent: { padding: spacing.xl, paddingTop: 60, paddingBottom: 100 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.lg },
  title: { fontSize: 28, ...fonts.bold, color: colors.textPrimary },
  addBtn: {
    paddingHorizontal: spacing.lg, paddingVertical: spacing.sm,
    borderRadius: radius.full, backgroundColor: colors.accent,
  },
  addBtnText: { fontSize: 14, ...fonts.bold, color: '#fff' },
  // Stats
  statsRow: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.xl },
  statBubble: {
    flex: 1, alignItems: 'center', paddingVertical: spacing.md,
    backgroundColor: colors.bgElevated, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.glassBorder,
  },
  statNum: { fontSize: 22, ...fonts.bold, color: colors.textPrimary },
  statLabel: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  // Filter
  filterRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.xl },
  filterBtn: {
    paddingHorizontal: spacing.lg, paddingVertical: spacing.sm,
    borderRadius: radius.full, backgroundColor: colors.bgElevated,
    borderWidth: 1, borderColor: colors.glassBorder,
  },
  filterBtnActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  filterBtnText: { fontSize: 13, ...fonts.semibold, color: colors.textMuted },
  filterBtnTextActive: { color: '#fff' },
  // Goal card
  goalCard: {
    backgroundColor: colors.bgElevated, borderRadius: radius.lg,
    padding: spacing.lg, marginBottom: spacing.md,
    borderWidth: 1, borderColor: colors.glassBorder,
  },
  goalRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  goalInfo: { flex: 1 },
  goalTitle: { fontSize: 16, ...fonts.semibold, color: colors.textPrimary },
  goalMeta: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  goalRight: { alignItems: 'center' },
  goalPct: { fontSize: 16, ...fonts.bold },
  goalCheck: { fontSize: 14, color: colors.green, marginTop: 2 },
  goalDesc: { fontSize: 13, color: colors.textSecondary, marginTop: spacing.sm },
  progressTrack: {
    height: 4, backgroundColor: colors.bg, borderRadius: 2, marginTop: spacing.md, overflow: 'hidden',
  },
  progressFill: { height: '100%', borderRadius: 2 },
  // Empty state
  emptyState: { alignItems: 'center', paddingTop: 60 },
  emptyIcon: { fontSize: 48, marginBottom: spacing.lg },
  emptyTitle: { fontSize: 18, ...fonts.bold, color: colors.textPrimary, marginBottom: spacing.sm },
  emptyDesc: { fontSize: 14, color: colors.textMuted, textAlign: 'center', paddingHorizontal: 40 },
  // Modal
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.bgElevated, borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: spacing.xl, paddingBottom: 40,
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.xl },
  modalTitle: { fontSize: 20, ...fonts.bold, color: colors.textPrimary },
  modalClose: { fontSize: 20, color: colors.textMuted },
  modalInput: {
    backgroundColor: colors.bg, borderRadius: radius.md, paddingHorizontal: spacing.lg, paddingVertical: 12,
    color: colors.textPrimary, fontSize: 15, marginBottom: spacing.md,
    borderWidth: 1, borderColor: colors.borderSubtle,
  },
  modalRow: { flexDirection: 'row', gap: spacing.md },
  modalSaveBtn: {
    backgroundColor: colors.accent, borderRadius: radius.full, paddingVertical: 14,
    alignItems: 'center', marginTop: spacing.md,
  },
  modalSaveBtnText: { fontSize: 16, ...fonts.bold, color: '#fff' },
});
