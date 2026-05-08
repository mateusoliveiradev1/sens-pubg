---
phase: 10-guided-pro-training-programs
plan: 01
subsystem: core
tags: [training-programs, ciclo-pro, spray-lab, validation, checkpoints, recovery]

# Dependency graph
requires:
  - phase: 08-complete-training-protocols
    provides: CompleteTrainingProtocol contract and deterministic protocol builder
  - phase: 09-pubg-spray-lab-session-runner-and-benchmark
    provides: Spray Lab session, fidelity, validation, and coach handoff evidence
provides:
  - Versioned Ciclo Pro and Ciclo de Reparo domain contracts
  - Deterministic program eligibility, cycle birth, active-line restart, and repair routing
  - Evidence-bound weekly mission composition with Spray Lab and Analyze validation CTAs
  - Operational weekly, technical validated, and monthly contextual checkpoint builders
  - Recovery/reentry state machine for fatigue, discomfort, confusion, stale context, missed days, variable changes, and repeated failure
affects: [phase-10-persistence, phase-10-ui, dashboard, history, spray-lab, analyze-validation]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Dedicated core truth module plus type-only contracts
    - Evidence summary inputs preserve references to Protocol, Spray Lab, precision trend, and coach outcome state
    - Calendar closure is separated from evidence escalation

key-files:
  created:
    - src/types/training-programs.ts
    - src/core/training-programs.ts
    - src/core/training-program-checkpoints.ts
    - src/core/training-programs.test.ts
  modified: []

key-decisions:
  - "Full Ciclo Pro starts only from saved usable analysis plus recognizable context and a complete protocol or active line; weak or incomplete bases route to Ciclo de Reparo."
  - "Weekly rhythm can close operationally, but difficulty and coach aggressiveness can increase only after compatible technical evidence converges."
  - "Pain or meaningful discomfort pauses the block as safety/recovery, never as skill regression."

patterns-established:
  - "Ciclo Pro missions store anatomy and evidence references, then link to Spray Lab or Analyze validation rather than duplicating either runner."
  - "Technical checkpoints are created only when compatible validation variables are confirmed and blockers are absent."
  - "Line restarts archive the old active line instead of mixing structural context changes into the current line."

requirements-completed: [PREC-03, COACH-01, COACH-02, COACH-03, COACH-04, COACH-05, MON-01, MON-02]

# Metrics
duration: 15min
completed: 2026-05-08
---

# Phase 10 Plan 01: Program Contracts, Missions, Checkpoints, And Recovery Engine Summary

**Deterministic Ciclo Pro v1 core contract with honest repair routing, evidence-bound missions, contextual checkpoints, and recovery/reentry state transitions**

## Performance

- **Duration:** 15 min
- **Started:** 2026-05-08T19:33:44Z
- **Completed:** 2026-05-08T19:48:09Z
- **Tasks:** 5
- **Files modified:** 4

## Accomplishments

- Added `ciclo-pro-v1` contracts for cycle kind, official states, reason codes, mission anatomy, adaptive weeks, checkpoints, active lines, evidence summaries, and transition events.
- Implemented deterministic eligibility and cycle birth for full Ciclo Pro, Ciclo de Reparo, and structural active-line restarts with archived old lines.
- Composed four adaptive Ciclo Pro weeks with five main missions and two flex slots, plus repair-cycle missions for weak base evidence.
- Added operational weekly, technical validated, and monthly checkpoint composition with evidence convergence gating.
- Added reducer/recovery behavior for fatigue, discomfort stop, confusion, stale context, missed days, variable changes, repeated failure, and mission completion.

## Task Commits

Each task was committed atomically:

1. **Task 1: Add versioned Ciclo Pro contracts** - `616ca92` (feat)
2. **Task 2: Implement eligibility and cycle birth** - `b066dbc` (feat)
3. **Task 3: Compose adaptive weeks and missions** - `520b5ca` (feat)
4. **Task 4: Add checkpoint and adaptation engine** - `c6d2c1d` (feat)
5. **Task 5: Cover core truth with focused tests** - `eb9b206` (test)

