---
phase: 06-core-accuracy-and-pro-validation-hardening
plan: 01
subsystem: analysis
tags: [spray-truth-v2, validity, confidence, benchmark, browser-analysis]

requires:
  - phase: 01-measurement-truth-contract
    provides: confidence-aware mastery and weak-evidence downgrade behavior
  - phase: 05-freemium-pro-mvp
    provides: useful-result quota semantics for non-billable weak captures
provides:
  - Versioned spray-truth-v2 decision ladder and permission matrix
  - Spray validity report with explicit invalid clip blocker reasons
  - Browser analysis guard that blocks invalid clips before worker tracking
affects: [analysis-engine, capture-quality, quota, coach, sensitivity, trends, benchmark]

tech-stack:
  added: []
  patterns:
    - Pure decision resolver owns downstream display/save/quota/trend/corpus/claim permissions
    - Validity reports preserve detectSprayWindow compatibility while adding blocker evidence

key-files:
  created:
    - src/core/analysis-decision.ts
    - src/core/analysis-decision.test.ts
  modified:
    - src/types/engine.ts
    - src/core/index.ts
    - src/core/spray-window-detection.ts
    - src/core/spray-window-detection.test.ts
    - src/core/capture-quality.ts
    - src/core/capture-quality.test.ts
    - src/app/analyze/analysis-client.tsx
    - src/app/analyze/analysis-client.contract.test.ts

key-decisions:
  - "The new decision ladder is additive: old SprayActionState readers remain supported through legacyActionState."
  - "Invalid spray clips stop before worker tracking instead of falling back to the full extracted clip."
  - "Blocked and inconclusive validity states stay non-useful for quota, trends, corpus, and commercial claims."

patterns-established:
  - "Decision permissions are resolved from AnalysisDecisionLevel, not repeated downstream as ad hoc booleans."
  - "Spray validity reports carry reason codes plus recapture guidance so blocked states feel like truth protection."

requirements-completed: [PREC-01, PREC-02, PREC-04, BENCH-01]

duration: 16 min
completed: 2026-05-06
---

# Phase 06 Plan 01: Versioned Decision Ladder And Spray Validity Contract Summary

**Versioned spray-truth-v2 decision ladder with explicit invalid-clip blockers before browser worker tracking**

## Performance

- **Duration:** 16 min
- **Started:** 2026-05-06T19:22:55Z
- **Completed:** 2026-05-06T19:38:51Z
- **Tasks:** 3
- **Files modified:** 10

## Accomplishments

- Added `AnalysisEngineContractVersion`, `AnalysisDecisionLevel`, `AnalysisBlockerReasonCode`, `AnalysisDecisionPermissionMatrix`, `AnalysisDecision`, and `SprayValidityReport` to the shared engine contract.
- Created `resolveAnalysisDecision` and `permissionMatrixForDecisionLevel` so display, save, useful quota, precision trend, corpus entry, and claim permissions come from one pure source of truth.
- Rebuilt spray-window detection around `detectSprayValidity` while keeping `detectSprayWindow` available for existing callers.
- Added invalid clip detection for too-short clips, non-spray protocols, invisible reticles, flicks, target swaps, and hard cuts.
- Connected capture-quality diagnostics and the analysis client to validity blockers so `blocked_invalid_clip` does not flow into worker tracking.

## Task Commits

1. **Task 1: Add versioned analysis decision types and resolver** - `023bd9a` (feat)
2. **Task 2: Replace binary spray window detection with a validity report** - `023bd9a` (feat)
3. **Task 3: Connect capture quality and analysis client to the validity report** - `023bd9a` (feat)

**Plan metadata:** pending docs commit

## Files Created/Modified

- `src/core/analysis-decision.ts` - Pure Phase 6 decision resolver and permission matrix.
- `src/core/analysis-decision.test.ts` - Covers exact decision permissions and legacy action-state compatibility.
- `src/types/engine.ts` - Adds spray-truth-v2 decision, blocker, permission, claim, and validity report contracts.
- `src/core/spray-window-detection.ts` - Adds `detectSprayValidity` and routes `detectSprayWindow` through it.
- `src/core/spray-window-detection.test.ts` - Covers validity blockers and keeps existing window behavior green.
- `src/core/capture-quality.ts` - Allows diagnostics to carry spray validity blockers and recapture guidance.
- `src/core/capture-quality.test.ts` - Covers invalid-clip diagnostic blocker propagation and claim-safe guidance copy.
- `src/core/index.ts` - Exports the new resolver and validity detector.
- `src/app/analyze/analysis-client.tsx` - Blocks `blocked_invalid_clip` before worker tracking.
- `src/app/analyze/analysis-client.contract.test.ts` - Guards against binary-only detection and blocked full-clip fallback.

## Decisions Made

- Kept the browser-first path intact and made validity a pre-tracking gate rather than a server-side video-processing detour.
- Used an additive `legacyActionState` mapping so older saved-history surfaces can still read Phase 6 results through the existing action-state vocabulary.
- Treated blocked validity as a user-facing error path for this plan, preserving reason codes and guidance in the message while later plans recalibrate save/quota/history behavior.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- Initial typecheck found strict TypeScript issues around `exactOptionalPropertyTypes`, readonly array syntax, and an unreachable switch case. Fixed before committing and reran `npm run typecheck`.
- Full Vitest emitted expected stderr from existing mocked analytics/database failure tests, but all tests passed.

## Verification

- `npx vitest run src/core/analysis-decision.test.ts src/core/measurement-truth.test.ts` - passed, 9 tests.
- `npx vitest run src/core/spray-window-detection.test.ts` - passed, 8 tests.
- `npx vitest run src/core/capture-quality.test.ts src/app/analyze/analysis-client.contract.test.ts` - passed, 31 tests.
- `npm run typecheck` - passed.
- `npx vitest run` - passed, 146 files and 799 tests.
- `npm run benchmark:gate` - passed, synthetic and captured benchmark gates plus coverage validation.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Wave 2 can build on `spray-truth-v2`, `AnalysisBlockerReasonCode`, and `SprayValidityReport`. Tracking/camera-motion separation should feed the same blocker vocabulary instead of creating a parallel disturbance contract.

---
*Phase: 06-core-accuracy-and-pro-validation-hardening*
*Completed: 2026-05-06*
