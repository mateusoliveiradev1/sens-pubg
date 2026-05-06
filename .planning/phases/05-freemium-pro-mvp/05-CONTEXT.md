# Phase 5: Freemium Pro MVP - Context

**Gathered:** 2026-05-06T00:29:55.8331021-03:00
**Status:** Ready for planning

<domain>
## Phase Boundary

This phase activates the first paid solo-player wedge for Sens PUBG: a safe freemium product, Pro monthly subscription, server-side usage limits, entitlement truth, honest paywall copy, and product analytics for activation and upgrade intent.

The phase sells original Sens PUBG value: user clip analysis, full coach plan, next-block training protocol, history, compatible trends, advanced metrics, and the solo improvement loop. It must not sell exclusive PUBG API-derived data, claim perfect sensitivity, guarantee rank improvement, or make the browser upload/analysis path depend on backend video processing.

The implementation should be production-grade for payments and entitlements, but this is not the final public launch. The recommended launch sequence is closed beta after Phase 5, then public launch only after premium UI/UX, guided Pro training programs, and revenue operations hardening are complete.

</domain>

<decisions>
## Implementation Decisions

### Free Limit And Usage Truth
- **D-01:** Free tier starts with **3 useful saved analyses per month**.
- **D-02:** The limit counts only analyses that are saved and produce a usable result. Technical save failures, processing errors, and inconclusive clips caused by weak capture quality do not consume the free monthly quota.
- **D-03:** The browser may process the video locally, but the server is the authority for whether the result can be saved, whether Pro-only data is returned, and whether a usage event is recorded.
- **D-04:** Do not rely on localStorage, URL params, client flags, or client-sent entitlement state for limits.
- **D-05:** Usage should be tracked with a server-side, auditable ledger rather than only counting rows opportunistically. Counting history rows may help as a fallback/check, but the ledger is the product truth for quota, analytics, and abuse review.
- **D-06:** Free limit blocks should become upgrade-intent events, not silent failures.

### Free Versus Pro Product Cut
- **D-07:** Free must be useful enough to earn trust: verdict, spray mastery score, basic confidence/coverage/inconclusive state, and a short coach/next-step summary.
- **D-08:** Pro unlocks the complete solo improvement loop: higher analysis limit, full coach plan, complete next-block training protocol, history, compatible trends/evolution lines, advanced metrics, outcome capture, validation loop, and dashboard active loop.
- **D-09:** Pro includes the full **next-block training protocol** already created by the coach system: objective, where/mode, duration, exercise, execution instructions, target, stop/continue criteria, and compatible validation clip.
- **D-10:** Phase 5 should prepare product entitlement names for future expansion instead of hard-coding one monolithic `isPro` branch everywhere. Suggested keys include `pro.analysis.higher_limit`, `pro.coach.full_plan`, `pro.training.next_block`, `pro.history.full`, `pro.trends.compatible`, `pro.metrics.advanced`, and `pro.outcomes.validation`.
- **D-11:** Exact Pro monthly quota is not locked by the user. Planner/researcher may choose a high but abuse-aware launch cap; avoid claiming unlimited unless rate limits, billing, and abuse controls are strong enough.

