---
phase: 09-pubg-spray-lab-session-runner-and-benchmark
plan: 01
subsystem: analysis
tags: [spray-lab, complete-protocol, lanes, session-runner, benchmark]

requires:
  - phase: 08-complete-training-protocols
    provides: CompleteTrainingProtocol v1, TrainingProtocolDrillId families, dose, preparation, validation, transfer, and downgrade contracts
  - phase: 03-multi-clip-precision-loop
    provides: PrecisionTrendSummary and strict contextual trend semantics
provides:
  - Versioned Spray Lab v1 contracts for sessions, events, fidelity, repair, index, benchmark snapshots, and validation links
  - Compact PUBG lane catalog mapped to the eight Phase 8 complete-protocol drill families
  - Deterministic Spray Lab session creation and event reducer with manual intervention audit
  - Fidelity scoring that controls benchmark eligibility without punishing fatigue, pain, or repair paths as aim failure
  - Contextual Spray Lab index and benchmark snapshots that separate provisional and validated evidence
affects: [phase-09, spray-lab, analysis, coach, benchmark, dashboard, history]

tech-stack:
  added: []
  patterns:
    - Spray Lab executes CompleteTrainingProtocol instead of replacing analysis or coach truth
    - Lanes stay family-based and context-adapted, avoiding a static weapon/optic/distance matrix
    - Fidelity tier gates benchmark strength before any contextual index can become validated
    - Context keys keep Lab progression scoped to weapon, optic, distance, stance, attachments, and patch

key-files:
  created:
    - src/core/spray-lab-lanes.ts
    - src/core/spray-lab-lanes.test.ts
    - src/core/spray-lab-session.ts
    - src/core/spray-lab-session.test.ts
    - src/core/spray-lab-fidelity.ts
    - src/core/spray-lab-fidelity.test.ts
    - src/core/spray-lab-scoring.ts
    - src/core/spray-lab-scoring.test.ts
  modified:
    - src/types/engine.ts

key-decisions:
  - "Spray Lab v1 snapshots reference CompleteTrainingProtocol and PrecisionTrendSummary instead of creating a parallel truth model."
  - "Lane labels are personalized from protocol context, while stable lane IDs remain tied to TrainingProtocolDrillId."
  - "Fidelity reports classify strong, usable, practice-only, and invalid-for-benchmark sessions before scoring."
  - "Validated Spray Lab scores require compatible validation status; provisional session scores never become global player grades."

patterns-established:
  - "selectSprayLabLaneForProtocol(protocol) adapts one compact lane preset from the complete protocol context."
  - "reduceSprayLabSessionEvent(session, event) is pure and uses event timestamps instead of Date globals."
  - "calculateSprayLabFidelity(session, events) turns execution quality into evidence strength and repair CTAs."
  - "buildSprayLabIndexSnapshot(...) and buildSprayLabBenchmarkSnapshot(...) keep benchmark truth context-bound."

requirements-completed: [PREC-03, BENCH-01, BENCH-02, BENCH-03, COACH-01, COACH-02, COACH-03]

duration: 13 min
completed: 2026-05-08
---

# Phase 09 Plan 01: Spray Lab Core Contract, Lanes, Session Fidelity, And Contextual Index Summary

**Versioned Spray Lab core with protocol-backed lanes, deterministic session events, fidelity-gated evidence, and contextual benchmark snapshots.**

## Performance

- **Duration:** 13 min
- **Started:** 2026-05-08T05:27:00Z
- **Completed:** 2026-05-08T05:40:24Z
- **Tasks:** 5/5
- **Files modified:** 9

## Accomplishments

- Added Spray Lab v1 type contracts for acts, step states, session statuses, evidence levels, validation statuses, fidelity tiers, lane presets, session snapshots/events, repair states, index snapshots, benchmark snapshots, and validation links.
- Created a compact lane catalog for all eight Phase 8 drill families, with protocol context overriding generic labels and support-limited lanes producing warnings instead of technical promises.
- Added a deterministic session reducer covering prepare, ready, spray, rest, quick check, result, validation, pause, resume, skip, repeat, report problem, and early-stop flows.
- Added fidelity scoring across preparation, variable control, reps, pauses, safety/repair, and manual interventions, with fatigue/pain treated as safety downgrade rather than aim failure.
- Added contextual index and benchmark snapshot builders that separate baseline, in-validation, promising signal, validated progress/regression, fidelity-blocked, and inconclusive states.

## Task Commits

Each task was committed atomically:

