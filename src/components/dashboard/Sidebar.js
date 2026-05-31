'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useLanguage } from '@/contexts/LanguageContext';
import { t } from '@/lib/i18n';
import styles from './Sidebar.module.css';

export default function Sidebar({ isOpen, onClose }) {
  const pathname = usePathname();
  const { lang, toggleLang } = useLanguage();

  const navItems = [
    { icon: '📊', label: t('dashboard.nav.overview', lang), href: '/dashboard' },
    { icon: '💪', label: t('dashboard.nav.readiness', lang), href: '/dashboard/readiness' },
    { icon: '🏋️', label: t('dashboard.nav.training', lang), href: '/dashboard/training' },
    { icon: '👤', label: t('dashboard.nav.profile', lang), href: '/dashboard/profile' },
  ];

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
                  <span className={styles.navLabel}>{item.label}</span>
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
        <div className={styles.avatar} aria-hidden="true">JM</div>
        <div className={styles.userInfo}>
          <div className={styles.userName}>Juan Martínez</div>
          <div className={styles.userRole}>
            {lang === 'en' ? 'Athlete' : 'Atleta'}
          </div>
        </div>
      </div>
    </aside>
  );
}
