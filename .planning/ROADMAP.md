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
| 5 | Freemium Pro MVP | Activate paid solo-player monetization safely | ANALYT-01, ANALYT-02, MON-01, MON-02, MON-03, MON-04, MON-05 |
| 6 | Team And Coach Expansion | Extend paid value to teams/coaches after solo proof | TEAM-01, TEAM-02 |
| 7 | Revenue Operations Hardening | Make the paid system measurable, supportable, and launch-ready | ANALYT-03 |

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

**Requirements:** ANALYT-01, ANALYT-02, MON-01, MON-02, MON-03, MON-04, MON-05

**Success Criteria:**

1. Free tier has useful but limited analysis access.
2. Pro tier unlocks full coach plan, higher limits, history trends, and advanced metrics.
3. Subscription status maps into existing entitlement/access checks.
4. Paywall copy is honest, independent from PUBG/KRAFTON, and avoids guaranteed outcomes.
5. Product analytics tracks activation and upgrade intent.

**UI hint:** yes

## Phase 6: Team And Coach Expansion

**Goal:** Serve teams/coaches after solo paid value is validated.

**Requirements:** TEAM-01, TEAM-02

**Success Criteria:**

1. Team/coach workflow can review multiple player reports.
2. Premium report sharing/export protects private account data.
3. Team feature gate is separate from solo Pro.
4. Roadmap can support seat-based billing later.

**UI hint:** yes

## Phase 7: Revenue Operations Hardening

**Goal:** Make the paid system observable, supportable, and ready for real launch decisions.

**Requirements:** ANALYT-03

**Success Criteria:**

1. Admin can inspect activation, upgrade intent, free-to-paid conversion, churn, and usage-limit events.
2. Release readiness includes paid-flow checks.
3. Support/admin states distinguish payment, entitlement, auth, and analysis issues.
4. Production launch checklist includes env, billing webhooks, OAuth, database migration, deployed smoke, and compliance copy.

**UI hint:** yes

## Coverage Validation

- v1 requirements covered: 22/22
- Requirements mapped exactly once: yes
- Monetization begins after precision, benchmark, and coach foundations: yes
- Team/coaches included without blocking first paid solo launch: yes

---
*Roadmap created: 2026-05-05 after research-backed brownfield initialization*
