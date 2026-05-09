# Phase 12: Revenue Operations Hardening - Context

**Gathered:** 2026-05-09T16:44:10.5897364-03:00
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 12 makes the paid Sens PUBG system observable, supportable, and ready for real launch decisions.

The phase delivers a Revenue Ops launch-control layer for admins/staff: high-level funnel metrics, paid-flow evidence, support diagnosis, Stripe/readiness status, launch go/no-go gates, and an actionable checklist that distinguishes implementation from verified launch readiness.

This phase is not a new paid feature, not a team/coach workflow, not a creator payout system, not public creator finance analytics, not a general BI product, and not a new payment provider migration. It must keep Pro entitlement truth server-owned, preserve Free usefulness, keep analytics privacy-minimal, avoid raw clip/payment/private-reader exposure, and avoid claiming the product is launch-ready without external evidence.

</domain>

<decisions>
## Implementation Decisions

### Revenue Ops Cockpit
- **D-01:** Revenue Ops opens as a **cockpit de decisao de lancamento**, not as a generic BI dashboard or support queue.
- **D-02:** The first screen should answer: can Sens PUBG open founder/beta launch or public paid launch right now?
- **D-03:** The top-level cockpit should show go/no-go state, launch gate status, funnel summary, blockers, owner, evidence, and next action.
- **D-04:** The visual/operational language is **launch control premium**: dense, polished, serious, operational, and not marketing-like.
- **D-05:** Status language should use stable operational states such as `PASS`, `WARN`, `BLOCKED`, and `NO-GO`.
- **D-06:** A `NO-GO` state must be actionable. It shows blocker, impact, owner, runbook, missing evidence, and the smallest next verifiable step.
- **D-07:** The cockpit should avoid vanity charts. Charts are useful only when they help launch/support decisions.
- **D-08:** Exact route name and navigation placement are planner discretion, but the surface must be staff/admin-only and connected to existing admin patterns.

### Funnel And Revenue Metrics
- **D-09:** The first fold uses an essential funnel, polished and concise.
- **D-10:** Essential funnel metrics are: first usable analysis, upgrade intent, checkout started, checkout confirmed, Pro active, churn/cancellation, and quota limit hit.
- **D-11:** Upgrade intent includes real action attempts such as limit hit, premium feature attempted, and checkout requested. It must not count passive lock/feed impressions as intent.
- **D-12:** Free-to-paid conversion should be derived from real funnel transitions, not client state or success URL assumptions.
- **D-13:** Churn/cancellation should distinguish canceling, canceled, past-due grace, past-due blocked, unpaid, suspended, and manual grant expiration when those states exist.
- **D-14:** Usage-limit events should include quota warning, limit hit, exhausted, blocked, and safe-mode paused where available.
- **D-15:** Deeper Pro usage metrics such as Coach, History, Spray Lab, Ciclo Pro, and Social Pro can appear below the launch summary, but must not dominate the first fold.
- **D-16:** The cockpit is aggregated by default. User-level detail is opened only when there is a concrete operational reason.
- **D-17:** Concrete detail reasons include support case, webhook failure, quota issue, entitlement mismatch, payment issue, auth issue, analysis save issue, admin grant review, or reconciliation request.
- **D-18:** Metrics must stay privacy-minimal. Do not expose raw video, frames, trajectories, private notes, private links/readers, collection contents, raw analysis payloads, payment card data, addresses, bank data, or financial private metadata.
- **D-19:** Phase 12 can show subscriber counts, funnel conversion, churn/cancel states, blocked checks, and operational health. It must not become accounting, tax, payout, or per-user revenue analytics.

### Support And Admin Operations
- **D-20:** Support diagnosis starts by domain: `pagamento`, `entitlement`, `auth`, `quota`, `analise`, `webhook`, and `admin_grant`.
- **D-21:** Each domain diagnosis should show status, evidence, first cause, impact, owner, and next safe action.
- **D-22:** Support can read snapshots, inspect events, create internal notes, copy a safe summary, open billing context, request admin reconciliation, and mark/assign owner.
- **D-23:** Only admin can change paid state: grant, revoke, suspend, reconcile, or mutate entitlement/billing truth.
- **D-24:** Support actions must be audit-safe and conservative. They cannot delete history, edit payment state, silently grant Pro, reset paid status, or alter Stripe truth.
- **D-25:** The product must explain "why this user does not have Pro" with an explicit cause tree.
- **D-26:** The cause tree should surface the first true cause, for example: no checkout, checkout pending, webhook missing, webhook rejected/quarantined, price mismatch, subscription past_due, subscription canceled, grant expired, safe mode, suspension, entitlement missing, auth mismatch, or quota/access blocker.
- **D-27:** Timelines remain useful as evidence, but they should support the domain diagnosis instead of forcing staff to infer everything manually.
- **D-28:** Support/admin outputs should use safe summaries and stable reason codes so they can be pasted into support notes without leaking private data.

