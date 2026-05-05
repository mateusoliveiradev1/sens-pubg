---
phase: 01-measurement-truth-contract
plan: 03
subsystem: dashboard
tags: [measurement-truth, dashboard, evidence, trend, coach, arsenal]
requires: [01-01]
provides:
  - Dashboard stats include latest mastery, coach next block, and trend evidence.
  - Pure dashboard truth view model for next action, trend copy, evidence state, and arsenal context.
  - Dashboard page consumes truth view model before raw weapon/score heuristics.
affects: [dashboard, history, coach, trend-copy, arsenal]
tech-stack:
  added: []
  patterns:
    - Server action hydrates recent stored fullResult records through the history normalization path.
    - Trend copy is gated by confidence and coverage before calling positive deltas progress.
key-files:
  created:
    - src/app/dashboard/dashboard-truth-view-model.ts
    - src/app/dashboard/dashboard-truth-view-model.test.ts
  modified:
    - src/actions/dashboard.ts
    - src/app/dashboard/page.tsx
    - src/app/dashboard/page.contract.test.ts
key-decisions:
  - "Dashboard trend evidence uses recent hydrated mastery samples instead of raw score deltas alone."
  - "Positive deltas become progress copy only when coverage/confidence gates pass."
  - "Arsenal remains contextual support unless evidence is strong enough to guide the current training action."
patterns-established:
  - "DashboardStats exposes latestMastery, latestCoachNextBlock, and trendEvidence."
  - "DashboardPage delegates next action and trend language to buildDashboardTruthViewModel."
requirements-completed: [PREC-01, PREC-02, PREC-04]
duration: 20 min
completed: 2026-05-05
---

# Phase 01 Plan 03: Truth-Aware Dashboard Cockpit Summary

**Dashboard now uses the shared mastery contract to drive next action and evidence-gated trend language**

## Performance

- **Duration:** 20 min
- **Started:** 2026-05-05T07:56:00Z
- **Completed:** 2026-05-05T08:02:00Z
- **Tasks:** 3/3
- **Files modified:** 5

## Accomplishments

- Extended `DashboardStats` with `latestMastery`, `latestCoachNextBlock`, and `trendEvidence`.
- Added a bounded recent-session query over `analysisSessions.fullResult`, hydrating stored/legacy results through the history normalization path.
- Added `buildDashboardTruthViewModel` for deterministic next action, trend, evidence, next block, and arsenal copy.
- Updated `/dashboard` to use truth-model next action and latest mastery evidence instead of deriving the top action only from weakest/best weapon heuristics.
- Added contract and unit tests proving weak positive trends stay validation language, ready still requires validation, testable uses coach next block, and `WeaponIcon` remains in place.

## Files Created/Modified

- `src/actions/dashboard.ts` - Adds latest truth summary, coach next block, and trend evidence from recent hydrated analysis results.
- `src/app/dashboard/dashboard-truth-view-model.ts` - Pure dashboard truth model for next action, trend copy, evidence state, next block, and arsenal context.
- `src/app/dashboard/dashboard-truth-view-model.test.ts` - Covers capture-again, inconclusive, testable, ready, weak positive trend, and strong positive trend cases.
- `src/app/dashboard/page.tsx` - Renders truth-aware next step, latest mastery, evidence, trend copy, and contextual arsenal support.
- `src/app/dashboard/page.contract.test.ts` - Locks view-model usage, evidence language, dashboard sections, and legal-safe `WeaponIcon`.

## Decisions Made

- Reused `hydrateAnalysisResultFromHistory` so dashboard legacy backfill semantics match history pages.
- Kept aggregate SQL stats unchanged and layered truth data beside them.
- Treated missing mastery as missing evidence, not hidden progress.
- Left weapon priority visible, but it now supports the current training action instead of owning the next step.

## Deviations from Plan

None.

## Issues Encountered

None beyond normal strict typing checks.

## Verification

- `npx vitest run src/app/dashboard/dashboard-truth-view-model.test.ts src/app/dashboard/page.contract.test.ts` - passed.
- `npm run typecheck` - passed.
- `npx vitest run` - passed, 119 files / 577 tests.
- `npm run benchmark:gate` - passed.

## User Setup Required

None.

## Next Phase Readiness

Phase 01 is ready for final verification: analysis result, dashboard, and history/storage paths all consume or preserve the shared measurement truth contract.

---
*Phase: 01-measurement-truth-contract*
*Completed: 2026-05-05*
