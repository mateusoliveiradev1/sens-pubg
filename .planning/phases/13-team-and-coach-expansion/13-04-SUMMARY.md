---
phase: 13-team-and-coach-expansion
plan: "04"
subsystem: team-coach
tags:
  - nextjs
  - server-actions
  - team-coach
  - view-models
  - tdd
requires:
  - phase: 13-team-and-coach-expansion
    provides: "13-02 workspace access contracts and Team Coach membership policy"
  - phase: 13-team-and-coach-expansion
    provides: "13-03 redacted report shares, packet view models, link tokens, and report action contracts"
provides:
  - "Coach cockpit roster triage and evidence-safe action queues"
  - "Player dossier model over shared redacted reports, blocker history, validation state, notes, status, and audit events"
  - "Server actions for coach notes, review status updates, next-action requests, cockpit loading, and dossier loading"
affects:
  - "13-05 Mesa do Coach UI"
  - "13-06 team workflow verification"
  - "Team Coach review operations"
tech-stack:
  added: []
  patterns:
    - "TDD RED/GREEN commits per task"
    - "Team-safe snapshot re-redaction before cockpit and dossier rendering"
    - "Review workflow actions append audit/review rows without mutating deterministic analysis truth"
key-files:
  created:
    - src/core/team-coach-cockpit.ts
    - src/core/team-coach-player-dossier.ts
    - src/core/team-coach-player-dossier.test.ts
    - src/actions/team-coach-review.ts
    - src/actions/team-coach-review.test.ts
    - src/actions/team-coach-cockpit.ts
    - src/actions/team-coach-cockpit.test.ts
    - src/actions/team-coach.ts
  modified:
    - src/core/team-coach-cockpit.test.ts
key-decisions:
  - "Cockpit comparison is triage-only with global ranking explicitly disabled."
  - "Player dossiers read only shared, redacted Team Coach snapshots; revoked shares remain snapshot-readable without private source reload."
  - "Coach review actions persist notes, status events, next-action requests, and audit events without updating analysis confidence, coverage, blockers, validation, or Coach Extremo truth."
patterns-established:
  - "Cockpit queues prioritize blockers, validation needs, stale evidence, and review state over vanity metrics."
  - "Dossier evidence layers distinguish technical proof, training execution, practical transfer, compatible validation, blockers, repairs, notes, and current state."
  - "Server actions normalize database enum strings before calling strict Team Coach access policy helpers."
requirements-completed:
  - TEAM-01
duration: 16min
completed: 2026-05-11
---

# Phase 13 Plan 04: Coach Cockpit Review Workflow Summary

**Mesa do Coach cockpit, player dossier, and review actions over redacted shared reports with immutable analysis truth.**

## Performance

- **Duration:** 16 min
- **Started:** 2026-05-11T03:09:00Z
- **Completed:** 2026-05-11T03:25:08Z
- **Tasks:** 3
- **Files modified:** 8

## Accomplishments

- Built `createTeamCoachCockpitViewModel` for roster summary, latest shared reports, attention queues, next-action queues, blocker lanes, validation lanes, review status counts, and explicit triage-only comparison semantics.
- Built `buildTeamCoachPlayerDossierViewModel` for shared-only player review context, evidence layers, notes/status/audit summaries, recent blockers, and revoked-share safe snapshot behavior.
- Added Team Coach server actions for gated review notes, review status updates, next-action requests, cockpit loading, and dossier loading without mutating analysis truth rows.

## Task Commits

1. **Task 1 RED: cockpit triage tests** - `86f2fdb` (test)
2. **Task 1 GREEN: cockpit triage model** - `e256602` (feat)
3. **Task 2 RED: player dossier tests** - `04a0df8` (test)
4. **Task 2 GREEN: player dossier model** - `864482a` (feat)
5. **Task 3 RED: review and cockpit action tests** - `a24d87a` (test)
6. **Task 3 GREEN: review workflow actions** - `af1b4eb` (feat)

## Files Created/Modified

- `src/core/team-coach-cockpit.ts` - Coach cockpit roster triage, queue, lane, review count, and operational comparison view model.
- `src/core/team-coach-cockpit.test.ts` - TDD coverage for evidence-state priority, no global ranking, blockers, validation, review, stale, and revoked states.
- `src/core/team-coach-player-dossier.ts` - Shared-only player dossier with safe sources, evidence layers, active context, notes/status/audit summaries, and revoked snapshot handling.
- `src/core/team-coach-player-dossier.test.ts` - TDD coverage for source redaction, active context, evidence layers, coach notes, blockers, and revoked access behavior.
- `src/actions/team-coach-review.ts` - Server actions for coach notes, review status, next-action requests, access checks, audit events, and path revalidation.
- `src/actions/team-coach-review.test.ts` - TDD coverage for gated note creation, immutable analysis truth, and next-action status requests.
- `src/actions/team-coach-cockpit.ts` - Server actions/loaders for cockpit and player dossier snapshots over Team-safe shares.
- `src/actions/team-coach-cockpit.test.ts` - TDD coverage for loader authorization, cockpit construction, dossier construction, and access-denial behavior.