### Stripe Checkout And Payment Security
- **D-12:** Stripe is the payment provider for the Pro monthly MVP.
- **D-13:** Use Stripe-hosted Checkout for the MVP. Do not build a custom card form, do not handle card numbers/CVV, and do not confirm payment through a custom client-side flow.
- **D-14:** Pix is explicitly out of scope for Pro monthly MVP because it does not fit recurring Pro subscription in this launch shape. Pix may return later for credits, one-off reviews, or other non-recurring products.
- **D-15:** Checkout is created only on the server for an authenticated user.
- **D-16:** The client must not send `priceId`, amount, currency, plan, or entitlement. The client may request "start Pro monthly"; the server maps that to an internal allowlist such as `pro_monthly_brl` or `pro_monthly_usd`.
- **D-17:** Create an internal `checkoutAttemptId` before calling Stripe. Store user, selected internal price key, status, timestamps, and eventual Stripe Checkout Session ID.
- **D-18:** Call Stripe with an idempotency key based on the internal checkout attempt, so retries cannot create accidental duplicate sessions or charges.
- **D-19:** Stripe Checkout Session must include `client_reference_id`, `metadata.userId`, and `metadata.checkoutAttemptId` that match the authenticated user and internal attempt.
- **D-20:** The success URL never grants Pro. It may show "payment confirming" and ask the server for current entitlement status.
- **D-21:** Stripe webhook with verified signature is the source of payment truth. The webhook route must read raw body and verify `Stripe-Signature` with `STRIPE_WEBHOOK_SECRET` before parsing or processing.
- **D-22:** Store every Stripe event ID with a unique constraint and process fulfillment idempotently by `stripeEventId`, `checkoutSessionId`, and `subscriptionId`.
- **D-23:** Webhook fulfillment must reject or quarantine events whose metadata, customer, checkout attempt, subscription, or price does not match an internal expected record.
- **D-24:** Pro entitlement is granted only after trusted webhook/fulfillment confirms an active subscription state. Browser redirects, query strings, or optimistic client state never grant Pro.
- **D-25:** Use Stripe Billing Portal for cancellation, card updates, and subscription management. Do not build a custom billing-management UI in Phase 5.
- **D-26:** Secrets stay server-side: `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET`. Client publishable key is used only if the chosen UI path needs it.

### Subscription State Policy
- **D-27:** `active` subscription means Pro is available.
- **D-28:** `past_due` receives a 3-day grace period. During grace, UI must clearly ask the user to update payment.
- **D-29:** When grace expires, Pro-only features are blocked until payment recovers.
- **D-30:** User cancellation keeps Pro until the paid `current_period_end`.
- **D-31:** `canceled`, `unpaid`, `incomplete_expired`, or any state without a valid paid/grace window revokes Pro.
- **D-32:** Chargeback, fraud dispute, suspicious grant mismatch, or confirmed abuse suspends Pro immediately and writes an audit event.
- **D-33:** Canceling or losing Pro does not delete analysis history. It only blocks new Pro-only usage and hides/limits Pro-only surfaces according to entitlement policy.

### Anti-Fraud And Abuse Controls
- **D-34:** A shared server-side entitlement resolver is mandatory. Every premium route/action must call the resolver or a wrapper such as `requireProEntitlement`.
- **D-35:** All analysis save, history, trend, outcome, and Pro actions must scope queries to `session.user.id`. A user must never be able to save, read, or upgrade another user's account through client-provided IDs.
- **D-36:** Checkout creation should be rate-limited per user and IP.
- **D-37:** Webhook processing must be safe under retries, replay, concurrency, and out-of-order subscription events.
- **D-38:** Audit logs or payment events must record checkout created, webhook received, subscription activated, renewal succeeded, payment failed, grace started, cancellation, revocation, fraud/suspension, and manual support grants.
- **D-39:** Manual/admin entitlements may exist for support or beta access, but they must be explicitly sourced, time-bound when appropriate, and audited. They must not become a public bypass around Stripe.
- **D-40:** Tests must cover fake webhook, invalid signature, replayed event, price tampering, user metadata mismatch, success URL without webhook, canceled subscription, payment failure/grace, fraud suspension, and quota bypass attempts.

### Community Monetization Role
- **D-41:** Community remains primarily a funnel and trust surface in Phase 5, not the main paywalled product.
- **D-42:** Public feed, public posts, basic profiles, and basic community engagement should remain open/free where they already are open.
- **D-43:** Community can create upgrade intent by showing that richer Pro reports, trends, or training context exist, but it must not hide ordinary public posts behind the first Pro paywall.
- **D-44:** Pro/social features should be prepared for later phases: Pro badge, premium report sharing, saved drills, private collections, creator analytics, advanced context on posts, and team/coach review.
- **D-45:** Do not monetize exclusive PUBG API-derived data through community or Pro.

### Guided Pro Training Programs And "Not A Course" Positioning
- **D-46:** The future "almost course" idea is **not** a course product and should not be sold as course content. The intended product is a guided Pro training program generated and adapted from the user's real clips, coach decisions, outcomes, and compatible validations.
- **D-47:** Guided Pro programs increase value because they turn Sens PUBG from "more analyses" into a full improvement system: analyze -> train -> record outcome -> validate compatible clip -> adapt next block -> progress.
- **D-48:** Guided Pro programs are out of scope for Phase 5 implementation, but Phase 5 should prepare entitlement naming and paywall architecture so they can be added cleanly.
- **D-49:** Guided Pro programs should become a dedicated future phase before public launch if the goal is a polished "100%" launch. They include structured routines, weekly progression, missions by weapon/distance/scope, drill library, validation cadence, and guided continuation from active evolution lines.
- **D-50:** Physical preparation, ergonomics, and musculacao belong with the guided Pro training phase or a closely related follow-up, but must be framed safely as general preparation/routine support, not medical advice, injury treatment, or guaranteed performance gain.

