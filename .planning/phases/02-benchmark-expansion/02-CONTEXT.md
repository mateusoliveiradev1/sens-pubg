# Phase 2: Benchmark Expansion - Context

**Gathered:** 2026-05-05
**Status:** Ready for planning

<domain>
## Phase Boundary

This phase expands the benchmark system so release and commercial claims are protected by data. It must turn the current benchmark corpus into a safer maintainer workflow: strict release/commercial gate, real-clip promotion rules, truth-contract expectations from Phase 1, versioned synthetic and captured baselines, and readable regression reports.

This phase does not create a user-facing benchmark labeling product. Benchmark labels and promotion are an internal maintainer/dev/reviewer workflow, not public UGC and not something normal users do. It also does not implement monetization, new paid claims, or backend-heavy video processing. The browser-first analysis path must remain intact.

</domain>

<decisions>
## Implementation Decisions

### Rigor do gate de release
- **D-01:** Keep `benchmark:gate` as the fast day-to-day CI gate.
- **D-02:** Create a separate strict release/commercial benchmark gate, expected to be exposed as a clear single command such as `npm run benchmark:release`.
- **D-03:** The strict gate is mandatory before important releases and before any commercial claim about precision, coaching, or paid analysis value.
- **D-04:** The strict gate must require SDD coverage, benchmark regression checks, and Phase 1 truth-contract checks.
- **D-05:** SDD coverage failure must block the strict gate with a non-zero exit code.
- **D-06:** Any measurable regression must block the strict gate: more failed clips, lower score, lower coverage, higher error, worse shot alignment, or lower diagnostic/coach pass rate.
- **D-07:** Intentional regressions require explicit baseline update with justification, affected clips, and why the new behavior is better or more honest.
- **D-08:** `reviewed` clips count for the strict gate, but `golden` clips must be reported separately as stronger evidence.

### Promocao de clips reais
- **D-09:** Real captured clip maturity follows `draft -> reviewed -> golden`.
- **D-10:** `reviewed` can come from human review or machine/Codex-assisted review, but it only counts after structured checks pass.
- **D-11:** Promotion must be easy, safe, and precise through a guided command plus promotion report.
- **D-12:** The guided command must validate clip metadata, labels, replay, coverage bucket impact, provenance, and promotion reason.
- **D-13:** The guided command must update JSON artifacts for dataset/labels/provenance and generate a markdown report with checks, coverage impact, reason, and next gaps.
- **D-14:** Missing required metadata must block promotion and report the missing fields clearly.
- **D-15:** For a `reviewed` clip to count in the strict gate, `expectedTrackingTier` is always required. Expected diagnoses may be empty. If expected diagnoses are present, expected coach mode and expected coach plan are required.
- **D-16:** `golden` requires `reviewed` status, stable replay, complete metadata, benchmark pass without structural error, strong human or specialist review, and justification.
- **D-17:** Docs must explicitly say benchmark labels and clip promotion are internal maintainer/dev/reviewer processes, not user-facing UGC behavior.

### Resultados do contrato de verdade
- **D-18:** Benchmark expectations must protect the full Phase 1 decision contract: action state, mechanical level, evidence tier, weak-evidence downgrade, coach tier, primary focus, secondary focuses when present, next-block protocol, and inconclusive behavior.
- **D-19:** Legitimate behavior changes in the truth contract must fail until expectations are updated with justification.
- **D-20:** Weak-evidence clips must block strong recommendations. They cannot produce `Pronto`, apply-ready, or aggressive coach/sensitivity decisions.
- **D-21:** Inconclusive is a valid expected result. Some clips should pass because the system correctly refuses a strong decision.
- **D-22:** Truth-contract expectations belong inside the benchmark dataset near each clip's metadata and labels.
- **D-23:** The dataset should use stable internal enums. Portuguese product labels such as `Capturar de novo` and `Testavel` are derived by UI/copy, not stored as benchmark truth.
- **D-24:** Primary focus must match exactly. Secondary focuses, when present, should be validated as an unordered set.
- **D-25:** The benchmark must validate next-block protocol structure, not only the title: tier, stable key/title, duration, exercise, target/goal, stop/continue criteria, and next-clip validation.

### Relatorio de regressao e baseline
- **D-26:** Synthetic and captured datasets must both have versioned baselines.
- **D-27:** Baselines should live in `tests/goldens/benchmark` next to the datasets.
- **D-28:** `benchmark:release` must print clear console PASS/FAIL output and generate a versionable markdown report.
- **D-29:** Release reports should keep dated history and update a latest report for quick reading.
- **D-30:** Reports must separate synthetic, captured, and `golden`/`reviewed` results so controlled fixtures, real clips, and stronger evidence are not blurred together.
- **D-31:** Baseline updates require an explicit command with mandatory reason, affected clips, and why the new behavior is more honest.
- **D-32:** Regression in `reviewed` clips blocks the strict gate, even if no `golden` clip regressed. The report should state when golden clips were unaffected.

### the agent's Discretion
The planner/researcher may choose exact command names, TypeScript module boundaries, JSON schema shape, report file naming, and implementation sequencing as long as they preserve the decisions above, keep the browser-first analysis path, and honor existing benchmark/testing patterns.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Planning Source
- `.planning/PROJECT.md` - Project value, constraints, browser-first posture, confidence honesty, and monetization safety.
- `.planning/REQUIREMENTS.md` - Phase 2 requirements: BENCH-01, BENCH-02, BENCH-03.
- `.planning/ROADMAP.md` - Phase 2 goal and success criteria.
- `.planning/STATE.md` - Current project state and workflow status.
- `.planning/phases/01-measurement-truth-contract/01-CONTEXT.md` - Locked Phase 1 truth contract that Phase 2 benchmarks must protect.