### Paid Readiness And Stripe
- **D-29:** Real charging is blocked until paid-flow evidence is complete.
- **D-30:** Required paid-flow evidence includes Stripe test-mode checklist, signed webhook confirmation, Billing Portal, portal cancellation, payment failure/grace behavior, refund/dispute/fraud suspension path, admin grant/revoke/suspend/reconcile, checkout-disabled preservation, price mismatch rejection/quarantine, and deployed smoke.
- **D-31:** The existing founder beta Stripe checklist remains a canonical source and should be upgraded or reflected by the Phase 12 evidence matrix.
- **D-32:** Evidence is recorded in a versioned evidence matrix, not only transient UI state.
- **D-33:** Each evidence row includes check id, environment, expected state, observed evidence, actor/test account, date, owner, rollback, and result.
- **D-34:** Evidence statuses should include at least `PASS`, `WARN`, `BLOCKED`, and `FAIL` where useful for checks; final phase status uses hard rules separately.
- **D-35:** Stripe `test` and `production` environments are separated and explicit.
- **D-36:** Passing test mode is a prerequisite for production, but production does not inherit test-mode PASS. Production needs its own evidence.
- **D-37:** Checkout success URL, query params, localStorage, and client state never grant Pro. Revenue Ops must keep reinforcing that webhook/subscription truth is authoritative.
- **D-38:** Paid-flow failure should trigger **safe degradation**: close new checkout, preserve confirmed Pro access, keep Free useful, create cockpit blocker, and point to owner/runbook.
- **D-39:** Safe degradation must not globally upgrade Free users, delete user history, revoke confirmed paid access without cause, or hide billing/support routes needed to resolve incidents.

### Launch Gates And No-Go Rules
- **D-40:** Public launch ready requires complete launch evidence: env/domain, OAuth callbacks, database migration, Stripe, signed webhook, deployed smoke, paid-flow checks, compliance copy, privacy posture, support runbooks, and core gates.
- **D-41:** The checklist must split `Founder/Beta launch` and `Public paid launch` gates.
- **D-42:** `Founder/Beta launch` can be more constrained, but still requires explicit evidence and cannot silently mean public launch ready.
- **D-43:** `Public paid launch` is stricter and requires production-facing evidence, deployed smoke, compliance/copy/privacy readiness, and support readiness.
- **D-44:** Final status options are `Delivered`, `Partially delivered`, and `Blocked`, governed by hard rules.
- **D-45:** `Delivered` is allowed only when every mandatory implementation, automated gate, manual paid-flow, deploy/readiness, and support/compliance evidence row is accounted for and passing.
- **D-46:** `Partially delivered` is used when implementation and automated checks exist but external evidence is missing, such as Stripe production/test evidence, real deployed smoke, env access, OAuth setup, or manual checklist proof.
- **D-47:** `Blocked` is used when missing secrets, provider access, deploy environment, database migration access, Stripe configuration, OAuth configuration, or other external setup prevents verification.
- **D-48:** The cockpit may show percentages or counts as secondary context, but percent readiness cannot override a hard blocker.
- **D-49:** Launch CTA/state should never be hidden without explanation. A no-go should explain exactly what blocks launch and what to verify next.

### Verification And Gates
- **D-50:** Phase 12 needs a dedicated verifier, expected as `npm run verify:phase12:revenue-ops` or equivalent.
- **D-51:** Verification must cover funnel aggregation, privacy filters, support-domain diagnosis, explicit Pro cause tree, role boundaries, paid-flow matrix, test-vs-production separation, safe degradation, launch gates, and no-go copy.
- **D-52:** Required gates should include focused Phase 12 tests, monetization tests, typecheck, full Vitest, benchmark gate, build, relevant Playwright/admin state evidence, readiness checks, and documented paid-flow evidence.
- **D-53:** If manual external evidence is unavailable, the final evidence matrix must say so explicitly and keep launch state at `Partially delivered` or `Blocked`, not `Delivered`.
- **D-54:** Browser-first analysis remains intact. Phase 12 observes and supports the paid system; it does not introduce backend video processing or change core analysis truth.

