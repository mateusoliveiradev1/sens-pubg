# Phase 5: Freemium Pro MVP - Context

**Gathered:** 2026-05-06T02:32:41.6035853-03:00
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
- **D-51:** The roadmap is updated from the original 7-phase sequence into a 13-phase launch-perfect sequence that preserves Phase 5 as the safe monetization wedge and adds validation, UI/UX, complete training, Spray Lab, guided programs, social Pro, revenue operations, and team/coach expansion before or around public launch readiness.
- **D-52:** For a polished public launch, downstream planning should treat these as launch-critical phases: Core Accuracy And Pro Validation Hardening, Premium Visual/UI/UX, Complete Training Protocols, PUBG Spray Lab/Session Runner/Benchmark, Guided Pro Training Programs, Social Pro/Community Premium, Revenue Operations Hardening, and Team/Coach Expansion.
- **D-53:** A closed beta can happen after Phase 5 if checkout, entitlements, limits, and Pro loop are safe. Public launch should wait until payment ops, premium UI/UX, guided Pro training value, and revenue operations are ready.
- **D-54:** The final launch promise should not be "buy a course." It should be "upload real PUBG spray clips and follow an evidence-backed improvement program that adapts to your validations."

### Paywall Copy And Analytics
- **D-55:** Paywall copy must be premium, direct, and honest. It can sell full coach, history, trends, validation, and structured improvement, but cannot promise perfect sensitivity, guaranteed rank gain, or guaranteed improvement.
- **D-56:** Copy must clearly state Sens PUBG is independent from PUBG/KRAFTON.
- **D-57:** Product analytics for Phase 5 must record first usable analysis activation, free quota consumed, limit hit, paywall viewed, checkout started, checkout canceled, checkout completed/confirmed, Pro activated, payment failed, grace entered, Pro revoked, and premium feature attempted while locked.
- **D-58:** Analytics must avoid exposing secrets or private clip data. High-level funnel and event metadata are enough for Phase 5; admin revenue operations are later hardening.

### Core Validation, Public Video Use, And Spray Lab
- **D-59:** The current spray analysis engine is strong enough to continue toward closed beta with honest claims, but it must not be treated as "perfect" or fully public-launch ready until a dedicated Core Accuracy And Pro Validation Hardening phase expands real/pro validation and confidence calibration.
- **D-60:** Public YouTube/Twitch/pro match videos may be used for qualitative reference, product research, discovery of creators/pros, and manual hypothesis generation.
- **D-61:** Do not scrape, download, or automatically extract frames/features/metrics from third-party public videos for commercial engine training or validation unless there is explicit permission, verified trainability, or another documented legal basis.
- **D-62:** Create a Pro Spray Validation Corpus from user clips, advanced players, coaches, pros, partners, or videos with verified training permission. Store provenance, consent, metadata, review status, and golden promotion criteria.
- **D-63:** Core validation should improve spray start/end detection, camera-motion/flick/cut separation, recoil tracking, weak-quality handling, confidence calibration, diagnosis quality, and coach/training handoff.
- **D-64:** A PUBG Spray Lab/Session Runner/Benchmark phase should make Sens PUBG feel like an "Aim Lab focused on PUBG": guided drills, sessions, reps, weapon/scope/distance objectives, benchmarks, and validation prompts tied back to real clip analysis.

### Founder Pricing And Stripe Price Architecture
- **D-65:** Phase 5 founder beta price is locked as **R$19,90/month** for Brazil and **US$7.99/month** globally.
- **D-66:** Public launch target price is **R$29,90/month** for Brazil and **US$9.99/month** globally, after launch-critical validation, premium UI/UX, training, and revenue-ops phases.
- **D-67:** Founder subscribers keep the founder price for 12 months while the subscription stays active. If the user cancels and later returns, founder protection is not guaranteed.
- **D-68:** Annual plans are out of Phase 5, but the internal catalog/schema should leave a clean path for future yearly prices.
- **D-69:** Use a server-owned internal price catalog with stable keys: `pro_founder_brl_monthly`, `pro_founder_usd_monthly`, `pro_public_brl_monthly`, `pro_public_usd_monthly`, and future planned yearly keys.
- **D-70:** Each internal price key maps server-side to Stripe Price IDs per environment (`test` and `production`). The client never sends Stripe Price IDs, amount, currency, plan, or entitlement.
- **D-71:** Founder price can only appear when founder beta is enabled and the user is eligible by allowlist, invite, cohort, or admin decision.
- **D-72:** Do not mutate a Stripe Price already used by subscribers. Future price changes create new Stripe Prices and update the internal catalog.
- **D-73:** Default currency should be BRL for Brazil, USD for global/unknown users, or a safe server-side/manual selection; client-side locale alone is not payment truth.
- **D-74:** Stripe resources may be set up with the connected Stripe MCP when the user explicitly authorizes it. Account selection, legal/bank details, live activation, and secrets remain user-controlled.
- **D-75:** Prefer a separate Stripe account/workspace for Sens PUBG if the user's current Stripe account already serves another project.

