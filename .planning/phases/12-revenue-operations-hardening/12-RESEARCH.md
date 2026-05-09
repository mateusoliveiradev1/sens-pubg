# Phase 12: Revenue Operations Hardening - Research

**Researched:** 2026-05-09
**Domain:** Revenue operations cockpit, paid funnel observability, support diagnosis, Stripe/readiness evidence, launch no-go gates
**Confidence:** HIGH

## Research Question

What must be true to plan Phase 12 well?

Phase 12 should turn the already-built paid system into an operational launch-control layer. The planning should reuse the existing monetization, admin billing, Stripe, quota, analytics, readiness, and evidence-verifier patterns instead of creating a generic BI product or a second entitlement source.

## Current System Facts

### Monetization Truth Sources

- `src/types/monetization.ts` already defines stable contracts for Stripe environment, price keys, entitlement keys, access states, billing statuses, quota states, event types, flags, and No False Done evidence statuses.
- `src/lib/product-entitlements.ts` owns product access resolution for Free, Pro, founder, checkout pending, past due grace, past due blocked, canceled, suspended, manual grant active, and manual grant expired states.
- `src/lib/product-access-server.ts` wraps the server-side resolver and uses quota/subscription/grant/flag facts when a user ID exists.
- `src/lib/monetization-flags.ts` already models safe-mode behavior, checkout disablement, public/founder pricing flags, portal enablement, analytics enablement, and the invariant that safe mode preserves confirmed paid access without globally granting Pro.
- `src/lib/quota-ledger.ts` owns Free 3/month and Pro 100/cycle analysis save limits, warning states, limit blockers, non-billable weak captures, safe-mode pauses, and support adjustments.

### Existing Data That Can Power Revenue Ops

- `monetizationAnalyticsEvents` can power privacy-minimal funnel metrics such as first usable analysis, upgrade intent, checkout requested/started/confirmed, Pro lifecycle, quota warning/limit/exhausted, Billing Portal, admin grants, suspensions, and support notes.
- `productCheckoutAttempts` separates checkout attempt state from Pro entitlement truth.
- `processedStripeEvents` separates signed Stripe webhook receipt/processing/rejection from UI state.
- `productSubscriptions` is the current subscription/access truth after webhook fulfillment.
- `productUserGrants` supports audited manual grants/revocation.
- `productQuotaLedger` supports usage-limit and quota blocker evidence.
- `productSupportNotes` and `productBillingEvents` already provide internal support timeline and operational evidence.

### Existing Admin/Support Pattern

- `/admin` is already protected by `src/app/admin/layout.tsx` for `admin`, `mod`, and `support` roles.
- `src/actions/admin-billing.ts` already enforces staff reads and admin-only billing mutations.
- `src/app/admin/billing/page.tsx` already frames billing as operational support, not revenue analytics.
- Support can read and create notes; admin can grant, revoke, suspend, and request reconciliation.
- Current admin billing UI is user-centric. Phase 12 should add a cockpit-level launch summary and a better domain diagnosis/cause tree, then link into billing detail when a user-level reason exists.

### Existing Readiness Pattern

- `src/core/release-readiness.ts` already evaluates local browser readiness, final deployment readiness, and backend pipeline readiness from env, public URL, auth URL, Vercel link, and ffmpeg availability.
- `scripts/check-release-readiness.ts` exposes `readiness:local`, `readiness:deploy`, and `readiness:backend`.
- `docs/launch-readiness-2026-04-17.md` documents that browser-first release can proceed separately from backend ffmpeg readiness, while deploy still needs production env, OAuth callbacks, production DB migration, and deployed smoke.
- Phase 12 should extend readiness with paid launch gates rather than treating paid readiness as a transient admin page status.

### Existing Verification Pattern

- `scripts/verify-phase10-programs.ts` and `scripts/verify-phase11-social-pro.ts` parse a versioned checklist, enforce required row IDs, reject missing/invalid statuses, and derive `Delivered`, `Partially delivered`, or `Blocked`.
- `src/ci/phase10-programs-evidence.test.ts` and `src/ci/phase11-social-pro-evidence.test.ts` lock script registration and final-status rules.
- Phase 12 should follow this pattern with `verify:phase12:revenue-ops`.
- The verifier must keep launch status partial or blocked when Stripe test/production, deploy, OAuth, manual paid-flow, support, or compliance evidence is missing.

## Planning Implications

### Recommended Plan Slices

1. Start with a Wave 0 validation scaffold. Phase 12 is mostly operational truth and launch claims, so tests/verifier/evidence rows should exist before implementation.
2. Build the funnel aggregation and privacy contract in deterministic core code. UI should consume a safe view model, not query raw event rows directly.
3. Build support diagnosis and Pro cause trees as deterministic helpers used by admin actions and UI.
4. Build paid launch readiness and evidence matrix logic separately from visual cockpit rendering. Test and production evidence must be distinct.
5. Build the admin cockpit after the data/view models exist. The first screen should answer beta/public launch go/no-go with blockers, owners, evidence, and next action.
6. Finish with final Playwright/state evidence, copy-safety checks, checklist docs, and full gate accounting.

### Privacy Rules For Metrics

- Aggregate by default.
- Open user-level detail only for a concrete operational reason: support case, webhook failure, quota issue, entitlement mismatch, payment issue, auth issue, analysis save issue, admin grant review, or reconciliation request.
- Never expose raw video, frames, trajectories, private notes, private links/readers, collection contents, raw analysis payloads, card/payment data, addresses, bank data, or private financial metadata.
- Upgrade intent must come from real actions such as limit hit, premium feature attempt, or checkout request. Passive lock/feed impressions are not intent.
- The cockpit can show subscriber counts, conversion, churn/cancel states, blockers, and operational health. It must not become accounting, tax, payout, or per-user revenue analytics.

