---
phase: 12-revenue-operations-hardening
plan: "01"
subsystem: analytics
tags: [revenue-ops, funnel, privacy, monetization, admin-actions]

requires:
  - phase: 12-revenue-operations-hardening
    provides: Plan 12-00 validation scaffold and verifier expectations
provides:
  - Revenue Ops funnel, metric, detail-reason, and privacy-safe payload contracts
  - Deterministic aggregate funnel snapshot helper
  - Staff-only Revenue Ops cockpit snapshot action with detail-reason guard
affects: [phase-12, revenue-ops, monetization, admin, analytics]

tech-stack:
  added: []
  patterns:
    - Aggregate-first admin analytics with explicit user-detail reasons
    - Server-derived checkout and Pro conversion truth from monetization tables

key-files:
  created:
    - src/types/revenue-ops.ts
    - src/core/revenue-ops-funnel.ts
    - src/actions/revenue-ops.ts
  modified:
    - src/types/revenue-ops.test.ts
    - src/core/revenue-ops-funnel.test.ts
    - src/actions/revenue-ops.test.ts

key-decisions:
  - "Revenue Ops metrics default to aggregate-only payloads; user-level detail requires an explicit operational reason."
  - "Upgrade intent counts only real attempts and excludes passive lock/feed impressions."
  - "Checkout confirmation and free-to-paid conversion derive from server/webhook/subscription facts, never success URLs or client state."

patterns-established:
  - "Revenue Ops sanitization rejects raw clip, raw analysis, private link/reader, payment, address, bank, and private financial shapes."
  - "Cockpit snapshot actions return sanitized view models instead of exposing raw event rows."

requirements-completed:
  - ANALYT-03

duration: 1 min
completed: 2026-05-10
---

# Phase 12 Plan 01: Privacy-Safe Revenue Ops Funnel Summary

**Aggregate Revenue Ops funnel contracts and staff cockpit snapshot actions for activation, upgrade intent, checkout, Pro, churn, and quota signals**

## Performance

- **Duration:** 1 min
- **Started:** 2026-05-09T20:28:32Z
- **Completed:** 2026-05-09T20:29:28Z
- **Tasks:** 3
- **Files modified:** 6

## Accomplishments

- Defined stable Revenue Ops types for operational statuses, launch gates, metric keys, support domains, detail reasons, evidence statuses, and safe payload validation.
- Built `buildRevenueOpsFunnelSnapshot` to aggregate activation, upgrade intent, checkout, Pro active, churn/cancellation, quota limit, and secondary Pro usage from sanitized facts.
- Added staff-only `getRevenueOpsCockpitSnapshot` and support helper actions that enforce aggregate defaults and detail-reason requirements.

## Task Commits

1. **Task 1: Define Revenue Ops funnel contracts** - `095a52b` (feat)
2. **Task 2: Implement privacy-safe funnel aggregation** - `63cb30c` (feat)
3. **Task 3: Expose staff-only cockpit snapshot action** - `10b91ed` (feat)

**Plan metadata:** pending in docs summary commit.

## Files Created/Modified

- `src/types/revenue-ops.ts` - Revenue Ops status, launch, metric, detail-reason, support, evidence, final-status, and privacy helpers.
- `src/core/revenue-ops-funnel.ts` - Privacy-safe funnel aggregation and conversion helpers.
- `src/actions/revenue-ops.ts` - Staff-only aggregate cockpit snapshot, user support detail, notes, reconciliation request, and safe-summary actions.
- `src/types/revenue-ops.test.ts` - Type and prohibited-field contracts.
- `src/core/revenue-ops-funnel.test.ts` - Funnel aggregation fixtures.
- `src/actions/revenue-ops.test.ts` - Action boundary/source contract tests.

## Decisions Made

- Free-to-paid conversion is derived from server-side checkout attempts, webhook/confirmed checkout facts, and subscription/access truth.
- Passive impressions such as lock views and feed impressions are ignored for upgrade-intent metrics.
- User-level Revenue Ops detail is only available for allowlisted operational reasons.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Support diagnosis and admin billing surfaces can consume sanitized Revenue Ops contracts and cockpit actions without querying raw event rows directly.

---
*Phase: 12-revenue-operations-hardening*
*Completed: 2026-05-10*
