---
phase: 05-freemium-pro-mvp
plan: 03
subsystem: monetization
tags: [quota-ledger, analysis-save, freemium, pro, server-actions, postgres]

requires:
  - 05-01 product monetization contracts, resolver, flags, schema, and quota ledger table
  - 05-02 Stripe subscription truth for trusted Pro billing periods
provides:
  - Auditable analysis quota ledger service with server-owned periods
  - Free 3/month and Pro 100/cycle save quota enforcement
  - `saveAnalysisResult` quota reservation, finalization, weak-capture void, and technical-failure void paths
  - Server-derived analysis save preflight helper
  - Quota warning, exhausted, and non-billable guidance in the analysis/result flow
affects: [phase-05, analysis-history, monetization, quota, premium-enforcement, product-analytics]

tech-stack:
  added: []
  patterns:
    - Quota policy is pure and tested separately from the Drizzle repository adapter
    - Saved analyses reserve quota before persistence and finalize only after successful useful saves
    - Weak-capture unusable saves are audit evidence but non-billable
    - UI may display server quota state but never decides final save permission

key-files:
  created:
    - src/lib/quota-ledger.ts
    - src/lib/quota-ledger.test.ts
  modified:
    - src/types/monetization.ts
    - src/types/engine.ts
    - src/actions/history.ts
    - src/actions/history.test.ts
    - src/app/analyze/analysis-client.tsx
    - src/app/analyze/analysis-client.contract.test.ts
    - src/app/analyze/results-dashboard-view-model.ts
    - src/app/analyze/results-dashboard-view-model.test.ts
    - src/app/analyze/results-dashboard.tsx
    - src/app/analyze/analysis.module.css

key-decisions:
  - "Quota periods are always server-owned: Free uses the UTC month; Stripe-backed Pro uses the trusted subscription cycle."
  - "A blocked save writes an auditable zero-amount `limit_blocked` ledger row instead of silently failing."
  - "Unusable weak-capture results may be saved as evidence without consuming quota, but they do not become useful paid value."
  - "Preflight quota hints are informational; `saveAnalysisResult` remains the enforcement boundary."

requirements-completed: [ANALYT-01, ANALYT-02, MON-01, MON-02, MON-03]
duration: 31 min
completed: 2026-05-06
---

# Phase 05 Plan 03: Quota Ledger And Analysis Save Enforcement Summary

**Server-owned quota reservations now protect saved PUBG spray analyses while preserving browser-first local analysis and honest weak-capture behavior.**

## Performance

- **Duration:** 31 min
- **Started:** 2026-05-06T14:51:00Z
- **Completed:** 2026-05-06T15:22:00Z
- **Tasks:** 3/3
- **Files modified:** 12

## Accomplishments

- Added `src/lib/quota-ledger.ts` with pure quota policy, Drizzle repository seams, idempotent reservation, finalization, voiding, support adjustments, and save-access resolution.
- Added Free quota enforcement for 3 useful saved analyses per UTC month.
- Added Pro/founder quota enforcement for 100 useful saved analyses per trusted Stripe subscription cycle.
- Refactored `saveAnalysisResult` to reserve quota before persistence, block exhausted saves, finalize billable useful saves, void weak-capture unusable saves, and void technical failures.
- Added `getAnalysisSaveAccess` so the analyze UI can warn before processing when the server already knows saving is low/exhausted.
- Added quota notice models and UI bands for preflight blockers, low quota, exhausted saves, technical save failures, and non-billable weak-capture guidance.

## Task Commits

1. **Task 1: Build quota ledger service** - `6e6f6ae`
2. **Task 2: Enforce quota in saveAnalysisResult** - `43e3686`
3. **Task 3: Add save-access preflight and quota UI hints** - `4ce1ce4`

## Verification

| Command | Result | Evidence |
|---------|--------|----------|
| `npx vitest run src/lib/quota-ledger.test.ts src/actions/history.test.ts src/app/analyze/analysis-client.contract.test.ts src/app/analyze/results-dashboard-view-model.test.ts` | PASS | 4 files, 70 tests passed |
| `npm run typecheck` | PASS | `tsc --noEmit` completed successfully |
| `npx vitest run` | PASS | 135 files, 760 tests passed |
| `npm run benchmark:gate` | PASS | Synthetic benchmark 2/2, captured benchmark 5/5, benchmark coverage starter gate PASS |

