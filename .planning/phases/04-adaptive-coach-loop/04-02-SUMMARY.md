---
phase: 04-adaptive-coach-loop
plan: 02
subsystem: coach
tags: [coach-memory, adaptive-coach, history, outcomes, benchmarks]

requires:
  - phase: 04-adaptive-coach-loop
    plan: 01
    provides: Typed coach protocol outcomes, evidence classification, conflict detection, persistence, and hydration contracts.
provides:
  - Outcome-aware strict-compatible and global coach memory layers.
  - Priority and tier rules that downgrade weak, stale, conflicting, or self-reported-only evidence.
  - Save-time coach decision snapshots with compact outcome memory, conflicts, and blocker reasons.
  - Updated captured benchmark expectations for the more conservative adaptive coach contract.
affects: [coach-memory, coach-priority, coach-plan-builder, history, benchmark-gate]

tech-stack:
  added: []
  patterns:
    - Strict compatible memory remains primary; global memory can only help when strict evidence is absent.
    - Human outcome and compatible precision disagreement records conflict and blocks strong coach action.
    - Saved fullResult payloads include compact audit snapshots instead of dumping internal memory rows.

key-files:
  modified:
    - src/types/engine.ts
    - src/core/coach-memory.ts
    - src/core/coach-memory.test.ts
    - src/core/coach-priority-engine.ts
    - src/core/coach-priority-engine.test.ts
    - src/core/coach-plan-builder.ts
    - src/core/coach-plan-builder.test.ts
    - src/actions/history.ts
    - src/actions/history.test.ts
    - src/app/history/analysis-result-hydration.ts
    - src/app/history/analysis-result-hydration.test.ts
    - src/core/benchmark-runner.test.ts
    - tests/goldens/benchmark/captured-benchmark-draft.json

key-decisions:
  - "apply_protocol requires strong current evidence plus compatible memory without outcome/trend conflict."
  - "Self-reported improvement stays weak until compatible precision validates progress."
  - "Invalid capture and completed-without-result outcomes reduce certainty without becoming proof that the protocol failed."
  - "Every saved coach plan preserves a compact deterministic decision snapshot for later UI and audit surfaces."

patterns-established:
  - "CoachOutcomeMemory separates strict compatible evidence from global fallback evidence."
  - "CoachDecisionSnapshot is the persisted reason trail for adaptive coach recommendations."
  - "Captured goldens expect short test protocols when historical validation is missing."

requirements-completed: [COACH-01, COACH-02, COACH-04]

duration: 58min
completed: 2026-05-05
---

# Phase 04: Adaptive Coach Loop Plan 02 Summary

**Adaptive coach memory now uses compatible history, protocol outcomes, conflicts, and saved decision snapshots**

## Performance

- **Duration:** 58 min
- **Completed:** 2026-05-05
- **Tasks:** 3
- **Files modified:** 13

## Accomplishments

- Extended coach memory with outcome-aware strict compatible and global memory layers, pending/neutral/confirmed/invalid/conflict/repeated-failure/stale counts, and compact history signals.
- Tightened priority and coach tier selection so weak, conflicting, stale, or self-reported-only evidence cannot produce aggressive protocol application.
- Added save-time outcome fetching to `saveAnalysisResult`, rebuilt memory before the final plan, and persisted `coachDecisionSnapshot` inside saved `fullResult`.
- Hardened history hydration so valid decision snapshots survive reloads while malformed stored snapshots are dropped.
- Updated captured benchmark goldens and runner tests to reflect the new conservative rule: isolated strong captured clips now receive short validation protocols instead of immediate `apply_protocol`.

## Task Commits

1. **Task 1: Feed outcome rows into strict and global coach memory** - `ad03964` (feat)
2. **Task 2: Tighten adaptive coach aggressiveness** - `be1cee6` (feat)
3. **Task 3: Persist coach choice snapshots with outcome-aware memory** - `1ae6478` (feat)
4. **Benchmark alignment: Update adaptive coach benchmark expectations** - `9f0c725` (test)

## Files Created/Modified

