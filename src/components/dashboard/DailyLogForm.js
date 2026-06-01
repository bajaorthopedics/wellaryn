'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { saveDailyMetrics } from '@/lib/supabase/data-service';
import styles from './DailyLogForm.module.css';

const labels = {
  title:       { en: 'Daily Log',          es: 'Registro Diario' },
  titleEdit:   { en: 'Edit Today',         es: 'Editar Hoy' },
  biometrics:  { en: 'Biometrics',         es: 'Biométricos' },
  hrv:         { en: 'HRV (rMSSD)',        es: 'VFC (rMSSD)' },
  rhr:         { en: 'Resting Heart Rate', es: 'FC en Reposo' },
  sleep:       { en: 'Sleep',              es: 'Sueño' },
  sleepTotal:  { en: 'Total Sleep',        es: 'Sueño Total' },
  sleepDeep:   { en: 'Deep Sleep',         es: 'Sueño Profundo' },
  sleepRem:    { en: 'REM Sleep',          es: 'Sueño REM' },
  training:    { en: 'Training',           es: 'Entrenamiento' },
  didTrain:    { en: 'Did you train today?', es: '¿Entrenaste hoy?' },
  rpe:         { en: 'RPE (effort)',       es: 'RPE (esfuerzo)' },
  duration:    { en: 'Duration',           es: 'Duración' },
  type:        { en: 'Type',              es: 'Tipo' },
  loadCalc:    { en: 'Training Load',      es: 'Carga de Entrenamiento' },
  subjective:  { en: 'Subjective',         es: 'Subjetivo' },
  stress:      { en: 'Stress',             es: 'Estrés' },
  mood:        { en: 'Mood',               es: 'Ánimo' },
  activity:    { en: 'Activity',           es: 'Actividad' },
  steps:       { en: 'Steps',              es: 'Pasos' },
  calories:    { en: 'Calories',           es: 'Calorías' },
  save:        { en: 'Save',               es: 'Guardar' },
  saving:      { en: 'Saving…',            es: 'Guardando…' },
  cancel:      { en: 'Cancel',             es: 'Cancelar' },
  optional:    { en: 'optional',           es: 'opcional' },
};

const trainingTypes = [
  { value: 'run',      en: 'Run',      es: 'Correr' },
  { value: 'crossfit', en: 'CrossFit', es: 'CrossFit' },
  { value: 'padel',    en: 'Padel',    es: 'Pádel' },
  { value: 'swim',     en: 'Swim',     es: 'Nadar' },
  { value: 'cycle',    en: 'Cycle',    es: 'Ciclismo' },
  { value: 'other',    en: 'Other',    es: 'Otro' },
];

