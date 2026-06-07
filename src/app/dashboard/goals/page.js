'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { t } from '@/lib/i18n';
import {
  fetchGoals,
  createGoal,
  updateGoal,
  deleteGoal,
  fetchCoachAthletes,
} from '@/lib/supabase/data-service';
import styles from './goals.module.css';

// ─── Constants ────────────────────────────────────────────────

const CATEGORY_ICONS = {
  performance: '🏆',
  recovery: '💚',
  sleep: '😴',
  training: '🏋️',
  weight: '⚖️',
  custom: '🎯',
};

const CATEGORY_COLORS = {
  performance: 'hsl(45, 93%, 58%)',
  recovery: 'hsl(152, 68%, 52%)',
  sleep: 'hsl(250, 70%, 65%)',
  training: 'hsl(20, 100%, 60%)',
  weight: 'hsl(200, 80%, 55%)',
  custom: 'hsl(280, 60%, 60%)',
};

const PRESETS = {
  performance: [
    { key: 'score85', title: 'dashboard.goals.presets.score85', metric: 'wellaryn_score', target: 85, unit: 'pts' },
  ],
  recovery: [
    { key: 'hrv50', title: 'dashboard.goals.presets.hrv50', metric: 'hrv', target: 50, unit: 'ms' },
  ],
  sleep: [
    { key: 'sleep8', title: 'dashboard.goals.presets.sleep8', metric: 'sleep_hours', target: 8, unit: 'h' },
  ],
  training: [
    { key: 'train5', title: 'dashboard.goals.presets.train5', metric: 'training_days', target: 5, unit: 'days/wk' },
  ],
  weight: [],
  custom: [],
};

// ─── Helpers ──────────────────────────────────────────────────

function progressColor(progress) {
  if (progress >= 100) return 'var(--color-green)';
  if (progress >= 60) return 'var(--color-yellow)';
  if (progress >= 30) return 'hsl(20, 100%, 60%)';
  return 'var(--color-red)';
}

function daysUntil(dateStr) {
  if (!dateStr) return null;
  const target = new Date(dateStr + 'T00:00:00Z');
  const now = new Date();
  const diff = Math.ceil((target - now) / (1000 * 60 * 60 * 24));
  return diff;
}

// SVG circular progress ring
function ProgressRing({ progress, color, size = 72 }) {
  const radius = (size - 12) / 2;
  const circumference = 2 * Math.PI * radius;
  const clampedProgress = Math.min(100, Math.max(0, progress));
  const offset = circumference - (clampedProgress / 100) * circumference;

  return (
    <div className={styles.progressRing} style={{ width: size, height: size }}>
      <svg className={styles.progressRingSvg} width={size} height={size}>
        <circle
          className={styles.progressRingBg}
          cx={size / 2}
          cy={size / 2}
          r={radius}
        />
        <circle
          className={styles.progressRingFg}
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <span className={styles.progressPercent}>{Math.round(clampedProgress)}%</span>
    </div>
  );
}

// ─── GoalCard Component ───────────────────────────────────────

