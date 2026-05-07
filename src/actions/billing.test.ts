import { describe, expect, it, vi } from 'vitest';
import type Stripe from 'stripe';

import {
    createOpenBillingPortalHandler,
    createStartProCheckoutHandler,
    type BillingRepository,
    type BillingStripeGateway,
} from './billing';
import type {
    ProductCheckoutAttemptRow,
} from '@/db/schema';
import type {
    ResolvedProductPrice,
} from '@/lib/product-price-catalog';
import type {
    CheckBillingActionRateLimitInput,
    RateLimitResult,
} from '@/lib/rate-limit';
import type {
    MonetizationEventType,
    ProductPriceKey,
} from '@/types/monetization';

const now = new Date('2026-05-06T12:00:00.000Z');

function attempt(overrides: Partial<ProductCheckoutAttemptRow> = {}): ProductCheckoutAttemptRow {
    return {
        id: 'attempt-1',
        userId: 'user-1',
        internalPriceKey: 'pro_public_usd_monthly',
        status: 'created',
        stripeCheckoutSessionId: null,
        stripeCustomerId: null,
        idempotencyKey: 'stripe-checkout:attempt-1',
        environment: 'test',
        metadata: {},
        expiresAt: null,
        completedAt: null,
        createdAt: now,
        updatedAt: now,
        ...overrides,
    };
}

function resolvedPrice(overrides: Partial<ResolvedProductPrice> = {}): ResolvedProductPrice {
    return {
        key: 'pro_public_usd_monthly',
        currency: 'USD',
        amountCents: 999,
        interval: 'monthly',
        founder: false,
        stripePriceId: 'price_public_usd',
        stripeEnvKey: 'STRIPE_PRICE_PRO_PUBLIC_USD_MONTHLY_TEST',
        environment: 'test',
        ...overrides,
    };
}

function createRepo(overrides: Partial<BillingRepository> = {}) {
    const events: string[] = [];
    const billingEvents: string[] = [];
    const analyticsEvents: MonetizationEventType[] = [];
    const repo: BillingRepository = {
        async loadFlags() {
            return {
                checkoutEnabled: true,
                founderPricingEnabled: false,
                billingPortalEnabled: true,
                entitlementEnforcementEnabled: true,
                entitlementSafeMode: false,
                manualGrantsEnabled: false,
                monetizationAnalyticsEnabled: true,
                publicPricingEnabled: true,
                quotaConsumptionPaused: false,
                webhookSignatureRequired: true,
                preserveConfirmedPaidAccess: true,
                grantProToEveryone: false,
                blockers: [],
                auditRefs: [],
            };
        },
        async findReusableCheckoutAttempt() {
            return null;
        },
        async createCheckoutAttempt(input) {
            events.push(`create:${input.id}`);
            return attempt({
                id: input.id,
                userId: input.userId,
                internalPriceKey: input.internalPriceKey,
                idempotencyKey: input.idempotencyKey,
                metadata: input.metadata,
            });
        },
        async updateCheckoutAttemptWithSession(input) {
            events.push(`update:${input.stripeCheckoutSessionId}`);
        },
        async findTrustedStripeCustomerIdForUser() {
            return null;
        },
        async recordBillingEvent(input) {
            billingEvents.push(input.eventType);
        },
        async recordAnalyticsEvent(input) {
            analyticsEvents.push(input.eventType);
        },
        ...overrides,
    };

    return {
        repo,
        events,
        billingEvents,
        analyticsEvents,
    };
}

function createStripeGateway() {
    const createCheckoutSession = vi.fn(async (
        params: Stripe.Checkout.SessionCreateParams,
        options: Stripe.RequestOptions,
    ) => ({
        id: 'cs_test_1',
        url: 'https://checkout.stripe.test/session',
        customer: 'cus_1',
        subscription: 'sub_1',
        expires_at: 1_778_064_000,
        metadata: params.metadata,
    }) as Stripe.Checkout.Session);
    const createPortalSession = vi.fn(async () => ({
        id: 'bps_1',
        object: 'billing_portal.session',
        url: 'https://billing.stripe.test/session',
    }) as Stripe.BillingPortal.Session);

    return {
        stripe: {
            createCheckoutSession,
            createPortalSession,
        } satisfies BillingStripeGateway,
        createCheckoutSession,
        createPortalSession,
    };
}

function passingRateLimit(input: CheckBillingActionRateLimitInput): RateLimitResult {
    expect(input.action).toMatch(/^billing\./);
    return {
        success: true,
        remaining: 4,
        resetMs: 60_000,
    };
}