export default function DailyLogForm({ isOpen, onClose, onSaved, existingData, lang = 'en' }) {
  const { user } = useAuth();

  // Form state
  const [hrv, setHrv] = useState('');
  const [rhr, setRhr] = useState('');
  const [sleepTotal, setSleepTotal] = useState('');
  const [sleepDeep, setSleepDeep] = useState('');
  const [sleepRem, setSleepRem] = useState('');
  const [trained, setTrained] = useState(false);
  const [rpe, setRpe] = useState(5);
  const [duration, setDuration] = useState('');
  const [trainingType, setTrainingType] = useState('run');
  const [stress, setStress] = useState(30);
  const [mood, setMood] = useState(7);
  const [steps, setSteps] = useState('');
  const [calories, setCalories] = useState('');

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  // Pre-fill with existing data
  useEffect(() => {
    if (existingData) {
      setHrv(existingData.hrv_rmssd?.toString() ?? '');
      setRhr(existingData.rhr?.toString() ?? '');
      setSleepTotal(existingData.sleep_total?.toString() ?? '');
      setSleepDeep(existingData.sleep_deep?.toString() ?? '');
      setSleepRem(existingData.sleep_rem?.toString() ?? '');
      setTrained(existingData.training_load > 0);
      setRpe(existingData.training_rpe ?? 5);
      setDuration(existingData.training_duration?.toString() ?? '');
      setTrainingType(existingData.training_type ?? 'run');
      setStress(existingData.stress ?? 30);
      setMood(existingData.mood ?? 7);
      setSteps(existingData.steps?.toString() ?? '');
      setCalories(existingData.calories?.toString() ?? '');
    }
  }, [existingData]);

  // Computed training load
  const trainingLoad = trained && duration ? Math.round(rpe * parseFloat(duration || 0)) : 0;

  // Close on Escape
  useEffect(() => {
    function handleKey(e) {
      if (e.key === 'Escape') onClose();
    }
    if (isOpen) {
      document.addEventListener('keydown', handleKey);
      return () => document.removeEventListener('keydown', handleKey);
    }
  }, [isOpen, onClose]);

  // Handle save
  const handleSave = useCallback(async () => {
    if (!user) return;
    setSaving(true);
    setError(null);

    try {
      const today = new Date().toISOString().split('T')[0];

      const metrics = {
        date: today,
        hrv_rmssd: hrv ? parseFloat(hrv) : null,
        rhr: rhr ? parseInt(rhr, 10) : null,
        sleep_total: sleepTotal ? parseFloat(sleepTotal) : null,
        sleep_deep: sleepDeep ? parseFloat(sleepDeep) : null,
        sleep_rem: sleepRem ? parseFloat(sleepRem) : null,
        sleep_light: sleepTotal && sleepDeep && sleepRem
          ? Math.max(0, parseFloat(sleepTotal) - parseFloat(sleepDeep) - parseFloat(sleepRem))
          : null,
        training_load: trained ? trainingLoad : 0,
        training_rpe: trained ? rpe : null,
        training_duration: trained && duration ? parseInt(duration, 10) : null,
        training_type: trained ? trainingType : null,
        stress,
        mood,
        steps: steps ? parseInt(steps, 10) : null,
        calories: calories ? parseInt(calories, 10) : null,
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
  }, [user, hrv, rhr, sleepTotal, sleepDeep, sleepRem, trained, rpe, duration,
      trainingType, stress, mood, steps, calories, trainingLoad, onSaved, onClose]);

  if (!isOpen) return null;

  const L = (key) => labels[key]?.[lang] || labels[key]?.en || key;

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

          {/* ── Biometrics ── */}
          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <span className={styles.sectionIcon}>💓</span>
              {L('biometrics')}
            </div>
            <div className={styles.inputRow}>
              <div className={styles.inputGroup}>
                <label className={styles.label} htmlFor="log-hrv">{L('hrv')}</label>
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
                <label className={styles.label} htmlFor="log-rhr">{L('rhr')}</label>
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
          </div>

          {/* ── Sleep ── */}
          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <span className={styles.sectionIcon}>🌙</span>
              {L('sleep')}
            </div>
            <div className={styles.inputRow}>
              <div className={styles.inputGroup}>
                <label className={styles.label} htmlFor="log-sleep">{L('sleepTotal')}</label>
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
          </div>

          {/* ── Training ── */}
          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <span className={styles.sectionIcon}>🏋️</span>
              {L('training')}
            </div>

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
                {/* RPE Slider */}
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

                {/* Live calc */}
                <div className={styles.liveCalc}>
                  <span className={styles.liveCalcLabel}>{L('loadCalc')}:</span>
                  <span className={styles.liveCalcValue}>{trainingLoad}</span>
                  <span className={styles.liveCalcUnit}>AU</span>
                </div>
              </div>
            )}
          </div>

          {/* ── Subjective ── */}
          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <span className={styles.sectionIcon}>🧠</span>
              {L('subjective')}
            </div>

            <div className={styles.sliderGroup}>
              <div className={styles.sliderHeader}>
                <label className={styles.label} htmlFor="log-stress">{L('stress')}</label>
                <span className={styles.sliderValue}>{stress}/100</span>
              </div>
              <input
                id="log-stress"
                className={styles.slider}
                type="range"
                min="0"
                max="100"
                step="1"
                value={stress}
                onChange={e => setStress(parseInt(e.target.value, 10))}
              />
            </div>

            <div className={styles.sliderGroup}>
              <div className={styles.sliderHeader}>
                <label className={styles.label} htmlFor="log-mood">{L('mood')}</label>
                <span className={styles.sliderValue}>{mood}/10</span>
              </div>
              <input
                id="log-mood"
                className={styles.slider}
                type="range"
                min="1"
                max="10"
                step="1"
                value={mood}
                onChange={e => setMood(parseInt(e.target.value, 10))}
              />
            </div>
          </div>

          {/* ── Activity (optional) ── */}
          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <span className={styles.sectionIcon}>👟</span>
              {L('activity')} <span className={styles.optional}>({L('optional')})</span>
            </div>
            <div className={styles.inputRow}>
              <div className={styles.inputGroup}>
                <label className={styles.label} htmlFor="log-steps">{L('steps')}</label>
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
                <label className={styles.label} htmlFor="log-calories">{L('calories')}</label>
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
          </div>
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
