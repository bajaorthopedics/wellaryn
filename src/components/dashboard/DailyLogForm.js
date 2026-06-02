'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { saveDailyMetrics } from '@/lib/supabase/data-service';
import styles from './DailyLogForm.module.css';

// ─── Bilingual Labels ────────────────────────────────────────
const labels = {
  title:            { en: 'Daily Log',              es: 'Registro Diario' },
  titleEdit:        { en: 'Edit Today',             es: 'Editar Hoy' },
  // Section headers
  sleep:            { en: 'Sleep',                  es: 'Sueño' },
  checkin:          { en: 'Check-in',               es: 'Check-in' },
  biometrics:       { en: 'Biometrics',             es: 'Biométricos' },
  training:         { en: 'Training',               es: 'Entrenamiento' },
  painSoreness:     { en: 'Pain & Soreness',        es: 'Dolor y Molestias' },
  recovery:         { en: 'Recovery',               es: 'Recuperación' },
  lifestyle:        { en: 'Lifestyle',              es: 'Estilo de Vida' },
  activity:         { en: 'Activity',               es: 'Actividad' },
  // Sleep
  sleepTotal:       { en: 'Total Sleep',            es: 'Sueño Total' },
  sleepQuality:     { en: 'Sleep Quality',          es: 'Calidad de Sueño' },
  bedtime:          { en: 'Bedtime',                es: 'Hora de Dormir' },
  wakeTime:         { en: 'Wake Time',              es: 'Hora de Despertar' },
  sleepDeep:        { en: 'Deep Sleep',             es: 'Sueño Profundo' },
  sleepRem:         { en: 'REM Sleep',              es: 'Sueño REM' },
  // Check-in
  energy:           { en: 'Energy',                 es: 'Energía' },
  motivation:       { en: 'Motivation',             es: 'Motivación' },
  stress:           { en: 'Stress',                 es: 'Estrés' },
  fatigue:          { en: 'Fatigue',                es: 'Fatiga' },
  // Biometrics
  hrv:              { en: 'HRV (rMSSD)',            es: 'VFC (rMSSD)' },
  rhr:              { en: 'Resting Heart Rate',     es: 'FC en Reposo' },
  // Training
  didTrain:         { en: 'Did you train today?',   es: '¿Entrenaste hoy?' },
  rpe:              { en: 'RPE (effort)',            es: 'RPE (esfuerzo)' },
  duration:         { en: 'Duration',               es: 'Duración' },
  type:             { en: 'Type',                   es: 'Tipo' },
  loadCalc:         { en: 'Training Load',          es: 'Carga de Entrenamiento' },
  // Pain & Soreness
  painLevel:        { en: 'Pain Level',             es: 'Nivel de Dolor' },
  muscleSoreness:   { en: 'Muscle Soreness',        es: 'Dolor Muscular' },
  painAreas:        { en: 'Pain Areas',             es: 'Áreas de Dolor' },
  // Recovery
  didRecover:       { en: 'Did you do recovery today?', es: '¿Hiciste recuperación hoy?' },
  recoveryFeeling:  { en: 'Recovery Feeling',       es: 'Sensación de Recuperación' },
  // Lifestyle
  waterGlasses:     { en: 'Water (glasses)',         es: 'Agua (vasos)' },
  alcoholDrinks:    { en: 'Alcohol (drinks)',        es: 'Alcohol (tragos)' },
  lateCaffeine:     { en: 'Caffeine after 2 PM?',    es: '¿Cafeína después de las 14h?' },
  // Activity
  steps:            { en: 'Steps',                  es: 'Pasos' },
  calories:         { en: 'Calories',               es: 'Calorías' },
  // Actions
  save:             { en: 'Save',                   es: 'Guardar' },
  saving:           { en: 'Saving…',                es: 'Guardando…' },
  cancel:           { en: 'Cancel',                 es: 'Cancelar' },
  optional:         { en: 'optional',               es: 'opcional' },
  ouraSource:       { en: 'Oura',                    es: 'Oura' },
  whoopSource:      { en: 'WHOOP',                   es: 'WHOOP' },
};

