'use client';

import { useState } from 'react';
import Sidebar from '@/components/dashboard/Sidebar';
import Disclaimer from '@/components/ui/Disclaimer';
import styles from './layout.module.css';

export default function DashboardLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className={styles.dashboardLayout}>
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Mobile overlay */}
      <div
        className={`${styles.overlay} ${sidebarOpen ? styles.overlayVisible : ''}`}
        onClick={() => setSidebarOpen(false)}
        id="sidebar-overlay"
      />

      {/* Hamburger toggle */}
      <button
        className={`${styles.hamburger} ${sidebarOpen ? styles.hamburgerOpen : ''}`}
        onClick={() => setSidebarOpen(!sidebarOpen)}
        aria-label="Toggle navigation menu"
        id="hamburger-toggle"
      >
        <span className={styles.hamburgerIcon}>
          <span />
          <span />
          <span />
        </span>
      </button>

      <main className={styles.mainContent}>
        {children}
        <Disclaimer />
      </main>
    </div>
  );
}