## Acceptance Criteria

| Criterion | Evidence | Status |
|-----------|----------|--------|
| Free quota uses server UTC month. | `resolveQuotaPeriod` and `quota-ledger.test.ts` assert UTC month boundaries and 3-save limit. | PASS |
| Pro quota uses subscription period from trusted subscription facts. | `resolveQuotaPeriod` uses `stripe_subscription` access periods and `quota-ledger.test.ts` asserts 100/cycle. | PASS |
| Duplicate attempt cannot double count. | `reserveAnalysisQuota` idempotency key path returns `duplicate`; test asserts one billable row. | PASS |
| Limit-blocked attempt does not consume quota. | Exhausted saves insert zero-amount `limit_blocked` ledger rows; tests assert no persistence. | PASS |
| Support adjustment is explicit and auditable. | `recordSupportQuotaAdjustment` writes `support_adjustment` rows with actor/reason metadata. | PASS |
| Anonymous users still fail. | `history.test.ts` rejects unauthenticated `saveAnalysisResult` before quota reservation. | PASS |
| Cross-user history/outcome behavior remains protected. | Existing history and outcome ownership tests still pass in the full suite. | PASS |
| Free user at 3/3 cannot save a new billable usable result. | `history.test.ts` blocks exhausted Free and avoids `analysis_sessions` insert. | PASS |
| Pro user at 100/100 cannot save a new billable usable result. | `history.test.ts` blocks exhausted Pro with `/billing` CTA and no persistence. | PASS |
| Technical save failure voids reservation. | `history.test.ts` forces DB failure and asserts `technical_failure` void. | PASS |
| Weak-capture inconclusive is non-billable when unusable. | `history.test.ts` saves weak-capture evidence and asserts `non_billable_weak_capture` void. | PASS |
| Preflight helper returns server-derived quota warning/blocker state. | `getAnalysisSaveAccess` uses the same resolver/repository and has action tests. | PASS |
| UI contract contains quota low/exhausted copy and no "unlimited" claim. | `analysis-client.contract.test.ts` and `results-dashboard-view-model.test.ts` cover preflight and non-billable copy. | PASS |
| Final save action still enforces quota even if UI preflight is stale. | Contract test asserts UI preflight plus server-side `reserveAnalysisQuota` blocked branch. | PASS |

## Requirement Evidence

| Requirement | 05-03 Evidence | Automated Test | Status |
|-------------|----------------|----------------|--------|
| ANALYT-01 | Establishes the server-owned useful saved-analysis boundary required for first usable activation tracking. | `src/actions/history.test.ts` | Plan foundation complete; actual analytics event recording continues in 05-05. |
| ANALYT-02 | Exhausted saves return structured `limit_reached` quota notices and write auditable `limit_blocked` ledger rows. | `src/actions/history.test.ts`, `src/lib/quota-ledger.test.ts` | Upgrade-intent hook implemented; privacy-minimal event recording continues in 05-05. |
| MON-01 | Free users are limited to 3 useful saved analyses per UTC month; weak unusable captures do not burn quota. | `src/lib/quota-ledger.test.ts`, `src/actions/history.test.ts` | Implemented and tested. |
| MON-02 | Pro/founder users are limited to 100 useful saved analyses per trusted Stripe cycle. | `src/lib/quota-ledger.test.ts`, `src/actions/history.test.ts` | Quota portion implemented; full Pro feature projection continues in 05-04. |
| MON-03 | Quota resolution consumes local subscription/access truth from Phase 05-02 and feeds the existing product-access resolver. | `src/lib/quota-ledger.ts`, `npm run typecheck` | Implemented and typed. |

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- The pre-commit hook caught two `exactOptionalPropertyTypes` issues around optional quota fields. Both were fixed before commits landed.
- The intentional technical-failure test logs `[saveAnalysisResult] Error: database unavailable` to stderr; the test asserts this path voids quota instead of consuming it.

## User Setup Required

None new for this plan. Real database integration still depends on the Phase 5 database setup already documented in `05-USER-SETUP.md`.

## Next Phase Readiness

Plan 05-03 is implemented and verified. Phase 5 can continue to `05-04` for server-side Free/Pro projection and premium enforcement across coach, history, trends, metrics, and outcomes.

---
*Phase: 05-freemium-pro-mvp*
*Completed: 2026-05-06*