const trainingTypes = [
  { value: 'run',      en: 'Run',      es: 'Correr' },
  { value: 'crossfit', en: 'CrossFit', es: 'CrossFit' },
  { value: 'padel',    en: 'Padel',    es: 'Pádel' },
  { value: 'swim',     en: 'Swim',     es: 'Nadar' },
  { value: 'cycle',    en: 'Cycle',    es: 'Ciclismo' },
  { value: 'other',    en: 'Other',    es: 'Otro' },
];

const painAreaOptions = [
  { id: 'knee',      en: 'Knee',       es: 'Rodilla' },
  { id: 'ankle',     en: 'Ankle',      es: 'Tobillo' },
  { id: 'hip',       en: 'Hip',        es: 'Cadera' },
  { id: 'shoulder',  en: 'Shoulder',   es: 'Hombro' },
  { id: 'back',      en: 'Back',       es: 'Espalda' },
  { id: 'wrist',     en: 'Wrist',      es: 'Muñeca' },
  { id: 'elbow',     en: 'Elbow',      es: 'Codo' },
  { id: 'calf',      en: 'Calf',       es: 'Pantorrilla' },
  { id: 'hamstring', en: 'Hamstring',  es: 'Isquiotibial' },
  { id: 'quad',      en: 'Quad',       es: 'Cuádriceps' },
];

const recoveryModalities = [
  { id: 'stretching',  icon: '🤸', en: 'Stretching',   es: 'Estiramientos' },
  { id: 'massage',     icon: '💆', en: 'Massage',      es: 'Masaje' },
  { id: 'sauna',       icon: '🧖', en: 'Sauna',        es: 'Sauna' },
  { id: 'cold_plunge', icon: '🧊', en: 'Cold Plunge',  es: 'Baño Frío' },
  { id: 'breathwork',  icon: '🌬️', en: 'Breathwork',   es: 'Respiración' },
  { id: 'meditation',  icon: '🧘', en: 'Meditation',   es: 'Meditación' },
];

// ─── Emoji scales ────────────────────────────────────────────
const energyEmojis =     ['😴','😪','🥱','😐','🙂','😊','💪','⚡','🔋','⚡'];
const motivationEmojis = ['😕','😞','😑','😐','🙂','😊','💪','🔥','🚀','🔥'];
const stressEmojis =     ['😌','😌','🙂','😐','😬','😰','😤','🤯','💀','😰'];
const fatigueEmojis =    ['💪','💪','🙂','😐','😓','😩','😵','🥴','💀','😵'];

function getSliderEmoji(value, emojis) {
  return emojis[Math.min(value - 1, emojis.length - 1)] || '';
}

// ─── Time helpers ────────────────────────────────────────────
function timeToMinutes(timeStr) {
  if (!timeStr) return null;
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
}

