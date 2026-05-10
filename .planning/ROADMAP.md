# Roadmap: Sens PUBG Spray Perfection And Monetization

**Created:** 2026-05-05
**Project:** Sens PUBG

## Overview

This roadmap turns the live product into a paid spray improvement product. It prioritizes precision and coach usefulness before monetization, then activates freemium monthly once the product can prove value without overclaiming.

| # | Phase | Goal | Requirements |
|---|-------|------|--------------|
| 1 | Measurement Truth Contract | Define practical perfection, confidence, and recommendation rules | PREC-01, PREC-02, PREC-04 |
| 2 | Benchmark Expansion | Make regressions visible before commercial claims | BENCH-01, BENCH-02, BENCH-03 |
| 3 | Multi-Clip Precision Loop | Turn single analyses into measurable improvement trends | PREC-03 |
| 4 | Adaptive Coach Loop | Make coach plans learn from outcomes and history | COACH-01, COACH-02, COACH-03, COACH-04, COACH-05 |
| 5 | Freemium Pro MVP | Activate paid solo-player monetization safely for closed beta | ANALYT-01, ANALYT-02, MON-01, MON-02, MON-03, MON-04, MON-05 |
| 6 | Core Accuracy And Pro Validation Hardening | Make clip spray analysis commercially trustworthy before strong public claims | PREC-01, PREC-02, PREC-03, PREC-04, BENCH-01, BENCH-02, BENCH-03, COACH-01, COACH-02, COACH-03, COACH-04, COACH-05 |
| 7 | Premium Visual UI UX | Make the paid product feel premium, clear, and launch-grade | ANALYT-01, ANALYT-02, MON-01, MON-02, MON-04 |
| 8 | Complete Training Protocols | Turn coach next-block advice into complete practical PUBG training protocols | COACH-01, COACH-02, COACH-03, COACH-04, COACH-05 |
| 9 | PUBG Spray Lab Session Runner And Benchmark | Build the PUBG-focused lab layer for guided drills, sessions, and benchmarks | PREC-03, BENCH-01, BENCH-02, BENCH-03, COACH-01, COACH-02, COACH-03 |
| 10 | Guided Pro Training Programs | Organize the Pro loop into weekly and monthly adaptive training programs | PREC-03, COACH-01, COACH-02, COACH-03, COACH-04, COACH-05, MON-01, MON-02 |
| 11 | Social Pro Community Premium | Add Pro social value while keeping public community as a trust funnel | MON-01, MON-02, MON-03, MON-04, MON-05 |
| 12 | 6/6 | Complete    | 2026-05-10 |
| 13 | Team And Coach Expansion | Extend paid value to teams/coaches after solo Pro proof | TEAM-01, TEAM-02 |

## Phase 1: Measurement Truth Contract

**Goal:** Define what "perfection" means in product terms: practical accuracy, confidence honesty, and repeatable improvement.

**Requirements:** PREC-01, PREC-02, PREC-04

**Success Criteria:**

1. Spray mastery score exists and is decomposed into control, consistency, confidence, and clip quality.
2. Analysis result exposes confidence, coverage, visible/lost frames, and inconclusive states in a user-readable way.
3. Coach/sensitivity recommendations downgrade or block themselves when evidence is too weak.
4. Product copy avoids perfect/guaranteed claims and explains that recommendations are test protocols.

**UI hint:** yes

**Plans:**

**Wave 1**
- `01-01` - Core Measurement Truth Contract. Defines shared mastery/action/evidence contracts, attaches them to analysis/history, and protects weak-evidence downgrades.

**Wave 2 *(blocked on Wave 1 completion)***
- `01-02` - Premium Analysis Report Surface. Reworks the clip result around verdict, next block, pillars, visualization, and audit evidence.
- `01-03` - Dashboard Truth Cockpit. Makes `/dashboard` consume latest mastery, coach next block, and evidence-gated trend language.

**Cross-cutting constraints:**
- Preserve the browser-first analysis path.
- Do not claim perfect sensitivity, guaranteed improvement, or final player skill.
- Weak evidence must block or downgrade strong sensitivity/coach recommendations.
- Confidence, coverage, visible/lost frames, and inconclusive behavior must stay user-visible.

## Phase 2: Benchmark Expansion

**Goal:** Expand benchmark coverage so commercial claims are protected by data.

**Requirements:** BENCH-01, BENCH-02, BENCH-03

**Success Criteria:**

1. Benchmark gate covers tracking, diagnosis, coach tier, primary focus, and next-block protocol.
2. Real captured clips include enough metadata for patch, weapon, optic, attachments, distance, and expected outcomes.
3. Release gate reports regression against baseline with a clear pass/fail result.
4. Docs explain how to add new clips and labels.

**UI hint:** no

**Plans:**

**Wave 1**
- `02-01` - Truth-Aware Benchmark Contract. Extends benchmark schema and runner checks for mastery action, evidence tier, weak-evidence downgrade, focus priorities, and next-block protocol structure.

