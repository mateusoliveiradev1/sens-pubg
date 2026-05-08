---
phase: 09-pubg-spray-lab-session-runner-and-benchmark
plan: 05
subsystem: coach-history-dashboard
tags: [spray-lab, coach, dashboard, history, validation]

requires:
  - phase: 09-pubg-spray-lab-session-runner-and-benchmark
    provides: Spray Lab sessions, validation links, benchmark snapshots, and repair states from 09-01 through 09-04
  - phase: 06-coach-protocol-outcomes
    provides: Coach protocol outcome and transfer evidence model
provides:
  - Spray Lab coach handoff adapter with explicit execution, technical-proof, and transfer evidence separation
  - Dashboard active loop command center state for continuing, repairing, closing, or validating a Lab session
  - History list/detail continuity cards for Lab fidelity, index, validation, transfer, and blockers
  - Result/outcome CTAs that preserve Lab and protocol context for compatible validation
affects: [phase-09, coach, dashboard, history, analyze, spray-lab]

key-files:
  created:
    - src/core/spray-lab-coach-handoff.ts
    - src/core/spray-lab-coach-handoff.test.ts
  modified:
    - src/actions/dashboard-active-coach-loop.ts
    - src/actions/dashboard-active-coach-loop.test.ts
    - src/actions/dashboard.ts
    - src/actions/history.ts
    - src/actions/history.test.ts
    - src/app/analyze/results-dashboard-view-model.ts
    - src/app/analyze/results-dashboard-view-model.test.ts
    - src/app/analyze/results-dashboard.tsx
    - src/app/dashboard/page.tsx
    - src/app/history/[id]/coach-protocol-outcome-panel.tsx
    - src/app/history/[id]/page.tsx
    - src/app/history/history-protocol-view-model.ts
    - src/app/history/history-protocol-view-model.test.ts
    - src/app/history/page.tsx

requirements-completed: [BENCH-01, BENCH-02, BENCH-03, COACH-01, COACH-02, COACH-03, HIST-01]
duration: 32 min
completed: 2026-05-08
---

# Phase 09 Plan 05: Coach, History, And Dashboard Continuity Summary

**Delivered Spray Lab continuity across coach, dashboard, history, and result CTAs without upgrading weak or transfer-only evidence into technical proof.**

## Performance

- **Duration:** 32 min
- **Completed:** 2026-05-08T13:48:16Z
- **Tasks:** 4/4
- **Implementation commit:** not committed in this session

## Accomplishments

- Added `buildSprayLabCoachHandoff(...)` to translate Lab session state into coach-safe evidence: execution state, compatible technical validation, practical transfer, repair blockers, and one next action.
- Wired the dashboard active loop to show Lab continuation/repair/validation states as a single primary action while respecting entitlement state.
- Added Lab continuity to history cards and detail audit: context, fidelity, provisional/validated index, validation status, transfer label, blockers, and next action.
- Updated result and outcome CTAs to carry `protocolId`; existing Lab sessions now route compatible validation through `mode=validation&labSessionId=...`.
- Guarded history reads so older tests and partial DB mocks do not leak malformed Spray Lab rows into UI summaries.

## Decisions Made

- TDM/real-match transfer remains practical evidence only; it never promotes Lab confidence or validated score by itself.
- Lab validated score only appears after a compatible validation link and a validated benchmark-quality state.
- Repair, blocked, and inconclusive states take priority over stronger coach actions unless a compatible validation already confirms the result.
- Result CTAs can open the Lab runner when no Lab session exists, but only existing Lab sessions route directly to Analyze validation mode.

## Deviations from Plan

- I kept browser visual evidence for the final 09-06 gate, because this plan's changes are mostly server/view-model continuity and the remaining phase verifier is intended to own the final UI evidence package.

## Verification

- `npx vitest run src/actions/history.test.ts src/core/spray-lab-coach-handoff.test.ts src/actions/dashboard-active-coach-loop.test.ts src/app/history/history-protocol-view-model.test.ts src/app/analyze/results-dashboard-view-model.test.ts` - PASS, 66 tests.

## Self-Check: PASSED

- No perfect sensitivity or guaranteed improvement claims were added.
- Confidence, coverage, inconclusive behavior, repair state, and transfer limits remain visible.
- Coach handoff separates execution evidence, technical proof, and practical transfer evidence.
- Dashboard/history/result CTAs keep Lab and protocol context instead of flattening validation into a generic analyze action.
