'use client';

export default function GlobalError({ error, reset }) {
  // Try to report to Sentry if available
  if (typeof window !== 'undefined' && error) {
    try {
      import('@sentry/nextjs').then(Sentry => Sentry.captureException(error)).catch(() => {});
    } catch {}
  }

  return (
    <html lang="en">
      <body style={{
        backgroundColor: '#0a0a0f',
        color: '#f0f0f5',
        fontFamily: 'Inter, -apple-system, sans-serif',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        margin: 0,
        padding: '2rem',
        textAlign: 'center',
      }}>
        <div>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚠️</div>
          <h2 style={{ fontSize: '24px', fontWeight: 700, marginBottom: '8px' }}>
            Algo salió mal
          </h2>
          <p style={{ color: '#a0a0b0', marginBottom: '24px', maxWidth: '400px' }}>
            Ha ocurrido un error inesperado. Nuestro equipo ha sido notificado.
          </p>
          <button
            onClick={reset}
            style={{
              padding: '12px 24px',
              backgroundColor: '#00C896',
              color: '#fff',
              border: 'none',
              borderRadius: '999px',
              fontSize: '15px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Intentar de nuevo
          </button>
        </div>
      </body>
    </html>
  );
}