**Wave 2 *(blocked on Wave 1 completion)***
- `02-02` - Strict Release Benchmark Gate. Adds `benchmark:release`, versioned synthetic/captured baselines, markdown regression reports, and explicit baseline update workflow.
- `02-03` - Guided Captured Clip Promotion. Upgrades captured clip promotion into an internal maintainer workflow with strict metadata/label/provenance checks and promotion reports.

**Cross-cutting constraints:**
- Keep `benchmark:gate` as the fast day-to-day gate.
- Keep the strict commercial/release gate separate from normal local iteration.
- Benchmark truth uses stable internal enums, not translated UI copy.
- Synthetic, captured, reviewed, and golden evidence must be reported separately.
- Any baseline update requires a reason, affected clips, and why the new behavior is more honest.

## Phase 3: Multi-Clip Precision Loop

**Goal:** Make improvement measurable across repeated sprays instead of isolated one-off reports.

**Requirements:** PREC-03

**Success Criteria:**

1. User can compare current clip vs prior compatible clips.
2. Trend model avoids comparing incompatible contexts without warning.
3. UI shows improvement or regression in stable metrics.
4. History supports the coach with recent compatible evidence.

**UI hint:** yes

**Plans:**

**Wave 1**
- `03-01` - Strict Precision Trend Contract. Adds strict compatibility, conservative trend labels, actionable mastery deltas, pillar deltas, and active-line/checkpoint payload contracts.

**Wave 2 *(blocked on Wave 1 completion)***
- `03-02` - Active Evolution Line Persistence And Coach Handoff. Persists strict active lines/checkpoints, attaches precision trend summaries to saved analysis results, and feeds compatible trend evidence into coach memory.

**Wave 3 *(blocked on Wave 2 completion)***
- `03-03` - Post-Analysis Trend Experience. Adds the compact trend block after the clip verdict with essential deltas, blocker reasons, and `Gravar validacao compativel`.
- `03-04` - History And Dashboard Precision Surfaces. Makes history the compatible-group/checkpoint audit surface and dashboard the concise principal-trend next-action surface.

**Cross-cutting constraints:**
- Precise trend comparison only uses strict compatible clips.
- Missing metadata, patch mismatch, loadout mismatch, distance ambiguity, weak capture quality, or spray-protocol mismatch must block trend math with visible reasons.
- Actionable mastery score is the primary trend metric; mechanical score is secondary context.
- One compatible clip is baseline only, two clips are initial signal, and validated progress/regression requires at least three compatible clips plus evidence gates.
- Active evolution lines are per strict context and important variable changes restart the line instead of mixing evidence.
- Analysis shows a compact trend summary, history shows the full audit timeline, and dashboard shows only the principal next action.
- Multi-clip evidence is a structured handoff for Phase 4 coach behavior, but Phase 3 does not become the full coach overhaul.
- Product copy must avoid perfect sensitivity, guaranteed improvement, or final skill claims.

## Phase 4: Adaptive Coach Loop

**Goal:** Turn Coach Extremo into a feedback loop with outcomes, memory, and better priority decisions.

**Requirements:** COACH-01, COACH-02, COACH-03, COACH-04, COACH-05

**Success Criteria:**

1. Coach emits one primary focus, up to two secondary focuses, and one next-block protocol.
2. User can mark protocol outcome after training.
3. Coach memory uses compatible prior clips and outcomes.
4. Low-confidence or conflicting history lowers coach aggressiveness.
5. LLM rewrite remains schema-bound and cannot alter technical facts.

**UI hint:** yes

**Plans:**

**Wave 1**
- `04-01` - Outcome Contract, Persistence, And Revision Audit. Adds typed protocol outcomes, normalized Drizzle persistence, audit-safe revisions, authenticated outcome actions, and the blocking schema push.

**Wave 2 *(blocked on Wave 1 completion)***
- `04-02` - Adaptive Memory And Coach Aggressiveness. Feeds strict/global outcome memory into priority and tier selection so conflicts, weak self-report, invalid capture, and confirmed progress change coach behavior honestly.

**Wave 3 *(blocked on Wave 2 completion)***
- `04-03` - Adaptive Coach Loop Surfaces. Adds the compact post-analysis loop, outcome capture/correction UI, dashboard active-loop state, and history audit timeline.

**Wave 4 *(blocked on Wave 3 completion)***
- `04-04` - LLM And Benchmark Hardening. Locks optional LLM rewrite to copy-only behavior and extends benchmark/copy gates for adaptive coach truth.

**Cross-cutting constraints:**
- Preserve the browser-first analysis path; adaptive memory uses saved evidence and outcomes, not server video processing.
- Deterministic code owns coach truth; the optional LLM can only rewrite allowed copy fields.
- Self-reported improvement is weak evidence until compatible validation confirms it.
- Outcome/trend conflicts and low-confidence history must lower aggressiveness and block strong apply actions.
- Strict compatible memory leads; global memory can only tie-break when strict compatible evidence is absent.
- Analysis shows the essential loop, dashboard shows active state, and history shows the full audit.
- Phase 4 execution must run targeted tests plus `npm run typecheck`, `npx vitest run`, and `npm run benchmark:gate`.

