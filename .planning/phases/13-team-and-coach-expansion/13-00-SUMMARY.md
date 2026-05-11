---
phase: 13-team-and-coach-expansion
plan: "00"
subsystem: testing
tags: [team-coach, verifier, playwright, vitest, no-false-team]
requires:
  - phase: 12-revenue-operations-hardening
    provides: Revenue Ops verifier/checklist pattern reused for Phase 13 evidence gating
provides:
  - Phase 13 No False Team verifier scaffold and npm script
  - RED validation tests for Team access, privacy, actions, cockpit, Mesa do Coach routes, packets, and browser evidence
  - Desktop/mobile Playwright matrix scaffold for Mesa do Coach and packet routes
affects: [phase-13, team-coach, verification, playwright, monetization]
tech-stack:
  added: []
  patterns:
    - Evidence-row verifier with derived Delivered/Partially delivered/Blocked status
    - RED future-surface tests with explicit missing-module and missing-route failures
key-files:
  created:
    - scripts/verify-phase13-team-coach.ts
    - src/ci/phase13-team-coach-evidence.test.ts
    - e2e/phase13-team-coach.spec.ts
    - src/types/team-coach.test.ts
    - src/lib/team-coach-access.test.ts
    - src/core/team-coach-report-redaction.test.ts
    - src/core/team-coach-cockpit.test.ts
    - src/actions/team-coach.test.ts
    - src/app/mesa-coach/page.contract.test.ts
    - src/app/mesa-coach/[workspaceId]/[playerId]/page.contract.test.ts
  modified:
    - package.json
key-decisions:
  - "The Phase 13 verifier owns the final delivery claim; missing checklist rows or invalid final status hard-block Delivered."
  - "Future Team/Coach implementation tests fail with explicit missing-surface messages until their owning waves implement the modules and routes."
patterns-established:
  - "Phase verifier scripts parse markdown evidence rows and derive status instead of trusting declared status."
  - "Team browser evidence must cover locked, empty, cockpit, revoke, packet, disabled, print, and mobile overflow states."
requirements-completed: [TEAM-01, TEAM-02]
duration: 10 min
completed: 2026-05-11
---

# Phase 13 Plan 00: Team Coach Validation Scaffold Summary

**No False Team verifier and RED validation matrix for Team access, consent, privacy, packets, cockpit, and Mesa do Coach browser evidence**

## Performance

- **Duration:** 10 min
- **Started:** 2026-05-11T01:48:57Z
- **Completed:** 2026-05-11T01:58:28Z
- **Tasks:** 3
- **Files modified:** 11

## Accomplishments

- Added `verify:phase13:team-coach` and a verifier that blocks false Delivered claims when evidence rows, statuses, or explicit gaps are missing.
- Added Team/Coach RED tests for access separation, consent, redaction, actions, cockpit, Mesa do Coach routes, dossier routes, packet links, and copy safety.
- Added the Phase 13 Playwright scaffold for desktop/mobile Mesa do Coach and packet evidence screenshots.

## Task Commits

1. **Tasks 1-3: Validation, verifier, and browser scaffold** - `44aeea9` (`test(13-00): add team coach validation scaffold`)

## Files Created/Modified

- `scripts/verify-phase13-team-coach.ts` - No False Team evidence verifier.
- `src/ci/phase13-team-coach-evidence.test.ts` - Verifier and package-script contract tests.
- `e2e/phase13-team-coach.spec.ts` - Desktop/mobile browser proof scaffold.
- `src/types/team-coach.test.ts` - Team enum and denial contract tests.
- `src/lib/team-coach-access.test.ts` - Team access separation and policy tests.
- `src/core/team-coach-report-redaction.test.ts` - RED report redaction/privacy tests for later waves.
- `src/core/team-coach-cockpit.test.ts` - RED cockpit lane tests for later waves.
- `src/actions/team-coach.test.ts` - RED Team action export tests for later waves.
- `src/app/mesa-coach/page.contract.test.ts` - RED Mesa do Coach route contract.
- `src/app/mesa-coach/[workspaceId]/[playerId]/page.contract.test.ts` - RED player dossier route contract.
- `package.json` - Registered `verify:phase13:team-coach`.

## Decisions Made

- The verifier is intentionally checklist-driven so final Phase 13 status cannot be inferred from code presence alone.
- The route/core/action tests are RED scaffolds and fail clearly until plans 13-02 through 13-07 implement those surfaces.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Renamed dynamic import locals that violated the Next lint rule**
- **Found during:** Commit pre-flight for Plan 13-00
- **Issue:** `eslint --fix` rejected test-local variables named `module` through `@next/next/no-assign-module-variable`.
- **Fix:** Renamed locals to `teamCoachActions`, `teamCoachCockpit`, and `teamCoachReportRedaction`.
- **Files modified:** `src/actions/team-coach.test.ts`, `src/core/team-coach-cockpit.test.ts`, `src/core/team-coach-report-redaction.test.ts`
- **Verification:** Direct `npx eslint --fix ...` passed, focused Wave 1 Vitest passed, and the commit hook passed.
- **Committed in:** `44aeea9`

**Total deviations:** 1 auto-fixed blocking lint issue.
**Impact on plan:** No behavior or scope change; the scaffold remains RED where later waves are expected to implement missing surfaces.

## Issues Encountered

- The initial commit attempt failed because the pre-commit hook surfaced the lint issue above. After renaming the variables, the hook passed.
- The RED scaffold check intentionally fails for future-owned files:
  - `src/core/team-coach-report-redaction.ts`
  - `src/core/team-coach-cockpit.ts`
  - `src/actions/team-coach.ts`
  - `src/app/mesa-coach/page.tsx`
  - `src/app/mesa-coach/[workspaceId]/[playerId]/page.tsx`

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Plan 13-01 can build on the type/access tests immediately. Later Phase 13 waves must turn the RED scaffold green as they add persistence, redaction, actions, UI, packets, handoffs, and final evidence.

---
*Phase: 13-team-and-coach-expansion*
*Completed: 2026-05-11*
