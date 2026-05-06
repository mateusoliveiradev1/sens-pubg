# Founder Beta Stripe Test Checklist

Phase 5 paid founder beta stays blocked until this checklist passes in Stripe test mode with evidence links. If Stripe secrets, webhook secret, test Product/Price, or a reachable webhook endpoint are missing, record the row as blocked and keep rollout status at implemented, verification blocked.

Critical path: pricing -> checkout -> success pending -> webhook confirm -> Pro active -> Billing Portal -> cancel/payment failure/suspension/admin grant.

## Evidence Rules

Each row needs:

- Test account or actor.
- Expected server state.
- Observed evidence: command output, DB row, Stripe Dashboard screenshot/log reference, webhook log, or audit event id.
- Result: PASS, FAIL, or BLOCKED.
- Notes and rollback owner.

## Checklist

| Step | Expected State | Evidence | Result | Notes |
| --- | --- | --- | --- | --- |
| Stripe Dashboard branding/product copy | Product is Sens PUBG-specific, non-confusing, monthly founder price is correct, no guaranteed improvement/rank/perfect sensitivity copy. | Pending manual Stripe evidence. | BLOCKED | Requires Stripe test dashboard access. |
| Pricing page founder CTA | `/pricing` reads server catalog/flags and does not accept client price ids. | Automated contract plus manual browser check pending. | BLOCKED | Checkout flag must remain closed until manual proof. |
| Checkout creation | Authenticated user starts Checkout using internal founder key only; attempt row stores safe Stripe ids. | Pending Stripe test session evidence. | BLOCKED | No live secrets in this workspace. |
| Success pending | `/checkout/success` shows pending when webhook has not confirmed entitlement; URL does not grant Pro. | Contract test plus manual test-mode evidence pending. | BLOCKED | Must include `session_id` support note only. |
| Signed webhook confirms Pro | Verified Stripe webhook writes processed event, subscription/access truth, audit, and analytics rows. | Pending signed webhook evidence. | BLOCKED | Use Stripe CLI or hosted endpoint. |
| Pro active UI | Resolver shows Pro active; `/billing` shows tier, quota, period end, and portal CTA. | Pending manual evidence. | BLOCKED | Automated contracts cover static page rules only. |
| Billing Portal opens | Portal opens only through server action for trusted customer id. | Pending Stripe Portal evidence. | BLOCKED | Portal disabled must not revoke paid users. |
| Portal cancellation | Cancellation preserves access until period end and preserves history. | Pending Stripe test evidence. | BLOCKED | Confirm normalized subscription state. |
| Payment failure | Failed invoice enters grace and then blocked state after grace. | Pending webhook evidence. | BLOCKED | Check quota/lock copy routes to billing. |
| Refund/dispute/fraud | Suspension path is audited and does not delete history. | Pending Stripe/admin evidence. | BLOCKED | Escalate disputes to manual support. |
| Admin grant/revoke/suspend/reconcile | Admin-only mutations write audit, billing event, and analytics evidence; support can add notes only. | Automated static/action tests; manual DB evidence pending. | BLOCKED | No broad revenue dashboard. |
| Checkout disabled preserves paid users | Turning checkout off blocks new sales but keeps confirmed paid access. | Flag resolver automated test; manual paid-state evidence pending. | BLOCKED | Safe mode must not grant Pro globally. |
| Price mismatch or unknown metadata | Webhook quarantine/reject path records evidence without granting Pro. | Existing fulfillment tests plus manual Stripe evidence pending. | BLOCKED | Keep raw payment/private data out of analytics. |

## Launch Decision

- Paid founder beta: BLOCKED until every row is PASS.
- Grant-only beta: allowed only through audited admin grant path and cohort/disclosure rules.
- Public launch: blocked for later phases covering revenue ops, legal/fiscal review, training/product readiness, and broader support flow.
