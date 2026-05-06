import { describe, expect, it } from 'vitest';
import type Stripe from 'stripe';

import {
    fulfillStripeEvent,
    type ReceivedStripeEvent,
    type StripeFulfillmentRepository,
    type StripeFulfillmentGateway,
    type SubscriptionUpsertInput,
} from './stripe-fulfillment';
import type {
    ProcessedStripeEventRow,
    ProductCheckoutAttemptRow,
    ProductSubscriptionRow,
} from '@/db/schema';
import type { ProductPriceKey } from '@/types/monetization';

const now = new Date('2026-05-06T12:00:00.000Z');
const yesterday = Math.floor(new Date('2026-05-05T12:00:00.000Z').getTime() / 1000);
const tomorrow = Math.floor(new Date('2026-05-07T12:00:00.000Z').getTime() / 1000);
const lastWeek = Math.floor(new Date('2026-04-29T12:00:00.000Z').getTime() / 1000);
const nextWeek = Math.floor(new Date('2026-05-13T12:00:00.000Z').getTime() / 1000);

function stripeEvent(type: string, object: Record<string, unknown>, id = `evt_${type.replaceAll('.', '_')}`): Stripe.Event {
    return {
        id,
        object: 'event',
        api_version: '2026-04-22.dahlia',
        created: Math.floor(now.getTime() / 1000),
        data: { object },
        livemode: false,
        pending_webhooks: 1,
        request: { id: null, idempotency_key: null },
        type,
    } as Stripe.Event;
}