### Codebase Maps
- `.planning/codebase/ARCHITECTURE.md` - Browser-first analysis pipeline and integration points.
- `.planning/codebase/STACK.md` - Next.js/TypeScript stack and relevant scripts.
- `.planning/codebase/TESTING.md` - Existing unit, golden, benchmark, CI, and release testing conventions.
- `.planning/codebase/CONCERNS.md` - Browser-first and production-readiness caveats.

### Benchmark Contracts And Scripts
- `src/types/benchmark.ts` - Current benchmark dataset schema, clip metadata, labels, quality, review provenance, and expected coach plan fields.
- `scripts/run-benchmark.ts` - Benchmark runner, regression comparison, synthetic/captured execution, and current report shape.
- `scripts/validate-benchmark-coverage.ts` - Starter/SDD coverage gate entrypoint.
- `src/core/benchmark-coverage.ts` - Coverage summary, starter gate, SDD gate, and markdown rendering logic.
- `src/core/benchmark-runner.test.ts` - Current benchmark runner behavior tests, including synthetic baseline and captured replay.
- `src/ci/benchmark-workflow.test.ts` - CI/release script contract tests for benchmark gates and release verification.
- `package.json` - Existing `benchmark`, `benchmark:captured`, `benchmark:all`, `benchmark:gate`, and validation scripts.

### Existing Benchmark Data And Docs
- `tests/goldens/benchmark/synthetic-benchmark.v1.json` - Synthetic benchmark dataset.
- `tests/goldens/benchmark/synthetic-benchmark.baseline.json` - Existing synthetic baseline.
- `tests/goldens/benchmark/captured-benchmark-draft.json` - Current captured real-clip benchmark dataset.
- `tests/fixtures/captured-clips/labels.todo.v1.json` - Captured clip label intake source.
- `tests/fixtures/captured-clips/review-decisions.todo.v1.json` - Existing review decision artifact.
- `docs/benchmark-runner.md` - Current benchmark runner behavior and dataset summary.
- `docs/video-benchmark-spec.md` - Coverage gates, bucket definitions, intake rules, and current known gaps.
- `docs/benchmark-coverage-2026-04-14.md` - Current captured benchmark coverage snapshot.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `parseBenchmarkDataset` and Zod schemas in `src/types/benchmark.ts` already provide a safe entrypoint for extending dataset expectations and blocking incomplete metadata.
- `runBenchmark` in `scripts/run-benchmark.ts` already produces per-clip tracking, diagnostics, coach, source breakdown, and regression output.
- `buildBenchmarkCoverageSummary` in `src/core/benchmark-coverage.ts` already separates starter and SDD gates and can anchor the strict release coverage behavior.
- Current scripts in `package.json` already compose `benchmark`, `benchmark:captured`, `benchmark:all`, and `benchmark:gate`, so Phase 2 can add stricter scripts without replacing the daily CI gate.
- Existing captured-clips tooling under `scripts/generate-captured-*`, `scripts/promote-captured-clips.ts`, and `scripts/validate-captured-clip-labels.ts` should be inspected before inventing new promotion logic.

### Established Patterns
- Benchmark/golden checks are part of the product safety net and are expected for analysis/coach work.
- Tests are colocated near source modules; scripts and CI contracts have Vitest coverage.
- Existing benchmark output is deterministic JSON and already distinguishes source types.
- Current captured benchmark dataset contains 5 captured clips, 2 weapons, 2 optics, 1 diagnosed clip, and 1 specialist-reviewed golden clip.
- The current `npm run benchmark:gate` passes and should stay useful as a quick gate.

### Integration Points
- Dataset schema changes likely start in `src/types/benchmark.ts` and corresponding tests.
- Truth-contract evaluation likely connects to `scripts/run-benchmark.ts`, `src/core/benchmark-coverage.ts`, and Phase 1 result/coach contracts.
- Release/commercial gate scripts likely connect through `package.json`, `src/ci/benchmark-workflow.test.ts`, and new or updated benchmark report scripts.
- Promotion workflow likely connects to captured clip fixtures, review decisions, validation scripts, and markdown docs/reports.
- Docs need updates in benchmark docs to make internal maintainer/reviewer workflow explicit.

</code_context>

<specifics>
## Specific Ideas

- Preferred strict gate command shape: `npm run benchmark:release`.
- Preferred baseline update shape: an explicit command such as `npm run benchmark:update-baseline -- --reason "..."`, with mandatory reason, affected clips, and honesty rationale.
- Preferred report behavior: console PASS/FAIL plus markdown history by date and a latest report.
- Preferred report dimensions: synthetic, captured, reviewed, golden, coverage gaps, regressions, failed clips, and affected truth-contract fields.
- The user emphasized that the workflow must be easy, safe, precise, and practically high-confidence, while avoiding false claims of perfection.

</specifics>

<deferred>
## Deferred Ideas

None - discussion stayed within Phase 2 scope.

</deferred>

---

*Phase: 2-Benchmark Expansion*
*Context gathered: 2026-05-05*
