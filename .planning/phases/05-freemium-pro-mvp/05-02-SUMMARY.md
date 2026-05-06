---
phase: 05-freemium-pro-mvp
plan: 02
subsystem: payments
tags: [stripe, checkout, webhook, billing-portal, subscription-lifecycle, idempotency]

requires:
  - 05-01 product monetization contract, schema, resolver, flags, and Stripe price catalog
provides:
  - Server-created Stripe Checkout for internal Pro monthly intents
  - Raw-body signed Stripe webhook route
  - Idempotent webhook fulfillment with metadata/customer/subscription/price validation
  - Subscription lifecycle normalization for active, grace, canceling, canceled, and suspended states
  - Stripe Billing Portal action backed by trusted customer IDs
affects: [phase-05, billing, subscription-truth, upgrade-intent, product-access]

tech-stack:
  added:
    - stripe@22.1.0
  patterns:
    - Stripe API version pinned to the installed SDK-supported `2026-04-22.dahlia`
    - Checkout intent is an internal allowlist; client Price IDs, amount, currency, plan, and entitlement are rejected
    - Checkout completion records pending truth only; Pro access waits for subscription/invoice webhook fulfillment
    - Billing Portal sessions use trusted server-side Stripe customer IDs

key-files:
  created:
    - src/lib/stripe.ts
    - src/lib/stripe.test.ts
    - src/actions/billing.ts
    - src/actions/billing.test.ts
    - src/app/api/stripe/webhook/route.ts
    - src/app/api/stripe/webhook/route.test.ts
    - src/server/billing/stripe-fulfillment.ts
    - src/server/billing/stripe-fulfillment.test.ts
    - src/server/billing/subscription-state.ts
    - src/server/billing/subscription-state.test.ts
    - src/lib/rate-limit.test.ts
  modified:
    - package.json
    - package-lock.json
    - src/lib/rate-limit.ts
    - .planning/phases/05-freemium-pro-mvp/05-USER-SETUP.md

key-decisions:
  - "Checkout accepts only narrow internal monthly intents and maps to server-owned Stripe Price IDs."
  - "Success URL and Checkout completion never grant Pro; webhook fulfillment owns local billing/access state."
  - "Subscription updates are monotonic around period windows so older events cannot reopen terminal access."
  - "Billing Portal is the only subscription-management path in this plan."

requirements-completed: [MON-02, MON-03, MON-04, MON-05, ANALYT-02]
duration: 24 min
completed: 2026-05-06
---

# Phase 05 Plan 02: Stripe Checkout And Webhook Truth Summary

**Stripe-hosted Checkout, signed webhook fulfillment, Billing Portal, and subscription lifecycle truth are implemented without granting Pro from client redirects.**

## Performance

- **Duration:** 24 min
- **Started:** 2026-05-06T14:28:00Z
- **Completed:** 2026-05-06T14:52:00Z
- **Tasks:** 3/3
- **Files modified:** 15

## Accomplishments

- Added the official `stripe` Node SDK and a server wrapper pinned to `2026-04-22.dahlia`.
- Added `startProCheckout` with authenticated access, billing rate limits, internal intent validation, checkout-attempt creation before Stripe calls, server-owned Price ID resolution, metadata, and idempotency keys.
- Added `openBillingPortal` using trusted local Stripe customer IDs only.
- Added `/api/stripe/webhook` with raw-body signature verification before fulfillment.
- Added idempotent fulfillment for checkout completion, invoice paid/failed, subscription updated/deleted, dispute, and review events.
- Added subscription lifecycle helpers for active, canceling, past-due grace, grace expiry, terminal revocation, suspension, and out-of-order protection.
- Updated the Phase 5 setup checklist with the concrete webhook event list and Billing Portal setup.

## Task Commits

1. **Task 1: Add Stripe client wrapper and secure checkout action** - `070a067`
2. **Task 2: Add signed webhook route and idempotent fulfillment** - `31d1a14`
3. **Task 3: Add portal action and subscription lifecycle resolver** - `070a067`, `31d1a14`

Task 3 touched both the billing action file and fulfillment lifecycle file, so its implementation is split across the two task commits.

## Verification

| Command | Result | Evidence |
|---------|--------|----------|
| `npx vitest run src/lib/stripe.test.ts src/actions/billing.test.ts src/app/api/stripe/webhook/route.test.ts src/server/billing/stripe-fulfillment.test.ts src/server/billing/subscription-state.test.ts src/lib/rate-limit.test.ts` | PASS | 6 files, 33 tests passed |
| `npm run typecheck` | PASS | `tsc --noEmit` completed successfully |

## Acceptance Criteria

