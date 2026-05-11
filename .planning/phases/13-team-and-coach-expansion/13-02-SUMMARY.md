---
phase: 13-team-and-coach-expansion
plan: "02"
subsystem: database-actions
tags: [team-coach, drizzle, server-actions, seats, audit, monetization]

requires:
  - phase: 13-01
    provides: Team Coach entitlement and access policy foundation
provides:
  - Private Team Coach workspace, membership, invite, share, review, packet, seat ledger, and audit persistence
  - Server-owned Team Coach seat summary and admission helpers
  - Authenticated workspace and invite actions with entitlement, role, seat, and audit checks
affects: [team-coach-ui, report-sharing, coach-review, monetization]

tech-stack:
  added: []
  patterns:
    - Drizzle schema and SQL migration parity tests for Team Coach tables
    - Pure seat accounting helpers fed by persisted membership and invite rows
    - Server actions that reload entitlement, workspace, membership, invite, and seat state before writes

key-files:
  created:
    - drizzle/0015_team_coach_expansion.sql
    - src/core/team-coach-seats.ts
    - src/core/team-coach-seats.test.ts
    - src/actions/team-coach-workspaces.ts
    - src/actions/team-coach-workspaces.test.ts
    - src/actions/team-coach-invites.ts
    - src/actions/team-coach-invites.test.ts
  modified:
    - src/db/schema.ts
    - src/db/schema.test.ts
    - src/types/team-coach.ts

key-decisions:
  - "Pending player invites reserve Team Coach seats so workspace owners cannot over-invite beyond the configured seat limit."
  - "Team Coach workspace access remains private and is derived from Team entitlement plus persisted workspace membership, not public community squad membership."
  - "Invite, role, archive, membership, and seat lifecycle writes emit Team Coach audit events instead of deleting operational evidence."

patterns-established:
  - "Team Coach persistence is isolated from public community squad tables; future cross-links cannot imply private access."
  - "Seat admission is resolved from persisted membership and invite rows immediately before seat-affecting writes."
  - "Team Coach actions use stable success/error result objects for expected failures."

requirements-completed: [TEAM-01]

duration: 17min
completed: 2026-05-11
---

# Phase 13 Plan 02: Team Coach Persistence and Actions Summary

**Private Team Coach workspaces with auditable membership, invite, seat, review, packet, and workspace lifecycle foundations**

## Performance

- **Duration:** 17 min
- **Started:** 2026-05-11T02:11:24Z
- **Completed:** 2026-05-11T02:28:14Z
- **Tasks:** 3
- **Files modified:** 10

## Accomplishments

- Added Team Coach Drizzle schema and migration coverage for private workspaces, memberships, invites, consent/share records, review notes/statuses, packet links, seat ledger, and audit events.
- Added pure seat accounting helpers with an explicit pending-player-invite reservation policy and stable `seat_limit_reached` denial behavior.
- Added authenticated workspace and invite server actions that reload Team entitlement, workspace membership, invite, and seat state before writes.
- Added targeted tests for schema parity, persistence surfaces, seat accounting, role enforcement, invite lifecycle, seat denial, and audit behavior.

## Task Commits

Each task was committed atomically with TDD red/green gates:

1. **Task 1: Add Team/Coach schema and migration** - `4435c58` (test), `39d64c9` (feat)
2. **Task 2: Implement seat accounting helpers** - `6742dd8` (test), `f41a73b` (feat)
3. **Task 3: Add workspace and invite actions** - `d589e6c` (test), `e116eda` (feat)

## Files Created/Modified

- `drizzle/0015_team_coach_expansion.sql` - Creates Team Coach persistence tables, constraints, and indexes.
- `src/db/schema.ts` - Adds Team Coach Drizzle table definitions, relations, and inferred row types.
- `src/db/schema.test.ts` - Verifies Team Coach schema exports, constraints, indexes, defaults, relations, and migration coverage.
- `src/core/team-coach-seats.ts` - Implements server-owned seat summary and admission helpers.
- `src/core/team-coach-seats.test.ts` - Covers active, pending, suspended, revoked, over-limit, and available-seat states.
- `src/actions/team-coach-workspaces.ts` - Implements workspace creation, archive, member role changes, and member status updates.
- `src/actions/team-coach-workspaces.test.ts` - Covers Team entitlement, owner membership creation, role checks, archive audit, and status audit writes.
- `src/actions/team-coach-invites.ts` - Implements invite create, accept, revoke, and expire actions with seat and audit enforcement.
- `src/actions/team-coach-invites.test.ts` - Covers invite role policy, seat denial, accept reloads, and revoke/expire audit behavior.
- `src/types/team-coach.ts` - Extends Team Coach audit event types used by persistence and actions.

## Verification

- `npx vitest run src/db/schema.test.ts` - Passed: 42 tests.
- `npx vitest run src/core/team-coach-seats.test.ts` - Passed: 5 tests.
- `npx vitest run src/actions/team-coach-workspaces.test.ts src/actions/team-coach-invites.test.ts src/lib/team-coach-access.test.ts src/core/team-coach-seats.test.ts` - Passed: 19 tests.
- `npx vitest run src/db/schema.test.ts src/core/team-coach-seats.test.ts src/actions/team-coach-workspaces.test.ts src/actions/team-coach-invites.test.ts` - Passed: 56 tests.
- `npm run test:monetization` - Passed: 219 tests.
- `npm run typecheck` - Passed.

## Decisions Made

- Pending player invites count against seat availability until accepted, revoked, expired, or otherwise no longer pending.
- Seat calculations ignore client roster counts and derive availability from persisted membership and invite rows.
- Coach and analyst roles cannot manage seats unless the server-side Team Coach policy grants `manage_workspace_seats`.
- Workspace and invite actions return stable expected-failure errors instead of throwing for normal authorization, validation, or lifecycle conflicts.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Extended Team Coach audit event type contract**
- **Found during:** Task 3 (Add workspace and invite actions)
- **Issue:** The existing audit event enum did not include all persistence/action lifecycle events required by the plan.
- **Fix:** Added workspace archive, invite expiration, role change, report share/revoke, review note/status, and seat lifecycle event values.
- **Files modified:** `src/types/team-coach.ts`
- **Verification:** Focused action tests and `npm run typecheck` passed.
- **Committed in:** `e116eda`

---

**Total deviations:** 1 auto-fixed missing critical item.
**Impact on plan:** The adjustment was required for typed audit persistence and stayed within the declared Team Coach persistence/action boundary.

## Issues Encountered

- The Task 3 Vitest mocks reload Drizzle schema modules between tests, so table assertions compare stable table names instead of brittle module object identity. This kept the tests focused on the write targets without weakening action behavior assertions.

## Known Stubs

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

The Team Coach persistence and action foundation is ready for report sharing, coach review workflow, and UI work. Future plans should preserve the private Team workspace boundary and continue deriving access from Team entitlement plus persisted membership state.

## Self-Check: PASSED

- Verified all created and modified implementation files exist.
- Verified task commits exist: `4435c58`, `39d64c9`, `6742dd8`, `f41a73b`, `d589e6c`, `e116eda`.

---
*Phase: 13-team-and-coach-expansion*
*Completed: 2026-05-11*
