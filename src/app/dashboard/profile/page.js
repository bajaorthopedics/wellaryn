'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { t } from '@/lib/i18n';
import { fetchDailyMetrics, fetchGoals, fetchInjuries, fetchCoachAthletes, metricsToWellarynInput } from '@/lib/supabase/data-service';
import { calculateWellarynScore } from '@/lib/wellaryn-score';
import styles from './page.module.css';

const OuraConnect = dynamic(
  () => import('@/components/dashboard/OuraConnect'),
  { ssr: false, loading: () => <div style={{ padding: '1rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>Loading…</div> }
);

const WhoopConnect = dynamic(
  () => import('@/components/dashboard/WhoopConnect'),
  { ssr: false, loading: () => <div style={{ padding: '1rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>Loading…</div> }
);

const GarminConnect = dynamic(
  () => import('@/components/dashboard/GarminConnect'),
  { ssr: false, loading: () => <div style={{ padding: '1rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>Loading…</div> }
);

const FitbitConnect = dynamic(
  () => import('@/components/dashboard/FitbitConnect'),
  { ssr: false, loading: () => <div style={{ padding: '1rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>Loading…</div> }
);

const AppleHealthConnect = dynamic(
  () => import('@/components/dashboard/AppleHealthConnect'),
  { ssr: false, loading: () => <div style={{ padding: '1rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>Loading…</div> }
);

const labels = {
  title:          { en: 'Profile & Settings',      es: 'Perfil y Configuración' },
  subtitle:       { en: 'Manage your account',      es: 'Administra tu cuenta' },
  back:           { en: '← Dashboard',              es: '← Panel' },
  personalInfo:   { en: 'Personal Information',     es: 'Información Personal' },
  displayName:    { en: 'Display Name',             es: 'Nombre para Mostrar' },
  sport:          { en: 'Sport',                    es: 'Deporte' },
  role:           { en: 'Role',                     es: 'Rol' },
  age:            { en: 'Age',                      es: 'Edad' },
  weight:         { en: 'Weight',                   es: 'Peso' },
  height:         { en: 'Height',                   es: 'Altura' },
  sleepNeed:      { en: 'Sleep Need',               es: 'Necesidad de Sueño' },
  accountInfo:    { en: 'Account Information',      es: 'Información de Cuenta' },
  email:          { en: 'Email',                    es: 'Correo Electrónico' },
  memberSince:    { en: 'Member Since',             es: 'Miembro Desde' },
  inviteCode:     { en: 'Invitation Code',          es: 'Código de Invitación' },
  dataPrivacy:    { en: 'Data & Privacy',           es: 'Datos y Privacidad' },
  healthConsent:  { en: 'Health Data Consent',      es: 'Consentimiento de Datos de Salud' },
  consentGranted: { en: 'Granted',                  es: 'Otorgado' },
  consentPending: { en: 'Pending',                  es: 'Pendiente' },
  privacyPolicy:  { en: 'Privacy Policy',           es: 'Política de Privacidad' },
  terms:          { en: 'Terms of Service',         es: 'Términos de Servicio' },
  dangerZone:     { en: 'Danger Zone',              es: 'Zona de Peligro' },
  signOut:        { en: 'Sign Out',                 es: 'Cerrar Sesión' },
  wearables:      { en: 'Wearables',                es: 'Dispositivos' },
  save:           { en: 'Save Changes',             es: 'Guardar Cambios' },
  saving:         { en: 'Saving…',                  es: 'Guardando…' },
  saved:          { en: '✓ Profile saved successfully', es: '✓ Perfil guardado exitosamente' },
  loading:        { en: 'Loading profile…',         es: 'Cargando perfil…' },
  hours:          { en: 'hours',                    es: 'horas' },
  kg:             { en: 'kg',                       es: 'kg' },
  cm:             { en: 'cm',                       es: 'cm' },
  years:          { en: 'years',                    es: 'años' },
  notAvailable:   { en: 'N/A',                      es: 'N/D' },
  subscriptionSuccess: { en: '✓ Subscription activated successfully!', es: '✓ ¡Suscripción activada exitosamente!' },
};

const sportOptions = [
  { value: 'running', en: 'Running', es: 'Running' },
];

const roleOptions = [
  { value: 'athlete', en: 'Athlete', es: 'Atleta' },
  { value: 'coach', en: 'Coach', es: 'Entrenador' },
  { value: 'doctor', en: 'Doctor', es: 'Doctor' },
];

export default function ProfilePage() {
  const { lang } = useLanguage();
  const { user, profile, signOut, updateProfile, loading: authLoading } = useAuth();
  const router = useRouter();

  // Form state
  const [displayName, setDisplayName] = useState('');
  const [sport, setSport] = useState('running');
  const [role, setRole] = useState('athlete');
  const [age, setAge] = useState('');
  const [weight, setWeight] = useState('');
  const [height, setHeight] = useState('');
  const [sleepNeed, setSleepNeed] = useState(8);

  const [saving, setSaving] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [managingPortal, setManagingPortal] = useState(false);

  // Export state
  const today = new Date().toISOString().split('T')[0];
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0];
  const [exportFrom, setExportFrom] = useState(thirtyDaysAgo);
  const [exportTo, setExportTo] = useState(today);
  const [exportFormat, setExportFormat] = useState('csv');
  const [exportMetrics, setExportMetrics] = useState(true);
  const [exportScores, setExportScores] = useState(true);
  const [exportTraining, setExportTraining] = useState(true);
  const [exportGoals, setExportGoals] = useState(false);
  const [exportInjuries, setExportInjuries] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportMsg, setExportMsg] = useState(null); // { type: 'success'|'error', text }
  const [coachAthletes, setCoachAthletes] = useState([]);
  const [selectedAthleteId, setSelectedAthleteId] = useState('');

  const L = (key) => labels[key]?.[lang] || labels[key]?.en || key;
  const E = (key) => t(`dashboard.export.${key}`, lang);
  const S = (key) => t(`subscription.${key}`, lang);

  // Check for subscription success query param
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('subscription') === 'success') {
      setShowToast(true);
      setTimeout(() => setShowToast(false), 4000);
      // Clean up URL
      window.history.replaceState({}, '', '/dashboard/profile');
    }
  }, []);

  // Pre-fill from profile
  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name || '');
      setSport(profile.sport || 'running');
      setRole(profile.role || 'athlete');
      setAge(profile.age?.toString() || '');
      setWeight(profile.weight?.toString() || '');
      setHeight(profile.height?.toString() || '');
      setSleepNeed(profile.sleep_need || 8);
    } else if (user) {
      setDisplayName(user.email?.split('@')[0] || '');
    }
  }, [profile, user]);

  // Fetch coach athletes if coach/doctor
  useEffect(() => {
    if (profile && (profile.role === 'coach' || profile.role === 'doctor' || profile.role === 'admin') && user) {
      fetchCoachAthletes(user.id)
        .then((athletes) => {
          const accepted = athletes.filter(a => a.status === 'accepted' && a.profile);
          setCoachAthletes(accepted);
        })
        .catch(() => {});
    }
  }, [profile, user]);

  // Save handler
  const handleSave = useCallback(async () => {
    if (!user) return;
    setSaving(true);

    try {
      await updateProfile({
        display_name: displayName.trim() || user.email?.split('@')[0],
        sport,
        role,
        age: age ? parseInt(age, 10) : null,
        weight: weight ? parseFloat(weight) : null,
        height: height ? parseInt(height, 10) : null,
        sleep_need: sleepNeed,
      });

      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
    } catch (err) {
      console.error('Error saving profile:', err);
    } finally {
      setSaving(false);
    }
  }, [user, displayName, sport, role, age, weight, height, sleepNeed, updateProfile]);

  // Sign out handler
  const handleSignOut = useCallback(async () => {
    try {
      await signOut();
      router.push('/');
    } catch (err) {
      console.error('Error signing out:', err);
    }
  }, [signOut, router]);

  // Manage subscription handler
  const handleManageSubscription = useCallback(async () => {
    setManagingPortal(true);
    try {
      const res = await fetch('/api/stripe/portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      console.error('Portal error:', err);
    } finally {
      setManagingPortal(false);
    }
  }, []);

  // Export handler
  const handleExport = useCallback(async () => {
    if (!user) return;
    setExporting(true);
    setExportMsg(null);

    try {
      const targetUserId = (role === 'coach' || role === 'doctor' || role === 'admin') && selectedAthleteId
        ? selectedAthleteId
        : user.id;

      const fromDate = new Date(exportFrom);
      const toDate = new Date(exportTo);
      const daysInRange = Math.ceil((toDate - fromDate) / 86400000) + 1;

      if (daysInRange <= 0 || daysInRange > 365) {
        setExportMsg({ type: 'error', text: 'Invalid date range (max 365 days).' });
        setExporting(false);
        return;
      }

      // Fetch all data in parallel
      const [allMetrics, goals, injuries] = await Promise.all([
        (exportMetrics || exportScores || exportTraining)
          ? fetchDailyMetrics(targetUserId, daysInRange + 14) // extra days for ACWR
          : Promise.resolve([]),
        exportGoals ? fetchGoals(targetUserId) : Promise.resolve([]),
        exportInjuries ? fetchInjuries(targetUserId) : Promise.resolve([]),
      ]);

      // Filter metrics to date range
      const fromStr = exportFrom;
      const toStr = exportTo;
      const rangeMetrics = allMetrics.filter(m => m.date >= fromStr && m.date <= toStr);

      if (rangeMetrics.length === 0 && goals.length === 0 && injuries.length === 0) {
        setExportMsg({ type: 'error', text: E('noData') });
        setExporting(false);
        return;
      }

      // Build export rows
      const rows = rangeMetrics.map((m, idx) => {
        // Calculate Wellaryn Score for this day
        const sliceEnd = allMetrics.indexOf(m) + 1;
        const sliceStart = Math.max(0, sliceEnd - 14);
        const historySlice = allMetrics.slice(sliceStart, sliceEnd);
        let wellarynScore = null;
        let category = '';
        let acwr = null;

        if (exportScores && historySlice.length > 0) {
          const input = metricsToWellarynInput(historySlice, profile);
          if (input) {
            const result = calculateWellarynScore(input);
            wellarynScore = result.score;
            category = result.category;
            acwr = result.trainingLoadDetails?.ratio
              ? Math.round(result.trainingLoadDetails.ratio * 100) / 100
              : null;
          }
        }

        return {
          date: m.date,
          wellaryn_score: wellarynScore,
          wellaryn_category: category,
          hrv_rmssd: m.hrv_rmssd,
          rhr: m.rhr,
          sleep_hours: m.sleep_total,
          sleep_quality: m.sleep_quality,
          sleep_deep: m.sleep_deep,
          sleep_rem: m.sleep_rem,
          sleep_light: m.sleep_light,
          steps: m.steps,
          calories: m.calories_total,
          stress: m.stress,
          energy: m.energy,
          mood: m.mood,
          training_load: m.training_load,
          training_rpe: m.training_rpe,
          training_duration: m.training_duration,
          acwr,
        };
      });

      let content, mimeType, extension;

      if (exportFormat === 'csv') {
        // Build CSV
        const headers = Object.keys(rows[0] || {});
        const csvLines = [headers.join(',')];
        for (const row of rows) {
          csvLines.push(headers.map(h => {
            const val = row[h];
            return val == null ? '' : String(val);
          }).join(','));
        }

        // Append goals sheet if selected
        if (exportGoals && goals.length > 0) {
          csvLines.push('', '--- Goals ---');
          csvLines.push('title,category,status,target_value,current_value,target_date,notes');
          for (const g of goals) {
            csvLines.push([
              g.title || '', g.category || '', g.status || '',
              g.target_value ?? '', g.current_value ?? '',
              g.target_date || '', (g.notes || '').replace(/,/g, ';'),
            ].join(','));
          }
        }

        // Append injuries if selected
        if (exportInjuries && injuries.length > 0) {
          csvLines.push('', '--- Injury Log ---');
          csvLines.push('body_part,type,severity,status,injury_date,expected_recovery,rtp_phase,notes');
          for (const inj of injuries) {
            csvLines.push([
              inj.body_part || '', inj.type || '', inj.severity || '',
              inj.status || '', inj.injury_date || '',
              inj.expected_recovery || '', inj.rtp_phase || '',
              (inj.notes || '').replace(/,/g, ';'),
            ].join(','));
          }
        }

        content = csvLines.join('\n');
        mimeType = 'text/csv;charset=utf-8;';
        extension = 'csv';
      } else {
        // Build JSON
        const exportData = {};
        if (rows.length > 0) exportData.dailyMetrics = rows;
        if (exportGoals && goals.length > 0) exportData.goals = goals;
        if (exportInjuries && injuries.length > 0) exportData.injuries = injuries;
        exportData.exportDate = new Date().toISOString();
        exportData.dateRange = { from: exportFrom, to: exportTo };

        content = JSON.stringify(exportData, null, 2);
        mimeType = 'application/json;charset=utf-8;';
        extension = 'json';
      }

      // Trigger download
      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `wellaryn-export-${new Date().toISOString().split('T')[0]}.${extension}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setExportMsg({ type: 'success', text: E('success') });
      setTimeout(() => setExportMsg(null), 4000);
    } catch (err) {
      console.error('Export error:', err);
      setExportMsg({ type: 'error', text: err.message || 'Export failed' });
    } finally {
      setExporting(false);
    }
  }, [
    user, role, selectedAthleteId, exportFrom, exportTo, exportFormat,
    exportMetrics, exportScores, exportTraining, exportGoals, exportInjuries, profile, E,
  ]);

  if (authLoading) {
    return (
      <div className={styles.loading}>
        <div className={styles.spinner} />
        <span className={styles.loadingText}>{L('loading')}</span>
      </div>
    );
  }

  // Avatar initials
  const initials = (displayName || user?.email || 'U')
    .split(' ')
    .map(w => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const memberSince = user?.created_at
    ? new Date(user.created_at).toLocaleDateString(lang === 'es' ? 'es-MX' : 'en-US', {
        year: 'numeric', month: 'long', day: 'numeric',
      })
    : L('notAvailable');

  const consentGranted = profile?.health_consent === true;
  const consentDate = profile?.health_consent_at
    ? new Date(profile.health_consent_at).toLocaleDateString(lang === 'es' ? 'es-MX' : 'en-US', {
        year: 'numeric', month: 'short', day: 'numeric',
      })
    : null;

  return (
    <div className={styles.page}>
      <Link href="/dashboard" className={styles.backLink}>{L('back')}</Link>

      <header className={styles.header}>
        <h1 className={styles.title}>{L('title')}</h1>
        <p className={styles.subtitle}>{L('subtitle')}</p>
      </header>

      {/* Profile Card */}
      <div className={styles.profileCard}>
        <div className={styles.avatar}>{initials}</div>
        <div className={styles.profileInfo}>
          <div className={styles.profileNameRow}>
            <div className={styles.profileName}>{displayName || user?.email?.split('@')[0] || 'Athlete'}</div>
            <span className={`${styles.planBadge} ${profile?.plan === 'pro' ? styles.planBadgePro : profile?.plan === 'team' ? styles.planBadgeTeam : styles.planBadgeFree}`}>
              {S(profile?.plan || 'free')}
            </span>
          </div>
          <div className={styles.profileEmail}>{user?.email || ''}</div>
          <span className={styles.roleBadge}>
            {roleOptions.find(r => r.value === role)?.[lang] || role}
          </span>
        </div>
      </div>

      {/* Personal Information */}
      <div className={styles.section}>
        <div className={styles.sectionTitle}>
          <span className={styles.sectionIcon}>👤</span>
          {L('personalInfo')}
        </div>
        <div className={styles.fieldGrid}>
          <div className={styles.fieldGroupFull}>
            <label className={styles.label} htmlFor="prof-name">{L('displayName')}</label>
            <input
              id="prof-name"
              className={styles.input}
              type="text"
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              placeholder="Juan Martínez"
            />
          </div>
          <div className={styles.fieldGroup}>
            <label className={styles.label} htmlFor="prof-sport">{L('sport')}</label>
            <select
              id="prof-sport"
              className={styles.select}
              value={sport}
              onChange={e => setSport(e.target.value)}
            >
              {sportOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt[lang] || opt.en}</option>
              ))}
            </select>
          </div>
          <div className={styles.fieldGroup}>
            <label className={styles.label} htmlFor="prof-role">{L('role')}</label>
            <select
              id="prof-role"
              className={styles.select}
              value={role}
              onChange={e => setRole(e.target.value)}
            >
              {roleOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt[lang] || opt.en}</option>
              ))}
            </select>
          </div>
          <div className={styles.fieldGroup}>
            <label className={styles.label} htmlFor="prof-age">{L('age')}</label>
            <input
              id="prof-age"
              className={styles.input}
              type="number"
              min="10"
              max="100"
              value={age}
              onChange={e => setAge(e.target.value)}
              placeholder="34"
            />
          </div>
          <div className={styles.fieldGroup}>
            <label className={styles.label} htmlFor="prof-weight">{L('weight')} ({L('kg')})</label>
            <input
              id="prof-weight"
              className={styles.input}
              type="number"
              min="30"
              max="300"
              step="0.1"
              value={weight}
              onChange={e => setWeight(e.target.value)}
              placeholder="78"
            />
          </div>
          <div className={styles.fieldGroup}>
            <label className={styles.label} htmlFor="prof-height">{L('height')} ({L('cm')})</label>
            <input
              id="prof-height"
              className={styles.input}
              type="number"
              min="100"
              max="250"
              value={height}
              onChange={e => setHeight(e.target.value)}
              placeholder="178"
            />
          </div>
          <div className={styles.sliderGroup}>
            <div className={styles.sliderHeader}>
              <label className={styles.label} htmlFor="prof-sleep">{L('sleepNeed')}</label>
              <span className={styles.sliderValue}>{sleepNeed} {L('hours')}</span>
            </div>
            <input
              id="prof-sleep"
              className={styles.slider}
              type="range"
              min="6"
              max="10"
              step="0.5"
              value={sleepNeed}
              onChange={e => setSleepNeed(parseFloat(e.target.value))}
            />
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className={styles.saveContainer}>
        <button
          className={styles.saveBtn}
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? L('saving') : L('save')}
        </button>
      </div>

      {/* Wearables */}
      <div className={styles.section}>
        <div className={styles.sectionTitle}>
          <span className={styles.sectionIcon}>⌚</span>
          {L('wearables')}
        </div>
        <OuraConnect lang={lang} />
        <WhoopConnect lang={lang} />
        <GarminConnect lang={lang} />
        <FitbitConnect lang={lang} />
        <AppleHealthConnect lang={lang} />
      </div>

      {/* Subscription */}
      <div className={styles.section}>
        <div className={styles.sectionTitle}>
          <span className={styles.sectionIcon}>💳</span>
          {S('title')}
        </div>
        <div className={styles.infoRow}>
          <span className={styles.infoLabel}>{S('currentPlan')}</span>
          <span className={`${styles.infoValue} ${styles.planValue}`}>
            {S(profile?.plan || 'free')}
          </span>
        </div>
        {profile?.plan !== 'free' && (
          <div className={styles.infoRow}>
            <span className={styles.infoLabel}>{S('status')}</span>
            <span className={`${styles.subscriptionStatus} ${styles[`status_${profile?.subscription_status || 'active'}`]}`}>
              {S(profile?.subscription_status || 'active')}
            </span>
          </div>
        )}
        {profile?.trial_ends_at && new Date(profile.trial_ends_at) > new Date() && (
          <div className={styles.trialBanner}>
            ⏳ {S('trialEnds')} {new Date(profile.trial_ends_at).toLocaleDateString(lang === 'es' ? 'es-MX' : 'en-US', { month: 'short', day: 'numeric' })}
            {' — '}
            {Math.max(0, Math.ceil((new Date(profile.trial_ends_at) - new Date()) / 86400000))} {S('daysLeft')}
          </div>
        )}
        <div className={styles.subscriptionActions}>
          {profile?.plan === 'free' ? (
            <Link href="/pricing" className={styles.upgradeBtn}>
              ⚡ {S('upgrade')}
            </Link>
          ) : (
            <button
              className={styles.manageBtn}
              onClick={handleManageSubscription}
              disabled={managingPortal}
            >
              {managingPortal ? '…' : `⚙️ ${S('manage')}`}
            </button>
          )}
        </div>
      </div>

      {/* Account Info */}
      <div className={styles.section}>
        <div className={styles.sectionTitle}>
          <span className={styles.sectionIcon}>🔐</span>
          {L('accountInfo')}
        </div>
        <div className={styles.infoRow}>
          <span className={styles.infoLabel}>{L('email')}</span>
          <span className={styles.infoValue}>{user?.email || '—'}</span>
        </div>
        <div className={styles.infoRow}>
          <span className={styles.infoLabel}>{L('memberSince')}</span>
          <span className={styles.infoValue}>{memberSince}</span>
        </div>
        <div className={styles.infoRow}>
          <span className={styles.infoLabel}>{L('inviteCode')}</span>
          <span className={styles.infoValue}>{profile?.invitation_code || L('notAvailable')}</span>
        </div>
      </div>

      {/* Data & Privacy */}
      <div className={styles.section}>
        <div className={styles.sectionTitle}>
          <span className={styles.sectionIcon}>🛡️</span>
          {L('dataPrivacy')}
        </div>

        <div className={`${styles.consentStatus} ${consentGranted ? styles.consentGranted : styles.consentPending}`}>
          {consentGranted ? '✅' : '⏳'} {L('healthConsent')}: {consentGranted ? L('consentGranted') : L('consentPending')}
          {consentDate && ` — ${consentDate}`}
        </div>

        <div className={styles.privacyLinks}>
          <Link href="/legal/privacy" className={styles.privacyLink}>
            📄 {L('privacyPolicy')}
          </Link>
          <Link href="/legal/terms" className={styles.privacyLink}>
            📋 {L('terms')}
          </Link>
        </div>
      </div>

      {/* Export Data */}
      <div className={styles.section}>
        <div className={styles.sectionTitle}>
          <span className={styles.sectionIcon}>📦</span>
          {E('title')}
        </div>
        <p className={styles.exportSubtitle}>{E('subtitle')}</p>

        {/* Coach/Doctor: athlete selector */}
        {(role === 'coach' || role === 'doctor' || role === 'admin') && coachAthletes.length > 0 && (
          <div className={styles.exportFieldGroup}>
            <label className={styles.exportFieldLabel}>{E('selectAthlete')}</label>
            <select
              className={styles.athleteSelect}
              value={selectedAthleteId}
              onChange={e => setSelectedAthleteId(e.target.value)}
            >
              <option value="">{displayName || user?.email} ({lang === 'es' ? 'Yo' : 'Me'})</option>
              {coachAthletes.map(a => (
                <option key={a.athlete_id} value={a.athlete_id}>
                  {a.profile?.display_name || a.profile?.email || a.athlete_id}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Date Range */}
        <div className={styles.exportFieldGroup}>
          <label className={styles.exportFieldLabel}>{E('dateRange')}</label>
          <div className={styles.dateRangeRow}>
            <div className={styles.dateField}>
              <label className={styles.label}>{E('from')}</label>
              <input
                type="date"
                className={styles.dateInput}
                value={exportFrom}
                onChange={e => setExportFrom(e.target.value)}
                max={exportTo}
              />
            </div>
            <span className={styles.dateSeparator}>→</span>
            <div className={styles.dateField}>
              <label className={styles.label}>{E('to')}</label>
              <input
                type="date"
                className={styles.dateInput}
                value={exportTo}
                onChange={e => setExportTo(e.target.value)}
                min={exportFrom}
                max={today}
              />
            </div>
          </div>
        </div>

        {/* Format */}
        <div className={styles.exportFieldGroup}>
          <label className={styles.exportFieldLabel}>{E('format')}</label>
          <div className={styles.formatRow}>
            <div className={styles.formatOption}>
              <input
                type="radio"
                id="fmt-csv"
                name="exportFormat"
                value="csv"
                checked={exportFormat === 'csv'}
                onChange={() => setExportFormat('csv')}
                className={styles.formatRadio}
              />
              <label htmlFor="fmt-csv" className={styles.formatLabel}>📄 CSV</label>
            </div>
            <div className={styles.formatOption}>
              <input
                type="radio"
                id="fmt-json"
                name="exportFormat"
                value="json"
                checked={exportFormat === 'json'}
                onChange={() => setExportFormat('json')}
                className={styles.formatRadio}
              />
              <label htmlFor="fmt-json" className={styles.formatLabel}>{'{ }'} JSON</label>
            </div>
          </div>
        </div>

        {/* Data Selection */}
        <div className={styles.exportFieldGroup}>
          <label className={styles.exportFieldLabel}>{E('dataSelection')}</label>
          <div className={styles.dataCheckboxes}>
            <label className={styles.checkboxOption}>
              <input
                type="checkbox"
                className={styles.exportCheckbox}
                checked={exportMetrics}
                onChange={e => setExportMetrics(e.target.checked)}
              />
              <span className={styles.checkboxLabel}>📊 {E('metrics')}</span>
              <span className={styles.checkboxDesc}>HRV, RHR, Sleep, Steps…</span>
            </label>
            <label className={styles.checkboxOption}>
              <input
                type="checkbox"
                className={styles.exportCheckbox}
                checked={exportScores}
                onChange={e => setExportScores(e.target.checked)}
              />
              <span className={styles.checkboxLabel}>🎯 {E('scores')}</span>
              <span className={styles.checkboxDesc}>Score, Band, ACWR</span>
            </label>
            <label className={styles.checkboxOption}>
              <input
                type="checkbox"
                className={styles.exportCheckbox}
                checked={exportTraining}
                onChange={e => setExportTraining(e.target.checked)}
              />
              <span className={styles.checkboxLabel}>🏋️ {E('training')}</span>
              <span className={styles.checkboxDesc}>RPE, Duration, Load</span>
            </label>
            <label className={styles.checkboxOption}>
              <input
                type="checkbox"
                className={styles.exportCheckbox}
                checked={exportGoals}
                onChange={e => setExportGoals(e.target.checked)}
              />
              <span className={styles.checkboxLabel}>🎯 {E('goals')}</span>
            </label>
            <label className={styles.checkboxOption}>
              <input
                type="checkbox"
                className={styles.exportCheckbox}
                checked={exportInjuries}
                onChange={e => setExportInjuries(e.target.checked)}
              />
              <span className={styles.checkboxLabel}>🩹 {E('injuries')}</span>
            </label>
          </div>
        </div>

        {/* Export Button */}
        <button
          className={styles.exportBtn}
          onClick={handleExport}
          disabled={exporting || (!exportMetrics && !exportScores && !exportTraining && !exportGoals && !exportInjuries)}
        >
          {exporting ? E('generating') : `⬇ ${E('download')}`}
        </button>

        {/* Export toast */}
        {exportMsg && (
          <div className={`${styles.exportToast} ${exportMsg.type === 'success' ? styles.exportSuccess : styles.exportError}`}>
            {exportMsg.type === 'success' ? '✅' : '❌'} {exportMsg.text}
          </div>
        )}
      </div>

      {/* Danger Zone */}
      <div className={styles.dangerSection}>
        <div className={styles.sectionTitle}>
          <span className={styles.sectionIcon}>⚠️</span>
          {L('dangerZone')}
        </div>
        <button className={styles.signOutBtn} onClick={handleSignOut}>
          🚪 {L('signOut')}
        </button>
      </div>

      {/* Toast */}
      <div className={`${styles.toast} ${showToast ? styles.toastVisible : ''}`}>
        {L('saved')}
      </div>
    </div>
  );
}
