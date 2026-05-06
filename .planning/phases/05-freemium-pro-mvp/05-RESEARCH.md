# Phase 5: Freemium Pro MVP - Research

**Researched:** 2026-05-06
**Status:** Complete

## RESEARCH COMPLETE

<summary>
Phase 5 is not a simple pricing-page or Stripe add-on. It is the first paid trust boundary for Sens PUBG. The implementation should be planned around server-side entitlement truth, auditable quota, Stripe-hosted subscription checkout, privacy-minimal analytics, founder beta operations, and hard verification gates.

The existing codebase has strong primitives to build on: browser-first local analysis, server-side `saveAnalysisResult`, Drizzle/Postgres persistence, Auth.js sessions, admin roles, audit logs, community entitlement patterns, copy-claim tests, and benchmark gates. The gap is that monetization is currently inactive and community-scoped. Product Pro must get its own product entitlement taxonomy and resolver instead of spreading `isPro` or forcing product access into `CommunityEntitlementKey`.
</summary>

<sources>

## Official Stripe References Checked

- Stripe subscriptions with Checkout: `https://docs.stripe.com/billing/subscriptions/build-subscriptions`
- Stripe webhook signature verification: `https://docs.stripe.com/webhooks/signature`
- Stripe webhooks and best practices: `https://docs.stripe.com/webhooks`
- Stripe customer portal: `https://docs.stripe.com/customer-management`
- Stripe Billing entitlements: `https://docs.stripe.com/billing/entitlements`
- Stripe Pix: `https://docs.stripe.com/payments/pix`
- Stripe API/key/security overview: `https://docs.stripe.com/apis`

## Local References Read

- `.planning/phases/05-freemium-pro-mvp/05-CONTEXT.md`
- `.planning/PROJECT.md`
- `.planning/REQUIREMENTS.md`
- `.planning/ROADMAP.md`
- `.planning/STATE.md`
- `.planning/codebase/ARCHITECTURE.md`
- `.planning/codebase/STACK.md`
- `.planning/codebase/TESTING.md`
- `.planning/codebase/CONCERNS.md`
- `.planning/codebase/INTEGRATIONS.md`
- `.planning/research/SUMMARY.md`
- `.planning/research/PITFALLS.md`
- `.planning/research/FEATURES.md`
- `.planning/research/ARCHITECTURE.md`
- `docs/SDD-comunidade.md`
- `docs/SDD-coach-extremo.md`
- `docs/SDD-analise-spray.md`
- `src/actions/history.ts`
- `src/db/schema.ts`
- `src/lib/community-entitlements.ts`
- `src/lib/community-access.ts`
- `src/lib/rate-limit.ts`
- `src/env.ts`
- `.env.example`
- `src/actions/admin.ts`
- `src/db/audit-log.ts`
- `src/app/analyze/analysis-client.tsx`
- `src/app/analyze/results-dashboard.tsx`
- `src/app/history/page.tsx`
- `src/app/history/[id]/page.tsx`
- `src/app/dashboard/page.tsx`
- `package.json`

</sources>

<findings>

## 1. Stripe Architecture

Use Stripe Billing subscriptions plus Stripe-hosted Checkout.

Research confirms the correct MVP path is:

- server-created Checkout Sessions in `subscription` mode;
- Products and Prices modeled in Stripe, mapped by server-owned internal price keys;
- webhook-based fulfillment as source of truth;
- `invoice.paid`, `invoice.payment_failed`, subscription update/delete, and Checkout completion events monitored;
- Billing Portal for cancellation, payment method updates, and subscription management.

The client must not send Stripe Price IDs, amounts, currency, plan names, entitlement keys, or quota dates. A client command like "start Pro monthly" should become a server-side lookup against an internal catalog such as:

- `pro_founder_brl_monthly`
- `pro_founder_usd_monthly`
- `pro_public_brl_monthly`
- `pro_public_usd_monthly`
- future yearly keys reserved but inactive

Checkout creation should create an internal checkout attempt first, then call Stripe with an idempotency key based on that attempt. The Checkout Session must carry `client_reference_id`, `metadata.userId`, and `metadata.checkoutAttemptId`.

## 2. Webhook Truth

Stripe webhook signature verification requires the exact raw body plus `Stripe-Signature` and the endpoint secret. For Next.js App Router, implementation should use `await request.text()` or the stripe-node App Router raw-body example pattern before any JSON parsing.

Fulfillment must be idempotent at three levels:

- unique Stripe event ID;
- checkout session or subscription object id;
- internal checkout attempt id.

Webhook processing should reject or quarantine mismatches instead of silently granting Pro:

- metadata user mismatch;
- checkout attempt mismatch;
- customer/subscription mismatch;
- unrecognized Stripe Price ID;
- wrong environment;
- duplicated, replayed, or older out-of-order lifecycle event.

