# Phase 5: Freemium Pro MVP - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md. This log preserves the alternatives considered.

**Date:** 2026-05-06T02:32:41.6035853-03:00
**Phase:** 5-Freemium Pro MVP
**Areas discussed:** Free limit, Checkout security, Free vs Pro cut, Community monetization, Guided Pro programs, Launch sequencing, Founder pricing, Stripe MCP, Pro quota truth, Paid UX, Entitlement taxonomy, Beta cohorts, Admin/support, Analytics/privacy, Copy safety, Verification, Planning readiness

---

## Free Limit

| Option | Description | Selected |
|--------|-------------|----------|
| 3 useful saved analyses/month | Balanced activation and upgrade intent; counts only usable saved analyses. | yes |
| 1 useful saved analysis/week | Easy to explain but slower for multi-clip evolution. | |
| 5 useful saved analyses/month | More generous but weaker upgrade urgency. | |

**User's choice:** Accepted 3 useful saved analyses per month.
**Notes:** User asked whether this was the "most perfect" option. Decision was framed as best initial MVP contract, not absolute perfection. Inconclusive clips, technical errors, and failed saves should not consume quota.

---

## Checkout Security

| Option | Description | Selected |
|--------|-------------|----------|
| Stripe-hosted Checkout with webhook truth | Lowest PCI surface, server-created sessions, signed webhook fulfillment, no client-side grant. | yes |
| Custom payment form | More control, but too much security/PCI surface for MVP. | |
| Client redirect grants Pro | Fast but unsafe; success URL can be spoofed or visited without trusted payment confirmation. | |

**User's choice:** Accepted Stripe-hosted Checkout with strict server-side security.
**Notes:** User explicitly wanted checkout to be extremely secure. Locked decisions include no custom card form, no client price IDs, no Pix for Pro monthly MVP, allowlisted price keys, checkout attempt records, metadata validation, raw-body Stripe webhook signature verification, unique Stripe event processing, idempotent fulfillment, Billing Portal for subscription management, and audit logs.

---

## Subscription States

| Option | Description | Selected |
|--------|-------------|----------|
| Immediate suspension on payment failure | Most rigid against unpaid use, worse UX for transient card failures. | |
| 3-day grace for normal past_due | Balances payment safety and user experience. | yes |
| Keep access until end of paid period for every issue | Friendly but weaker against abuse and failed payments. | |

**User's choice:** Accepted 3-day grace for `past_due`, cancel access until paid period end, immediate suspension for fraud/chargeback/suspicious mismatch.
**Notes:** Canceling does not delete history. It only blocks future Pro-only usage after entitlement expires.

---

## Free Versus Pro Cut

| Option | Description | Selected |
|--------|-------------|----------|
| Free trust, Pro full loop | Free gets enough diagnosis to trust; Pro gets full coach/history/trends/training validation loop. | yes |
| Pro only higher limits | Too weak; sells volume rather than the improvement system. | |
| Gate most analysis details | Higher pressure but risks killing activation and trust. | |

**User's choice:** Accepted Free as trust-building and Pro as the complete solo improvement loop.
**Notes:** Pro includes full next-block training protocol: objective, where/mode, duration, exercise, execution, target, stop/continue criteria, and compatible validation. Exact Pro quota remains planner discretion.

---

## Community Monetization

| Option | Description | Selected |
|--------|-------------|----------|
| Community as funnel, not paywall | Public community stays open; community creates trust and upgrade intent. | yes |
| Some social Pro in Phase 5 | Adds paid value now but risks scope creep. | partial future |
| Community fully outside monetization | Cleanest Phase 5, but misses upgrade cues. | |

**User's choice:** Community is a funnel/trust surface now, with social Pro features prepared for later phases before real public launch.
**Notes:** Future social Pro ideas include Pro badge, premium report sharing, saved drills, private collections, creator analytics, advanced post context, and team/coach review. Public posts/basic community should remain open.

---

## Guided Pro Programs