### Pro Quota Truth Contract
- **D-76:** Pro founder/beta starts with **100 useful saved analyses per Stripe billing cycle**.
- **D-77:** Quota is transparent. Do not market Pro as unlimited in Phase 5.
- **D-78:** Show a discrete warning around `80/100`, and block new billable Pro saves at `100/100` with a safe CTA.
- **D-79:** One billable unit is exactly one saved upload/session with a usable result. It is not counted per frame, metric, sub-session, or local reprocess.
- **D-80:** Uploads with multiple sub-sessions count as one saved analysis when saved as one analysis result.
- **D-81:** Usable but limited results count. Technical failures, failed saves, quota/entitlement-blocked attempts, local reprocesses without save, and weak-capture inconclusive clips do not count.
- **D-82:** Server-side quota must use an idempotent ledger with `analysisSaveAttemptId`, reservation/finalization/void states, reason codes, and auditability.
- **D-83:** Concurrent saves near the limit must be transactionally safe. Multiple tabs, retries, or duplicate requests cannot exceed the quota.
- **D-84:** Deleting an analysis does not automatically refund quota; support/admin may correct exceptional cases with an audited adjustment/grant.
- **D-85:** Free usage periods are computed server-side in UTC. Pro usage periods come from Stripe subscription period fields. Client clock, timezone, URL params, or localStorage never decide period access.
- **D-86:** The client never sends `periodStart`, `periodEnd`, `currentPeriodEnd`, `resetsAt`, used quota, remaining quota, or "current month" as trusted values.
- **D-87:** Server validates entitlement and quota at save time, not only at page-render time.
- **D-88:** Webhook replay/out-of-order events cannot move a quota/billing period backward or re-open access without explicit reconciliation rules.
- **D-89:** Quota low/exhausted warnings should appear before the user spends time processing where the server already knows saving will be blocked.
- **D-90:** If a user legitimately exceeds 100 analyses in beta, that is signal for future Pro+ / credits / team workflow, not Phase 5 scope expansion.
- **D-91:** Quota events must carry safe reason codes such as `billable`, `non_billable_weak_capture`, `technical_failure`, `limit_blocked`, and `support_adjustment`.

### Free Versus Pro Matrix And Capture Onboarding
- **D-92:** Free remains a real trust-building product, not a broken demo: verdict, spray mastery, confidence/coverage, inconclusive state, primary diagnosis summary, and short next step.
- **D-93:** Pro is the complete solo improvement loop: full coach, full protocol, history, compatible trends, evolution lines/checkpoints, advanced metrics, outcome capture, validation loop, and dashboard active loop.
- **D-94:** Pro previews in Free must be honest. They may show that trends/protocol/history value exists, but must not blur deceptively, fake data, or hide truth-contract evidence needed for confidence.
- **D-95:** Locked surfaces must explain safe blocker reasons, such as `limit_reached`, `pro_feature`, `payment_issue`, `weak_evidence`, or `not_enough_history`.
- **D-96:** Phase 5 must reduce beta capture friction with compact capture/metadata guidance before upload: weapon, scope, distance, stance, attachments, continuous spray, visible crosshair, no hard cut/flick, and minimum duration.
- **D-97:** Missing required metadata can block readiness, but the UI should not over-block upload when honest degradation and guidance are enough.
- **D-98:** Weak or inconclusive clips should return structured non-billable failure reasons such as `missing_metadata`, `crosshair_not_visible`, `too_short`, `camera_motion`, `hard_flick_or_cut`, `distance_ambiguous`, `loadout_ambiguous`, `low_confidence`, and `not_spray_protocol`.
- **D-99:** Beginner/casual beta copy should guide without shaming: capture failure is treated as "we need better evidence", not as user failure or product failure.

