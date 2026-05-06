---
phase: 05-freemium-pro-mvp
plan: 06
subsystem: paid-ux
tags: [pricing, checkout-success, checkout-cancel, billing, locks, copy-safety]

requires:
  - 05-02 Stripe Checkout and Billing Portal actions
  - 05-04 premium projection and locks
  - 05-05 analytics event contract
provides:
  - `/pricing` Pro Founder trust/conversion page
  - `/checkout/success`, `/checkout/cancel`, and `/billing`
  - Header Pro/Billing navigation
  - Honest lock, quota, capture, cancellation, refund, and support copy
affects: [pricing, billing, checkout, header, analysis-results, copy-safety]

requirements-completed: [ANALYT-01, ANALYT-02, MON-01, MON-02, MON-03, MON-04, MON-05]
completed: 2026-05-06
---

# Phase 05 Plan 06: Founder Pricing, Paywall, Billing UX, And Capture Guidance Summary

Paid UX exists for the closed founder path, but success pages and CTAs stay server-authoritative and do not grant Pro from URL or client state.

## Accomplishments

- Added `/pricing` using server-owned price catalog keys, checkout flags, and product access state.
- Added `/checkout/success` that rechecks entitlement truth and shows pending until webhook-confirmed access.
- Added `/checkout/cancel` with non-hostile copy and history-preservation language.
- Added `/billing` with tier, billing state, quota, period, blockers, Stripe Billing Portal action, and Brazil legal/fiscal review caveat.
- Added header links for Pro and Billing without localStorage entitlement state.
- Extended copy tests for pricing, billing, success/cancel, locks, quotas, capture guidance, cancellation/refund, and PUBG/KRAFTON independence.

## Verification

| Command | Result | Evidence |
| --- | --- | --- |
| `npx vitest run src/app/pricing/page.contract.test.ts src/app/checkout/success/page.contract.test.ts src/app/checkout/cancel/page.contract.test.ts src/app/billing/page.contract.test.ts src/ui/components/header.contract.test.tsx src/app/analyze/results-dashboard-view-model.test.ts src/actions/billing.test.ts src/app/copy-claims.contract.test.ts` | PASS | Covered by final `npm run test:monetization` and full Vitest run. |
| `npm run build` | PASS | Next.js build completed; existing lint warnings remain non-blocking. |

## Requirement Evidence

| Requirement | Evidence | Status |
| --- | --- | --- |
| ANALYT-01 | Pricing and result copy guide users toward first useful save; activation tracking is server-side from 05-05. | PASS |
| ANALYT-02 | Pricing, billing, quota, and lock surfaces expose server feature/reason context for upgrade intent. | PASS |
| MON-01 | Pricing explicitly states Free has 3 useful saved analyses/month and keeps useful truth summary. | PASS |
| MON-02 | Pricing states Pro has 100 useful saved analyses/cycle and unlocks full coach/history/trend/metrics loop. | PASS |
| MON-03 | Success and billing pages read server access, not query params or localStorage. | PASS |
| MON-04 | Pricing says paid value is original Sens PUBG clip/coach/history/validation work, not exclusive PUBG API data. | PASS |
| MON-05 | Copy tests reject perfect sensitivity, guaranteed improvement/rank, unlimited Pro, and official PUBG/KRAFTON claims. | PASS |

## Deviations

- Header path was implemented at `src/ui/components/header.tsx`, matching the actual app structure.
- Checkout remains flag-closed by default; paid founder beta cannot open until manual Stripe checklist passes.

## Remaining Manual Work

Stripe Dashboard branding/product/price copy and full test-mode flow remain manual blockers before charging real users.
