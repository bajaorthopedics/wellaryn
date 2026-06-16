'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { t } from '@/lib/i18n';
import {
  fetchInjuries,
  createInjury,
  updateInjury,
  deleteInjury,
  fetchInjuryUpdates,
  addInjuryUpdate,
  fetchCoachAthletes,
} from '@/lib/supabase/data-service';
import styles from './injuries.module.css';
import UpgradeGate from '@/components/dashboard/UpgradeGate';

// ─── Constants ────────────────────────────────────────────────

const BODY_PARTS = [
  { key: 'head', icon: '🧠' },
  { key: 'neck', icon: '🦴' },
  { key: 'shoulder_left', icon: '💪' },
  { key: 'shoulder_right', icon: '💪' },
  { key: 'chest', icon: '🫁' },
  { key: 'back_upper', icon: '🔙' },
  { key: 'back_lower', icon: '🔙' },
  { key: 'elbow_left', icon: '🦾' },
  { key: 'elbow_right', icon: '🦾' },
  { key: 'wrist_left', icon: '✋' },
  { key: 'wrist_right', icon: '✋' },
  { key: 'hip_left', icon: '🦵' },
  { key: 'hip_right', icon: '🦵' },
  { key: 'knee_left', icon: '🦿' },
  { key: 'knee_right', icon: '🦿' },
  { key: 'ankle_left', icon: '🦶' },
  { key: 'ankle_right', icon: '🦶' },
  { key: 'foot_left', icon: '🦶' },
  { key: 'foot_right', icon: '🦶' },
  { key: 'hamstring_left', icon: '🦵' },
  { key: 'hamstring_right', icon: '🦵' },
  { key: 'quadriceps_left', icon: '🦵' },
  { key: 'quadriceps_right', icon: '🦵' },
  { key: 'calf_left', icon: '🦵' },
  { key: 'calf_right', icon: '🦵' },
  { key: 'groin', icon: '🦴' },
  { key: 'abdomen', icon: '🫁' },
];

const INJURY_TYPES = [
  { key: 'acute', icon: '⚡' },
  { key: 'chronic', icon: '🔄' },
  { key: 'overuse', icon: '📈' },
  { key: 'surgical', icon: '🏥' },
  { key: 'other', icon: '❓' },
];

const SEVERITY_LEVELS = ['mild', 'moderate', 'severe'];

const RTP_PHASES = [
  { key: 'rest', icon: '🔴', color: 'var(--color-red)' },
  { key: 'rehab', icon: '🟠', color: 'hsl(20, 100%, 60%)' },
  { key: 'modified_training', icon: '🟡', color: 'var(--color-yellow)' },
  { key: 'full_training', icon: '🟢', color: 'var(--color-green)' },
  { key: 'competition', icon: '💪', color: 'hsl(200, 80%, 55%)' },
  { key: 'cleared', icon: '✅', color: 'var(--accent)' },
];

// Body map SVG hit areas mapped to body_part keys
const BODY_MAP_PARTS = {
  head: { cx: 100, cy: 38, r: 22 },
  neck: { cx: 100, cy: 68, r: 10 },
  shoulder_left: { cx: 65, cy: 92, r: 14 },
  shoulder_right: { cx: 135, cy: 92, r: 14 },
  chest: { cx: 100, cy: 112, r: 18 },
  back_upper: { cx: 100, cy: 105, r: 16 },
  abdomen: { cx: 100, cy: 145, r: 14 },
  back_lower: { cx: 100, cy: 165, r: 14 },
  elbow_left: { cx: 48, cy: 140, r: 10 },
  elbow_right: { cx: 152, cy: 140, r: 10 },
  wrist_left: { cx: 38, cy: 180, r: 8 },
  wrist_right: { cx: 162, cy: 180, r: 8 },
  hip_left: { cx: 80, cy: 190, r: 14 },
  hip_right: { cx: 120, cy: 190, r: 14 },
  groin: { cx: 100, cy: 200, r: 10 },
  hamstring_left: { cx: 82, cy: 235, r: 12 },
  hamstring_right: { cx: 118, cy: 235, r: 12 },
  quadriceps_left: { cx: 82, cy: 225, r: 12 },
  quadriceps_right: { cx: 118, cy: 225, r: 12 },
  knee_left: { cx: 82, cy: 268, r: 10 },
  knee_right: { cx: 118, cy: 268, r: 10 },
  calf_left: { cx: 80, cy: 305, r: 10 },
  calf_right: { cx: 120, cy: 305, r: 10 },
  ankle_left: { cx: 78, cy: 340, r: 8 },
  ankle_right: { cx: 122, cy: 340, r: 8 },
  foot_left: { cx: 76, cy: 358, r: 8 },
  foot_right: { cx: 124, cy: 358, r: 8 },
};

