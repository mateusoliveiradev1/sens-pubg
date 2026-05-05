# Phase 2: Benchmark Expansion - Research

**Researched:** 2026-05-05
**Status:** Ready for planning

## RESEARCH COMPLETE

Phase 2 should build on an already-green benchmark foundation. The current repo has a working synthetic regression baseline, captured clip replay, starter coverage validation, stricter SDD coverage validation, captured clip promotion, and specialist review artifacts. The missing product-hardening layer is a strict release/commercial contract that combines these pieces, protects the Phase 1 measurement truth contract, produces versioned regression reports, and makes intentional baseline updates auditable.

## Current State

- `npm run benchmark:gate` is the fast daily gate and currently passes.
- `npm run validate:sdd-coverage` exists separately and currently passes, but it is deliberately not included in `benchmark:gate` or `verify:release`.
- `scripts/run-benchmark.ts` already evaluates tracking, diagnostics, and coach for synthetic and captured datasets.
- Synthetic regression has `tests/goldens/benchmark/synthetic-benchmark.baseline.json`.
- Captured benchmark replay works from frame labels when explicit golden fixtures are absent.
- Captured dataset currently has 5 real clips, 2 weapons, 2 optics, 1 diagnosed clip, 1 specialist-reviewed golden clip, and reviewed/golden provenance.
- Phase 1 added `AnalysisResult.mastery` and `src/core/measurement-truth.ts`, so Phase 2 can benchmark the implemented action state, evidence gates, mastery pillars, and next-block contract directly.

## Key Code Findings

### Benchmark Schema

`src/types/benchmark.ts` already defines:

- capture metadata: patch, weapon, distance, stance, optic/state, attachments;
- quality metadata: `sourceType`, `reviewStatus`, occlusion, compression, visibility, provenance;
- labels: expected diagnoses, expected coach mode, expected coach plan, expected tracking tier;
- fixtures/proxy replay paths.

Important gap: expected coach plan currently checks only `tier`, `primaryFocusArea`, and `nextBlockTitle`. Phase 2 needs a richer expectation shape for Phase 1 truth-contract fields and next-block structure without storing translated UI labels as canonical truth.

### Runner

`scripts/run-benchmark.ts` already produces:

- per-clip tracking pass/fail, coverage, mean error, shot alignment error, status mismatches, confidence calibration;
- diagnostics expected/actual lists;
- coach expected/actual mode and plan;
- source breakdown for synthetic/captured/augmented;
- aggregate score and regression comparison against a baseline.

Important gap: the runner does not yet evaluate `mastery`, action state, mechanical level, weak-evidence downgrade, secondary focuses, or next-block protocol fields beyond title.

### Coverage

`src/core/benchmark-coverage.ts` already has:

- starter gate;
- stricter SDD gate;
- markdown rendering;
- dimensions for source type, review status, provenance, tracking tier, visibility, occlusion, compression, patch, weapon, optic, distance, diagnosis.

Important gap: coverage does not yet participate in a single strict release/commercial command. The strict gate should keep `benchmark:gate` fast while composing benchmark execution, SDD coverage, truth-contract checks, regression comparison, and report generation.

### Captured Clip Promotion

Existing promotion and review flow:

- `src/core/captured-golden-promotion.ts`
- `scripts/promote-captured-clips.ts`
- `src/core/captured-specialist-review-kit.ts`
- `scripts/generate-captured-specialist-review-kit.ts`
- `tests/fixtures/captured-clips/*`

The system already supports draft/reviewed/golden maturity and explicit specialist provenance. Promotion blocks missing intake/labels and only promotes golden when review decisions are approved.

Important gap: the command is not guided enough for the Phase 2 context. It should validate metadata, labels, replay, coverage impact, provenance, promotion reason, and write a markdown report. It should also enforce that reviewed clips have `expectedTrackingTier`, and that clips with expected diagnoses also include coach mode plus plan expectations.

## Current Gate Results

Observed on 2026-05-05:

- `npm run benchmark:gate` passed.
- Synthetic benchmark: 2 clips, 0 failed, score 100, no baseline regression.
- Captured benchmark: 5 clips, 0 failed, score 100.
- Starter coverage gate: PASS.
- `npm run validate:sdd-coverage` passed.
- SDD checks: current patch 1/1, distinct optics 2/2, clean captured 3/1, degraded captured 2/1, specialist-reviewed golden 1/1.