- `src/types/engine.ts` - Adds outcome memory and coach decision snapshot contracts.
- `src/core/coach-memory.ts` - Builds strict/global outcome memory with stale filtering, compatible evidence, conflicts, and memory signals.
- `src/core/coach-memory.test.ts` - Covers strict-over-global behavior, stale outcomes, pending/neutral states, invalid capture, and conflict handling.
- `src/core/coach-priority-engine.ts` - Scores priorities with outcome recurrence, conflict, and safer-focus signals.
- `src/core/coach-priority-engine.test.ts` - Covers adaptive priority behavior and conflict-sensitive scoring.
- `src/core/coach-plan-builder.ts` - Blocks aggressive actions under conflict, weak memory, capture blockers, and sensitivity/technique disagreement.
- `src/core/coach-plan-builder.test.ts` - Covers single strong clips, confirmed progress, self-report conflict, repeated failure, invalid capture, sensitivity conflicts, and secondary focus limits.
- `src/actions/history.ts` - Reads protocol outcomes during save, builds final memory from them, and stores compact coach decision snapshots.
- `src/actions/history.test.ts` - Proves prior outcomes influence save-time memory and stored snapshots keep conflict/blocker evidence.
- `src/app/history/analysis-result-hydration.ts` - Validates persisted coach decision snapshots during hydration.
- `src/app/history/analysis-result-hydration.test.ts` - Preserves valid decision snapshots and drops malformed ones.
- `src/core/benchmark-runner.test.ts` - Updates captured benchmark contract names and expected next block for adaptive coach conservatism.
- `tests/goldens/benchmark/captured-benchmark-draft.json` - Updates captured sensitivity/vertical cases from direct application to short validation protocols.

## Decisions Made

- A single strong current clip is useful evidence, but not enough to authorize `apply_protocol` without compatible recent validation.
- Outcome/trend conflict now blocks strong action and keeps the next step as validation or stabilization.
- The saved decision snapshot intentionally stores compact counts, conflicts, tier, focus, protocol, validation target, and blockers rather than raw memory internals.
- Benchmark expectations were updated because the stricter coach contract correctly downgrades previously overconfident captured clips.

## Deviations from Plan

### Auto-fixed Issues

**1. Executor agent failed during Wave 2 after implementation commits**
- **Found during:** Wave 2 orchestration
- **Issue:** The delegated executor hit a usage/compaction failure after landing part of the implementation.
- **Fix:** Orchestrator stopped using agents, inspected the landed commits, completed missing save-time snapshot work inline, reran focused and full verification, and wrote this summary inline.
- **Files modified:** `src/actions/history.ts`, `src/actions/history.test.ts`, `src/app/history/analysis-result-hydration.ts`, `src/app/history/analysis-result-hydration.test.ts`, `src/types/engine.ts`, `.planning/phases/04-adaptive-coach-loop/04-02-SUMMARY.md`
- **Verification:** Focused tests, typecheck, full Vitest, captured benchmark, and benchmark gate passed.
- **Committed in:** pending docs commit

---

**Total deviations:** 1 orchestration recovery
**Impact on plan:** No product scope change. The final behavior is stricter than the previous benchmark assumptions, which is aligned with Phase 4 truth constraints.

## Issues Encountered

- Full Vitest initially exposed captured benchmark goldens that still expected `apply_protocol` for isolated strong captured clips. Those expectations were updated to the new `test_protocol` contract, and focused benchmark tests passed afterward.

## Verification

- `npx vitest run src/core/coach-memory.test.ts src/core/coach-priority-engine.test.ts src/core/coach-plan-builder.test.ts src/core/coach-outcomes.test.ts src/actions/history.test.ts src/app/history/analysis-result-hydration.test.ts` - passed, 6 files / 78 tests
- `npm run benchmark:captured` - passed
- `npx vitest run src/core/benchmark-runner.test.ts src/core/coach-golden-runner.test.ts` - passed, 2 files / 7 tests
- `npm run typecheck` - passed
- `npx vitest run` - passed, 123 files / 664 tests
- `npm run benchmark:gate` - passed, synthetic and captured benchmarks score 100, coverage gate PASS

## User Setup Required

None.

## Next Phase Readiness

Wave 3 can surface adaptive coach memory, outcome evidence, conflicts, and saved decision snapshots in analysis, dashboard, and history UI without inventing confidence or hiding inconclusive behavior.

---
*Phase: 04-adaptive-coach-loop*
*Completed: 2026-05-05*