### Entitlement Resolver And Taxonomy
- **D-100:** Phase 5 must not spread a simple `isPro` boolean across the codebase.
- **D-101:** A shared entitlement resolver should return `effectiveTier`, `accessState`, `source`, `billingStatus`, `quota`, `features`, `blockers`, period/expiry fields, and safe audit references.
- **D-102:** Access states should cover free, free limit reached, checkout pending, Pro active, founder active, past_due grace, past_due blocked, canceling, canceled, suspended, manual grant active, and manual grant expired.
- **D-103:** Precedence is locked: suspension/fraud/chargeback wins over everything; Stripe active/founder/canceling grants Pro until period end; past_due grants only during grace; active manual grants grant when Stripe does not; expired/canceled/free do not grant.
- **D-104:** Quota may block new saves even when Pro is active, but cannot delete history or billing access.
- **D-105:** Introduce a namespaced entitlement taxonomy with active Phase 5 keys, operational/admin keys, and planned future keys.
- **D-106:** Active Phase 5 keys include `analysis.save.free_limit`, `analysis.save.pro_limit`, `analysis.save.quota_warning`, `coach.summary`, `coach.full_plan`, `training.next_block_protocol`, `history.basic_recent`, `history.full`, `trends.compatible_summary`, `trends.compatible_full`, `precision.evolution_lines`, `precision.checkpoints`, `metrics.basic`, `metrics.advanced`, `coach.outcome_capture`, `coach.validation_loop`, and `billing.portal_access`.
- **D-107:** Operational keys include `admin.entitlements.view`, `admin.entitlements.grant`, `admin.entitlements.revoke`, `admin.entitlements.suspend`, `admin.billing.reconcile`, `support.entitlements.view`, and `support.entitlements.note`.
- **D-108:** Planned future keys include `programs.guided_weekly`, `programs.guided_monthly`, `spray_lab.session_runner`, `spray_lab.benchmarks`, `community.pro_badge`, `community.premium_report_share`, `community.creator_attribution`, `team.player_review`, and `team.seats`.
- **D-109:** Each entitlement key should carry metadata: status, tier, surface, public label key, internal description, introduced phase, owner domain, and gating mode.
- **D-110:** Existing community entitlements may inform patterns, but product Pro should not be blindly forced into community-only entitlement types without explicit migration/adaptation.

### Paid UX, Pricing Page, Checkout, And Founder Messaging
- **D-111:** Phase 5 needs a complete but restrained paid UX: `/pricing`, contextual locks, `/checkout/success`, `/checkout/cancel`, `/billing`, Header/account CTAs, quota warnings, and payment-state surfaces.
- **D-112:** `/pricing` is a state-aware conversion and trust page, not a generic pricing table.
- **D-113:** First viewport should clearly sell `Sens PUBG Pro` / `Sens PUBG Pro Founder`, the evidence loop, founder eligibility, price, and state-based CTA.
- **D-114:** `/pricing` must explain the loop: real clip -> evidence -> protocol -> compatible validation -> next block.
- **D-115:** `/pricing` must answer fears about quota, refunds, cancellation, history retention, beginner usefulness, and PUBG/KRAFTON independence.
- **D-116:** Pricing CTAs depend on entitlement state: login, request invite, founder checkout, open billing, update payment, or support/review.
- **D-117:** Founder messaging must be honest: lower early price, closed beta, limited slots, full Pro loop, feedback expectation, safe cancellation/support, no aggressive pressure tactics, and no performance guarantees.
- **D-118:** Use cohort-specific founder invite copy for beginner/casual, serious/competitive, streamer/creator, and coach/advisor users.
- **D-119:** Paid founder beta requires a production-polished Stripe-hosted Checkout and Billing Portal experience before charging real users.
- **D-120:** Stripe-hosted Checkout polish includes Sens PUBG branding, clear product name, honest subscription description, correct BRL/USD price display, support/policy details, and clean success/cancel flow.
- **D-121:** Success URL never grants Pro. It shows confirmation/pending state and asks the server for entitlement truth.
- **D-122:** If Stripe Checkout/Portal branding or product naming is generic/confusing, founder paid beta must not open.

