# Wellaryn Security Audit Report

**Audit Date:** June 8, 2026  
**Auditor:** Automated Security Review  
**Application:** Wellaryn — AI Sports Medicine Platform  
**Stack:** Next.js 15, Supabase, Vercel

---

## ✅ Issues Fixed

### 1. Security Headers Added
- `X-Content-Type-Options: nosniff` — Prevents MIME sniffing
- `X-Frame-Options: DENY` — Prevents clickjacking
- `X-XSS-Protection: 1; mode=block` — XSS filter
- `Referrer-Policy: strict-origin-when-cross-origin` — Controls referrer info
- `Permissions-Policy: camera=(), microphone=(), geolocation=()` — Blocks unused APIs
- `Strict-Transport-Security: max-age=63072000` — Forces HTTPS (2 years)

### 2. Service Worker Security
- `Cache-Control: no-cache` on SW ensures updates propagate immediately
- `Service-Worker-Allowed: /` properly scoped

---

## ✅ RLS Policy Summary

| Table | RLS Enabled | Policies |
|-------|-------------|----------|
| `profiles` | ✅ | User reads own + coach reads accepted athletes |
| `daily_metrics` | ✅ | User CRUD own + coach reads accepted athletes |
| `readiness_scores` | ✅ | User reads own + coach reads accepted athletes |
| `coach_athletes` | ✅ | Coach manages own + athlete sees/responds + public reads pending invites |
| `coach_notifications` | ✅ | Coach reads/updates own + system inserts |
| `chat_messages` | ✅ | Sender/receiver read + sender inserts + receiver marks read |
| `athlete_goals` | ✅ | User manages own + coach manages athlete goals |
| `injury_log` | ✅ | User manages own + coach manages athlete injuries |
| `injury_updates` | ✅ | Related users read + author inserts |

### RLS Assessment: **SECURE**
- All tables have RLS enabled
- Cross-user access properly scoped through `coach_athletes` junction table
- No overly permissive `true` policies without proper context

---

## ✅ API Route Security Summary

| Route | Auth | Rate Limit | Notes |
|-------|------|------------|-------|
| `/api/oura/*` | Cookie auth | ❌ | OAuth flow — relies on Supabase session |
| `/api/whoop/*` | Cookie auth | ❌ | Same pattern as Oura |
| `/api/garmin/*` | Cookie auth | ❌ | OAuth 1.0a flow |
| `/api/fitbit/*` | Cookie auth | ❌ | OAuth 2.0 flow |
| `/api/notifications/check` | CRON_SECRET | ✅ | Bearer token required |
| `/api/notifications/read` | Cookie auth | ❌ | Marks notifications read |
| `/api/reports/weekly` | CRON_SECRET | ✅ | Bearer token required |
| `/api/stripe/checkout` | Cookie auth | ❌ | Creates Stripe session |
| `/api/stripe/webhook` | Stripe signature | ✅ | Webhook signature verified |
| `/api/stripe/portal` | Cookie auth | ❌ | Creates portal session |
| `/api/admin/users` | Admin role check | ✅ | Verifies admin role |
| `/api/admin/stats` | Admin role check | ✅ | Verifies admin role |

---

## ⚠️ Recommendations (Deferred)

### Medium Risk
1. **Rate Limiting** — Add rate limiting to auth-only API routes (sync, chat). Consider Vercel Edge middleware with `@upstash/ratelimit`.
2. **Input Validation** — Add `zod` schema validation on API POST/PATCH bodies.
3. **CORS** — Currently using Next.js defaults. Consider explicit CORS config for API routes.

### Low Risk
4. **CSP Header** — Not added due to dynamic inline scripts from Next.js. Requires `nonce` strategy for full CSP.
5. **Audit Logging** — No audit trail for admin actions (role changes, deletions). Consider `admin_audit_log` table.
6. **Token Rotation** — Wearable OAuth tokens stored indefinitely. Add refresh logic with expiry checks.
7. **Data Encryption** — Health data stored in plaintext in Supabase. Consider column-level encryption for sensitive fields (HRV, RHR, sleep data) if HIPAA compliance is needed.

### Informational
8. **Environment Variables** — All secrets properly stored as env vars (not hardcoded). Verified: Supabase keys, Stripe keys, OAuth secrets, CRON_SECRET.
9. **Supabase SDK** — All queries use parameterized Supabase SDK (no raw SQL in client code), preventing SQL injection.
10. **Auth State** — Supabase handles JWT tokens automatically. Session refresh is non-blocking.

---

## Test Coverage

| Test File | Tests | Coverage |
|-----------|-------|----------|
| `wellaryn-score.test.js` | ~30 | Core algorithm, sub-scores, boundaries |
| `plan-gates.test.js` | ~10 | Plan restrictions, canAccess, getLimit |
| `i18n.test.js` | ~5 | Translation completeness EN/ES |
| `data-service.test.js` | ~8 | Supabase calls (mocked) |
| `notifications-check.test.js` | ~3 | CRON_SECRET auth |
| `UpgradePrompt.test.js` | ~3 | Component rendering |

**To run tests:**
```bash
npm install --save-dev jest @testing-library/react @testing-library/jest-dom jest-environment-jsdom
npm test
```