### Roadmap And Launch Strategy
- **D-51:** The current active roadmap has Phase 5 Freemium Pro MVP, Phase 6 Team And Coach Expansion, and Phase 7 Revenue Operations Hardening. The user correctly noted that prior context also preserved future complete training and UI/UX premium phases.
- **D-52:** For a polished public launch, downstream planning should recommend inserting/adding dedicated phases before final public launch: Premium Visual/UI/UX, Guided Pro Training Programs, then Team/Coach expansion and Revenue Operations Hardening.
- **D-53:** A closed beta can happen after Phase 5 if checkout, entitlements, limits, and Pro loop are safe. Public launch should wait until payment ops, premium UI/UX, guided Pro training value, and revenue operations are ready.
- **D-54:** The final launch promise should not be "buy a course." It should be "upload real PUBG spray clips and follow an evidence-backed improvement program that adapts to your validations."

### Paywall Copy And Analytics
- **D-55:** Paywall copy must be premium, direct, and honest. It can sell full coach, history, trends, validation, and structured improvement, but cannot promise perfect sensitivity, guaranteed rank gain, or guaranteed improvement.
- **D-56:** Copy must clearly state Sens PUBG is independent from PUBG/KRAFTON.
- **D-57:** Product analytics for Phase 5 must record first usable analysis activation, free quota consumed, limit hit, paywall viewed, checkout started, checkout canceled, checkout completed/confirmed, Pro activated, payment failed, grace entered, Pro revoked, and premium feature attempted while locked.
- **D-58:** Analytics must avoid exposing secrets or private clip data. High-level funnel and event metadata are enough for Phase 5; admin revenue operations are later hardening.

### the agent's Discretion
The planner/researcher may choose exact database table names, Drizzle migration shape, Stripe API version, internal entitlement type names, Pro monthly cap, pricing research path, UI component split, and event schema. That discretion does not include weakening server-side entitlement truth, granting Pro from the client redirect, accepting arbitrary client price IDs, treating Pix as Pro monthly recurring MVP, hiding weak evidence, or turning community into the primary paywall before solo Pro is validated.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Planning Source
- `.planning/PROJECT.md` - Core value, browser-first constraint, monetization posture, original-value requirement, and confidence honesty.
- `.planning/REQUIREMENTS.md` - Phase 5 requirements: ANALYT-01, ANALYT-02, MON-01, MON-02, MON-03, MON-04, MON-05.
- `.planning/ROADMAP.md` - Current Phase 5 scope and current Phase 6/7 sequence that may need follow-up roadmap adjustment.
- `.planning/STATE.md` - Current project state: Phase 5 ready for monetization discussion/planning after completed Phases 1-4.

### Prior Phase Decisions
- `.planning/phases/01-measurement-truth-contract/01-CONTEXT.md` - Truth contract, training-block structure, premium report direction, complete programs deferred with physical preparation/musculacao.
- `.planning/phases/02-benchmark-expansion/02-CONTEXT.md` - Commercial/release benchmark gates and truth-contract protection for coach/next-block claims.
- `.planning/phases/03-multi-clip-precision-loop/03-CONTEXT.md` - Compatible trends, active evolution lines, coach/sensitivity/training as premium core, complete training blocks, future UI refactor.
- `.planning/phases/03-multi-clip-precision-loop/03-DISCUSSION-LOG.md` - User ambition for maximum coach/sens/training quality and future UI/premium polish.
- `.planning/phases/04-adaptive-coach-loop/04-CONTEXT.md` - Adaptive coach loop, outcomes, memory, aggressiveness, and LLM copy-only guardrails.
- `.planning/phases/04-adaptive-coach-loop/04-UI-SPEC.md` - Current approved UI contract for adaptive coach loop surfaces.

