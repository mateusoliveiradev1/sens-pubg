---
phase: 08-complete-training-protocols
plan: 02
subsystem: coach-persistence
tags: [coach, training-protocols, persistence, audit, history, benchmark]

requires:
  - phase: 08-complete-training-protocols
    plan: 01
    provides: CompleteTrainingProtocol v1 snapshots, drill catalog, downgrade rules, and CoachPlan attachment
provides:
  - Drizzle schema and SQL migration for complete protocol revisions and real-match/TDM transfer records
  - Audited revision action with old/new protocol payloads, changed fields, evidence payload, and tier direction
  - Extended outcome statuses for fatigue or pain, confusion, and variable changes
  - Transfer action that always stores countsAsTechnicalValidation as false
  - Pure compatible validation checklist builder for versioned protocols
affects: [phase-08, coach, training-protocols, history, dashboard, database, benchmark]

tech-stack:
  added:
    - Drizzle migration drizzle/0011_complete_training_protocols.sql
  patterns:
    - Server Actions export only async actions; pure helpers live in core modules
    - Practical transfer records remain useful context but never technical validation
    - Protocol revisions store full previous and revised snapshots instead of mutating old analyses

key-files:
  created:
    - drizzle/0011_complete_training_protocols.sql
    - src/core/complete-training-protocol-validation.ts
  modified:
    - src/types/engine.ts
    - src/db/schema.ts
    - src/db/schema.test.ts
    - src/core/coach-outcomes.ts
    - src/core/coach-outcomes.test.ts
    - src/actions/history.ts
    - src/actions/history.test.ts
    - src/actions/dashboard-active-coach-loop.ts
    - src/app/history/[id]/page.tsx
    - src/app/history/page.tsx
    - drizzle/meta/_journal.json

key-decisions:
  - "completeTrainingProtocolRevisions stores previousProtocol and revisedProtocol JSONB snapshots so revision audit never depends on future drill catalog changes."
  - "trainingProtocolTransferRecords always writes countsAsTechnicalValidation: false, even when the reported transfer result improved."
  - "fatigue_or_pain and variable_changed are invalid execution/capture signals; confused is neutral repair evidence; none count as technical evidence."
  - "buildCompatibleValidationChecklistFromProtocol moved to src/core so src/actions/history.ts remains a valid Next Server Actions module."

patterns-established:
  - "Complete protocol persistence and revision actions are owned-session server actions that revalidate history, session detail, and dashboard surfaces."
  - "Outcome status exhaustiveness must be updated across action labels, dashboard loop labels, and history page metadata when the engine union changes."

requirements-completed: [COACH-01, COACH-02, COACH-03, COACH-04, COACH-05]

duration: 25 min
completed: 2026-05-07
---

# Phase 08 Plan 02: Protocol Persistence, Revisions, Outcomes, And Transfer Summary

**Complete training protocols are now auditable over time without overstating self-report or real-match transfer as technical proof.**

## Performance

- **Duration:** 25 min
- **Started:** 2026-05-07T19:43:11Z
- **Completed:** 2026-05-07T20:08:20Z
- **Tasks:** 3/3
- **Files modified:** 13

## Accomplishments

- Added `completeTrainingProtocolRevisions` and `trainingProtocolTransferRecords` tables, relations, inferred row types, migration SQL, indexes, and schema tests.
- Preserved saved `fullResult.coachPlan.completeProtocol` snapshots and added `recordCompleteTrainingProtocolRevision` with ownership checks, v1 validation, tier direction, old/new payloads, evidence payload, and path revalidation.
- Extended coach outcome status handling with `fatigue_or_pain`, `confused`, and `variable_changed`, including conservative evidence semantics and UI/status labels.
- Added `recordTrainingProtocolTransfer` so practical transfer notes can be stored without incrementing technical validation or precision truth.
- Added `buildCompatibleValidationChecklistFromProtocol` in a pure core helper and covered weapon, optic, distance, stance, sensitivity, duration, and success criterion output.

## Task Commits

Plan 08-02 implementation was committed as:

1. **Task 1: Add schema for protocol revisions and transfer records** - `c130dbe`
2. **Task 2: Persist snapshots and explicit revisions** - `c130dbe`
3. **Task 3: Extend outcomes, compatible validation, and transfer records** - `c130dbe`

## Files Created/Modified

- `drizzle/0011_complete_training_protocols.sql` - Created protocol revision and transfer tables with required indexes.
- `drizzle/meta/_journal.json` - Appended the new `0011_complete_training_protocols` migration entry. Existing older gaps in the journal were left untouched.
- `src/db/schema.ts` - Added revision/transfer tables, relations, JSONB protocol payload typing, and inferred exports.
- `src/db/schema.test.ts` - Covered revision JSONB columns, transfer defaults, and indexes.
- `src/types/engine.ts` - Added the three new coach outcome statuses.
- `src/core/coach-outcomes.ts` - Mapped new statuses to invalid/neutral evidence without technical proof credit.
- `src/core/coach-outcomes.test.ts` - Locked new status behavior and repair evidence semantics.
- `src/core/complete-training-protocol-validation.ts` - Added the compatible validation checklist builder.
- `src/actions/history.ts` - Added revision and transfer actions and complete protocol persistence checks.
- `src/actions/history.test.ts` - Covered saved protocol snapshots, revision rejection/insert paths, transfer false technical validation, and compatible checklist output.
- `src/actions/dashboard-active-coach-loop.ts` - Added display labels/body handling for new outcome statuses.
- `src/app/history/[id]/page.tsx` - Added history detail labels for new outcome statuses.
- `src/app/history/page.tsx` - Added overview metadata colors for new outcome statuses.

## Decisions Made

- Kept transfer records separate from coach protocol outcomes because transfer is practical context, not compatible technical validation.
- Treated pain/fatigue copy as a stop/repair signal without collecting medical history beyond the explicit status/note the user records.
- Kept old history hydration untouched; legacy results without `completeProtocol` continue to hydrate through the existing optional snapshot path.

## Deviations from Plan

- `buildCompatibleValidationChecklistFromProtocol` was implemented in `src/core/complete-training-protocol-validation.ts` instead of exporting a sync helper from `src/actions/history.ts`, because Next Server Actions modules may only export async functions.
- Plan tasks landed in one plan-level implementation commit because the status union, actions, and typecheck fallout were tightly coupled.

## Issues Encountered

- The local dev overlay reported "Server Actions must be async functions" after the first helper lived in `history.ts`. Moving the helper to `src/core` fixed the Next compiler rule.
- `npm run typecheck` surfaced exhaustive-label gaps in dashboard and history surfaces after the outcome union expanded. Added labels/meta for all new statuses.

## Verification

- `npx vitest run src/db/schema.test.ts src/core/coach-outcomes.test.ts src/actions/history.test.ts src/app/history/analysis-result-hydration.test.ts src/lib/premium-projection.test.ts src/app/analyze/complete-training-protocol-view-model.test.ts src/app/analyze/results-dashboard-view-model.test.ts src/app/analyze/results-dashboard.contract.test.ts src/app/copy-claims.contract.test.ts` - PASS, 9 files / 156 tests.
- `npm run typecheck` - PASS.
- `npx vitest run` - PASS, 165 files / 915 tests.
- `npm run benchmark:gate` - PASS: synthetic benchmark 3/3, captured benchmark 5/5, coverage starter gate PASS.

## User Setup Required

Apply the new Drizzle migration in environments that use the database.

## Next Phase Readiness

Ready for later Phase 8 waves: protocol snapshots, explicit revision audit, conservative outcome semantics, and non-technical transfer records are available for deeper protocol loop surfaces.

## Self-Check: PASSED

- Summary file created.
- Acceptance criteria passed through focused tests, full typecheck, full Vitest, and benchmark gate.
- Evidence hierarchy remains strict: compatible clips outrank self-report and transfer.
- No perfect improvement, guaranteed rank, or medical claim copy was introduced.

---
*Phase: 08-complete-training-protocols*
*Completed: 2026-05-07*