## Phase 5: Freemium Pro MVP

**Goal:** Launch the first safe paid wedge: solo-player Pro monthly.

**Status:** Partially delivered on 2026-05-06. Automated implementation and gates pass; paid founder beta is blocked until the manual Stripe test-mode checklist passes.

**Requirements:** ANALYT-01, ANALYT-02, MON-01, MON-02, MON-03, MON-04, MON-05

**Success Criteria:**

1. Free tier has useful but limited analysis access.
2. Pro tier unlocks full coach plan, higher limits, history trends, and advanced metrics.
3. Subscription status maps into existing entitlement/access checks.
4. Paywall copy is honest, independent from PUBG/KRAFTON, and avoids guaranteed outcomes.
5. Product analytics tracks activation and upgrade intent.

**UI hint:** yes

**Plans:**

**Wave 1**
- `05-01` - Product Monetization Contract, Schema, And Resolver Foundation. Defines product entitlement taxonomy, price catalog, billing/quota/event schema, flags, audit hooks, and env contracts.

**Wave 2 *(blocked on Wave 1 completion)***
- `05-02` - Stripe Checkout And Webhook Truth. Adds server-created Checkout, signed/idempotent webhook fulfillment, subscription lifecycle sync, and Billing Portal.
- `05-03` - Quota Ledger And Analysis Save Enforcement. Adds transactional quota reservations/finalization/voids and enforces free/Pro save limits in `saveAnalysisResult`.

**Wave 3 *(blocked on Wave 2 completion)***
- `05-04` - Free/Pro Projection And Premium Enforcement. Gates full coach/history/trends/metrics/outcomes server-side while keeping Free truthful/useful and community open.
- `05-05` - Privacy-Minimal Product Analytics. Records activation, upgrade intent, quota, checkout, lifecycle, and Pro feature events without private clip/payment data.

**Wave 4 *(blocked on Wave 3 completion)***
- `05-06` - Founder Pricing, Paywall, Billing UX, And Capture Guidance. Builds state-aware pricing, billing/success/cancel flows, quota warnings, locked-state copy, and beta capture guidance.
- `05-07` - Admin Support, Beta Cohorts, And Runbooks. Adds admin entitlement/support operations, cohort/creator controls, audited flags, and incident runbooks.

**Wave 5 *(blocked on Wave 4 completion)***
- `05-08` - Monetization Verification And No False Done Gate. Adds focused monetization tests, copy-safety coverage, manual Stripe checklist, and requirement evidence tables.

**Cross-cutting constraints:**
- Preserve browser-first analysis; the server controls saves, access, billing, and quota.
- Success URL, query params, localStorage, and client state never grant Pro.
- Client never sends trusted Stripe Price IDs, amount, currency, entitlement, quota period, or billing status.
- Quota is an audited server ledger: 3 useful saved analyses/month for Free and 100 useful saved analyses/Stripe cycle for Pro.
- Free remains useful; Pro gates the full coach/history/trend/advanced-metric loop rather than evidence truth itself.
- Do not make PUBG API-derived data an exclusive paid feature.
- Pricing, lock, billing, and founder copy must avoid perfect sensitivity, guaranteed improvement/rank, and PUBG/KRAFTON affiliation claims.
- Phase 5 is not Delivered unless `npm run typecheck`, `npx vitest run`, `npm run benchmark:gate`, `npm run build`, `npm run test:monetization`, and the manual Stripe test-mode checklist are accounted for.

## Phase 6: Core Accuracy And Pro Validation Hardening

**Goal:** Make the clip spray analysis engine commercially trustworthy before strong public launch claims.

**Status:** Partially delivered on 2026-05-07. All six plans are complete and automated gates pass; strong commercial accuracy claims remain blocked because `benchmark:release` is PARTIAL with 0 reviewed permissioned commercial benchmark clips and specialist/human commercial review evidence is not linked.

**Requirements:** PREC-01, PREC-02, PREC-03, PREC-04, BENCH-01, BENCH-02, BENCH-03, COACH-01, COACH-02, COACH-03, COACH-04, COACH-05

**Success Criteria:**

1. Spray start/end detection, recoil tracking, camera-motion separation, flick/cut detection, and low-quality clip handling are improved and regression-tested.
2. A real/pro validation corpus exists with explicit permission or trainability provenance, metadata, reviewed labels, and golden promotion rules.
3. Public internet videos are used only for qualitative reference or discovery unless permission/trainability is verified.
4. Engine confidence is calibrated against captured real clips and specialist review, including inconclusive and weak-evidence behavior.
5. Commercial benchmark gates cover tracking, diagnosis, coach recommendation quality, training handoff, and confidence honesty before strong public claims.

