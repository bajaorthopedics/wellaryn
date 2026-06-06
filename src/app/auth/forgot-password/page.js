'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useLanguage } from '@/contexts/LanguageContext';
import { getSupabaseBrowser } from '@/lib/supabase/client';
import styles from '../login/page.module.css';

const t = {
  title:       { en: 'Reset Password',           es: 'Restablecer Contraseña' },
  subtitle:    { en: 'Enter your email and we\'ll send you a reset link.', es: 'Ingresa tu correo y te enviaremos un enlace para restablecer.' },
  email:       { en: 'Email',                     es: 'Correo electrónico' },
  placeholder: { en: 'you@example.com',           es: 'tu@ejemplo.com' },
  send:        { en: 'Send Reset Link',           es: 'Enviar Enlace' },
  sending:     { en: 'Sending…',                  es: 'Enviando…' },
  sent:        { en: '✓ Check your email! We sent a reset link to', es: '✓ ¡Revisa tu correo! Enviamos un enlace de restablecimiento a' },
  back:        { en: '← Back to Sign In',         es: '← Volver a Iniciar Sesión' },
  error:       { en: 'Something went wrong. Please try again.', es: 'Algo salió mal. Inténtalo de nuevo.' },
};

export default function ForgotPasswordPage() {
  const { lang } = useLanguage();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const supabase = getSupabaseBrowser();
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      });

      if (resetError) {
        setError(resetError.message);
      } else {
        setSent(true);
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

          {sent ? (
            <div style={{
              padding: '1.25rem',
              background: 'hsla(152, 68%, 52%, 0.08)',
              border: '1px solid hsla(152, 68%, 52%, 0.2)',
              borderRadius: 'var(--radius-md)',
              color: 'var(--color-green)',
              fontSize: 'var(--font-size-sm)',
              fontWeight: 500,
              lineHeight: 1.5,
              textAlign: 'center',
            }}>
              {t.sent[lang]} <strong>{email}</strong>
            </div>
          ) : (
            <form className={styles.form} onSubmit={handleSubmit}>
              <div className={styles.fieldGroup}>
                <label className={styles.label} htmlFor="reset-email">
                  {t.email[lang]}
                </label>
                <input
                  id="reset-email"
                  type="email"
                  className={styles.input}
                  placeholder={t.placeholder[lang]}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  autoFocus
                />
              </div>

              <button
                type="submit"
                className={styles.submitButton}
                disabled={loading}
              >
                {loading ? t.sending[lang] : t.send[lang]}
              </button>
            </form>
          )}

          <p className={styles.switchText} style={{ marginTop: '1.5rem' }}>
            <Link href="/auth/login" className={styles.switchLink}>
              {t.back[lang]}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
