# Monetization Runbooks

Phase 5 founder beta uses grant-first rollout and Stripe test-mode evidence before charging users. These runbooks keep access truth server-side and protect history from payment/support incidents.

## Webhook Failure

- Detection: Checkout success stays pending, `processed_stripe_events` has rejected/missing rows, or `webhook.rejected` analytics rises.
- Mitigation: disable `checkout_enabled`, keep confirmed paid users, replay signed Stripe events after endpoint recovery.
- Rollback: re-enable checkout only after a signed event creates/updates `product_subscriptions`.
- Owner: product/admin.
- Evidence: Stripe event id, endpoint log, processed event row, billing event row.

## Quota Ledger Bug

- Detection: Free users exceed 3 useful saves/month, Pro exceeds 100/cycle, or non-billable weak captures consume quota.
- Mitigation: enable `quota_consumption_paused`, preserve analysis locally, record support adjustments only after audit.
- Rollback: backfill ledger rows from audit and save attempts, then disable pause.
- Owner: engineering.
- Evidence: affected user ids, period, ledger ids, before/after quota summary.

## Price Mismatch

- Detection: webhook fulfillment rejects because Stripe price id does not match the internal price key.
- Mitigation: disable checkout, quarantine event, verify dashboard Product/Price IDs.
- Rollback: correct env mapping, create a new test checkout, replay only valid events.
- Owner: product/admin.
- Evidence: internal price key, Stripe price id, checkout attempt id.

## Fraud Or Dispute Spike

- Detection: `charge.dispute.created`, `review.opened`, unusual refund/dispute support volume.
- Mitigation: suspend access through audited admin path. Do not delete history.
- Rollback: remove suspension after Stripe/support decision and record a support note.
- Owner: support/admin.
- Evidence: Stripe case id, user id, suspension audit id, support note.

## Admin Grant Abuse

- Detection: grants without reason, unusual grant volume, support role attempts mutation.
- Mitigation: disable `manual_grants_enabled`, review `product_billing_events`, revoke abusive grants.
- Rollback: re-enable grants after role review and owner approval.
- Owner: admin.
- Evidence: actor id, grant id, reason code, audit row.

## Analytics Incident

- Detection: prohibited metadata appears or event volume spikes from one surface.
- Mitigation: disable `monetization_analytics_enabled`; entitlement truth and billing continue.
- Rollback: purge unsafe metadata according to retention policy and re-enable after sanitizer test passes.
- Owner: engineering.
- Evidence: event ids, unsafe keys, sanitizer test output.

## Checkout Disabled But Paid Users Preserved

- Detection: checkout flag off during incident or rollout pause.
- Mitigation: new checkout is blocked, existing `product_subscriptions` and manual grants still resolve through product access.
- Rollback: re-enable checkout after runbook-specific evidence is collected.
- Owner: product/admin.
- Evidence: flag row, access resolver output for paid test user.

## Safe Mode Behavior

- Detection: entitlement risk or rollout uncertainty.
- Mitigation: enable `entitlement_safe_mode`; confirmed paid access is preserved, risky new actions degrade, Free is not upgraded globally.
- Rollback: disable safe mode after resolver and billing tests pass.
- Owner: engineering.
- Evidence: flag audit, resolver test, affected surface notes.

## Entitlement Reconciliation

- Detection: resolver truth, Stripe/subscription rows, or manual grant rows disagree.
- Mitigation: support records a note and requests admin reconciliation; support does not mutate paid state.
- Rollback: admin reverts only the audited entitlement/grant event that caused the mismatch.
- Owner: admin.
- Evidence: resolver output, subscription id, grant id, billing event id, audit row.

## Auth And Account Match

- Detection: support case account does not match the authenticated session or requested user id.
- Mitigation: stop user-level detail access until identity is confirmed.
- Rollback: resume support diagnosis only after account identity is verified.
- Owner: support.
- Evidence: support case id, expected user id, session user id.

## Quota Incident

- Detection: quota warning, limit reached, entitlement blocked, or safe-mode paused evidence.
- Mitigation: keep analysis useful where possible, avoid silent paid-state mutation, and route approved adjustments through admin.
- Rollback: backfill or correct quota ledger rows, then rerun quota tests.
- Owner: engineering.
- Evidence: quota ledger ids, affected period, before/after resolver output.

## Analysis Save Incident

- Detection: save/quota writes fail while paid entitlement truth is otherwise valid.
- Mitigation: keep paid access unchanged and preserve the user-facing analysis result when possible.
- Rollback: replay or correct save/quota evidence after the write path is fixed.
- Owner: engineering.
- Evidence: save attempt id, quota ledger id, billing event id.

## Manual Grants

- Detection: grant request, grant expiration, abusive grant volume, or support attempt to mutate paid state.
- Mitigation: support can note/request; admin owns grant, revoke, suspend, and reconcile operations.
- Rollback: revoke or restore only through audited admin actions.
- Owner: admin.
- Evidence: actor id, grant id, reason code, audit row.

## Paid Launch Safe Degradation

- Detection: paid-flow evidence is missing, production Stripe evidence is blocked, webhook safety is uncertain, or a paid incident is active.
- Mitigation: close risky new checkout, preserve confirmed Pro access, keep Free useful, keep history, keep billing/support routes visible, and create a launch blocker.
- Rollback: reopen checkout only after the blocker has dated evidence, owner approval, and a passing Revenue Ops gate.
- Owner: ops/engineering.
- Evidence: flag audit, Revenue Ops evidence row, resolver output for a paid test user, support-route smoke.