// ─── Helpers ──────────────────────────────────────────────────

function daysSince(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr + 'T00:00:00Z');
  const now = new Date();
  return Math.floor((now - d) / (1000 * 60 * 60 * 24));
}

function recoveryProgress(injuryDate, expectedDate) {
  if (!injuryDate || !expectedDate) return null;
  const start = new Date(injuryDate + 'T00:00:00Z');
  const end = new Date(expectedDate + 'T00:00:00Z');
  const now = new Date();
  const total = end - start;
  if (total <= 0) return 100;
  const elapsed = now - start;
  return Math.min(100, Math.max(0, (elapsed / total) * 100));
}

function rtpPhaseIndex(phase) {
  return RTP_PHASES.findIndex(p => p.key === phase);
}

function getBodyPartIcon(key) {
  const part = BODY_PARTS.find(p => p.key === key);
  return part ? part.icon : '🦴';
}

// ─── Body Map Component ───────────────────────────────────────

function BodyMap({ injuries, selectedBodyPart, onSelectBodyPart, lang }) {
  // Determine status for each body part based on injuries
  const partStatus = {};
  (injuries || []).forEach(inj => {
    const current = partStatus[inj.body_part];
    if (inj.status === 'active' || inj.status === 'recurring') {
      partStatus[inj.body_part] = 'active';
    } else if (inj.status === 'recovering' && current !== 'active') {
      partStatus[inj.body_part] = 'recovering';
    } else if (inj.status === 'cleared' && !current) {
      partStatus[inj.body_part] = 'cleared';
    }
  });

  function getPartClass(key) {
    let cls = 'bodyPart';
    if (partStatus[key] === 'active') cls += ` ${styles.bodyPartActive}`;
    else if (partStatus[key] === 'recovering') cls += ` ${styles.bodyPartRecovering}`;
    else if (partStatus[key] === 'cleared') cls += ` ${styles.bodyPartCleared}`;
    if (selectedBodyPart === key) cls += ` ${styles.bodyPartSelected}`;
    return cls;
  }

  // Simplified SVG body parts using circles for hit areas
  const visibleParts = [
    'head', 'neck', 'shoulder_left', 'shoulder_right',
    'chest', 'abdomen', 'hip_left', 'hip_right',
    'knee_left', 'knee_right', 'ankle_left', 'ankle_right',
    'elbow_left', 'elbow_right', 'wrist_left', 'wrist_right',
    'foot_left', 'foot_right',
  ];

  return (
    <div className={styles.bodyMapCard}>
      <div className={styles.bodyMapTitle}>
        {t('dashboard.injuries.bodyMap', lang)}
      </div>
      <svg className={styles.bodyMapSvg} viewBox="0 0 200 380" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Body silhouette outline */}
        <path
          d="M100 18 C112 18 120 26 120 38 C120 50 112 58 100 58 C88 58 80 50 80 38 C80 26 88 18 100 18 Z"
          fill="hsla(0,0%,100%,0.04)" stroke="hsla(0,0%,100%,0.1)" strokeWidth="0.5"
        />
        <path
          d="M92 60 L108 60 L112 75 L135 85 L155 130 L160 175 L145 185 L135 170 L130 150 L118 140 L120 180 L128 200 L130 260 L125 275 L120 340 L128 355 L128 368 L110 368 L108 355 L100 330 L92 355 L90 368 L72 368 L72 355 L80 340 L75 275 L70 260 L72 200 L80 180 L82 140 L70 150 L65 170 L55 185 L40 175 L45 130 L65 85 L88 75 Z"
          fill="hsla(0,0%,100%,0.03)" stroke="hsla(0,0%,100%,0.08)" strokeWidth="0.5"
        />

        {/* Interactive body part circles */}
        {visibleParts.map(key => {
          const geo = BODY_MAP_PARTS[key];
          if (!geo) return null;
          return (
            <circle
              key={key}
              className={getPartClass(key)}
              cx={geo.cx}
              cy={geo.cy}
              r={geo.r}
              onClick={() => onSelectBodyPart(selectedBodyPart === key ? null : key)}
            />
          );
        })}
      </svg>

      {/* Legend */}
      <div className={styles.bodyMapLegend}>
        <div className={styles.legendItem}>
          <span className={`${styles.legendDot} ${styles.legendDotActive}`} />
          {t('dashboard.injuries.statusActive', lang)}
        </div>
        <div className={styles.legendItem}>
          <span className={`${styles.legendDot} ${styles.legendDotRecovering}`} />
          {t('dashboard.injuries.statusRecovering', lang)}
        </div>
        <div className={styles.legendItem}>
          <span className={`${styles.legendDot} ${styles.legendDotCleared}`} />
          {t('dashboard.injuries.statusCleared', lang)}
        </div>
      </div>

      {selectedBodyPart && (
        <button className={styles.bodyMapReset} onClick={() => onSelectBodyPart(null)}>
          {lang === 'es' ? '✕ Quitar filtro' : '✕ Clear filter'}
        </button>
      )}
    </div>
  );
}

