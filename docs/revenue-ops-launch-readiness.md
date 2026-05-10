# Revenue Ops Launch Readiness

Phase 12 makes paid launch status explicit. Real charging stays blocked until the Revenue Ops evidence matrix has complete, dated evidence for implementation, paid-flow, deploy, support, privacy, compliance, and command gates.

## Version

Matrix version: `revenue-ops-launch-readiness-v1`

Evidence rows must include:

- Check ID
- Environment: `stripe_test`, `stripe_production`, `deploy`, `local`, `manual`, or `internal`
- Expected state
- Observed evidence
- Actor or test account
- Date
- Owner
- Rollback
- Result: `PASS`, `WARN`, `BLOCKED`, `FAIL`, `PENDING`, or `MISSING`
- Remaining gap

Rows that are not `PASS` must include a concrete remaining gap. Production Stripe evidence is never inherited from test-mode evidence.

## Launch Gates

### Founder/Beta launch

Founder/Beta launch can open only when implementation, privacy, support, command, safe degradation, and Stripe test-mode paid-flow evidence are passing. This gate does not imply public paid launch readiness.

### Public paid launch

Public paid launch is stricter. It requires Founder/Beta evidence plus separate production Stripe evidence, deployed readiness/smoke evidence, compliance copy review, support readiness, and the public gate row.

## Hard Status Rules

- `Delivered`: every mandatory row is present and `PASS`.
- `Partially delivered`: implementation is present, but one or more rows are `WARN` or `PENDING` with explicit gaps.
- `Blocked`: any required row is missing, `FAIL`, `BLOCKED`, marked `MISSING`, has invalid status, lacks explicit gap, or production evidence is missing/invalid.

Percentages, counts, or visual summaries cannot override a hard blocker.

## Required Paid-Flow Evidence

Stripe test-mode evidence must cover:

- Pricing and server-created Checkout
- Signed webhook fulfillment
- Billing Portal open
- Portal cancellation and period-end access
- Payment failure and grace behavior
- Refund, dispute, fraud, and suspension path
- Admin grant, revoke, suspend, and reconcile
- Checkout disabled while paid users remain preserved
- Price mismatch rejection or quarantine
- Deployed smoke path when available

Stripe production evidence must repeat the production-facing checks independently. Passing test mode is a prerequisite, not a substitute.

## Safe Degradation

When paid-flow risk appears:

- Close risky new checkout.
- Preserve confirmed Pro access.
- Keep Free useful.
- Preserve history.
- Keep billing/support routes visible.
- Create an actionable blocker with owner, runbook, missing evidence, and smallest next verification step.

Safe degradation must not globally upgrade Free users, delete history, revoke confirmed paid access without cause, or hide billing/support routes.

## Runbook Links

- Webhook failure: `docs/monetization-runbooks.md#webhook-failure`
- Price mismatch: `docs/monetization-runbooks.md#price-mismatch`
- Fraud or dispute spike: `docs/monetization-runbooks.md#fraud-or-dispute-spike`
- Checkout disabled but paid users preserved: `docs/monetization-runbooks.md#checkout-disabled-but-paid-users-preserved`
- Paid launch safe degradation: `docs/monetization-runbooks.md#paid-launch-safe-degradation`

## Current Posture

The founder beta Stripe checklist remains the canonical manual test-mode checklist. This document reflects it into the Phase 12 evidence matrix and adds the public paid launch rule: production evidence must be separate and explicit before real public charging.
