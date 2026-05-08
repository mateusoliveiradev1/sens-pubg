---
phase: 10-guided-pro-training-programs
plan: 02
subsystem: database-api-entitlements
tags: [nextjs, drizzle, postgres, server-actions, monetization, training-programs]

requires:
  - phase: 10-guided-pro-training-programs
    provides: 10-01 deterministic Ciclo Pro contracts, reducer states, checkpoints, and recovery lines
  - phase: 08-complete-training-protocols
    provides: complete protocol revisions and coach handoff inputs
  - phase: 09-spray-lab
    provides: Spray Lab sessions and compatible validation links
provides:
  - Privacy-minimal training program persistence for cycles, weeks, missions, checkpoints, and events
  - Authenticated server actions for create, load, reenter, complete, pause, close-week, and checkpoint lifecycle changes
  - Server-owned Free/Pro projection for honest basic missions versus full 30-day adaptive cycles
  - Pro entitlement wiring for guided weekly and monthly programs
  - Applied and verified database schema for the current target database
affects: [phase-10-ui, ciclo-pro, dashboard, history, spray-lab, analyze-validation, monetization]

tech-stack:
  added: []
  patterns:
    - Normalize durable program rows while preserving versioned 10-01 snapshots
    - Server actions accept IDs and intent, then reload owned evidence before mutating lifecycle state
    - Access projection is derived from trusted product entitlements, not client state

key-files:
  created:
    - drizzle/0013_guided_pro_training_programs.sql
    - src/actions/training-programs.ts
    - src/actions/training-programs.test.ts
    - src/lib/training-program-projection.ts
    - src/lib/training-program-projection.test.ts
  modified:
    - src/db/schema.ts
    - src/lib/product-entitlements.ts
    - src/lib/product-entitlements.test.ts
    - src/lib/premium-projection.ts
    - src/lib/premium-projection.test.ts

key-decisions:
  - "Use the 10-01 deterministic snapshot IDs as durable row IDs so persisted rows stay auditable without parallel program types."
  - "Keep program mutations server-owned: actions accept identifiers and reload owned analysis, protocol, Lab, and validation evidence before writing state."
  - "Project Free as one real basic next step with evidence and locks, while Pro unlocks the full weekly and monthly adaptive cycle."
  - "Apply migration 0013 through Drizzle and verify the target database catalog before declaring the plan complete."

patterns-established:
  - "Program graph persistence: cycle, week, mission, checkpoint, and event rows each keep compact columns plus the versioned snapshot payload."
  - "Projection-ready load actions: server actions return stored snapshots that can be projected for Free or Pro access without client-side grants."
  - "Honest monetization copy: locks explain visible Free value, Pro depth, and evidence blockers without guaranteed-improvement claims."

requirements-completed: [PREC-03, COACH-01, COACH-02, COACH-03, COACH-04, COACH-05, MON-01, MON-02]

duration: 205min
completed: 2026-05-08
---

# Phase 10 Plan 02: Training Program Persistence and Access Summary

**Privacy-minimal Ciclo Pro persistence with authenticated lifecycle actions, trusted Pro entitlements, and honest Free/Pro projection.**

## Performance

- **Duration:** 205 min
- **Started:** 2026-05-08T17:02:55Z
- **Completed:** 2026-05-08T20:27:40Z
- **Tasks:** 4
- **Files modified:** 10

## Accomplishments

- Added `training_program_cycles`, `training_program_weeks`, `training_program_missions`, `training_program_checkpoints`, and `training_program_events` schema with ownership, evidence, and audit links.
- Built authenticated server actions that create and advance Ciclo Pro from owned analysis/protocol/Lab evidence, block client-side mission skipping, handle recovery/reentry, and record checkpoints/events.
- Wired `programs.guided_weekly` and `programs.guided_monthly` into Pro access, with projection that keeps Free useful and reserves the full 30-day adaptive/auditable cycle for trusted Pro access.
- Applied `drizzle/0013_guided_pro_training_programs.sql` to the configured target database and verified all five tables, indexes, and foreign keys through catalog queries.

## Task Commits

1. **Task 1: Database migration and schema** - `b583899` (feat)
2. **Task 2: Server action lifecycle** - `b4f8a03` (feat)
3. **Task 3: Entitlement and projection policy** - `43cbfeb` (feat)
4. **Task 4: Projection-ready persistence checks** - `692ffcf` (feat)

**Plan metadata:** pending final docs commit.

## Files Created/Modified

