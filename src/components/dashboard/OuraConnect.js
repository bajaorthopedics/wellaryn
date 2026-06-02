'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { getSupabaseBrowser } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import styles from './OuraConnect.module.css';

const labels = {
  sectionTitle:     { en: 'Oura Ring',                    es: 'Oura Ring' },
  disconnected:     { en: 'Connect your Oura Ring to import sleep, HRV, and activity data automatically.',
                      es: 'Conecta tu Oura Ring para importar datos de sueño, VFC y actividad automáticamente.' },
  connectBtn:       { en: 'Connect Oura Ring',            es: 'Conectar Oura Ring' },
  connected:        { en: 'Connected',                    es: 'Conectado' },
  lastSync:         { en: 'Last sync',                    es: 'Última sincronización' },
  never:            { en: 'Never',                        es: 'Nunca' },
  syncBtn:          { en: 'Sync Now',                     es: 'Sincronizar Ahora' },
  syncing:          { en: 'Syncing…',                     es: 'Sincronizando…' },
  syncSuccess:      { en: 'days synced successfully',     es: 'días sincronizados exitosamente' },
  syncFailed:       { en: 'Sync failed. Try again.',      es: 'Error al sincronizar. Intenta de nuevo.' },
  disconnect:       { en: 'Disconnect',                   es: 'Desconectar' },
  disconnectConfirm:{ en: 'Disconnect Oura Ring? Your existing data will be kept.',
                      es: '¿Desconectar Oura Ring? Tus datos existentes se conservarán.' },
  loading:          { en: 'Checking connection…',         es: 'Verificando conexión…' },
  connectedToast:   { en: '✓ Oura Ring connected!',      es: '✓ ¡Oura Ring conectado!' },
  errorToast:       { en: '✕ Failed to connect Oura Ring', es: '✕ Error al conectar Oura Ring' },
};

/** Wrapper with Suspense so useSearchParams doesn't block the page */
export default function OuraConnect({ lang = 'en' }) {
  return (
    <Suspense fallback={<div className={styles.loadingState}><div className={styles.miniSpinner} /><span className={styles.loadingText}>{lang === 'es' ? 'Cargando…' : 'Loading…'}</span></div>}>
      <OuraConnectInner lang={lang} />
    </Suspense>
  );
}

