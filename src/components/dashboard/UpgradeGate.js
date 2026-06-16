'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { canAccess, requiredPlan } from '@/lib/plan-gates';
import Link from 'next/link';
import styles from './UpgradeGate.module.css';

const PLAN_NAMES = {
  pro: 'Pro',
  team: 'Team',
};

const PLAN_DESCRIPTIONS = {
  en: {
    chat: 'Direct messaging with your coach or doctor',
    goals: 'Goal tracking with progress analytics',
    injuries: 'Injury log with return-to-play tracking',
    reports: 'Detailed weekly and monthly reports',
    export: 'Export your data in CSV or PDF',
    analytics: 'Advanced analytics and team insights',
  },
  es: {
    chat: 'Mensajes directos con tu coach o doctor',
    goals: 'Seguimiento de metas con analíticas de progreso',
    injuries: 'Registro de lesiones con seguimiento de retorno al juego',
    reports: 'Reportes detallados semanales y mensuales',
    export: 'Exporta tus datos en CSV o PDF',
    analytics: 'Analíticas avanzadas e insights de equipo',
  },
};

/**
 * UpgradeGate — Wraps a feature section.
 * If the user's plan doesn't include the feature, shows an upgrade prompt.
 * If it does, renders children normally.
 *
 * @param {string} feature - Feature key from plan-gates (e.g. 'chat', 'goals')
 * @param {React.ReactNode} children - The gated content
 */
export default function UpgradeGate({ feature, children }) {
  const { profile } = useAuth();
  const { lang } = useLanguage();
  const plan = profile?.plan || 'free';
  const role = profile?.role;

  // If user has access (admin always does), render children
  if (canAccess(plan, feature, role)) {
    return <>{children}</>;
  }

  // Otherwise, show upgrade prompt
  const needed = requiredPlan(feature);
  const planLabel = PLAN_NAMES[needed] || 'Pro';
  const description = PLAN_DESCRIPTIONS[lang]?.[feature] || '';

  return (
    <div className={styles.gate}>
      <div className={styles.gateContent}>
        <div className={styles.lockIcon}>🔒</div>
        <h3 className={styles.gateTitle}>
          {lang === 'es' ? `Función ${planLabel}` : `${planLabel} Feature`}
        </h3>
        <p className={styles.gateDescription}>{description}</p>
        <p className={styles.gateSubtext}>
          {lang === 'es'
            ? `Actualiza a ${planLabel} para desbloquear esta función.`
            : `Upgrade to ${planLabel} to unlock this feature.`}
        </p>
        <Link href="/pricing" className={styles.upgradeBtn}>
          {lang === 'es' ? `Ver Planes` : `View Plans`}
        </Link>
      </div>
    </div>
  );
}