## Decisions Made

- Cockpit comparisons intentionally avoid global leaderboards; the model exposes triage-only operational state so Phase 13 does not introduce vanity rankings.
- Dossier source lists expose safe report IDs and shared evidence states only; no raw analysis snapshots, private source reloads, or unshared player material are surfaced.
- Review workflow actions are append-only from the analysis-truth perspective: they create notes, status events, requested next actions, and audit events, but never update deterministic analysis, confidence, coverage, blockers, validation, or Coach Extremo truth.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed cockpit blocker-lane derivation during Task 1**
- **Found during:** Task 1 (cockpit triage model)
- **Issue:** The first implementation referenced a missing snapshot variable and did not preserve original blocker reasons when building blocker lanes.
- **Fix:** Derived the safe snapshot per share before lane construction and carried blocker reason codes through the lane model.
- **Files modified:** `src/core/team-coach-cockpit.ts`
- **Verification:** `npx vitest run src/core/team-coach-cockpit.test.ts`
- **Committed in:** `e256602`

**2. [Rule 3 - Blocking] Fixed strict action-boundary typing during Task 3**
- **Found during:** Task 3 (review workflow actions)
- **Issue:** Pre-commit typecheck blocked the action commit because database enum strings and exact optional payload fields were not normalized before calling Team Coach policy/schema contracts.
- **Fix:** Added enum normalization at server-action boundaries and omitted absent optional review payload fields instead of passing explicit `undefined` or `null`.
- **Files modified:** `src/actions/team-coach-review.ts`, `src/actions/team-coach-cockpit.ts`
- **Verification:** `npm run typecheck`; `npx vitest run src/actions/team-coach-review.test.ts src/actions/team-coach-cockpit.test.ts src/lib/team-coach-access.test.ts`
- **Committed in:** `af1b4eb`

**3. [Rule 2 - Missing critical functionality] Exposed aggregate Team Coach action surface**
- **Found during:** Orchestrator full-suite verification after Wave 3.
- **Issue:** The Phase 13 RED scaffold expected `src/actions/team-coach.ts` to export the server-owned lifecycle action surface now that workspace, invite, share, review, packet, and link actions exist.
- **Fix:** Added a lazy `use server` aggregate module that exposes the implemented actions under the contract names without importing auth-bound modules at test module load time.
- **Files modified:** `src/actions/team-coach.ts`
- **Verification:** `npx vitest run src/actions/team-coach.test.ts`; `npm run typecheck`

---

**Total deviations:** 3 auto-fixed (1 bug, 1 blocking, 1 missing critical functionality)
**Impact on plan:** All fixes were required for correctness, strict project typing, and the Phase 13 action contract. The aggregate action file only exposes already implemented Wave 1-3 actions.

## Issues Encountered

- The Task 3 commit initially failed in the pre-commit hook on `exactOptionalPropertyTypes` and Team Coach enum narrowing. The blocking issue was fixed before commit and verified with focused tests plus typecheck.
- GSD state SDK helpers updated ROADMAP counts but could not parse this project's current STATE session/progress fields, so STATE metadata was updated directly with the same completion data.

## Verification

- `npx vitest run src/core/team-coach-cockpit.test.ts src/core/team-coach-player-dossier.test.ts src/actions/team-coach-review.test.ts src/actions/team-coach-cockpit.test.ts` - PASS, 4 files / 10 tests.
- `npx vitest run src/actions/team-coach.test.ts` - PASS, 1 file / 1 test.
- `npm run typecheck` - PASS.
- `npm run benchmark:gate` - PASS; synthetic and captured benchmark gates passed, benchmark coverage validation starter gate passed.

## Known Stubs

None. Stub scan of the plan write set found only test helper defaults and legitimate null guards; no placeholder UI data or unwired mock data was introduced.

## Auth Gates

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Phase 13 UI work can consume `getTeamCoachCockpit`, `getTeamCoachPlayerDossier`, and the review workflow actions.
- 13-03 packet/link/redaction contracts remain intact and are consumed through redacted share snapshots.
- No blockers remain for the next Team Coach UI/review phase.

## Self-Check: PASSED

- Verified all created/modified plan files exist.
- Verified all task commits exist in git history: `86f2fdb`, `e256602`, `04a0df8`, `864482a`, `a24d87a`, `af1b4eb`.

---

*Phase: 13-team-and-coach-expansion*
*Completed: 2026-05-11*