Success URL is UX only. It can display "payment confirming" and poll/read server entitlement truth, but it must never grant Pro.

## 3. Pix Scope Correction

The Phase 5 context locks Pix out of scope for Pro monthly MVP. Current Stripe docs indicate Pix has evolved and can support recurring payments through Pix Automatico under product/account availability constraints. Therefore the plan should not claim "Pix can never do recurring". The safer statement is:

- Pix is out of Phase 5 because the locked MVP product shape is Stripe Checkout subscription with card/standard recurring billing and the user explicitly deferred Pix to credits/one-off/non-recurring or later payment work.

## 4. Existing Codebase Fit

The central save path is `src/actions/history.ts::saveAnalysisResult`. Today it:

- authenticates the user;
- enriches the result with history, precision trend, coach memory, optional LLM copy, and coach plan;
- inserts `analysis_sessions`;
- persists precision evolution/checkpoints;
- inserts sensitivity history;
- returns a saved result to the client.

This is the right enforcement point for quota and Pro/free result shaping. Browser analysis can remain local, but saved analysis, returned Pro-only data, quota events, and analytics must be server-authoritative.

Existing community entitlements are useful as pattern evidence but are community-specific:

- `src/types/community.ts` defines `CommunityEntitlementKey`.
- `src/lib/community-entitlements.ts` resolves default free/community premium future keys.
- `src/lib/community-access.ts` exposes inactive enforcement hooks.

Product Pro should not overload these keys blindly. Add a product-level entitlement taxonomy/resolver with a migration path or explicit shared table adaptation.

## 5. Data Model Implications

Phase 5 likely needs new or adapted tables for:

- internal price catalog mapping keys to Stripe Price IDs per environment;
- Stripe customers/subscriptions;
- checkout attempts;
- processed Stripe events;
- product entitlements/grants/suspensions;
- quota ledger/reservations/finalizations/voids;
- monetization analytics events;
- monetization flags;
- support/admin notes;
- billing/grant/audit events.

The existing `audit_logs` table only accepts a narrow `AuditAction` union in `src/db/audit-log.ts`. Billing and grant operations need either:

- extend `AuditAction` carefully; or
- create a dedicated product/billing event table and bridge important admin actions into `audit_logs`.

The repo has migration files `0008` and `0009`, but `drizzle/meta/_journal.json` only lists older entries. Executors should verify Drizzle migration state before adding Phase 5 migration files, because the migration journal looks stale relative to the SQL files present.

## 6. Entitlement Resolver Shape

The resolver should return a rich access object, not a boolean:

- `effectiveTier`
- `accessState`
- `source`
- `billingStatus`
- `quota`
- `features`
- `blockers`
- period/expiry fields
- safe audit references

Precedence should be explicit:

1. suspension/fraud/chargeback wins;
2. Stripe active/founder/canceling grants Pro through paid period;
3. past_due grants only during the 3-day grace window;
4. active manual grants apply when Stripe does not;
5. expired/canceled/free do not grant Pro;
6. quota may still block new saves without deleting history or billing access.

The implementation should expose wrappers such as `resolveProductAccess`, `requireProductEntitlement`, and `resolvePremiumAnalysisProjection` instead of inlining access checks across UI and actions.

## 7. Quota Ledger

The quota must be a ledger, not a count of history rows alone.

Important rules:

- Free: 3 useful saved analyses per UTC month.
- Pro founder/beta: 100 useful saved analyses per Stripe billing cycle.
- Count only saved uploads/sessions with usable results.
- Multiple sub-sessions saved as one result count as one.
- Weak-capture inconclusive clips, technical failures, failed saves, local reprocesses, and quota-blocked attempts do not count.
- Deleting an analysis does not automatically refund quota.
- Client time and client-provided quota/period values are never trusted.
- Concurrent save attempts near the limit need transactional reservation/finalization/void behavior.

`saveAnalysisResult` should be refactored to reserve quota before DB insert, finalize after successful persistence, and void on technical failure/non-billable weak capture. The client can receive quota-low/exhausted hints before analysis if server state already knows saving will be blocked, but final enforcement remains at save time.

## 8. Analytics And Privacy

Phase 5 analytics should be a product event ledger, privacy-minimal and broad enough for beta learning:

- activation: first usable analysis after instrumentation;
- quota consumed;
- quota low;
- limit hit;
- paywall viewed;
- premium feature attempted while locked;
- checkout started/canceled/completed/confirmed;
- Pro activated;
- payment failed;
- grace entered;
- Pro revoked;
- billing portal opened;
- admin grant/suspension/reconciliation events.

