# Phase 5: Freemium Pro MVP - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md. This log preserves the alternatives considered.

**Date:** 2026-05-06T00:29:55.8331021-03:00
**Phase:** 5-Freemium Pro MVP
**Areas discussed:** Free limit, Checkout security, Free vs Pro cut, Community monetization, Guided Pro programs, Launch sequencing

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

## the agent's Discretion

- Exact Pro monthly quota/cap.
- Exact price and BRL/USD pricing research.
- Exact table names and migration shape for Stripe, subscriptions, usage ledger, and product entitlements.
- Exact UI split for paywall/pricing/billing surfaces.
- Exact event names, as long as activation and upgrade intent are recorded.
- Exact implementation ordering within the future validation, UI, training, lab, and program phases, as long as public launch waits for validation and revenue readiness.

## Deferred Ideas

- Core Accuracy And Pro Validation Hardening.
- Premium Visual/UI/UX phase before public launch.
- PUBG Spray Lab / Session Runner / Benchmark.
- Guided Pro Training Programs phase before public launch, not positioned as course.
- Physical preparation, ergonomics, and musculacao with safety framing.
- Social Pro/community premium features.
- Team/coach expansion.
- Pix, credits, one-off reviews, and other non-recurring monetization paths.
