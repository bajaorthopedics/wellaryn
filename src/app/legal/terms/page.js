'use client';

import { useLanguage } from '@/contexts/LanguageContext';
import styles from './page.module.css';
import Link from 'next/link';

const content = {
  en: {
    title: 'Terms of Service',
    lastUpdated: 'Last updated: June 1, 2026',
    backLink: '← Back to home',
    sections: [
      {
        title: '1. Acceptance of Terms',
        body: `By accessing or using Wellaryn ("the Service"), you agree to be bound by these Terms of Service. If you do not agree, do not use the Service. Wellaryn is operated by Wellaryn Technologies ("we", "us", "our").`,
      },
      {
        title: '2. Nature of the Service — Wellness Tool',
        body: `Wellaryn is a wellness and athletic performance tool. It is designed to help athletes, coaches, and fitness enthusiasts optimize training and recovery through data-driven insights.\n\n**Wellaryn is NOT a medical device.** It does not diagnose, treat, cure, or prevent any disease or medical condition. The readiness scores, risk indicators, and recommendations provided are general wellness information intended to support an active and healthy lifestyle.\n\nWellaryn does not provide medical advice. The information presented should not be used as a substitute for professional medical consultation, diagnosis, or treatment. Always consult a qualified healthcare provider before making changes to your training program, especially if you have pre-existing health conditions.`,
      },
      {
        title: '3. Wellaryn Score and Risk Indicators',
        body: `The Wellaryn Score and associated risk indicators (e.g., "Elevated Overload Risk") are derived from published sports science literature and are based on your personal biometric trends. They represent general wellness insights, not clinical predictions.\n\n**Important limitations:**\n- The score uses rules-based algorithms, not clinical diagnostic criteria\n- Risk levels are qualitative (Low / Moderate / Elevated), not calibrated probabilities of specific injuries\n- The algorithm's accuracy depends on the quality and completeness of data from your connected devices\n- Individual results may vary based on factors not captured by wearable data\n- The score is NOT validated for clinical decision-making`,
      },
      {
        title: '4. User Responsibilities',
        body: `You are responsible for:\n- Providing accurate information during account setup\n- Maintaining the security of your account credentials\n- Using the Service in accordance with applicable laws\n- Making your own decisions about training and health based on your judgment and professional medical advice\n- Reporting any technical issues or data inaccuracies you notice\n\nYou agree not to:\n- Use the Service for clinical diagnosis or treatment decisions without professional medical oversight\n- Share access to your account with others\n- Attempt to reverse-engineer the scoring algorithms\n- Use the Service in any way that could harm yourself or others`,
      },
      {
        title: '5. Connected Devices and Data',
        body: `When you connect a wearable device or health app to Wellaryn, you authorize us to collect and process the biometric data described in our Privacy Policy. You may disconnect a device at any time through your account settings.\n\nWe are not responsible for the accuracy of data provided by third-party devices or apps. Different wearable brands may measure the same metric (e.g., HRV) using different algorithms, which is why your Wellaryn Score is always based on your personal baseline, never compared against other users.`,
      },
      {
        title: '6. Intellectual Property',
        body: `All content, algorithms, design, and code comprising the Service are owned by Wellaryn Technologies and protected by applicable intellectual property laws. You may not copy, modify, distribute, or create derivative works from any part of the Service without our written permission.`,
      },
      {
        title: '7. Limitation of Liability',
        body: `To the maximum extent permitted by law:\n\n- The Service is provided "as is" without warranties of any kind\n- We do not guarantee that the Service will be uninterrupted, error-free, or that results will be accurate\n- We are not liable for any injuries, health outcomes, or damages arising from your use of or reliance on the Service\n- You use the Service and its recommendations at your own risk\n- Our total liability shall not exceed the amount you paid for the Service in the 12 months preceding the claim`,
      },
      {
        title: '8. Beta Program',
        body: `If you participate in the Wellaryn beta program via an invitation code, you acknowledge that:\n- The Service is in active development and may contain bugs or inaccuracies\n- Features may change or be removed without notice\n- Your feedback may be used to improve the Service\n- Beta participation does not guarantee continued access to the Service`,
      },
      {
        title: '9. Modifications',
        body: `We may update these Terms at any time. We will notify you of material changes via email or in-app notification. Continued use of the Service after changes take effect constitutes acceptance of the updated Terms.`,
      },
      {
        title: '10. Governing Law',
        body: `These Terms are governed by the laws of the United Mexican States (México). Any disputes shall be resolved in the competent courts of Baja California, México.`,
      },
      {
        title: '11. Contact',
        body: `For questions about these Terms, contact us at:\n\n**Email:** legal@wellaryn.com\n**Website:** https://wellaryn.com`,
      },
    ],
  },
  es: {
    title: 'Términos de Servicio',
    lastUpdated: 'Última actualización: 1 de junio de 2026',
    backLink: '← Volver al inicio',
    sections: [
      {
        title: '1. Aceptación de los Términos',
        body: `Al acceder o utilizar Wellaryn ("el Servicio"), aceptas quedar vinculado por estos Términos de Servicio. Si no estás de acuerdo, no utilices el Servicio. Wellaryn es operado por Wellaryn Technologies ("nosotros", "nos", "nuestro").`,
      },
      {
        title: '2. Naturaleza del Servicio — Herramienta de Bienestar',
        body: `Wellaryn es una herramienta de bienestar y rendimiento deportivo. Está diseñada para ayudar a atletas, entrenadores y entusiastas del fitness a optimizar su entrenamiento y recuperación mediante información basada en datos.\n\n**Wellaryn NO es un dispositivo médico.** No diagnostica, trata, cura ni previene ninguna enfermedad o condición médica. Los scores de preparación, indicadores de riesgo y recomendaciones proporcionados son información general de bienestar orientada a apoyar un estilo de vida activo y saludable.\n\nWellaryn no proporciona consejo médico. La información presentada no debe utilizarse como sustituto de consulta, diagnóstico o tratamiento médico profesional. Siempre consulta a un profesional de salud calificado antes de modificar tu programa de entrenamiento, especialmente si tienes condiciones de salud preexistentes.`,
      },
      {
        title: '3. Wellaryn Score e Indicadores de Riesgo',
        body: `El Wellaryn Score y los indicadores de riesgo asociados (ej. "Riesgo Elevado de Sobrecarga") se derivan de literatura publicada en ciencias del deporte y se basan en tus tendencias biométricas personales. Representan información general de bienestar, no predicciones clínicas.\n\n**Limitaciones importantes:**\n- El score utiliza algoritmos basados en reglas, no criterios diagnósticos clínicos\n- Los niveles de riesgo son cualitativos (Bajo / Moderado / Elevado), no probabilidades calibradas de lesiones específicas\n- La precisión del algoritmo depende de la calidad y completitud de los datos de tus dispositivos conectados\n- Los resultados individuales pueden variar por factores no capturados por los wearables\n- El score NO está validado para toma de decisiones clínicas`,
      },
      {
        title: '4. Responsabilidades del Usuario',
        body: `Eres responsable de:\n- Proporcionar información precisa durante la configuración de tu cuenta\n- Mantener la seguridad de tus credenciales\n- Usar el Servicio conforme a las leyes aplicables\n- Tomar tus propias decisiones sobre entrenamiento y salud basándote en tu criterio y consejo médico profesional\n- Reportar cualquier problema técnico o inexactitud en los datos\n\nTe comprometes a no:\n- Usar el Servicio para diagnóstico clínico o decisiones de tratamiento sin supervisión médica profesional\n- Compartir el acceso a tu cuenta con terceros\n- Intentar hacer ingeniería inversa de los algoritmos\n- Usar el Servicio de cualquier forma que pueda causar daño a ti o a terceros`,
      },
      {
        title: '5. Dispositivos Conectados y Datos',
        body: `Al conectar un dispositivo wearable o app de salud a Wellaryn, nos autorizas a recopilar y procesar los datos biométricos descritos en nuestra Política de Privacidad. Puedes desconectar un dispositivo en cualquier momento desde la configuración de tu cuenta.\n\nNo somos responsables de la precisión de los datos proporcionados por dispositivos o apps de terceros. Diferentes marcas de wearables pueden medir la misma métrica (ej. HRV) utilizando algoritmos distintos, por lo que tu Wellaryn Score siempre se basa en tu baseline personal, nunca se compara contra otros usuarios.`,
      },
      {
        title: '6. Propiedad Intelectual',
        body: `Todo el contenido, algoritmos, diseño y código que componen el Servicio son propiedad de Wellaryn Technologies y están protegidos por las leyes de propiedad intelectual aplicables. No puedes copiar, modificar, distribuir o crear obras derivadas de ninguna parte del Servicio sin nuestro permiso por escrito.`,
      },
      {
        title: '7. Limitación de Responsabilidad',
        body: `En la máxima medida permitida por la ley:\n\n- El Servicio se proporciona "tal cual" sin garantías de ningún tipo\n- No garantizamos que el Servicio sea ininterrumpido, libre de errores o que los resultados sean precisos\n- No somos responsables de lesiones, resultados de salud o daños derivados del uso del Servicio o de la confianza depositada en él\n- Usas el Servicio y sus recomendaciones bajo tu propio riesgo\n- Nuestra responsabilidad total no excederá el monto que hayas pagado por el Servicio en los 12 meses anteriores a la reclamación`,
      },
      {
        title: '8. Programa Beta',
        body: `Si participas en el programa beta de Wellaryn mediante un código de invitación, reconoces que:\n- El Servicio está en desarrollo activo y puede contener errores o imprecisiones\n- Las funciones pueden cambiar o eliminarse sin previo aviso\n- Tu retroalimentación puede ser utilizada para mejorar el Servicio\n- La participación en la beta no garantiza acceso continuo al Servicio`,
      },
      {
        title: '9. Modificaciones',
        body: `Podemos actualizar estos Términos en cualquier momento. Te notificaremos de cambios materiales por correo electrónico o notificación en la app. El uso continuado del Servicio después de que los cambios entren en vigor constituye la aceptación de los Términos actualizados.`,
      },
      {
        title: '10. Ley Aplicable',
        body: `Estos Términos se rigen por las leyes de los Estados Unidos Mexicanos. Cualquier controversia será resuelta ante los tribunales competentes de Baja California, México.`,
      },
      {
        title: '11. Contacto',
        body: `Para preguntas sobre estos Términos, contáctanos en:\n\n**Email:** legal@wellaryn.com\n**Sitio web:** https://wellaryn.com`,
      },
    ],
  },
};

export default function TermsPage() {
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
