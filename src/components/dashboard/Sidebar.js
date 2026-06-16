'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { t } from '@/lib/i18n';
import styles from './Sidebar.module.css';
import NotificationBell from './NotificationBell';
import ChatBadge from './ChatBadge';

export default function Sidebar({ isOpen, onClose }) {
  const pathname = usePathname();
  const router = useRouter();
  const { lang, toggleLang } = useLanguage();
  const { profile, signOut } = useAuth();

  const isCoachOrDoctor = profile?.role === 'coach' || profile?.role === 'doctor';
  const isAdmin = profile?.role === 'admin';

  // Admin gets everything: team management + athlete features + admin panel
  const baseNavItems = (isAdmin || isCoachOrDoctor)
    ? [
        { icon: '👥', label: t('dashboard.nav.team', lang), href: '/dashboard/team' },
        { icon: '📈', label: t('dashboard.nav.analytics', lang), href: '/dashboard/analytics' },
        { icon: '📊', label: t('dashboard.nav.overview', lang), href: '/dashboard' },
        { icon: '💬', label: t('dashboard.nav.chat', lang), href: '/dashboard/chat', hasBadge: true },
        { icon: '📋', label: t('dashboard.nav.reports', lang), href: '/dashboard/reports' },
        { icon: '🎯', label: t('dashboard.nav.goals', lang), href: '/dashboard/goals' },
        { icon: '🦴', label: t('dashboard.nav.injuries', lang), href: '/dashboard/injuries' },
        { icon: '📈', label: t('dashboard.nav.history', lang), href: '/dashboard/history' },
        { icon: '👤', label: t('dashboard.nav.profile', lang), href: '/dashboard/profile' },
      ]
    : [
        { icon: '📊', label: t('dashboard.nav.overview', lang), href: '/dashboard' },
        { icon: '💪', label: t('dashboard.nav.readiness', lang), href: '/dashboard/readiness' },
        { icon: '💬', label: t('dashboard.nav.chat', lang), href: '/dashboard/chat', hasBadge: true },
        { icon: '🏋️', label: t('dashboard.nav.training', lang), href: '/dashboard/training' },
        { icon: '📈', label: t('dashboard.nav.history', lang), href: '/dashboard/history' },
        { icon: '📋', label: t('dashboard.nav.reports', lang), href: '/dashboard/reports' },
        { icon: '🎯', label: t('dashboard.nav.goals', lang), href: '/dashboard/goals' },
        { icon: '🦴', label: t('dashboard.nav.injuries', lang), href: '/dashboard/injuries' },
        { icon: '👤', label: t('dashboard.nav.profile', lang), href: '/dashboard/profile' },
      ];

  // Add admin nav item only for admin users
  const navItems = isAdmin
    ? [...baseNavItems, { icon: '👑', label: t('dashboard.nav.admin', lang), href: '/dashboard/admin' }]
    : baseNavItems;

  // Compute avatar initials from display name
  const displayName = profile?.display_name || 'User';
  const initials = displayName
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const roleName = profile?.role
    ? profile.role.charAt(0).toUpperCase() + profile.role.slice(1)
    : (lang === 'en' ? 'Athlete' : 'Atleta');

  async function handleSignOut() {
    try {
      await signOut();
      router.replace('/auth/login');
    } catch (err) {
      console.error('Sign out error:', err);
    }
  }

  return (
    <aside
      className={`${styles.sidebar} ${isOpen ? styles.sidebarOpen : ''}`}
      id="main-sidebar"
    >
      {/* Logo */}
      <div className={styles.logo}>
        <div className={styles.logoText}>Wellaryn</div>
        <div className={styles.logoSub}>Fitness AI</div>
      </div>

      {/* Navigation */}
      <nav className={styles.nav} aria-label="Main navigation">
        <ul className={styles.navList}>
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <li key={item.href} className={styles.navItem}>
                <Link
                  href={item.href}
                  className={`${styles.navLink} ${isActive ? styles.navLinkActive : ''}`}
                  onClick={onClose}
                  id={`nav-${item.href.split('/').pop() || 'overview'}`}
                >
                  <span className={styles.navIcon} aria-hidden="true">{item.icon}</span>
                  <span className={styles.navLabel}>{item.label}{item.hasBadge && <ChatBadge />}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Language Toggle */}
      <button
        className={styles.langBtn}
        onClick={toggleLang}
        title={lang === 'en' ? 'Cambiar a español' : 'Switch to English'}
      >
        🌐 {lang === 'en' ? 'ES' : 'EN'}
      </button>

      {/* User area */}
      <div className={styles.userArea}>
        <div className={styles.avatar} aria-hidden="true">{initials}</div>
        <div className={styles.userInfo}>
          <div className={styles.userName}>{displayName}</div>
          <div className={styles.userRole}>{roleName}</div>
        </div>
        {isCoachOrDoctor && <NotificationBell />}
      </div>

      {/* Sign Out */}
      <button
        className={styles.signOutBtn}
        onClick={handleSignOut}
        id="sign-out-btn"
      >
        {lang === 'en' ? 'Sign Out' : 'Cerrar Sesión'}
      </button>
    </aside>
  );
}
