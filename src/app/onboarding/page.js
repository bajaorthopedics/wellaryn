'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import styles from './page.module.css';

/* ============================================
   Bilingual Content
   ============================================ */

const t = {
  // Step indicator
  step: { en: 'Step', es: 'Paso' },

  // Step 1 — Profile Setup
  step1Title: { en: 'Profile Setup', es: 'Configuración de Perfil' },
  step1Subtitle: {
    en: 'Tell us a bit about yourself so we can personalize your experience.',
    es: 'Cuéntanos un poco sobre ti para personalizar tu experiencia.',
  },
  sportLabel: { en: 'Sport', es: 'Deporte' },
  roleLabel: { en: 'Role', es: 'Rol' },
  ageLabel: { en: 'Age', es: 'Edad' },
  agePlaceholder: { en: 'Years', es: 'Años' },
  weightLabel: { en: 'Weight (kg)', es: 'Peso (kg)' },
  weightPlaceholder: { en: 'kg', es: 'kg' },
  heightLabel: { en: 'Height (cm)', es: 'Altura (cm)' },
  heightPlaceholder: { en: 'cm', es: 'cm' },
  sleepNeedLabel: { en: 'Sleep Need', es: 'Necesidad de Sueño' },
  sleepHours: { en: 'hours', es: 'horas' },

  // Sports
  running: { en: 'Running', es: 'Running' },
  cycling: { en: 'Cycling', es: 'Ciclismo' },
  swimming: { en: 'Swimming', es: 'Natación' },
  triathlon: { en: 'Triathlon', es: 'Triatlón' },
  crossfit: { en: 'CrossFit', es: 'CrossFit' },
  other: { en: 'Other', es: 'Otro' },
  comingSoon: { en: 'Soon', es: 'Pronto' },

  // Roles
  athlete: { en: 'Athlete', es: 'Atleta' },
  coach: { en: 'Coach', es: 'Entrenador' },
  doctor: { en: 'Doctor', es: 'Doctor' },

  // Step 2 — Consent
  step2Title: {
    en: 'Consent for Health Data Processing',
    es: 'Consentimiento para Tratamiento de Datos de Salud',
  },
  step2Subtitle: {
    en: 'Please read the following carefully. Your health data is handled with the highest standards of security and privacy.',
    es: 'Por favor lee lo siguiente con atención. Tus datos de salud se manejan con los más altos estándares de seguridad y privacidad.',
  },

  consentDataTitle: { en: 'Data We Collect', es: 'Datos que Recopilamos' },
  consentDataBody: {
    en: 'We collect the following health and performance data from your connected wearables and manual inputs:',
    es: 'Recopilamos los siguientes datos de salud y rendimiento de tus dispositivos conectados y entradas manuales:',
  },
  consentDataList: {
    en: [
      'Heart Rate Variability (HRV) and Resting Heart Rate (RHR)',
      'Sleep duration, stages, and quality metrics',
      'Training load, volume, and intensity data',
      'Subjective stress and mood assessments',
      'Physical metrics: weight, height, age',
    ],
    es: [
      'Variabilidad de Frecuencia Cardíaca (HRV) y Frecuencia Cardíaca en Reposo (RHR)',
      'Duración del sueño, fases y métricas de calidad',
      'Carga de entrenamiento, volumen e intensidad',
      'Evaluaciones subjetivas de estrés y estado de ánimo',
      'Métricas físicas: peso, altura, edad',
    ],
  },

  consentPurposeTitle: { en: 'Purpose of Processing', es: 'Finalidad del Tratamiento' },
  consentPurposeBody: {
    en: 'Your data is processed exclusively to:',
    es: 'Tus datos se tratan exclusivamente para:',
  },
  consentPurposeList: {
    en: [
      'Calculate your daily Wellaryn Score and injury risk assessment',
      'Build and maintain personal baselines for accurate comparisons',
      'Generate personalized training and recovery recommendations',
      'Detect trends and early warning signs of overtraining or injury risk',
    ],
    es: [
      'Calcular tu Wellaryn Score diario y evaluación de riesgo de lesión',
      'Crear y mantener líneas base personales para comparaciones precisas',
      'Generar recomendaciones personalizadas de entrenamiento y recuperación',
      'Detectar tendencias y señales tempranas de sobreentrenamiento o riesgo de lesión',
    ],
  },

  consentSecurityTitle: { en: 'Data Security & Storage', es: 'Seguridad y Almacenamiento de Datos' },
  consentSecurityBody: {
    en: 'We take data security extremely seriously:',
    es: 'Nos tomamos la seguridad de los datos muy en serio:',
  },
  consentSecurityList: {
    en: [
      'Encrypted in transit using TLS 1.3',
      'Encrypted at rest using AES-256',
      'Row Level Security (RLS) ensures complete data isolation between users',
      'No data is shared with third parties',
    ],
    es: [
      'Cifrado en tránsito mediante TLS 1.3',
      'Cifrado en reposo mediante AES-256',
      'Row Level Security (RLS) garantiza aislamiento completo de datos entre usuarios',
      'No se comparten datos con terceros',
    ],
  },

  consentRetentionTitle: { en: 'Data Retention', es: 'Retención de Datos' },
  consentRetentionBody: {
    en: 'Your data remains active while your account exists. Upon account deletion, all personal and health data is permanently deleted within 30 days.',
    es: 'Tus datos permanecen activos mientras tu cuenta exista. Al eliminar tu cuenta, todos los datos personales y de salud se eliminan permanentemente en un plazo de 30 días.',
  },

  consentRightsTitle: { en: 'Your Rights (ARCO)', es: 'Tus Derechos (ARCO)' },
  consentRightsBody: {
    en: 'You have the right to Access, Rectify, Cancel, and Oppose the processing of your data at any time. To exercise these rights, contact us at:',
    es: 'Tienes derecho a Acceder, Rectificar, Cancelar y Oponerte al tratamiento de tus datos en cualquier momento. Para ejercer estos derechos, contáctanos en:',
  },
  consentRightsEmail: 'privacy@wellaryn.com',

  consentDisclaimerTitle: { en: 'Important Disclaimer', es: 'Aviso Importante' },
  consentDisclaimerBody: {
    en: 'Wellaryn is a wellness and fitness optimization tool. It is NOT a medical device and does not provide medical diagnoses. Always consult a qualified healthcare professional for medical decisions.',
    es: 'Wellaryn es una herramienta de bienestar y optimización del fitness. NO es un dispositivo médico y no proporciona diagnósticos médicos. Consulta siempre a un profesional sanitario cualificado para decisiones médicas.',
  },

  consentCheck1: {
    en: 'I have read and understand the information provided above about how my health data will be collected, stored, and processed.',
    es: 'He leído y comprendo la información proporcionada sobre cómo se recopilarán, almacenarán y tratarán mis datos de salud.',
  },
  consentCheck2: {
    en: 'I consent to the processing of my health data for the purposes described above.',
    es: 'Consiento el tratamiento de mis datos de salud para los fines descritos anteriormente.',
  },
  viewPrivacyPolicy: { en: 'View full Privacy Policy', es: 'Ver Política de Privacidad completa' },

  // Step 3 — Ready
  step3Title: { en: "You're all set!", es: '¡Todo listo!' },
  step3Text: {
    en: 'Your account is configured. Connect your wearable and start training smarter with Wellaryn.',
    es: 'Tu cuenta está configurada. Conecta tu wearable y empieza a entrenar de forma inteligente con Wellaryn.',
  },
  goToDashboard: { en: 'Go to Dashboard', es: 'Ir al Dashboard' },

  // Navigation
  next: { en: 'Continue', es: 'Continuar' },
  back: { en: 'Back', es: 'Atrás' },
  saving: { en: 'Saving...', es: 'Guardando...' },
};