Do not store raw video, frames, aim trajectory, full analysis payload, file names, private notes, card data, CPF/document, address, or bank data in analytics. Use safe metadata: event type, user ID, timestamp, surface, feature key, access state, quota state, internal price key, billing state, reason code, cohort tag, creator code, and event source.

## 9. UX And Copy

Free must stay useful:

- verdict;
- spray mastery;
- confidence/coverage/inconclusive state;
- primary diagnosis summary;
- short next step.

Pro is the complete solo loop:

- higher quota;
- full coach plan;
- complete next-block training protocol;
- history;
- compatible trends/evolution lines/checkpoints;
- advanced metrics;
- outcome capture;
- validation loop;
- dashboard active loop.

Locked surfaces must explain safe blocker reasons such as:

- `limit_reached`
- `pro_feature`
- `payment_issue`
- `weak_evidence`
- `not_enough_history`

Paywall copy can be direct and premium, but must retain:

- Sens PUBG is independent from PUBG/KRAFTON;
- no perfect sensitivity claim;
- no guaranteed rank or guaranteed improvement;
- founder beta is early access with feedback expectation, not pressure or guaranteed result.

## 10. Admin, Beta, And Runbooks

Phase 5 needs a minimal secure admin/support surface, not a full revenue dashboard.

Admin capabilities:

- search user;
- see effective access state/source/quota;
- see Stripe customer/subscription/checkout references;
- see checkout attempts and billing/quota/grant events;
- create/revoke manual grants;
- suspend/unsuspend;
- force reconciliation;
- record support notes.

Support can view and note/escalate, but cannot grant/revoke/suspend.

Flags should be server-side and audited:

- checkout enabled;
- founder enabled;
- portal enabled;
- entitlement enforcement enabled;
- entitlement safe mode;
- grants enabled;
- monetization analytics enabled;
- future public pricing enabled.

Required runbooks:

- webhook failure;
- quota ledger bug;
- price mismatch;
- fraud/dispute spike;
- admin grant abuse;
- analytics incident.

## 11. Verification Strategy

Phase 5 needs a focused `npm run test:monetization` in addition to:

- `npm run typecheck`
- `npx vitest run`
- `npm run benchmark:gate`
- `npm run build`

Focused tests should cover:

- entitlement resolver precedence;
- quota ledger reservation/finalization/void;
- checkout creation and rate limit;
- no client price ID acceptance;
- webhook raw-body signature verification;
- replay/duplicate/out-of-order events;
- metadata/customer/subscription/price mismatches;
- subscription lifecycle active/past_due/grace/canceled/unpaid/suspended;
- success URL without webhook;
- billing portal creation;
- admin grants and role limits;
- analytics privacy allowlist/denylist;
- UI page contracts and copy safety;
- `saveAnalysisResult` bypass prevention.

Founder paid beta cannot be declared open until automated gates pass and a manual Stripe test-mode checklist proves:

pricing -> checkout -> success pending -> webhook confirm -> Pro active -> billing portal -> cancel/payment failure/suspension/admin grant.

</findings>

<recommended_plan_shape>

Use explicit waves:

1. Product monetization schema, catalog, resolver, flags, audit/event foundation.
2. Stripe checkout, webhook, portal, fulfillment, and subscription state reconciliation.
3. Quota ledger and `saveAnalysisResult` enforcement.
4. Free/Pro projection, premium server gating, analytics instrumentation, and locked surfaces.
5. Founder pricing/paywall/billing UX, capture guidance, admin/support beta operations.
6. No False Done verification, runbooks, manual Stripe checklist, and release gates.

This decomposition keeps payment security, quota correctness, premium UX, admin ops, analytics, and verification separate enough to test and roll back.
</recommended_plan_shape>

<risks>

- HIGH: Granting Pro from success URL or client state would break payment truth.
- HIGH: Accepting client Price IDs or quota period fields would enable tampering.
- HIGH: Webhook handler without raw-body signature verification would be unsafe.
- HIGH: Quota enforcement only in UI would be bypassable.
- HIGH: Running paid beta without Stripe test-mode manual checklist would violate No False Done.
- MEDIUM: Spreading `isPro` booleans would make future programs, teams, credits, and community Pro messy.
- MEDIUM: Over-paywalling history/truth evidence would damage trust.
- MEDIUM: Copy could accidentally sell "perfect sens" or rank improvement if not covered by contract tests.
- MEDIUM: Drizzle migration journal appears stale and should be checked during execution.
</risks>

<open_questions>

- Exact Stripe account/workspace selection and live account readiness remain user-controlled.
- Exact live Stripe Product/Price IDs will be configured during execution only with explicit authorization.
- Refund/arrependimento copy should be conservative in Phase 5 and get legal review before public launch.
- Durable production rate limiting remains a later hardening concern; Phase 5 can use existing in-memory rate limit with visible caveat and admin/audit controls.
</open_questions>
