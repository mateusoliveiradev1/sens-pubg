# Research: Architecture Direction

**Date:** 2026-05-05

## Keep Browser-First Analysis

The current architecture is commercially useful because the main analysis path runs locally in the browser. This keeps early infrastructure cost lower and reduces risk around server-side video processing.

Premium features should first extend the current result/history/community layers:

- Better local analysis contracts.
- More honest confidence and benchmark gates.
- Stored history and trend analytics.
- Coach plan memory and outcomes.
- Entitlement-gated UX and paid usage limits.

## Revenue Architecture

The codebase already has:

- `featureEntitlements`
- `userEntitlements`
- `src/lib/community-entitlements.ts`
- `src/lib/community-access.ts`

The monetization phase should build on this rather than invent a parallel access model.

Recommended billing architecture:

1. Define product tiers and feature flags locally.
2. Add billing provider integration for checkout, portal, webhooks, and subscription status.
3. Sync subscription state into existing entitlement tables.
4. Enforce limits at server actions and premium UI boundaries.
5. Track product analytics events for activation, usage, paywall, upgrade, and retention.

## PUBG API And Policy Constraint

If the project later uses PUBG API data, API keys must stay server-side. PUBG's developer terms also allow monetization only under constraints and prohibit charging for exclusive access to features based in whole or part on PUBG API data.

Therefore:

- Paid value should be original analysis from user-submitted clips.
- PUBG API data, if added, should be support/context or free-compatible.
- Avoid official-logo/trademark presentation that implies endorsement.

## Sources

- PUBG API key guidance: https://documentation.pubg.com/en/api-keys.html
- PUBG developer terms/monetization policy: https://developer.pubg.com/tos?locale=en
- Stripe freemium and billing guidance: https://stripe.com/resources/more/freemium-pricing-explained
