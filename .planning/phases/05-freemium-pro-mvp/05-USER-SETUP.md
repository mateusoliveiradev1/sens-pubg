# Phase 05: User Setup Required

**Generated:** 2026-05-06
**Phase:** 05-freemium-pro-mvp
**Status:** Incomplete

Complete these items before downstream Stripe checkout, webhook, and paid-flow verification can pass. The Phase 05-01 schema push already succeeded against the configured development database.

## Environment Variables

| Status | Variable | Source | Add to |
|--------|----------|--------|--------|
| [ ] | `STRIPE_SECRET_KEY` | Stripe Dashboard -> Developers -> API keys -> Secret key | `.env.local` and deployment env |
| [ ] | `STRIPE_WEBHOOK_SECRET` | Stripe Dashboard or Stripe CLI webhook endpoint signing secret | `.env.local` and deployment env |
| [ ] | `STRIPE_PRICE_PRO_FOUNDER_BRL_MONTHLY_TEST` | Stripe test-mode Price ID for R$19,90 founder monthly | `.env.local` and deployment env |
| [ ] | `STRIPE_PRICE_PRO_FOUNDER_USD_MONTHLY_TEST` | Stripe test-mode Price ID for US$7.99 founder monthly | `.env.local` and deployment env |
| [ ] | `STRIPE_PRICE_PRO_PUBLIC_BRL_MONTHLY_TEST` | Stripe test-mode Price ID for R$29,90 public monthly | `.env.local` and deployment env |
| [ ] | `STRIPE_PRICE_PRO_PUBLIC_USD_MONTHLY_TEST` | Stripe test-mode Price ID for US$9.99 public monthly | `.env.local` and deployment env |
| [ ] | `STRIPE_PRICE_PRO_FOUNDER_BRL_MONTHLY_PRODUCTION` | Stripe live-mode Price ID for R$19,90 founder monthly | deployment env |
| [ ] | `STRIPE_PRICE_PRO_FOUNDER_USD_MONTHLY_PRODUCTION` | Stripe live-mode Price ID for US$7.99 founder monthly | deployment env |
| [ ] | `STRIPE_PRICE_PRO_PUBLIC_BRL_MONTHLY_PRODUCTION` | Stripe live-mode Price ID for R$29,90 public monthly | deployment env |
| [ ] | `STRIPE_PRICE_PRO_PUBLIC_USD_MONTHLY_PRODUCTION` | Stripe live-mode Price ID for US$9.99 public monthly | deployment env |

## Dashboard Configuration

- [ ] **Create Stripe Products and Prices**
  - Location: Stripe Dashboard -> Product catalog
  - Products: Sens PUBG Pro monthly
  - Prices:
    - Founder BRL monthly: R$19,90
    - Founder USD monthly: US$7.99
    - Public BRL monthly: R$29,90
    - Public USD monthly: US$9.99
  - Notes: Do not mutate Stripe Prices after subscribers exist. Create new Prices for future price changes.

- [ ] **Create webhook endpoint for checkout and subscription truth**
  - Location: Stripe Dashboard -> Developers -> Webhooks
  - Local dev option: `stripe listen --forward-to localhost:3000/api/stripe/webhook`
  - Endpoint path: `/api/stripe/webhook`
  - Required events:
    - `checkout.session.completed`
    - `invoice.paid`
    - `invoice.payment_failed`
    - `customer.subscription.updated`
    - `customer.subscription.deleted`
    - `charge.dispute.created`
    - `review.opened`
  - Copy the endpoint signing secret into `STRIPE_WEBHOOK_SECRET`.

- [ ] **Enable Stripe-hosted customer portal**
  - Location: Stripe Dashboard -> Settings -> Billing -> Customer portal
  - Required for card updates, cancellation, and subscription management.
  - Keep portal branding/product naming aligned with "Sens PUBG Pro" and avoid any PUBG/KRAFTON affiliation claim.

## Verification

After adding the values, downstream plans should verify with:

```bash
npx vitest run src/lib/product-price-catalog.test.ts
npx vitest run src/lib/stripe.test.ts src/actions/billing.test.ts src/app/api/stripe/webhook/route.test.ts src/server/billing/stripe-fulfillment.test.ts src/server/billing/subscription-state.test.ts
npx drizzle-kit push
```

Expected results:
- Price catalog resolves only allowlisted server-owned internal keys.
- Checkout, webhook signature verification, idempotent fulfillment, portal, and subscription lifecycle tests pass without real Stripe secrets.
- Drizzle push can connect to the intended development database.

---

**Once all items complete:** Mark status as "Complete" at top of file.
