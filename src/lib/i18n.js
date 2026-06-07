/**
 * Wellaryn — Internationalization (i18n)
 * Bilingual support: English (en) / Spanish (es)
 */

const translations = {
  // ===================== NAVBAR =====================
  nav: {
    features: { en: 'Features', es: 'Características' },
    howItWorks: { en: 'How It Works', es: 'Cómo Funciona' },
    sports: { en: 'Sports', es: 'Deportes' },
    pricing: { en: 'Pricing', es: 'Precios' },
    getEarlyAccess: { en: 'Get Early Access', es: 'Acceso Anticipado' },
  },

  // ===================== HERO =====================
  hero: {
    tag: { en: 'AI-Powered Injury Prevention', es: 'Prevención de Lesiones con IA' },
    titleLine1: { en: 'Know when to push.', es: 'Sabe cuándo dar todo.' },
    titleLine2: { en: 'And when to stop.', es: 'Y cuándo parar.' },
    subtitle: {
      en: 'The AI that prevents injuries before they happen. Connect your wearables, understand your body, and train with confidence.',
      es: 'La IA que previene lesiones antes de que ocurran. Conecta tus wearables, entiende tu cuerpo y entrena con confianza.',
    },
    ctaPrimary: { en: 'Get Early Access', es: 'Acceso Anticipado' },
    ctaSecondary: { en: 'See How It Works', es: 'Ver Cómo Funciona' },
    gaugeLabel: { en: 'Wellaryn Score', es: 'Wellaryn Score' },
    gaugeStatus: { en: '● Ready to train', es: '● Listo para entrenar' },
  },

  // ===================== PROBLEM =====================
  problem: {
    tag: { en: 'The Problem', es: 'El Problema' },
    title: {
      en: "Your data already exists.\nWhat's missing is the decision.",
      es: 'Tus datos ya existen.\nLo que falta es la decisión.',
    },
    subtitle: {
      en: 'Athletes collect data across dozens of apps and devices — but none of them talk to each other.',
      es: 'Los atletas recolectan datos en docenas de apps y dispositivos — pero ninguno se comunica entre sí.',
    },
    fragments: {
      en: [
        { icon: '⌚', name: 'Smartwatch', status: 'Isolated' },
        { icon: '❤️', name: 'Heart Rate', status: 'Fragmented' },
        { icon: '😴', name: 'Sleep App', status: 'Siloed' },
        { icon: '🥗', name: 'Nutrition App', status: 'Disconnected' },
        { icon: '🏋️', name: 'Training App', status: 'Incomplete' },
      ],
      es: [
        { icon: '⌚', name: 'Smartwatch', status: 'Aislado' },
        { icon: '❤️', name: 'Frecuencia', status: 'Fragmentado' },
        { icon: '😴', name: 'App de Sueño', status: 'En silo' },
        { icon: '🥗', name: 'App Nutrición', status: 'Desconectado' },
        { icon: '🏋️', name: 'App Entreno', status: 'Incompleto' },
      ],
    },
    solution: {
      en: 'One unified AI that connects everything, analyzes your readiness in real time, and tells you exactly what to do next.',
      es: 'Una IA unificada que conecta todo, analiza tu preparación en tiempo real y te dice exactamente qué hacer.',
    },
  },

  // ===================== HOW IT WORKS =====================
  howItWorks: {
    tag: { en: 'How It Works', es: 'Cómo Funciona' },
    title: { en: 'Three steps to smarter training', es: 'Tres pasos para entrenar más inteligente' },
    subtitle: {
      en: 'From data chaos to clarity — in under a minute.',
      es: 'Del caos de datos a la claridad — en menos de un minuto.',
    },
    steps: {
      en: [
        { num: '1', icon: '🔗', title: 'Connect', desc: 'Link your wearables, apps, and health data. Apple Watch, Garmin, Whoop, Oura — we integrate them all.' },
        { num: '2', icon: '🧠', title: 'Analyze', desc: 'Our AI engine fuses HRV, sleep, training load, and 40+ biomarkers into a single readiness score.' },
        { num: '3', icon: '🚀', title: 'Perform', desc: 'Get personalized recommendations: when to push hard, when to recover, and when to stop.' },
      ],
      es: [
        { num: '1', icon: '🔗', title: 'Conecta', desc: 'Vincula tus wearables, apps y datos de salud. Apple Watch, Garmin, Whoop, Oura — los integramos todos.' },
        { num: '2', icon: '🧠', title: 'Analiza', desc: 'Nuestro motor de IA fusiona HRV, sueño, carga de entrenamiento y 40+ biomarcadores en un solo score.' },
        { num: '3', icon: '🚀', title: 'Rinde', desc: 'Recibe recomendaciones personalizadas: cuándo dar todo, cuándo recuperar y cuándo parar.' },
      ],
    },
  },

  // ===================== READINESS DEMO =====================
  demo: {
    tag: { en: 'Live Preview', es: 'Vista Previa' },
    title: { en: 'Your daily readiness, decoded', es: 'Tu preparación diaria, decodificada' },
    subtitle: {
      en: "A real-time snapshot of your body's readiness to perform — backed by science.",
      es: 'Una foto en tiempo real de la preparación de tu cuerpo — respaldada por ciencia.',
    },
    dailyReadiness: { en: 'Wellaryn Score', es: 'Wellaryn Score' },
    live: { en: 'Live', es: 'En Vivo' },
    moderateRisk: { en: '⚠️ Moderate Risk', es: '⚠️ Riesgo Moderado' },
    riskLabel: { en: '⚠️ Elevated Overload Risk', es: '⚠️ Riesgo Elevado de Sobrecarga' },
    riskFactor: { en: 'Training load is 25% above your average', es: 'Tu carga está 25% sobre tu promedio' },
    recommendations: { en: 'Recommendations', es: 'Recomendaciones' },
    recs: {
      en: [
        "Replace today's HIIT session with Zone 2 cardio (30 min max)",
        'Prioritize 8+ hours of sleep tonight — HRV trend is declining',
        'Add 15 min mobility work targeting hip flexors and ankles',
      ],
      es: [
        'Reemplaza la sesión HIIT de hoy con cardio Zona 2 (30 min máx)',
        'Prioriza 8+ horas de sueño esta noche — la tendencia de HRV baja',
        'Agrega 15 min de movilidad enfocada en flexores de cadera y tobillos',
      ],
    },
    hrvLabel: { en: 'HRV', es: 'VFC' },
    sleepLabel: { en: 'Sleep', es: 'Sueño' },
    trainingLabel: { en: 'Training Load', es: 'Carga Entreno' },
  },

  // ===================== SPORTS =====================
  sports: {
    tag: { en: 'Sports', es: 'Deportes' },
    title: { en: 'Built for every athlete', es: 'Diseñado para cada atleta' },
    subtitle: {
      en: 'Sport-specific injury models, tailored to the demands of your discipline.',
      es: 'Modelos de lesión específicos por deporte, adaptados a las demandas de tu disciplina.',
    },
    list: {
      en: [
        { emoji: '🏃', name: 'Running' },
        { emoji: '🏋️', name: 'CrossFit' },
        { emoji: '🎾', name: 'Tennis' },
        { emoji: '🏸', name: 'Padel' },
        { emoji: '⚽', name: 'Soccer' },
        { emoji: '🏀', name: 'Basketball' },
        { emoji: '🏊', name: 'Swimming' },
        { emoji: '🚴', name: 'Cycling' },
      ],
      es: [
        { emoji: '🏃', name: 'Running' },
        { emoji: '🏋️', name: 'CrossFit' },
        { emoji: '🎾', name: 'Tenis' },
        { emoji: '🏸', name: 'Pádel' },
        { emoji: '⚽', name: 'Fútbol' },
        { emoji: '🏀', name: 'Basketball' },
        { emoji: '🏊', name: 'Natación' },
        { emoji: '🚴', name: 'Ciclismo' },
      ],
    },
  },

  // ===================== PROFILES =====================
  profiles: {
    tag: { en: 'Profiles', es: 'Perfiles' },
    title: { en: 'One platform. Three perspectives.', es: 'Una plataforma. Tres perspectivas.' },
    subtitle: {
      en: "Whether you're training, coaching, or treating — Wellaryn adapts to you.",
      es: 'Ya sea que entrenes, dirijas o trates — Wellaryn se adapta a ti.',
    },
    cards: {
      en: [
        {
          icon: '🏃‍♂️', title: 'Athlete',
          desc: 'See your readiness score, get daily recommendations, and understand your injury risk — all in one place.',
          features: ['Daily readiness score', 'Personalized recovery plans', 'Training load optimization', 'Injury risk alerts'],
        },
        {
          icon: '📋', title: 'Coach',
          desc: `Monitor your entire roster at a glance. Know who's ready to push and who needs rest — before practice starts.`,
          features: ['Team readiness dashboard', 'Player comparison tools', 'Load management alerts', 'Season periodization AI'],
        },
        {
          icon: '🩺', title: 'Doctor',
          desc: 'Access biomarker trends and return-to-play insights for clinical review — informational support that the physician interprets.',
          features: ['Biomarker trend reports', 'Return-to-play insights for clinical review', 'Rehabilitation progress tracking', 'Risk factor analysis to support clinical judgment'],
        },
      ],
      es: [
        {
          icon: '🏃‍♂️', title: 'Atleta',
          desc: 'Ve tu score de preparación, recibe recomendaciones diarias y entiende tu riesgo de lesión — todo en un solo lugar.',
          features: ['Score de preparación diario', 'Planes de recuperación personalizados', 'Optimización de carga', 'Alertas de riesgo de lesión'],
        },
        {
          icon: '📋', title: 'Coach',
          desc: 'Monitorea a todo tu equipo de un vistazo. Sabe quién está listo para exigirse y quién necesita descanso — antes de que empiece el entrenamiento.',
          features: ['Dashboard de equipo', 'Herramientas de comparación', 'Alertas de carga', 'Periodización con IA'],
        },
        {
          icon: '🩺', title: 'Médico',
          desc: 'Accede a tendencias de biomarcadores e información de regreso al deporte para revisión clínica — soporte informativo que el médico interpreta.',
          features: ['Informes de tendencias de biomarcadores', 'Información de regreso al deporte para revisión clínica', 'Seguimiento del progreso de rehabilitación', 'Análisis de factores de riesgo como apoyo al juicio clínico'],
        },
      ],
    },
  },

  // ===================== STATS =====================
  stats: {
    items: {
      en: [
        { number: '1.7×', desc: 'higher injury risk with <8h sleep', source: 'Milewski 2014, J Pediatr Orthop' },
        { number: '2-4×', desc: 'injury risk from training load spikes', source: 'Gabbett 2016, Br J Sports Med' },
        { number: '< 15%', desc: 'of athletes use data-driven prevention tools — the rest rely on gut feeling', source: '' },
      ],
      es: [
        { number: '1.7×', desc: 'mayor riesgo de lesión con <8h de sueño', source: 'Milewski 2014, J Pediatr Orthop' },
        { number: '2-4×', desc: 'riesgo de lesión por picos de carga', source: 'Gabbett 2016, Br J Sports Med' },
        { number: '< 15%', desc: 'de los atletas usan herramientas de prevención basadas en datos — el resto confía en la intuición', source: '' },
      ],
    },
  },

  // ===================== FINAL CTA =====================
  finalCta: {
    titleLine1: { en: 'Your next injury', es: 'Tu próxima lesión' },
    titleLine2: { en: 'already has a date.', es: 'ya tiene fecha.' },
    titleLine3: { en: 'Change it.', es: 'Cámbiala.' },
    subtitle: {
      en: 'Join the waitlist and be the first to experience AI-powered injury prevention.',
      es: 'Únete a la lista de espera y sé el primero en experimentar la prevención de lesiones con IA.',
    },
    emailPlaceholder: { en: 'Enter your email', es: 'Ingresa tu email' },
    joinWaitlist: { en: 'Join Waitlist', es: 'Unirme' },
    success: {
      en: "✅ You're on the list! We'll be in touch soon.",
      es: '✅ ¡Estás en la lista! Te contactaremos pronto.',
    },
    privacy: {
      en: 'No spam, ever. We respect your privacy.',
      es: 'Sin spam, nunca. Respetamos tu privacidad.',
    },
  },

  // ===================== FOOTER =====================
  footer: {
    rights: { en: 'All rights reserved.', es: 'Todos los derechos reservados.' },
    privacy: { en: 'Privacy', es: 'Privacidad' },
    terms: { en: 'Terms', es: 'Términos' },
    contact: { en: 'Contact', es: 'Contacto' },
    disclaimer: {
      en: 'Wellaryn is a wellness and performance tool. It does not diagnose, treat, or prevent diseases. It does not replace professional medical advice.',
      es: 'Wellaryn es una herramienta de bienestar y rendimiento. No diagnostica, trata ni previene enfermedades. No sustituye el consejo médico profesional.',
    },
  },

  // ===================== DASHBOARD =====================
  dashboard: {
    nav: {
      overview: { en: 'Overview', es: 'Resumen' },
      readiness: { en: 'Wellaryn Score', es: 'Wellaryn Score' },
      training: { en: 'Training', es: 'Entrenamiento' },
      history: { en: 'History', es: 'Historial' },
      reports: { en: 'Reports', es: 'Reportes' },
      profile: { en: 'Profile', es: 'Perfil' },
      team: { en: 'My Team', es: 'Mi Equipo' },
    },
    reports: {
      title: { en: 'Weekly Reports', es: 'Reportes Semanales' },
      subtitle: { en: 'Your performance summaries', es: 'Resúmenes de rendimiento' },
      week: { en: 'Week', es: 'Semana' },
      weekOf: { en: 'Week of', es: 'Semana del' },
      avgScore: { en: 'Avg Score', es: 'Score Promedio' },
      trend: { en: 'Trend', es: 'Tendencia' },
      bestDay: { en: 'Best Day', es: 'Mejor Día' },
      worstDay: { en: 'Worst Day', es: 'Peor Día' },
      trainingDays: { en: 'Training Days', es: 'Días de Entrenamiento' },
      selectAthlete: { en: 'Select Athlete', es: 'Seleccionar Atleta' },
      noData: { en: 'No reports available yet.', es: 'Aún no hay reportes disponibles.' },
      weeklyEmail: { en: 'Weekly reports are sent every Monday', es: 'Los reportes semanales se envían cada lunes' },
    },
    history: {
      title: { en: 'Performance History', es: 'Historial de Rendimiento' },
      subtitle: { en: 'Track your progress over time', es: 'Sigue tu progreso a lo largo del tiempo' },
      '7d': { en: '7D', es: '7D' },
      '30d': { en: '30D', es: '30D' },
      '90d': { en: '90D', es: '90D' },
      '6m': { en: '6M', es: '6M' },
      '1y': { en: '1Y', es: '1A' },
      avgScore: { en: 'Avg Score', es: 'Score Promedio' },
      avgHRV: { en: 'Avg HRV', es: 'HRV Promedio' },
      avgRHR: { en: 'Avg RHR', es: 'RHR Promedio' },
      avgSleep: { en: 'Avg Sleep', es: 'Sueño Promedio' },
      trainingDays: { en: 'Training Days', es: 'Días de Entrenamiento' },
      bestScore: { en: 'Best Score', es: 'Mejor Score' },
      worstScore: { en: 'Lowest Score', es: 'Score Más Bajo' },
      scoreTimeline: { en: 'Wellaryn Score', es: 'Score Wellaryn' },
      hrvTrend: { en: 'HRV Trend', es: 'Tendencia HRV' },
      rhrTrend: { en: 'Resting Heart Rate', es: 'Frecuencia Cardíaca en Reposo' },
      sleepAnalysis: { en: 'Sleep Analysis', es: 'Análisis de Sueño' },
      trainingLoad: { en: 'Training Load', es: 'Carga de Entrenamiento' },
      stressRecovery: { en: 'Stress & Recovery', es: 'Estrés y Recuperación' },
      movingAvg: { en: '7-day avg', es: 'Promedio 7 días' },
      baseline: { en: 'Baseline', es: 'Línea base' },
      target: { en: 'Target', es: 'Objetivo' },
      improving: { en: 'Improving', es: 'Mejorando' },
      declining: { en: 'Declining', es: 'Declinando' },
      stable: { en: 'Stable', es: 'Estable' },
      noData: { en: 'No historical data available yet. Start logging your daily metrics!', es: '¡Aún no hay datos históricos disponibles. Empieza a registrar tus métricas diarias!' },
      vsPrevious: { en: 'vs previous period', es: 'vs período anterior' },
      acwr: { en: 'ACWR', es: 'ACWR' },
      dangerZone: { en: 'Danger Zone', es: 'Zona de Peligro' },
      sleepTarget: { en: 'Sleep Target', es: 'Objetivo de Sueño' },
    },
    greeting: {
      morning: { en: 'Good morning', es: 'Buenos días' },
      afternoon: { en: 'Good afternoon', es: 'Buenas tardes' },
      evening: { en: 'Good evening', es: 'Buenas noches' },
    },
    widgets: {
      readinessScore: { en: 'Wellaryn Score', es: 'Wellaryn Score' },
      injuryRisk: { en: 'Injury Risk', es: 'Riesgo de Lesión' },
      recommendations: { en: 'Recommendations', es: 'Recomendaciones' },
      hrvTrend: { en: 'HRV Trend (7 days)', es: 'Tendencia VFC (7 días)' },
      sleepAnalysis: { en: 'Sleep Analysis', es: 'Análisis de Sueño' },
      trainingLoad: { en: 'Training Load', es: 'Carga de Entrenamiento' },
    },
    metrics: {
      rhr: { en: 'Resting HR', es: 'FC Reposo' },
      steps: { en: 'Steps', es: 'Pasos' },
      calories: { en: 'Calories', es: 'Calorías' },
      stress: { en: 'Stress', es: 'Estrés' },
      bpm: { en: 'bpm', es: 'lpm' },
      kcal: { en: 'kcal', es: 'kcal' },
    },
    zones: {
      recovered: { en: 'Recovered', es: 'Recuperado' },
      moderate: { en: 'Moderate', es: 'Moderado' },
      strained: { en: 'Strained', es: 'Agotado' },
    },
    sleepPhases: {
      deep: { en: 'Deep', es: 'Profundo' },
      rem: { en: 'REM', es: 'REM' },
      light: { en: 'Light', es: 'Ligero' },
    },
    chronicAvg: { en: 'Chronic Avg', es: 'Promedio Crónico' },
    loading: { en: 'Loading...', es: 'Cargando...' },
    confidence: {
      calibrating: { en: 'Calibrating — limited precision', es: 'Calibrando — precisión limitada' },
      low: { en: 'Low confidence — missing data', es: 'Baja confianza — faltan datos' },
    },
    risk: {
      factor_prefix: { en: 'Why:', es: 'Por qué:' },
      acwr_label: { en: 'ACWR', es: 'ACWR' },
    },
    disclaimer: {
      en: 'Wellaryn provides wellness and fitness insights, not medical advice. Consult a healthcare professional before making changes to your training program.',
      es: 'Wellaryn ofrece información de bienestar y rendimiento, no consejo médico. Consulta a un profesional de salud antes de modificar tu programa de entrenamiento.',
    },
    bands: {
      ready: { en: 'Ready', es: 'Listo' },
      moderate: { en: 'Moderate', es: 'Moderado' },
      low: { en: 'Low', es: 'Bajo' },
      risk: { en: 'Rest', es: 'Descanso' },
    },
    team: {
      title: { en: 'Team Overview', es: 'Vista del Equipo' },
      subtitle: { en: 'Monitor all your athletes in one place', es: 'Monitorea a todos tus atletas en un solo lugar' },
      invite: { en: 'Invite Athlete', es: 'Invitar Atleta' },
      noAthletes: { en: 'No athletes connected yet', es: 'Sin atletas conectados aún' },
      noAthletesDesc: { en: 'Invite athletes using a unique code to start monitoring their performance.', es: 'Invita atletas usando un código único para empezar a monitorear su rendimiento.' },
      pending: { en: 'Pending', es: 'Pendiente' },
      accepted: { en: 'Connected', es: 'Conectado' },
      rejected: { en: 'Rejected', es: 'Rechazado' },
      lastCheckin: { en: 'Last check-in', es: 'Último registro' },
      viewDetail: { en: 'View Detail', es: 'Ver Detalle' },
      removeAthlete: { en: 'Remove', es: 'Eliminar' },
      filterAll: { en: 'All', es: 'Todos' },
      filterAlert: { en: 'Alerts', es: 'Alertas' },
      sortScore: { en: 'By Score', es: 'Por Score' },
      sortName: { en: 'By Name', es: 'Por Nombre' },
      sortRecent: { en: 'Most Recent', es: 'Más Reciente' },
      athleteDetail: { en: 'Athlete Detail', es: 'Detalle del Atleta' },
      backToTeam: { en: '← Back to Team', es: '← Volver al Equipo' },
      readOnly: { en: 'Read-only view', es: 'Vista de solo lectura' },
      inviteTitle: { en: 'Invite Athlete', es: 'Invitar Atleta' },
      inviteDesc: { en: 'Share this code with your athlete. They can enter it in their profile to connect with you.', es: 'Comparte este código con tu atleta. Pueden ingresarlo en su perfil para conectarse contigo.' },
      inviteCode: { en: 'Invite Code', es: 'Código de Invitación' },
      copyCode: { en: 'Copy Code', es: 'Copiar Código' },
      copied: { en: 'Copied!', es: '¡Copiado!' },
      generateNew: { en: 'Generate New Code', es: 'Generar Nuevo Código' },
      pendingInvites: { en: 'Pending Invites', es: 'Invitaciones Pendientes' },
      noPending: { en: 'No pending invitations', es: 'Sin invitaciones pendientes' },
      alerts: {
        lowScore: { en: 'Low Wellaryn Score', es: 'Score Wellaryn Bajo' },
        highACWR: { en: 'High Training Load', es: 'Carga de Entrenamiento Alta' },
        highInjuryRisk: { en: 'Injury Risk Elevated', es: 'Riesgo de Lesión Elevado' },
        noData: { en: 'No recent data', es: 'Sin datos recientes' },
      },
      doctorNotes: { en: 'Clinical Notes', es: 'Notas Clínicas' },
      returnToPlay: { en: 'Return to Play', es: 'Retorno al Juego' },
    },
  },

  // ===================== INVITE =====================
  invite: {
    title: { en: 'Team Invitation', es: 'Invitación al Equipo' },
    from: { en: 'has invited you to connect on Wellaryn', es: 'te ha invitado a conectarte en Wellaryn' },
    accept: { en: 'Accept Invitation', es: 'Aceptar Invitación' },
    reject: { en: 'Decline', es: 'Rechazar' },
    expired: { en: 'This invitation has expired or is no longer valid.', es: 'Esta invitación ha expirado o ya no es válida.' },
    accepted: { en: 'Invitation accepted! Your data is now shared with your coach/doctor.', es: '¡Invitación aceptada! Tus datos ahora se comparten con tu coach/doctor.' },
    loginRequired: { en: 'Please sign in to accept this invitation.', es: 'Inicia sesión para aceptar esta invitación.' },
  },

  // ===================== LANGUAGE TOGGLE =====================
  langToggle: {
    en: 'ES',  // Shows "ES" when in English (to switch to Spanish)
    es: 'EN',  // Shows "EN" when in Spanish (to switch to English)
  },
};

/**
 * Get a translation by dot-notation key
 * @param {string} key - Dot-notation key (e.g., 'hero.titleLine1')
 * @param {string} lang - Language code ('en' or 'es')
 * @returns {*} The translated value
 */
export function t(key, lang = 'en') {
  const keys = key.split('.');
  let value = translations;

  for (const k of keys) {
    if (value === undefined) return key;
    value = value[k];
  }

  if (value === undefined) return key;

  // If the value is an object with en/es keys, return the right language
  if (value && typeof value === 'object' && (value.en !== undefined || value.es !== undefined)) {
    return value[lang] || value.en || key;
  }

  return value;
}

/**
 * Get the full translations object for a section
 */
export function getSection(section, lang = 'en') {
  const data = translations[section];
  if (!data) return {};

  // Deep resolve language keys
  function resolve(obj) {
    if (obj === null || obj === undefined) return obj;
    if (typeof obj !== 'object') return obj;
    if (obj.en !== undefined || obj.es !== undefined) return obj[lang] || obj.en;
    if (Array.isArray(obj)) return obj.map(resolve);

    const result = {};
    for (const [k, v] of Object.entries(obj)) {
      result[k] = resolve(v);
    }
    return result;
  }

  return resolve(data);
}

export default translations;
