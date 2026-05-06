---
phase: 06-core-accuracy-and-pro-validation-hardening
plan: 05
status: completed
completed_at: "2026-05-06T20:43:10Z"
requirements: [BENCH-01, BENCH-02, BENCH-03, PREC-01, PREC-02, PREC-04, COACH-01, COACH-02, COACH-04, COACH-05]
---

# 06-05 Summary: Calibration Reports And Commercial Benchmark Gate

## Delivered

- Added `buildAnalysisCalibrationReport` as a pure calibration report model covering overconfidence, underconfidence, inconclusive correctness, blocker accuracy, sensitivity safety, coach handoff safety, corpus coverage, and baseline regression.
- Added deterministic calibration status semantics: `passed`, `partial`, and `blocked`; missing reviewed permissioned commercial benchmark evidence is partial, while overconfidence, blocker false negatives, unsafe handoffs, or calibration regressions block.
- Extended benchmark dataset types with optional `labels.expectedCalibration` for expected decision level, blocker reasons, reviewer correctness, predicted confidence, and permissioned/commercial eligibility metadata.
- Integrated calibration into the canonical strict `benchmark:release` gate while leaving fast `benchmark:gate` unchanged.
- Wired `benchmark:release` to captured benchmark results and the consent manifest, producing calibration records from reviewed/golden clips and refusing to count the current placeholder internal-only consent records as commercial-ready evidence.
- Updated release report markdown/console output with calibration status, gaps, and a `## Calibration` section.
- Refreshed `docs/benchmark-reports/latest.md` and the dated `docs/benchmark-reports/2026-05-06.md`; both now report `PARTIAL` commercial readiness because there are 0 reviewed permissioned commercial benchmark clips.
- Updated benchmark docs to name `benchmark:release` as the strict commercial truth gate and document calibration thresholds and claim prerequisites.

## Key Files

- `src/core/analysis-calibration-report.ts`
- `src/core/analysis-calibration-report.test.ts`
- `src/types/benchmark.ts`
- `src/types/benchmark.test.ts`
- `src/core/benchmark-release-report.ts`
- `src/core/benchmark-release-report.test.ts`
- `scripts/run-benchmark-release.ts`
- `src/ci/benchmark-workflow.test.ts`
- `docs/benchmark-runner.md`
- `docs/benchmark-reports/latest.md`
- `docs/benchmark-reports/2026-05-06.md`

## Verification

- `npx vitest run src/core/analysis-calibration-report.test.ts src/types/benchmark.test.ts src/core/benchmark-release-report.test.ts src/ci/benchmark-workflow.test.ts` PASS
- `npm run benchmark:release` PASS with `benchmark:release PARTIAL` and calibration gap for 0 commercial eligible clips
- `npm run benchmark:gate` PASS
- `npm run typecheck` PASS
- `npx vitest run` PASS on rerun: 148 files, 837 tests. First full run hit a transient Vitest worker exit after passing tests; the immediate rerun passed.
- `git diff --check` PASS

## Notes

- `benchmark:release` exits non-zero only for `blocked` release status. `partial` is intentionally not a passed commercial-readiness state, but remains shell-successful so maintainers can generate and inspect reports before real commercial corpus evidence exists.
- Current captured consent fixtures are still internal-validation placeholders. They count as reviewed permissioned calibration records but not commercial benchmark evidence, so strong public precision claims remain unavailable.