### Beta Cohorts, Creator Preview, And Launch Gates
- **D-123:** Beta starts grant-only and cohort-based before paid founder selling.
- **D-124:** Cohorts are: internal sanity, beginner/casual, serious/competitive, and coach/creator/advisor.
- **D-125:** Internal sanity starts with roughly 3-5 trusted users; beginner/casual with roughly 5-10; serious/competitive with roughly 5-15; coach/creator/advisor with roughly 1-3.
- **D-126:** Feedback must be interpreted by cohort. Beginner confusion, competitive precision critique, creator messaging feedback, and coach trust critique mean different things.
- **D-127:** Friends/streamers may be used for controlled creator beta, not broad public marketing in Phase 5.
- **D-128:** Creator beta should start grant-first, then limited founder invite codes after gates pass.
- **D-129:** Creator/streamer access requires disclosure when they receive beta access, discount, grant, or any material benefit.
- **D-130:** No affiliate/commission program in Phase 5; attribution codes and creator tags are enough.
- **D-131:** Paid founder beta opens only after Phase 5 paid-flow UX is clean and critical gates pass.
- **D-132:** Public launch waits for Premium Visual UI/UX, validation, complete training, revenue operations, and other launch-critical phases.

### Admin, Support, Refunds, And Operational Controls
- **D-133:** Phase 5 must add a minimal secure admin entitlement surface, likely `/admin/billing` or `/admin/entitlements`; it is not a full revenue dashboard.
- **D-134:** Admin surface must support user lookup, effective tier/status/source, quota, subscription/customer refs, current period end, checkout attempts, billing/quota/grant events, blockers, and audit links.
- **D-135:** Admin-only actions include create/revoke grant, apply/remove suspension, force Stripe reconciliation, and record support notes.
- **D-136:** Support may view status and add/escalate notes, but cannot grant/revoke/suspend Pro.
- **D-137:** Manual grants require category, reason, actor, target, starts/ends, entitlement keys, optional quota boost, and audit log.
- **D-138:** Refund/cancel/support policy must be explicit, non-hostile, Stripe-authoritative, audit-backed, Brazil-aware, and must never delete history.
- **D-139:** Normal cancellation happens through Stripe Billing Portal and preserves Pro until `current_period_end`.
- **D-140:** Total refund for the current cycle may revoke Pro according to explicit product policy; refund pending/failed must not change entitlement until confirmed.
- **D-141:** Chargeback, dispute, fraud, or serious abuse creates `pro_suspended` immediately and wins over Stripe active state and grants.
- **D-142:** The product should prepare clear refund/arrependimento copy for Brazil and legal review before public launch; do not use hostile "no refunds ever" language.

### Rollout, Kill Switches, And Incident Control
- **D-143:** Phase 5 must ship server-side, audit-backed monetization flags/toggles.
- **D-144:** Required controls include checkout enabled, founder enabled, portal enabled, entitlement enforcement enabled, entitlement safe mode, grants enabled, monetization analytics enabled, and future public pricing enabled.
- **D-145:** Flags are server-side and auditable. The client cannot control them.
- **D-146:** Webhook signature enforcement must never be disabled in production.
- **D-147:** Disabling checkout must not revoke legitimate paid users.
- **D-148:** Safe mode must not silently grant Pro to everyone. It needs explicit behavior such as preserving confirmed paid access, blocking new checkout, pausing quota consumption, and showing an honest degraded-state message.
- **D-149:** Runbooks are required for webhook failure, quota ledger bug, price mismatch, fraud/dispute spike, admin grant abuse, and analytics incident.
- **D-150:** Rollout sequence is: local/test mode -> internal grant beta -> private cohort grant beta -> creator preview -> founder paid allowlist -> slot expansion -> future public launch.

