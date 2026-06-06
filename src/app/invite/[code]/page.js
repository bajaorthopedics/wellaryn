'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { getSupabaseBrowser } from '@/lib/supabase/client';
import styles from './invite.module.css';

// ─── Translations ──────────────────────────────────────────────
const t = {
  title: {
    en: 'You\'ve been invited',
    es: 'Has sido invitado',
  },
  from: {
    en: 'has invited you to connect on Wellaryn',
    es: 'te ha invitado a conectar en Wellaryn',
  },
  roleCoach: { en: 'Coach', es: 'Entrenador' },
  roleDoctor: { en: 'Doctor', es: 'Médico' },
  accept: { en: 'Accept Invitation', es: 'Aceptar Invitación' },
  accepting: { en: 'Accepting...', es: 'Aceptando...' },
  decline: { en: 'Decline', es: 'Rechazar' },
  declining: { en: 'Declining...', es: 'Rechazando...' },
  signInPrompt: {
    en: 'Please sign in to accept this invitation',
    es: 'Inicia sesión para aceptar esta invitación',
  },
  signInButton: { en: 'Sign In', es: 'Iniciar Sesión' },
  invalidCode: {
    en: 'This invitation link is invalid or has expired.',
    es: 'Este enlace de invitación es inválido o ha expirado.',
  },
  alreadyConnected: {
    en: 'You are already connected to this coach.',
    es: 'Ya estás conectado con este entrenador.',
  },
  networkError: {
    en: 'Something went wrong. Please check your connection and try again.',
    es: 'Algo salió mal. Verifica tu conexión e inténtalo de nuevo.',
  },
  successTitle: { en: 'Connected!', es: '¡Conectado!' },
  successMessage: {
    en: 'You\'re now connected. Your coach can view your readiness data to help you train safely.',
    es: 'Ahora estás conectado. Tu entrenador puede ver tus datos de preparación para ayudarte a entrenar de forma segura.',
  },
  goToDashboard: { en: 'Go to Dashboard', es: 'Ir al Dashboard' },
  declinedTitle: { en: 'Invitation declined', es: 'Invitación rechazada' },
  declinedMessage: {
    en: 'You\'ve declined this invitation. You can close this page.',
    es: 'Has rechazado esta invitación. Puedes cerrar esta página.',
  },
  goHome: { en: 'Go to Home', es: 'Ir al Inicio' },
  loading: { en: 'Loading invitation...', es: 'Cargando invitación...' },
};

// ─── Page States ──────────────────────────────────────────────
const STATE = {
  LOADING: 'loading',
  INVITE_FOUND: 'found',
  INVALID: 'invalid',
  SUCCESS: 'success',
  DECLINED: 'declined',
  ERROR: 'error',
};

