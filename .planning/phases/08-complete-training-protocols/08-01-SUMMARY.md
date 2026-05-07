---
phase: 08-complete-training-protocols
plan: 01
subsystem: coach
tags: [coach, training-protocols, drills, analysis-truth, benchmark]

requires:
  - phase: 04-adaptive-coach-loop
    provides: deterministic coach tier, next block, outcome memory, and LLM copy-only boundary
  - phase: 06-core-accuracy-and-pro-validation-hardening
    provides: spray-truth-v2 decision ladder, blocker reasons, and weak-evidence downgrade rules
provides:
  - CompleteTrainingProtocol v1 type contract attached optionally to CoachPlan
  - Stable PUBG drill catalog for capture, validation, vertical, horizontal, timing, consistency, sensitivity, and loadout
  - Deterministic complete protocol composer with dose, preparation, validation, transfer, downgrade, and audit fields
  - Focused tests for drill mapping, context limitations, apply downgrade, preparation safety, and CoachPlan attachment
affects: [phase-08, coach, training-protocols, premium-projection, dashboard, history, llm-guardrails, benchmark]

tech-stack:
  added: []
  patterns:
    - Versioned optional CoachPlan snapshots preserve old history while adding richer protocol truth
    - Drill masters stay family-based while context adapters personalize dose and limitations
    - Complete protocol truth stays deterministic and blocks LLM rewrites

key-files:
  created:
    - src/core/training-protocol-drills.ts
    - src/core/training-protocol-drills.test.ts
    - src/core/training-protocols.ts
    - src/core/training-protocols.test.ts
  modified:
    - src/types/engine.ts
    - src/core/coach-plan-builder.ts
    - src/core/coach-plan-builder.test.ts

key-decisions:
  - "Complete protocol v1 is attached as optional CoachPlan.completeProtocol so old coach/history consumers remain compatible."
  - "Official Training Mode and Aim/Sound Lab are executable defaults; UGC and future Spray Lab are represented as catalog options only."
  - "Apply-strength protocol output is downgraded unless strong_analysis and compatible validation evidence both exist."
  - "Physical preparation is setup/control/rest/stop-rule guidance and never medical, strength, or guaranteed-performance prescription."

patterns-established:
  - "TRAINING_PROTOCOL_DRILLS is the stable engine catalog keyed by TrainingProtocolDrillId."
  - "buildTrainingProtocolContextSnapshot records unknown or limited context instead of inventing weapon, optic, distance, attachment, or support facts."
  - "buildCompleteTrainingProtocol composes one executable protocol from the primary focus; secondary focuses become anti-mixing notes."

requirements-completed: [COACH-01, COACH-02, COACH-03, COACH-04, COACH-05]

duration: 8 min
completed: 2026-05-07
---

# Phase 08 Plan 01: Complete Protocol Contract, Drill Catalog, And Downgrade Engine Summary

**Deterministic complete training protocol foundation with versioned CoachPlan snapshots, PUBG drill families, safe preparation, and honest downgrade behavior.**

## Performance

- **Duration:** 8 min
- **Started:** 2026-05-07T19:30:44Z
- **Completed:** 2026-05-07T19:38:18Z
- **Tasks:** 3/3
- **Files modified:** 7

## Accomplishments

- Added `CompleteTrainingProtocol` v1 and related dose, context, preparation, validation, transfer, downgrade, audit, environment, and drill ID contracts in `src/types/engine.ts`.
- Added a stable eight-family PUBG drill catalog plus context adapters for weapon support, missing distance/optic/attachments, hard-weapon dose adjustment, and optional UGC/future Spray Lab environments.
- Added `buildCompleteTrainingProtocol` and wired it into `buildCoachPlan`, preserving the old next-block fields while attaching one richer deterministic protocol snapshot.
- Added focused tests proving drill coverage, focus mapping, hard-weapon dose conservatism, missing-distance honesty, partial-safe-read downgrade, apply downgrade without compatible validation, preparation copy safety, and CoachPlan attachment.

## Task Commits

Each task was committed atomically:

1. **Task 1: Add complete protocol contracts** - `f54ef14` (feat)
2. **Task 2: Build drill masters and context adapters** - `52290e1` (feat)
3. **Task 3: Compose and attach complete protocols** - `9f0c1d6` (feat)

**Plan metadata:** pending in the docs completion commit.

## Files Created/Modified

- `src/types/engine.ts` - Added `CompleteTrainingProtocol` v1 contracts, stable drill/downgrade/environment unions, dose/preparation/validation/transfer/audit payloads, and optional `CoachPlan.completeProtocol`.
- `src/core/training-protocol-drills.ts` - Created the stable drill catalog, environment catalog, focus-to-drill selection, context snapshot builder, and dose adapter.
- `src/core/training-protocol-drills.test.ts` - Covered all eight drill IDs, mapping rules, Beryl dose adjustment, missing-distance limitations, and non-default UGC/Spray Lab environments.
- `src/core/training-protocols.ts` - Created the complete protocol composer, downgrade resolver, dose/preparation/validation/transfer builders, anti-mixing notes, and conservative repair CTAs.
- `src/core/training-protocols.test.ts` - Covered full protocol shape, partial-safe-read downgrade, apply downgrade without compatible validation, and preparation copy safety.
- `src/core/coach-plan-builder.ts` - Attached `completeProtocol` to every built coach plan without recursive self-reference.
- `src/core/coach-plan-builder.test.ts` - Added coverage that complete protocols attach while legacy coach fields remain present.

## Decisions Made

- Kept the new protocol as an optional snapshot on `CoachPlan` instead of replacing `nextBlock`, so historical results and older UI consumers remain compatible.
- Treated Beryl/Groza or high-recoil weapons conservatively by increasing rest and/or reducing reps, while keeping the same drill family.
- Made missing distance, optic, attachment, and limited support dependency blockers rather than global dead ends.
- Kept `llmRewriteAllowed: false` on the complete protocol because later LLM phases must explicitly whitelist copy-only fields.

## Deviations from Plan

None - plan executed as written.

## Issues Encountered

- The first Task 2 commit attempt failed because TypeScript narrowed `capture_quality` out of a switch after an early return. Removed the unreachable case and re-ran the focused drill tests before committing.
- `npm run typecheck` caught `exactOptionalPropertyTypes` calls where `analysisResult: undefined` was passed explicitly. Fixed by omitting optional properties when absent.

## Verification

- `npx vitest run src/core/coach-plan-builder.test.ts` - PASS, 19 tests after Task 1.
- `npx vitest run src/core/training-protocol-drills.test.ts` - PASS, 5 tests after Task 2.
- `npx vitest run src/core/training-protocols.test.ts src/core/training-protocol-drills.test.ts src/core/coach-plan-builder.test.ts` - PASS, 3 files / 29 tests.
- `npm run typecheck` - PASS.
- `npx vitest run` - PASS, 164 files / 899 tests.
- `npm run benchmark:gate` - PASS: synthetic benchmark 3/3, captured benchmark 5/5, coverage starter gate PASS.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Ready for Wave 2 (`08-02` and `08-03`): the versioned protocol snapshot, drill families, deterministic downgrade rules, and CoachPlan attachment are available for persistence, Free/Pro projection, and post-analysis ficha work.

## Self-Check: PASSED

- Summary file created.
- All three plan tasks have atomic commits.
- Acceptance criteria passed through focused tests and typecheck.
- Full Vitest and benchmark gate passed.
- Protocol copy stays evidence-bound, downgrade-aware, and free of medical/strength/guaranteed-performance claims.

---
*Phase: 08-complete-training-protocols*
*Completed: 2026-05-07*