### Analytics, Privacy, And Legacy Transition
- **D-151:** Phase 5 event ledger should be broad across the monetization funnel but privacy-minimal.
- **D-152:** Track activation, quota, upgrade intent, checkout, webhook/fulfillment, Pro lifecycle, billing portal, admin/grants, and Pro feature value.
- **D-153:** Analytics must not store raw video, frames, aim trajectory, full technical analysis payload, filename, private notes, card data, CPF/document, address, or bank data.
- **D-154:** Safe analytics metadata may include event type, user ID, timestamp, surface, feature key, access state, quota state, price key, billing state, reason code, cohort tag, creator code, and event source.
- **D-155:** Billing persistence may store Stripe customer ID, subscription ID, checkout session ID, event ID, checkout attempt ID, internal price key, normalized status, and period dates.
- **D-156:** Audit logs must capture critical operations: checkout created, webhook processed/rejected, entitlement granted/revoked/suspended, grant changed, flag changed, refund/dispute handled, and quota adjustment.
- **D-157:** Separate retention posture by billing/audit, analytics, and product history. Phase 12 should harden retention, admin metrics, and privacy operations.
- **D-158:** Legacy history is preserved. Existing users start as `legacy_free`/free without automatic Pro.
- **D-159:** Old analyses do not consume Phase 5 quota.
- **D-160:** Pro may use existing historical clips for trends/memory when evidence is compatible and the user has Pro access.
- **D-161:** Analytics must distinguish pre-existing users from first usable analysis after Phase 5 instrumentation.
- **D-162:** Gating deeper historical value through Pro must not delete, falsify, or confiscate existing evidence.

### Security, Verification, And No False Done
- **D-163:** Phase 5 monetization is security-first: allowlisted server checkout, signed/idempotent webhook fulfillment, reconciliation, transactional quota ledger, audited admin grants, privacy-minimal analytics, and explicit abuse/payment edge-case tests.
- **D-164:** Required automated gates include `npm run typecheck`, `npx vitest run`, `npm run benchmark:gate`, `npm run build`, and a focused `npm run test:monetization`.
- **D-165:** Focused tests must cover entitlement resolver, quota ledger, checkout creation, webhook verification/replay/out-of-order, subscription lifecycle, admin grants, analytics privacy, UI/page contracts, copy safety, and `saveAnalysisResult` bypass prevention.
- **D-166:** Founder paid beta cannot open unless automated gates pass and a manual Stripe test-mode checklist proves pricing -> checkout -> success pending -> webhook confirm -> Pro active -> billing/portal -> cancel/payment failure/suspension/admin grant flows.
- **D-167:** Phase 5 has a hard No False Done rule. Delivery claims require objective evidence.
- **D-168:** If any mandatory gate fails, status is `not delivered`. If a gate cannot run due to env/Stripe/secrets, maximum status is `implemented, verification blocked`.
- **D-169:** Every Phase 5 plan/summary must include a requirement-by-requirement verification table with implementation evidence, automated test, command, result, manual evidence when relevant, and remaining gaps.
- **D-170:** Final status must explicitly say `Delivered`, `Partially delivered`, or `Blocked`. No "should work" language without proof.
- **D-171:** Phase 5 is not ready for execution unless planning decomposes billing, entitlement/quota, premium enforcement, paid UX, admin ops, analytics/privacy, copy safety, and verification into explicit waves with files, tests, rollback, threats, acceptance criteria, and No False Done evidence requirements.
- **D-172:** Planning must not grant Pro from success URL, accept client Price IDs, trust client time/quota, rely on localStorage for entitlement, omit webhook signature verification, omit idempotency/replay handling, omit audit logs, omit copy tests, or omit No False Done verification.

### the agent's Discretion
The planner/researcher may choose exact database table names, Drizzle migration shape, Stripe API version, internal TypeScript module boundaries, UI component split, event table shape, runbook file names, and detailed ordering inside Phase 5 waves. That discretion does not include changing founder/public price targets, weakening server-side entitlement truth, granting Pro from the client redirect, accepting arbitrary client Price IDs, trusting client time/quota/entitlement state, treating Pix as Pro monthly recurring MVP, hiding weak evidence, turning community into the primary paywall before solo Pro is validated, opening paid founder beta before required gates pass, or making strong public paid claims before the Core Accuracy and Pro Validation gates are satisfied.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Planning Source
- `.planning/PROJECT.md` - Core value, browser-first constraint, monetization posture, original-value requirement, and confidence honesty.
- `.planning/REQUIREMENTS.md` - Phase 5 requirements: ANALYT-01, ANALYT-02, MON-01, MON-02, MON-03, MON-04, MON-05.
- `.planning/ROADMAP.md` - Updated 13-phase roadmap with Phase 5 monetization, Core Accuracy validation, premium UI/UX, complete training, PUBG Spray Lab, guided Pro programs, social Pro, revenue operations, and team/coach expansion.
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
- `src/app/admin/layout.tsx` - Existing role-protected admin shell for admin/mod/support; Phase 5 admin billing/entitlement surface should fit this pattern.
- `src/app/admin/users/page.tsx` and `src/app/admin/users/role-selector.tsx` - Existing user administration pattern and role-editing UI.
- `src/app/admin/logs/page.tsx` - Existing audit-log surface that should connect to billing/entitlement/grant events.
- `src/actions/admin.ts` - Existing admin-only server action pattern and audit logging for role changes.
- `package.json` - Existing verification scripts; Phase 5 should add focused monetization/security tests and use relevant validation commands.

