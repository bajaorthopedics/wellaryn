'use client';

import { useLanguage } from '@/contexts/LanguageContext';
import styles from '../terms/page.module.css';
import Link from 'next/link';

const content = {
  en: {
    title: 'Privacy Policy',
    lastUpdated: 'Last updated: June 1, 2026',
    backLink: '← Back to home',
    sections: [
      {
        title: '1. Data Controller',
        body: `**Wellaryn Technologies** ("Wellaryn", "we", "us") is the data controller responsible for processing your personal data.\n\n**Contact for privacy inquiries:**\nEmail: privacy@wellaryn.com\nWebsite: https://wellaryn.com`,
      },
      {
        title: '2. What Data We Collect',
        body: `We collect the following categories of data:\n\n**Account Data:**\n- Name, email address, password (hashed)\n- Sport, role (athlete/coach/doctor)\n- Age, weight, height (optional, for algorithm calibration)\n- Sleep need preference\n\n**Biometric and Health Data (sensitive personal data):**\n- Heart Rate Variability (HRV/rMSSD) — from connected wearable\n- Resting Heart Rate (RHR) — from connected wearable\n- Sleep data: total duration, sleep stages (deep, REM, light), sleep efficiency — from connected wearable\n- Training load: session RPE (1-10) × duration — user-reported\n- Steps and calories — from connected wearable\n- Subjective stress and mood — user-reported (optional)\n\n**Derived Data (calculated by Wellaryn):**\n- Wellaryn Score (0-100)\n- ACWR (Acute:Chronic Workload Ratio)\n- Personal baselines (rolling averages of HRV, RHR, sleep)\n- Qualitative risk levels\n- Personalized recommendations\n\n**Technical Data:**\n- Device type, operating system, browser\n- IP address (anonymized after 30 days)\n- Usage analytics (pages visited, features used)`,
      },
      {
        title: '3. Why We Collect This Data (Purpose)',
        body: `Your data is processed exclusively for the following purposes:\n\n- **Primary:** To calculate your Wellaryn Score, generate personalized training recommendations, and track your wellness trends over time\n- **Calibration:** To establish your personal baselines (HRV, RHR, sleep) against which daily variations are measured — your data is NEVER compared against other users\n- **Product improvement:** To improve the accuracy of our algorithms based on aggregated, anonymized usage patterns\n- **Communication:** To send you account-related notifications and, with your separate consent, product updates\n- **Legal compliance:** To fulfill our obligations under applicable data protection laws\n\n**We do NOT:**\n- Sell your personal data to third parties — ever\n- Use your health data for advertising or marketing profiling\n- Share identifiable health data with insurers, employers, or any third party without your explicit consent\n- Use your data for purposes other than those stated above`,
      },
      {
        title: '4. Legal Basis for Processing',
        body: `**Under Mexican law (LFPDPPP):** Biometric and health data are classified as **sensitive personal data (datos personales sensibles)**. We process this data based on your **express written consent**, which you provide during the onboarding flow before any health data is collected.\n\n**Under GDPR (if applicable):** Health data is "special category data" under Article 9. We process it based on your explicit consent (Article 9(2)(a)).\n\nYou may withdraw your consent at any time (see Section 8 — Your Rights).`,
      },
      {
        title: '5. How We Store and Protect Your Data',
        body: `**Encryption:**\n- All data is encrypted in transit using TLS 1.3\n- All data is encrypted at rest using AES-256\n- Passwords are hashed using bcrypt with salt\n\n**Access control:**\n- Health data is isolated per user using row-level security policies\n- Only authorized personnel with a legitimate need can access user data\n- All access is logged and auditable\n\n**Infrastructure:**\n- Data is stored on secure, SOC 2 compliant cloud infrastructure\n- Regular automated backups with encryption\n- No health data is ever transmitted via URL parameters\n\n**Data minimization:**\n- We only collect data strictly necessary for the Service's functionality\n- Raw wearable data is processed into daily summaries; raw sensor streams are not stored permanently`,
      },
      {
        title: '6. Data Retention',
        body: `- **Active accounts:** Your data is retained for as long as your account is active\n- **Account deletion:** Upon account deletion, all personal and health data is permanently deleted within 30 days, except where retention is required by law\n- **Anonymized data:** Aggregated, anonymized data (which cannot identify you) may be retained indefinitely for research and product improvement\n- **Beta program data:** If you participated in the beta, anonymized research data may be retained per the informed consent you signed\n- **Backups:** Encrypted backups containing your data are automatically purged within 90 days of account deletion`,
      },
      {
        title: '7. Third-Party Services',
        body: `We integrate with the following third-party services:\n\n**Wearable Providers (when you connect a device):**\n- Oura Ring (Oura Health Oy) — to receive HRV, sleep, and activity data\n- WHOOP (WHOOP, Inc.) — to receive recovery, strain, and sleep data\n- Apple HealthKit — on-device only, data read locally on your iPhone\n\nThese integrations use OAuth 2.0, meaning we never see or store your wearable account password. You can disconnect any device at any time.\n\n**Infrastructure Providers:**\n- Cloud hosting: data processed and stored securely\n- Authentication: secure sign-in services\n\nWe require all third-party processors to maintain appropriate security measures and to process your data only on our instructions.`,
      },
      {
        title: '8. Your Rights (Derechos ARCO)',
        body: `Under the **Ley Federal de Protección de Datos Personales en Posesión de los Particulares (LFPDPPP)** of Mexico, you have the following rights:\n\n**A — Acceso (Access):**\nYou have the right to know what personal data we hold about you, how it was obtained, and for what purpose it is used. You may request a copy of your data at any time.\n\n**R — Rectificación (Rectification):**\nYou have the right to request correction of your personal data if it is inaccurate or incomplete.\n\n**C — Cancelación (Cancellation/Deletion):**\nYou have the right to request the deletion of your personal data when:\n- It is no longer necessary for the purposes for which it was collected\n- You withdraw your consent\n- You believe it has been processed unlawfully\n\n**O — Oposición (Opposition):**\nYou have the right to oppose the processing of your personal data for specific purposes, such as marketing communications.\n\n**How to exercise your ARCO rights:**\n1. Send an email to **privacy@wellaryn.com** with the subject line "ARCO Request"\n2. Include: your full name, email associated with your account, which right(s) you wish to exercise, and a description of your request\n3. Attach a copy of an official ID for identity verification\n4. We will respond within **20 business days** of receiving your complete request\n5. If your request is granted, changes will take effect within **15 business days**\n\n**Additional rights:**\n- **Withdraw consent:** You may withdraw your consent for health data processing at any time via account settings or by contacting us. This will limit certain features that depend on biometric data.\n- **Data portability:** You may request an export of your data in a machine-readable format (JSON/CSV)\n- **Complaint:** If you believe your data protection rights have been violated, you may file a complaint with the Secretaría Anticorrupción y Buen Gobierno (formerly INAI), the authority currently responsible for data protection oversight in Mexico.`,
      },
      {
        title: '9. Consent for Health Data',
        body: `Before we collect any biometric or health data, you will be asked to provide **express consent** through a dedicated consent screen during onboarding. This consent is:\n\n- **Specific:** Separate from the general Terms of Service\n- **Informed:** We explain exactly what data we collect and why\n- **Freely given:** You may use limited features of Wellaryn without connecting health data\n- **Withdrawable:** You may revoke consent at any time via account settings\n- **Documented:** We maintain a record of when and how you consented\n\nFor beta program participants, an additional informed consent form is presented that covers the use of your anonymized data for product validation research.`,
      },
      {
        title: '10. International Data Transfers',
        body: `Your data may be processed on servers located outside of Mexico. In such cases, we ensure that:\n- Appropriate safeguards are in place (standard contractual clauses or equivalent mechanisms)\n- The receiving country provides an adequate level of data protection\n- Transfers comply with Chapter V of the LFPDPPP and, where applicable, Chapter V of the GDPR`,
      },
      {
        title: '11. Children',
        body: `Wellaryn is not intended for use by individuals under 16 years of age. We do not knowingly collect personal data from children. If we become aware that we have collected data from a child under 16, we will delete it promptly. If you are a parent or guardian and believe your child has provided us with personal data, please contact us at privacy@wellaryn.com.`,
      },
      {
        title: '12. Cookies and Analytics',
        body: `We use essential cookies for authentication and session management. We may use anonymized analytics to understand how the Service is used. We do not use tracking cookies for advertising. You may control cookie preferences through your browser settings.`,
      },
      {
        title: '13. Changes to This Policy',
        body: `We may update this Privacy Policy periodically. Material changes will be communicated via email and/or in-app notification at least 15 days before taking effect. The "Last updated" date at the top of this page indicates the most recent revision. Continued use of the Service after changes take effect constitutes acceptance.`,
      },
      {
        title: '14. Contact',
        body: `For questions, ARCO requests, or data protection inquiries:\n\n**Privacy Officer**\nEmail: privacy@wellaryn.com\nWebsite: https://wellaryn.com\n\n**Regulatory Authority (Mexico):**\nSecretaría Anticorrupción y Buen Gobierno\n(Authority currently responsible for personal data protection oversight)`,
      },
    ],
  },
  es: {
    title: 'Aviso de Privacidad',
    lastUpdated: 'Última actualización: 1 de junio de 2026',
    backLink: '← Volver al inicio',
    sections: [
      {
        title: '1. Responsable del Tratamiento',
        body: `**Wellaryn Technologies** ("Wellaryn", "nosotros") es el responsable del tratamiento de tus datos personales, conforme a la Ley Federal de Protección de Datos Personales en Posesión de los Particulares (LFPDPPP).\n\n**Contacto para consultas de privacidad:**\nEmail: privacy@wellaryn.com\nSitio web: https://wellaryn.com`,
      },
      {
        title: '2. Datos que Recopilamos',
        body: `Recopilamos las siguientes categorías de datos:\n\n**Datos de Cuenta:**\n- Nombre, correo electrónico, contraseña (encriptada)\n- Deporte, rol (atleta/entrenador/médico)\n- Edad, peso, estatura (opcionales, para calibración del algoritmo)\n- Necesidad de sueño configurada\n\n**Datos Biométricos y de Salud (datos personales sensibles):**\n- Variabilidad de Frecuencia Cardíaca (VFC/rMSSD) — de wearable conectado\n- Frecuencia Cardíaca en Reposo (FCR) — de wearable conectado\n- Datos de sueño: duración total, fases (profundo, REM, ligero), eficiencia — de wearable conectado\n- Carga de entrenamiento: RPE de sesión (1-10) × duración — reportado por el usuario\n- Pasos y calorías — de wearable conectado\n- Estrés subjetivo y estado de ánimo — reportado por el usuario (opcional)\n\n**Datos Derivados (calculados por Wellaryn):**\n- Wellaryn Score (0-100)\n- ACWR (Ratio Agudo:Crónico de Carga)\n- Baselines personales (promedios móviles de VFC, FCR, sueño)\n- Niveles cualitativos de riesgo\n- Recomendaciones personalizadas\n\n**Datos Técnicos:**\n- Tipo de dispositivo, sistema operativo, navegador\n- Dirección IP (anonimizada después de 30 días)\n- Analítica de uso (páginas visitadas, funciones utilizadas)`,
      },
      {
        title: '3. Finalidades del Tratamiento',
        body: `Tus datos se procesan exclusivamente para las siguientes finalidades:\n\n- **Principal:** Calcular tu Wellaryn Score, generar recomendaciones personalizadas de entrenamiento y dar seguimiento a tus tendencias de bienestar\n- **Calibración:** Establecer tus baselines personales (VFC, FCR, sueño) contra los cuales se miden las variaciones diarias — tus datos NUNCA se comparan contra otros usuarios\n- **Mejora del producto:** Mejorar la precisión de nuestros algoritmos basándonos en patrones de uso agregados y anonimizados\n- **Comunicación:** Enviarte notificaciones relacionadas con tu cuenta y, con tu consentimiento separado, actualizaciones del producto\n- **Cumplimiento legal:** Cumplir con nuestras obligaciones bajo las leyes de protección de datos aplicables\n\n**NO hacemos lo siguiente:**\n- Vender tus datos personales a terceros — jamás\n- Usar tus datos de salud para publicidad o perfilamiento comercial\n- Compartir datos de salud identificables con aseguradoras, empleadores o terceros sin tu consentimiento explícito\n- Usar tus datos para finalidades distintas a las establecidas`,
      },
      {
        title: '4. Fundamento Legal',
        body: `**Bajo la ley mexicana (LFPDPPP):** Los datos biométricos y de salud se clasifican como **datos personales sensibles**. Tratamos estos datos con base en tu **consentimiento expreso y por escrito**, el cual otorgas durante el flujo de incorporación antes de que se recopile cualquier dato de salud.\n\nPuedes revocar tu consentimiento en cualquier momento (ver Sección 8 — Tus Derechos).`,
      },
      {
        title: '5. Almacenamiento y Seguridad',
        body: `**Cifrado:**\n- Todos los datos se cifran en tránsito mediante TLS 1.3\n- Todos los datos se cifran en reposo mediante AES-256\n- Las contraseñas se hashean con bcrypt y salt\n\n**Control de acceso:**\n- Los datos de salud se aíslan por usuario mediante políticas de seguridad a nivel de fila (Row-Level Security)\n- Solo personal autorizado con necesidad legítima puede acceder a datos de usuarios\n- Todo acceso se registra y es auditable\n\n**Infraestructura:**\n- Los datos se almacenan en infraestructura cloud segura con certificación SOC 2\n- Respaldos automáticos regulares con cifrado\n- Nunca se transmiten datos de salud en parámetros de URL\n\n**Minimización de datos:**\n- Solo recopilamos datos estrictamente necesarios para la funcionalidad del Servicio\n- Los datos crudos de wearables se procesan en resúmenes diarios; los flujos de sensores crudos no se almacenan permanentemente`,
      },
      {
        title: '6. Retención de Datos',
        body: `- **Cuentas activas:** Tus datos se conservan mientras tu cuenta esté activa\n- **Eliminación de cuenta:** Al eliminar tu cuenta, todos los datos personales y de salud se eliminan permanentemente en un plazo de 30 días, salvo que la ley requiera su conservación\n- **Datos anonimizados:** Los datos agregados y anonimizados (que no pueden identificarte) pueden conservarse indefinidamente para investigación y mejora del producto\n- **Datos del programa beta:** Si participaste en la beta, los datos anonimizados de investigación pueden conservarse según el consentimiento informado que firmaste\n- **Respaldos:** Los respaldos cifrados que contienen tus datos se purgan automáticamente dentro de los 90 días posteriores a la eliminación de la cuenta`,
      },
      {
        title: '7. Servicios de Terceros',
        body: `Nos integramos con los siguientes servicios de terceros:\n\n**Proveedores de Wearables (cuando conectas un dispositivo):**\n- Oura Ring (Oura Health Oy) — para recibir datos de VFC, sueño y actividad\n- WHOOP (WHOOP, Inc.) — para recibir datos de recuperación, esfuerzo y sueño\n- Apple HealthKit — solo en el dispositivo, datos leídos localmente en tu iPhone\n\nEstas integraciones usan OAuth 2.0, lo que significa que nunca vemos ni almacenamos la contraseña de tu cuenta del wearable. Puedes desconectar cualquier dispositivo en cualquier momento.\n\n**Proveedores de Infraestructura:**\n- Hosting en la nube: datos procesados y almacenados de forma segura\n- Autenticación: servicios seguros de inicio de sesión\n\nExigimos a todos los procesadores externos que mantengan medidas de seguridad apropiadas y que procesen tus datos solo bajo nuestras instrucciones.`,
      },
      {
        title: '8. Tus Derechos (Derechos ARCO)',
        body: `Conforme a la **Ley Federal de Protección de Datos Personales en Posesión de los Particulares (LFPDPPP)**, tienes los siguientes derechos:\n\n**A — Acceso:**\nTienes derecho a conocer qué datos personales tenemos sobre ti, cómo fueron obtenidos y con qué finalidad se utilizan. Puedes solicitar una copia de tus datos en cualquier momento.\n\n**R — Rectificación:**\nTienes derecho a solicitar la corrección de tus datos personales si son inexactos o están incompletos.\n\n**C — Cancelación:**\nTienes derecho a solicitar la eliminación de tus datos personales cuando:\n- Ya no sean necesarios para las finalidades para las que fueron recabados\n- Revoques tu consentimiento\n- Consideres que han sido tratados de manera ilícita\n\n**O — Oposición:**\nTienes derecho a oponerte al tratamiento de tus datos personales para finalidades específicas, como comunicaciones de marketing.\n\n**Cómo ejercer tus derechos ARCO:**\n1. Envía un correo electrónico a **privacy@wellaryn.com** con el asunto "Solicitud ARCO"\n2. Incluye: tu nombre completo, correo electrónico asociado a tu cuenta, qué derecho(s) deseas ejercer y una descripción de tu solicitud\n3. Adjunta copia de una identificación oficial para verificación de identidad\n4. Responderemos dentro de **20 días hábiles** de recibir tu solicitud completa\n5. Si tu solicitud es procedente, los cambios se harán efectivos dentro de **15 días hábiles**\n\n**Derechos adicionales:**\n- **Revocar consentimiento:** Puedes revocar tu consentimiento para el tratamiento de datos de salud en cualquier momento desde la configuración de tu cuenta o contactándonos. Esto limitará ciertas funciones que dependen de datos biométricos.\n- **Portabilidad de datos:** Puedes solicitar una exportación de tus datos en formato legible por máquina (JSON/CSV)\n- **Queja:** Si consideras que se han vulnerado tus derechos de protección de datos, puedes presentar una queja ante la Secretaría Anticorrupción y Buen Gobierno (anteriormente INAI), autoridad actualmente responsable de la supervisión en materia de protección de datos personales en México.`,
      },
      {
        title: '9. Consentimiento para Datos de Salud',
        body: `Antes de recopilar cualquier dato biométrico o de salud, se te solicitará **consentimiento expreso** mediante una pantalla dedicada durante la incorporación. Este consentimiento es:\n\n- **Específico:** Separado de los Términos de Servicio generales\n- **Informado:** Explicamos exactamente qué datos recopilamos y por qué\n- **Libre:** Puedes usar funciones limitadas de Wellaryn sin conectar datos de salud\n- **Revocable:** Puedes revocar el consentimiento en cualquier momento desde la configuración de tu cuenta\n- **Documentado:** Mantenemos un registro de cuándo y cómo otorgaste tu consentimiento\n\nPara participantes del programa beta, se presenta un formulario adicional de consentimiento informado que cubre el uso de tus datos anonimizados para investigación de validación del producto.`,
      },
      {
        title: '10. Transferencias Internacionales',
        body: `Tus datos pueden procesarse en servidores ubicados fuera de México. En tales casos, nos aseguramos de que:\n- Existan salvaguardas apropiadas (cláusulas contractuales tipo o mecanismos equivalentes)\n- El país receptor proporcione un nivel adecuado de protección de datos\n- Las transferencias cumplan con el Capítulo V de la LFPDPPP`,
      },
      {
        title: '11. Menores de Edad',
        body: `Wellaryn no está diseñado para menores de 16 años. No recopilamos deliberadamente datos personales de menores. Si nos enteramos de que hemos recopilado datos de un menor de 16 años, los eliminaremos de inmediato. Si eres padre o tutor y crees que tu hijo nos ha proporcionado datos personales, contáctanos en privacy@wellaryn.com.`,
      },
      {
        title: '12. Cookies y Analítica',
        body: `Usamos cookies esenciales para autenticación y gestión de sesión. Podemos usar analítica anonimizada para entender cómo se usa el Servicio. No usamos cookies de seguimiento para publicidad. Puedes controlar las preferencias de cookies a través de la configuración de tu navegador.`,
      },
      {
        title: '13. Cambios a este Aviso',
        body: `Podemos actualizar este Aviso de Privacidad periódicamente. Los cambios materiales se comunicarán por correo electrónico y/o notificación en la app con al menos 15 días de anticipación. La fecha de "Última actualización" al inicio de esta página indica la revisión más reciente. El uso continuado del Servicio después de que los cambios entren en vigor constituye la aceptación.`,
      },
      {
        title: '14. Contacto',
        body: `Para preguntas, solicitudes ARCO o consultas de protección de datos:\n\n**Oficial de Privacidad**\nEmail: privacy@wellaryn.com\nSitio web: https://wellaryn.com\n\n**Autoridad Reguladora (México):**\nSecretaría Anticorrupción y Buen Gobierno\n(Autoridad actualmente responsable de la supervisión en materia de protección de datos personales)`,
      },
    ],
  },
};

export default function PrivacyPage() {
  const { language } = useLanguage();
  const lang = language || 'en';
  const c = content[lang] || content.en;

  return (
    <div className={styles.legalPage}>
      <div className={styles.legalContainer}>
        <Link href="/" className={styles.backLink}>{c.backLink}</Link>

        <h1 className={styles.legalTitle}>{c.title}</h1>
        <p className={styles.lastUpdated}>{c.lastUpdated}</p>

        {c.sections.map((section, i) => (
          <section key={i} className={styles.legalSection}>
            <h2 className={styles.sectionTitle}>{section.title}</h2>
            <div className={styles.sectionBody}>
              {section.body.split('\n\n').map((paragraph, j) => (
                <p key={j} dangerouslySetInnerHTML={{
                  __html: paragraph
                    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                    .replace(/\n- /g, '<br/>• ')
                    .replace(/\n/g, '<br/>')
                }} />
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
