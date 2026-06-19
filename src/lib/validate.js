/**
 * Wellaryn — Validación de inputs con Zod
 *
 * Centraliza los schemas de body de las rutas API y una función helper
 * que parsea + valida, devolviendo un objeto uniforme:
 *   { success: true, data }            ← válido
 *   { success: false, response }       ← inválido, `response` es un 400 listo
 *
 * Uso en un route handler:
 *   const parsed = await validateBody(request, syncSchema);
 *   if (!parsed.success) return parsed.response;
 *   const { days } = parsed.data;
 *
 * Esto reemplaza el patrón frágil `await request.json()` (que truena con
 * body vacío → 500) por un 400 limpio y predecible.
 */

import { z } from 'zod';
import { NextResponse } from 'next/server';

// ── Schemas por ruta ──────────────────────────────────────────────

// Sync de wearables: { days?: number } — default 7, tope sensato.
export const syncSchema = z.object({
  days: z.coerce.number().int().min(1).max(90).optional().default(7),
});

// notifications/read: o bien { all: true } o bien { notificationIds: string[] }.
// Aceptamos ambos opcionales; el handler decide qué hacer.
export const notificationsReadSchema = z.object({
  all: z.boolean().optional(),
  notificationIds: z.array(z.string().uuid()).optional(),
});

// stripe/checkout: { planId: 'pro'|'team', interval: 'month'|'year' }.
export const stripeCheckoutSchema = z.object({
  planId: z.enum(['pro', 'team']),
  interval: z.enum(['month', 'year']),
});

// admin/users: { userId: uuid, action: <set cerrado>, value? }.
// `value` varía según action (rol, plan, bool), así que lo dejamos flexible
// pero presente; el handler valida el detalle por cada case.
export const adminUsersSchema = z.object({
  userId: z.string().uuid(),
  action: z.enum(['changeRole', 'changePlan', 'toggleDisable', 'delete']),
  value: z.union([z.string(), z.boolean()]).optional(),
});

// email: { to: email, template: string, data?: object }.
// La existencia del template la valida el handler contra TEMPLATES.
export const emailSchema = z.object({
  to: z.string().email(),
  template: z.string().min(1),
  data: z.record(z.string(), z.unknown()).optional(),
});

// ── Helper ────────────────────────────────────────────────────────

/**
 * Lee y valida el body JSON de la request contra un schema de zod.
 * @param {Request} request
 * @param {z.ZodSchema} schema
 * @returns {Promise<{success:true,data:any}|{success:false,response:NextResponse}>}
 */
export async function validateBody(request, schema) {
  let raw;
  try {
    raw = await request.json();
  } catch {
    // Body vacío o JSON mal formado → 400 limpio (antes esto era un 500).
    return {
      success: false,
      response: NextResponse.json(
        { error: 'Body inválido o vacío. Se esperaba JSON.' },
        { status: 400 }
      ),
    };
  }

  const result = schema.safeParse(raw);
  if (!result.success) {
    // En zod v4, los problemas vienen en result.error.issues.
    const issues = result.error.issues.map((i) => ({
      field: i.path.join('.') || '(root)',
      message: i.message,
    }));
    return {
      success: false,
      response: NextResponse.json(
        { error: 'Datos inválidos', details: issues },
        { status: 400 }
      ),
    };
  }

  return { success: true, data: result.data };
}