**Plan metadata:** final docs commit is created after summary/state updates.

## Files Created/Modified

- `src/types/training-programs.ts` - Versioned Ciclo Pro domain contracts, states, reason codes, mission anatomy, evidence summaries, checkpoints, transition events, and cycle snapshots.
- `src/core/training-programs.ts` - Eligibility, context keys, cycle birth, mission/week composition, repair cycles, recovery decisions, and event reducer.
- `src/core/training-program-checkpoints.ts` - Weekly operational, technical validated, and monthly checkpoint builders.
- `src/core/training-programs.test.ts` - Focused tests for eligibility, repair routing, missions, checkpoints, recovery, official states, copy safety, and weak-evidence behavior.

## Verification

- `npm run typecheck` - PASS
- `npx vitest run src/core/training-programs.test.ts` - PASS, 18 tests
- `npx vitest run` - PASS
- `npm run benchmark:gate` - PASS

Full Vitest emitted existing stderr from mocked analytics/database failure paths in history and product analytics tests, but the command exited successfully.

## Decisions Made

- Full Ciclo Pro is not created from unsaved, weak, missing-context, or missing-protocol evidence; those paths create Ciclo de Reparo with visible reason codes.
- Mission CTAs point only into `/spray-lab` or `/analyze?mode=validation`, preserving Spray Lab and Analyze as the execution/validation surfaces.
- Technical checkpoints require compatible validation evidence; operational weekly checkpoints may close by rhythm but cannot raise difficulty alone.
- Monthly checkpoint copy stays contextual to the active line and avoids global player grades or guaranteed progress.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Included decision blocker codes in weak-base eligibility**
- **Found during:** Task 2 (Implement eligibility and cycle birth)
- **Issue:** Weak analysis with `low_confidence` or `low_coverage` decision blockers could route to repair without preserving those stable reason codes.
- **Fix:** `resolveWeakBaseReasons` now reads `analysisDecision.blockerReasons` and emits `low_confidence` and `low_coverage` when present.
- **Files modified:** `src/core/training-programs.ts`, `src/core/training-programs.test.ts`
- **Verification:** `npx vitest run src/core/training-programs.test.ts`
- **Committed in:** `b066dbc`

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** The fix strengthens the planned truth contract and keeps weak evidence visible. No scope expansion.

## Issues Encountered

- The local project SDK path under `node_modules/@gsd-build/sdk` was missing, so execution used the installed `gsd-sdk` CLI fallback.
- Final full Vitest produced expected stderr from tests that intentionally exercise telemetry/database failure handling; all verification commands passed.

## Known Stubs

None. Stub scan found only local helper arrays/empty override defaults in deterministic code/tests, not UI-facing placeholder data or unconnected program output.

## User Setup Required

None - no external service configuration required.

## Threat Flags

None. This plan added core domain contracts and deterministic functions only; no new network endpoints, auth paths, file access, persistence schema, or trust-boundary surfaces were introduced.

## Next Phase Readiness

Plan 10-02 can persist and project these snapshots without inventing program truth. The core now exposes stable cycle, week, mission, checkpoint, reason-code, and transition contracts for actions, entitlement projection, dashboard, route UI, and history audit.

## Self-Check: PASSED

- Created files found: `src/types/training-programs.ts`, `src/core/training-programs.ts`, `src/core/training-program-checkpoints.ts`, `src/core/training-programs.test.ts`, `.planning/phases/10-guided-pro-training-programs/10-01-SUMMARY.md`
- Task commits found: `616ca92`, `b066dbc`, `520b5ca`, `c6d2c1d`, `eb9b206`

---
*Phase: 10-guided-pro-training-programs*
*Completed: 2026-05-08*
