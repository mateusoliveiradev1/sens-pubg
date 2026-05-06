---
phase: 05-freemium-pro-mvp
plan: 07
subsystem: admin-ops
tags: [admin-billing, support, grants, suspensions, beta-cohorts, runbooks, safe-mode]

requires:
  - 05-01 resolver, flags, schema, and audit actions
  - 05-05 analytics recorder
provides:
  - `/admin/billing` operational support surface
  - Role-bounded admin billing actions
  - Beta cohort, creator disclosure, and founder rollout helpers
  - Monetization runbooks and founder beta ops docs
affects: [admin, support, billing-ops, beta, analytics, documentation]

requirements-completed: [ANALYT-02, MON-02, MON-03, MON-04, MON-05]
completed: 2026-05-06
---

# Phase 05 Plan 07: Admin Support, Beta Cohorts, And Runbooks Summary

Staff can support founder/beta entitlements through audited operational paths without adding a broad revenue dashboard or affiliate program.

## Accomplishments

- Added `src/actions/admin-billing.ts` for safe lookup, snapshot, manual grant/revoke, suspension, support notes, and Stripe reconciliation requests.
- Added `/admin/billing` with resolver state, quota, subscription/grant/checkout/event snapshots, support note form, and admin-only mutation forms.
- Added role boundaries: admin can mutate; support/mod can read and support can add notes through the shared action boundary.
- Added `src/lib/beta-cohorts.ts` for internal, beginner/casual, serious/competitive, and coach/creator cohort rules.
- Required creator disclosure when access, discounts, grants, or codes create material benefit; no affiliate/commission/payout fields were added.
- Added monetization and founder-beta runbooks for webhook failure, quota bugs, price mismatch, fraud/dispute spikes, admin grant abuse, analytics incidents, checkout-disabled preservation, and safe mode.

## Verification

| Command | Result | Evidence |
| --- | --- | --- |
| `npx vitest run src/actions/admin-billing.test.ts src/app/admin/billing/page.contract.test.ts src/lib/beta-cohorts.test.ts src/lib/monetization-flags.test.ts` | PASS | Covered by final `npm run test:monetization` and full Vitest run. |
| `npm run typecheck` | PASS | `tsc --noEmit` completed successfully in final gates. |

## Requirement Evidence

| Requirement | Evidence | Status |
| --- | --- | --- |
| ANALYT-02 | Admin grants, revokes, suspensions, support notes, reconciliation, and beta cohorts emit safe analytics/billing evidence. | PASS |
| MON-02 | Founder/Pro grants and support state use shared product tiers/entitlements. | PASS |
| MON-03 | Admin snapshot reads shared resolver state instead of bypassing access truth. | PASS |
| MON-04 | No affiliate payout/commission logic or PUBG API paid gate was introduced. | PASS |
| MON-05 | Runbooks and ops docs preserve history, use Stripe truth, require disclosure, and block broad launch until later evidence. | PASS |

## Deviations

- Admin lookup now guards UUID searches before comparing against the UUID column, preventing invalid UUID query errors for email/name searches.
- Webhook route testability helper was moved later in 05-08 to satisfy Next App Router export rules; behavior is unchanged.

## Remaining Manual Work

Manual admin DB evidence is required before paid founder beta, but the code and contracts are implemented and tested.
