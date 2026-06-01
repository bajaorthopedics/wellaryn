'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { generateMockUser } from '@/lib/mock-data';
import { calculateWellarynScore } from '@/lib/wellaryn-score';
import {
  fetchDailyMetrics,
  metricsToWellarynInput,
  metricsToChartData,
} from '@/lib/supabase/data-service';
import TrainingLoadChart from '@/components/charts/TrainingLoadChart';
import DailyLogForm from '@/components/dashboard/DailyLogForm';
import styles from './page.module.css';

const labels = {
  title:        { en: 'Training & Load',           es: 'Entrenamiento y Carga' },
  subtitle:     { en: 'History and workload analysis', es: 'Historial y análisis de carga' },
  back:         { en: '← Dashboard',               es: '← Panel' },
  acwrTitle:    { en: 'Acute:Chronic Ratio',        es: 'Ratio Aguda:Crónica' },
  acuteLoad:    { en: 'Acute (3d)',                 es: 'Aguda (3d)' },
  chronicLoad:  { en: 'Chronic (14d)',              es: 'Crónica (14d)' },
  summary:      { en: 'Summary',                    es: 'Resumen' },
  totalLoad:    { en: 'Total Load',                 es: 'Carga Total' },
  avgRpe:       { en: 'Avg RPE',                    es: 'RPE Promedio' },
  sessions:     { en: 'Sessions',                   es: 'Sesiones' },
  avgDuration:  { en: 'Avg Duration',               es: 'Duración Promedio' },
  chartLabel:   { en: 'Training Load Chart',        es: 'Gráfico de Carga' },
  logTitle:     { en: 'Training Log',               es: 'Registro de Entrenamiento' },
  logSub:       { en: 'Last 14 days',               es: 'Últimos 14 días' },
  date:         { en: 'Date',                       es: 'Fecha' },
  type:         { en: 'Type',                       es: 'Tipo' },
  rpe:          { en: 'RPE',                        es: 'RPE' },
  duration:     { en: 'Duration',                   es: 'Duración' },
  load:         { en: 'Load',                       es: 'Carga' },
  addLog:       { en: '+ Log Today',                es: '+ Registrar Hoy' },
  loading:      { en: 'Loading training data…',     es: 'Cargando datos de entrenamiento…' },
  au:           { en: 'AU',                         es: 'UA' },
  min:          { en: 'min',                        es: 'min' },
  zoneOptimal:  { en: 'Optimal',                    es: 'Óptimo' },
  zoneCaution:  { en: 'Caution',                    es: 'Precaución' },
  zoneDanger:   { en: 'Danger',                     es: 'Peligro' },
  zoneDetraining: { en: 'Detraining',               es: 'Desentrenamiento' },
  trainingLoadScore: { en: 'Training Load Score',   es: 'Puntaje de Carga' },
};

const typeLabels = {
  run:      { en: 'Run', es: 'Correr' },
  crossfit: { en: 'CrossFit', es: 'CrossFit' },
  padel:    { en: 'Padel', es: 'Pádel' },
  swim:     { en: 'Swim', es: 'Nadar' },
  cycle:    { en: 'Cycle', es: 'Ciclismo' },
  other:    { en: 'Other', es: 'Otro' },
};

function getACWRZone(ratio) {
  if (ratio === null || ratio === undefined) return { class: styles.zoneDetraining, key: 'zoneDetraining' };
  if (ratio < 0.8) return { class: styles.zoneDetraining, key: 'zoneDetraining' };
  if (ratio <= 1.3) return { class: styles.zoneOptimal, key: 'zoneOptimal' };
  if (ratio <= 1.5) return { class: styles.zoneCaution, key: 'zoneCaution' };
  return { class: styles.zoneDanger, key: 'zoneDanger' };
}

function getACWRColor(ratio) {
  if (ratio === null || ratio === undefined) return styles.colorBlue;
  if (ratio < 0.8) return styles.colorBlue;
  if (ratio <= 1.3) return styles.colorGreen;
  if (ratio <= 1.5) return styles.colorYellow;
  return styles.colorRed;
}

