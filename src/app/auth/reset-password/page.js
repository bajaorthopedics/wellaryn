'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/contexts/LanguageContext';
import { getSupabaseBrowser } from '@/lib/supabase/client';
import styles from '../login/page.module.css';

const t = {
  title:       { en: 'Set New Password',         es: 'Nueva Contraseña' },
  subtitle:    { en: 'Enter your new password below.', es: 'Ingresa tu nueva contraseña.' },
  password:    { en: 'New Password',              es: 'Nueva Contraseña' },
  confirm:     { en: 'Confirm Password',          es: 'Confirmar Contraseña' },
  placeholder: { en: 'Min 6 characters',          es: 'Mínimo 6 caracteres' },
  confirmPh:   { en: 'Repeat your password',      es: 'Repite tu contraseña' },
  save:        { en: 'Update Password',           es: 'Actualizar Contraseña' },
  saving:      { en: 'Updating…',                 es: 'Actualizando…' },
  success:     { en: '✓ Password updated! Redirecting to dashboard…', es: '✓ ¡Contraseña actualizada! Redirigiendo al panel…' },
  mismatch:    { en: 'Passwords do not match.',   es: 'Las contraseñas no coinciden.' },
  tooShort:    { en: 'Password must be at least 6 characters.', es: 'La contraseña debe tener al menos 6 caracteres.' },
  error:       { en: 'Something went wrong. Please try again.', es: 'Algo salió mal. Inténtalo de nuevo.' },
  expired:     { en: 'This reset link has expired. Please request a new one.', es: 'Este enlace ha expirado. Solicita uno nuevo.' },
  backLogin:   { en: '← Back to Sign In',         es: '← Volver a Iniciar Sesión' },
};

export default function ResetPasswordPage() {
  const { lang } = useLanguage();
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (password.length < 6) {
      setError(t.tooShort[lang]);
      return;
    }
    if (password !== confirmPassword) {
      setError(t.mismatch[lang]);
      return;
    }

    setLoading(true);
    try {
      const supabase = getSupabaseBrowser();
      const { error: updateError } = await supabase.auth.updateUser({
        password: password,
      });

      if (updateError) {
        setError(updateError.message);
      } else {
        setSuccess(true);
        setTimeout(() => router.replace('/dashboard'), 2000);
      }
    } catch (err) {
      setError(t.error[lang]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.authPage}>
      <div className={styles.authContainer}>
        <div className={styles.logoSection}>
          <div className={styles.logoMark}>W</div>
          <div className={styles.logoText}>Wellaryn</div>
        </div>

        <div className={styles.authCard}>
          <h1 className={styles.authTitle}>{t.title[lang]}</h1>
          <p className={styles.authSubtitle}>{t.subtitle[lang]}</p>

          {error && (
            <div className={styles.errorBox}>
              <span className={styles.errorIcon}>⚠</span>
              <span>{error}</span>
            </div>
          )}

          {success ? (
            <div style={{
              padding: '1.25rem',
              background: 'hsla(152, 68%, 52%, 0.08)',
              border: '1px solid hsla(152, 68%, 52%, 0.2)',
              borderRadius: 'var(--radius-md)',
              color: 'var(--color-green)',
              fontSize: 'var(--font-size-sm)',
              fontWeight: 500,
              textAlign: 'center',
            }}>
              {t.success[lang]}
            </div>
          ) : (
            <form className={styles.form} onSubmit={handleSubmit}>
              <div className={styles.fieldGroup}>
                <label className={styles.label} htmlFor="new-password">
                  {t.password[lang]}
                </label>
                <input
                  id="new-password"
                  type="password"
                  className={styles.input}
                  placeholder={t.placeholder[lang]}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  autoComplete="new-password"
                  autoFocus
                />
              </div>

              <div className={styles.fieldGroup}>
                <label className={styles.label} htmlFor="confirm-password">
                  {t.confirm[lang]}
                </label>
                <input
                  id="confirm-password"
                  type="password"
                  className={styles.input}
                  placeholder={t.confirmPh[lang]}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={6}
                  autoComplete="new-password"
                />
              </div>

              <button
                type="submit"
                className={styles.submitButton}
                disabled={loading}
              >
                {loading ? t.saving[lang] : t.save[lang]}
              </button>
            </form>
          )}

          <p className={styles.switchText} style={{ marginTop: '1.5rem' }}>
            <Link href="/auth/login" className={styles.switchLink}>
              {t.backLogin[lang]}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