1. **Task 1: Add Spray Lab v1 contracts** - `b068bd7` (feat)
2. **Task 2: Create PUBG lane catalog** - `3ce6ee3` (feat)
3. **Task 3: Implement session state machine** - `c37415b` (feat)
4. **Task 4: Calculate fidelity and repair** - `d68b8d8` (feat)
5. **Task 5: Create contextual index and benchmark snapshot** - `b9a0fe2` (feat)

**Plan metadata:** pending in the docs completion commit.

## Files Created/Modified

- `src/types/engine.ts` - Added optional Spray Lab v1 contracts without making existing `AnalysisResult` consumers require new fields.
- `src/core/spray-lab-lanes.ts` - Added compact lane presets, protocol-to-lane selection, context key builder, and support warning handling.
- `src/core/spray-lab-lanes.test.ts` - Covered all eight drill families, protocol-specific labels, context key separation, and limited-support warnings.
- `src/core/spray-lab-session.ts` - Added protocol-backed session creation and pure event reducer for Lab session states and manual interventions.
- `src/core/spray-lab-session.test.ts` - Covered dose counts, deterministic reducer behavior, session flow states, validation request, and intervention audit.
- `src/core/spray-lab-fidelity.ts` - Added fidelity component scoring, tier resolution, evidence level, benchmark eligibility, coach impact copy, and repair state helper.
- `src/core/spray-lab-fidelity.test.ts` - Covered strong sessions, skipped reps, fatigue/pain safety downgrade, and capture blocker repair state.
- `src/core/spray-lab-scoring.ts` - Added contextual index, evidence-level resolver, and release benchmark snapshot builder.
- `src/core/spray-lab-scoring.test.ts` - Covered provisional vs validated score, release eligibility, context separation, and fidelity-blocked benchmark prevention.

## Decisions Made

- Kept Spray Lab truth additive and optional in `src/types/engine.ts`; no existing analysis result must carry Lab data yet.
- Kept lane support compact and drill-family based; exact weapon/optic/distance personalization comes from `CompleteTrainingProtocol.context`.
- Treated session fidelity as the authority for whether a Lab run can become benchmark evidence.
- Kept contextual index separate from `sprayScore` and scoped by `contextKey`, preventing a global player grade.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Fixed exact optional property assignment in scoring**
- **Found during:** Task 5 commit
- **Issue:** Pre-commit typecheck rejected passing `precisionTrend: undefined` under `exactOptionalPropertyTypes`.
- **Fix:** Omitted `precisionTrend` from the object unless a real trend exists.
- **Files modified:** `src/core/spray-lab-scoring.ts`
- **Verification:** `npx vitest run src/core/spray-lab-scoring.test.ts`; pre-commit typecheck passed on retry.
- **Committed in:** `b9a0fe2`

---

**Total deviations:** 1 auto-fixed blocking issue.
**Impact on plan:** No scope change; the fix preserved strict optional typing.

## Issues Encountered

- Plan Task 5 listed `src/core/precision-evolution.ts` in `read_first`, but that file does not exist in the repo. Used the existing strict precision implementation, `src/core/precision-loop.ts`, as the equivalent source of truth.
- Full Vitest emits expected stderr from existing analytics/history tests that deliberately drop mocked telemetry/database errors; the suite still exits PASS.

## Verification

- `npx vitest run src/core/training-protocols.test.ts` - PASS, 4 tests after Task 1.
- `npx vitest run src/core/spray-lab-lanes.test.ts` - PASS, 4 tests after Task 2.
- `npx vitest run src/core/spray-lab-session.test.ts` - PASS, 4 tests after Task 3.
- `npx vitest run src/core/spray-lab-fidelity.test.ts` - PASS, 4 tests after Task 4.
- `npx vitest run src/core/spray-lab-scoring.test.ts` - PASS, 4 tests after Task 5.
- `npx vitest run src/core/spray-lab-lanes.test.ts src/core/spray-lab-session.test.ts src/core/spray-lab-fidelity.test.ts src/core/spray-lab-scoring.test.ts` - PASS, 4 files / 16 tests.
- `npm run typecheck` - PASS.
- `npx vitest run` - PASS.
- `npm run benchmark:gate` - PASS: synthetic benchmark passed, captured benchmark passed, benchmark coverage starter gate PASS.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Ready for Wave 2 (`09-02`): persistence/actions can now store sessions, events, validation links, index snapshots, and benchmark snapshots using the core contracts and deterministic helpers from this plan.

## Self-Check: PASSED

- Summary file created.
- All five plan tasks have atomic commits.
- All acceptance criteria were covered by focused tests and typecheck.
- Full Vitest and benchmark gate passed.
- Fidelity and index contracts keep confidence, context, and inconclusive behavior honest.

---
*Phase: 09-pubg-spray-lab-session-runner-and-benchmark*
*Completed: 2026-05-08*