### Support Diagnosis Model

The support lens should be domain-first:

- `pagamento`
- `entitlement`
- `auth`
- `quota`
- `analise`
- `webhook`
- `admin_grant`

Each domain should output status, evidence, first cause, impact, owner, and next safe action. The Pro cause tree should surface the first true cause, such as no checkout, checkout pending, missing webhook, rejected/quarantined webhook, price mismatch, past due, canceled, expired grant, safe mode, suspension, missing entitlement, auth mismatch, or quota/access blocker.

Support can read snapshots, add internal notes, copy safe summaries, open billing context, request admin reconciliation, and assign/mark owner. Admin remains the only role that mutates paid state.

### Paid Readiness Model

The paid launch gate should split:

- Founder/Beta launch: constrained launch with explicit test-mode paid-flow evidence and support readiness.
- Public paid launch: stricter production-facing evidence including env/domain, OAuth, database migration, signed webhook, deployed smoke, paid-flow checks, compliance copy, privacy posture, and support runbooks.

Test mode PASS is a prerequisite for production. Production must have independent evidence and cannot inherit test-mode PASS.

Evidence rows should include check ID, environment, expected state, observed evidence, actor/test account, date, owner, rollback, result, and remaining gap. Statuses should be `PASS`, `WARN`, `BLOCKED`, and `FAIL` for checks, with final status derived by hard rules.

### UI Pattern

The cockpit should feel like launch control premium:

- Dense, polished, operational layout.
- First fold: go/no-go, beta/public gate cards, essential funnel, blockers, owner/evidence/next action.
- Use charts only when they support a decision.
- Avoid marketing hero composition and vanity metrics.
- Preserve admin-only route protection and link to current `/admin/billing` for user-level cases.

## Risks And Mitigations

| Risk | Planning Mitigation |
|------|---------------------|
| Cockpit becomes generic BI | Keep first fold gate/blocker/action oriented; defer accounting and per-user finance. |
| Metrics leak private data | Build privacy-safe core projection and sanitizer tests before UI. |
| Passive lock impressions inflate intent | Require event-type allowlist for upgrade intent; keep `premium.lock_viewed` out of intent metrics. |
| Support mutates paid truth | Keep mutation actions admin-only and add role-boundary tests. |
| Success URL/client state grants Pro | Add readiness/copy/verifier rows that reinforce webhook/subscription truth. |
| Test-mode evidence is treated as production | Model environment as a first-class dimension and fail production gates without production evidence. |
| Launch marked Delivered without external proof | Dedicated verifier derives status from evidence rows and explicit gaps. |
| Safe mode accidentally upgrades Free | Use existing `grantProToEveryone: false` invariant and test degradation behavior. |

## Recommended Verification

Phase 12 plans should require:

- Focused revenue ops tests for funnel aggregation, privacy, support diagnosis, cause tree, role boundaries, readiness gates, evidence rows, and safe degradation.
- `npm run test:monetization`
- `npm run typecheck`
- `npx vitest run`
- `npm run benchmark:gate`
- `npm run build`
- `npm run readiness:local`
- `npm run readiness:deploy` when env/deploy evidence is available
- Admin Playwright matrix for Revenue Ops states
- `npm run verify:phase12:revenue-ops`

If manual Stripe/deploy/OAuth evidence is unavailable, the final checklist must explicitly keep status at `Partially delivered` or `Blocked`.

## Sources

- `.planning/phases/12-revenue-operations-hardening/12-CONTEXT.md` - locked Phase 12 decisions D-01 through D-54.
- `.planning/PROJECT.md`, `.planning/REQUIREMENTS.md`, `.planning/ROADMAP.md`, `.planning/STATE.md` - project value, ANALYT-03 mapping, current focus, and manual Stripe caveats.
- `.planning/codebase/ARCHITECTURE.md`, `STACK.md`, `TESTING.md`, `CONCERNS.md`, `INTEGRATIONS.md`, `CONVENTIONS.md` - local architecture, stack, testing, and operational concerns.
- `src/types/monetization.ts` - existing monetization contracts and enums.
- `src/lib/product-analytics.ts` - privacy-minimal analytics sanitizer and event recorders.
- `src/lib/product-entitlements.ts`, `src/lib/product-access-server.ts`, `src/lib/monetization-flags.ts`, `src/lib/quota-ledger.ts` - product access, safe mode, and quota truth.
- `src/actions/admin-billing.ts`, `src/app/admin/billing/page.tsx` - current support/admin billing operations.
- `src/core/release-readiness.ts`, `scripts/check-release-readiness.ts` - existing release readiness model.
- `src/server/billing/stripe-fulfillment.ts`, `src/actions/billing.ts`, `src/app/api/stripe/webhook/route.ts` - checkout, webhook, and subscription truth.
- `docs/founder-beta-stripe-test-checklist.md`, `docs/monetization-runbooks.md`, `docs/launch-readiness-2026-04-17.md`, `docs/commercial-accuracy-readiness.md`, `docs/phase11-social-pro-verification.md` - current paid-flow, runbook, readiness, claim, and evidence posture.
- `.planning/phases/11-social-pro-community-premium/11-00-PLAN.md`, `11-12-PLAN.md`, `scripts/verify-phase11-social-pro.ts`, `src/ci/phase11-social-pro-evidence.test.ts` - recent phase plan and verifier pattern.

## RESEARCH COMPLETE

