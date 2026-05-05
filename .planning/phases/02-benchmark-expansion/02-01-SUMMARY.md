---
phase: 02-benchmark-expansion
plan: 01
subsystem: testing
tags: [benchmark, measurement-truth, coach-plan, regression, golden]
requires: [01-01]
provides:
  - Truth-aware benchmark dataset schema for action state, mechanical level, evidence tier, focus priorities, and next-block protocol.
  - Benchmark runner truth result section with per-field mismatch reporting.
  - Synthetic and captured benchmark fixtures populated with stable truth expectations.
affects: [benchmark, release-gate, coach, measurement-truth, captured-clips]
tech-stack:
  added: []
  patterns:
    - Benchmark truth uses stable internal enums instead of UI copy labels.
    - Secondary coach focuses are compared as unordered expected sets.
key-files:
  created: []
  modified:
    - src/types/benchmark.ts
    - src/types/benchmark.test.ts
    - scripts/run-benchmark.ts
    - src/core/benchmark-runner.test.ts
    - tests/goldens/benchmark/synthetic-benchmark.v1.json
    - tests/goldens/benchmark/captured-benchmark-draft.json
    - docs/benchmark-runner.md
key-decisions:
  - "expectedTruth is required on benchmark labels and stores only stable enums/fields."
  - "Correct conservative refusal can pass when expected as capture_again or inconclusive."
  - "Truth comparison reports exact field drift without weakening tracking, diagnosis, or coach checks."
patterns-established:
  - "runBenchmark now returns tracking, diagnostics, coach, and truth sections for every clip."
  - "Dataset truth expectations live beside clip labels and metadata."
requirements-completed: [BENCH-01, BENCH-02, BENCH-03]
duration: 24 min
completed: 2026-05-05
---

# Phase 02 Plan 01: Truth-Aware Benchmark Contract Summary

**Benchmarks now pin the Phase 1 measurement truth contract, not just tracking and diagnosis output**

## Performance

- **Duration:** 24 min
- **Started:** 2026-05-05T15:16:46Z
- **Completed:** 2026-05-05T15:40:00Z
- **Tasks:** 3/3
- **Files modified:** 7

## Accomplishments

- Added `expectedTruth` schema coverage for mastery action, mechanical level, evidence tier, weak-evidence downgrade, focus areas, and next-block protocol fields.
- Extended `scripts/run-benchmark.ts` so synthetic and captured clips produce and compare truth results with readable mismatches.
- Updated synthetic and captured golden datasets with current green behavior after checking weak-evidence and ready/apply expectations.
- Documented stable internal truth enums and correct refusal behavior in `docs/benchmark-runner.md`.

## Task Commits

1. **Task 1: Add stable truth expectations to benchmark schema** - `4ab0d52`
2. **Task 2: Evaluate mastery and next-block structure in the runner** - `4ab0d52`
3. **Task 3: Update benchmark datasets and docs for truth expectations** - `4ab0d52`

Implementation was batched into one verified commit after the three wave tasks were completed.

## Files Created/Modified

- `src/types/benchmark.ts` - Adds truth expectation schemas and stronger validation for diagnosed and weak-evidence clips.
- `src/types/benchmark.test.ts` - Covers truth schema acceptance and rejection cases.
- `scripts/run-benchmark.ts` - Resolves and compares truth results for synthetic and captured benchmark clips.
- `src/core/benchmark-runner.test.ts` - Pins truth drift, unordered secondary focus comparison, and next-block protocol checks.
- `tests/goldens/benchmark/synthetic-benchmark.v1.json` - Adds synthetic truth expectations.
- `tests/goldens/benchmark/captured-benchmark-draft.json` - Adds captured truth expectations and coach plan expectations.
- `docs/benchmark-runner.md` - Explains truth expectations, stable enums, and conservative pass states.

## Decisions Made

- Kept Portuguese UI labels out of benchmark truth so copy can change without corrupting technical expectations.
- Preserved `expectedCoachPlan` as a compatible fixture field while making `expectedTruth` the richer strict contract.
- Treated `capture_again` and `inconclusive` as first-class passing outcomes when evidence is weak.

## Deviations from Plan

None. The implementation followed the planned schema, runner, dataset, and documentation scope.

## Issues Encountered

- TypeScript exact optional property checks required conditional spreads when passing optional video quality into the truth resolver. Fixed before final validation.
- A captured-label fixture test needed an explicit truth expectation after `expectedTruth` became required.

## Verification

- `npx vitest run src/types/benchmark.test.ts src/core/benchmark-runner.test.ts` - passed.
- `npm run typecheck` - passed.
- `npx vitest run` - passed, 121 files / 593 tests.
- `npm run benchmark:gate` - passed.

## User Setup Required

None.

## Next Phase Readiness

Plan 02-02 can consume truth-aware benchmark reports to block release/commercial regressions, and Plan 02-03 can require the same truth labels before captured clips mature.

---
*Phase: 02-benchmark-expansion*
*Completed: 2026-05-05*