### Payment Provider References
- `https://docs.stripe.com/payments/checkout-sessions` - Checkout Sessions API and server-created checkout sessions.
- `https://docs.stripe.com/webhooks/signature` - Webhook signature verification using raw body and Stripe-Signature.
- `https://docs.stripe.com/checkout/fulfillment` - Webhook-based fulfillment, idempotent fulfillment, and payment status checks.
- `https://docs.stripe.com/api/idempotent_requests` - Idempotent Stripe requests for retry safety.
- `https://docs.stripe.com/billing/subscriptions/webhooks` - Subscription events for active, failed, updated, and deleted subscription states.
- `https://docs.stripe.com/billing/testing` - Billing integration test scenarios before production.
- `https://docs.stripe.com/payments/pix?locale=pt-BR` - Pix support and limitation that recurring payments are not supported for this MVP subscription use.
- `https://docs.stripe.com/payments/checkout/customization` - Stripe-hosted Checkout branding/customization limits for a polished founder beta flow.
- `https://docs.stripe.com/customer-management` - Stripe Billing Portal / customer portal behavior and branding considerations.
- `https://docs.stripe.com/refunds` - Refund behavior and references for support/refund policy.
- `https://docs.stripe.com/billing/subscriptions/cancel` - Subscription cancellation behavior, including cancel-at-period-end and dispute-related subscription handling.
- `https://docs.stripe.com/keys` - Stripe test/live key separation and secret handling.
- `https://docs.stripe.com/multiple-accounts` - Stripe multiple-account guidance; relevant because the user may already use Stripe for another project.

### Legal / Policy References
- `https://www.planalto.gov.br/ccivil_03/leis/l8078compilado.htm` - Brazil consumer-law reference for arrependimento/refund copy posture before public launch.
- `https://www.ftc.gov/business-guidance/resources/disclosures-101-social-media-influencers` - Creator/streamer disclosure reference when beta access, discounts, grants, or other benefits exist.

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
- `src/app/admin/layout.tsx`, `src/app/admin/users/page.tsx`, `src/app/admin/logs/page.tsx`, and `src/actions/admin.ts`: existing admin shell, user lookup/role pattern, and audit-log pattern for a minimal billing/entitlement admin surface.
- `src/lib/rate-limit.ts`: existing local rate-limit pattern for checkout/admin actions, with the caveat that durable/shared production rate limiting is a later hardening need.

### Established Patterns
- Browser-first analysis is the product path; server-side billing and entitlement enforcement must wrap saved results and premium surfaces without moving video processing to the backend.
- Deterministic code owns truth. Optional LLM can rewrite copy only and cannot change technical facts.
- User-facing claims must remain confidence-aware and evidence-gated.
- Tests are expected for policy modules, server actions, UI contracts, and commercial claims.
- Community is already built with server actions, access policies, moderation, and future entitlements; Phase 5 should reuse patterns, not accidentally make UI the only enforcement.
- Admin operations already distinguish roles (`admin`, `mod`, `support`); Phase 5 must keep grant/revoke/suspend admin-only while allowing support read/escalation behavior.
- Existing audit logging should be extended for billing, entitlement, grants, flags, refunds/disputes, and quota adjustments.