### Codebase Maps
- `.planning/codebase/ARCHITECTURE.md` - Browser-first pipeline, persistence model, existing entitlement scaffolding, admin/audit shape.
- `.planning/codebase/STACK.md` - Next.js, Auth.js, Drizzle/Postgres, Vercel, scripts, and optional LLM behavior.
- `.planning/codebase/TESTING.md` - Monetization test guidance, release checks, community verification, and benchmark gates.
- `.planning/codebase/CONCERNS.md` - Monetization inactive scaffold, in-memory rate limit caveat, production readiness gaps, local secrets warning.
- `.planning/codebase/INTEGRATIONS.md` - Vercel/Neon/Auth/Groq integration posture and env conventions.

### Research And Domain Docs
- `.planning/research/SUMMARY.md` - Freemium monthly strategy, paid value around full coach, trends/history, advanced metrics, repeat-clip loop, and premium training programs.
- `.planning/research/PITFALLS.md` - Avoid mixing solo, community, and B2B workflows in one release; monetize original analysis/coach/history/training workflow.
- `.planning/research/FEATURES.md` - Future guided training programs, daily missions, full coach plan, structured spray mastery programs.
- `.planning/research/ARCHITECTURE.md` - Entitlement-gated UX, server-side limits, and PUBG API monetization constraint.
- `docs/SDD-coach-extremo.md` - Coach operates across session, block, and program horizons; protocol outcomes and coach memory.
- `docs/SDD-comunidade.md` - Community entitlement scaffold, future creator analytics, community monetization boundary, and entitlement policy notes.
- `docs/SDD-analise-spray.md` - Spray analysis limits, physical viability, confidence, and anti-overclaim posture.
- `docs/SDD-inteligencia-de-sens.md` - Sensitivity intelligence, physical setup constraints, and recommendation safety.

### Existing Product Code
- `src/actions/history.ts` - Save-analysis path, coach enrichment, precision trend persistence, outcome actions, history reads; primary quota/enforcement integration point.
- `src/actions/dashboard.ts` - Dashboard active loop and trend data source; likely Pro dashboard gating point.
- `src/db/schema.ts` - Existing users, analysis sessions, precision lines/checkpoints, coach outcomes, audit logs, and inactive entitlement tables.
- `src/lib/community-entitlements.ts` - Existing community-only entitlement resolver that may inform but should not be blindly overloaded for product Pro.
- `src/lib/community-access.ts` - Existing access policy pattern with inactive entitlement hook.
- `src/lib/rate-limit.ts` - Current in-memory rate limiter; useful as local pattern but insufficient as sole production abuse control.
- `src/lib/safe-action.ts` - Existing authenticated action pattern.
- `src/middleware.ts` - Current route protection/rate-limit/security header behavior; note dashboard is not currently protected by middleware.
- `src/env.ts` and `.env.example` - Env validation and current absence of Stripe env vars.
- `src/app/analyze/analysis-client.tsx` - Browser-first analysis orchestration and call to `saveAnalysisResult`.
- `src/app/analyze/results-dashboard.tsx` - Free/Pro result surface and coach/trend detail gating candidate.
- `src/app/history/page.tsx` and `src/app/history/[id]/page.tsx` - History/trend/outcome audit surfaces that Pro should unlock fully.
- `src/app/community/page.tsx` and `src/core/community-discovery-view-model.ts` - Community as funnel/trust surface and future saved-drill/social upgrade cues.
- `src/ui/components/header.tsx` - Navigation entry point for pricing/Pro surfaces.
- `package.json` - Existing verification scripts; Phase 5 should add focused monetization/security tests and use relevant validation commands.

