'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { getSupabaseBrowser } from '@/lib/supabase/client';
import styles from './page.module.css';

const t = {
  title: { en: 'Create your account', es: 'Crea tu cuenta' },
  subtitle: { en: 'Join Wellaryn and start training smarter', es: 'Únete a Wellaryn y entrena de forma inteligente' },
  displayName: { en: 'Display Name', es: 'Nombre' },
  displayNamePlaceholder: { en: 'Your name', es: 'Tu nombre' },
  email: { en: 'Email', es: 'Correo electrónico' },
  emailPlaceholder: { en: 'you@example.com', es: 'tu@ejemplo.com' },
  password: { en: 'Password', es: 'Contraseña' },
  passwordPlaceholder: { en: 'Min. 8 characters', es: 'Mín. 8 caracteres' },
  confirmPassword: { en: 'Confirm Password', es: 'Confirmar Contraseña' },
  confirmPasswordPlaceholder: { en: 'Repeat password', es: 'Repite la contraseña' },
  invitationCode: { en: 'Invitation Code', es: 'Código de Invitación' },
  invitationCodePlaceholder: { en: 'Enter your invite code', es: 'Introduce tu código de invitación' },
  acceptTerms: { en: 'I accept the ', es: 'Acepto los ' },
  termsOfService: { en: 'Terms of Service', es: 'Términos de Servicio' },
  acceptPrivacy: { en: 'I accept the ', es: 'Acepto la ' },
  privacyPolicy: { en: 'Privacy Policy', es: 'Política de Privacidad' },
  createAccount: { en: 'Create Account', es: 'Crear Cuenta' },
  creating: { en: 'Creating account...', es: 'Creando cuenta...' },
  hasAccount: { en: 'Already have an account?', es: '¿Ya tienes cuenta?' },
  signIn: { en: 'Sign in', es: 'Inicia sesión' },
  errPasswordMismatch: { en: 'Passwords do not match.', es: 'Las contraseñas no coinciden.' },
  errPasswordShort: { en: 'Password must be at least 8 characters.', es: 'La contraseña debe tener al menos 8 caracteres.' },
  errTermsRequired: { en: 'You must accept the Terms of Service.', es: 'Debes aceptar los Términos de Servicio.' },
  errPrivacyRequired: { en: 'You must accept the Privacy Policy.', es: 'Debes aceptar la Política de Privacidad.' },
  errInvalidCode: { en: 'Invalid or expired invitation code.', es: 'Código de invitación inválido o expirado.' },
  errCodeRequired: { en: 'An invitation code is required.', es: 'Se requiere un código de invitación.' },
};

export default function RegisterPage() {
  const { lang } = useLanguage();
  const { signUp, updateProfile } = useAuth();
  const router = useRouter();
  const supabase = getSupabaseBrowser();

  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [invitationCode, setInvitationCode] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [acceptedPrivacy, setAcceptedPrivacy] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function validateInvitationCode(code) {
    const { data, error } = await supabase
      .from('invitation_codes')
      .select('id, code, active, current_uses, max_uses')
      .eq('code', code.trim())
      .eq('active', true)
      .single();

    if (error || !data) return null;
    if (data.current_uses >= data.max_uses) return null;
    return data;
  }

  async function incrementInvitationUses(codeId, currentUses) {
    await supabase
      .from('invitation_codes')
      .update({ current_uses: currentUses + 1 })
      .eq('id', codeId);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    // Validate
    if (!invitationCode.trim()) {
      setError(t.errCodeRequired[lang]);
      return;
    }
    if (password.length < 8) {
      setError(t.errPasswordShort[lang]);
      return;
    }
    if (password !== confirmPassword) {
      setError(t.errPasswordMismatch[lang]);
      return;
    }
    if (!acceptedTerms) {
      setError(t.errTermsRequired[lang]);
      return;
    }
    if (!acceptedPrivacy) {
      setError(t.errPrivacyRequired[lang]);
      return;
    }

    setLoading(true);

    try {
      // Validate invitation code
      const codeData = await validateInvitationCode(invitationCode);
      if (!codeData) {
        setError(t.errInvalidCode[lang]);
        setLoading(false);
        return;
      }

      // Create the account
      const data = await signUp(email, password);

      // If sign-up succeeded, update profile with display name and consent timestamps
      if (data?.user) {
        await updateProfile({
          display_name: displayName.trim(),
          terms_accepted_at: new Date().toISOString(),
          privacy_accepted_at: new Date().toISOString(),
          invitation_code: invitationCode.trim(),
        });

        // Increment invitation code usage
        await incrementInvitationUses(codeData.id, codeData.current_uses);
      }

      router.push('/onboarding');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

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

          {error && (
            <div className={styles.errorBox}>
              <span className={styles.errorIcon}>⚠</span>
              <span>{error}</span>
            </div>
          )}

          <form className={styles.form} onSubmit={handleSubmit}>
            {/* Display Name */}
            <div className={styles.fieldGroup}>
              <label className={styles.label} htmlFor="displayName">
                {t.displayName[lang]}
              </label>
              <input
                id="displayName"
                type="text"
                className={styles.input}
                placeholder={t.displayNamePlaceholder[lang]}
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                required
                autoComplete="name"
              />
            </div>

            {/* Email */}
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

            {/* Password Row */}
            <div className={styles.fieldRow}>
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
                  autoComplete="new-password"
                  minLength={8}
                />
              </div>

              <div className={styles.fieldGroup}>
                <label className={styles.label} htmlFor="confirmPassword">
                  {t.confirmPassword[lang]}
                </label>
                <input
                  id="confirmPassword"
                  type="password"
                  className={styles.input}
                  placeholder={t.confirmPasswordPlaceholder[lang]}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                />
              </div>
            </div>

            {/* Invitation Code */}
            <div className={styles.fieldGroup}>
              <label className={styles.label} htmlFor="invitationCode">
                {t.invitationCode[lang]}
              </label>
              <input
                id="invitationCode"
                type="text"
                className={styles.input}
                placeholder={t.invitationCodePlaceholder[lang]}
                value={invitationCode}
                onChange={(e) => setInvitationCode(e.target.value)}
                required
              />
            </div>

            <div className={styles.divider} />

            {/* Legal Checkboxes */}
            <div className={styles.legalCheckboxes}>
              <div className={styles.checkboxGroup}>
                <input
                  id="acceptTerms"
                  type="checkbox"
                  className={styles.checkbox}
                  checked={acceptedTerms}
                  onChange={(e) => setAcceptedTerms(e.target.checked)}
                />
                <label htmlFor="acceptTerms" className={styles.checkboxLabel}>
                  {t.acceptTerms[lang]}
                  <Link href="/legal/terms">{t.termsOfService[lang]}</Link>
                </label>
              </div>

              <div className={styles.checkboxGroup}>
                <input
                  id="acceptPrivacy"
                  type="checkbox"
                  className={styles.checkbox}
                  checked={acceptedPrivacy}
                  onChange={(e) => setAcceptedPrivacy(e.target.checked)}
                />
                <label htmlFor="acceptPrivacy" className={styles.checkboxLabel}>
                  {t.acceptPrivacy[lang]}
                  <Link href="/legal/privacy">{t.privacyPolicy[lang]}</Link>
                </label>
              </div>
            </div>

            <button
              type="submit"
              className={styles.submitButton}
              disabled={loading}
            >
              {loading ? t.creating[lang] : t.createAccount[lang]}
            </button>
          </form>

          <p className={styles.switchText}>
            {t.hasAccount[lang]}{' '}
            <Link href="/auth/login" className={styles.switchLink}>
              {t.signIn[lang]}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
