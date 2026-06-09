export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs' && process.env.NEXT_PUBLIC_SENTRY_DSN) {
    try {
      const Sentry = await import('@sentry/nextjs');
      Sentry.init({
        dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
        tracesSampleRate: 0.1,
        environment: process.env.NODE_ENV,
        enabled: process.env.NODE_ENV === 'production',
      });
    } catch {
      // @sentry/nextjs not installed
    }
  }
}