### the agent's Discretion
The researcher/planner may choose exact route names, component names, schema/table names, query shapes, date ranges, filter controls, chart primitives, evidence file name, verifier implementation, and plan wave count.

That discretion does not include turning Revenue Ops into generic BI, exposing private clip/payment/user data, counting passive impressions as upgrade intent, letting support mutate paid state, treating test-mode Stripe evidence as production evidence, opening real checkout without complete evidence, hiding no-go reasons, weakening server-owned entitlement truth, or marking Phase 12 Delivered without mandatory evidence.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Planning Source
- `.planning/PROJECT.md` - Core value, browser-first constraint, paid value boundaries, confidence honesty, and no-overclaim rules.
- `.planning/REQUIREMENTS.md` - Phase 12 mapped requirement: ANALYT-03.
- `.planning/ROADMAP.md` - Phase 12 goal/success criteria and neighboring Phase 11/13 boundaries.
- `.planning/STATE.md` - Current delivered Phase 11 state, open Stripe/manual evidence caveats, and current focus.

### Prior Phase Decisions
- `.planning/phases/05-freemium-pro-mvp/05-CONTEXT.md` - Server-owned billing/entitlement/quota truth, Stripe checklist posture, Free/Pro projection, analytics, admin/beta ops, No False Done rules.
- `.planning/phases/07-premium-visual-ui-ux/07-CONTEXT.md` - Premium paid UI, billing/pricing/locks, state matrix, visual evidence, and pending Stripe checklist caveat.
- `.planning/phases/09-pubg-spray-lab-session-runner-and-benchmark/09-CONTEXT.md` - Evidence hierarchy, Free/Pro Lab projection, benchmark/state matrix expectations.
- `.planning/phases/10-guided-pro-training-programs/10-CONTEXT.md` - Ciclo Pro, program audit, Free/Pro program projection, launch value continuity.
- `.planning/phases/11-social-pro-community-premium/11-CONTEXT.md` - Social Pro analytics privacy, community as trust funnel, revenue/funnel analytics deferred to Phase 12.

### Operational Docs
- `docs/founder-beta-stripe-test-checklist.md` - Current paid founder beta Stripe checklist and blocked manual evidence rows.
- `docs/monetization-runbooks.md` - Existing incident runbooks for webhook failure, quota bug, price mismatch, fraud/dispute, grant abuse, analytics incident, checkout disabled, and safe mode.
- `docs/launch-readiness-2026-04-17.md` - Existing launch readiness posture for env, OAuth, production DB, deployed smoke, and readiness scripts.
- `docs/commercial-accuracy-readiness.md` - Commercial claim readiness rules and blocked/partial evidence posture for strong public claims.
- `docs/phase11-social-pro-verification.md` - Most recent phase verification style and No False Premium evidence posture.

### Codebase Maps
- `.planning/codebase/ARCHITECTURE.md` - Admin/operations architecture, browser-first pipeline, persistence, auth/admin/moderation, release readiness.
- `.planning/codebase/STACK.md` - Next.js App Router, strict TypeScript, Drizzle/Postgres, Vercel, Vitest/Playwright, scripts.
- `.planning/codebase/TESTING.md` - Unit/integration/e2e, benchmark, release, community, monetization, readiness expectations.
- `.planning/codebase/CONCERNS.md` - Production readiness, rate-limit, OAuth role-sync, local secrets, deployment caveats.
- `.planning/codebase/INTEGRATIONS.md` - Vercel, Neon, Auth providers, Discord bot, Groq, browser APIs, metadata/SEO integration.
- `.planning/codebase/CONVENTIONS.md` - Strict unions, server actions, schema/migration patterns, pt-BR copy posture, operational conventions.