- `drizzle/0013_guided_pro_training_programs.sql` - Idempotent migration for the five normalized program tables, indexes, and foreign keys.
- `src/db/schema.ts` - Drizzle tables, relations, JSON payload interfaces, and row types for program persistence.
- `src/actions/training-programs.ts` - Authenticated lifecycle server actions for creating, loading, advancing, reentering, pausing, and checkpointing program cycles.
- `src/actions/training-programs.test.ts` - Targeted tests for auth, ownership, persistence rows, blocker enforcement, reentry, completion, and checkpoint audit behavior.
- `src/lib/product-entitlements.ts` - Pro entitlement catalog additions for guided weekly and monthly programs.
- `src/lib/product-entitlements.test.ts` - Coverage that Pro/founder/admin access grants the new program features while Free does not.
- `src/lib/premium-projection.ts` - Premium lock copy and feature list updates for guided programs.
- `src/lib/premium-projection.test.ts` - Coverage for truthful lock copy and feature projection.
- `src/lib/training-program-projection.ts` - Server-owned Free/Pro projection helper for persisted program snapshots.
- `src/lib/training-program-projection.test.ts` - Coverage for Free basic mission projection, Pro full-cycle projection, and claim safety.

## Decisions Made

- Reused the 10-01 Ciclo Pro contracts directly instead of creating separate persistence-only program types.
- Persisted normalized rows plus versioned snapshots so UI and audit paths can read stable truth without losing reducer provenance.
- Required server-side ownership checks for every source row before creating or mutating a program.
- Mapped Free to a real basic mission and evidence summary; locks never fabricate hidden monthly content.
- Completed the plan-level database requirement by running `npx drizzle-kit push` and verifying target database catalogs after the schema push.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Omitted optional snapshot fields instead of assigning `undefined`**
- **Found during:** Task 2 (Server action lifecycle)
- **Issue:** `exactOptionalPropertyTypes` rejected object literals that explicitly assigned `undefined` to optional snapshot fields.
- **Fix:** Built inserts and event payloads with conditional spreads so absent optional data stays absent.
- **Files modified:** `src/actions/training-programs.ts`
- **Verification:** `npm run typecheck`; focused action tests.
- **Committed in:** `b4f8a03`

**2. [Rule 1 - Bug] Preserved monthly completion state while keeping archived restart lines distinct**
- **Found during:** Task 4 (Projection-ready persistence checks)
- **Issue:** Monthly checkpoint persistence needed to clear the current mission on `cycle_completed`, while archived/restarted lines must remain `linha_reiniciada` and report a restart outcome.
- **Fix:** Mapped `cycle_completed` to durable `concluido`, cleared `currentMissionId`, and kept archived lines on restart outcome semantics.
- **Files modified:** `src/actions/training-programs.ts`, `src/actions/training-programs.test.ts`
- **Verification:** Focused action/projection tests; `npm run typecheck`.
- **Committed in:** `692ffcf`

---

**Total deviations:** 2 auto-fixed (1 blocking, 1 bug)
**Impact on plan:** Both fixes were required for correctness and type-safe persistence. No scope expansion.

## Issues Encountered

- `npx drizzle-kit push` completed and applied schema. It printed the current `pg` package SSL behavior warning; this did not block the push or catalog verification.
- Full Vitest emits expected stderr from tests that intentionally exercise dropped analytics and persistence failures. The test process passed.

## User Setup Required

None. The configured target database was updated and verified during execution.

## Known Stubs

None. The changed files contain no TODO/FIXME/placeholder/coming-soon/not-available markers. Empty arrays, empty option objects, and null checks found in scans are collector/test defaults or nullable guards; they do not render fake program UI or replace required data wiring.

## Database Notes

- `npx drizzle-kit check` passed.
- `npx drizzle-kit push` applied the schema to the configured target database.
- Direct catalog verification found all five tables present with indexes and foreign keys:
  - `training_program_cycles`
  - `training_program_weeks`
  - `training_program_missions`
  - `training_program_checkpoints`
  - `training_program_events`

## Verification

- `npx vitest run src/actions/training-programs.test.ts` - PASS
- `npx vitest run src/actions/training-programs.test.ts src/lib/training-program-projection.test.ts` - PASS
- `npx vitest run src/lib/training-program-projection.test.ts src/lib/product-entitlements.test.ts src/lib/premium-projection.test.ts` - PASS
- `npx vitest run src/actions/training-programs.test.ts src/lib/training-program-projection.test.ts src/lib/product-entitlements.test.ts src/lib/premium-projection.test.ts` - PASS, 32 tests
- `npm run typecheck` - PASS
- `npx drizzle-kit check` - PASS
- `npx drizzle-kit push` - PASS
- Direct DB catalog verification for tables, indexes, and foreign keys - PASS
- `npx vitest run` - PASS
- `npm run benchmark:gate` - PASS, synthetic score 100 and captured benchmark coverage starter gate PASS

## Next Phase Readiness

Phase 10 UI and integration plans can now load server-owned program snapshots and project them based on trusted access. They should reuse `src/actions/training-programs.ts` and `src/lib/training-program-projection.ts` rather than adding client-owned program access.

## Self-Check: PASSED

- Verified all created/modified files named in this summary exist.
- Verified task commits `b583899`, `b4f8a03`, `43cbfeb`, and `692ffcf` exist in git history.
- No missing files or commits found.

---
*Phase: 10-guided-pro-training-programs*
*Completed: 2026-05-08*