function checkoutAttempt(overrides: Partial<ProductCheckoutAttemptRow> = {}): ProductCheckoutAttemptRow {
    return {
        id: 'attempt-1',
        userId: 'user-1',
        internalPriceKey: 'pro_public_usd_monthly',
        status: 'stripe_session_created',
        stripeCheckoutSessionId: 'cs_1',
        stripeCustomerId: 'cus_1',
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

function subscription(overrides: Partial<ProductSubscriptionRow> = {}): ProductSubscriptionRow {
    return {
        id: 'product-sub-1',
        userId: 'user-1',
        stripeCustomerId: 'cus_1',
        stripeSubscriptionId: 'sub_1',
        internalPriceKey: 'pro_public_usd_monthly',
        tier: 'pro',
        billingStatus: 'active',
        accessState: 'pro_active',
        currentPeriodStart: new Date(yesterday * 1000),
        currentPeriodEnd: new Date(tomorrow * 1000),
        cancelAtPeriodEnd: false,
        canceledAt: null,
        graceEndsAt: null,
        suspendedAt: null,
        suspensionReason: null,
        metadata: {},
        createdAt: now,
        updatedAt: now,
        ...overrides,
    };
}

function stripeSubscriptionObject(overrides: Record<string, unknown> = {}) {
    return {
        id: 'sub_1',
        customer: 'cus_1',
        status: 'active',
        current_period_start: yesterday,
        current_period_end: tomorrow,
        cancel_at_period_end: false,
        metadata: {
            userId: 'user-1',
            checkoutAttemptId: 'attempt-1',
            internalPriceKey: 'pro_public_usd_monthly',
        },
        items: {
            data: [
                {
                    price: {
                        id: 'price_public_usd',
                    },
                },
            ],
        },
        ...overrides,
    };
}

function createRepo(options: {
    readonly duplicateEventIds?: readonly string[];
    readonly attempts?: ProductCheckoutAttemptRow[];
    readonly subscriptions?: ProductSubscriptionRow[];
} = {}) {
    const processedRows = new Map<string, ProcessedStripeEventRow>();
    for (const duplicateId of options.duplicateEventIds ?? []) {
        processedRows.set(duplicateId, {
            id: `processed-${duplicateId}`,
            stripeEventId: duplicateId,
            eventType: 'checkout.session.completed',
            livemode: false,
            processingStatus: 'processed',
            checkoutAttemptId: null,
            subscriptionId: null,
            payloadHash: 'hash',
            errorMessage: null,
            metadata: {},
            receivedAt: now,
            processedAt: now,
        });
    }

    const attempts = [...(options.attempts ?? [checkoutAttempt()])];
    const subscriptions = [...(options.subscriptions ?? [])];
    const billingEvents: string[] = [];
    const analyticsEvents: string[] = [];
    const eventStatuses: string[] = [];

    const repo: StripeFulfillmentRepository = {
        async recordStripeEventReceived(input): Promise<ReceivedStripeEvent> {
            const existing = processedRows.get(input.stripeEventId);
            if (existing) {
                return { duplicate: true, row: existing };
            }

            const row: ProcessedStripeEventRow = {
                id: `processed-${input.stripeEventId}`,
                stripeEventId: input.stripeEventId,
                eventType: input.eventType,
                livemode: input.livemode,
                processingStatus: 'received',
                checkoutAttemptId: null,
                subscriptionId: null,
                payloadHash: input.payloadHash,
                errorMessage: null,
                metadata: {},
                receivedAt: now,
                processedAt: null,
            };
            processedRows.set(input.stripeEventId, row);
            return { duplicate: false, row };
        },
        async markStripeEventProcessed(input) {
            eventStatuses.push(`processed:${input.processedEventId}:${input.metadata?.action ?? 'unknown'}`);
        },
        async markStripeEventRejected(input) {
            eventStatuses.push(`rejected:${input.processedEventId}:${input.errorMessage}`);
        },
        async findCheckoutAttemptById(id) {
            return attempts.find((attempt) => attempt.id === id) ?? null;
        },
        async findCheckoutAttemptBySessionId(sessionId) {
            return attempts.find((attempt) => attempt.stripeCheckoutSessionId === sessionId) ?? null;
        },
        async updateCheckoutAttemptFromFulfillment(input) {
            const existing = attempts.find((attempt) => attempt.id === input.attemptId);
            if (existing) {
                existing.status = input.status;
                existing.completedAt = input.completedAt ?? existing.completedAt;
                existing.metadata = input.metadata ?? existing.metadata;
            }
        },
        async findSubscriptionByStripeSubscriptionId(subscriptionId) {
            return subscriptions.find((subscription) => subscription.stripeSubscriptionId === subscriptionId) ?? null;
        },
        async findSubscriptionByStripeCustomerId(customerId) {
            return subscriptions.find((subscription) => subscription.stripeCustomerId === customerId) ?? null;
        },
        async upsertSubscription(input: SubscriptionUpsertInput) {
            const existing = subscriptions.find((subscription) => (
                subscription.stripeSubscriptionId === input.stripeSubscriptionId
            ));
            const row = subscription({
                ...(existing ?? {}),
                ...input,
                id: existing?.id ?? `product-sub-${subscriptions.length + 1}`,
                createdAt: existing?.createdAt ?? now,
                updatedAt: now,
            });

            if (existing) {
                Object.assign(existing, row);
                return existing;
            }

            subscriptions.push(row);
            return row;
        },
        async suspendSubscription(input) {
            const existing = input.stripeSubscriptionId
                ? subscriptions.find((subscription) => subscription.stripeSubscriptionId === input.stripeSubscriptionId)
                : subscriptions.find((subscription) => subscription.stripeCustomerId === input.stripeCustomerId);
            if (!existing) {
                return null;
            }

            existing.billingStatus = 'suspended';
            existing.accessState = 'suspended';
            existing.suspendedAt = now;
            existing.suspensionReason = input.reason;
            existing.metadata = input.metadata;
            return existing;
        },
        async recordBillingEvent(input) {
            billingEvents.push(input.eventType);
        },
        async recordAnalyticsEvent(input) {
            analyticsEvents.push(input.eventType);
        },
    };

    return {
        repo,
        attempts,
        subscriptions,
        billingEvents,
        analyticsEvents,
        eventStatuses,
    };
}

function createDeps(options: {
    readonly repo?: StripeFulfillmentRepository;
    readonly linePriceIds?: readonly string[];
    readonly retrievedSubscription?: unknown | null;
}) {
    const stripe: StripeFulfillmentGateway = {
        async getCheckoutSessionLinePriceIds() {
            return options.linePriceIds ?? ['price_public_usd'];
        },
        async retrieveSubscription() {
            return options.retrievedSubscription ?? stripeSubscriptionObject();
        },
    };

    return {
        repository: options.repo ?? createRepo().repo,
        stripe,
        resolvePrice: ({ priceKey }: { readonly priceKey: ProductPriceKey }) => ({
            key: priceKey,
            currency: priceKey.includes('brl') ? 'BRL' as const : 'USD' as const,
            amountCents: priceKey.includes('founder') ? 799 : 999,
            interval: 'monthly' as const,
            founder: priceKey.includes('founder'),
            stripePriceId: priceKey.includes('brl') ? 'price_public_brl' : 'price_public_usd',
            stripeEnvKey: priceKey.includes('brl')
                ? 'STRIPE_PRICE_PRO_PUBLIC_BRL_MONTHLY_TEST' as const
                : 'STRIPE_PRICE_PRO_PUBLIC_USD_MONTHLY_TEST' as const,
            environment: 'test' as const,
        }),
        now: () => now,
    };
}

function checkoutSessionObject(overrides: Record<string, unknown> = {}) {
    return {
        id: 'cs_1',
        mode: 'subscription',
        customer: 'cus_1',
        subscription: 'sub_1',
        metadata: {
            userId: 'user-1',
            checkoutAttemptId: 'attempt-1',
            internalPriceKey: 'pro_public_usd_monthly',
        },
        ...overrides,
    };
}

describe('Stripe fulfillment', () => {
    it('does not duplicate fulfillment for replayed Stripe event ids', async () => {
        const repoState = createRepo({ duplicateEventIds: ['evt_replayed'] });
        const result = await fulfillStripeEvent(
            stripeEvent('checkout.session.completed', checkoutSessionObject(), 'evt_replayed'),
            createDeps({ repo: repoState.repo }),
        );

        expect(result.status).toBe('duplicate');
        expect(repoState.billingEvents).toEqual([]);
        expect(repoState.analyticsEvents).toEqual([]);
    });

    it('rejects checkout metadata user mismatch and records rejected webhook evidence', async () => {
        const repoState = createRepo();
        const result = await fulfillStripeEvent(
            stripeEvent('checkout.session.completed', checkoutSessionObject({
                metadata: {
                    userId: 'attacker',
                    checkoutAttemptId: 'attempt-1',
                    internalPriceKey: 'pro_public_usd_monthly',
                },
            })),
            createDeps({ repo: repoState.repo }),
        );

        expect(result.status).toBe('rejected');
        expect(result.message).toContain('user metadata');
        expect(repoState.billingEvents).toContain('webhook.rejected');
        expect(repoState.analyticsEvents).toContain('webhook.rejected');
    });

    it('rejects Stripe price mismatches for checkout completion', async () => {
        const repoState = createRepo();
        const result = await fulfillStripeEvent(
            stripeEvent('checkout.session.completed', checkoutSessionObject()),
            createDeps({ repo: repoState.repo, linePriceIds: ['price_attacker'] }),
        );

        expect(result.status).toBe('rejected');
        expect(result.message).toContain('Stripe price');
    });

    it('rejects customer mismatch against the internal checkout attempt', async () => {
        const repoState = createRepo();
        const result = await fulfillStripeEvent(
            stripeEvent('checkout.session.completed', checkoutSessionObject({ customer: 'cus_attacker' })),
            createDeps({ repo: repoState.repo }),
        );

        expect(result.status).toBe('rejected');
        expect(result.message).toContain('Stripe customer');
    });

    it('rejects unknown checkout attempts', async () => {
        const repoState = createRepo({ attempts: [] });
        const result = await fulfillStripeEvent(
            stripeEvent('checkout.session.completed', checkoutSessionObject()),
            createDeps({ repo: repoState.repo }),
        );

        expect(result.status).toBe('rejected');
        expect(result.message).toContain('Unknown checkout attempt');
    });

    it('records checkout completion without granting Pro from the success redirect path', async () => {
        const repoState = createRepo();
        const result = await fulfillStripeEvent(
            stripeEvent('checkout.session.completed', checkoutSessionObject()),
            createDeps({ repo: repoState.repo }),
        );

        expect(result.status).toBe('processed');
        expect(repoState.attempts[0]?.status).toBe('completed_webhook_received');
        expect(repoState.subscriptions).toHaveLength(0);
        expect(repoState.analyticsEvents).toContain('checkout.completed');
    });

    it('applies active subscription updates into local Pro access truth', async () => {
        const repoState = createRepo();
        const result = await fulfillStripeEvent(
            stripeEvent('customer.subscription.updated', stripeSubscriptionObject()),
            createDeps({ repo: repoState.repo }),
        );

        expect(result.status).toBe('processed');
        expect(repoState.subscriptions[0]).toMatchObject({
            stripeSubscriptionId: 'sub_1',
            userId: 'user-1',
            billingStatus: 'active',
            accessState: 'pro_active',
        });
        expect(repoState.analyticsEvents).toContain('pro.activated');
    });

    it('ignores older active events that would reopen a canceled newer period', async () => {
        const repoState = createRepo({
            subscriptions: [
                subscription({
                    currentPeriodEnd: new Date(nextWeek * 1000),
                    accessState: 'canceled',
                    billingStatus: 'canceled',
                }),
            ],
        });
        const result = await fulfillStripeEvent(
            stripeEvent('customer.subscription.updated', stripeSubscriptionObject({
                current_period_start: lastWeek,
                current_period_end: yesterday,
            })),
            createDeps({ repo: repoState.repo }),
        );

        expect(result.status).toBe('ignored');
        expect(repoState.subscriptions[0]?.accessState).toBe('canceled');
    });

    it('uses invoice payment failures to enter past_due grace', async () => {
        const repoState = createRepo();
        const result = await fulfillStripeEvent(
            stripeEvent('invoice.payment_failed', { id: 'in_1', subscription: 'sub_1' }),
            createDeps({
                repo: repoState.repo,
                retrievedSubscription: stripeSubscriptionObject({
                    status: 'past_due',
                    current_period_start: lastWeek,
                    current_period_end: yesterday,
                }),
            }),
        );

        expect(result.status).toBe('processed');
        expect(repoState.subscriptions[0]).toMatchObject({
            billingStatus: 'past_due',
            accessState: 'past_due_grace',
        });
        expect(repoState.analyticsEvents).toContain('pro.grace_entered');
    });

    it('makes fraud and dispute events suspend existing access', async () => {
        const repoState = createRepo({
            subscriptions: [subscription()],
        });
        const result = await fulfillStripeEvent(
            stripeEvent('charge.dispute.created', { id: 'dp_1', customer: 'cus_1' }),
            createDeps({ repo: repoState.repo }),
        );

        expect(result.status).toBe('processed');
        expect(repoState.subscriptions[0]).toMatchObject({
            billingStatus: 'suspended',
            accessState: 'suspended',
            suspensionReason: 'chargeback',
        });
        expect(repoState.analyticsEvents).toContain('pro.revoked');
    });
});