| Option | Description | Selected |
|--------|-------------|----------|
| Treat as future guided training system | Not a course; generated/adapted from clips, coach, validations, and progress. | yes |
| Sell as course/content product | User rejected this framing. | |
| Ignore until after launch | Would lose major value and contradict prior context. | |

**User's choice:** Preserve as future Pro training/program phase, but not as "course" sold to users.
**Notes:** User clarified "nao vendo curso". The right framing is guided Pro training programs: routines, missions, drill library, active-line progression, and possibly physical preparation/musculacao with safety constraints.

---

## Launch Sequencing

| Option | Description | Selected |
|--------|-------------|----------|
| Closed beta after Phase 5 | Validate paid solo Pro safely once checkout/entitlements/limits are solid. | yes |
| Public launch after current Phase 7 only | Too narrow after rediscovering UI/UX and training-program launch needs. | revised |
| Public launch after UI/UX + guided programs + ops | Stronger "100%" launch path. | yes |

**User's choice:** Closed beta can happen after Phase 5, but public launch should wait for premium UI/UX, guided Pro training programs, and revenue ops.
**Notes:** User correctly noticed prior context already preserved complete training and UI/UX phases. Context records that these should be treated as launch-critical future phases, not forgotten backlog.

---

## Core Engine Validation

| Option | Description | Selected |
|--------|-------------|----------|
| Keep core as-is after Phase 4 | Lowest scope, but not enough for confident public paid launch. | |
| Add dedicated Core Accuracy phase | Improve spray detection/tracking and validate against real/pro corpus before strong public claims. | yes |
| Mix core hardening into Phase 5 | Would overload checkout/entitlement implementation and blur payment security with analysis research. | |

**User's choice:** Add a dedicated Core Accuracy And Pro Validation Hardening phase after Phase 5.
**Notes:** Discussion concluded the current engine is a strong foundation for honest closed beta, but not yet a "perfect" commercial engine. The hardening phase should improve spray start/end detection, recoil tracking, camera-motion/flick/cut separation, weak-quality handling, confidence calibration, diagnosis quality, and coach/training handoff.

---

## Public Video And Pro Spray Corpus

| Option | Description | Selected |
|--------|-------------|----------|
| Scrape/extract from public YouTube videos | Abundant data, but high legal/platform/commercial risk. | |
| Use public videos as qualitative reference | Safe for product research, hypothesis generation, and creator discovery. | yes |
| Build permissioned corpus | Slower, but production-grade and defensible for commercial validation. | yes |

**User's choice:** Do not store third-party public videos; use them as reference/discovery, and build a permissioned validation corpus.
**Notes:** Not saving raw video is not enough if the system still extracts frames/features/metrics for training or validation. Acceptable path is to use YouTube/Twitch/pro match videos qualitatively, then collect clips from users, advanced players, coaches, pros, partners, or videos with verified training permission/provenance.

---

## Launch-Perfect Roadmap Update

| Option | Description | Selected |
|--------|-------------|----------|
| Keep 7 phases | Simpler, but loses explicit UI, training, Spray Lab, validation, and social Pro work. | |
| Add a launch-perfect sequence | Makes the path to a truly sellable Pro product explicit. | yes |

**User's choice:** Update the official roadmap to 13 phases.
**Notes:** New sequence keeps Phase 5 as secure monetization, then adds Core Accuracy, Premium Visual/UI/UX, Complete Training Protocols, PUBG Spray Lab/Session Runner/Benchmark, Guided Pro Training Programs, Social Pro/Community Premium, Revenue Operations Hardening, and Team/Coach Expansion.

---

## Founder Pricing And Stripe Catalog

| Option | Description | Selected |
|--------|-------------|----------|
| Beta/founder low price | R$19,90 / US$7.99 for beta validation. | yes |
| Premium direct price | R$29,90 / US$9.99 immediately. | |
| Founder beta plus public target | Founder price now, public target later after launch-critical phases. | yes |

**User's choice:** Lock founder price at R$19,90/month and US$7.99/month, with public target of R$29,90/month and US$9.99/month.
**Notes:** Founder price protection lasts 12 months while subscription stays active. Internal price catalog uses server-owned keys for founder/public BRL/USD and prepares future annual keys without selling annual in Phase 5.

