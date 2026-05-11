---
phase: 13-team-and-coach-expansion
plan: "01"
subsystem: authorization
tags: [team-coach, monetization, entitlements, premium-projection, zod]
requires:
  - phase: 13-team-and-coach-expansion
    provides: 13-00 RED Team access and verifier scaffold
  - phase: 11-social-pro-community-premium
    provides: Social Pro access resolver pattern for server-owned premium capability policies
provides:
  - Team/Coach enum contracts for roles, statuses, consent, packets, seats, denial reasons, audit events, and next actions
  - Separate Team entitlement grouping and access policy for player review and seats
  - Team lock/projection copy that does not imply solo Pro or Social Pro authority
affects: [team-coach, monetization, premium-projection, product-entitlements]
tech-stack:
  added: []
  patterns:
    - Zod-backed enum contracts with values/schema/isValue/parse exports
    - Server-owned Team capability policy over product access, membership, role, consent, share, invite, and seat context
key-files:
  created:
    - src/types/team-coach.ts
    - src/types/monetization.test.ts
    - src/lib/team-coach-access.ts
  modified:
    - src/types/monetization.ts
    - src/lib/product-entitlements.ts
    - src/lib/product-entitlements.test.ts
    - src/lib/premium-projection.ts
    - src/lib/premium-projection.test.ts
key-decisions:
  - "Team entitlements use `requires_team`, not `requires_pro`, so solo Pro and Social Pro never grant Mesa do Coach authority."
  - "Team locks use `Com Team` copy and explicitly state that solo Pro/Social Pro do not grant coach authority."
patterns-established:
  - "Team access policy returns capability booleans plus explicit denial reasons for later server actions."
  - "Manual/admin Team beta grants can be represented through server-owned product access feature truth without activating self-serve seat billing."
requirements-completed: [TEAM-01, TEAM-02]
duration: 10 min
completed: 2026-05-11
---

# Phase 13 Plan 01: Team Coach Contracts, Access, And Projection Summary

**Server-owned Team/Coach capability contracts separated from solo Pro and Social Pro access**

## Performance

- **Duration:** 10 min
- **Started:** 2026-05-11T01:48:57Z
- **Completed:** 2026-05-11T01:58:42Z
- **Tasks:** 3
- **Files modified:** 8

## Accomplishments

- Added `src/types/team-coach.ts` with stable contracts for roles, statuses, consent scopes, share/review/packet/link states, seat states, denial reasons, audit events, and next actions.
- Added `src/lib/team-coach-access.ts`, which derives Team capabilities from server-owned product access plus workspace membership, role, consent, share, invite, and seat context.
- Extended monetization and premium projection so Team features are active but separately gated, with lock copy that avoids certification, rank proof, seat billing, or solo Pro authority claims.

## Task Commits

1. **Tasks 1-3: Contracts, entitlement grouping, access policy, and projection copy** - `760dd9d` (`feat(13-01): add team coach access contracts`)

## Files Created/Modified

- `src/types/team-coach.ts` - Team/Coach enum contracts and evidence/audit helper types.
- `src/lib/team-coach-access.ts` - Team access policy and server resolver helper.
- `src/types/monetization.ts` - Added `team` tier, `requires_team` gating, Phase 13 metadata, and Team projection booleans.
- `src/types/monetization.test.ts` - Product entitlement key contract coverage for Team keys.
- `src/lib/product-entitlements.ts` - Added `productTeamCoachEntitlementKeys` and catalog entries that do not grant through solo Pro.
- `src/lib/product-entitlements.test.ts` - Coverage that Team keys are not solo Pro/Social Pro entitlements.
- `src/lib/premium-projection.ts` - Added Team locks and booleans.
- `src/lib/premium-projection.test.ts` - Coverage for Team locks and server-owned Team entitlement visibility.

## Decisions Made

- Team features are cataloged as `tier: team` and `gatingMode: requires_team`; `resolveProductAccess` does not auto-grant them for active Pro subscriptions.
- The Team access resolver aggregates denial reasons so UI/actions can explain missing entitlement, membership, role, consent, source share, invite, and seat-limit blockers honestly.

## Deviations from Plan

None - plan executed as scoped, with commits grouped by plan rather than by each internal task.

## Issues Encountered

None.

## Verification

- `npx vitest run src/types/team-coach.test.ts src/types/monetization.test.ts src/lib/product-entitlements.test.ts src/lib/team-coach-access.test.ts src/lib/premium-projection.test.ts src/ci/phase13-team-coach-evidence.test.ts` - PASS, 39 tests.
- `npm run typecheck` - PASS.
- `npm run test:monetization` - PASS, 219 tests.
- `npm run benchmark:gate` - PASS.
- `npm run verify:phase13:team-coach` - expected BLOCKED because `13-VERIFY-CHECKLIST.md` is created in final Phase 13 verification work, not Wave 1.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Plan 13-02 can add workspace, invite, membership, seat, and audit persistence/actions against stable Team types and access-denial reason contracts.

---
*Phase: 13-team-and-coach-expansion*
*Completed: 2026-05-11*