**UI hint:** no

**Plans:**

**Wave 1**
- `06-01` - Versioned Decision Ladder And Spray Validity Contract: add the `spray-truth-v2` analysis decision ladder, permission matrix, blocker reason codes, spray validity report, and invalid-clip pre-tracking block.

**Wave 2** *(blocked on Wave 1 completion)*
- `06-02` - Reticle Tracking, Camera Motion, Flick, And Cut Separation: make camera motion, hard cuts, flicks, target swaps, reacquisition, and contaminated frames explicit tracking evidence and benchmark expectations.
- `06-03` - Permissioned Real/Pro Corpus And Golden Promotion Provenance: add per-clip consent/provenance, withdrawal/quarantine rules, public-video restrictions, and stricter captured golden promotion reports.

**Wave 3** *(blocked on Wave 2 tracking work)*
- `06-04` - Downstream Confidence, Coach, Sensitivity, Trend, And Quota Recalibration: make diagnostics, sensitivity, coach, precision trends, history, and useful-result quota obey the versioned decision ladder.

**Wave 4** *(blocked on Wave 2 corpus/tracking and Wave 3 recalibration)*
- `06-05` - Calibration Reports And Commercial Benchmark Gate: add confidence calibration reports and integrate calibration into the strict `benchmark:release` commercial truth gate.

**Wave 5** *(blocked on all prior plans)*
- `06-06` - No False Done Evidence Matrix And Commercial Claim Safety: add copy-safety gates, commercial accuracy readiness docs, mandatory gate evidence, and final status rules.

**Cross-cutting constraints:**
- Do not scrape, download, or extract features from third-party YouTube/Twitch videos for product training without permission or verified trainability.
- Do not redistribute raw partner clips unless the contributor agreement explicitly allows it.
- Preserve browser-first user analysis; validation corpus work improves truth, not a new backend video-processing product.
- No copy may claim perfect sensitivity, guaranteed recoil control, guaranteed rank gain, or guaranteed improvement.

## Phase 7: Premium Visual UI UX

**Goal:** Make the paid product feel premium, clear, and launch-grade across the full solo-player loop.

**Status:** Partially delivered as of 2026-05-07. Plans 07-01 through 07-07 are complete; automated visual/source gates pass, and only the manual Stripe test-mode paid-flow checklist remains pending before public paid launch can be called fully delivered.

**Requirements:** ANALYT-01, ANALYT-02, MON-01, MON-02, MON-04

**Success Criteria:**

1. Analysis, result, dashboard, history, pricing, billing, and locked-state surfaces feel cohesive and production-grade.
2. Free versus Pro value is visible without hiding the truth contract, confidence, coverage, or inconclusive states.
3. Progression and evolution are visually obvious through active lines, checkpoints, compatible trends, and next actions.
4. Mobile and desktop flows are polished enough for real paid users.
5. UI copy remains honest, independent from PUBG/KRAFTON, and avoids guaranteed-performance claims.

**UI hint:** yes

**Plans:**

**Wave 1**
- `07-01` - Premium Design System, Brand Shell, And Loop Foundation. Creates the Sens PUBG brand/shell, Phase 7 tokens, shared loop/evidence/lock components, and paid-route/mobile navigation fixes.

**Wave 2 *(blocked on Wave 1 completion)***
- `07-02` - 29 Weapon SVG Catalog And Support Status Contract. Adds original non-generic silhouettes for all 29 seed weapons and separates visual support from technical analysis support.

**Wave 3 *(blocked on Wave 2 completion)***
- `07-03` - Analyze Upload, Result Report, And Spray Proof Experience. Refactors upload, result, and spray proof surfaces around evidence, Free usefulness, Pro continuity, low-evidence behavior, and mobile polish.

**Wave 4 *(blocked on Wave 3 completion)***
- `07-04` - Dashboard And History Loop Surfaces. Makes dashboard the command center and history the audit/evolution timeline with loop rail, evidence, locks, and responsive layouts.
- `07-05` - Pricing, Billing, Checkout Receipts, Locks, And Paid Analytics. Turns paid conversion and account states into premium trust surfaces while preserving Stripe/server truth and privacy-safe events.

**Wave 5 *(blocked on Wave 4 paid surface completion)***
- `07-06` - Home Entry, Route IA, And Light Global Coherence. Rebuilds home around the Sens PUBG loop, clarifies Sens dos Pros versus paid Pro, and applies light community/admin coherence.

**Wave 6 *(blocked on all prior plans)***
- `07-07` - No False Perfect Visual QA And Evidence Matrix. Adds browser/state-matrix/accessibility/overflow/weapon/spray screenshots, evidence scripts, and final delivered/partial/blocked status rules.