---

## Stripe MCP And Account Operations

| Option | Description | Selected |
|--------|-------------|----------|
| Manual-only setup | User creates all Stripe resources and shares only IDs/env. | |
| Stripe MCP assisted setup | Codex may inspect/create products/prices when authorized. | yes |
| Full account control by agent | Agent handles account/legal/bank/secrets. | |

**User's choice:** Use Stripe MCP as an assisted setup tool when explicitly authorized.
**Notes:** The user corrected that Stripe MCP is connected. Codex may list/create products/prices in the connected account after authorization, but account selection, live activation, legal/bank details, and secrets remain user-controlled. Prefer a separate Stripe account for Sens PUBG if another project already uses Stripe.

---

## Pro Quota Truth Contract

| Option | Description | Selected |
|--------|-------------|----------|
| 100 saved analyses per cycle | High transparent cap with abuse control. | yes |
| Quasi-unlimited fair use | Easier to market, less transparent. | |
| Medium beta cap | Safer but weaker Pro value. | |

**User's choice:** 100 useful saved analyses per Stripe cycle, with a server-side idempotent ledger and server/Stripe-authoritative periods.
**Notes:** Client time, timezone, URL params, localStorage, duplicate tabs, and replayed requests cannot alter quota. Weak-capture inconclusive clips, technical failures, failed saves, and blocked attempts do not consume quota. Delete does not refund quota automatically.

---

## Paid UX And Pricing Page

| Option | Description | Selected |
|--------|-------------|----------|
| Generic pricing table | Simple plan comparison. | |
| State-aware conversion/trust page | Sells the evidence loop and answers objections. | yes |
| Aggressive marketing/paywall | More pressure, less trust. | |

**User's choice:** `/pricing` must be a state-aware conversion and trust page.
**Notes:** First viewport sells Sens PUBG Pro Founder, explains the evidence loop, shows state-based CTA, answers quota/refund/history concerns, and includes PUBG independence plus no-rank/no-perfect-sens disclaimers. Stripe Checkout/Portal must be branded and polished before paid founder beta.

---

## Free Versus Pro And Entitlement Taxonomy

| Option | Description | Selected |
|--------|-------------|----------|
| `isPro` boolean | Fast but brittle. | |
| Namespaced entitlement taxonomy | Stable feature-key access contract. | yes |
| Community entitlement reuse only | Risky because community keys are not product Pro keys. | |

**User's choice:** Introduce a namespaced entitlement taxonomy and a rich entitlement resolver.
**Notes:** Resolver returns effective tier, access state, source, billing status, quota, features, blockers, period/expiry fields, and audit refs. Free is useful and honest; Pro is the full loop. Preview Pro is honest and never uses deceptive blur/fake data.

---

## Beta Cohorts And Creator Preview

| Option | Description | Selected |
|--------|-------------|----------|
| Broad public beta | More reach, too much risk for Phase 5. | |
| Cohort-based beta | Internal, beginner/casual, serious/competitive, creator/coach. | yes |
| Paid founder first | Faster revenue, weaker learning/safety. | |

**User's choice:** Start beta as grant-only/cohort-based, then open paid founder beta only after gates pass.
**Notes:** User has friends who play at beginner/casual and serious levels, plus friends who stream. Streamers can help sell later, but Phase 5 uses controlled creator preview, invite codes/tags, disclosure, and no affiliate complexity yet.

---

## Admin, Support, Refunds, And Incidents

| Option | Description | Selected |
|--------|-------------|----------|
| DB/manual operations | Fast but unsafe. | |
| Minimal admin entitlement surface | Admin-only grant/revoke/suspend/reconcile with audit. | yes |
| Full revenue dashboard | Useful later, too large for Phase 5. | |

**User's choice:** Add `/admin/billing` or `/admin/entitlements` as a minimal secure admin surface.
**Notes:** Support can view/escalate, admin controls grants/suspensions. Refund/cancel/support policy is Stripe-authoritative, audit-backed, Brazil-aware, and never deletes history. Rollout flags and incident runbooks are mandatory for real paid operation.

