'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getSupabaseBrowser } from '@/lib/supabase/client';
import { fetchUnreadCount } from '@/lib/supabase/data-service';
import styles from './ChatBadge.module.css';

const REFRESH_INTERVAL = 30_000; // 30 seconds fallback

export default function ChatBadge() {
  const { user } = useAuth();
  const [count, setCount] = useState(0);

  const loadCount = useCallback(async () => {
    if (!user?.id) return;
    try {
      const c = await fetchUnreadCount(user.id);
      setCount(c);
    } catch (err) {
      console.error('ChatBadge: error fetching unread count:', err);
    }
  }, [user?.id]);

  // Initial load + polling fallback
  useEffect(() => {
    loadCount();
    const interval = setInterval(loadCount, REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [loadCount]);

  // Realtime subscription for instant updates
  useEffect(() => {
    if (!user?.id) return;

    const supabase = getSupabaseBrowser();
    if (typeof supabase.channel !== 'function') return;

    const channel = supabase
      .channel(`chat-badge-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `receiver_id=eq.${user.id}`,
        },
        () => {
          // New message received — bump count
          setCount((prev) => prev + 1);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'chat_messages',
          filter: `receiver_id=eq.${user.id}`,
        },
        () => {
          // Messages marked as read — refresh count
          loadCount();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, loadCount]);

  if (count <= 0) return null;

  return (
    <span className={styles.badge} aria-label={`${count} unread messages`}>
      {count > 99 ? '99+' : count}
    </span>
  );
}
