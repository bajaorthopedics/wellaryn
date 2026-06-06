'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { getSupabaseBrowser } from '@/lib/supabase/client';
import styles from './NotificationBell.module.css';

const REFRESH_INTERVAL = 60_000; // 60 seconds
const FETCH_LIMIT = 20;

function timeAgo(dateString, lang) {
  const now = new Date();
  const date = new Date(dateString);
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60_000);
  const diffHours = Math.floor(diffMs / 3_600_000);
  const diffDays = Math.floor(diffMs / 86_400_000);

  if (lang === 'en') {
    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'yesterday';
    return `${diffDays}d ago`;
  }

  // Spanish
  if (diffMins < 1) return 'ahora';
  if (diffMins < 60) return `hace ${diffMins}m`;
  if (diffHours < 24) return `hace ${diffHours}h`;
  if (diffDays === 1) return 'ayer';
  return `hace ${diffDays}d`;
}

const SEVERITY_ICONS = {
  critical: '🔴',
  warning: '⚠️',
  info: 'ℹ️',
};

export default function NotificationBell() {
  const { user, profile } = useAuth();
  const { lang } = useLanguage();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const dropdownRef = useRef(null);

  const isCoachOrDoctor = profile?.role === 'coach' || profile?.role === 'doctor';

  // Fetch notifications from Supabase
  const fetchNotifications = useCallback(async () => {
    if (!user?.id || !isCoachOrDoctor) return;

    const supabase = getSupabaseBrowser();
    const { data, error } = await supabase
      .from('coach_notifications')
      .select('*')
      .eq('coach_id', user.id)
      .order('created_at', { ascending: false })
      .limit(FETCH_LIMIT);

    if (error) {
      console.error('Error fetching notifications:', error);
      return;
    }

    setNotifications(data || []);
    setUnreadCount((data || []).filter(n => !n.read).length);
  }, [user?.id, isCoachOrDoctor]);

  // Initial fetch + polling interval
  useEffect(() => {
    fetchNotifications();

    const interval = setInterval(fetchNotifications, REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  // Mark all as read
  async function handleMarkAllRead() {
    try {
      const res = await fetch('/api/notifications/read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ all: true }),
      });

      if (res.ok) {
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
        setUnreadCount(0);
      }
    } catch (err) {
      console.error('Error marking all as read:', err);
    }
  }

  // Click on a notification
  async function handleNotificationClick(notification) {
    // Mark as read
    if (!notification.read) {
      try {
        await fetch('/api/notifications/read', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ notificationIds: [notification.id] }),
        });

        setNotifications(prev =>
          prev.map(n => n.id === notification.id ? { ...n, read: true } : n)
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
      } catch (err) {
        console.error('Error marking notification as read:', err);
      }
    }

    // Navigate to athlete detail
    setIsOpen(false);
    router.push(`/dashboard/team/${notification.athlete_id}`);
  }

  // Don't render for non-coach/doctor roles
  if (!isCoachOrDoctor) return null;

  return (
    <div className={styles.bellWrapper}>
      <button
        className={styles.bellButton}
        onClick={() => setIsOpen(prev => !prev)}
        aria-label={lang === 'en' ? 'Notifications' : 'Notificaciones'}
        aria-expanded={isOpen}
      >
        🔔
        {unreadCount > 0 && (
          <span className={styles.badge} aria-label={`${unreadCount} unread`}>
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          {/* Backdrop for click-outside-to-close */}
          <div className={styles.backdrop} onClick={() => setIsOpen(false)} />

          <div className={styles.dropdown} ref={dropdownRef}>
            {/* Header */}
            <div className={styles.dropdownHeader}>
              <span className={styles.dropdownTitle}>
                {lang === 'en' ? 'Notifications' : 'Notificaciones'}
              </span>
              {unreadCount > 0 && (
                <button className={styles.markAllBtn} onClick={handleMarkAllRead}>
                  {lang === 'en' ? 'Mark all read' : 'Marcar todo leído'}
                </button>
              )}
            </div>

            {/* Notifications list */}
            <div className={styles.notificationList}>
              {notifications.length === 0 ? (
                <div className={styles.emptyState}>
                  <div className={styles.emptyIcon}>🔕</div>
                  <div className={styles.emptyText}>
                    {lang === 'en'
                      ? 'No notifications yet'
                      : 'Sin notificaciones aún'}
                  </div>
                </div>
              ) : (
                notifications.map(notification => (
                  <div
                    key={notification.id}
                    className={`${styles.notificationItem} ${!notification.read ? styles.notificationUnread : ''}`}
                    onClick={() => handleNotificationClick(notification)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => e.key === 'Enter' && handleNotificationClick(notification)}
                  >
                    {/* Severity icon */}
                    <div className={`${styles.severityIcon} ${
                      notification.severity === 'critical' ? styles.severityCritical :
                      notification.severity === 'warning' ? styles.severityWarning :
                      styles.severityInfo
                    }`}>
                      {SEVERITY_ICONS[notification.severity] || '⚠️'}
                    </div>

                    {/* Content */}
                    <div className={styles.notificationContent}>
                      <div className={styles.notificationTitle}>
                        {notification.title}
                      </div>
                      <div className={styles.notificationMessage}>
                        {notification.message}
                      </div>
                      <div className={styles.notificationMeta}>
                        {!notification.read && <span className={styles.unreadDot} />}
                        <span>{timeAgo(notification.created_at, lang)}</span>
                        {notification.score != null && (
                          <span>· Score: {notification.score}</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
