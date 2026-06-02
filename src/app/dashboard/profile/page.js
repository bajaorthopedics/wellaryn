'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import styles from './page.module.css';

const OuraConnect = dynamic(
  () => import('@/components/dashboard/OuraConnect'),
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

  const L = (key) => labels[key]?.[lang] || labels[key]?.en || key;

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
          <div className={styles.profileName}>{displayName || user?.email?.split('@')[0] || 'Athlete'}</div>
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