/* ============================================
   Sport & Role Definitions
   ============================================ */

const SPORTS = [
  { id: 'running', icon: '🏃', available: true },
  { id: 'cycling', icon: '🚴', available: false },
  { id: 'swimming', icon: '🏊', available: false },
  { id: 'triathlon', icon: '🏅', available: false },
  { id: 'crossfit', icon: '🏋️', available: false },
  { id: 'other', icon: '⚡', available: false },
];

const ROLES = [
  { id: 'athlete', icon: '🏃' },
  { id: 'coach', icon: '📋' },
  { id: 'doctor', icon: '🩺' },
];

/* ============================================
   Component
   ============================================ */

export default function OnboardingPage() {
  const { lang } = useLanguage();
  const { user, updateProfile, loading: authLoading } = useAuth();
  const router = useRouter();

  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Step 1 state
  const [sport, setSport] = useState('running');
  const [role, setRole] = useState('athlete');
  const [age, setAge] = useState('');
  const [weight, setWeight] = useState('');
  const [height, setHeight] = useState('');
  const [sleepNeed, setSleepNeed] = useState(8);

  // Step 2 state
  const [consentRead, setConsentRead] = useState(false);
  const [consentProcessing, setConsentProcessing] = useState(false);

  // Redirect if not logged in
  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/auth/login');
    }
  }, [user, authLoading, router]);

  /* --- Step 1: Save profile data --- */
  async function handleStep1Next() {
    setError('');
    setSaving(true);
    try {
      await updateProfile({
        sport,
        role,
        age: age ? parseInt(age, 10) : null,
        weight: weight ? parseFloat(weight) : null,
        height: height ? parseFloat(height) : null,
        sleep_need: sleepNeed,
      });
      setStep(2);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  /* --- Step 2: Save consent --- */
  async function handleStep2Next() {
    setError('');
    setSaving(true);
    try {
      const now = new Date().toISOString();
      await updateProfile({
        health_data_consent: true,
        health_data_consent_at: now,
        onboarding_completed: true,
        onboarding_completed_at: now,
      });
      setStep(3);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (authLoading) {
    return (
      <div className={styles.onboardingPage}>
        <div style={{
          width: 40, height: 40,
          border: '3px solid var(--border-default)',
          borderTopColor: 'var(--accent)',
          borderRadius: '50%',
          animation: 'rotate 0.8s linear infinite',
        }} />
      </div>
    );
  }

  return (
    <div className={styles.onboardingPage}>
      <div className={styles.onboardingContainer}>
        {/* Step Indicator */}
        <div className={styles.stepIndicator}>
          <div className={`${styles.stepDot} ${step >= 1 ? styles.active : ''} ${step > 1 ? styles.completed : ''}`}>
            {step > 1 ? '✓' : '1'}
          </div>
          <div className={`${styles.stepLine} ${step > 1 ? styles.completed : ''}`} />
          <div className={`${styles.stepDot} ${step === 2 ? styles.active : ''} ${step > 2 ? styles.completed : ''}`}>
            {step > 2 ? '✓' : '2'}
          </div>
          <div className={`${styles.stepLine} ${step > 2 ? styles.completed : ''}`} />
          <div className={`${styles.stepDot} ${step === 3 ? styles.active : ''}`}>
            3
          </div>
        </div>

        {/* Step 1 — Profile Setup */}
        {step === 1 && (
          <div className={styles.card} key="step1">
            <h1 className={styles.cardTitle}>{t.step1Title[lang]}</h1>
            <p className={styles.cardSubtitle}>{t.step1Subtitle[lang]}</p>

            {error && (
              <div className={styles.errorBox}>
                <span>⚠</span>
                <span>{error}</span>
              </div>
            )}

            {/* Sport Selector */}
            <div className={styles.fieldGroup}>
              <span className={styles.label}>{t.sportLabel[lang]}</span>
              <div className={styles.selectorGrid}>
                {SPORTS.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    className={`${styles.selectorOption} ${sport === s.id ? styles.selected : ''} ${!s.available ? styles.disabled : ''}`}
                    onClick={() => s.available && setSport(s.id)}
                    disabled={!s.available}
                  >
                    <span className={styles.selectorIcon}>{s.icon}</span>
                    <span className={styles.selectorLabel}>{t[s.id][lang]}</span>
                    {!s.available && (
                      <span className={styles.comingSoon}>{t.comingSoon[lang]}</span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Role Selector */}
            <div className={styles.fieldGroup}>
              <span className={styles.label}>{t.roleLabel[lang]}</span>
              <div className={styles.roleGrid}>
                {ROLES.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    className={`${styles.roleOption} ${role === r.id ? styles.selected : ''}`}
                    onClick={() => setRole(r.id)}
                  >
                    <span className={styles.roleIcon}>{r.icon}</span>
                    <span className={styles.roleLabel}>{t[r.id][lang]}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Optional metrics */}
            <div className={styles.fieldRow}>
              <div className={styles.fieldGroup}>
                <label className={styles.label} htmlFor="age">{t.ageLabel[lang]}</label>
                <input
                  id="age"
                  type="number"
                  className={styles.input}
                  placeholder={t.agePlaceholder[lang]}
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  min="10"
                  max="120"
                />
              </div>
              <div className={styles.fieldGroup}>
                <label className={styles.label} htmlFor="weight">{t.weightLabel[lang]}</label>
                <input
                  id="weight"
                  type="number"
                  className={styles.input}
                  placeholder={t.weightPlaceholder[lang]}
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  min="20"
                  max="300"
                  step="0.1"
                />
              </div>
              <div className={styles.fieldGroup}>
                <label className={styles.label} htmlFor="height">{t.heightLabel[lang]}</label>
                <input
                  id="height"
                  type="number"
                  className={styles.input}
                  placeholder={t.heightPlaceholder[lang]}
                  value={height}
                  onChange={(e) => setHeight(e.target.value)}
                  min="100"
                  max="250"
                />
              </div>
            </div>

            {/* Sleep need slider */}
            <div className={styles.sliderGroup}>
              <div className={styles.sliderHeader}>
                <span className={styles.label}>{t.sleepNeedLabel[lang]}</span>
                <span className={styles.sliderValue}>
                  {sleepNeed} {t.sleepHours[lang]}
                </span>
              </div>
              <input
                type="range"
                className={styles.slider}
                min="6"
                max="10"
                step="0.5"
                value={sleepNeed}
                onChange={(e) => setSleepNeed(parseFloat(e.target.value))}
              />
            </div>

            <div className={styles.buttonRow}>
              <button
                type="button"
                className={`${styles.nextButton} ${styles.singleButton}`}
                onClick={handleStep1Next}
                disabled={saving}
              >
                {saving ? t.saving[lang] : t.next[lang]}
              </button>
            </div>
          </div>
        )}

        {/* Step 2 — Health Data Consent */}
        {step === 2 && (
          <div className={styles.card} key="step2">
            <div className={styles.consentSection}>
              <h1 className={styles.consentTitle}>
                <span className={styles.consentIcon}>🛡️</span>
                {t.step2Title[lang]}
              </h1>
              <p className={styles.cardSubtitle}>{t.step2Subtitle[lang]}</p>

              {error && (
                <div className={styles.errorBox}>
                  <span>⚠</span>
                  <span>{error}</span>
                </div>
              )}

              {/* Scrollable consent text */}
              <div className={styles.consentScrollBox}>
                <h4>{t.consentDataTitle[lang]}</h4>
                <p>{t.consentDataBody[lang]}</p>
                <ul>
                  {t.consentDataList[lang].map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>

                <h4>{t.consentPurposeTitle[lang]}</h4>
                <p>{t.consentPurposeBody[lang]}</p>
                <ul>
                  {t.consentPurposeList[lang].map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>

                <h4>{t.consentSecurityTitle[lang]}</h4>
                <p>{t.consentSecurityBody[lang]}</p>
                <ul>
                  {t.consentSecurityList[lang].map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>

                <h4>{t.consentRetentionTitle[lang]}</h4>
                <p>{t.consentRetentionBody[lang]}</p>

                <h4>{t.consentRightsTitle[lang]}</h4>
                <p>
                  {t.consentRightsBody[lang]}{' '}
                  <strong>{t.consentRightsEmail}</strong>
                </p>

                <h4>{t.consentDisclaimerTitle[lang]}</h4>
                <p><strong>{t.consentDisclaimerBody[lang]}</strong></p>
              </div>

              {/* Consent checkboxes */}
              <div className={styles.consentCheckboxes}>
                <div className={styles.checkboxGroup}>
                  <input
                    id="consentRead"
                    type="checkbox"
                    className={styles.checkbox}
                    checked={consentRead}
                    onChange={(e) => setConsentRead(e.target.checked)}
                  />
                  <label htmlFor="consentRead" className={styles.checkboxLabel}>
                    {t.consentCheck1[lang]}
                  </label>
                </div>

                <div className={styles.checkboxGroup}>
                  <input
                    id="consentProcessing"
                    type="checkbox"
                    className={styles.checkbox}
                    checked={consentProcessing}
                    onChange={(e) => setConsentProcessing(e.target.checked)}
                  />
                  <label htmlFor="consentProcessing" className={styles.checkboxLabel}>
                    {t.consentCheck2[lang]}
                  </label>
                </div>
              </div>

              <Link href="/legal/privacy" className={styles.privacyLink}>
                {t.viewPrivacyPolicy[lang]} →
              </Link>
            </div>

            <div className={styles.buttonRow}>
              <button
                type="button"
                className={styles.backButton}
                onClick={() => { setStep(1); setError(''); }}
              >
                {t.back[lang]}
              </button>
              <button
                type="button"
                className={styles.nextButton}
                onClick={handleStep2Next}
                disabled={!consentRead || !consentProcessing || saving}
              >
                {saving ? t.saving[lang] : t.next[lang]}
              </button>
            </div>
          </div>
        )}

        {/* Step 3 — Ready */}
        {step === 3 && (
          <div className={styles.card} key="step3">
            <div className={styles.successContainer}>
              <div className={styles.checkmarkCircle}>
                <svg className={styles.checkmarkSvg} viewBox="0 0 24 24">
                  <path className={styles.checkmarkPath} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h1 className={styles.successTitle}>{t.step3Title[lang]}</h1>
              <p className={styles.successText}>{t.step3Text[lang]}</p>
              <button
                type="button"
                className={`${styles.nextButton} ${styles.singleButton}`}
                onClick={() => router.push('/dashboard')}
              >
                {t.goToDashboard[lang]}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
