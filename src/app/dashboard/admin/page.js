'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  ResponsiveContainer,
  BarChart, Bar,
  LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Cell,
} from 'recharts';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { t } from '@/lib/i18n';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import styles from './admin.module.css';

// ─── Constants ──────────────────────────────────────────────────

const CHART_COLORS = {
  accent: 'hsl(152, 68%, 52%)',
  purple: 'hsl(270, 60%, 60%)',
  yellow: 'hsl(45, 93%, 58%)',
  muted: 'hsl(225, 10%, 35%)',
  tickFill: 'hsl(225, 10%, 55%)',
  grid: 'hsla(0, 0%, 100%, 0.06)',
};

const ROLE_CLASSES = {
  athlete: styles.roleAthlete,
  coach: styles.roleCoach,
  doctor: styles.roleDoctor,
  admin: styles.roleAdmin,
};

const PLAN_CLASSES = {
  free: styles.planFree,
  pro: styles.planPro,
  team: styles.planTeam,
};

const ROLE_ICONS = { athlete: '🏃', coach: '📋', doctor: '🩺', admin: '👑' };

// ─── Helpers ────────────────────────────────────────────────────

function getInitials(name) {
  if (!name) return '?';
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatRelativeTime(dateStr) {
  if (!dateStr) return '—';
  const now = new Date();
  const d = new Date(dateStr);
  const diffMs = now - d;
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);
  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;
  return formatDate(dateStr);
}

// ─── Shared Chart Config ────────────────────────────────────────

const xAxisProps = {
  stroke: CHART_COLORS.muted,
  tick: { fontSize: 11, fill: CHART_COLORS.tickFill },
  tickLine: false,
  axisLine: false,
};

const yAxisProps = {
  stroke: CHART_COLORS.muted,
  tick: { fontSize: 11, fill: CHART_COLORS.tickFill },
  tickLine: false,
  axisLine: false,
};

const gridProps = {
  strokeDasharray: '3 3',
  stroke: CHART_COLORS.grid,
  vertical: false,
};

// ─── Tooltip ────────────────────────────────────────────────────

function ChartTooltip({ active, payload, label, keys }) {
  if (!active || !payload?.length) return null;
  return (
    <div className={styles.tooltip}>
      <div className={styles.tooltipLabel}>{label}</div>
      {payload.map((entry) => (
        <div key={entry.dataKey} className={styles.tooltipRow}>
          <span className={styles.tooltipDot} style={{ background: entry.color || entry.fill }} />
          <span style={{ color: entry.color || entry.fill, fontWeight: 600, fontSize: '12px' }}>
            {keys?.[entry.dataKey] || entry.dataKey}: {typeof entry.value === 'number' ? entry.value : entry.value}
          </span>
        </div>
      ))}
    </div>
  );
}

// ─── Confirm Dialog ─────────────────────────────────────────────