| Criterion | Evidence | Status |
|-----------|----------|--------|
| Checkout cannot be created by anonymous users. | `src/actions/billing.test.ts` rejects anonymous checkout. | PASS |
| Client-sent Stripe Price ID, amount, currency, plan, or entitlement is ignored/rejected. | Strict checkout schema rejects extra `priceId`, `amount`, and `currency` fields. | PASS |
| Checkout attempt exists before Stripe call. | `startProCheckout` creates/reuses `product_checkout_attempts` before `checkout.sessions.create`; test verifies created attempt and idempotency metadata. | PASS |
| Stripe metadata includes authenticated user id and checkout attempt id. | Checkout action test asserts `metadata.userId` and `metadata.checkoutAttemptId`. | PASS |
| Duplicate retry uses same idempotency key. | Reusable-attempt test asserts `stripe-checkout:<attemptId>` is reused. | PASS |
| Invalid signature is rejected before fulfillment. | Webhook route test rejects missing/invalid `Stripe-Signature` before calling fulfillment. | PASS |
| Replayed Stripe event id does not duplicate fulfillment. | Fulfillment test returns `duplicate` with no billing/analytics event duplication. | PASS |
| Metadata, price, customer, and unknown-attempt mismatches are rejected/quarantined. | Fulfillment tests cover each mismatch path and record `webhook.rejected`. | PASS |
| `checkout.session.completed` alone does not grant Pro. | Test records checkout completion while leaving `product_subscriptions` empty. | PASS |
| Portal cannot open for anonymous users or users without trusted Stripe customer id. | Billing action tests reject both cases. | PASS |
| Past-due grace, canceling access, suspension, and out-of-order events are deterministic. | `subscription-state.test.ts` and fulfillment tests cover these transitions. | PASS |

## Requirement Evidence

| Requirement | 05-02 Evidence | Automated Test | Status |
|-------------|----------------|----------------|--------|
| MON-02 | Pro monthly checkout can be created through Stripe-hosted Checkout from server-owned internal price keys. | `src/actions/billing.test.ts`, `src/lib/stripe.test.ts` | Implemented and tested; real Stripe Price IDs still require user setup. |
| MON-03 | Stripe webhooks map trusted subscription state into `product_subscriptions` and resolver-compatible billing/access facts. | `src/server/billing/stripe-fulfillment.test.ts`, `src/server/billing/subscription-state.test.ts` | Implemented and tested. |
| MON-04 | No PUBG API-derived data or exclusive official data gate was introduced; billing only gates original Pro subscription value. | Code review of touched billing modules; no PUBG API surfaces changed. | Preserved. |
| MON-05 | No public copy now claims perfect sensitivity, rank gain, or PUBG/KRAFTON affiliation; setup notes explicitly keep portal branding independent. | `05-USER-SETUP.md` updated; no user-facing marketing copy added. | Preserved for this plan; full copy gate remains in 05-06/05-08. |
| ANALYT-02 | Checkout started, portal opened, webhook processed/rejected, Pro activated/revoked/grace events are recorded through privacy-minimal event hooks. | `src/actions/billing.test.ts`, `src/server/billing/stripe-fulfillment.test.ts` | Implemented as safe event hooks; broader analytics instrumentation continues in 05-05. |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Added `stripe` as a runtime dependency**
- **Found during:** Task 1 implementation
- **Issue:** The repo did not include the official Stripe Node SDK, but the plan requires official Checkout, webhook-signature, and Billing Portal APIs.
- **Fix:** Installed `stripe@22.1.0` and pinned the wrapper to its supported API version.
- **Files modified:** `package.json`, `package-lock.json`, `src/lib/stripe.ts`
- **Verification:** `src/lib/stripe.test.ts` and `npm run typecheck` pass.
- **Commit:** `070a067`

**2. [Rule 3 - Blocking] Deferred runtime env/auth/db imports for testability**
- **Found during:** Focused test run
- **Issue:** Importing runtime env/auth/db at module load caused focused unit tests to require real secrets and NextAuth runtime setup.
- **Fix:** Kept production wiring in the server action/default fulfillment path, but made pure handlers injectable and secret-free under tests.
- **Files modified:** `src/lib/stripe.ts`, `src/actions/billing.ts`, `src/server/billing/stripe-fulfillment.ts`
- **Verification:** Focused Vitest group and `npm run typecheck` pass.
- **Commits:** `070a067`, `31d1a14`

---

**Total deviations:** 2 auto-fixed blocking issues.
**Impact on plan:** Both changes preserve the secure Stripe-hosted architecture and improve test reliability. No scope expansion beyond the required Stripe SDK dependency.

## Issues Encountered

- `npm install stripe` reported existing dependency audit findings: 12 vulnerabilities (7 moderate, 5 high). I did not run `npm audit fix` because that could change unrelated dependency versions outside this plan.
- External Stripe setup remains incomplete: real `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, Price IDs, and Dashboard webhook/portal setup are still user-controlled.

## User Setup Required

Yes. See `.planning/phases/05-freemium-pro-mvp/05-USER-SETUP.md`.

## Next Phase Readiness

Plan 05-02 is implemented and automatically verified. Phase 5 can continue to `05-03` for the quota ledger and `saveAnalysisResult` enforcement.

---
*Phase: 05-freemium-pro-mvp*
*Completed: 2026-05-06*