## Planning Implications

Phase 2 should avoid replacing the existing gate. The safer plan is additive:

1. Extend benchmark expectations to cover the implemented Phase 1 truth contract.
2. Add a strict release/commercial command such as `npm run benchmark:release`.
3. Add versioned synthetic and captured baselines plus dated/latest markdown reports.
4. Add an explicit baseline update command requiring reason, affected clips, and honesty rationale.
5. Upgrade captured promotion into a guided maintainer workflow with a report and stronger blockers.
6. Update docs so benchmark labels/promotion are explicitly internal maintainer/reviewer behavior, not user-facing UGC.

## Recommended Plan Shape

### Plan 02-01: Truth-Aware Benchmark Contract

Foundation plan. Extend dataset expectations and runner output for:

- `mastery.actionState`;
- `mastery.mechanicalLevel`;
- `mastery.evidence` tier behavior;
- weak-evidence downgrade;
- coach tier;
- primary focus;
- secondary focuses as unordered set when present;
- next-block protocol structure: tier/key/title, duration, exercise/steps, target, stop/continue criteria, and next-clip validation.

This plan should update schema, runner tests, synthetic/captured fixtures, and runner docs.

### Plan 02-02: Strict Release/Commercial Benchmark Gate

Gate/report plan. Add:

- `npm run benchmark:release`;
- strict composition of synthetic/captured benchmark, SDD coverage, truth-contract checks, and regression comparison;
- versioned baselines for synthetic and captured datasets;
- markdown report history plus latest report;
- pass/fail console summary;
- explicit baseline update command with mandatory reason, affected clips, and honesty rationale.

This plan should keep `benchmark:gate` as the fast day-to-day gate.

### Plan 02-03: Guided Captured Clip Promotion Workflow

Maintainer workflow plan. Add:

- guided promotion command or stricter promotion mode;
- validation for metadata, labels, replay, coverage impact, provenance, and promotion reason;
- report generation for promotion checks and next gaps;
- docs clarifying draft -> reviewed -> golden and internal-only maintainer/reviewer scope.

This plan should build on the current promotion and specialist review kit instead of replacing it.

## Risks

- If truth expectations store Portuguese product labels directly, future UI copy changes will cause false benchmark failures. Store stable enums and derive labels elsewhere.
- If captured and synthetic results are merged into one score without separate reporting, commercial evidence can overstate real-world confidence.
- If baseline update is too easy, regressions become normalized. Make the update command explicit and require reason plus affected clips.
- If `benchmark:gate` becomes too heavy, local iteration slows down. Keep strict release/commercial behavior in a separate command.
- If promotion writes dataset changes without replay and coverage impact checks, reviewed clips can enter the strict gate with weak labels.

## Verification Recommendations

Targeted planning validation should include:

- `npx vitest run src/types/benchmark.test.ts src/core/benchmark-runner.test.ts`
- `npx vitest run src/core/benchmark-coverage.test.ts src/ci/benchmark-workflow.test.ts`
- `npx vitest run src/core/captured-golden-promotion.test.ts src/core/promote-captured-clips.test.ts`
- `npm run typecheck`
- `npx vitest run`
- `npm run benchmark:gate`
- `npm run benchmark:release` after the new strict command exists

## Canonical Implementation References

- `.planning/phases/02-benchmark-expansion/02-CONTEXT.md`
- `.planning/phases/01-measurement-truth-contract/01-CONTEXT.md`
- `.planning/phases/01-measurement-truth-contract/01-01-SUMMARY.md`
- `src/core/measurement-truth.ts`
- `src/types/engine.ts`
- `src/types/benchmark.ts`
- `scripts/run-benchmark.ts`
- `src/core/benchmark-coverage.ts`
- `scripts/validate-benchmark-coverage.ts`
- `src/core/captured-golden-promotion.ts`
- `scripts/promote-captured-clips.ts`
- `src/core/captured-specialist-review-kit.ts`
- `package.json`
- `src/ci/benchmark-workflow.test.ts`
- `docs/benchmark-runner.md`
- `docs/video-benchmark-spec.md`