// ─── RTP Phase Dots ───────────────────────────────────────────

function RtpPhaseDots({ currentPhase }) {
  const currentIdx = rtpPhaseIndex(currentPhase);
  return (
    <div className={styles.rtpDots}>
      {RTP_PHASES.map((phase, i) => (
        <div key={phase.key} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div
            className={`${styles.rtpDot} ${
              i < currentIdx ? styles.rtpDotCompleted
              : i === currentIdx ? styles.rtpDotCurrent
              : ''
            }`}
            title={phase.key}
          />
          {i < RTP_PHASES.length - 1 && (
            <div className={`${styles.rtpDotConnector} ${i < currentIdx ? styles.rtpDotConnectorCompleted : ''}`} />
          )}
        </div>
      ))}
    </div>
  );
}

// ─── InjuryCard Component ─────────────────────────────────────

function InjuryCard({ injury, lang, onClick, onDelete, isCoachView, currentUserId, isDoctor }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

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

  const days = daysSince(injury.injury_date);
  const progress = recoveryProgress(injury.injury_date, injury.expected_recovery_date);
  const canDelete = !isCoachView || injury.created_by === currentUserId;

  const statusClass = injury.status === 'active' ? styles.injuryCardActive
    : injury.status === 'recovering' ? styles.injuryCardRecovering
    : injury.status === 'cleared' ? styles.injuryCardCleared
    : styles.injuryCardRecurring;

  const severityClass = injury.severity === 'mild' ? styles.severityMild
    : injury.severity === 'moderate' ? styles.severityModerate
    : styles.severitySevere;

  const statusBadgeClass = injury.status === 'active' ? styles.statusActive
    : injury.status === 'recovering' ? styles.statusRecovering
    : injury.status === 'cleared' ? styles.statusCleared
    : styles.statusRecurring;

  return (
    <div className={`${styles.injuryCard} ${statusClass}`} onClick={() => onClick(injury)}>
      {/* Header */}
      <div className={styles.cardHeader}>
        <div className={styles.cardHeaderLeft}>
          <span className={styles.bodyPartIcon}>{getBodyPartIcon(injury.body_part)}</span>
          <span className={styles.bodyPartLabel}>
            {t(`dashboard.injuries.bodyParts.${injury.body_part}`, lang)}
          </span>
        </div>
        <span className={`${styles.badge} ${statusBadgeClass}`}>
          {t(`dashboard.injuries.status.${injury.status}`, lang)}
        </span>
      </div>

      {/* Title + Description */}
      <div className={styles.injuryTitle}>{injury.title}</div>
      {injury.description && <div className={styles.injuryDesc}>{injury.description}</div>}

      {/* Badges */}
      <div className={styles.badgeRow}>
        <span className={`${styles.badge} ${severityClass}`}>
          {t(`dashboard.injuries.severity.${injury.severity}`, lang)}
        </span>
        <span className={`${styles.badge} ${styles.typeBadge}`}>
          {t(`dashboard.injuries.type.${injury.injury_type}`, lang)}
        </span>
      </div>

      {/* Recovery Progress */}
      {progress != null && injury.status !== 'cleared' && (
        <div className={styles.recoveryProgress}>
          <div className={styles.progressLabel}>
            <span>{t('dashboard.injuries.recovery', lang)}</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className={styles.progressBarBg}>
            <div className={styles.progressBarFill} style={{ width: `${progress}%` }} />
          </div>
        </div>
      )}

      {/* RTP Phase */}
      <div className={styles.rtpPhase}>
        <div className={styles.rtpLabel}>{t('dashboard.injuries.rtpPhase', lang)}</div>
        <RtpPhaseDots currentPhase={injury.rtp_phase} />
        <div className={styles.rtpCurrentLabel}>
          {RTP_PHASES[rtpPhaseIndex(injury.rtp_phase)]?.icon} {t(`dashboard.injuries.phases.${injury.rtp_phase}`, lang)}
        </div>
      </div>

      {/* Footer */}
      <div className={styles.cardFooter}>
        {days != null && (
          <div className={styles.daysSince}>
            <span className={styles.daysSinceValue}>{days}</span>
            <span>{t('dashboard.injuries.daysAgo', lang)}</span>
          </div>
        )}
        {canDelete && (
          <div ref={menuRef} style={{ position: 'relative' }}>
            <button
              className={styles.menuBtn}
              onClick={(e) => { e.stopPropagation(); setMenuOpen(!menuOpen); }}
              aria-label="Menu"
            >
              ⋯
            </button>
            {menuOpen && (
              <div className={styles.menuDropdown}>
                <button
                  className={`${styles.menuItem} ${styles.menuItemDanger}`}
                  onClick={(e) => { e.stopPropagation(); setMenuOpen(false); onDelete(injury.id); }}
                >
                  🗑 {t('dashboard.injuries.deleteInjury', lang)}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Injury Detail Panel ──────────────────────────────────────

function InjuryDetail({
  injury, lang, onClose, onUpdate, onPhaseAdvance,
  updates, onAddNote, isDoctor, isCoachOrDoctor, currentUserId,
}) {
  const [noteText, setNoteText] = useState('');
  const [addingNote, setAddingNote] = useState(false);
  const [advancingPhase, setAdvancingPhase] = useState(null); // phase key to advance to
  const [advanceNote, setAdvanceNote] = useState('');

  const currentIdx = rtpPhaseIndex(injury.rtp_phase);

  async function handleAddNote() {
    if (!noteText.trim()) return;
    setAddingNote(true);
    try {
      await onAddNote(injury.id, noteText.trim());
      setNoteText('');
    } finally {
      setAddingNote(false);
    }
  }

  async function handleAdvancePhase() {
    if (!advanceNote.trim() || !advancingPhase) return;
    await onPhaseAdvance(injury.id, advancingPhase, advanceNote.trim());
    setAdvancingPhase(null);
    setAdvanceNote('');
  }

  async function handleDoctorChange(field, value) {
    await onUpdate(injury.id, { [field]: value }, field === 'severity' ? 'severity_change' : 'status_change');
  }

  return (
    <div className={styles.detailOverlay} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      {advancingPhase ? (
        // Phase advance note modal
        <div className={styles.noteModal}>
          <div className={styles.noteModalTitle}>
            {t('dashboard.injuries.advancePhase', lang)}
          </div>
          <div className={styles.noteModalDesc}>
            {t('dashboard.injuries.advancePhaseDesc', lang)}: {t(`dashboard.injuries.phases.${advancingPhase}`, lang)}
          </div>
          <textarea
            className={styles.noteModalTextarea}
            value={advanceNote}
            onChange={(e) => setAdvanceNote(e.target.value)}
            placeholder={lang === 'es' ? 'Nota clínica requerida...' : 'Clinical note required...'}
          />
          <div className={styles.modalActions}>
            <button className={styles.cancelBtn} onClick={() => { setAdvancingPhase(null); setAdvanceNote(''); }}>
              {t('dashboard.injuries.cancel', lang)}
            </button>
            <button
              className={styles.saveBtn}
              disabled={!advanceNote.trim()}
              onClick={handleAdvancePhase}
            >
              {t('dashboard.injuries.confirm', lang)}
            </button>
          </div>
        </div>
      ) : (
        <div className={styles.detailPanel}>
          {/* Header */}
          <div className={styles.detailHeader}>
            <div className={styles.detailTitleArea}>
              <div className={styles.detailTitle}>{injury.title}</div>
              <div className={styles.detailBodyPart}>
                {getBodyPartIcon(injury.body_part)} {t(`dashboard.injuries.bodyParts.${injury.body_part}`, lang)}
              </div>
            </div>
            <button className={styles.detailCloseBtn} onClick={onClose}>✕</button>
          </div>

          {/* Info Grid */}
          <div className={styles.detailInfo}>
            <div className={styles.detailInfoItem}>
              <span className={styles.detailInfoLabel}>{t('dashboard.injuries.injuryDate', lang)}</span>
              <span className={styles.detailInfoValue}>{injury.injury_date}</span>
            </div>
            <div className={styles.detailInfoItem}>
              <span className={styles.detailInfoLabel}>{t('dashboard.injuries.expectedRecovery', lang)}</span>
              <span className={styles.detailInfoValue}>{injury.expected_recovery_date || '—'}</span>
            </div>
            <div className={styles.detailInfoItem}>
              <span className={styles.detailInfoLabel}>{t('dashboard.injuries.severityLabel', lang)}</span>
              <span className={styles.detailInfoValue}>{t(`dashboard.injuries.severity.${injury.severity}`, lang)}</span>
            </div>
            <div className={styles.detailInfoItem}>
              <span className={styles.detailInfoLabel}>{t('dashboard.injuries.typeLabel', lang)}</span>
              <span className={styles.detailInfoValue}>{t(`dashboard.injuries.type.${injury.injury_type}`, lang)}</span>
            </div>
          </div>

          {/* Doctor Controls */}
          {isDoctor && (
            <div className={styles.doctorControls}>
              <div className={styles.doctorControlsTitle}>
                🩺 {t('dashboard.injuries.doctorControls', lang)}
              </div>
              <div className={styles.doctorRow}>
                <div className={styles.doctorField}>
                  <label className={styles.doctorLabel}>{t('dashboard.injuries.severityLabel', lang)}</label>
                  <select
                    className={styles.doctorSelect}
                    value={injury.severity}
                    onChange={(e) => handleDoctorChange('severity', e.target.value)}
                  >
                    {SEVERITY_LEVELS.map(s => (
                      <option key={s} value={s}>{t(`dashboard.injuries.severity.${s}`, lang)}</option>
                    ))}
                  </select>
                </div>
                <div className={styles.doctorField}>
                  <label className={styles.doctorLabel}>{t('dashboard.injuries.statusLabel', lang)}</label>
                  <select
                    className={styles.doctorSelect}
                    value={injury.status}
                    onChange={(e) => handleDoctorChange('status', e.target.value)}
                  >
                    {['active', 'recovering', 'cleared', 'recurring'].map(s => (
                      <option key={s} value={s}>{t(`dashboard.injuries.status.${s}`, lang)}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* RTP Phases */}
          <div className={styles.rtpSection}>
            <div className={styles.rtpSectionTitle}>
              {t('dashboard.injuries.rtpProtocol', lang)}
            </div>
            <div className={styles.rtpPhases}>
              {RTP_PHASES.map((phase, i) => {
                const isCompleted = i < currentIdx;
                const isCurrent = i === currentIdx;
                const isNext = i === currentIdx + 1;

                return (
                  <div
                    key={phase.key}
                    className={`${styles.rtpPhaseRow} ${
                      isCurrent ? styles.rtpPhaseRowActive
                      : isCompleted ? styles.rtpPhaseRowCompleted
                      : ''
                    }`}
                  >
                    <span className={styles.rtpPhaseIcon}>{phase.icon}</span>
                    <div className={styles.rtpPhaseInfo}>
                      <div className={styles.rtpPhaseName}>
                        {t(`dashboard.injuries.phases.${phase.key}`, lang)}
                      </div>
                      <div className={styles.rtpPhaseDesc}>
                        {t(`dashboard.injuries.phaseDesc.${phase.key}`, lang)}
                      </div>
                    </div>
                    {isCompleted && <span className={styles.rtpCheckmark}>✓</span>}
                    {isNext && isDoctor && (
                      <button
                        className={styles.rtpAdvanceBtn}
                        onClick={() => setAdvancingPhase(phase.key)}
                      >
                        {t('dashboard.injuries.advance', lang)}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Timeline */}
          <div className={styles.timelineSection}>
            <div className={styles.timelineTitle}>
              {t('dashboard.injuries.timeline', lang)}
            </div>
            {updates && updates.length > 0 ? (
              <div className={styles.timeline}>
                {updates.map((update) => {
                  const dotClass = update.update_type === 'note' ? styles.timelineDotNote
                    : update.update_type === 'phase_change' ? styles.timelineDotPhase
                    : update.update_type === 'severity_change' ? styles.timelineDotSeverity
                    : styles.timelineDotStatus;

                  return (
                    <div key={update.id} className={styles.timelineItem}>
                      <div className={`${styles.timelineDot} ${dotClass}`} />
                      <div className={styles.timelineLine} />
                      <div className={styles.timelineContent}>
                        <div className={styles.timelineAuthor}>
                          {update.author_name || (lang === 'es' ? 'Usuario' : 'User')}
                        </div>
                        <div className={styles.timelineDate}>
                          {new Date(update.created_at).toLocaleDateString(lang === 'es' ? 'es-ES' : 'en-US', {
                            month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
                          })}
                        </div>
                        {update.update_type !== 'note' && (
                          <div className={styles.timelineChange}>
                            {t(`dashboard.injuries.updateTypes.${update.update_type}`, lang)}:{' '}
                            {update.previous_value} → {update.new_value}
                          </div>
                        )}
                        {update.note && (
                          <div className={styles.timelineText}>{update.note}</div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className={styles.timelineEmpty}>
                {t('dashboard.injuries.noUpdates', lang)}
              </div>
            )}

            {/* Add Note */}
            <div className={styles.addNoteArea}>
              <input
                className={styles.addNoteInput}
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder={lang === 'es' ? 'Agregar nota...' : 'Add a note...'}
                onKeyDown={(e) => { if (e.key === 'Enter') handleAddNote(); }}
              />
              <button
                className={styles.addNoteBtn}
                onClick={handleAddNote}
                disabled={!noteText.trim() || addingNote}
              >
                {addingNote ? '...' : (lang === 'es' ? 'Enviar' : 'Send')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── AddInjuryModal Component ─────────────────────────────────

function AddInjuryModal({ isOpen, onClose, onSave, lang, athletes, selectedAthlete }) {
  const [bodyPart, setBodyPart] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [injuryType, setInjuryType] = useState('');
  const [severity, setSeverity] = useState('');
  const [injuryDate, setInjuryDate] = useState(new Date().toISOString().split('T')[0]);
  const [expectedRecovery, setExpectedRecovery] = useState('');
  const [notes, setNotes] = useState('');
  const [athleteId, setAthleteId] = useState(selectedAthlete || '');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (selectedAthlete) setAthleteId(selectedAthlete);
  }, [selectedAthlete]);

  if (!isOpen) return null;

  async function handleSave() {
    if (!title || !bodyPart || !injuryType || !severity) return;
    setSaving(true);
    try {
      await onSave({
        title,
        body_part: bodyPart,
        injury_type: injuryType,
        severity,
        description: description || null,
        injury_date: injuryDate,
        expected_recovery_date: expectedRecovery || null,
        notes: notes || null,
        user_id: athleteId || undefined,
      });
      onClose();
      // Reset form
      setBodyPart(''); setTitle(''); setDescription(''); setInjuryType('');
      setSeverity(''); setExpectedRecovery(''); setNotes('');
    } catch (err) {
      console.error('Error saving injury:', err);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={styles.modalOverlay} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={styles.modal}>
        <h2 className={styles.modalTitle}>
          {t('dashboard.injuries.addInjury', lang)}
        </h2>

        {/* Coach: athlete selector */}
        {athletes && athletes.length > 0 && (
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

        {/* Body Part */}
        <div className={styles.formGroup}>
          <label className={styles.formLabel}>{t('dashboard.injuries.bodyPartLabel', lang)}</label>
          <div className={styles.bodyPartGrid}>
            {BODY_PARTS.slice(0, 18).map((part) => (
              <button
                key={part.key}
                className={`${styles.bodyPartOption} ${bodyPart === part.key ? styles.bodyPartOptionActive : ''}`}
                onClick={() => setBodyPart(part.key)}
                type="button"
              >
                <span className={styles.bodyPartOptionIcon}>{part.icon}</span>
                {t(`dashboard.injuries.bodyParts.${part.key}`, lang)}
              </button>
            ))}
          </div>
        </div>

        {/* Title */}
        <div className={styles.formGroup}>
          <label className={styles.formLabel}>{lang === 'es' ? 'Título' : 'Title'}</label>
          <input
            className={styles.formInput}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={lang === 'es' ? 'Ej: Esguince de rodilla izquierda' : 'E.g., Left knee sprain'}
          />
        </div>

        {/* Description */}
        <div className={styles.formGroup}>
          <label className={styles.formLabel}>{lang === 'es' ? 'Descripción' : 'Description'}</label>
          <textarea
            className={styles.formTextarea}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={lang === 'es' ? 'Describe la lesión...' : 'Describe the injury...'}
          />
        </div>

        {/* Injury Type */}
        <div className={styles.formGroup}>
          <label className={styles.formLabel}>{t('dashboard.injuries.typeLabel', lang)}</label>
          <div className={styles.typeGrid}>
            {INJURY_TYPES.map((type) => (
              <button
                key={type.key}
                className={`${styles.typeOption} ${injuryType === type.key ? styles.typeOptionActive : ''}`}
                onClick={() => setInjuryType(type.key)}
                type="button"
              >
                <span>{type.icon}</span>
                {t(`dashboard.injuries.type.${type.key}`, lang)}
              </button>
            ))}
          </div>
        </div>

        {/* Severity */}
        <div className={styles.formGroup}>
          <label className={styles.formLabel}>{t('dashboard.injuries.severityLabel', lang)}</label>
          <div className={styles.severityGrid}>
            {SEVERITY_LEVELS.map((sev) => {
              const activeClass = severity === sev
                ? `${styles.severityOptionActive} ${
                    sev === 'mild' ? styles.severityMildOption
                    : sev === 'moderate' ? styles.severityModerateOption
                    : styles.severitySevereOption
                  }`
                : '';
              return (
                <button
                  key={sev}
                  className={`${styles.severityOption} ${activeClass}`}
                  onClick={() => setSeverity(sev)}
                  type="button"
                >
                  {sev === 'mild' ? '🟡' : sev === 'moderate' ? '🟠' : '🔴'}
                  {t(`dashboard.injuries.severity.${sev}`, lang)}
                </button>
              );
            })}
          </div>
        </div>

        {/* Dates */}
        <div className={styles.formRow}>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>{t('dashboard.injuries.injuryDate', lang)}</label>
            <input
              className={styles.formInput}
              type="date"
              value={injuryDate}
              onChange={(e) => setInjuryDate(e.target.value)}
            />
          </div>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>{t('dashboard.injuries.expectedRecovery', lang)}</label>
            <input
              className={styles.formInput}
              type="date"
              value={expectedRecovery}
              onChange={(e) => setExpectedRecovery(e.target.value)}
            />
          </div>
        </div>

        {/* Notes */}
        <div className={styles.formGroup}>
          <label className={styles.formLabel}>{t('dashboard.injuries.notes', lang)}</label>
          <textarea
            className={styles.formTextarea}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={lang === 'es' ? 'Notas iniciales...' : 'Initial notes...'}
          />
        </div>

        {/* Actions */}
        <div className={styles.modalActions}>
          <button className={styles.cancelBtn} onClick={onClose} type="button">
            {t('dashboard.injuries.cancel', lang)}
          </button>
          <button
            className={styles.saveBtn}
            onClick={handleSave}
            disabled={saving || !title || !bodyPart || !injuryType || !severity}
            type="button"
          >
            {saving ? (lang === 'es' ? 'Guardando...' : 'Saving...') : t('dashboard.injuries.save', lang)}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main InjuriesPage Component ──────────────────────────────

export default function InjuriesPage() {
  const { lang } = useLanguage();
  const { user, profile } = useAuth();
  const [injuries, setInjuries] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [filter, setFilter] = useState('active');
  const [selectedBodyPart, setSelectedBodyPart] = useState(null);
  const [selectedInjury, setSelectedInjury] = useState(null);
  const [injuryUpdates, setInjuryUpdates] = useState([]);
  const [coachAthletes, setCoachAthletes] = useState([]);
  const [selectedAthlete, setSelectedAthlete] = useState(null);

  const isCoachOrDoctor = profile?.role === 'coach' || profile?.role === 'doctor';
  const isDoctor = profile?.role === 'doctor';

  // ─── Load Injuries ─────────────────────────────────────────
  const loadInjuries = useCallback(async () => {
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
      const data = await fetchInjuries(targetUserId);
      setInjuries(data || []);
    } catch (err) {
      console.error('Error loading injuries:', err);
      setInjuries([]);
    } finally {
      setIsLoading(false);
    }
  }, [user, isCoachOrDoctor, selectedAthlete]);

  useEffect(() => {
    loadInjuries();
  }, [loadInjuries]);

  // ─── Load Updates for Selected Injury ──────────────────────
  useEffect(() => {
    if (!selectedInjury) return;
    (async () => {
      try {
        const updates = await fetchInjuryUpdates(selectedInjury.id);
        setInjuryUpdates(updates || []);
      } catch (err) {
        console.error('Error loading updates:', err);
        setInjuryUpdates([]);
      }
    })();
  }, [selectedInjury]);

  // ─── Create Injury ─────────────────────────────────────────
  async function handleCreate(injuryData) {
    if (!user) return;
    const targetUserId = isCoachOrDoctor && injuryData.user_id ? injuryData.user_id : user.id;
    const newInjury = {
      ...injuryData,
      user_id: targetUserId,
      created_by: user.id,
    };
    delete newInjury.id;
    await createInjury(newInjury);
    await loadInjuries();
  }

  // ─── Update Injury ─────────────────────────────────────────
  async function handleUpdate(injuryId, updates, updateType) {
    if (!user) return;
    const injury = injuries.find(i => i.id === injuryId);
    if (!injury) return;

    updates.updated_at = new Date().toISOString();
    await updateInjury(injuryId, updates);

    // Record the update
    if (updateType) {
      const field = updateType === 'severity_change' ? 'severity' : 'status';
      await addInjuryUpdate({
        injury_id: injuryId,
        author_id: user.id,
        update_type: updateType,
        previous_value: injury[field],
        new_value: updates[field],
        note: null,
      });
    }

    await loadInjuries();
    // Refresh the detail view
    if (selectedInjury && selectedInjury.id === injuryId) {
      const updated = { ...selectedInjury, ...updates };
      setSelectedInjury(updated);
      const updts = await fetchInjuryUpdates(injuryId);
      setInjuryUpdates(updts || []);
    }
  }

  // ─── Advance RTP Phase ─────────────────────────────────────
  async function handlePhaseAdvance(injuryId, newPhase, note) {
    if (!user) return;
    const injury = injuries.find(i => i.id === injuryId);
    if (!injury) return;

    await updateInjury(injuryId, {
      rtp_phase: newPhase,
      updated_at: new Date().toISOString(),
      status: newPhase === 'cleared' ? 'cleared' : injury.status === 'active' ? 'recovering' : injury.status,
    });

    await addInjuryUpdate({
      injury_id: injuryId,
      author_id: user.id,
      update_type: 'phase_change',
      previous_value: injury.rtp_phase,
      new_value: newPhase,
      note,
    });

    await loadInjuries();
    if (selectedInjury && selectedInjury.id === injuryId) {
      const updated = {
        ...selectedInjury,
        rtp_phase: newPhase,
        status: newPhase === 'cleared' ? 'cleared' : selectedInjury.status === 'active' ? 'recovering' : selectedInjury.status,
      };
      setSelectedInjury(updated);
      const updts = await fetchInjuryUpdates(injuryId);
      setInjuryUpdates(updts || []);
    }
  }

  // ─── Add Note ──────────────────────────────────────────────
  async function handleAddNote(injuryId, noteText) {
    if (!user) return;
    await addInjuryUpdate({
      injury_id: injuryId,
      author_id: user.id,
      update_type: 'note',
      previous_value: null,
      new_value: null,
      note: noteText,
    });
    const updts = await fetchInjuryUpdates(injuryId);
    setInjuryUpdates(updts || []);
  }

  // ─── Delete Injury ─────────────────────────────────────────
  async function handleDelete(injuryId) {
    if (!confirm(lang === 'es' ? '¿Eliminar esta lesión?' : 'Delete this injury?')) return;
    try {
      await deleteInjury(injuryId);
      await loadInjuries();
      if (selectedInjury?.id === injuryId) setSelectedInjury(null);
    } catch (err) {
      console.error('Error deleting injury:', err);
    }
  }

  // ─── Filter Injuries ──────────────────────────────────────
  const filteredInjuries = injuries.filter(inj => {
    if (filter !== 'all' && inj.status !== filter) return false;
    if (selectedBodyPart && inj.body_part !== selectedBodyPart) return false;
    return true;
  });

  const counts = {
    active: injuries.filter(i => i.status === 'active').length,
    recovering: injuries.filter(i => i.status === 'recovering').length,
    cleared: injuries.filter(i => i.status === 'cleared').length,
    all: injuries.length,
  };

  // ─── Loading State ─────────────────────────────────────────
  if (isLoading) {
    return (
      <div className={styles.page}>
        <header className={styles.header}>
          <h1 className={styles.title}>{t('dashboard.injuries.title', lang)}</h1>
          <p className={styles.subtitle}>{t('dashboard.injuries.subtitle', lang)}</p>
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
    <UpgradeGate feature="injuries">
    <div className={styles.page}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.headerRow}>
          <div>
            <h1 className={styles.title}>{t('dashboard.injuries.title', lang)}</h1>
            <p className={styles.subtitle}>{t('dashboard.injuries.subtitle', lang)}</p>
          </div>
          <button
            className={styles.addBtn}
            onClick={() => setModalOpen(true)}
          >
            + {t('dashboard.injuries.addInjury', lang)}
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
        {['active', 'recovering', 'cleared', 'all'].map(f => (
          <button
            key={f}
            className={`${styles.filterTab} ${filter === f ? styles.filterTabActive : ''}`}
            onClick={() => setFilter(f)}
          >
            {t(`dashboard.injuries.filter.${f}`, lang)}
            <span className={styles.filterCount}>({counts[f]})</span>
          </button>
        ))}
      </div>

      {/* Top Layout: Body Map + Injuries */}
      <div className={styles.topLayout}>
        {/* Body Map */}
        <BodyMap
          injuries={injuries}
          selectedBodyPart={selectedBodyPart}
          onSelectBodyPart={setSelectedBodyPart}
          lang={lang}
        />

        {/* Injuries Grid */}
        {filteredInjuries.length > 0 ? (
          <div className={styles.injuriesGrid}>
            {filteredInjuries.map((injury) => (
              <InjuryCard
                key={injury.id}
                injury={injury}
                lang={lang}
                onClick={setSelectedInjury}
                onDelete={handleDelete}
                isCoachView={isCoachOrDoctor}
                currentUserId={user?.id}
                isDoctor={isDoctor}
              />
            ))}
          </div>
        ) : (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>🩹</div>
            <h2 className={styles.emptyTitle}>
              {t('dashboard.injuries.noInjuries', lang)}
            </h2>
            <p className={styles.emptyText}>{t('dashboard.injuries.noInjuriesDesc', lang)}</p>
          </div>
        )}
      </div>

      {/* Add Injury Modal */}
      <AddInjuryModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleCreate}
        lang={lang}
        athletes={isCoachOrDoctor ? coachAthletes : null}
        selectedAthlete={selectedAthlete}
      />

      {/* Injury Detail Panel */}
      {selectedInjury && (
        <InjuryDetail
          injury={selectedInjury}
          lang={lang}
          onClose={() => setSelectedInjury(null)}
          onUpdate={handleUpdate}
          onPhaseAdvance={handlePhaseAdvance}
          updates={injuryUpdates}
          onAddNote={handleAddNote}
          isDoctor={isDoctor}
          isCoachOrDoctor={isCoachOrDoctor}
          currentUserId={user?.id}
        />
      )}
    </div>
    </UpgradeGate>
  );
}
