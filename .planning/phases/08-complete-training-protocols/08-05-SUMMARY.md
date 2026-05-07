---
phase: 08-complete-training-protocols
plan: 05
subsystem: protocol-guardrails-goldens-benchmark
tags: [coach, training-protocols, llm, goldens, benchmark, copy-safety]

requires:
  - phase: 08-complete-training-protocols
    plan: 01
    provides: CompleteTrainingProtocol v1 contract and deterministic protocol builder
  - phase: 08-complete-training-protocols
    plan: 03
    provides: post-analysis complete protocol ficha and Free/Pro projection
provides:
  - LLM immutable facts for complete protocol technical truth
  - Adapter checks that permit only safe display copy rewrites
  - Coach golden matrix for normal, weak-evidence, conflict, and fatigue protocol cases
  - Benchmark truth checks for complete protocol tier, drill, dose, downgrade, validation, and transfer facts
  - Product copy claim gate for medical and strength-program overclaims
affects: [phase-08, coach, training-protocols, llm-guardrails, benchmark, copy-safety]

tech-stack:
  added: []
  patterns:
    - Complete protocol technical facts stay deterministic and immutable across optional LLM copy polish
    - Golden and benchmark expectations lock protocol truth separately from display text
    - Safety copy is blocked by contract tests while stop/professional guidance remains allowed

key-files:
  created:
    - src/core/coach-llm-contract.test.ts
    - tests/goldens/coach/complete-protocol-vertical-control.json
    - tests/goldens/coach/complete-protocol-low-confidence.json
    - tests/goldens/coach/complete-protocol-outcome-conflict.json
    - tests/goldens/coach/complete-protocol-fatigue.json
  modified:
    - src/core/coach-llm-contract.ts
    - src/core/coach-llm-adapter.ts
    - src/core/coach-llm-adapter.test.ts
    - scripts/run-coach-goldens.ts
    - src/core/coach-golden-runner.test.ts
    - scripts/run-benchmark.ts
    - src/core/benchmark-runner.test.ts
    - src/types/benchmark.ts
    - tests/goldens/benchmark/synthetic-benchmark.v1.json
    - src/app/copy-claims.contract.test.ts

key-decisions:
  - "LLM output may rewrite only complete protocol display fields and must preserve protocol ID/count/order plus all technical facts."
  - "Benchmark truth now checks completeProtocol only when fixture truth opts into it, with synthetic benchmark fixtures locking the Phase 8 coach-covered clips."
  - "Copy safety treats short words such as cura and carga as exact normalized terms to avoid false positives like procura or Spanish UI copy."
  - "Safe stop guidance remains explicitly allowed: stop on pain/numbness/tingling and seek professional guidance if it persists."

patterns-established:
  - "buildCoachImmutableFacts now carries completeProtocol facts alongside session/coach facts before any optional LLM rewrite."
  - "run-coach-goldens supports expectedCompleteProtocol and scenario-driven protocol cases."
  - "benchmark truth has a completeProtocol stable expectation helper plus mismatch paths such as nextBlock.completeProtocol.drillId."

requirements-completed: [COACH-01, COACH-02, COACH-03, COACH-04, COACH-05, BENCH-01, BENCH-03]

duration: 30 min
completed: 2026-05-07
---

# Phase 08 Plan 05: LLM Guardrails, Coach Goldens, Benchmark, And Copy Safety Summary

**Complete protocols now have regression gates around the places most likely to drift: optional LLM polish, golden coach behavior, benchmark truth, and unsafe product copy.**

## Performance

- **Duration:** 30 min
- **Started:** 2026-05-07T20:36:48Z
- **Completed:** 2026-05-07T21:06:35Z
- **Tasks:** 3/3
- **Files modified:** 15

## Accomplishments

- Added complete protocol immutable facts to the coach LLM contract, including version, ID, drill, tier, focus, environment/context, dose, target, validation, stop/continue rules, downgrade reasons, preparation IDs, and transfer truth.
- Restricted complete protocol LLM output to display-safe fields only, with adapter rejection for changed IDs/counts/order, blocked copy, mutated dose, validation, transfer, or hidden technical fields.
- Added a coach golden matrix for vertical control, low confidence, outcome conflict, and fatigue/pain, with runner checks for drill, tier, duration, reps, environment, target, downgrade reasons, repair actions, validation, and transfer truth.
- Extended benchmark truth schemas and synthetic fixture expectations so complete protocol tier, drill ID, duration, spray reps, environment, downgrade reasons, validation target, and `transferCountsAsTechnicalValidation === false` are checked.
- Expanded product copy claim contracts to block medical diagnosis/treatment/cure language, continue-through-pain copy, and strength-program prescription language while allowing safe stop/professional guidance.

## Task Commits

Plan 08-05 implementation was committed as:

