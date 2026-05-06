import { describe, expect, it } from 'vitest';

import type { ResolveProductPriceInput } from './product-price-catalog';

const testEnv = {
    STRIPE_PRICE_PRO_FOUNDER_BRL_MONTHLY_TEST: 'price_founder_brl_test',
    STRIPE_PRICE_PRO_FOUNDER_USD_MONTHLY_TEST: 'price_founder_usd_test',
    STRIPE_PRICE_PRO_PUBLIC_BRL_MONTHLY_TEST: 'price_public_brl_test',
    STRIPE_PRICE_PRO_PUBLIC_USD_MONTHLY_TEST: 'price_public_usd_test',
};

async function loadProductPriceCatalogModule() {
    return import('./product-price-catalog');
}

describe('product price catalog', () => {
    it('selects founder BRL monthly price from server-side country and eligibility facts', async () => {
        const { resolveProductPrice } = await loadProductPriceCatalogModule();

        const result = resolveProductPrice({
            country: 'BR',
            founderEligible: true,
            environment: 'test',
            env: testEnv,
        });

        expect(result).toMatchObject({
            key: 'pro_founder_brl_monthly',
            currency: 'BRL',
            amountCents: 1990,
            interval: 'monthly',
            founder: true,
            stripePriceId: 'price_founder_brl_test',
            stripeEnvKey: 'STRIPE_PRICE_PRO_FOUNDER_BRL_MONTHLY_TEST',
        });
    });

    it('selects public USD monthly price for non-Brazil public users', async () => {
        const { resolveProductPrice } = await loadProductPriceCatalogModule();

        const result = resolveProductPrice({
            country: 'US',
            founderEligible: false,
            environment: 'test',
            env: testEnv,
        });

        expect(result).toMatchObject({
            key: 'pro_public_usd_monthly',
            currency: 'USD',
            amountCents: 999,
            founder: false,
            stripePriceId: 'price_public_usd_test',
        });
    });

    it('fails closed for unknown keys, inactive yearly keys, and missing Stripe Price IDs', async () => {
        const { resolveProductPrice } = await loadProductPriceCatalogModule();

        expect(() => resolveProductPrice({
            priceKey: 'pro_public_eur_monthly',
            environment: 'test',
            env: testEnv,
        })).toThrow(/Unknown product price key/);

        expect(() => resolveProductPrice({
            priceKey: 'pro_public_brl_yearly',
            environment: 'test',
            env: testEnv,
        })).toThrow(/inactive/);

        expect(() => resolveProductPrice({
            priceKey: 'pro_public_brl_monthly',
            environment: 'test',
            env: {},
        })).toThrow(/Missing Stripe Price ID env var/);
    });

    it('does not trust client-shaped payment facts such as price ID, amount, currency, or entitlement', async () => {
        const { resolveProductPrice } = await loadProductPriceCatalogModule();

        const clientShapedInput = {
            priceKey: 'pro_public_usd_monthly',
            stripePriceId: 'price_attacker',
            amountCents: 1,
            currency: 'BRL',
            entitlementKey: 'team.seats',
            environment: 'test',
            env: testEnv,
        } as ResolveProductPriceInput & Record<string, unknown>;

        const result = resolveProductPrice(clientShapedInput);

        expect(result).toMatchObject({
            key: 'pro_public_usd_monthly',
            currency: 'USD',
            amountCents: 999,
            stripePriceId: 'price_public_usd_test',
        });
    });
});