**Cross-cutting constraints:**
- Preserve browser-first analysis; UI polish must clarify evidence, not hide uncertainty.
- Free remains premium and useful; Pro unlocks continuity/depth, not truth evidence itself.
- Confidence, coverage, blockers, weak evidence, and inconclusive states stay visible across result, dashboard, history, and locks.
- Do not claim perfect sensitivity, guaranteed improvement/rank, final certainty, or PUBG/KRAFTON affiliation.
- Do not use official or extracted PUBG/KRAFTON logos/assets; brand and weapon SVGs must be original.
- Visual catalog must cover all 29 seed weapons without implying full technical calibration for every weapon.
- Mobile paid route visibility, Sens dos Pros route separation, accessibility, reduced motion, overflow, and No False Perfect evidence are blocking Phase 7 gates.

## Phase 8: Complete Training Protocols

**Goal:** Turn coach next-block advice into complete practical PUBG training protocols.

**Status:** Delivered as of 2026-05-08. All six plans are complete, `drizzle/0011_complete_training_protocols.sql` has been applied and verified in the configured target database, and automated gates pass: focused Phase 8 tests, `npm run verify:phase8:training`, `npm run typecheck`, `npx vitest run`, `npm run benchmark:gate`, and `npm run build`.

**Requirements:** COACH-01, COACH-02, COACH-03, COACH-04, COACH-05

**Success Criteria:**

1. Training protocols specify what to train, where to train, duration, weapon, optic, distance, reps, drill target, and stop/continue criteria.
2. Protocols connect directly to the user's clip diagnosis, active evolution line, and next compatible validation clip.
3. Physical preparation, ergonomics, and musculacao are framed safely as general preparation, not medical advice or guaranteed performance gain.
4. Protocols remain deterministic and evidence-bound; optional LLM copy cannot change technical facts.
5. Tests cover protocol selection, weak-evidence downgrade, history/outcome influence, and user-facing copy constraints.

**UI hint:** yes

**Plans:**

**Wave 1**
- `08-01` - Complete Protocol Contract, Drill Catalog, And Downgrade Engine. Adds versioned complete protocol contracts, PUBG drill masters, deterministic composer, preparation safety, validation/transfer plans, and coach-plan attachment.

**Wave 2 *(blocked on Wave 1 completion)***
- `08-02` - Protocol Snapshot Persistence, Revisions, Outcomes, And Transfer Records. Persists versioned protocol snapshots, adds revision/transfer records, extends outcome statuses, and preserves compatible clip validation as technical proof.
- `08-03` - Free/Pro Protocol Projection And Post-Analysis Ficha. Builds server-owned Free/Pro projection, protocol view models, and a polished post-analysis ficha with blockers, preparation, validation, transfer, and audit disclosure.

**Wave 3 *(blocked on Wave 2 completion)***
- `08-04` - Dashboard And History Protocol Continuity. Extends active dashboard state, history audit, outcome cards, compatible validation prompts, real-match/TDM transfer, and revision timeline surfaces.

**Wave 4 *(blocked on Wave 3 completion)***
- `08-05` - LLM Guardrails, Coach Goldens, Benchmark, And Copy Safety. Locks complete protocol immutable facts, adds golden/downgrade fixtures, benchmark truth checks, and safety/copy gates.

**Wave 5 *(blocked on all prior plans)***
- `08-06` - No False Done Training Protocol Evidence Matrix. Adds deterministic Phase 8 evidence verification, final checklist/docs, command recording, and honest delivered/partial/blocked status rules.

**Cross-cutting constraints:**
- Preserve browser-first analysis; protocols train and validate around user clips without server video compute.
- Deterministic code owns complete protocol truth; optional LLM may only rewrite allowed display copy.
- Free remains useful and polished; Pro unlocks complete ficha depth, audit, revision, compatible validation, and transfer continuity.
- Weak or missing evidence must downgrade to recapture, short test, stabilization, or repair path instead of inventing exact protocol facts.
- Physical preparation stays general, privacy-minimal, non-medical, and safety-first; pain, numbness, tingling, fatigue, confusion, or variable changes downgrade the block.
- Real-match/TDM transfer is practical evidence only and cannot replace strict compatible clip validation for technical conclusions.
- Phase 8 must not build the Phase 9 Spray Lab session runner, guided sessions, or benchmark runner.
- No copy may claim perfect sensitivity, guaranteed improvement/rank, medical benefit, or official PUBG/KRAFTON affiliation.

## Phase 9: PUBG Spray Lab Session Runner And Benchmark

**Goal:** Build the PUBG-focused lab layer for guided drills, training sessions, and internal benchmarks.

**Status:** Delivered as of 2026-05-08. All six plans are complete with the Spray Lab core contract, persistence/actions, Free/Pro projection, mobile-first runner cockpit, Analyze validation mode, repair-aware validation UX, dashboard/history/coach continuity, benchmark truth, goldens, copy-safety checks, Playwright browser evidence, and final gates passing: `npm run typecheck`, `npx vitest run`, `npm run benchmark:gate`, `npm run verify:phase9:spray-lab`, and `npm run build`.

