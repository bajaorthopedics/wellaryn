'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import styles from './page.module.css';

const t = {
  title: { en: 'Welcome back', es: 'Bienvenido de nuevo' },
  subtitle: { en: 'Sign in to your Wellaryn account', es: 'Inicia sesión en tu cuenta Wellaryn' },
  email: { en: 'Email', es: 'Correo electrónico' },
  emailPlaceholder: { en: 'you@example.com', es: 'tu@ejemplo.com' },
  password: { en: 'Password', es: 'Contraseña' },
  passwordPlaceholder: { en: 'Enter your password', es: 'Introduce tu contraseña' },
  signIn: { en: 'Sign In', es: 'Iniciar Sesión' },
  signingIn: { en: 'Signing in...', es: 'Iniciando sesión...' },
  noAccount: { en: "Don't have an account?", es: '¿No tienes cuenta?' },
  register: { en: 'Create one', es: 'Crea una' },
  authFailed: { en: 'Authentication failed. Please try again.', es: 'La autenticación falló. Inténtalo de nuevo.' },
  invalidCredentials: { en: 'Invalid email or password.', es: 'Correo o contraseña incorrectos.' },
};

export default function LoginPage() {
  const { lang } = useLanguage();
  const { signIn, profile } = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Check URL for auth callback error
  const urlError = typeof window !== 'undefined'
    ? new URLSearchParams(window.location.search).get('error')
    : null;

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Wrap signIn with a 10-second timeout
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error(
          lang === 'es'
            ? 'Tiempo de espera agotado. Verifica tu conexión e intenta de nuevo.'
            : 'Request timed out. Check your connection and try again.'
        )), 10000)
      );

      await Promise.race([signIn(email, password), timeoutPromise]);

      // signIn succeeded — redirect to dashboard
      router.replace('/dashboard');
    } catch (err) {
      setError(err.message || t.invalidCredentials[lang]);
      setLoading(false);
    }
  }

  const displayError = error || (urlError === 'auth_failed' ? t.authFailed[lang] : '');

  return (
    <div className={styles.authPage}>
      <div className={styles.authContainer}>
        {/* Logo */}
        <div className={styles.logoSection}>
          <div className={styles.logoMark}>W</div>
          <div className={styles.logoText}>Wellaryn</div>
        </div>

        {/* Card */}
        <div className={styles.authCard}>
          <h1 className={styles.authTitle}>{t.title[lang]}</h1>
          <p className={styles.authSubtitle}>{t.subtitle[lang]}</p>

          {displayError && (
            <div className={styles.errorBox}>
              <span className={styles.errorIcon}>⚠</span>
              <span>{displayError}</span>
            </div>
          )}

          <form className={styles.form} onSubmit={handleSubmit}>
            <div className={styles.fieldGroup}>
              <label className={styles.label} htmlFor="email">
                {t.email[lang]}
              </label>
              <input
                id="email"
                type="email"
                className={styles.input}
                placeholder={t.emailPlaceholder[lang]}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>

            <div className={styles.fieldGroup}>
              <label className={styles.label} htmlFor="password">
                {t.password[lang]}
              </label>
              <input
                id="password"
                type="password"
                className={styles.input}
                placeholder={t.passwordPlaceholder[lang]}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
              <Link href="/auth/forgot-password" className={styles.switchLink} style={{ fontSize: 'var(--font-size-xs)', marginTop: '0.5rem', display: 'inline-block' }}>
                {lang === 'es' ? '¿Olvidaste tu contraseña?' : 'Forgot password?'}
              </Link>
            </div>

            <button
              type="submit"
              className={styles.submitButton}
              disabled={loading}
            >
              {loading ? t.signingIn[lang] : t.signIn[lang]}
            </button>
          </form>

          <p className={styles.switchText}>
            {t.noAccount[lang]}{' '}
            <Link href="/auth/register" className={styles.switchLink}>
              {t.register[lang]}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