function GoalCard({ goal, lang, onEdit, onDelete, onStatusChange, isCoachView, currentUserId }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  // Close menu on outside click
  useEffect(() => {
    if (!menuOpen) return;
    function handleClick(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [menuOpen]);

  const days = daysUntil(goal.target_date);
  const isCompleted = goal.status === 'completed';
  const isPaused = goal.status === 'paused';
  const canEdit = !isCoachView || goal.created_by === currentUserId;
  const categoryIcon = CATEGORY_ICONS[goal.category] || '🎯';
  const color = CATEGORY_COLORS[goal.category] || 'var(--accent)';

  return (
    <div className={`${styles.goalCard} ${isCompleted ? styles.goalCardCompleted : ''}`}>
      {/* Header */}
      <div className={styles.cardHeader}>
        <div className={styles.cardHeaderLeft}>
          <span className={styles.categoryIcon}>{categoryIcon}</span>
          <span className={styles.categoryLabel}>
            {t(`dashboard.goals.category.${goal.category}`, lang)}
          </span>
        </div>

        <span className={`${styles.statusBadge} ${
          isCompleted ? styles.statusCompleted
            : isPaused ? styles.statusPaused
            : styles.statusActive
        }`}>
          {isCompleted ? '✓ ' : isPaused ? '⏸ ' : '● '}
          {isCompleted
            ? t('dashboard.goals.completed', lang)
            : isPaused
            ? t('dashboard.goals.paused', lang)
            : t('dashboard.goals.active', lang)}
        </span>
      </div>

      {/* Title + Description */}
      <div className={styles.goalTitle}>{goal.title}</div>
      {goal.description && <div className={styles.goalDesc}>{goal.description}</div>}

      {/* Progress */}
      <div className={styles.progressArea}>
        <ProgressRing progress={goal.progress || 0} color={isCompleted ? 'var(--color-green)' : progressColor(goal.progress || 0)} />
        <div className={styles.progressDetails}>
          {goal.current_value != null && goal.target_value != null && (
            <div className={styles.progressValues}>
              {goal.current_value}
              <span className={styles.progressArrow}>→</span>
              {goal.target_value}
              {goal.unit && <span className={styles.progressUnit}> {goal.unit}</span>}
            </div>
          )}
          {isCompleted && (
            <span className={styles.trophyBadge}>
              🏆 {lang === 'es' ? '¡Meta alcanzada!' : 'Goal achieved!'}
            </span>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className={styles.cardFooter}>
        {days != null ? (
          <div className={styles.daysLeft}>
            <span className={`${styles.daysLeftValue} ${days < 0 ? styles.daysLeftOverdue : ''}`}>
              {days >= 0 ? days : Math.abs(days)}
            </span>
            <span>
              {days >= 0
                ? t('dashboard.goals.daysLeft', lang)
                : (lang === 'es' ? 'días vencidos' : 'days overdue')}
            </span>
          </div>
        ) : <div />}

        {canEdit && (
          <div ref={menuRef} style={{ position: 'relative' }}>
            <button className={styles.menuBtn} onClick={() => setMenuOpen(!menuOpen)} aria-label="Menu">
              ⋯
            </button>
            {menuOpen && (
              <div className={styles.menuDropdown}>
                <button className={styles.menuItem} onClick={() => { setMenuOpen(false); onEdit(goal); }}>
                  ✏️ {t('dashboard.goals.editGoal', lang)}
                </button>
                {!isCompleted && (
                  <button
                    className={styles.menuItem}
                    onClick={() => { setMenuOpen(false); onStatusChange(goal.id, isPaused ? 'active' : 'paused'); }}
                  >
                    {isPaused ? '▶️' : '⏸️'} {isPaused ? (lang === 'es' ? 'Reanudar' : 'Resume') : (lang === 'es' ? 'Pausar' : 'Pause')}
                  </button>
                )}
                {!isCompleted && goal.progress >= 100 && (
                  <button
                    className={styles.menuItem}
                    onClick={() => { setMenuOpen(false); onStatusChange(goal.id, 'completed'); }}
                  >
                    ✅ {lang === 'es' ? 'Marcar completada' : 'Mark Complete'}
                  </button>
                )}
                <button
                  className={`${styles.menuItem} ${styles.menuItemDanger}`}
                  onClick={() => { setMenuOpen(false); onDelete(goal.id); }}
                >
                  🗑 {t('dashboard.goals.deleteGoal', lang)}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── AddGoalModal Component ───────────────────────────────────

function AddGoalModal({ isOpen, onClose, onSave, editGoal, lang, athletes, selectedAthlete }) {
  const [category, setCategory] = useState(editGoal?.category || '');
  const [title, setTitle] = useState(editGoal?.title || '');
  const [description, setDescription] = useState(editGoal?.description || '');
  const [metric, setMetric] = useState(editGoal?.metric || '');
  const [targetValue, setTargetValue] = useState(editGoal?.target_value ?? '');
  const [currentValue, setCurrentValue] = useState(editGoal?.current_value ?? '');
  const [unit, setUnit] = useState(editGoal?.unit || '');
  const [targetDate, setTargetDate] = useState(editGoal?.target_date || '');
  const [notes, setNotes] = useState(editGoal?.notes || '');
  const [athleteId, setAthleteId] = useState(selectedAthlete || '');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (editGoal) {
      setCategory(editGoal.category || '');
      setTitle(editGoal.title || '');
      setDescription(editGoal.description || '');
      setMetric(editGoal.metric || '');
      setTargetValue(editGoal.target_value ?? '');
      setCurrentValue(editGoal.current_value ?? '');
      setUnit(editGoal.unit || '');
      setTargetDate(editGoal.target_date || '');
      setNotes(editGoal.notes || '');
    }
  }, [editGoal]);

  useEffect(() => {
    if (selectedAthlete) setAthleteId(selectedAthlete);
  }, [selectedAthlete]);

  if (!isOpen) return null;

  function handlePreset(preset) {
    setTitle(t(preset.title, lang));
    setMetric(preset.metric);
    setTargetValue(preset.target);
    setUnit(preset.unit);
  }

  async function handleSave() {
    if (!title || !category) return;
    setSaving(true);
    try {
      await onSave({
        id: editGoal?.id,
        title,
        description: description || null,
        category,
        metric: metric || null,
        target_value: targetValue !== '' ? Number(targetValue) : null,
        current_value: currentValue !== '' ? Number(currentValue) : null,
        unit: unit || null,
        target_date: targetDate || null,
        notes: notes || null,
        user_id: athleteId || undefined,
      });
      onClose();
    } catch (err) {
      console.error('Error saving goal:', err);
    } finally {
      setSaving(false);
    }
  }

  const categories = ['performance', 'recovery', 'sleep', 'training', 'weight', 'custom'];

  return (
    <div className={styles.modalOverlay} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={styles.modal}>
        <h2 className={styles.modalTitle}>
          {editGoal ? t('dashboard.goals.editGoal', lang) : t('dashboard.goals.addGoal', lang)}
        </h2>

        {/* Coach: athlete selector */}
        {athletes && athletes.length > 0 && !editGoal && (
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>
              {t('dashboard.reports.selectAthlete', lang)}
            </label>
            <select
              className={`${styles.formInput} ${styles.athleteSelect}`}
              value={athleteId}
              onChange={(e) => setAthleteId(e.target.value)}
            >
              {athletes.map(a => (
                <option key={a.athlete_id} value={a.athlete_id}>
                  {a.profile?.display_name || a.athlete_id}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Category Selector */}
        <div className={styles.categoryGrid}>
          {categories.map((cat) => (
            <button
              key={cat}
              className={`${styles.categoryCard} ${category === cat ? styles.categoryCardActive : ''}`}
              onClick={() => setCategory(cat)}
              type="button"
            >
              <span className={styles.categoryCardIcon}>{CATEGORY_ICONS[cat]}</span>
              <span className={styles.categoryCardLabel}>
                {t(`dashboard.goals.category.${cat}`, lang)}
              </span>
            </button>
          ))}
        </div>

        {/* Presets */}
        {category && PRESETS[category] && PRESETS[category].length > 0 && !editGoal && (
          <div className={styles.presetSection}>
            <div className={styles.presetLabel}>{lang === 'es' ? 'Metas sugeridas' : 'Suggested Goals'}</div>
            <div className={styles.presetList}>
              {PRESETS[category].map((preset) => (
                <button
                  key={preset.key}
                  className={`${styles.presetItem} ${title === t(preset.title, lang) ? styles.presetItemActive : ''}`}
                  onClick={() => handlePreset(preset)}
                  type="button"
                >
                  ⚡ {t(preset.title, lang)}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Title */}
        <div className={styles.formGroup}>
          <label className={styles.formLabel}>{lang === 'es' ? 'Título' : 'Title'}</label>
          <input
            className={styles.formInput}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={lang === 'es' ? 'Ej: Mejorar mi score a 85' : 'E.g., Improve my score to 85'}
          />
        </div>

        {/* Description */}
        <div className={styles.formGroup}>
          <label className={styles.formLabel}>{lang === 'es' ? 'Descripción' : 'Description'}</label>
          <textarea
            className={styles.formTextarea}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={lang === 'es' ? 'Descripción opcional...' : 'Optional description...'}
          />
        </div>

        {/* Target Value + Unit */}
        <div className={styles.formRow}>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>{t('dashboard.goals.target', lang)}</label>
            <input
              className={styles.formInput}
              type="number"
              value={targetValue}
              onChange={(e) => setTargetValue(e.target.value)}
              placeholder="85"
            />
          </div>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>{t('dashboard.goals.current', lang)}</label>
            <input
              className={styles.formInput}
              type="number"
              value={currentValue}
              onChange={(e) => setCurrentValue(e.target.value)}
              placeholder="72"
            />
          </div>
        </div>

        {/* Unit + Target Date */}
        <div className={styles.formRow}>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>{lang === 'es' ? 'Unidad' : 'Unit'}</label>
            <input
              className={styles.formInput}
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              placeholder="ms, bpm, hours..."
            />
          </div>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>{t('dashboard.goals.targetDate', lang)}</label>
            <input
              className={styles.formInput}
              type="date"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
            />
          </div>
        </div>

        {/* Notes */}
        <div className={styles.formGroup}>
          <label className={styles.formLabel}>{t('dashboard.goals.notes', lang)}</label>
          <textarea
            className={styles.formTextarea}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={lang === 'es' ? 'Notas adicionales...' : 'Additional notes...'}
          />
        </div>

        {/* Actions */}
        <div className={styles.modalActions}>
          <button className={styles.cancelBtn} onClick={onClose} type="button">
            {t('dashboard.goals.cancel', lang)}
          </button>
          <button
            className={styles.saveBtn}
            onClick={handleSave}
            disabled={saving || !title || !category}
            type="button"
          >
            {saving ? (lang === 'es' ? 'Guardando...' : 'Saving...') : t('dashboard.goals.save', lang)}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main GoalsPage Component ─────────────────────────────────

export default function GoalsPage() {
  const { lang } = useLanguage();
  const { user, profile } = useAuth();
  const [goals, setGoals] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editGoal, setEditGoal] = useState(null);
  const [filter, setFilter] = useState('active');
  const [showCompleted, setShowCompleted] = useState(false);
  const [coachAthletes, setCoachAthletes] = useState([]);
  const [selectedAthlete, setSelectedAthlete] = useState(null);

  const isCoachOrDoctor = profile?.role === 'coach' || profile?.role === 'doctor';

  // ─── Load Goals ─────────────────────────────────────────────
  const loadGoals = useCallback(async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    try {
      if (isCoachOrDoctor) {
        const athletes = await fetchCoachAthletes(user.id);
        const accepted = athletes.filter(a => a.status === 'accepted');
        setCoachAthletes(accepted);

        if (accepted.length > 0 && !selectedAthlete) {
          setSelectedAthlete(accepted[0].athlete_id);
        }
      }

      const targetUserId = isCoachOrDoctor && selectedAthlete ? selectedAthlete : user.id;
      const data = await fetchGoals(targetUserId);
      setGoals(data || []);
    } catch (err) {
      console.error('Error loading goals:', err);
      setGoals([]);
    } finally {
      setIsLoading(false);
    }
  }, [user, isCoachOrDoctor, selectedAthlete]);

  useEffect(() => {
    loadGoals();
  }, [loadGoals]);

  // ─── Save (Create or Update) ────────────────────────────────
  async function handleSave(goalData) {
    if (!user) return;

    if (goalData.id) {
      // Update
      const { id, user_id, ...updates } = goalData;
      // Recalculate progress
      if (updates.current_value != null && updates.target_value != null && updates.target_value > 0) {
        updates.progress = Math.min(100, Math.max(0, (updates.current_value / updates.target_value) * 100));
      }
      updates.updated_at = new Date().toISOString();
      await updateGoal(id, updates);
    } else {
      // Create
      const targetUserId = isCoachOrDoctor && goalData.user_id ? goalData.user_id : user.id;
      const newGoal = {
        ...goalData,
        user_id: targetUserId,
        created_by: user.id,
      };
      delete newGoal.id;
      // Calculate initial progress
      if (newGoal.current_value != null && newGoal.target_value != null && newGoal.target_value > 0) {
        newGoal.progress = Math.min(100, Math.max(0, (newGoal.current_value / newGoal.target_value) * 100));
      }
      await createGoal(newGoal);
    }

    setEditGoal(null);
    await loadGoals();
  }

  // ─── Delete ─────────────────────────────────────────────────
  async function handleDelete(goalId) {
    if (!confirm(lang === 'es' ? '¿Eliminar esta meta?' : 'Delete this goal?')) return;
    try {
      await deleteGoal(goalId);
      await loadGoals();
    } catch (err) {
      console.error('Error deleting goal:', err);
    }
  }

  // ─── Status Change ──────────────────────────────────────────
  async function handleStatusChange(goalId, newStatus) {
    try {
      await updateGoal(goalId, { status: newStatus, updated_at: new Date().toISOString() });
      await loadGoals();
    } catch (err) {
      console.error('Error updating goal status:', err);
    }
  }

  // ─── Filter Goals ──────────────────────────────────────────
  const activeGoals = goals.filter(g => g.status === 'active' || g.status === 'paused');
  const completedGoals = goals.filter(g => g.status === 'completed');
  const pausedGoals = goals.filter(g => g.status === 'paused');

  const filteredGoals = filter === 'all'
    ? activeGoals
    : filter === 'paused'
    ? pausedGoals
    : activeGoals.filter(g => g.status === 'active');

  // ─── Loading State ─────────────────────────────────────────
  if (isLoading) {
    return (
      <div className={styles.page}>
        <header className={styles.header}>
          <h1 className={styles.title}>{t('dashboard.goals.title', lang)}</h1>
          <p className={styles.subtitle}>{t('dashboard.goals.subtitle', lang)}</p>
        </header>
        <div className={styles.skeletonGrid}>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className={styles.skeletonCard} />
          ))}
        </div>
      </div>
    );
  }

  // ─── Render ─────────────────────────────────────────────────
  return (
    <div className={styles.page}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.headerRow}>
          <div>
            <h1 className={styles.title}>{t('dashboard.goals.title', lang)}</h1>
            <p className={styles.subtitle}>{t('dashboard.goals.subtitle', lang)}</p>
          </div>
          <button
            className={styles.addBtn}
            onClick={() => { setEditGoal(null); setModalOpen(true); }}
          >
            + {t('dashboard.goals.addGoal', lang)}
          </button>
        </div>
      </header>

      {/* Coach: Athlete Selector */}
      {isCoachOrDoctor && coachAthletes.length > 0 && (
        <div className={styles.selectorRow}>
          <label className={styles.selectorLabel}>
            {t('dashboard.reports.selectAthlete', lang)}:
          </label>
          <select
            className={styles.athleteSelect}
            value={selectedAthlete || ''}
            onChange={(e) => setSelectedAthlete(e.target.value)}
          >
            {coachAthletes.map(a => (
              <option key={a.athlete_id} value={a.athlete_id}>
                {a.profile?.display_name || a.athlete_id}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Filter Tabs */}
      <div className={styles.filterRow}>
        <button
          className={`${styles.filterTab} ${filter === 'active' ? styles.filterTabActive : ''}`}
          onClick={() => setFilter('active')}
        >
          {t('dashboard.goals.active', lang)}
          <span className={styles.filterCount}>({activeGoals.filter(g => g.status === 'active').length})</span>
        </button>
        <button
          className={`${styles.filterTab} ${filter === 'paused' ? styles.filterTabActive : ''}`}
          onClick={() => setFilter('paused')}
        >
          {t('dashboard.goals.paused', lang)}
          <span className={styles.filterCount}>({pausedGoals.length})</span>
        </button>
        <button
          className={`${styles.filterTab} ${filter === 'all' ? styles.filterTabActive : ''}`}
          onClick={() => setFilter('all')}
        >
          {lang === 'es' ? 'Todas' : 'All'}
          <span className={styles.filterCount}>({activeGoals.length})</span>
        </button>
      </div>

      {/* Active Goals Grid */}
      {filteredGoals.length > 0 ? (
        <div className={styles.goalsGrid}>
          {filteredGoals.map((goal) => (
            <GoalCard
              key={goal.id}
              goal={goal}
              lang={lang}
              onEdit={(g) => { setEditGoal(g); setModalOpen(true); }}
              onDelete={handleDelete}
              onStatusChange={handleStatusChange}
              isCoachView={isCoachOrDoctor}
              currentUserId={user?.id}
            />
          ))}
        </div>
      ) : (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>🎯</div>
          <h2 className={styles.emptyTitle}>
            {lang === 'es' ? 'Sin metas activas' : 'No Active Goals'}
          </h2>
          <p className={styles.emptyText}>{t('dashboard.goals.noGoals', lang)}</p>
        </div>
      )}

      {/* Completed Goals Section */}
      {completedGoals.length > 0 && (
        <div className={styles.completedSection}>
          <button
            className={styles.completedToggle}
            onClick={() => setShowCompleted(!showCompleted)}
          >
            🏆 {t('dashboard.goals.completed', lang)} ({completedGoals.length})
            <span className={`${styles.completedChevron} ${showCompleted ? styles.completedChevronOpen : ''}`}>
              ▼
            </span>
          </button>

          <div className={`${styles.completedBody} ${showCompleted ? styles.completedBodyOpen : ''}`}>
            <div className={styles.completedBodyInner}>
              <div className={styles.completedGrid}>
                {completedGoals.map((goal) => (
                  <GoalCard
                    key={goal.id}
                    goal={goal}
                    lang={lang}
                    onEdit={(g) => { setEditGoal(g); setModalOpen(true); }}
                    onDelete={handleDelete}
                    onStatusChange={handleStatusChange}
                    isCoachView={isCoachOrDoctor}
                    currentUserId={user?.id}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Goal Modal */}
      <AddGoalModal
        isOpen={modalOpen}
        onClose={() => { setModalOpen(false); setEditGoal(null); }}
        onSave={handleSave}
        editGoal={editGoal}
        lang={lang}
        athletes={isCoachOrDoctor ? coachAthletes : null}
        selectedAthlete={selectedAthlete}
      />
    </div>
  );
}