**Requirements:** PREC-03, BENCH-01, BENCH-02, BENCH-03, COACH-01, COACH-02, COACH-03

**Success Criteria:**

1. Drill library exists for PUBG recoil control by weapon, optic, distance, error pattern, and training objective.
2. Session runner guides the user through blocks, reps, outcomes, and validation prompts without becoming a generic course product.
3. Internal PUBG spray benchmark tracks drill performance and connects back to compatible clip validation.
4. Spray Lab supports progression from beginner correction to advanced/pro-level refinement without overclaiming.
5. Benchmark/session data feeds the coach loop and dashboard in privacy-safe, entitlement-aware ways.

**UI hint:** yes

**Plans:**

**Wave 1**
- `09-01` - Spray Lab Core Contract, Lanes, Session Fidelity, And Contextual Index. Complete as of 2026-05-08 with versioned Lab contracts, PUBG lane presets, deterministic session state machine, fidelity tiers, repair states, and provisional/validated contextual index rules.

**Wave 2 *(blocked on Wave 1 completion)***
- `09-02` - Spray Lab Persistence, Actions, Validation Links, And Free/Pro Projection. Complete as of 2026-05-08 with Lab persistence, authenticated actions, validation links, benchmark snapshots, and server-owned Free/Pro depth.

**Wave 3 *(blocked on Wave 2 completion)***
- `09-03` - Mobile-First Spray Lab Session Runner Cockpit. Complete as of 2026-05-08 with `/spray-lab` route resolution, cockpit state model, mobile runner controls, protocol checklist, repair panel, and result CTAs into Spray Lab.
- `09-04` - Compatible Validation Mode And Repair-Aware Analyze Flow. Complete as of 2026-05-08 with server-owned validation targets, Analyze context preload, variable confirmation, validation links on save, and blocked/inconclusive repair states.

**Wave 4 *(blocked on Wave 3 completion)***
- `09-05` - Result, Dashboard, History, And Coach Continuity. Complete as of 2026-05-08 with Lab session fidelity, benchmark snapshots, validation links, repair outcomes, contextual progression, and coach-safe handoff through the product loop.

**Wave 5 *(blocked on all prior plans)***
- `09-06` - Spray Lab Benchmark, Goldens, Copy Safety, And No False Done Verification. Complete as of 2026-05-08 with Lab benchmark truth, coach/copy goldens, copy-safety checks, Playwright desktop/mobile matrix, `verify:phase9:spray-lab`, and final Delivered evidence checklist.

**Cross-cutting constraints:**
- Preserve the browser-first clip analysis path; Spray Lab does not introduce backend video compute.
- Spray Lab executes the Phase 8 complete protocol and must not replace analysis, coach truth, precision trends, or Phase 10 guided programs.
- Fidelity controls evidence strength; broken fidelity can remain useful as practice but cannot become strong benchmark or technical validation.
- Compatible clip validation is the technical proof layer; Lab sessions are execution evidence and TDM/real-match records are practical transfer only.
- Free must remain useful and polished; Pro unlocks deeper runner, audit, validated index, benchmarks, comparisons, and continuity through server-owned entitlements.
- Persist only evidence-needed Lab data and reason codes; do not persist raw Lab video, detailed pain history, health profile, physical routine, body metrics, or medical details.
- No copy may claim perfect sensitivity, guaranteed improvement/rank, global player grade, medical benefit, or official PUBG/KRAFTON affiliation.
- Final Delivered status requires focused tests, `npm run typecheck`, `npx vitest run`, `npm run benchmark:gate`, Playwright/browser evidence, and `npm run verify:phase9:spray-lab`.

## Phase 10: Guided Pro Training Programs

**Goal:** Organize the Pro loop into weekly and monthly adaptive training programs.

**Status:** Delivered as of 2026-05-08. All six plans are complete with the Ciclo Pro/Ciclo de Reparo contract, persistence/actions, Free/Pro projection, dedicated `/ciclo-pro` route, dashboard cockpit, result handoffs, history audit, bounded coach continuity, copy/golden safety, Playwright state matrix, target DB migration evidence, and final gates passing: focused Phase 10 tests, `npm run typecheck`, `npx vitest run`, `npm run benchmark:gate`, `npm run verify:phase10:programs`, `npm run build`, and `npx playwright test e2e/phase10.programs.spec.ts`.

**Requirements:** PREC-03, COACH-01, COACH-02, COACH-03, COACH-04, COACH-05, MON-01, MON-02

**Success Criteria:**

1. Pro users can follow structured weekly/monthly programs generated from clips, coach decisions, outcomes, and compatible validations.
2. Programs include missions, checkpoints, active-line continuation, recovery/reset behavior, and clear progression states.
3. The product is positioned as an adaptive PUBG improvement system, not a course or content library.
4. Program adjustments are evidence-bound and downgrade themselves when clips, history, or outcomes are weak/conflicting.
5. Paywall and dashboard make program value clear without promising guaranteed improvement.

