---
phase: 09-pubg-spray-lab-session-runner-and-benchmark
plan: 02
subsystem: database
tags: [spray-lab, drizzle, server-actions, entitlements, benchmark]

requires:
  - phase: 09-pubg-spray-lab-session-runner-and-benchmark
    provides: Spray Lab v1 contracts, lanes, reducer, fidelity, contextual index, and benchmark builders from 09-01
  - phase: 08-complete-training-protocols
    provides: CompleteTrainingProtocol snapshots and revision patterns used as Lab session source truth
provides:
  - Privacy-minimal Spray Lab persistence for sessions, events, benchmark snapshots, and validation links
  - Authenticated server actions for Lab session lifecycle, event audit, completion, benchmark snapshots, and validation targets
  - Server-owned Free/Pro Spray Lab projection with Pro runner and benchmark entitlements
affects: [phase-09, spray-lab, database, actions, monetization, benchmark, dashboard, history]

tech-stack:
  added: []
  patterns:
    - Lab actions derive protocol truth from owned saved analyses or owned protocol revisions
    - Lab event persistence drops freeform notes and stores reason-code evidence instead of health/body details
    - Free/Pro Lab projection strips audit, benchmark, and validated index data unless server-owned entitlements grant them

key-files:
  created:
    - drizzle/0012_spray_lab_sessions.sql
    - src/actions/spray-lab.ts
    - src/actions/spray-lab.test.ts
    - src/lib/spray-lab-projection.ts
    - src/lib/spray-lab-projection.test.ts
  modified:
    - src/db/schema.ts
    - src/lib/product-entitlements.ts
    - src/lib/premium-projection.ts

key-decisions:
  - "Spray Lab protocol payloads are never trusted from the client; actions load owned analysis/protocol revision rows before creating sessions."
  - "Validation status is derived server-side from owned validation analysis trend evidence and variable confirmation, with changed variables mapped to `nao_compativel`."
  - "Free receives a useful basic Lab projection, while Pro entitlements unlock audit drawers, session history, validated index, benchmarks, and comparisons."
  - "Lab event notes are not persisted; minimal reason codes and versioned snapshots carry the audit surface."

patterns-established:
  - "createSprayLabSessionAction(baseAnalysisSessionId) persists a reducer-compatible session snapshot from CompleteTrainingProtocol."
  - "completeSprayLabSessionAction(...) calculates fidelity/index and persists a benchmark snapshot without requiring backend video compute."
  - "createSprayLabValidationLinkAction(...) links Lab, base analysis, and validation clip IDs under ownership checks."
  - "projectSprayLabForAccess(...) provides a server-owned view model for Free/Pro Lab surfaces."

requirements-completed: [PREC-03, BENCH-01, BENCH-02, BENCH-03, COACH-01, COACH-02, COACH-03]

duration: 15 min
completed: 2026-05-08
---

# Phase 09 Plan 02: Spray Lab Persistence, Actions, Validation Links, And Free/Pro Projection Summary

**Privacy-minimal Spray Lab persistence with authenticated lifecycle actions, validation links, benchmark snapshots, and server-owned Free/Pro access projection.**

## Performance

- **Duration:** 15 min
- **Started:** 2026-05-08T05:55:19Z
- **Completed:** 2026-05-08T06:10:42Z
- **Tasks:** 4/4
- **Files modified:** 8

## Accomplishments

- Added `spray_lab_sessions`, `spray_lab_session_events`, `spray_lab_benchmark_snapshots`, and `spray_lab_validation_links` to Drizzle schema plus idempotent SQL migration.
- Added authenticated Lab actions that verify ownership for base analysis, Lab session, protocol revision, validation clip, event recording, and validation target resolution.
- Completion now calculates fidelity/index and persists benchmark snapshots; validation links preserve base/Lab/validation IDs and keep practice-only sessions out of validated benchmark evidence.
- Added Pro entitlements for `spray_lab.session_runner` and `spray_lab.benchmarks`, plus a Free/Pro projection helper that keeps Free useful and strips Pro-only audit/benchmark fields.

## Task Commits

Each task was committed atomically:

1. **Task 1: Criar schema e migracao Lab** - `fa48f81` (feat)
2. **Task 2: Criar actions autenticadas do Lab** - `7b02ff0` (feat)
3. **Task 3: Ligar snapshots e links de validacao** - `7fc90f5` (feat)
4. **Task 4: Projetar Free/Pro para Spray Lab** - `53dd918` (feat)

