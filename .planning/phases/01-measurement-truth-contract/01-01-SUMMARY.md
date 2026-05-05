---
phase: 01-measurement-truth-contract
plan: 01
subsystem: analysis
tags: [measurement-truth, analysis-result, confidence, coverage, coach, history]
requires: []
provides:
  - Shared SprayMastery contract attached to AnalysisResult.
  - Deterministic measurement truth resolver for action states, pillars, evidence, and friendly diagnosis labels.
  - New analysis and legacy history mastery population paths.
affects: [analysis-report, dashboard, history, coach, monetization]
tech-stack:
  added: []
  patterns:
    - Evidence-gated action score separated from mechanical score.
    - Legacy fullResult hydration validates stored contracts before trusting them.
key-files:
  created:
    - src/core/measurement-truth.ts
    - src/core/measurement-truth.test.ts
  modified:
    - src/types/engine.ts
    - src/core/index.ts
    - src/app/analyze/analysis-client.tsx
    - src/actions/history.ts
    - src/app/history/analysis-result-hydration.ts
    - src/app/history/analysis-result-hydration.test.ts
    - src/actions/community-squads.test.ts
key-decisions:
  - "Mechanical score remains the existing sprayScore; actionable score is capped by evidence."
  - "Ready/Pronto requires strong evidence plus apply-ready/apply-protocol signals, not one attractive clip."
  - "Malformed stored mastery is discarded and recomputed during history hydration."
patterns-established:
  - "Truth resolver composes existing metrics, sensitivity tier, coach tier, clip quality, and sub-session evidence."
  - "User-facing labels are centralized through the measurement truth resolver."
requirements-completed: [PREC-01, PREC-02, PREC-04]
duration: 34 min
completed: 2026-05-05
---

# Phase 01 Plan 01: Core Measurement Truth Contract Summary

**Evidence-gated spray mastery contract with action states, visible pillars, and history-safe hydration**

## Performance

- **Duration:** 34 min
- **Started:** 2026-05-05T07:27:04Z
- **Completed:** 2026-05-05T07:41:16Z
- **Tasks:** 3/3
- **Files modified:** 9

## Accomplishments

- Added `AnalysisResult.mastery` with action state, action label, mechanical level, actionable/mechanical scores, pillars, evidence, reasons, and blocked recommendations.
- Implemented `resolveMeasurementTruth` so weak confidence, coverage, clip quality, or capture-again sensitivity blocks aggressive recommendations.
- Populated mastery for new sub-sessions, aggregate analysis results, saved history results, and legacy hydrated results.
- Added focused tests proving labels, evidence caps, ready gates, friendly diagnosis labels, and history backfill behavior.

## Task Commits

1. **Task 1: Add shared mastery and taxonomy types** - `062216b`
2. **Task 2: Attach mastery during analysis save and history hydration** - `4d1a3dd`
3. **Task 3: Prove truth gates with focused and regression tests** - `062216b`, `930fb37`

## Files Created/Modified

- `src/types/engine.ts` - Added SprayMastery taxonomy/types and optional `AnalysisResult.mastery`.
- `src/core/measurement-truth.ts` - Added deterministic evidence-gated mastery resolver and friendly diagnosis labels.
- `src/core/measurement-truth.test.ts` - Added truth contract tests for labels, caps, ready gates, and diagnosis labels.
- `src/core/index.ts` - Re-exported measurement truth resolver.
- `src/app/analyze/analysis-client.tsx` - Attaches mastery and deterministic coach plans to new results.
- `src/actions/history.ts` - Recomputes mastery after history-aware coach enrichment before save.
- `src/app/history/analysis-result-hydration.ts` - Validates stored mastery and backfills missing/malformed legacy mastery.
- `src/app/history/analysis-result-hydration.test.ts` - Covers valid, missing, malformed, and weak-evidence mastery hydration.
- `src/actions/community-squads.test.ts` - Stabilized unrelated date-sensitive invite fixtures that blocked full-suite verification.

## Decisions Made

- Kept `metrics.sprayScore` as the mechanical score to preserve benchmark/golden behavior.
- Added a separate actionable score so strong-looking mechanics can remain visible while weak evidence caps the decision.
- Treated `Capturar de novo` and `Incerto` as distinct conservative states: unusable/very weak evidence recaptures, partial weak evidence stays inconclusive.
- Preserved stored mastery only when the full shape validates; otherwise recomputed from the normalized result.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Date-sensitive community squad fixtures blocked full Vitest**
- **Found during:** Task 3 full regression gate
- **Issue:** `src/actions/community-squads.test.ts` used an invite expiry date of 2026-04-24, which is expired on 2026-05-05. The early return left queued mocks unused and caused later unrelated squad tests to fail.
- **Fix:** Made invite expiry future-relative and reset mock queues between test cases.
- **Files modified:** `src/actions/community-squads.test.ts`
- **Verification:** `npx vitest run src/actions/community-squads.test.ts`, then full `npx vitest run`.
- **Committed in:** `930fb37`

---

**Total deviations:** 1 auto-fixed blocking test-fixture issue.
**Impact on plan:** Test-only fix outside the analysis contract. No product behavior changed; it unblocked required full-suite verification.

## Issues Encountered

- Full Vitest initially failed on the unrelated community squad fixture described above. After the fixture repair, all 118 Vitest files passed.

## Verification

- `npx vitest run src/core/measurement-truth.test.ts` - passed.
- `npx vitest run src/app/history/analysis-result-hydration.test.ts src/app/analyze/tracking-summary.test.ts` - passed.
- `npx vitest run src/core/measurement-truth.test.ts src/core/sensitivity-engine.test.ts src/core/coach-plan-builder.test.ts src/app/copy-claims.contract.test.ts` - passed.
- `npm run typecheck` - passed.
- `npx vitest run` - passed, 118 files / 560 tests.
- `npm run benchmark:gate` - passed.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Plan 01-02 can consume `AnalysisResult.mastery` and `formatDiagnosisTruthLabel` for the verdict-first report surface.
Plan 01-03 can consume stored/hydrated mastery from history/dashboard reads.

---
*Phase: 01-measurement-truth-contract*
*Completed: 2026-05-05*
