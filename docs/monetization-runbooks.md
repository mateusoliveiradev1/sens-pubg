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