function OuraConnectInner({ lang = 'en' }) {
  const { user } = useAuth();
  const searchParams = useSearchParams();

  const [status, setStatus] = useState('loading'); // loading | disconnected | connected | syncing | error
  const [lastSyncAt, setLastSyncAt] = useState(null);
  const [syncResult, setSyncResult] = useState(null);
  const [toast, setToast] = useState(null);

  const L = (key) => labels[key]?.[lang] || labels[key]?.en || key;

  // Check connection status on mount
  useEffect(() => {
    if (!user) {
      setStatus('disconnected');
      return;
    }

    async function checkConnection() {
      try {
        const supabase = getSupabaseBrowser();
        const { data, error } = await supabase
          .from('wearable_connections')
          .select('connected_at, last_sync_at')
          .eq('user_id', user.id)
          .eq('provider', 'oura')
          .maybeSingle();

        if (error) {
          console.error('Error checking Oura connection:', error);
          setStatus('disconnected');
          return;
        }

        if (data) {
          setStatus('connected');
          setLastSyncAt(data.last_sync_at);
        } else {
          setStatus('disconnected');
        }
      } catch (err) {
        console.error('Error checking Oura connection:', err);
        setStatus('disconnected');
      }
    }

    checkConnection();
  }, [user]);

  // Handle URL params for toast after redirect
  useEffect(() => {
    const ouraParam = searchParams.get('oura');
    if (ouraParam === 'connected') {
      setToast('success');
      setStatus('connected');
      setTimeout(() => setToast(null), 4000);
      // Clean URL
      window.history.replaceState({}, '', window.location.pathname);
    } else if (ouraParam === 'error') {
      setToast('error');
      setTimeout(() => setToast(null), 4000);
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [searchParams]);

  // Connect handler
  const handleConnect = useCallback(() => {
    window.location.href = '/api/oura/authorize';
  }, []);

  // Sync handler
  const handleSync = useCallback(async () => {
    setStatus('syncing');
    setSyncResult(null);

    try {
      const res = await fetch('/api/oura/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ days: 7 }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        console.error('Sync failed:', data);
        setStatus('error');
        return;
      }

      const data = await res.json();
      setSyncResult(data);
      setStatus('connected');
      setLastSyncAt(new Date().toISOString());
    } catch (err) {
      console.error('Sync error:', err);
      setStatus('error');
    }
  }, []);

  // Disconnect handler
  const handleDisconnect = useCallback(async () => {
    const confirmed = window.confirm(L('disconnectConfirm'));
    if (!confirmed) return;

    try {
      const res = await fetch('/api/oura/disconnect', { method: 'POST' });
      if (res.ok) {
        setStatus('disconnected');
        setLastSyncAt(null);
        setSyncResult(null);
      }
    } catch (err) {
      console.error('Disconnect error:', err);
    }
  }, [lang]);

  // Format last sync date
  const formattedLastSync = lastSyncAt
    ? new Date(lastSyncAt).toLocaleDateString(lang === 'es' ? 'es-MX' : 'en-US', {
        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
      })
    : L('never');

  return (
    <div className={styles.container}>
      {/* Header with icon */}
      <div className={styles.header}>
        <div className={styles.iconWrap}>
          <div className={`${styles.ringIcon} ${status === 'connected' ? styles.ringConnected : ''} ${status === 'syncing' ? styles.ringSyncing : ''}`}>
            ⭕
          </div>
        </div>
        <div className={styles.headerText}>
          <span className={styles.deviceName}>{L('sectionTitle')}</span>
          {status === 'connected' && (
            <span className={styles.connectedBadge}>✓ {L('connected')}</span>
          )}
        </div>
      </div>

      {/* Body content based on status */}
      {status === 'loading' && (
        <div className={styles.loadingState}>
          <div className={styles.miniSpinner} />
          <span className={styles.loadingText}>{L('loading')}</span>
        </div>
      )}

      {status === 'disconnected' && (
        <div className={styles.disconnectedState}>
          <p className={styles.description}>{L('disconnected')}</p>
          <button className={styles.connectBtn} onClick={handleConnect}>
            {L('connectBtn')}
          </button>
        </div>
      )}

      {(status === 'connected' || status === 'syncing') && (
        <div className={styles.connectedState}>
          <div className={styles.syncInfo}>
            <span className={styles.syncLabel}>{L('lastSync')}</span>
            <span className={styles.syncValue}>{formattedLastSync}</span>
          </div>

          {syncResult && (
            <div className={styles.syncSuccess}>
              📡 {syncResult.syncedDays} {L('syncSuccess')}
            </div>
          )}

          <div className={styles.actions}>
            <button
              className={styles.syncBtn}
              onClick={handleSync}
              disabled={status === 'syncing'}
            >
              {status === 'syncing' ? (
                <>
                  <span className={styles.syncSpinner} />
                  {L('syncing')}
                </>
              ) : (
                L('syncBtn')
              )}
            </button>
            <button className={styles.disconnectBtn} onClick={handleDisconnect}>
              {L('disconnect')}
            </button>
          </div>
        </div>
      )}

      {status === 'error' && (
        <div className={styles.errorState}>
          <p className={styles.errorText}>{L('syncFailed')}</p>
          <div className={styles.actions}>
            <button className={styles.syncBtn} onClick={handleSync}>
              {L('syncBtn')}
            </button>
            <button className={styles.disconnectBtn} onClick={handleDisconnect}>
              {L('disconnect')}
            </button>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className={`${styles.toast} ${toast === 'success' ? styles.toastSuccess : styles.toastError}`}>
          {toast === 'success' ? L('connectedToast') : L('errorToast')}
        </div>
      )}
    </div>
  );
}