describe('billing server actions', () => {
    it('does not create checkout for anonymous users', async () => {
        const { repo } = createRepo();
        const { stripe } = createStripeGateway();
        const handler = createStartProCheckoutHandler({
            getSession: async () => null,
            repository: repo,
            stripe,
            resolvePrice: () => resolvedPrice(),
            rateLimit: passingRateLimit,
            createId: () => 'attempt-1',
            getAppUrl: () => 'https://sens.pubg.test',
        });

        await expect(handler({ intent: 'public_usd_monthly' })).rejects.toThrow('authenticated');
    });

    it('rejects client-shaped Stripe price, amount, and currency fields', async () => {
        const { repo } = createRepo();
        const { stripe } = createStripeGateway();
        const handler = createStartProCheckoutHandler({
            getSession: async () => ({ user: { id: 'user-1' } }),
            repository: repo,
            stripe,
            resolvePrice: () => resolvedPrice(),
            rateLimit: passingRateLimit,
            createId: () => 'attempt-1',
            getAppUrl: () => 'https://sens.pubg.test',
        });

        await expect(handler({
            intent: 'public_usd_monthly',
            priceId: 'price_attacker',
            amount: 1,
            currency: 'BRL',
        })).rejects.toThrow();
    });

    it('creates an internal attempt before calling Stripe Checkout with server-owned price metadata', async () => {
        const { repo, events, billingEvents, analyticsEvents } = createRepo();
        const { stripe, createCheckoutSession } = createStripeGateway();
        const handler = createStartProCheckoutHandler({
            getSession: async () => ({ user: { id: 'user-1', email: 'user@example.com' } }),
            repository: repo,
            stripe,
            resolvePrice: () => resolvedPrice(),
            rateLimit: passingRateLimit,
            createId: () => 'attempt-1',
            getAppUrl: () => 'https://sens.pubg.test',
        });

        const result = await handler({ intent: 'public_usd_monthly' });

        expect(result).toMatchObject({
            checkoutAttemptId: 'attempt-1',
            checkoutSessionId: 'cs_test_1',
            checkoutUrl: 'https://checkout.stripe.test/session',
            accessState: 'checkout_pending',
        });
        expect(events[0]).toBe('create:attempt-1');
        expect(createCheckoutSession).toHaveBeenCalledTimes(1);
        expect(createCheckoutSession.mock.invocationCallOrder[0]).toBeGreaterThan(0);
        expect(events).toContain('update:cs_test_1');
        expect(createCheckoutSession.mock.calls[0]?.[0]).toMatchObject({
            mode: 'subscription',
            client_reference_id: 'user-1',
            customer_email: 'user@example.com',
            line_items: [{ price: 'price_public_usd', quantity: 1 }],
            metadata: {
                userId: 'user-1',
                checkoutAttemptId: 'attempt-1',
                internalPriceKey: 'pro_public_usd_monthly',
            },
        });
        expect(createCheckoutSession.mock.calls[0]?.[1]).toMatchObject({
            idempotencyKey: 'stripe-checkout:attempt-1',
        });
        expect(billingEvents).toEqual(['checkout.created']);
        expect(analyticsEvents).toEqual(['upgrade_intent.checkout_requested', 'checkout.started']);
    });

    it('uses the same idempotency key when retrying an existing internal attempt', async () => {
        const reusable = attempt({
            id: 'attempt-retry',
            idempotencyKey: 'stripe-checkout:attempt-retry',
        });
        const { repo, events } = createRepo({
            async findReusableCheckoutAttempt() {
                return reusable;
            },
        });
        const { stripe, createCheckoutSession } = createStripeGateway();
        const handler = createStartProCheckoutHandler({
            getSession: async () => ({ user: { id: 'user-1' } }),
            repository: repo,
            stripe,
            resolvePrice: () => resolvedPrice(),
            rateLimit: passingRateLimit,
            createId: () => 'new-attempt',
            getAppUrl: () => 'https://sens.pubg.test',
        });

        await handler({ intent: 'public_usd_monthly' });

        expect(events).not.toContain('create:new-attempt');
        expect(createCheckoutSession.mock.calls[0]?.[1]).toMatchObject({
            idempotencyKey: 'stripe-checkout:attempt-retry',
        });
    });

    it('blocks founder checkout unless founder server flags are enabled', async () => {
        const { repo } = createRepo();
        const { stripe } = createStripeGateway();
        const handler = createStartProCheckoutHandler({
            getSession: async () => ({ user: { id: 'user-1' } }),
            repository: repo,
            stripe,
            resolvePrice: () => resolvedPrice({
                key: 'pro_founder_brl_monthly',
                founder: true,
                currency: 'BRL',
                amountCents: 1990,
                stripePriceId: 'price_founder_brl',
                stripeEnvKey: 'STRIPE_PRICE_PRO_FOUNDER_BRL_MONTHLY_TEST',
            }),
            rateLimit: passingRateLimit,
            createId: () => 'attempt-1',
            getAppUrl: () => 'https://sens.pubg.test',
        });

        await expect(handler({ intent: 'founder_brl_monthly' })).rejects.toThrow('Founder checkout is disabled');
    });

    it('does not open Billing Portal for anonymous users or users without trusted customers', async () => {
        const { repo } = createRepo();
        const { stripe } = createStripeGateway();
        const anonymousHandler = createOpenBillingPortalHandler({
            getSession: async () => null,
            repository: repo,
            stripe,
            rateLimit: passingRateLimit,
            getAppUrl: () => 'https://sens.pubg.test',
        });
        const noCustomerHandler = createOpenBillingPortalHandler({
            getSession: async () => ({ user: { id: 'user-1' } }),
            repository: repo,
            stripe,
            rateLimit: passingRateLimit,
            getAppUrl: () => 'https://sens.pubg.test',
        });

        await expect(anonymousHandler()).rejects.toThrow('authenticated');
        await expect(noCustomerHandler()).rejects.toThrow('No trusted Stripe customer');
    });

    it('opens Stripe Billing Portal only for trusted customer ids', async () => {
        const { repo, billingEvents, analyticsEvents } = createRepo({
            async findTrustedStripeCustomerIdForUser() {
                return 'cus_trusted';
            },
        });
        const { stripe, createPortalSession } = createStripeGateway();
        const handler = createOpenBillingPortalHandler({
            getSession: async () => ({ user: { id: 'user-1' } }),
            repository: repo,
            stripe,
            rateLimit: passingRateLimit,
            getAppUrl: () => 'https://sens.pubg.test',
        });

        const result = await handler();

        expect(result.portalUrl).toBe('https://billing.stripe.test/session');
        expect(createPortalSession).toHaveBeenCalledWith({
            customer: 'cus_trusted',
            return_url: 'https://sens.pubg.test/billing',
        });
        expect(billingEvents).toEqual(['billing.portal_opened']);
        expect(analyticsEvents).toEqual(['billing.portal_opened']);
    });
});