function ConfirmDialog({ title, message, onConfirm, onCancel, lang }) {
  return (
    <div className={styles.confirmOverlay} onClick={onCancel}>
      <div className={styles.confirmDialog} onClick={e => e.stopPropagation()}>
        <h3 className={styles.confirmTitle}>{title}</h3>
        <p className={styles.confirmText}>{message}</p>
        <div className={styles.confirmActions}>
          <button className={styles.confirmCancel} onClick={onCancel}>
            {t('dashboard.admin.cancel', lang)}
          </button>
          <button className={styles.confirmDanger} onClick={onConfirm}>
            {t('dashboard.admin.confirm', lang)}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────

function AdminDashboardPage() {
  const { lang } = useLanguage();
  const { user } = useAuth();

  // State
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [totalUsers, setTotalUsers] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [planFilter, setPlanFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortDir, setSortDir] = useState('desc');
  const [isLoading, setIsLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [confirmAction, setConfirmAction] = useState(null);

  const ITEMS_PER_PAGE = 25;

  // ─── Fetch Stats ──────────────────────────────────────────────

  const loadStats = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/stats');
      if (!res.ok) throw new Error('Failed to fetch stats');
      const data = await res.json();
      setStats(data);
    } catch (err) {
      console.error('Error loading admin stats:', err);
    }
  }, []);

  // ─── Fetch Users ──────────────────────────────────────────────

  const loadUsers = useCallback(async () => {
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: ITEMS_PER_PAGE.toString(),
        search,
        role: roleFilter,
        plan: planFilter,
        status: statusFilter,
        sortBy,
        sortDir,
      });

      const res = await fetch(`/api/admin/users?${params}`);
      if (!res.ok) throw new Error('Failed to fetch users');
      const data = await res.json();
      setUsers(data.users || []);
      setTotalUsers(data.total || 0);
      setTotalPages(data.totalPages || 1);
    } catch (err) {
      console.error('Error loading admin users:', err);
    }
  }, [currentPage, search, roleFilter, planFilter, statusFilter, sortBy, sortDir]);

  // ─── Initial Load ─────────────────────────────────────────────

  useEffect(() => {
    async function init() {
      setIsLoading(true);
      await Promise.all([loadStats(), loadUsers()]);
      setIsLoading(false);
    }
    init();
  }, [loadStats, loadUsers]);

  // ─── User Actions ─────────────────────────────────────────────

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const handleUserAction = useCallback(async (userId, action, value) => {
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, action, value }),
      });
      if (!res.ok) {
        const err = await res.json();
        showToast(`❌ ${err.error || 'Failed'}`);
        return;
      }
      showToast(`✅ ${t('dashboard.admin.actionSuccess', lang)}`);
      await loadUsers();
      if (action === 'changeRole' || action === 'changePlan') {
        await loadStats();
      }
    } catch (err) {
      console.error('User action error:', err);
      showToast('❌ Error');
    }
  }, [lang, loadUsers, loadStats]);

  const handleDeleteUser = useCallback((userId, name) => {
    setConfirmAction({
      title: t('dashboard.admin.deleteUser', lang),
      message: `${t('dashboard.admin.deleteConfirm', lang)} "${name}"?`,
      onConfirm: async () => {
        setConfirmAction(null);
        await handleUserAction(userId, 'delete');
      },
    });
  }, [lang, handleUserAction]);

  // ─── Search debounce ──────────────────────────────────────────

  const [searchInput, setSearchInput] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput);
      setCurrentPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // ─── Sort handler ─────────────────────────────────────────────

  const handleSort = (col) => {
    if (sortBy === col) {
      setSortDir(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(col);
      setSortDir('desc');
    }
    setCurrentPage(1);
  };

  // ─── Loading ──────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className={styles.page}>
        <header className={styles.header}>
          <h1 className={styles.title}>{t('dashboard.admin.title', lang)}</h1>
          <p className={styles.subtitle}>{t('dashboard.admin.subtitle', lang)}</p>
        </header>
        <div className={styles.skeletonGrid}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className={styles.skeletonCard} />
          ))}
        </div>
        <div className={styles.skeletonTable} />
      </div>
    );
  }

  // ─── Render ───────────────────────────────────────────────────

  return (
    <div className={styles.page}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.headerRow}>
          <div>
            <h1 className={styles.title}>{t('dashboard.admin.title', lang)}</h1>
            <p className={styles.subtitle}>{t('dashboard.admin.subtitle', lang)}</p>
          </div>
          <div className={styles.adminBadge}>
            👑 {t('dashboard.admin.adminAccess', lang)}
          </div>
        </div>
      </header>

      {/* 1. Platform Stats */}
      {stats && (
        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <div className={styles.statIcon}>👥</div>
            <div className={styles.statLabel}>{t('dashboard.admin.totalUsers', lang)}</div>
            <div className={styles.statValue}>{stats.totalUsers}</div>
            <div className={styles.statMeta}>
              {stats.roleCounts.athlete} {lang === 'es' ? 'atletas' : 'athletes'} · {stats.roleCounts.coach} coaches · {stats.roleCounts.doctor} {lang === 'es' ? 'doctores' : 'doctors'}
            </div>
          </div>

          <div className={styles.statCard}>
            <div className={styles.statIcon}>🟢</div>
            <div className={styles.statLabel}>{t('dashboard.admin.activeUsers', lang)}</div>
            <div className={styles.statValue}>{stats.activeUsers}</div>
            <div className={styles.statMeta}>{lang === 'es' ? 'últimos 7 días' : 'last 7 days'}</div>
          </div>

          <div className={styles.statCard}>
            <div className={styles.statIcon}>📊</div>
            <div className={styles.statLabel}>{t('dashboard.admin.totalDataPoints', lang)}</div>
            <div className={styles.statValue}>{stats.totalDataPoints.toLocaleString()}</div>
            <div className={styles.statMeta}>daily_metrics</div>
          </div>

          <div className={styles.statCard}>
            <div className={styles.statIcon}>💰</div>
            <div className={styles.statLabel}>{t('dashboard.admin.revenue', lang)}</div>
            <div className={styles.statValue}>
              <span className={styles.statGreen}>${stats.estimatedMRR}</span>
            </div>
            <div className={styles.statMeta}>MRR · {stats.planCounts.pro} Pro + {stats.planCounts.team} Team</div>
          </div>

          <div className={styles.statCard}>
            <div className={styles.statIcon}>🆕</div>
            <div className={styles.statLabel}>{t('dashboard.admin.newUsers', lang)}</div>
            <div className={styles.statValue}>{stats.newUsers}</div>
            <div className={styles.statMeta}>{lang === 'es' ? 'últimos 30 días' : 'last 30 days'}</div>
          </div>

          <div className={styles.statCard}>
            <div className={styles.statIcon}>📈</div>
            <div className={styles.statLabel}>{t('dashboard.admin.conversionRate', lang)}</div>
            <div className={styles.statValue}>
              <span className={styles.statYellow}>{stats.conversionRate}%</span>
            </div>
            <div className={styles.statMeta}>{lang === 'es' ? 'free → pago' : 'free → paid'}</div>
          </div>
        </div>
      )}

      {/* 2. Growth Charts */}
      {stats && (
        <div className={styles.chartsGrid}>
          {/* Growth Chart */}
          <div className={styles.chartCard}>
            <div className={styles.chartHeader}>
              <h3 className={styles.chartTitle}>{t('dashboard.admin.growthChart', lang)}</h3>
              <span className={styles.chartSubtitle}>
                {lang === 'es' ? 'Registros por semana (últimas 12 semanas)' : 'Signups per week (last 12 weeks)'}
              </span>
            </div>
            <div className={styles.chartWrapper}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={stats.weeklyGrowth} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid {...gridProps} />
                  <XAxis dataKey="week" {...xAxisProps} />
                  <YAxis {...yAxisProps} allowDecimals={false} />
                  <Tooltip content={<ChartTooltip keys={{ signups: lang === 'es' ? 'Registros' : 'Signups' }} />} />
                  <Line
                    type="monotone"
                    dataKey="signups"
                    stroke={CHART_COLORS.accent}
                    strokeWidth={2.5}
                    dot={{ r: 4, fill: CHART_COLORS.accent, strokeWidth: 0 }}
                    activeDot={{ r: 6, strokeWidth: 2, stroke: 'hsl(225, 14%, 13%)' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Plan Distribution */}
          <div className={styles.chartCard}>
            <div className={styles.chartHeader}>
              <h3 className={styles.chartTitle}>{t('dashboard.admin.planDistribution', lang)}</h3>
              <span className={styles.chartSubtitle}>
                {stats.totalUsers} {lang === 'es' ? 'usuarios totales' : 'total users'}
              </span>
            </div>
            <div className={styles.chartWrapper}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.planDistribution} margin={{ top: 10, right: 10, left: -10, bottom: 20 }}>
                  <CartesianGrid {...gridProps} />
                  <XAxis dataKey="name" {...xAxisProps} />
                  <YAxis {...yAxisProps} allowDecimals={false} />
                  <Tooltip content={<ChartTooltip keys={{ value: lang === 'es' ? 'Usuarios' : 'Users' }} />} />
                  <Bar dataKey="value" radius={[6, 6, 0, 0]} maxBarSize={60}>
                    {stats.planDistribution.map((entry, idx) => (
                      <Cell key={idx} fill={entry.color} fillOpacity={0.8} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* 3. User Management */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>
            <span className={styles.sectionIcon}>👥</span>
            {t('dashboard.admin.userManagement', lang)}
          </h2>
        </div>

        {/* Toolbar */}
        <div className={styles.toolbar}>
          <div className={styles.searchWrap}>
            <span className={styles.searchIcon}>🔍</span>
            <input
              type="text"
              className={styles.searchInput}
              placeholder={t('dashboard.admin.searchPlaceholder', lang)}
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
          </div>

          <select
            className={styles.filterSelect}
            value={roleFilter}
            onChange={(e) => { setRoleFilter(e.target.value); setCurrentPage(1); }}
          >
            <option value="">{t('dashboard.admin.allRoles', lang)}</option>
            <option value="athlete">{lang === 'es' ? 'Atleta' : 'Athlete'}</option>
            <option value="coach">Coach</option>
            <option value="doctor">{lang === 'es' ? 'Doctor' : 'Doctor'}</option>
            <option value="admin">Admin</option>
          </select>

          <select
            className={styles.filterSelect}
            value={planFilter}
            onChange={(e) => { setPlanFilter(e.target.value); setCurrentPage(1); }}
          >
            <option value="">{t('dashboard.admin.allPlans', lang)}</option>
            <option value="free">Free</option>
            <option value="pro">Pro</option>
            <option value="team">Team</option>
          </select>

          <select
            className={styles.filterSelect}
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
          >
            <option value="">{t('dashboard.admin.allStatus', lang)}</option>
            <option value="active">{lang === 'es' ? 'Activo' : 'Active'}</option>
            <option value="disabled">{lang === 'es' ? 'Deshabilitado' : 'Disabled'}</option>
          </select>
        </div>

        {/* Users Table */}
        <div className={styles.tableWrap} style={{ marginTop: 'var(--space-md)' }}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th onClick={() => handleSort('display_name')}>
                  {t('dashboard.admin.name', lang)}
                  {sortBy === 'display_name' && (
                    <span className={styles.sortArrow}>{sortDir === 'asc' ? '▲' : '▼'}</span>
                  )}
                </th>
                <th>{t('dashboard.admin.email', lang)}</th>
                <th onClick={() => handleSort('role')}>
                  {t('dashboard.admin.role', lang)}
                  {sortBy === 'role' && (
                    <span className={styles.sortArrow}>{sortDir === 'asc' ? '▲' : '▼'}</span>
                  )}
                </th>
                <th onClick={() => handleSort('plan')}>
                  {t('dashboard.admin.plan', lang)}
                  {sortBy === 'plan' && (
                    <span className={styles.sortArrow}>{sortDir === 'asc' ? '▲' : '▼'}</span>
                  )}
                </th>
                <th>{t('dashboard.admin.status', lang)}</th>
                <th onClick={() => handleSort('created_at')}>
                  {t('dashboard.admin.joined', lang)}
                  {sortBy === 'created_at' && (
                    <span className={`${styles.sortArrow} ${styles.sortActive}`}>{sortDir === 'asc' ? '▲' : '▼'}</span>
                  )}
                </th>
                <th>{t('dashboard.admin.actions', lang)}</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  {/* Name + Avatar */}
                  <td>
                    <div className={styles.userCell}>
                      <div className={styles.userAvatar}>
                        {getInitials(u.display_name)}
                      </div>
                      <div>
                        <div className={styles.userName}>{u.display_name || '—'}</div>
                      </div>
                    </div>
                  </td>

                  {/* Email */}
                  <td>
                    <span className={styles.userEmail}>{u.email || '—'}</span>
                  </td>

                  {/* Role */}
                  <td>
                    <span className={`${styles.roleBadge} ${ROLE_CLASSES[u.role] || styles.roleAthlete}`}>
                      {ROLE_ICONS[u.role] || '🏃'} {u.role || 'athlete'}
                    </span>
                  </td>

                  {/* Plan */}
                  <td>
                    <span className={`${styles.planBadge} ${PLAN_CLASSES[u.plan] || styles.planFree}`}>
                      {u.plan || 'free'}
                    </span>
                  </td>

                  {/* Status */}
                  <td>
                    <span className={`${styles.statusDot} ${u.is_disabled ? styles.statusDisabled : styles.statusActive}`}>
                      <span className={styles.statusIndicator} />
                      {u.is_disabled
                        ? (lang === 'es' ? 'Deshabilitado' : 'Disabled')
                        : (lang === 'es' ? 'Activo' : 'Active')}
                    </span>
                  </td>

                  {/* Joined */}
                  <td style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)' }}>
                    {formatDate(u.created_at)}
                  </td>

                  {/* Actions */}
                  <td>
                    <div className={styles.actionsCell}>
                      {/* Change Role */}
                      <select
                        className={styles.actionSelect}
                        value={u.role || 'athlete'}
                        onChange={(e) => handleUserAction(u.id, 'changeRole', e.target.value)}
                        title={t('dashboard.admin.changeRole', lang)}
                      >
                        <option value="athlete">Athlete</option>
                        <option value="coach">Coach</option>
                        <option value="doctor">Doctor</option>
                        <option value="admin">Admin</option>
                      </select>

                      {/* Change Plan */}
                      <select
                        className={styles.actionSelect}
                        value={u.plan || 'free'}
                        onChange={(e) => handleUserAction(u.id, 'changePlan', e.target.value)}
                        title={t('dashboard.admin.changePlan', lang)}
                      >
                        <option value="free">Free</option>
                        <option value="pro">Pro</option>
                        <option value="team">Team</option>
                      </select>

                      {/* Toggle Disable */}
                      <button
                        className={styles.actionBtn}
                        onClick={() => handleUserAction(u.id, 'toggleDisable', !u.is_disabled)}
                        title={u.is_disabled ? 'Enable' : 'Disable'}
                      >
                        {u.is_disabled ? '✅' : '🚫'}
                      </button>

                      {/* Delete */}
                      <button
                        className={styles.actionBtnDanger}
                        onClick={() => handleDeleteUser(u.id, u.display_name || u.email)}
                        title={t('dashboard.admin.deleteUser', lang)}
                      >
                        🗑️
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: 'var(--space-xl)', color: 'var(--text-muted)' }}>
                    {t('dashboard.admin.noUsers', lang)}
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {/* Pagination */}
          <div className={styles.pagination}>
            <div className={styles.paginationInfo}>
              {lang === 'es'
                ? `Mostrando ${((currentPage - 1) * ITEMS_PER_PAGE) + 1}–${Math.min(currentPage * ITEMS_PER_PAGE, totalUsers)} de ${totalUsers}`
                : `Showing ${((currentPage - 1) * ITEMS_PER_PAGE) + 1}–${Math.min(currentPage * ITEMS_PER_PAGE, totalUsers)} of ${totalUsers}`}
            </div>
            <div className={styles.paginationBtns}>
              <button
                className={styles.pageBtn}
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                ←
              </button>
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                const startPage = Math.max(1, Math.min(currentPage - 2, totalPages - 4));
                const page = startPage + i;
                if (page > totalPages) return null;
                return (
                  <button
                    key={page}
                    className={page === currentPage ? styles.pageBtnActive : styles.pageBtn}
                    onClick={() => setCurrentPage(page)}
                  >
                    {page}
                  </button>
                );
              })}
              <button
                className={styles.pageBtn}
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                →
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 4. System Health */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>
            <span className={styles.sectionIcon}>🖥️</span>
            {t('dashboard.admin.systemHealth', lang)}
          </h2>
        </div>
        <div className={styles.healthGrid}>
          <div className={styles.healthCard}>
            <div className={styles.healthLabel}>{t('dashboard.admin.apiResponse', lang)}</div>
            <div className={`${styles.healthValue} ${styles.healthGood}`}>45ms</div>
            <div className={styles.healthMeta}>p95 · {lang === 'es' ? 'Último minuto' : 'Last minute'}</div>
          </div>
          <div className={styles.healthCard}>
            <div className={styles.healthLabel}>{t('dashboard.admin.databaseSize', lang)}</div>
            <div className={styles.healthValue}>2.4 GB</div>
            <div className={styles.healthMeta}>PostgreSQL · Supabase</div>
          </div>
          <div className={styles.healthCard}>
            <div className={styles.healthLabel}>{t('dashboard.admin.activeConnections', lang)}</div>
            <div className={`${styles.healthValue} ${styles.healthGood}`}>12</div>
            <div className={styles.healthMeta}>{lang === 'es' ? 'de 100 máx' : 'of 100 max'}</div>
          </div>
          <div className={styles.healthCard}>
            <div className={styles.healthLabel}>{t('dashboard.admin.lastDeploy', lang)}</div>
            <div className={styles.healthValue} style={{ fontSize: 'var(--font-size-base)' }}>
              {lang === 'es' ? 'Hoy' : 'Today'} · v2.4.1
            </div>
            <div className={styles.healthMeta}>Vercel · {lang === 'es' ? 'Producción' : 'Production'}</div>
          </div>
        </div>
      </div>

      {/* 5. Invite Code Management */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>
            <span className={styles.sectionIcon}>🎫</span>
            {t('dashboard.admin.inviteCodes', lang)}
          </h2>
          <button className={styles.generateBtn} onClick={() => showToast('✅ WEL-A-' + Date.now().toString(36).toUpperCase())}>
            ➕ {t('dashboard.admin.generateCode', lang)}
          </button>
        </div>
        <div className={styles.inviteSection}>
          <div className={styles.emptyInvites}>
            {t('dashboard.admin.noInvites', lang)}
          </div>
        </div>
      </div>

      {/* Toast */}
      {toast && <div className={styles.toast}>{toast}</div>}

      {/* Confirm Dialog */}
      {confirmAction && (
        <ConfirmDialog
          title={confirmAction.title}
          message={confirmAction.message}
          onConfirm={confirmAction.onConfirm}
          onCancel={() => setConfirmAction(null)}
          lang={lang}
        />
      )}
    </div>
  );
}

// Wrap with ProtectedRoute
export default function AdminPageWrapper() {
  return (
    <ProtectedRoute allowedRoles={['admin']}>
      <AdminDashboardPage />
    </ProtectedRoute>
  );
}