export default function InviteAcceptPage() {
  const params = useParams();
  const code = params.code;
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { lang } = useLanguage();

  const [pageState, setPageState] = useState(STATE.LOADING);
  const [invite, setInvite] = useState(null);
  const [coachProfile, setCoachProfile] = useState(null);
  const [error, setError] = useState('');
  const [accepting, setAccepting] = useState(false);
  const [declining, setDeclining] = useState(false);

  // ── Fetch invite on mount ──
  const fetchInvite = useCallback(async () => {
    try {
      const supabase = getSupabaseBrowser();

      // Fetch the pending invite by code
      const { data: inviteData, error: inviteError } = await supabase
        .from('coach_athletes')
        .select('id, coach_id, coach_role, invite_code, status')
        .eq('invite_code', code)
        .eq('status', 'pending')
        .maybeSingle();

      if (inviteError) throw inviteError;

      if (!inviteData) {
        // Check if invite exists but is already accepted/rejected
        const { data: anyInvite } = await supabase
          .from('coach_athletes')
          .select('id, status')
          .eq('invite_code', code)
          .maybeSingle();

        if (anyInvite && anyInvite.status === 'accepted') {
          setError(t.alreadyConnected[lang]);
        } else {
          setError(t.invalidCode[lang]);
        }
        setPageState(STATE.INVALID);
        return;
      }

      setInvite(inviteData);

      // Fetch coach profile for display name
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id, display_name, email, role')
        .eq('id', inviteData.coach_id)
        .maybeSingle();

      if (profileError) {
        console.error('Error fetching coach profile:', profileError);
      }

      setCoachProfile(profile);
      setPageState(STATE.INVITE_FOUND);
    } catch (err) {
      console.error('Error fetching invite:', err);
      setError(t.networkError[lang]);
      setPageState(STATE.ERROR);
    }
  }, [code, lang]);

  useEffect(() => {
    if (code) {
      fetchInvite();
    }
  }, [code, fetchInvite]);

  // ── Check if user is already connected ──
  useEffect(() => {
    async function checkExisting() {
      if (!user || !invite) return;

      try {
        const supabase = getSupabaseBrowser();
        const { data: existing } = await supabase
          .from('coach_athletes')
          .select('id')
          .eq('coach_id', invite.coach_id)
          .eq('athlete_id', user.id)
          .eq('status', 'accepted')
          .maybeSingle();

        if (existing) {
          setError(t.alreadyConnected[lang]);
          setPageState(STATE.INVALID);
        }
      } catch (err) {
        console.error('Error checking existing connection:', err);
      }
    }

    checkExisting();
  }, [user, invite, lang]);

  // ── Accept handler ──
  async function handleAccept() {
    if (!user || !invite) return;
    setAccepting(true);
    setError('');

    try {
      const supabase = getSupabaseBrowser();
      const { error: updateError } = await supabase
        .from('coach_athletes')
        .update({
          athlete_id: user.id,
          status: 'accepted',
          accepted_at: new Date().toISOString(),
        })
        .eq('id', invite.id);

      if (updateError) throw updateError;

      setPageState(STATE.SUCCESS);

      // Redirect to dashboard after brief pause
      setTimeout(() => {
        router.push('/dashboard');
      }, 2500);
    } catch (err) {
      console.error('Error accepting invite:', err);
      setError(t.networkError[lang]);
      setAccepting(false);
    }
  }

  // ── Decline handler ──
  async function handleDecline() {
    if (!invite) return;
    setDeclining(true);
    setError('');

    try {
      const supabase = getSupabaseBrowser();
      const { error: updateError } = await supabase
        .from('coach_athletes')
        .update({ status: 'rejected' })
        .eq('id', invite.id);

      if (updateError) throw updateError;

      setPageState(STATE.DECLINED);
    } catch (err) {
      console.error('Error declining invite:', err);
      setError(t.networkError[lang]);
      setDeclining(false);
    }
  }

  // ── Derived values ──
  const coachName = coachProfile?.display_name || coachProfile?.email || 'A coach';
  const coachRole = invite?.coach_role || 'coach';
  const roleLabel = coachRole === 'doctor' ? t.roleDoctor[lang] : t.roleCoach[lang];
  const roleIcon = coachRole === 'doctor' ? '🩺' : '📋';
  const isAuthReady = !authLoading;

  // ── Render ──
  return (
    <div className={styles.invitePage}>
      <div className={styles.inviteContainer}>
        {/* Logo */}
        <div className={styles.logoSection}>
          <div className={styles.logoMark}>W</div>
          <div className={styles.logoText}>Wellaryn</div>
        </div>

        {/* Card */}
        <div className={styles.inviteCard}>

          {/* ── Loading State ── */}
          {pageState === STATE.LOADING && (
            <div className={styles.loadingContainer}>
              <div className={styles.spinner} />
              <span className={styles.loadingText}>{t.loading[lang]}</span>
            </div>
          )}

          {/* ── Error / Invalid State ── */}
          {(pageState === STATE.INVALID || pageState === STATE.ERROR) && (
            <>
              <div className={styles.errorBox}>
                <span className={styles.errorIcon}>⚠</span>
                <span>{error || t.invalidCode[lang]}</span>
              </div>
              <Link href="/" className={styles.redirectLink} style={{ marginTop: 'var(--space-lg)' }}>
                {t.goHome[lang]} →
              </Link>
            </>
          )}

          {/* ── Invite Found ── */}
          {pageState === STATE.INVITE_FOUND && (
            <>
              {/* Coach avatar */}
              <div className={styles.coachAvatar}>
                {roleIcon}
              </div>

              {/* Title */}
              <h1 className={styles.inviteTitle}>
                <span className={styles.coachName}>{coachName}</span>
                {' '}
                {t.from[lang]}
              </h1>

              {/* Role badge */}
              <div className={styles.roleBadge}>
                <span className={styles.roleBadgeIcon}>{roleIcon}</span>
                {roleLabel}
              </div>

              <div className={styles.divider} />

              {/* ── Not logged in ── */}
              {isAuthReady && !user && (
                <div className={styles.signInPrompt}>
                  <p className={styles.signInText}>
                    {t.signInPrompt[lang]}
                  </p>
                  <Link
                    href={`/auth/login?redirect=/invite/${encodeURIComponent(code)}`}
                    className={styles.signInLink}
                  >
                    {t.signInButton[lang]}
                  </Link>
                </div>
              )}

              {/* ── Still loading auth ── */}
              {!isAuthReady && (
                <div className={styles.loadingContainer}>
                  <div className={styles.spinner} />
                </div>
              )}

              {/* ── Logged in → action buttons ── */}
              {isAuthReady && user && (
                <>
                  {error && (
                    <div className={styles.errorBox} style={{ marginBottom: 'var(--space-md)' }}>
                      <span className={styles.errorIcon}>⚠</span>
                      <span>{error}</span>
                    </div>
                  )}

                  <div className={styles.actions}>
                    <button
                      className={styles.acceptButton}
                      onClick={handleAccept}
                      disabled={accepting || declining}
                    >
                      {accepting ? t.accepting[lang] : t.accept[lang]}
                    </button>

                    <button
                      className={styles.declineButton}
                      onClick={handleDecline}
                      disabled={accepting || declining}
                    >
                      {declining ? t.declining[lang] : t.decline[lang]}
                    </button>
                  </div>
                </>
              )}
            </>
          )}

          {/* ── Success State ── */}
          {pageState === STATE.SUCCESS && (
            <div className={styles.successBox}>
              <div className={styles.successIcon}>✓</div>
              <h2 className={styles.successTitle}>{t.successTitle[lang]}</h2>
              <p className={styles.successMessage}>{t.successMessage[lang]}</p>
              <Link href="/dashboard" className={styles.redirectLink}>
                {t.goToDashboard[lang]} →
              </Link>
            </div>
          )}

          {/* ── Declined State ── */}
          {pageState === STATE.DECLINED && (
            <div className={styles.declinedBox}>
              <div className={styles.declinedIcon}>✕</div>
              <h2 className={styles.declinedTitle}>{t.declinedTitle[lang]}</h2>
              <p className={styles.declinedMessage}>{t.declinedMessage[lang]}</p>
              <Link href="/" className={styles.redirectLink}>
                {t.goHome[lang]} →
              </Link>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
