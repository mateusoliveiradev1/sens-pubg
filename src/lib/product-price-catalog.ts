import {
    isProductPriceKey,
    type ProductPriceKey,
    type StripeEnvironment,
} from '@/types/monetization';

export type ProductPriceCurrency = 'BRL' | 'USD';
export type ProductPriceInterval = 'monthly' | 'yearly';
export type ProductPriceEnvKey =
    | 'STRIPE_PRICE_PRO_FOUNDER_BRL_MONTHLY_TEST'
    | 'STRIPE_PRICE_PRO_FOUNDER_USD_MONTHLY_TEST'
    | 'STRIPE_PRICE_PRO_PUBLIC_BRL_MONTHLY_TEST'
    | 'STRIPE_PRICE_PRO_PUBLIC_USD_MONTHLY_TEST'
    | 'STRIPE_PRICE_PRO_FOUNDER_BRL_MONTHLY_PRODUCTION'
    | 'STRIPE_PRICE_PRO_FOUNDER_USD_MONTHLY_PRODUCTION'
    | 'STRIPE_PRICE_PRO_PUBLIC_BRL_MONTHLY_PRODUCTION'
    | 'STRIPE_PRICE_PRO_PUBLIC_USD_MONTHLY_PRODUCTION';

export type ProductPriceEnvironment = Partial<Record<ProductPriceEnvKey, string | undefined>>;

export interface ProductPriceCatalogEntry {
    readonly key: ProductPriceKey;
    readonly currency: ProductPriceCurrency;
    readonly amountCents: number;
    readonly interval: ProductPriceInterval;
    readonly founder: boolean;
    readonly active: boolean;
    readonly stripeEnvKeys: Partial<Record<StripeEnvironment, ProductPriceEnvKey>>;
}

export interface ResolveProductPriceInput {
    readonly priceKey?: string | null;
    readonly country?: string | null;
    readonly currency?: ProductPriceCurrency | null;
    readonly founderEligible?: boolean;
    readonly environment?: StripeEnvironment;
    readonly env?: ProductPriceEnvironment;
}

export interface ResolvedProductPrice {
    readonly key: ProductPriceKey;
    readonly currency: ProductPriceCurrency;
    readonly amountCents: number;
    readonly interval: ProductPriceInterval;
    readonly founder: boolean;
    readonly stripePriceId: string;
    readonly stripeEnvKey: ProductPriceEnvKey;
    readonly environment: StripeEnvironment;
}

export const PRODUCT_PRICE_CATALOG = {
    pro_founder_brl_monthly: {
        key: 'pro_founder_brl_monthly',
        currency: 'BRL',
        amountCents: 1990,
        interval: 'monthly',
        founder: true,
        active: true,
        stripeEnvKeys: {
            test: 'STRIPE_PRICE_PRO_FOUNDER_BRL_MONTHLY_TEST',
            production: 'STRIPE_PRICE_PRO_FOUNDER_BRL_MONTHLY_PRODUCTION',
        },
    },
    pro_founder_usd_monthly: {
        key: 'pro_founder_usd_monthly',
        currency: 'USD',
        amountCents: 799,
        interval: 'monthly',
        founder: true,
        active: true,
        stripeEnvKeys: {
            test: 'STRIPE_PRICE_PRO_FOUNDER_USD_MONTHLY_TEST',
            production: 'STRIPE_PRICE_PRO_FOUNDER_USD_MONTHLY_PRODUCTION',
        },
    },
    pro_public_brl_monthly: {
        key: 'pro_public_brl_monthly',
        currency: 'BRL',
        amountCents: 2990,
        interval: 'monthly',
        founder: false,
        active: true,
        stripeEnvKeys: {
            test: 'STRIPE_PRICE_PRO_PUBLIC_BRL_MONTHLY_TEST',
            production: 'STRIPE_PRICE_PRO_PUBLIC_BRL_MONTHLY_PRODUCTION',
        },
    },
    pro_public_usd_monthly: {
        key: 'pro_public_usd_monthly',
        currency: 'USD',
        amountCents: 999,
        interval: 'monthly',
        founder: false,
        active: true,
        stripeEnvKeys: {
            test: 'STRIPE_PRICE_PRO_PUBLIC_USD_MONTHLY_TEST',
            production: 'STRIPE_PRICE_PRO_PUBLIC_USD_MONTHLY_PRODUCTION',
        },
    },
    pro_founder_brl_yearly: {
        key: 'pro_founder_brl_yearly',
        currency: 'BRL',
        amountCents: 0,
        interval: 'yearly',
        founder: true,
        active: false,
        stripeEnvKeys: {},
    },
    pro_founder_usd_yearly: {
        key: 'pro_founder_usd_yearly',
        currency: 'USD',
        amountCents: 0,
        interval: 'yearly',
        founder: true,
        active: false,
        stripeEnvKeys: {},
    },
    pro_public_brl_yearly: {
        key: 'pro_public_brl_yearly',
        currency: 'BRL',
        amountCents: 0,
        interval: 'yearly',
        founder: false,
        active: false,
        stripeEnvKeys: {},
    },
    pro_public_usd_yearly: {
        key: 'pro_public_usd_yearly',
        currency: 'USD',
        amountCents: 0,
        interval: 'yearly',
        founder: false,
        active: false,
        stripeEnvKeys: {},
    },
} as const satisfies Record<ProductPriceKey, ProductPriceCatalogEntry>;

function getDefaultStripeEnvironment(): StripeEnvironment {
    return process.env.NODE_ENV === 'production' ? 'production' : 'test';
}

function isBrazilCountry(country: string | null | undefined): boolean {
    const normalized = country?.trim().toLowerCase();
    return normalized === 'br' || normalized === 'bra' || normalized === 'brazil' || normalized === 'brasil';
}

export function selectProductPriceKey(
    input: Pick<ResolveProductPriceInput, 'country' | 'currency' | 'founderEligible'>,
): ProductPriceKey {
    const currency: ProductPriceCurrency = input.currency ?? (isBrazilCountry(input.country) ? 'BRL' : 'USD');

    if (input.founderEligible === true) {
        return currency === 'BRL' ? 'pro_founder_brl_monthly' : 'pro_founder_usd_monthly';
    }

    return currency === 'BRL' ? 'pro_public_brl_monthly' : 'pro_public_usd_monthly';
}

export function getProductPriceCatalogEntry(priceKey: string): ProductPriceCatalogEntry {
    if (!isProductPriceKey(priceKey)) {
        throw new Error(`Unknown product price key: ${priceKey}`);
    }

    return PRODUCT_PRICE_CATALOG[priceKey];
}

export function resolveProductPrice(input: ResolveProductPriceInput = {}): ResolvedProductPrice {
    const key = input.priceKey ?? selectProductPriceKey(input);
    const entry = getProductPriceCatalogEntry(key);

    if (!entry.active) {
        throw new Error(`Product price key is inactive: ${entry.key}`);
    }

    const environment = input.environment ?? getDefaultStripeEnvironment();
    const stripeEnvKey = entry.stripeEnvKeys[environment];

    if (!stripeEnvKey) {
        throw new Error(`Product price key ${entry.key} has no Stripe env mapping for ${environment}`);
    }

    const stripePriceId = input.env?.[stripeEnvKey] ?? process.env[stripeEnvKey];

    if (!stripePriceId) {
        throw new Error(`Missing Stripe Price ID env var: ${stripeEnvKey}`);
    }

    return {
        key: entry.key,
        currency: entry.currency,
        amountCents: entry.amountCents,
        interval: entry.interval,
        founder: entry.founder,
        stripePriceId,
        stripeEnvKey,
        environment,
    };
}