function minutesToTime(minutes) {
  if (minutes == null) return '';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

// ─── Collapsible Section Component ───────────────────────────
function Section({ icon, title, expanded, onToggle, children }) {
  return (
    <div className={styles.section}>
      <button
        type="button"
        className={styles.sectionHeader}
        onClick={onToggle}
        aria-expanded={expanded}
      >
        <span className={styles.sectionLeft}>
          <span className={styles.sectionIcon}>{icon}</span>
          {title}
        </span>
        <span className={`${styles.chevron} ${expanded ? styles.chevronOpen : ''}`}>▾</span>
      </button>
      {expanded && (
        <div className={styles.sectionContent}>
          {children}
        </div>
      )}
    </div>
  );
}

export default function DailyLogForm({ isOpen, onClose, onSaved, existingData, lang = 'en' }) {
  const { user } = useAuth();

  // ─── Expanded section state ──────────────────────────────
  const [expanded, setExpanded] = useState({
    sleep: true,
    checkin: true,
    biometrics: false,
    training: false,
    pain: false,
    recovery: false,
    lifestyle: false,
    activity: false,
  });

  const toggleSection = (key) => setExpanded(prev => ({ ...prev, [key]: !prev[key] }));

  // ─── Form State ──────────────────────────────────────────
  // Sleep
  const [sleepTotal, setSleepTotal] = useState('');
  const [sleepQuality, setSleepQuality] = useState(7);
  const [bedtime, setBedtime] = useState('');
  const [wakeTime, setWakeTime] = useState('');
  const [sleepDeep, setSleepDeep] = useState('');
  const [sleepRem, setSleepRem] = useState('');

  // Check-in
  const [energy, setEnergy] = useState(5);
  const [motivation, setMotivation] = useState(5);
  const [stress, setStress] = useState(3);
  const [fatigue, setFatigue] = useState(3);

  // Biometrics
  const [hrv, setHrv] = useState('');
  const [rhr, setRhr] = useState('');

  // Training
  const [trained, setTrained] = useState(false);
  const [rpe, setRpe] = useState(5);
  const [duration, setDuration] = useState('');
  const [trainingType, setTrainingType] = useState('run');

  // Pain & Soreness
  const [painLevel, setPainLevel] = useState(1);
  const [muscleSoreness, setMuscleSoreness] = useState(1);
  const [painAreas, setPainAreas] = useState([]);

  // Recovery
  const [didRecover, setDidRecover] = useState(false);
  const [recoveryModsChecked, setRecoveryModsChecked] = useState([]);
  const [recoveryScore, setRecoveryScore] = useState(5);

  // Lifestyle
  const [waterGlasses, setWaterGlasses] = useState('');
  const [alcoholDrinks, setAlcoholDrinks] = useState('0');
  const [lateCaffeine, setLateCaffeine] = useState(false);

  // Activity
  const [steps, setSteps] = useState('');
  const [calories, setCalories] = useState('');

  // UI
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  // ─── Pre-fill from existingData ──────────────────────────
  useEffect(() => {
    if (existingData) {
      // Sleep
      setSleepTotal(existingData.sleep_total?.toString() ?? '');
      setSleepQuality(existingData.sleep_quality ?? 7);
      setBedtime(minutesToTime(existingData.bedtime_minutes));
      setWakeTime(minutesToTime(existingData.wake_time_minutes));
      setSleepDeep(existingData.sleep_deep?.toString() ?? '');
      setSleepRem(existingData.sleep_rem?.toString() ?? '');

      // Check-in
      setEnergy(existingData.energy ?? 5);
      setMotivation(existingData.motivation ?? 5);
      setStress(existingData.stress ?? 3);
      setFatigue(existingData.fatigue ?? 3);

      // Biometrics
      setHrv(existingData.hrv_rmssd?.toString() ?? '');
      setRhr(existingData.rhr?.toString() ?? '');

      // Training
      setTrained(existingData.training_load > 0);
      setRpe(existingData.training_rpe ?? 5);
      setDuration(existingData.training_duration?.toString() ?? '');
      setTrainingType(existingData.training_type ?? 'run');

      // Pain & Soreness
      setPainLevel(existingData.pain_level ?? 1);
      setMuscleSoreness(existingData.muscle_soreness ?? 1);
      setPainAreas(existingData.pain_areas ?? []);

      // Recovery
      const hasMods = (existingData.modality_count || 0) > 0;
      setDidRecover(hasMods || existingData.recovery_score != null);
      setRecoveryScore(existingData.recovery_score ?? 5);
      // Note: we don't persist which modalities, just count — so we can't restore checkboxes

      // Lifestyle
      setWaterGlasses(existingData.water_glasses?.toString() ?? '');
      setAlcoholDrinks(existingData.alcohol_drinks?.toString() ?? '0');
      setLateCaffeine(existingData.late_caffeine ?? false);

      // Activity
      setSteps(existingData.steps?.toString() ?? '');
      setCalories(existingData.calories?.toString() ?? '');
    }
  }, [existingData]);

  // ─── Computed training load ──────────────────────────────
  const trainingLoad = trained && duration ? Math.round(rpe * parseFloat(duration || 0)) : 0;

  // ─── Recovery modality count ─────────────────────────────
  const modalityCount = recoveryModsChecked.length;

  // ─── Toggle helpers ──────────────────────────────────────
  const togglePainArea = (id) => {
    setPainAreas(prev => prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id]);
  };

  const toggleRecoveryMod = (id) => {
    setRecoveryModsChecked(prev =>
      prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]
    );
  };

  // ─── Close on Escape ────────────────────────────────────
  useEffect(() => {
    function handleKey(e) {
      if (e.key === 'Escape') onClose();
    }
    if (isOpen) {
      document.addEventListener('keydown', handleKey);
      return () => document.removeEventListener('keydown', handleKey);
    }
  }, [isOpen, onClose]);

  // ─── Handle Save ─────────────────────────────────────────
  const handleSave = useCallback(async () => {
    if (!user) return;
    setSaving(true);
    setError(null);

    try {
      const today = new Date().toISOString().split('T')[0];

      const metrics = {
        date: today,
        // Sleep
        sleep_total: sleepTotal ? parseFloat(sleepTotal) : null,
        sleep_deep: sleepDeep ? parseFloat(sleepDeep) : null,
        sleep_rem: sleepRem ? parseFloat(sleepRem) : null,
        sleep_quality: sleepQuality,
        sleep_light: (sleepTotal && sleepDeep && sleepRem)
          ? Math.max(0, parseFloat(sleepTotal) - parseFloat(sleepDeep) - parseFloat(sleepRem))
          : null,
        bedtime_minutes: bedtime ? timeToMinutes(bedtime) : null,
        wake_time_minutes: wakeTime ? timeToMinutes(wakeTime) : null,
        // Check-in
        energy,
        motivation,
        stress,
        fatigue,
        // Biometrics
        hrv_rmssd: hrv ? parseFloat(hrv) : null,
        rhr: rhr ? parseInt(rhr, 10) : null,
        // Training
        training_load: trained ? trainingLoad : 0,
        training_rpe: trained ? rpe : null,
        training_duration: trained && duration ? parseInt(duration, 10) : null,
        training_type: trained ? trainingType : null,
        // Pain
        pain_level: painLevel,
        muscle_soreness: muscleSoreness,
        pain_areas: painAreas,
        // Recovery
        recovery_score: didRecover ? recoveryScore : null,
        modality_count: didRecover ? modalityCount : 0,
        // Lifestyle
        water_glasses: waterGlasses ? parseInt(waterGlasses, 10) : null,
        alcohol_drinks: alcoholDrinks ? parseInt(alcoholDrinks, 10) : 0,
        late_caffeine: lateCaffeine,
        // Activity
        steps: steps ? parseInt(steps, 10) : null,
        calories: calories ? parseInt(calories, 10) : null,
        // Backward compat
        mood: energy,
        source: 'manual',
      };

      await saveDailyMetrics(user.id, metrics);

      if (onSaved) onSaved();
      onClose();
    } catch (err) {
      console.error('Error saving metrics:', err);
      setError(err.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  }, [user, sleepTotal, sleepDeep, sleepRem, sleepQuality, bedtime, wakeTime,
      energy, motivation, stress, fatigue, hrv, rhr, trained, rpe, duration,
      trainingType, trainingLoad, painLevel, muscleSoreness, painAreas,
      didRecover, recoveryScore, modalityCount, waterGlasses, alcoholDrinks,
      lateCaffeine, steps, calories, onSaved, onClose]);

  if (!isOpen) return null;

  const L = (key) => labels[key]?.[lang] || labels[key]?.en || key;

  // Wearable source detection for badge display
  const isWearableSource = ['oura', 'whoop'].includes(existingData?.source);
  const sourceLabel = existingData?.source === 'whoop' ? L('whoopSource') : L('ouraSource');
  const OuraBadge = () => isWearableSource ? (
    <span className={styles.ouraBadge}>{sourceLabel}</span>
  ) : null;

  return (
    <div className={styles.overlay} onClick={(e) => e.target === e.currentTarget && onClose()} id="daily-log-overlay">
      <div className={styles.modal} role="dialog" aria-modal="true" id="daily-log-modal">
        {/* Header */}
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>
            {existingData ? L('titleEdit') : L('title')}
          </h2>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Close" id="daily-log-close">
            ✕
          </button>
        </div>

        {/* Body */}
        <div className={styles.formBody}>
          {error && <div className={styles.error}>{error}</div>}

          {/* ── 1. Sleep ── */}
          <Section icon="🌙" title={L('sleep')} expanded={expanded.sleep} onToggle={() => toggleSection('sleep')}>
            <div className={styles.inputRow}>
              <div className={styles.inputGroup}>
                <label className={styles.label} htmlFor="log-sleep">{L('sleepTotal')} <OuraBadge /></label>
                <div className={styles.inputWrapper}>
                  <input
                    id="log-sleep"
                    className={styles.input}
                    type="number"
                    step="0.5"
                    placeholder="7.5"
                    min="0"
                    max="24"
                    value={sleepTotal}
                    onChange={e => setSleepTotal(e.target.value)}
                  />
                  <span className={styles.inputUnit}>{lang === 'es' ? 'hrs' : 'hours'}</span>
                </div>
              </div>
            </div>

            <div className={styles.sliderGroup}>
              <div className={styles.sliderHeader}>
                <label className={styles.label} htmlFor="log-sleep-quality">{L('sleepQuality')} <OuraBadge /></label>
                <span className={styles.sliderValue}>{sleepQuality}/10</span>
              </div>
              <input
                id="log-sleep-quality"
                className={styles.slider}
                type="range"
                min="1"
                max="10"
                step="1"
                value={sleepQuality}
                onChange={e => setSleepQuality(parseInt(e.target.value, 10))}
              />
            </div>

            <div className={styles.inputRow}>
              <div className={styles.inputGroup}>
                <label className={styles.label} htmlFor="log-bedtime">{L('bedtime')} <OuraBadge /></label>
                <input
                  id="log-bedtime"
                  className={styles.input}
                  type="time"
                  value={bedtime}
                  onChange={e => setBedtime(e.target.value)}
                />
              </div>
              <div className={styles.inputGroup}>
                <label className={styles.label} htmlFor="log-waketime">{L('wakeTime')} <OuraBadge /></label>
                <input
                  id="log-waketime"
                  className={styles.input}
                  type="time"
                  value={wakeTime}
                  onChange={e => setWakeTime(e.target.value)}
                />
              </div>
            </div>

            <div className={styles.inputRow}>
              <div className={styles.inputGroup}>
                <label className={styles.label} htmlFor="log-deep">
                  {L('sleepDeep')} <span className={styles.optional}>({L('optional')})</span>
                </label>
                <div className={styles.inputWrapper}>
                  <input
                    id="log-deep"
                    className={styles.input}
                    type="number"
                    step="0.1"
                    placeholder="1.5"
                    min="0"
                    max="12"
                    value={sleepDeep}
                    onChange={e => setSleepDeep(e.target.value)}
                  />
                  <span className={styles.inputUnit}>{lang === 'es' ? 'hrs' : 'hours'}</span>
                </div>
              </div>
              <div className={styles.inputGroup}>
                <label className={styles.label} htmlFor="log-rem">
                  {L('sleepRem')} <span className={styles.optional}>({L('optional')})</span>
                </label>
                <div className={styles.inputWrapper}>
                  <input
                    id="log-rem"
                    className={styles.input}
                    type="number"
                    step="0.1"
                    placeholder="1.8"
                    min="0"
                    max="12"
                    value={sleepRem}
                    onChange={e => setSleepRem(e.target.value)}
                  />
                  <span className={styles.inputUnit}>{lang === 'es' ? 'hrs' : 'hours'}</span>
                </div>
              </div>
            </div>
          </Section>

          {/* ── 2. Check-in ── */}
          <Section icon="🧠" title={L('checkin')} expanded={expanded.checkin} onToggle={() => toggleSection('checkin')}>
            <div className={styles.sliderGroup}>
              <div className={styles.sliderHeader}>
                <label className={styles.label} htmlFor="log-energy">{L('energy')}</label>
                <span className={styles.sliderValue}>{getSliderEmoji(energy, energyEmojis)} {energy}/10</span>
              </div>
              <input
                id="log-energy"
                className={styles.slider}
                type="range"
                min="1"
                max="10"
                step="1"
                value={energy}
                onChange={e => setEnergy(parseInt(e.target.value, 10))}
              />
              <div className={styles.sliderScale}><span>😴</span><span>⚡</span></div>
            </div>

            <div className={styles.sliderGroup}>
              <div className={styles.sliderHeader}>
                <label className={styles.label} htmlFor="log-motivation">{L('motivation')}</label>
                <span className={styles.sliderValue}>{getSliderEmoji(motivation, motivationEmojis)} {motivation}/10</span>
              </div>
              <input
                id="log-motivation"
                className={styles.slider}
                type="range"
                min="1"
                max="10"
                step="1"
                value={motivation}
                onChange={e => setMotivation(parseInt(e.target.value, 10))}
              />
              <div className={styles.sliderScale}><span>😕</span><span>🔥</span></div>
            </div>

            <div className={styles.sliderGroup}>
              <div className={styles.sliderHeader}>
                <label className={styles.label} htmlFor="log-stress">
                  {L('stress')} <span className={styles.invertedNote}>{lang === 'es' ? '(mayor = peor)' : '(higher = worse)'}</span>
                </label>
                <span className={styles.sliderValue}>{getSliderEmoji(stress, stressEmojis)} {stress}/10</span>
              </div>
              <input
                id="log-stress"
                className={`${styles.slider} ${styles.sliderInverted}`}
                type="range"
                min="1"
                max="10"
                step="1"
                value={stress}
                onChange={e => setStress(parseInt(e.target.value, 10))}
              />
              <div className={styles.sliderScale}><span>😌</span><span>😰</span></div>
            </div>

            <div className={styles.sliderGroup}>
              <div className={styles.sliderHeader}>
                <label className={styles.label} htmlFor="log-fatigue">
                  {L('fatigue')} <span className={styles.invertedNote}>{lang === 'es' ? '(mayor = peor)' : '(higher = worse)'}</span>
                </label>
                <span className={styles.sliderValue}>{getSliderEmoji(fatigue, fatigueEmojis)} {fatigue}/10</span>
              </div>
              <input
                id="log-fatigue"
                className={`${styles.slider} ${styles.sliderInverted}`}
                type="range"
                min="1"
                max="10"
                step="1"
                value={fatigue}
                onChange={e => setFatigue(parseInt(e.target.value, 10))}
              />
              <div className={styles.sliderScale}><span>💪</span><span>😵</span></div>
            </div>
          </Section>

          {/* ── 3. Biometrics ── */}
          <Section icon="💓" title={L('biometrics')} expanded={expanded.biometrics} onToggle={() => toggleSection('biometrics')}>
            <div className={styles.inputRow}>
              <div className={styles.inputGroup}>
                <label className={styles.label} htmlFor="log-hrv">{L('hrv')} <OuraBadge /></label>
                <div className={styles.inputWrapper}>
                  <input
                    id="log-hrv"
                    className={styles.input}
                    type="number"
                    placeholder="45"
                    min="0"
                    max="200"
                    value={hrv}
                    onChange={e => setHrv(e.target.value)}
                  />
                  <span className={styles.inputUnit}>ms</span>
                </div>
              </div>
              <div className={styles.inputGroup}>
                <label className={styles.label} htmlFor="log-rhr">{L('rhr')} <OuraBadge /></label>
                <div className={styles.inputWrapper}>
                  <input
                    id="log-rhr"
                    className={styles.input}
                    type="number"
                    placeholder="60"
                    min="30"
                    max="200"
                    value={rhr}
                    onChange={e => setRhr(e.target.value)}
                  />
                  <span className={styles.inputUnit}>bpm</span>
                </div>
              </div>
            </div>
          </Section>

          {/* ── 4. Training ── */}
          <Section icon="🏋️" title={L('training')} expanded={expanded.training} onToggle={() => toggleSection('training')}>
            <div className={styles.toggleRow}>
              <span className={styles.toggleLabel}>{L('didTrain')}</span>
              <button
                type="button"
                className={`${styles.toggle} ${trained ? styles.active : ''}`}
                onClick={() => setTrained(!trained)}
                aria-pressed={trained}
                id="log-train-toggle"
              >
                <span className={styles.toggleKnob} />
              </button>
            </div>

            {trained && (
              <div className={styles.trainingDetails}>
                <div className={styles.sliderGroup}>
                  <div className={styles.sliderHeader}>
                    <label className={styles.label} htmlFor="log-rpe">{L('rpe')}</label>
                    <span className={styles.sliderValue}>{rpe}</span>
                  </div>
                  <input
                    id="log-rpe"
                    className={styles.slider}
                    type="range"
                    min="1"
                    max="10"
                    step="1"
                    value={rpe}
                    onChange={e => setRpe(parseInt(e.target.value, 10))}
                  />
                </div>

                <div className={styles.inputRow}>
                  <div className={styles.inputGroup}>
                    <label className={styles.label} htmlFor="log-duration">{L('duration')}</label>
                    <div className={styles.inputWrapper}>
                      <input
                        id="log-duration"
                        className={styles.input}
                        type="number"
                        placeholder="60"
                        min="1"
                        max="600"
                        value={duration}
                        onChange={e => setDuration(e.target.value)}
                      />
                      <span className={styles.inputUnit}>min</span>
                    </div>
                  </div>
                  <div className={styles.inputGroup}>
                    <label className={styles.label} htmlFor="log-type">{L('type')}</label>
                    <select
                      id="log-type"
                      className={styles.select}
                      value={trainingType}
                      onChange={e => setTrainingType(e.target.value)}
                    >
                      {trainingTypes.map(tt => (
                        <option key={tt.value} value={tt.value}>{tt[lang] || tt.en}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className={styles.liveCalc}>
                  <span className={styles.liveCalcLabel}>{L('loadCalc')}:</span>
                  <span className={styles.liveCalcValue}>{trainingLoad}</span>
                  <span className={styles.liveCalcUnit}>AU</span>
                </div>
              </div>
            )}
          </Section>

          {/* ── 5. Pain & Soreness ── */}
          <Section icon="🩹" title={L('painSoreness')} expanded={expanded.pain} onToggle={() => toggleSection('pain')}>
            <div className={styles.sliderGroup}>
              <div className={styles.sliderHeader}>
                <label className={styles.label} htmlFor="log-pain">{L('painLevel')}</label>
                <span className={styles.sliderValue}>{painLevel}/10</span>
              </div>
              <input
                id="log-pain"
                className={`${styles.slider} ${styles.sliderInverted}`}
                type="range"
                min="1"
                max="10"
                step="1"
                value={painLevel}
                onChange={e => setPainLevel(parseInt(e.target.value, 10))}
              />
            </div>

            <div className={styles.sliderGroup}>
              <div className={styles.sliderHeader}>
                <label className={styles.label} htmlFor="log-soreness">{L('muscleSoreness')}</label>
                <span className={styles.sliderValue}>{muscleSoreness}/10</span>
              </div>
              <input
                id="log-soreness"
                className={`${styles.slider} ${styles.sliderInverted}`}
                type="range"
                min="1"
                max="10"
                step="1"
                value={muscleSoreness}
                onChange={e => setMuscleSoreness(parseInt(e.target.value, 10))}
              />
            </div>

            <div className={styles.chipLabel}>{L('painAreas')}</div>
            <div className={styles.chipGrid}>
              {painAreaOptions.map(area => (
                <button
                  key={area.id}
                  type="button"
                  className={`${styles.chip} ${painAreas.includes(area.id) ? styles.chipActive : ''}`}
                  onClick={() => togglePainArea(area.id)}
                >
                  {area[lang] || area.en}
                </button>
              ))}
            </div>
          </Section>

          {/* ── 6. Recovery ── */}
          <Section icon="🧘" title={L('recovery')} expanded={expanded.recovery} onToggle={() => toggleSection('recovery')}>
            <div className={styles.toggleRow}>
              <span className={styles.toggleLabel}>{L('didRecover')}</span>
              <button
                type="button"
                className={`${styles.toggle} ${didRecover ? styles.active : ''}`}
                onClick={() => setDidRecover(!didRecover)}
                aria-pressed={didRecover}
              >
                <span className={styles.toggleKnob} />
              </button>
            </div>

            {didRecover && (
              <div className={styles.trainingDetails}>
                <div className={styles.chipGrid}>
                  {recoveryModalities.map(mod => (
                    <button
                      key={mod.id}
                      type="button"
                      className={`${styles.chip} ${styles.chipWide} ${recoveryModsChecked.includes(mod.id) ? styles.chipActive : ''}`}
                      onClick={() => toggleRecoveryMod(mod.id)}
                    >
                      <span className={styles.chipIcon}>{mod.icon}</span>
                      {mod[lang] || mod.en}
                    </button>
                  ))}
                </div>

                <div className={styles.sliderGroup}>
                  <div className={styles.sliderHeader}>
                    <label className={styles.label} htmlFor="log-recovery-score">{L('recoveryFeeling')}</label>
                    <span className={styles.sliderValue}>{recoveryScore}/10</span>
                  </div>
                  <input
                    id="log-recovery-score"
                    className={styles.slider}
                    type="range"
                    min="1"
                    max="10"
                    step="1"
                    value={recoveryScore}
                    onChange={e => setRecoveryScore(parseInt(e.target.value, 10))}
                  />
                </div>
              </div>
            )}
          </Section>

          {/* ── 7. Lifestyle ── */}
          <Section icon="🥤" title={L('lifestyle')} expanded={expanded.lifestyle} onToggle={() => toggleSection('lifestyle')}>
            <div className={styles.inputRow}>
              <div className={styles.inputGroup}>
                <label className={styles.label} htmlFor="log-water">{L('waterGlasses')}</label>
                <div className={styles.inputWrapper}>
                  <input
                    id="log-water"
                    className={styles.input}
                    type="number"
                    placeholder="8"
                    min="0"
                    max="30"
                    value={waterGlasses}
                    onChange={e => setWaterGlasses(e.target.value)}
                  />
                </div>
              </div>
              <div className={styles.inputGroup}>
                <label className={styles.label} htmlFor="log-alcohol">{L('alcoholDrinks')}</label>
                <div className={styles.inputWrapper}>
                  <input
                    id="log-alcohol"
                    className={styles.input}
                    type="number"
                    placeholder="0"
                    min="0"
                    max="20"
                    value={alcoholDrinks}
                    onChange={e => setAlcoholDrinks(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className={styles.toggleRow}>
              <span className={styles.toggleLabel}>{L('lateCaffeine')}</span>
              <button
                type="button"
                className={`${styles.toggle} ${lateCaffeine ? styles.active : ''}`}
                onClick={() => setLateCaffeine(!lateCaffeine)}
                aria-pressed={lateCaffeine}
              >
                <span className={styles.toggleKnob} />
              </button>
            </div>
          </Section>

          {/* ── 8. Activity (optional) ── */}
          <Section icon="👟" title={`${L('activity')} (${L('optional')})`} expanded={expanded.activity} onToggle={() => toggleSection('activity')}>
            <div className={styles.inputRow}>
              <div className={styles.inputGroup}>
                <label className={styles.label} htmlFor="log-steps">{L('steps')} <OuraBadge /></label>
                <div className={styles.inputWrapper}>
                  <input
                    id="log-steps"
                    className={styles.input}
                    type="number"
                    placeholder="8000"
                    min="0"
                    value={steps}
                    onChange={e => setSteps(e.target.value)}
                  />
                </div>
              </div>
              <div className={styles.inputGroup}>
                <label className={styles.label} htmlFor="log-calories">{L('calories')} <OuraBadge /></label>
                <div className={styles.inputWrapper}>
                  <input
                    id="log-calories"
                    className={styles.input}
                    type="number"
                    placeholder="2500"
                    min="0"
                    value={calories}
                    onChange={e => setCalories(e.target.value)}
                  />
                  <span className={styles.inputUnit}>kcal</span>
                </div>
              </div>
            </div>
          </Section>
        </div>

        {/* Footer */}
        <div className={styles.footer}>
          <button
            className={styles.cancelBtn}
            onClick={onClose}
            disabled={saving}
            id="daily-log-cancel"
          >
            {L('cancel')}
          </button>
          <button
            className={styles.saveBtn}
            onClick={handleSave}
            disabled={saving}
            id="daily-log-save"
          >
            {saving ? L('saving') : L('save')}
          </button>
        </div>
      </div>
    </div>
  );
}
