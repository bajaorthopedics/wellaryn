import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  RefreshControl, Alert, Switch,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { colors, spacing, radius, fonts } from '../theme';

const WEARABLES = [
  { key: 'oura', name: 'Oura Ring', emoji: '💍' },
  { key: 'whoop', name: 'WHOOP', emoji: '🟢' },
  { key: 'garmin', name: 'Garmin', emoji: '⌚' },
  { key: 'fitbit', name: 'Fitbit', emoji: '⌚' },
  { key: 'apple_health', name: 'Apple Health', emoji: '🍎' },
];

function SettingRow({ icon, label, value, onPress, rightElement }) {
  return (
    <TouchableOpacity style={styles.settingRow} onPress={onPress} activeOpacity={onPress ? 0.7 : 1}>
      <Text style={styles.settingIcon}>{icon}</Text>
      <View style={styles.settingInfo}>
        <Text style={styles.settingLabel}>{label}</Text>
        {value && <Text style={styles.settingValue}>{value}</Text>}
      </View>
      {rightElement || (onPress && <Text style={styles.settingArrow}>›</Text>)}
    </TouchableOpacity>
  );
}

function SectionHeader({ title }) {
  return <Text style={styles.sectionHeader}>{title}</Text>;
}

export default function ProfileScreen() {
  const { user, signOut } = useAuth();
  const [profile, setProfile] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  const fetchProfile = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();
    setProfile(data);
  }, [user]);

  useEffect(() => { fetchProfile(); }, [fetchProfile]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchProfile();
    setRefreshing(false);
  }, [fetchProfile]);

  const handleSignOut = () => {
    Alert.alert(
      'Cerrar sesión',
      '¿Estás seguro de que quieres salir?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Salir', style: 'destructive', onPress: signOut },
      ]
    );
  };

  const roleLabel = {
    athlete: '🏃 Atleta',
    coach: '📋 Coach',
    doctor: '🩺 Doctor',
  };

  const planLabel = {
    free: 'Free',
    pro: 'Pro ($9.99/mo)',
    team: 'Team ($29.99/mo)',
  };

  const initial = (profile?.display_name || user?.email || '?')[0].toUpperCase();

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
      >
        {/* Profile Header */}
        <View style={styles.profileHeader}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initial}</Text>
          </View>
          <Text style={styles.name}>{profile?.display_name || 'Usuario'}</Text>
          <Text style={styles.email}>{user?.email}</Text>
          <View style={styles.roleBadge}>
            <Text style={styles.roleBadgeText}>{roleLabel[profile?.role] || '🏃 Atleta'}</Text>
          </View>
        </View>

        {/* Plan Section */}
        <SectionHeader title="PLAN" />
        <View style={styles.section}>
          <View style={styles.planCard}>
            <View>
              <Text style={styles.planName}>{planLabel[profile?.subscription_plan] || 'Free'}</Text>
              <Text style={styles.planStatus}>
                {profile?.subscription_status === 'active' ? '● Activo' : '○ Sin suscripción'}
              </Text>
            </View>
            <TouchableOpacity style={styles.upgradeBtn}>
              <Text style={styles.upgradeBtnText}>Upgrade</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Wearables Section */}
        <SectionHeader title="WEARABLES" />
        <View style={styles.section}>
          {WEARABLES.map(w => {
            const connected = profile?.[`${w.key}_connected`] || false;
            return (
              <View key={w.key} style={styles.wearableRow}>
                <Text style={styles.wearableEmoji}>{w.emoji}</Text>
                <Text style={styles.wearableName}>{w.name}</Text>
                <View style={[styles.wearableStatus, connected && styles.wearableStatusConnected]}>
                  <Text style={[styles.wearableStatusText, connected && styles.wearableStatusTextConnected]}>
                    {connected ? 'Conectado' : 'Conectar'}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>

        {/* Info Section */}
        <SectionHeader title="INFORMACIÓN" />
        <View style={styles.section}>
          <SettingRow icon="🏅" label="Deporte" value={profile?.sport || 'Sin definir'} />
          <SettingRow icon="📅" label="Edad" value={profile?.age ? `${profile.age} años` : 'Sin definir'} />
          <SettingRow icon="🌍" label="Idioma" value="Español" />
        </View>

        {/* Preferences */}
        <SectionHeader title="PREFERENCIAS" />
        <View style={styles.section}>
          <SettingRow
            icon="🔔"
            label="Notificaciones"
            rightElement={
              <Switch
                value={notificationsEnabled}
                onValueChange={setNotificationsEnabled}
                trackColor={{ false: colors.bgElevated, true: colors.accent }}
                thumbColor="#fff"
              />
            }
          />
          <SettingRow icon="📊" label="Exportar datos" onPress={() => Alert.alert('Próximamente', 'Disponible en la próxima versión.')} />
          <SettingRow icon="🔒" label="Privacidad" onPress={() => {}} />
        </View>

        {/* Account */}
        <SectionHeader title="CUENTA" />
        <View style={styles.section}>
          <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut}>
            <Text style={styles.signOutBtnText}>Cerrar sesión</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.version}>Wellaryn Mobile v1.0.0</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  scrollContent: { paddingBottom: 100 },
  // Profile Header
  profileHeader: {
    alignItems: 'center', paddingTop: 70, paddingBottom: spacing.xxl,
    borderBottomWidth: 1, borderBottomColor: colors.borderSubtle,
  },
  avatar: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: colors.bgElevated, alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: colors.accent, marginBottom: spacing.md,
  },
  avatarText: { fontSize: 32, ...fonts.bold, color: colors.accent },
  name: { fontSize: 22, ...fonts.bold, color: colors.textPrimary },
  email: { fontSize: 14, color: colors.textMuted, marginTop: 4 },
  roleBadge: {
    marginTop: spacing.md, paddingHorizontal: spacing.lg, paddingVertical: 6,
    borderRadius: radius.full, backgroundColor: colors.bgElevated,
    borderWidth: 1, borderColor: colors.glassBorder,
  },
  roleBadgeText: { fontSize: 13, ...fonts.semibold, color: colors.textSecondary },
  // Sections
  sectionHeader: {
    fontSize: 12, ...fonts.semibold, color: colors.textMuted,
    letterSpacing: 1, paddingHorizontal: spacing.xl, marginTop: spacing.xxl, marginBottom: spacing.sm,
  },
  section: {
    marginHorizontal: spacing.lg, backgroundColor: colors.bgElevated,
    borderRadius: radius.lg, borderWidth: 1, borderColor: colors.glassBorder,
    overflow: 'hidden',
  },
  // Plan
  planCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: spacing.lg,
  },
  planName: { fontSize: 16, ...fonts.bold, color: colors.textPrimary },
  planStatus: { fontSize: 13, color: colors.accent, marginTop: 4 },
  upgradeBtn: {
    paddingHorizontal: spacing.lg, paddingVertical: spacing.sm,
    borderRadius: radius.full, backgroundColor: colors.accent,
  },
  upgradeBtnText: { fontSize: 13, ...fonts.bold, color: '#fff' },
  // Wearables
  wearableRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    paddingHorizontal: spacing.lg, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: colors.borderSubtle,
  },
  wearableEmoji: { fontSize: 22 },
  wearableName: { flex: 1, fontSize: 15, ...fonts.medium, color: colors.textPrimary },
  wearableStatus: {
    paddingHorizontal: spacing.md, paddingVertical: 4,
    borderRadius: radius.full, borderWidth: 1, borderColor: colors.borderSubtle,
  },
  wearableStatusConnected: { borderColor: colors.accent, backgroundColor: 'rgba(52,211,153,0.1)' },
  wearableStatusText: { fontSize: 12, ...fonts.semibold, color: colors.textMuted },
  wearableStatusTextConnected: { color: colors.accent },
  // Settings rows
  settingRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    paddingHorizontal: spacing.lg, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: colors.borderSubtle,
  },
  settingIcon: { fontSize: 20 },
  settingInfo: { flex: 1 },
  settingLabel: { fontSize: 15, ...fonts.medium, color: colors.textPrimary },
  settingValue: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  settingArrow: { fontSize: 22, color: colors.textMuted },
  // Sign out
  signOutBtn: {
    paddingVertical: spacing.lg, alignItems: 'center',
  },
  signOutBtnText: { fontSize: 16, ...fonts.semibold, color: colors.red },
  // Version
  version: { textAlign: 'center', fontSize: 12, color: colors.textMuted, marginTop: spacing.xxl, marginBottom: spacing.lg },
});
