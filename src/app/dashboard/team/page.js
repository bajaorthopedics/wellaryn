'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { t } from '@/lib/i18n';
import { calculateWellarynScore } from '@/lib/wellaryn-score';
import {
  fetchCoachAthletes,
  metricsToWellarynInput,
  inviteAthlete,
  fetchPendingInvites,
} from '@/lib/supabase/data-service';
import styles from './team.module.css';

// ─── Constants ────────────────────────────────────────────────
const REFRESH_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
const STALE_THRESHOLD_MS = 48 * 60 * 60 * 1000; // 48 hours

// ─── Helpers ──────────────────────────────────────────────────

function getScoreClass(score) {
  if (score == null) return styles.scoreNA;
  if (score >= 80) return styles.scoreGreen;
  if (score >= 60) return styles.scoreYellow;
  if (score >= 40) return styles.scoreOrange;
  return styles.scoreRed;
}

function getInitials(name) {
  if (!name) return '?';
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function isStaleData(lastUpdated) {
  if (!lastUpdated) return true;
  return Date.now() - new Date(lastUpdated).getTime() > STALE_THRESHOLD_MS;
}

function formatRelativeTime(dateStr, lang) {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return lang === 'es' ? `hace ${mins}m` : `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return lang === 'es' ? `hace ${hours}h` : `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return lang === 'es' ? `hace ${days}d` : `${days}d ago`;
}

// ─── Process a single athlete's data into a display model ─────
function processAthlete(athlete) {
  const { profile, metrics } = athlete;
  const name = profile?.display_name || profile?.email?.split('@')[0] || 'Athlete';
  const sport = profile?.sport || null;

  let wellarynResult = null;
  let latestMetric = null;
  let acwr = null;

  if (metrics && metrics.length > 0) {
    latestMetric = metrics[metrics.length - 1];
    try {
      const input = metricsToWellarynInput(metrics, profile);
      if (input) {
        wellarynResult = calculateWellarynScore(input);
        acwr = wellarynResult.trainingLoadDetails?.ratio ?? null;
      }
    } catch (err) {
      console.error(`Error calculating score for ${name}:`, err);
    }
  }

  const score = wellarynResult?.score ?? null;
  const lastUpdated = latestMetric?.date || latestMetric?.created_at || null;
  const stale = isStaleData(lastUpdated);

  // Alerts
  const alerts = [];
  if (score != null && score < 60) alerts.push('low-score');
  if (acwr != null && acwr > 1.5) alerts.push('high-acwr');
  if (stale) alerts.push('stale');

  return {
    id: profile?.id || athlete.id,
    name,
    sport,
    score,
    wellarynResult,
    latestMetric,
    lastUpdated,
    acwr,
    alerts,
    hrv: latestMetric?.hrv_rmssd ?? null,
    rhr: latestMetric?.rhr ?? null,
    sleepTotal: latestMetric?.sleep_total ?? null,
    trainingLoad: latestMetric?.training_load ?? null,
  };
}

// ─── Invite Modal Component ──────────────────────────────────

function InviteModal({ isOpen, onClose, userId, role, lang }) {
  const [inviteCode, setInviteCode] = useState(null);
  const [pending, setPending] = useState([]);
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  // Load pending invites when modal opens
  useEffect(() => {
    if (!isOpen || !userId) return;
    let cancelled = false;
    (async () => {
      try {
        const data = await fetchPendingInvites(userId);
        if (!cancelled) setPending(data || []);
      } catch (err) {
        console.error('Error fetching pending invites:', err);
      }
    })();
    return () => { cancelled = true; };
  }, [isOpen, userId]);

  const handleGenerate = async () => {
    if (generating) return;
    setGenerating(true);
    setCopied(false);
    try {
      const result = await inviteAthlete(userId, role);
      setInviteCode(result.invite_code);
      // Refresh pending list
      const data = await fetchPendingInvites(userId);
      setPending(data || []);
    } catch (err) {
      console.error('Error generating invite:', err);
    } finally {
      setGenerating(false);
    }
  };

  const handleCopy = async () => {
    if (!inviteCode) return;
    const url = `wellaryn.com/invite/${inviteCode}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback for clipboard
      const input = document.createElement('input');
      input.value = url;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <button className={styles.modalClose} onClick={onClose} aria-label="Close">
          ×
        </button>

        <h2 className={styles.modalTitle}>
          {lang === 'es' ? 'Invitar Atleta' : 'Invite Athlete'}
        </h2>
        <p className={styles.modalSubtitle}>
          {lang === 'es'
            ? 'Genera un código de invitación para que un atleta se una a tu equipo.'
            : 'Generate an invite code for an athlete to join your team.'}
        </p>

        <button
          className={styles.generateBtn}
          onClick={handleGenerate}
          disabled={generating}
        >
          {generating
            ? (lang === 'es' ? 'Generando...' : 'Generating...')
            : (lang === 'es' ? '+ Generar Código' : '+ Generate Code')}
        </button>

        {inviteCode && (
          <>
            <div className={styles.codeDisplay}>
              <div className={styles.codeLabel}>
                {lang === 'es' ? 'Código de Invitación' : 'Invite Code'}
              </div>
              <div className={styles.codeValue}>{inviteCode}</div>
              <div className={styles.codeLink}>
                <span className={styles.codeLinkUrl}>
                  wellaryn.com/invite/{inviteCode}
                </span>
              </div>
            </div>

            <button
              className={`${styles.copyBtn} ${copied ? styles.copiedBtn : ''}`}
              onClick={handleCopy}
            >
              {copied
                ? (lang === 'es' ? '✓ Copiado' : '✓ Copied')
                : (lang === 'es' ? '📋 Copiar Enlace' : '📋 Copy Link')}
            </button>
          </>
        )}

        <div className={styles.pendingSection}>
          <div className={styles.pendingTitle}>
            {lang === 'es' ? 'Invitaciones Pendientes' : 'Pending Invites'}
          </div>
          {pending.length > 0 ? (
            <div className={styles.pendingList}>
              {pending.map((inv, i) => (
                <div key={inv.code || i} className={styles.pendingItem}>
                  <span className={styles.pendingCode}>{inv.invite_code || inv.code}</span>
                  <span className={styles.pendingDate}>
                    {inv.created_at
                      ? new Date(inv.created_at).toLocaleDateString(
                          lang === 'es' ? 'es-MX' : 'en-US',
                          { month: 'short', day: 'numeric' }
                        )
                      : ''}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className={styles.noPending}>
              {lang === 'es' ? 'Sin invitaciones pendientes' : 'No pending invites'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main Team Page Component ────────────────────────────────

export default function TeamPage() {
  const { lang } = useLanguage();
  const { user, profile } = useAuth();

  const [athletes, setAthletes] = useState(null);
  const [filter, setFilter] = useState('all'); // 'all' | 'alerts'
  const [sort, setSort] = useState('score'); // 'score' | 'name' | 'recent'
  const [showInvite, setShowInvite] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(null);

  const isAdmin = profile?.role === 'admin';
  const isDoctor = profile?.role === 'doctor' || isAdmin;
  const isCoach = profile?.role === 'coach' || isAdmin;

  // ─── Fetch athletes ─────────────────────────────────────────
  const loadAthletes = useCallback(async () => {
    if (!user) return;
    try {
      const raw = await fetchCoachAthletes(user.id);
      const processed = (raw || []).map(processAthlete);
      setAthletes(processed);
      setLastRefresh(new Date());
    } catch (err) {
      console.error('Error fetching athletes:', err);
      setAthletes([]);
    }
  }, [user]);

  useEffect(() => {
    loadAthletes();
  }, [loadAthletes]);

  // ─── Auto-refresh every 5 minutes ───────────────────────────
  useEffect(() => {
    const interval = setInterval(loadAthletes, REFRESH_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [loadAthletes]);

  // ─── Filter + Sort (memoized) ───────────────────────────────
  const displayedAthletes = useMemo(() => {
    if (!athletes) return [];

    let list = [...athletes];

    // Filter
    if (filter === 'alerts') {
      list = list.filter((a) => a.alerts.length > 0);
    }

    // Sort
    switch (sort) {
      case 'score':
        list.sort((a, b) => (a.score ?? -1) - (b.score ?? -1)); // lowest first (needs attention)
        break;
      case 'name':
        list.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'recent':
        list.sort((a, b) => {
          const dateA = a.lastUpdated ? new Date(a.lastUpdated).getTime() : 0;
          const dateB = b.lastUpdated ? new Date(b.lastUpdated).getTime() : 0;
          return dateB - dateA; // most recent first
        });
        break;
    }

    return list;
  }, [athletes, filter, sort]);

  const alertCount = useMemo(() => {
    return (athletes || []).filter((a) => a.alerts.length > 0).length;
  }, [athletes]);

  // ─── Loading ────────────────────────────────────────────────
  if (!athletes) {
    return (
      <div className={styles.loading}>
        <div className={styles.spinner} />
        <span className={styles.loadingText}>{t('dashboard.loading', lang)}</span>
      </div>
    );
  }

  // ─── Empty State ────────────────────────────────────────────
  if (athletes.length === 0) {
    return (
      <div className={styles.page}>
        <header className={styles.header}>
          <div className={styles.titleRow}>
            <h1 className={styles.title}>
              {lang === 'es' ? 'Mi Equipo' : 'My Team'}
            </h1>
            <button className={styles.inviteBtn} onClick={() => setShowInvite(true)}>
              <span className={styles.inviteBtnIcon}>+</span>
              {lang === 'es' ? 'Invitar Atleta' : 'Invite Athlete'}
            </button>
          </div>
        </header>

        <div className={styles.emptyState}>
          <div className={styles.emptyStateIcon}>👥</div>
          <h2 className={styles.emptyStateTitle}>
            {lang === 'es'
              ? 'Tu equipo está vacío'
              : 'Your team is empty'}
          </h2>
          <p className={styles.emptyStateText}>
            {lang === 'es'
              ? 'Invita atletas a tu equipo para monitorear su preparación, carga de entrenamiento y riesgo de lesión en tiempo real.'
              : 'Invite athletes to your team to monitor their readiness, training load, and injury risk in real time.'}
          </p>
          <button className={styles.inviteBtn} onClick={() => setShowInvite(true)}>
            <span className={styles.inviteBtnIcon}>+</span>
            {lang === 'es' ? 'Invitar Atleta' : 'Invite Athlete'}
          </button>
        </div>

        <InviteModal
          isOpen={showInvite}
          onClose={() => setShowInvite(false)}
          userId={user?.id}
          role={profile?.role}
          lang={lang}
        />
      </div>
    );
  }

  // ─── Full Team View ─────────────────────────────────────────
  return (
    <div className={styles.page}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.titleRow}>
          <div>
            <h1 className={styles.title}>
              {lang === 'es' ? 'Mi Equipo' : 'My Team'}
            </h1>
            <p className={styles.subtitle}>
              <span className={styles.athleteCount}>
                {athletes.length} {lang === 'es' ? 'atletas' : 'athletes'}
                {alertCount > 0 && (
                  <> · <span style={{ color: 'var(--color-red)' }}>
                    {alertCount} {lang === 'es' ? 'alertas' : 'alerts'}
                  </span></>
                )}
              </span>
            </p>
          </div>
          <button className={styles.inviteBtn} onClick={() => setShowInvite(true)}>
            <span className={styles.inviteBtnIcon}>+</span>
            {lang === 'es' ? 'Invitar Atleta' : 'Invite Athlete'}
          </button>
        </div>
      </header>

      {/* Toolbar: Filter + Sort */}
      <div className={styles.toolbar}>
        <div className={styles.filterGroup}>
          <button
            className={`${styles.filterBtn} ${filter === 'all' ? styles.filterBtnActive : ''}`}
            onClick={() => setFilter('all')}
          >
            {lang === 'es' ? 'Todos' : 'All'}
          </button>
          <button
            className={`${styles.filterBtn} ${filter === 'alerts' ? styles.filterBtnActive : ''}`}
            onClick={() => setFilter('alerts')}
          >
            {lang === 'es' ? 'Solo Alertas' : 'Alerts Only'}
            {alertCount > 0 && ` (${alertCount})`}
          </button>
        </div>

        <select
          className={styles.sortSelect}
          value={sort}
          onChange={(e) => setSort(e.target.value)}
        >
          <option value="score">
            {lang === 'es' ? 'Por Score' : 'By Score'}
          </option>
          <option value="name">
            {lang === 'es' ? 'Por Nombre' : 'By Name'}
          </option>
          <option value="recent">
            {lang === 'es' ? 'Más Reciente' : 'Most Recent'}
          </option>
        </select>
      </div>

      {/* Athlete Cards Grid */}
      <div className={styles.grid}>
        {displayedAthletes.map((athlete) => (
          <Link
            key={athlete.id}
            href={`/dashboard/team/${athlete.id}`}
            className={styles.athleteCard}
          >
            {/* Card Header: Avatar + Name + Score Badge */}
            <div className={styles.cardHeader}>
              <div className={styles.athleteInfo}>
                <div className={styles.avatar}>
                  {getInitials(athlete.name)}
                </div>
                <div className={styles.nameBlock}>
                  <div className={styles.athleteName}>{athlete.name}</div>
                  {athlete.sport && (
                    <div className={styles.athleteSport}>{athlete.sport}</div>
                  )}
                </div>
              </div>
              <div className={`${styles.scoreBadge} ${getScoreClass(athlete.score)}`}>
                {athlete.score != null ? athlete.score : '—'}
              </div>
            </div>

            {/* Key Metrics */}
            <div className={styles.metricsRow}>
              {/* Coach-oriented columns */}
              {isCoach ? (
                <>
                  <div className={styles.metric}>
                    <span className={styles.metricLabel}>HRV</span>
                    <span className={styles.metricValue}>
                      {athlete.hrv != null ? Math.round(athlete.hrv) : '—'}
                    </span>
                  </div>
                  <div className={styles.metric}>
                    <span className={styles.metricLabel}>
                      {lang === 'es' ? 'Sueño' : 'Sleep'}
                    </span>
                    <span className={styles.metricValue}>
                      {athlete.sleepTotal != null ? `${athlete.sleepTotal.toFixed(1)}h` : '—'}
                    </span>
                  </div>
                  <div className={styles.metric}>
                    <span className={`${styles.metricLabel} ${styles.metricHighlight}`}>
                      {lang === 'es' ? 'Carga' : 'Load'}
                    </span>
                    <span className={`${styles.metricValue} ${styles.metricHighlight}`}>
                      {athlete.trainingLoad != null ? athlete.trainingLoad : '—'}
                    </span>
                  </div>
                  <div className={styles.metric}>
                    <span className={`${styles.metricLabel} ${styles.metricHighlight}`}>ACWR</span>
                    <span className={`${styles.metricValue} ${styles.metricHighlight}`}>
                      {athlete.acwr != null ? athlete.acwr.toFixed(2) : '—'}
                    </span>
                  </div>
                </>
              ) : isDoctor ? (
                /* Doctor-oriented columns */
                <>
                  <div className={styles.metric}>
                    <span className={`${styles.metricLabel} ${styles.metricHighlight}`}>
                      {lang === 'es' ? 'FC Rep' : 'RHR'}
                    </span>
                    <span className={`${styles.metricValue} ${styles.metricHighlight}`}>
                      {athlete.rhr != null ? athlete.rhr : '—'}
                    </span>
                  </div>
                  <div className={styles.metric}>
                    <span className={styles.metricLabel}>HRV</span>
                    <span className={styles.metricValue}>
                      {athlete.hrv != null ? Math.round(athlete.hrv) : '—'}
                    </span>
                  </div>
                  <div className={styles.metric}>
                    <span className={`${styles.metricLabel} ${styles.metricHighlight}`}>
                      {lang === 'es' ? 'Recup' : 'Recov'}
                    </span>
                    <span className={`${styles.metricValue} ${styles.metricHighlight}`}>
                      {athlete.wellarynResult?.subScores?.recovery != null
                        ? athlete.wellarynResult.subScores.recovery
                        : '—'}
                    </span>
                  </div>
                  <div className={styles.metric}>
                    <span className={`${styles.metricLabel} ${styles.metricHighlight}`}>
                      {lang === 'es' ? 'Riesgo' : 'Risk'}
                    </span>
                    <span className={`${styles.metricValue} ${styles.metricHighlight}`}>
                      {athlete.wellarynResult?.subScores?.injuryRisk != null
                        ? athlete.wellarynResult.subScores.injuryRisk
                        : '—'}
                    </span>
                  </div>
                </>
              ) : (
                /* Default / fallback columns */
                <>
                  <div className={styles.metric}>
                    <span className={styles.metricLabel}>HRV</span>
                    <span className={styles.metricValue}>
                      {athlete.hrv != null ? Math.round(athlete.hrv) : '—'}
                    </span>
                  </div>
                  <div className={styles.metric}>
                    <span className={styles.metricLabel}>
                      {lang === 'es' ? 'FC Rep' : 'RHR'}
                    </span>
                    <span className={styles.metricValue}>
                      {athlete.rhr != null ? athlete.rhr : '—'}
                    </span>
                  </div>
                  <div className={styles.metric}>
                    <span className={styles.metricLabel}>
                      {lang === 'es' ? 'Sueño' : 'Sleep'}
                    </span>
                    <span className={styles.metricValue}>
                      {athlete.sleepTotal != null ? `${athlete.sleepTotal.toFixed(1)}h` : '—'}
                    </span>
                  </div>
                  <div className={styles.metric}>
                    <span className={styles.metricLabel}>
                      {lang === 'es' ? 'Carga' : 'Load'}
                    </span>
                    <span className={styles.metricValue}>
                      {athlete.trainingLoad != null ? athlete.trainingLoad : '—'}
                    </span>
                  </div>
                </>
              )}
            </div>

            {/* Alert Badges */}
            {athlete.alerts.length > 0 && (
              <>
                <hr className={styles.cardDivider} />
                <div className={styles.alertRow}>
                  {athlete.alerts.includes('low-score') && (
                    <span className={`${styles.alertBadge} ${styles.alertLow}`}>
                      ⚠ {lang === 'es' ? 'Score bajo' : 'Low score'}
                    </span>
                  )}
                  {athlete.alerts.includes('high-acwr') && (
                    <span className={`${styles.alertBadge} ${styles.alertACWR}`}>
                      📈 ACWR {'>'} 1.5
                    </span>
                  )}
                  {athlete.alerts.includes('stale') && (
                    <span className={`${styles.alertBadge} ${styles.alertStale}`}>
                      ⏳ {lang === 'es' ? 'Sin datos 48h' : 'No data 48h'}
                    </span>
                  )}
                </div>
              </>
            )}

            {/* Last Updated */}
            {athlete.lastUpdated && (
              <div className={styles.lastUpdated}>
                {formatRelativeTime(athlete.lastUpdated, lang)}
              </div>
            )}
          </Link>
        ))}
      </div>

      {/* Auto-refresh indicator */}
      {lastRefresh && (
        <div className={styles.refreshIndicator}>
          <span className={styles.refreshDot} />
          {lang === 'es' ? 'Actualización automática cada 5 min' : 'Auto-refresh every 5 min'}
          {' · '}
          {lastRefresh.toLocaleTimeString(lang === 'es' ? 'es-MX' : 'en-US', {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </div>
      )}

      {/* Invite Modal */}
      <InviteModal
        isOpen={showInvite}
        onClose={() => setShowInvite(false)}
        userId={user?.id}
        role={profile?.role}
        lang={lang}
      />
    </div>
  );
}