**Plan metadata:** pending in the docs completion commit.

## Files Created/Modified

- `src/db/schema.ts` - Added Lab table definitions, relations, payload types, and inferred row types.
- `drizzle/0012_spray_lab_sessions.sql` - Added idempotent SQL migration with guarded FKs and indexes.
- `src/actions/spray-lab.ts` - Added authenticated server actions for Lab session lifecycle, events, completion, benchmarks, validation links, and validation targets.
- `src/actions/spray-lab.test.ts` - Covered auth, ownership, protocol context preservation, invalid transitions, benchmark persistence, incompatible variables, and validation ID preservation.
- `src/lib/product-entitlements.ts` - Granted Pro Spray Lab runner and benchmark entitlements from server-owned access resolution.
- `src/lib/premium-projection.ts` - Added Spray Lab premium locks and copy that preserves Free usefulness.
- `src/lib/spray-lab-projection.ts` - Added server-owned Free/Pro Lab projection view model.
- `src/lib/spray-lab-projection.test.ts` - Covered Free stripping, Pro audit/benchmark access, and copy safety around paid value.

## Decisions Made

- Server actions derive the Lab protocol from owned saved analyses or owned protocol revisions; client input cannot supply a trusted protocol snapshot.
- Validation status is conservative and server-derived: changed variables become `nao_compativel`, and positive trend labels still cannot turn practice-only fidelity into release benchmark evidence.
- Event freeform notes are not persisted to avoid storing sensitive health/body details; reason codes carry the needed audit signal.
- Pro value is depth, audit, validated index, benchmark by context, and comparison over the user's own sessions, not paid-exclusive PUBG API-derived data.

## Deviations from Plan

None - plan executed within the requested scope.

## Issues Encountered

- `src/core/spray-lab-validation.ts` was listed in Task 3 `read_first`, but it does not exist in this repo state. I used the Phase 9 contracts in `src/types/engine.ts` plus `src/core/spray-lab-scoring.ts` and `src/core/spray-lab-fidelity.ts` as the implemented validation/status source.
- Full Vitest passed with expected stderr from existing tests that intentionally simulate dropped product analytics/database failures.

## Verification

- `npx vitest run src/actions/spray-lab.test.ts` - PASS, 4 tests after Task 2.
- `npx vitest run src/actions/spray-lab.test.ts src/core/spray-lab-scoring.test.ts` - PASS, 2 files / 11 tests after Task 3.
- `npx vitest run src/lib/spray-lab-projection.test.ts` - PASS, 3 tests after Task 4.
- `npx vitest run src/lib/product-entitlements.test.ts src/lib/premium-projection.test.ts src/lib/spray-lab-projection.test.ts` - PASS, 3 files / 19 tests.
- `npx vitest run src/actions/spray-lab.test.ts src/lib/spray-lab-projection.test.ts` - PASS, 2 files / 10 tests.
- `npm run typecheck` - PASS.
- `npx drizzle-kit check` - PASS: migration files are consistent.
- `drizzle/0012_spray_lab_sessions.sql` - APPLIED on 2026-05-08T06:21:36Z against the configured target database; verified 4 Spray Lab tables, 21 indexes, and 13 foreign keys present.
- `npx vitest run` - PASS.
- `npm run benchmark:gate` - PASS: synthetic benchmark, captured benchmark, and coverage starter gate passed.

## Known Stubs

None.

## User Setup Required

None for Plan 09-02. `drizzle/0012_spray_lab_sessions.sql` has been applied and verified in the configured target database.

## Next Phase Readiness

Ready for Wave 3 (`09-03` and `09-04`): the UI runner and compatible-validation analyze flow can now consume persisted Lab sessions, validation targets, snapshots, and Free/Pro projection without introducing backend video compute.

## Self-Check: PASSED

- Created/modified key files exist on disk.
- Task commits found: `fa48f81`, `7b02ff0`, `7fc90f5`, `53dd918`.
- Required focused tests, typecheck, Drizzle check, full Vitest, and benchmark gate passed.
- No tracked file deletions were introduced by task commits.

---
*Phase: 09-pubg-spray-lab-session-runner-and-benchmark*
*Completed: 2026-05-08*
