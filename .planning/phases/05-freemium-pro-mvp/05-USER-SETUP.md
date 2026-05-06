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

- [ ] **Create webhook endpoint for downstream plans**
  - Location: Stripe Dashboard -> Developers -> Webhooks
  - Local dev option: `stripe listen --forward-to localhost:3000/api/stripe/webhook`
  - Required events will be finalized by the Stripe checkout/webhook plan.

## Verification

After adding the values, downstream plans should verify with:

```bash
npx vitest run src/lib/product-price-catalog.test.ts
npx drizzle-kit push
```

Expected results:
- Price catalog resolves only allowlisted server-owned internal keys.
- Drizzle push can connect to the intended development database.

---

**Once all items complete:** Mark status as "Complete" at top of file.