### Integration Points
- New Stripe integration likely needs `src/lib/stripe.ts`, checkout action/route, webhook route, env validation, billing/subscription persistence, and test doubles.
- Quota/usage enforcement likely touches `src/actions/history.ts`, analysis result return shape, and UI paywall affordances in analysis/history/dashboard.
- Product entitlements likely need a product-level resolver used by server actions and server-rendered pages.
- Payment status surfaces likely need `/pricing`, `/billing`, `/checkout/success` or equivalent pages, plus Header navigation.
- Analytics events likely need product event tables or a privacy-safe event recorder, later consumed by admin/revenue ops.
- Admin entitlement work likely adds `/admin/billing` or `/admin/entitlements` plus server actions for grant/revoke/suspend/reconcile/note.
- Rollout flags likely connect to env/config/system settings; any production-critical flag changes must be server-side and auditable.
- Stripe MCP can assist setup/listing/creation of products and prices during implementation when the user explicitly authorizes it, but secrets and live activation remain outside code/planning artifacts.

</code_context>

<specifics>
## Specific Ideas

- The user wants the checkout to be "extremely secure" and production-grade through Stripe, with no weak client-side entitlement shortcut.
- The user accepted 3 useful saved free analyses per month as the initial free quota.
- The user accepted Stripe-hosted Checkout, no Pix for Pro monthly MVP, webhook-signed entitlement truth, 3-day `past_due` grace, and immediate fraud/chargeback suspension.
- The user wants community as funnel/trust now, with social Pro features prepared for later phases before real public launch.
- The user clarified that future "almost course" value must not be sold as a course. It is a guided Pro training program/system based on the user's clips, coach, training blocks, validations, and progression.
- The user noticed that complete training and premium UI/UX phases were already part of the broader vision. The Phase 5 context must preserve them as launch-critical future phases, not generic backlog.
- The user wants deeper spray clip analysis improvements captured in the new Core Accuracy phase, including a stronger validation path before public commercial claims.
- The user wants the future lab/program product to feel like a complete PUBG-specific improvement lab, not just analysis volume or a generic training course.
- The user approved founder beta pricing: R$19,90/month and US$7.99/month, with public launch target of R$29,90/month and US$9.99/month.
- The user wants founder beta paid checkout to feel polished and production-ready immediately, even though the broader premium visual pass remains Phase 7.
- The user confirmed Stripe MCP is connected and may be used later for setup assist, but only with explicit authorization and without exposing secrets.
- The user is worried about prior phases being called "delivered" while broken; Phase 5 must enforce No False Done with evidence, not vibes.
- The user has friends who play PUBG at different skill levels and friends who stream. Phase 5 beta should use cohort tags and controlled creator preview instead of broad public marketing.
- The user wants a later Portuguese `.md` playbook for beta invitations, who to invite, how many people, streamer guidance, and founder-beta readiness.

</specifics>

<deferred>
## Deferred Ideas

- Premium Visual/UI/UX phase before public launch: full polish across analysis, dashboard, history, pricing/paywall, billing states, and community cues.
- Core Accuracy And Pro Validation Hardening: deeper spray detection/tracking, real/pro validation corpus, specialist review, confidence calibration, and commercial benchmark gates.
- Guided Pro Training Programs phase before public launch: structured routines, weekly progression, missions, drill library, active-line continuation, and validation cadence. This is not a "course" product.
- PUBG Spray Lab / Session Runner / Benchmark: guided drills, reps, sessions, weapon/scope/distance objectives, and lab benchmarks tied back to clip validation.
- Physical preparation, ergonomics, and musculacao: future Pro training capability with safety framing, no medical/injury promises, and likely its own expert-reviewed contract.
- Social Pro/community expansion: Pro badge, premium report sharing, saved drills, private collections, creator analytics, and advanced post context.
- Team/coach paid workflow: multi-player review, coach/team dashboard, seats, and report access after solo Pro is validated.
- Pix/credits/manual reviews: future non-recurring monetization path, not part of Pro monthly MVP.
- Annual Pro plans: prepare catalog/schema, but do not sell in Phase 5.
- Pro+ / credits / higher quota path for legitimate heavy users beyond 100 saved analyses per cycle.
- Full affiliate/referral/creator commission program; Phase 5 only tracks creator tags/codes.
- Full revenue operations dashboard, retention/churn/ARPU/cohort UI, and finance reporting; belongs in Phase 12.
- Full LGPD/privacy account export/delete and final retention policy hardening; Phase 5 stays privacy-minimal and hands off to Phase 12/legal hardening.
- Public-launch legal review for refund/arrependimento and commercial copy.

</deferred>

---

*Phase: 5-Freemium Pro MVP*
*Context gathered: 2026-05-06T02:32:41.6035853-03:00*