1. **Task 1: Extend LLM contract immutable facts** - `1a6128b`
2. **Task 2: Add coach golden protocol matrix** - `77837da`
3. **Task 3: Extend benchmark and copy safety gates** - `b197517`

## Files Created/Modified

- `src/core/coach-llm-contract.ts` - Added complete protocol immutable facts and display-only complete protocol LLM output schema.
- `src/core/coach-llm-contract.test.ts` - Added contract coverage for schema limits and immutable complete protocol facts.
- `src/core/coach-llm-adapter.ts` - Added complete protocol rewrite preservation checks and blocked-copy validation.
- `src/core/coach-llm-adapter.test.ts` - Covered unsafe complete protocol mutations and safe display rewrites.
- `scripts/run-coach-goldens.ts` - Added complete protocol golden expectations and scenario support.
- `src/core/coach-golden-runner.test.ts` - Locked the expanded coach fixture set and missing-field failure behavior.
- `tests/goldens/coach/complete-protocol-vertical-control.json` - Added usable vertical-control protocol fixture.
- `tests/goldens/coach/complete-protocol-low-confidence.json` - Added weak evidence downgrade fixture.
- `tests/goldens/coach/complete-protocol-outcome-conflict.json` - Added outcome-conflict conservative validation fixture.
- `tests/goldens/coach/complete-protocol-fatigue.json` - Added fatigue/pain dose-reduction and stop-guidance fixture.
- `scripts/run-benchmark.ts` - Added stable complete protocol truth extraction and comparison.
- `src/types/benchmark.ts` - Added benchmark complete protocol expectation schema.
- `src/core/benchmark-runner.test.ts` - Added regression coverage for complete protocol truth drift.
- `tests/goldens/benchmark/synthetic-benchmark.v1.json` - Locked complete protocol truth for all synthetic coach-covered clips.
- `src/app/copy-claims.contract.test.ts` - Added medical/strength overclaim blocks and allowed safe stop guidance.

## Decisions Made

- Kept the deterministic protocol builder as the source of truth. The LLM may polish visible copy but cannot invent, remove, or alter protocol mechanics.
- Used display-specific complete protocol rewrite fields instead of passing technical protocol internals back through LLM output.
- Kept benchmark complete protocol assertions opt-in per fixture, then opted in for the synthetic benchmark clips covered by this plan.
- Made `cura` and `carga` exact-word blocked claims after focused tests showed substring false positives in ordinary UI copy.

## Deviations from Plan

- Executed inline in the main Codex thread because Wave 4 contained only one plan. Atomic task commit boundaries were still preserved.
- `tests/goldens/benchmark/synthetic-benchmark.baseline.json` did not need changes; current regression baseline comparison remained stable with the updated synthetic v1 truth expectations.

## Issues Encountered

- Pre-commit typecheck caught a readonly downgrade-reasons array assignment in `scripts/run-benchmark.ts`; fixed by copying the array into the stable expectation.
- Copy claim tests initially matched `cura` inside `procura` and `carga` inside Spanish UI words; fixed by exact normalized matching for those short terms.
- Full Vitest still emits existing expected analytics/drop and database-error stderr from tests that intentionally exercise failure paths. The suite exited successfully.

## Verification

- `npx vitest run src/core/coach-llm-contract.test.ts src/core/coach-llm-adapter.test.ts` - PASS.
- `npx vitest run src/core/coach-golden-runner.test.ts` - PASS.
- `node --version` - PASS: `v24.15.0`.
- `npx tsx scripts/run-coach-goldens.ts` - PASS: 10 fixtures, 0 failed.
- `npx vitest run src/core/benchmark-runner.test.ts src/app/copy-claims.contract.test.ts` - PASS.
- `npm run benchmark:gate` - PASS: synthetic benchmark 3/3, captured benchmark 5/5, coverage starter gate PASS.
- `npx vitest run src/core/coach-llm-contract.test.ts src/core/coach-llm-adapter.test.ts src/core/coach-golden-runner.test.ts src/core/benchmark-runner.test.ts src/app/copy-claims.contract.test.ts` - PASS, 5 files / 42 tests.
- `npm run typecheck` - PASS.
- `npx vitest run` - PASS.

## User Setup Required

None.

## Next Phase Readiness

Ready for Phase 8 Wave 5 / plan 08-06. The complete protocol guardrails now cover deterministic truth, optional LLM copy polish, coach goldens, benchmark truth, and unsafe product copy.

## Self-Check: PASSED

- Summary file created.
- Acceptance criteria passed through focused tests, typecheck, full Vitest, and benchmark gate.
- Complete protocol immutable facts block LLM mutation of drill, dose, validation, downgrade, and transfer truth.
- Coach goldens and synthetic benchmark fixtures now fail on complete protocol truth drift.
- Copy safety blocks medical, pain-through, and strength-program claims while allowing safe stop/pro guidance.

---
*Phase: 08-complete-training-protocols*
*Completed: 2026-05-07*