**UI hint:** yes

**Plans:**

**Wave 1**
- `10-01` - Program Contracts, Missions, Checkpoints, And Recovery Engine. Complete as of 2026-05-08 with Ciclo Pro/Ciclo de Reparo truth contracts, eligibility, mission anatomy, checkpoint layers, adaptation reasons, missed-day reentry, and recovery state machine.

**Wave 2 *(blocked on Wave 1 completion)***
- `10-02` - Program Persistence, Actions, Entitlements, And Free/Pro Projection. Complete as of 2026-05-08 with program cycle/week/mission/checkpoint/event storage, authenticated lifecycle actions, Pro program entitlements, honest Free/Pro projection, and target DB migration application.

**Wave 3 *(blocked on Wave 2 completion)***
- `10-03` - Dedicated Ciclo Pro Program Route. Complete as of 2026-05-08 with `/ciclo-pro` as the full 30-day map with four adaptive weeks, missions, checkpoints, active line, repair/consolidation, and useful Free/Pro states.
- `10-04` - Dashboard Cockpit, Result Entry, And Handoffs. Complete as of 2026-05-08 with Ciclo Pro dashboard now-state, post-analysis entry, Spray Lab execution links, Analyze validation links, and evidence-preserving reentry copy.

**Wave 4 *(blocked on Wave 3 completion)***
- `10-05` - History Audit, Coach Continuity, And Copy Safety. Complete as of 2026-05-08 with history list/detail program audit, bounded coach handoff, goldens, and copy-safety coverage for overclaim/course-language risks.

**Wave 5 *(blocked on all prior plans)***
- `10-06` - Program Verification And No False Done Evidence. Complete as of 2026-05-08 with `verify:phase10:programs`, Playwright state matrix, final docs/checklist, migration evidence, and final command recording.

**Cross-cutting constraints:**
- Preserve browser-first analysis; Ciclo Pro organizes evidence and action, but Analyze remains clip ingestion/validation.
- Spray Lab remains the execution cockpit; Ciclo Pro must link to it instead of rebuilding the runner.
- Compatible clip validation is the technical proof layer; Lab/TDM/real-match evidence cannot replace it.
- Weak, conflicting, stale, or incomplete evidence must route to repair, consolidation, validation pending, or line restart instead of fake progress.
- Free remains useful and honest; Pro unlocks the full 30-day adaptive/auditable cycle.
- Do not claim perfect sensitivity, guaranteed improvement/rank, global player grade, medical benefit, or official PUBG/KRAFTON affiliation.
- Program storage must stay privacy-minimal and avoid raw video, health history, body metrics, or medical detail.
- Final Delivered status requires the dedicated Phase 10 verifier, focused tests, typecheck, full Vitest, benchmark gate, build, browser evidence, and target DB migration evidence.

## Phase 11: Social Pro Community Premium

**Goal:** Add Pro social value while keeping public community as a trust funnel.

**Requirements:** MON-01, MON-02, MON-03, MON-04, MON-05

**Success Criteria:**

1. Public feed, public posts, basic profiles, and basic engagement remain open/free where already open.
2. Pro social value includes premium report sharing, Pro badges, saved drills, private collections, advanced post context, or creator analytics.
3. Community upgrade cues point to original Sens PUBG value: analysis, coach, history, training programs, and validation.
4. Community entitlements do not leak into product Pro access without shared server-side entitlement truth.
5. No exclusive paid value is based only on PUBG API-derived data.

**UI hint:** yes

**Plans:** 13/13 plans complete

**Wave 0**
- [x] `11-00-PLAN.md` — Wave 0 Social Pro validation scaffold for tests, verifier, Playwright matrix, and package script registration.

**Wave 1 *(blocked on Wave 0 completion)***
- [x] `11-01-PLAN.md` — Social Pro contracts, public-safe redaction, and No False Premium verifier foundation.

**Wave 2 *(blocked on Wave 1 completion)***
- [x] `11-02-PLAN.md` — Product entitlement activation and server-owned Social Pro access.
- [x] `11-03-PLAN.md` — Social Pro persistence schema, migration, and blocking Drizzle schema push.

**Wave 3 *(blocked on Wave 2 completion)***
- [x] `11-04-PLAN.md` — Relatorio Pro Compartilhavel server lifecycle, public-safe snapshots, and private link controls.
- [x] `11-05-PLAN.md` — Private Pro library, safe creator analytics, and privacy-minimal Social Pro upgrade intent.

**Wave 4 *(blocked on Wave 3 completion)***
- [x] `11-06-PLAN.md` — Public-safe report route, unlisted link reading, and Pro report moderation audit.
- [x] `11-07-PLAN.md` — Community Pro cockpit, public surface regressions, and hub copy safety.
- [x] `11-08-PLAN.md` — Analyze and dashboard report/library handoffs.
- [x] `11-09-PLAN.md` — Ciclo Pro and Spray Lab Social Pro handoffs.
- [x] `11-10-PLAN.md` — History list/detail report and Pro library continuity.
- [x] `11-11-PLAN.md` — Discreet Pro badge, profile, and post identity surfaces.