### Payment Provider References
- `https://docs.stripe.com/payments/checkout-sessions` - Checkout Sessions API and server-created checkout sessions.
- `https://docs.stripe.com/webhooks/signature` - Webhook signature verification using raw body and Stripe-Signature.
- `https://docs.stripe.com/checkout/fulfillment` - Webhook-based fulfillment, idempotent fulfillment, and payment status checks.
- `https://docs.stripe.com/api/idempotent_requests` - Idempotent Stripe requests for retry safety.
- `https://docs.stripe.com/billing/subscriptions/webhooks` - Subscription events for active, failed, updated, and deleted subscription states.
- `https://docs.stripe.com/billing/testing` - Billing integration test scenarios before production.
- `https://docs.stripe.com/payments/pix?locale=pt-BR` - Pix support and limitation that recurring payments are not supported for this MVP subscription use.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/actions/history.ts`: currently saves every authenticated analysis result; it is the central place to enforce free quota, record usage, and return free-vs-Pro result shapes.
- `src/db/schema.ts`: already has users, analysis sessions, coach outcomes, precision lines/checkpoints, audit logs, and inactive community entitlement tables. Phase 5 should add product billing/subscription/usage tables or generalize entitlement tables carefully.
- `src/lib/community-entitlements.ts`: proves the project already uses resolver-based entitlement thinking, but the keys are community-specific. Product Pro entitlements should not be forced into `CommunityEntitlementKey` without a deliberate schema/type change.
- `src/lib/safe-action.ts` and `auth()` patterns: provide existing authenticated server-side enforcement style.
- `src/app/analyze/results-dashboard.tsx`, `src/app/history/page.tsx`, `src/app/dashboard/dashboard-truth-view-model.ts`: natural Pro gating surfaces for full coach, trends, metrics, outcomes, and active loop.
- `src/core/coach-plan-builder.ts`, `src/core/coach-memory.ts`, `src/core/precision-loop.ts`, and `src/types/engine.ts`: already provide the premium training loop primitives that Phase 5 monetizes.

### Established Patterns
- Browser-first analysis is the product path; server-side billing and entitlement enforcement must wrap saved results and premium surfaces without moving video processing to the backend.
- Deterministic code owns truth. Optional LLM can rewrite copy only and cannot change technical facts.
- User-facing claims must remain confidence-aware and evidence-gated.
- Tests are expected for policy modules, server actions, UI contracts, and commercial claims.
- Community is already built with server actions, access policies, moderation, and future entitlements; Phase 5 should reuse patterns, not accidentally make UI the only enforcement.

### Integration Points
- New Stripe integration likely needs `src/lib/stripe.ts`, checkout action/route, webhook route, env validation, billing/subscription persistence, and test doubles.
- Quota/usage enforcement likely touches `src/actions/history.ts`, analysis result return shape, and UI paywall affordances in analysis/history/dashboard.
- Product entitlements likely need a product-level resolver used by server actions and server-rendered pages.
- Payment status surfaces likely need `/pricing`, `/billing`, `/checkout/success` or equivalent pages, plus Header navigation.
- Analytics events likely need product event tables or a privacy-safe event recorder, later consumed by admin/revenue ops.

</code_context>

<specifics>
## Specific Ideas

- The user wants the checkout to be "extremely secure" and production-grade through Stripe, with no weak client-side entitlement shortcut.
- The user accepted 3 useful saved free analyses per month as the initial free quota.
- The user accepted Stripe-hosted Checkout, no Pix for Pro monthly MVP, webhook-signed entitlement truth, 3-day `past_due` grace, and immediate fraud/chargeback suspension.
- The user wants community as funnel/trust now, with social Pro features prepared for later phases before real public launch.
- The user clarified that future "almost course" value must not be sold as a course. It is a guided Pro training program/system based on the user's clips, coach, training blocks, validations, and progression.
- The user noticed that complete training and premium UI/UX phases were already part of the broader vision. The Phase 5 context must preserve them as launch-critical future phases, not generic backlog.

</specifics>

<deferred>
## Deferred Ideas

- Premium Visual/UI/UX phase before public launch: full polish across analysis, dashboard, history, pricing/paywall, billing states, and community cues.
- Guided Pro Training Programs phase before public launch: structured routines, weekly progression, missions, drill library, active-line continuation, and validation cadence. This is not a "course" product.
- Physical preparation, ergonomics, and musculacao: future Pro training capability with safety framing, no medical/injury promises, and likely its own expert-reviewed contract.
- Social Pro/community expansion: Pro badge, premium report sharing, saved drills, private collections, creator analytics, and advanced post context.
- Team/coach paid workflow: multi-player review, coach/team dashboard, seats, and report access after solo Pro is validated.
- Pix/credits/manual reviews: future non-recurring monetization path, not part of Pro monthly MVP.

</deferred>

---

*Phase: 5-Freemium Pro MVP*
*Context gathered: 2026-05-06T00:29:55.8331021-03:00*