### Existing Product Code
- `src/types/monetization.ts` - Billing/access/quota/event/flag/evidence enums and product entitlement keys.
- `src/lib/product-analytics.ts` - Privacy-minimal monetization analytics sanitizer and event recording helpers.
- `src/actions/admin-billing.ts` - Existing staff/admin billing snapshot, support notes, grants, suspension, reconciliation, and audit behavior.
- `src/app/admin/billing/page.tsx` - Current operational billing admin surface to extend or connect from Revenue Ops.
- `src/core/release-readiness.ts` - Existing release readiness gate model for local/deploy/backend readiness.
- `scripts/check-release-readiness.ts` - Existing readiness CLI runner for local/deploy/backend modes.
- `src/db/schema.ts` - Monetization tables: checkout attempts, subscriptions, processed Stripe events, grants, quota ledger, analytics events, support notes, billing events.
- `src/server/billing/stripe-fulfillment.ts` - Stripe fulfillment and lifecycle source of billing truth.
- `src/actions/billing.ts` - Checkout and Billing Portal server actions.
- `src/app/api/stripe/webhook/route.ts` - Signed Stripe webhook route and processed event integration.
- `package.json` - Existing monetization, readiness, benchmark, build, and phase verifier scripts; Phase 12 should add its own verifier.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `monetizationAnalyticsEvents` already stores privacy-minimal product events that can power aggregated funnel metrics.
- `productCheckoutAttempts`, `processedStripeEvents`, and `productSubscriptions` already separate checkout intent, webhook processing, and subscription/access truth.
- `productQuotaLedger` already records analysis save/quota events needed for usage-limit operations.
- `productSupportNotes` and `productBillingEvents` already provide support timeline and audit evidence.
- `resolveServerProductAccess` already centralizes paid access truth and should remain the source for current Pro/billing/quota state.
- `admin-billing.ts` already enforces staff/admin boundaries: support can inspect/note; admin performs grant/revoke/suspend/reconcile.
- `release-readiness.ts` already evaluates runtime env, public URL, auth URL, Vercel link, and ffmpeg/backend readiness.
- `monetization-runbooks.md` already defines safe degradation patterns and owners for key incidents.

### Established Patterns
- Server actions own authenticated mutations and user ownership/staff checks.
- Deterministic/server code owns paid truth; UI state and URLs never grant Pro.
- Analytics are best-effort and can drop events without breaking billing/entitlement truth.
- Product analytics metadata is allowlisted and scalar-only; prohibited private/payment/clip shapes are filtered.
- Free remains useful during incidents; confirmed paid users are preserved during checkout shutdown or safe mode.
- Phase-specific verifiers and evidence matrices are established patterns for "No False Done" gates.
- pt-BR copy is direct, premium, and operational; internal surfaces should still avoid overclaiming.

### Integration Points
- Add a Revenue Ops admin route or admin dashboard section connected to existing `/admin/billing`.
- Add funnel aggregation helpers over monetization analytics, checkout, subscription, quota, and billing event tables.
- Add a support-domain diagnosis model that classifies payment, entitlement, auth, quota, analysis, webhook, and admin grant states.
- Add a cause-tree helper for "why user does not have Pro" based on checkout, webhook, subscription, grant, flags, auth, and entitlement evidence.
- Add a paid-flow evidence matrix, likely as a docs artifact plus code-readable verifier expectations.
- Extend release readiness to include paid launch gates, Stripe environment separation, and launch gate outputs.
- Add `verify:phase12:revenue-ops` plus focused tests for metrics, privacy, diagnosis, role boundaries, evidence matrix, safe degradation, and no-go rules.
- Add Playwright/admin state evidence for the Revenue Ops cockpit if a UI route is implemented.

</code_context>

<specifics>
## Specific Ideas

- The user chose to discuss all Phase 12 blocks.
- The user explicitly asked for the funnel top to be "polido"; interpret this as launch-control polish, not extra decorative UI.
- The cockpit should feel like a serious operating room for paid launch decisions: concise, dense, evidence-backed, and action-oriented.
- The first screen should help decide whether to open beta/public launch, not merely inspect numbers.
- Support should not need to infer paid-state causes from raw timelines.
- Test-mode and production Stripe evidence must be visually and logically separated.
- A no-go state should make the next smallest verifiable step obvious.

</specifics>

<deferred>
## Deferred Ideas

- Team/coach revenue expansion remains Phase 13.
- Creator payouts, affiliate/referral payouts, tax/accounting, and detailed revenue finance remain future work.
- Public creator-facing funnel/revenue analytics remain out of scope.
- New payment providers, credits, one-off paid reviews, and seat billing remain future monetization phases.
- Backend video-processing launch readiness remains separate and cannot block the browser-first paid product unless the phase explicitly depends on it.

</deferred>

---

*Phase: 12-Revenue Operations Hardening*
*Context gathered: 2026-05-09T16:44:10.5897364-03:00*