---

## Analytics, Privacy, And Legacy Users

| Option | Description | Selected |
|--------|-------------|----------|
| Minimal billing events only | Less scope, loses beta learning. | |
| Broad privacy-minimal monetization ledger | Measures funnel without private clip/payment data. | yes |
| Heavy behavioral analytics | Too much scope/risk for Phase 5. | |

**User's choice:** Track broad monetization/beta funnel events with privacy-minimal metadata.
**Notes:** No raw video, frames, aim trajectory, file names, full analysis payload, card data, CPF/document, address, or bank data in analytics. Legacy users remain free/legacy; old history remains, old analyses do not consume Phase 5 quota, and activation analytics distinguish pre-existing users.

---

## Copy, Founder Messaging, And Legal Safety

| Option | Description | Selected |
|--------|-------------|----------|
| Strong evidence-bound copy | Premium, direct, honest. | yes |
| Aggressive scarcity/guarantees | Risky and misaligned. | |
| Generic cautious copy | Safe but undersells value. | |

**User's choice:** Use assertive evidence-bound copy and a refined Founder Beta Messaging Contract.
**Notes:** Ban perfect sens, guaranteed rank, recoil zero, official PUBG affiliation, and pressure tactics. Founder messaging sells early access honestly: lower early price, limited closed beta, full Pro loop, feedback expectation, cancellation/support, and cohort-specific invitations.

---

## Verification And No False Done

| Option | Description | Selected |
|--------|-------------|----------|
| Normal project validation only | Not enough for paid beta. | |
| Phase 5 verification contract | Focused monetization tests plus manual Stripe checklist. | yes |
| Claim delivered when implemented | Explicitly rejected. | |

**User's choice:** Phase 5 requires hard No False Done.
**Notes:** Paid founder beta only opens with automated gates, `test:monetization`, build, Stripe test-mode manual checklist, and requirement-by-requirement evidence. If a gate fails, status is not delivered. If a gate cannot run, status is implemented but verification blocked.

---

## Planning Readiness

| Option | Description | Selected |
|--------|-------------|----------|
| One giant plan | Too risky and hard to verify. | |
| Explicit wave decomposition | Billing, quota, enforcement, UX, admin, analytics, copy, verification. | yes |
| Planner discretion only | Too weak for Phase 5. | |

**User's choice:** Phase 5 planning must be decomposed into explicit waves with files, tests, rollback, threats, acceptance criteria, and No False Done evidence.
**Notes:** Planning must not allow client Price IDs, client time/quota, success URL grants, localStorage entitlement truth, missing webhook signature verification, missing idempotency/replay handling, or missing copy/audit tests.

---

## the agent's Discretion

- Exact table names and migration shape for Stripe, subscriptions, usage ledger, and product entitlements.
- Exact UI split for paywall/pricing/billing surfaces.
- Exact event names, as long as activation and upgrade intent are recorded.
- Exact implementation ordering within the future validation, UI, training, lab, and program phases, as long as public launch waits for validation and revenue readiness.
- Exact module boundaries, runbook names, and component split, as long as the locked founder/public pricing, quota, security, beta, and No False Done contracts are preserved.

## Deferred Ideas

- Core Accuracy And Pro Validation Hardening.
- Premium Visual/UI/UX phase before public launch.
- PUBG Spray Lab / Session Runner / Benchmark.
- Guided Pro Training Programs phase before public launch, not positioned as course.
- Physical preparation, ergonomics, and musculacao with safety framing.
- Social Pro/community premium features.
- Team/coach expansion.
- Pix, credits, one-off reviews, and other non-recurring monetization paths.
- Annual Pro plan.
- Pro+ / credits / higher quota for legitimate heavy users.
- Affiliate/referral/commission program for creators.
- Revenue operations dashboard and full privacy/retention hardening in Phase 12.
- Portuguese beta invitation playbook for friends, streamers, cohorts, and founder readiness.
