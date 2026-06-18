/**
 * Wellaryn — Proxy (Next.js 16)
 *
 * NOTA: En Next.js 16, este archivo reemplaza al antiguo `middleware.ts`.
 * Corre en el runtime de Node.js y se ejecuta ANTES de que las rutas se
 * rendericen. NO es una frontera de seguridad: la verificación de identidad
 * vive en cada route handler (que valida la sesión de Supabase). Aquí solo
 * hacemos dos cosas baratas y seguras a nivel de red:
 *   1. Rate limiting por IP para /api/* (atrapa abuso masivo).
 *   2. Security headers en todas las respuestas.
 *
 * El rate limit POR USUARIO (más fino, para syncs caros) se aplica dentro
 * de cada route handler, donde ya se conoce el userId. Ver src/lib/rate-limit.js.
 */

import { NextResponse } from 'next/server';
import {
  ipApiLimiter,
  ipAuthLimiter,
  checkLimit,
  rateLimitHeaders,
  getClientIp,
} from '@/lib/rate-limit';

// Rutas /api que NO deben llevar rate limit por IP:
// - Stripe webhook: viene de IPs de Stripe en ráfagas, ya validado por firma.
// - Crons: protegidos por CRON_SECRET, vienen del scheduler de Vercel.
const RATE_LIMIT_EXEMPT = [
  '/api/stripe/webhook',
  '/api/cron/',
  '/api/notifications/check', // protegida por CRON_SECRET
  '/api/reports/weekly', // protegida por CRON_SECRET
];

// Rutas /api consideradas "auth-sensibles" (callbacks OAuth de wearables).
const AUTH_SENSITIVE = ['/authorize', '/callback'];

const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
};

function withSecurityHeaders(response) {
  for (const [k, v] of Object.entries(SECURITY_HEADERS)) {
    response.headers.set(k, v);
  }
  return response;
}

export async function proxy(request) {
  const { pathname } = request.nextUrl;

  // Solo aplicamos rate limit a /api/*
  if (pathname.startsWith('/api/')) {
    const exempt = RATE_LIMIT_EXEMPT.some((p) => pathname.startsWith(p));
    if (!exempt) {
      const ip = getClientIp(request);
      const isAuthSensitive = AUTH_SENSITIVE.some((p) => pathname.includes(p));
      const limiter = isAuthSensitive ? ipAuthLimiter : ipApiLimiter;

      const result = await checkLimit(limiter, ip);
      if (!result.success) {
        return withSecurityHeaders(
          NextResponse.json(
            { error: 'Demasiadas peticiones. Intenta de nuevo en un momento.' },
            { status: 429, headers: rateLimitHeaders(result) }
          )
        );
      }
    }
  }

  return withSecurityHeaders(NextResponse.next());
}

export const config = {
  matcher: [
    // Todas las rutas excepto los estáticos de Next y assets.
    '/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|manifest.json|sw.js).*)',
  ],
};
