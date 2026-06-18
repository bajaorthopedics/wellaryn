/**
 * Wellaryn — Rate Limiting
 *
 * Dos capas:
 *  1. Por IP  → se aplica en proxy.ts (sin sesión, atrapa abuso masivo).
 *  2. Por usuario → se aplica DENTRO de cada route handler caro
 *     (sync de wearables), DESPUÉS de validar la sesión, cuando ya
 *     conocemos el userId real.
 *
 * Backend: Upstash Redis (compartido entre todas las instancias serverless
 * de Vercel). Requiere las env vars:
 *   - UPSTASH_REDIS_REST_URL
 *   - UPSTASH_REDIS_REST_TOKEN
 *
 * FALLBACK SEGURO: si esas env vars no están definidas (p.ej. en desarrollo
 * local), el rate limiting se DESACTIVA y se deja pasar la petición, pero se
 * loguea un aviso. Nunca bloquea por error de configuración.
 */

import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const hasUpstash =
  !!process.env.UPSTASH_REDIS_REST_URL &&
  !!process.env.UPSTASH_REDIS_REST_TOKEN;

let redis = null;
if (hasUpstash) {
  redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  });
} else if (process.env.NODE_ENV === 'production') {
  // En producción, NO tener Upstash configurado es un error operativo
  // que conviene ver en los logs de Vercel.
  console.error(
    '[rate-limit] UPSTASH_REDIS_REST_URL/TOKEN no configuradas en producción. ' +
      'El rate limiting está DESACTIVADO. Configúralas en Vercel.'
  );
}

/**
 * Crea (una sola vez) un limitador con ventana deslizante.
 * @param {number} limit   máximo de peticiones
 * @param {string} window  ventana, p.ej. '1 m', '10 s'
 * @param {string} prefix  prefijo de la key en Redis
 */
function makeLimiter(limit, window, prefix) {
  if (!redis) return null;
  return new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(limit, window),
    prefix: `wellaryn:${prefix}`,
    analytics: true,
  });
}

// ── Limitadores por tipo de tráfico ───────────────────────────────
// Por IP (usados en proxy.ts):
export const ipApiLimiter = makeLimiter(60, '1 m', 'ip:api'); // API general
export const ipAuthLimiter = makeLimiter(15, '1 m', 'ip:auth'); // callbacks OAuth, etc.

// Por usuario (usados dentro de route handlers tras validar sesión):
export const userSyncLimiter = makeLimiter(10, '1 m', 'user:sync'); // syncs de wearables
export const userWriteLimiter = makeLimiter(60, '1 m', 'user:write'); // escrituras generales

/**
 * Aplica un limitador y devuelve un objeto con el resultado.
 * Si el limitador es null (sin Upstash), deja pasar (success:true).
 *
 * @param {Ratelimit|null} limiter
 * @param {string} identifier  IP o userId
 * @returns {Promise<{success:boolean, limit:number, remaining:number, reset:number}>}
 */
export async function checkLimit(limiter, identifier) {
  if (!limiter || !identifier) {
    return { success: true, limit: 0, remaining: 0, reset: 0, skipped: true };
  }
  try {
    const res = await limiter.limit(identifier);
    return { ...res, skipped: false };
  } catch (err) {
    // Si Redis falla, NO bloqueamos al usuario por un problema de infra.
    console.error('[rate-limit] Error consultando Upstash:', err.message);
    return { success: true, limit: 0, remaining: 0, reset: 0, skipped: true };
  }
}

/**
 * Construye los headers estándar de rate limit para incluir en la respuesta.
 * @param {{limit:number, remaining:number, reset:number}} res
 */
export function rateLimitHeaders(res) {
  if (!res || res.skipped) return {};
  return {
    'X-RateLimit-Limit': String(res.limit),
    'X-RateLimit-Remaining': String(res.remaining),
    'X-RateLimit-Reset': String(res.reset),
  };
}

/**
 * Extrae la IP del cliente desde los headers de la request.
 * En Vercel, x-forwarded-for es la fuente confiable.
 */
export function getClientIp(request) {
  const xff = request.headers.get('x-forwarded-for');
  if (xff) return xff.split(',')[0].trim();
  return request.headers.get('x-real-ip') || '127.0.0.1';
}