**Wave 5 *(blocked on Wave 4 completion)***
- [x] `11-12-PLAN.md` — No False Premium Playwright matrix, final evidence checklist, and required verification gates.

**Cross-cutting constraints:**
- Public community basics remain open/free where already open: feed, posts, basic profiles, likes, comments, normal saves, follows, and reading.
- Pro social value is depth, polish, organization, sharing, audit continuity, private context library, saved drills, advanced context, badge access signal, and safe creator impact.
- Product Pro access is server-owned through the product access resolver; UI state and inactive community entitlement scaffolding never grant Phase 11 Pro.
- Public reports and private-link reports are public-safe/redacted and cannot hide confidence, coverage, blockers, inconclusive or limited support, validation state, or no-overclaim disclaimers.
- No Phase 11 paid value is based only on PUBG API-derived data; copy avoids perfect sensitivity, guaranteed improvement/rank, global grades, official PUBG/KRAFTON affiliation, and paid-user authority.
- Final Delivered status requires `npm run verify:phase11:social-pro`, focused Phase 11 tests, community/monetization gates, typecheck, full Vitest, benchmark gate, build, and desktop/mobile Playwright evidence.

## Phase 12: Revenue Operations Hardening

**Goal:** Make the paid system observable, supportable, and ready for real launch decisions.

**Requirements:** ANALYT-03

**Success Criteria:**

1. Admin can inspect activation, upgrade intent, free-to-paid conversion, churn, and usage-limit events.
2. Release readiness includes paid-flow checks.
3. Support/admin states distinguish payment, entitlement, auth, and analysis issues.
4. Production launch checklist includes env, billing webhooks, OAuth, database migration, deployed smoke, and compliance copy.

**UI hint:** yes

**Plans:** 6/6 plans complete

**Wave 0**
- [x] `12-00-PLAN.md` - Revenue Ops validation scaffold for tests, verifier, Playwright matrix, and package script registration.

**Wave 1 *(blocked on Wave 0 completion)***
- [x] `12-01-PLAN.md` - Privacy-safe funnel aggregation, Revenue Ops metric contracts, and staff-only cockpit snapshot.
- [x] `12-02-PLAN.md` - Support-domain diagnosis, explicit Pro no-access cause tree, and conservative admin/support operations.

**Wave 2 *(blocked on Wave 1 completion)***
- [x] `12-03-PLAN.md` - Paid launch readiness gates, versioned evidence matrix, Stripe test/production separation, and safe degradation.

**Wave 3 *(blocked on Wave 2 completion)***
- [x] `12-04-PLAN.md` - Staff-only Revenue Ops launch-control cockpit UI and admin navigation.

**Wave 4 *(blocked on Wave 3 completion)***
- [x] `12-05-PLAN.md` - No False Launch Playwright matrix, copy safety, final checklist, and dedicated Phase 12 verifier. (completed 2026-05-10)

**Cross-cutting constraints:**
- Preserve the browser-first analysis path; Phase 12 observes and supports the paid system without adding backend video processing.
- Product Pro access remains server-owned through Stripe/subscription/manual-grant/resolver truth; URLs, localStorage, client state, and success pages never grant Pro.
- Revenue Ops is aggregate and privacy-minimal by default; user-level detail requires a concrete operational reason.
- Support can inspect, note, copy safe summaries, open billing context, and request reconciliation; only admin mutates paid state.
- Stripe test and production evidence remain separate; production cannot inherit test-mode PASS.
- Real charging remains blocked until the paid-flow evidence matrix is complete.
- NO-GO states must show blocker, impact, owner, runbook, missing evidence, and the smallest next verifiable step.
- Delivered status requires complete implementation, automated gates, manual paid-flow, deploy/readiness, support, privacy, compliance, and browser evidence.

## Phase 13: Team And Coach Expansion

**Goal:** Serve teams/coaches after solo paid value is validated.

**Requirements:** TEAM-01, TEAM-02

**Success Criteria:**

1. Team/coach workflow can review multiple player reports.
2. Premium report sharing/export protects private account data.
3. Team feature gate is separate from solo Pro.
4. Roadmap can support seat-based billing later.

**UI hint:** yes

## Coverage Validation

- v1 requirements covered: 22/22
- Existing v1 requirements remain covered after launch-hardening expansion: yes
- Added phases preserve the complete training, premium UI/UX, validation, Spray Lab, and community Pro vision: yes
- Monetization begins after precision, benchmark, and coach foundations: yes
- Closed beta can begin after safe Phase 5 monetization; public launch waits for validation, premium UX, training value, and revenue ops: yes
- Team/coaches remain included without blocking first paid solo launch: yes

---
*Roadmap created: 2026-05-05 after research-backed brownfield initialization*
