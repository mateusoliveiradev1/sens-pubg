---
phase: 02-benchmark-expansion
plan: 03
subsystem: testing
tags: [captured-clips, promotion, labels, provenance, benchmark-report]
requires: [02-01]
provides:
  - Guided captured clip promotion workflow with strict metadata, label, provenance, replay, and reason blockers.
  - Internal promotion markdown reports with coverage impact and next gaps.
  - Captured label fixtures synchronized with truth and coach expectations.
affects: [captured-clips, benchmark-release, maintainer-workflow, docs]
tech-stack:
  added: []
  patterns:
    - Captured maturity is draft -> reviewed -> golden.
    - Golden promotion requires reviewed status, replay pass, strong review evidence, and explicit justification.
key-files:
  created:
    - src/core/captured-promotion-report.ts
    - src/core/captured-promotion-report.test.ts
  modified:
    - src/core/captured-golden-promotion.ts
    - src/core/captured-golden-promotion.test.ts
    - scripts/promote-captured-clips.ts
    - src/core/promote-captured-clips.test.ts
    - src/types/captured-clip-labels.ts
    - src/types/captured-clip-labels.test.ts
    - tests/fixtures/captured-clips/labels.todo.v1.json
    - docs/video-benchmark-spec.md
    - docs/benchmark-runner.md
key-decisions:
  - "Captured clip promotion remains an internal maintainer/dev/reviewer workflow, not public UGC."
  - "Reviewed clips require expectedTrackingTier and expectedTruth; diagnosed clips also require coach mode and coach plan."
  - "Golden promotion is blocked without replay pass and strong review justification."
patterns-established:
  - "Promotion commands default to report-only flag mode unless explicitly writing."
  - "Promotion reports show before/after coverage and blockers before JSON artifacts count as release evidence."
requirements-completed: [BENCH-02, BENCH-03]
duration: 21 min
completed: 2026-05-05
---

# Phase 02 Plan 03: Guided Captured Clip Promotion Summary

**Captured clips now move through an internal report-backed maturity workflow before they count as release evidence**

## Performance

- **Duration:** 21 min
- **Started:** 2026-05-05T15:22:00Z
- **Completed:** 2026-05-05T15:42:00Z
- **Tasks:** 3/3
- **Files modified:** 11

## Accomplishments

- Strengthened captured promotion blockers for missing metadata, tracking tier, truth expectations, coach expectations, frame labels, spray windows, provenance, promotion reason, replay pass, and strong review.
- Added a pure captured promotion report builder with selected clips, intended maturity, checks, coverage impact, blockers, next gaps, and internal-only language.
- Expanded `scripts/promote-captured-clips.ts` with guided flag mode for clips, target maturity, reason, reviewer, report path, review decisions, and write control.
- Synced captured clip label fixtures with `expectedTruth` and `expectedCoachPlan` where required.
- Updated benchmark docs with internal workflow, `draft -> reviewed -> golden`, strict gate use, and non-overclaiming language.

## Task Commits

1. **Task 1: Strengthen promotion validation and blockers** - `4ab0d52`
2. **Task 2: Add guided CLI report and coverage impact** - `4ab0d52`
3. **Task 3: Document internal captured benchmark workflow** - `4ab0d52`

Implementation was batched into one verified commit after the three wave tasks were completed.

## Files Created/Modified

- `src/core/captured-golden-promotion.ts` - Adds strict promotion blocker categories and passes truth expectations into captured benchmark clips.
- `src/core/captured-golden-promotion.test.ts` - Covers complete labels, missing blockers, specialist precedence, and golden prerequisites.
- `src/core/captured-promotion-report.ts` - Builds internal promotion reports with checks and coverage deltas.
- `src/core/captured-promotion-report.test.ts` - Locks report content and internal-only documentation language.
- `scripts/promote-captured-clips.ts` - Adds guided CLI/report mode and bounded benchmark preview.
- `src/types/captured-clip-labels.ts` - Requires nullable `expectedTruth` in captured label workflow and summarizes missing truth/coach plans.
- `tests/fixtures/captured-clips/labels.todo.v1.json` - Adds truth and coach plan expectations to all captured labels.
- `docs/video-benchmark-spec.md` - Documents internal captured promotion workflow and maturity rules.

## Decisions Made

- Kept legacy positional promotion behavior working while adding safer flag-based report mode.
- Required `expectedTruth` even for captured labels that are not diagnosed so strict release evidence has a complete contract.
- Applied replay and strong-review checks only when targeting `golden`, preserving existing reviewed workflows.

## Deviations from Plan

None.

## Issues Encountered

- Existing captured benchmark plan tests were stale once `expectedTruth` became required for readiness. The local test fixtures were updated so the original promotion behavior remains covered under the new label contract.

## Verification

- `npx vitest run src/core/captured-golden-promotion.test.ts src/core/captured-promotion-report.test.ts src/core/promote-captured-clips.test.ts` - passed.
- `npm run benchmark:release` - passed.
- `npm run typecheck` - passed.
- `npx vitest run` - passed, 121 files / 593 tests.
- `npm run benchmark:gate` - passed.

## User Setup Required

None.

## Next Phase Readiness

Captured benchmark evidence is now safe enough to support Phase 3 trend work and later paid-value claims without silently counting weak or under-documented real clips.

---
*Phase: 02-benchmark-expansion*
*Completed: 2026-05-05*