function formatDate(dateStr, lang) {
  try {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString(lang === 'es' ? 'es-MX' : 'en-US', {
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

export default function TrainingPage() {
  const { lang } = useLanguage();
  const { user, profile } = useAuth();
  const [metrics, setMetrics] = useState([]);
  const [chartData, setChartData] = useState([]);
  const [trainingLoadDetails, setTrainingLoadDetails] = useState(null);
  const [trainingLoadScore, setTrainingLoadScore] = useState(null);
  const [showLogForm, setShowLogForm] = useState(false);
  const [loading, setLoading] = useState(true);

  const L = (key) => labels[key]?.[lang] || labels[key]?.en || key;

  const loadData = useCallback(async () => {
    setLoading(true);

    if (user) {
      try {
        const data = await fetchDailyMetrics(user.id, 60);

        if (data && data.length > 0) {
          setMetrics(data);

          // Use more data for training chart (28+ days)
          const trainingData = data
            .filter(m => m.training_load != null)
            .slice(-28)
            .map(m => ({ date: m.date, load: m.training_load, type: m.training_type }));
          setChartData(trainingData);

          // Calculate Wellaryn Score for training load details
          const input = metricsToWellarynInput(data, profile);
          if (input) {
            const wellarynResult = calculateWellarynScore(input);
            setTrainingLoadDetails(wellarynResult.trainingLoadDetails);
            setTrainingLoadScore(wellarynResult.subScores.trainingLoad);
          }

          setLoading(false);
          return;
        }
      } catch (err) {
        console.error('Error fetching training data:', err);
      }
    }

    // Fallback: mock
    try {
      const mock = generateMockUser();
      const mockMetrics = [];
      for (let i = 59; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];
        const load = mock.loadHistory[60 - 1 - i] ?? 0;
        const trained = load > 100;
        mockMetrics.push({
          date: dateStr,
          training_load: load,
          training_rpe: trained ? Math.min(10, Math.max(1, Math.round(load / 50))) : null,
          training_duration: trained ? Math.round(load / (Math.round(load / 50) || 5)) : null,
          training_type: trained ? ['run', 'crossfit', 'padel', 'cycle'][Math.floor(Math.random() * 4)] : null,
        });
      }
      setMetrics(mockMetrics);

      const trainingData = mockMetrics
        .filter(m => m.training_load != null)
        .slice(-28)
        .map(m => ({ date: m.date, load: m.training_load, type: m.training_type }));
      setChartData(trainingData);

      // Build mock Wellaryn input for training details
      const mockInput = {
        recovery: { sleepHours: 7.5, sleepQuality: 7, hasRecoveryEntry: false },
        readiness: { hasCheckin: false },
        trainingLoad: {
          sessions: mockMetrics
            .filter(m => m.training_load > 0)
            .slice(-14)
            .map(m => ({
              date: m.date,
              durationMinutes: m.training_duration || 0,
              intensity: m.training_rpe || 0,
            })),
          today: new Date(),
        },
        injuryRisk: { hasCheckin: false },
        lifestyle: { hasCheckin: false },
        distinctDays: 14,
      };
      const mockResult = calculateWellarynScore(mockInput);
      setTrainingLoadDetails(mockResult.trainingLoadDetails);
      setTrainingLoadScore(mockResult.subScores.trainingLoad);
    } catch (err) {
      console.error('Error generating mock training data:', err);
    }

    setLoading(false);
  }, [user, profile]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleLogSaved = useCallback(() => {
    loadData();
    setShowLogForm(false);
  }, [loadData]);

  if (loading) {
    return (
      <div className={styles.loading}>
        <div className={styles.spinner} />
        <span className={styles.loadingText}>{L('loading')}</span>
      </div>
    );
  }

  // ACWR data from trainingLoadDetails
  const ratio = trainingLoadDetails?.ratio ?? null;
  const zone = getACWRZone(ratio);

  // Training log: last 14 days
  const logEntries = metrics.slice(-14).reverse();

  // Summary stats (from all loaded data)
  const trainedDays = metrics.filter(m => m.training_load && m.training_load > 100);
  const totalLoad = trainedDays.reduce((sum, m) => sum + (m.training_load || 0), 0);
  const avgRpe = trainedDays.length > 0
    ? (trainedDays.reduce((sum, m) => sum + (m.training_rpe || 0), 0) / trainedDays.length).toFixed(1)
    : '—';
  const avgDuration = trainedDays.length > 0
    ? Math.round(trainedDays.reduce((sum, m) => sum + (m.training_duration || 0), 0) / trainedDays.length)
    : '—';

  return (
    <div className={styles.page}>
      <Link href="/dashboard" className={styles.backLink}>{L('back')}</Link>

      <header className={styles.header}>
        <h1 className={styles.title}>{L('title')}</h1>
        <p className={styles.subtitle}>{L('subtitle')}</p>
      </header>

      {/* Top row: ACWR + Summary */}
      <div className={styles.topGrid}>
        {/* ACWR Gauge Card */}
        <div className={styles.acwrCard}>
          <span className={styles.acwrLabel}>{L('acwrTitle')}</span>
          <span className={`${styles.acwrValue} ${getACWRColor(ratio)}`}>
            {ratio !== null ? ratio.toFixed(2) : '—'}
          </span>
          <span className={`${styles.acwrZone} ${zone.class}`}>
            {L(zone.key)}
          </span>
          <div className={styles.acwrLoads}>
            <div className={styles.acwrLoadItem}>
              <span className={styles.acwrLoadValue}>
                {trainingLoadDetails?.acuteLoad != null ? Math.round(trainingLoadDetails.acuteLoad) : '—'}
              </span>
              <span>{L('acuteLoad')}</span>
            </div>
            <div className={styles.acwrLoadItem}>
              <span className={styles.acwrLoadValue}>
                {trainingLoadDetails?.chronicLoad != null ? Math.round(trainingLoadDetails.chronicLoad) : '—'}
              </span>
              <span>{L('chronicLoad')}</span>
            </div>
          </div>
          {trainingLoadScore != null && (
            <div className={styles.acwrScoreBadge}>
              {L('trainingLoadScore')}: <strong>{trainingLoadScore}</strong>/100
            </div>
          )}
        </div>

        {/* Summary Card */}
        <div className={styles.summaryCard}>
          <div className={styles.summaryTitle}>{L('summary')}</div>
          <div className={styles.summaryGrid}>
            <div className={styles.summaryItem}>
              <span className={styles.summaryItemLabel}>{L('totalLoad')}</span>
              <span className={styles.summaryItemValue}>
                {totalLoad.toLocaleString()}
                <span className={styles.summaryItemUnit}> {L('au')}</span>
              </span>
            </div>
            <div className={styles.summaryItem}>
              <span className={styles.summaryItemLabel}>{L('avgRpe')}</span>
              <span className={styles.summaryItemValue}>{avgRpe}</span>
            </div>
            <div className={styles.summaryItem}>
              <span className={styles.summaryItemLabel}>{L('sessions')}</span>
              <span className={styles.summaryItemValue}>{trainedDays.length}</span>
            </div>
            <div className={styles.summaryItem}>
              <span className={styles.summaryItemLabel}>{L('avgDuration')}</span>
              <span className={styles.summaryItemValue}>
                {avgDuration}
                <span className={styles.summaryItemUnit}> {L('min')}</span>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Training Load Chart */}
      <div className={styles.chartSection}>
        <div className={styles.sectionLabel}>{L('chartLabel')}</div>
        <div className={styles.chartCard}>
          <TrainingLoadChart data={chartData} />
        </div>
      </div>

      {/* Training Log Table */}
      <div className={styles.sectionLabel}>{L('logTitle')} — {L('logSub')}</div>
      <div className={styles.tableContainer}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>{L('date')}</th>
              <th>{L('type')}</th>
              <th>{L('rpe')}</th>
              <th>{L('duration')}</th>
              <th>{L('load')}</th>
            </tr>
          </thead>
          <tbody>
            {logEntries.map((entry) => {
              const hasTraining = entry.training_load && entry.training_load > 0;
              const rpe = entry.training_rpe;
              const rpeClass = rpe >= 8 ? styles.rpeHigh : rpe >= 5 ? styles.rpeMed : styles.rpeLow;
              const tType = entry.training_type;
              const tLabel = tType ? (typeLabels[tType]?.[lang] || typeLabels[tType]?.en || tType) : null;

              return (
                <tr key={entry.date}>
                  <td>{formatDate(entry.date, lang)}</td>
                  <td>{hasTraining && tLabel ? tLabel : <span className={styles.emptyCell}>—</span>}</td>
                  <td>
                    {hasTraining && rpe ? (
                      <span className={`${styles.rpeBadge} ${rpeClass}`}>{rpe}</span>
                    ) : (
                      <span className={styles.emptyCell}>—</span>
                    )}
                  </td>
                  <td>
                    {hasTraining && entry.training_duration
                      ? `${entry.training_duration} ${L('min')}`
                      : <span className={styles.emptyCell}>—</span>}
                  </td>
                  <td>
                    {hasTraining
                      ? entry.training_load
                      : <span className={styles.emptyCell}>—</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* FAB */}
      {user && (
        <button
          className={styles.fab}
          onClick={() => setShowLogForm(true)}
        >
          {L('addLog')}
        </button>
      )}

      <DailyLogForm
        isOpen={showLogForm}
        onClose={() => setShowLogForm(false)}
        onSaved={handleLogSaved}
        lang={lang}
      />
    </div>
  );
}
