import { createHash } from 'node:crypto';

import { desc, eq } from 'drizzle-orm';
import type Stripe from 'stripe';

import type { Database } from '@/db';
import {
    monetizationAnalyticsEvents,
    processedStripeEvents,
    productBillingEvents,
    productCheckoutAttempts,
    productSubscriptions,
    type ProcessedStripeEventRow,
    type ProductCheckoutAttemptRow,
    type ProductSubscriptionRow,
} from '@/db/schema';
import {
    resolveProductPrice,
    type ResolvedProductPrice,
} from '@/lib/product-price-catalog';
import {
    createStripeClient,
    type StripeClient,
} from '@/lib/stripe';
import {
    isProductPriceKey,
    type BillingStatus,
    type MonetizationEventType,
    type ProductAccessState,
    type ProductPriceKey,
    type ProductTier,
} from '@/types/monetization';

import {
    normalizeSubscriptionState,
    stripeSecondsToDate,
    type StripeSubscriptionStatusInput,
} from './subscription-state';

export type FulfillmentStatus = 'processed' | 'duplicate' | 'rejected' | 'ignored';

export interface FulfillmentResult {
    readonly status: FulfillmentStatus;
    readonly stripeEventId: string;
    readonly message: string;
}

export interface ReceivedStripeEvent {
    readonly duplicate: boolean;
    readonly row: ProcessedStripeEventRow;
}

export interface StripeEventRecordInput {
    readonly stripeEventId: string;
    readonly eventType: string;
    readonly livemode: boolean;
    readonly payloadHash: string;
}

export interface StripeEventStatusInput {
    readonly processedEventId: string;
    readonly checkoutAttemptId?: string | null;
    readonly subscriptionId?: string | null;
    readonly errorMessage?: string | null;
    readonly metadata?: Record<string, unknown>;
}

export interface SubscriptionUpsertInput {
    readonly userId: string;
    readonly stripeCustomerId: string;
    readonly stripeSubscriptionId: string;
    readonly internalPriceKey: ProductPriceKey;
    readonly tier: ProductTier;
    readonly billingStatus: BillingStatus;
    readonly accessState: ProductAccessState;
    readonly currentPeriodStart: Date | null;
    readonly currentPeriodEnd: Date | null;
    readonly cancelAtPeriodEnd: boolean;
    readonly canceledAt: Date | null;
    readonly graceEndsAt: Date | null;
    readonly suspendedAt: Date | null;
    readonly suspensionReason: string | null;
    readonly metadata: Record<string, unknown>;
}

export interface StripeFulfillmentRepository {
    readonly recordStripeEventReceived: (input: StripeEventRecordInput) => Promise<ReceivedStripeEvent>;
    readonly markStripeEventProcessed: (input: StripeEventStatusInput) => Promise<void>;
    readonly markStripeEventRejected: (input: StripeEventStatusInput) => Promise<void>;
    readonly findCheckoutAttemptById: (id: string) => Promise<ProductCheckoutAttemptRow | null>;
    readonly findCheckoutAttemptBySessionId: (sessionId: string) => Promise<ProductCheckoutAttemptRow | null>;
    readonly updateCheckoutAttemptFromFulfillment: (input: {
        readonly attemptId: string;
        readonly stripeCheckoutSessionId?: string | null;
        readonly stripeCustomerId?: string | null;
        readonly stripeSubscriptionId?: string | null;
        readonly status: string;
        readonly completedAt?: Date | null;
        readonly metadata?: Record<string, unknown>;
    }) => Promise<void>;
    readonly findSubscriptionByStripeSubscriptionId: (subscriptionId: string) => Promise<ProductSubscriptionRow | null>;
    readonly findSubscriptionByStripeCustomerId: (customerId: string) => Promise<ProductSubscriptionRow | null>;
    readonly upsertSubscription: (input: SubscriptionUpsertInput) => Promise<ProductSubscriptionRow>;
    readonly suspendSubscription: (input: {
        readonly stripeCustomerId?: string | null;
        readonly stripeSubscriptionId?: string | null;
        readonly reason: 'fraud' | 'chargeback' | 'abuse' | 'manual';
        readonly metadata: Record<string, unknown>;
    }) => Promise<ProductSubscriptionRow | null>;
    readonly recordBillingEvent: (input: {
        readonly userId?: string | null;
        readonly eventType: string;
        readonly targetType: string;
        readonly targetId?: string | null;
        readonly severity?: 'info' | 'warning' | 'error';
        readonly metadata?: Record<string, unknown>;
    }) => Promise<void>;
    readonly recordAnalyticsEvent: (input: {
        readonly userId?: string | null;
        readonly eventType: MonetizationEventType;
        readonly priceKey?: ProductPriceKey | null;
        readonly billingStatus?: BillingStatus | null;
        readonly accessState?: ProductAccessState | null;
        readonly metadata?: Record<string, unknown>;
    }) => Promise<void>;
}

export interface StripeFulfillmentGateway {
    readonly getCheckoutSessionLinePriceIds: (checkoutSessionId: string) => Promise<readonly string[]>;
    readonly retrieveSubscription: (subscriptionId: string) => Promise<unknown | null>;
}

export interface StripeFulfillmentDeps {
    readonly repository: StripeFulfillmentRepository;
    readonly stripe: StripeFulfillmentGateway;
    readonly resolvePrice: (input: { readonly priceKey: ProductPriceKey }) => ResolvedProductPrice;
    readonly now: () => Date;
}

export class StripeFulfillmentRejectedError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'StripeFulfillmentRejectedError';
    }
}

function hashEventPayload(event: Stripe.Event): string {
    return createHash('sha256').update(JSON.stringify(event)).digest('hex');
}

function isUniqueViolation(error: unknown): boolean {
    return typeof error === 'object'
        && error !== null
        && 'code' in error
        && (error as { code?: unknown }).code === '23505';
}

function createStripeFulfillmentGateway(stripe: StripeClient): StripeFulfillmentGateway {
    return {
        async getCheckoutSessionLinePriceIds(checkoutSessionId) {
            const lineItems = await stripe.checkout.sessions.listLineItems(checkoutSessionId, {
                limit: 10,
            });

            return lineItems.data
                .map((item) => typeof item.price === 'string' ? item.price : item.price?.id)
                .filter((priceId): priceId is string => Boolean(priceId));
        },
        async retrieveSubscription(subscriptionId) {
            return stripe.subscriptions.retrieve(subscriptionId);
        },
    };
}

function createDrizzleStripeFulfillmentRepository(database: Database): StripeFulfillmentRepository {
    return {
        async recordStripeEventReceived(input) {
            const existing = await database.select()
                .from(processedStripeEvents)
                .where(eq(processedStripeEvents.stripeEventId, input.stripeEventId))
                .limit(1);

            if (existing[0]) {
                return { duplicate: true, row: existing[0] };
            }

            try {
                const [row] = await database.insert(processedStripeEvents).values({
                    stripeEventId: input.stripeEventId,
                    eventType: input.eventType,
                    livemode: input.livemode,
                    processingStatus: 'received',
                    payloadHash: input.payloadHash,
                }).returning();

                if (!row) {
                    throw new Error('Failed to record Stripe event');
                }

                return { duplicate: false, row };
            } catch (error) {
                if (isUniqueViolation(error)) {
                    const duplicate = await database.select()
                        .from(processedStripeEvents)
                        .where(eq(processedStripeEvents.stripeEventId, input.stripeEventId))
                        .limit(1);

                    if (duplicate[0]) {
                        return { duplicate: true, row: duplicate[0] };
                    }
                }

                throw error;
            }
        },
        async markStripeEventProcessed(input) {
            await database.update(processedStripeEvents)
                .set({
                    processingStatus: 'processed',
                    checkoutAttemptId: input.checkoutAttemptId ?? null,
                    subscriptionId: input.subscriptionId ?? null,
                    metadata: input.metadata ?? {},
                    processedAt: new Date(),
                })
                .where(eq(processedStripeEvents.id, input.processedEventId));
        },
        async markStripeEventRejected(input) {
            await database.update(processedStripeEvents)
                .set({
                    processingStatus: 'rejected',
                    checkoutAttemptId: input.checkoutAttemptId ?? null,
                    subscriptionId: input.subscriptionId ?? null,
                    errorMessage: input.errorMessage ?? 'Stripe event rejected',
                    metadata: input.metadata ?? {},
                    processedAt: new Date(),
                })
                .where(eq(processedStripeEvents.id, input.processedEventId));
        },
        async findCheckoutAttemptById(id) {
            const rows = await database.select()
                .from(productCheckoutAttempts)
                .where(eq(productCheckoutAttempts.id, id))
                .limit(1);

            return rows[0] ?? null;
        },
        async findCheckoutAttemptBySessionId(sessionId) {
            const rows = await database.select()
                .from(productCheckoutAttempts)
                .where(eq(productCheckoutAttempts.stripeCheckoutSessionId, sessionId))
                .limit(1);

            return rows[0] ?? null;
        },
        async updateCheckoutAttemptFromFulfillment(input) {
            const update: Partial<typeof productCheckoutAttempts.$inferInsert> = {
                status: input.status,
                updatedAt: new Date(),
            };

            if (input.stripeCheckoutSessionId !== undefined) {
                update.stripeCheckoutSessionId = input.stripeCheckoutSessionId;
            }
            if (input.stripeCustomerId !== undefined) {
                update.stripeCustomerId = input.stripeCustomerId;
            }
            if (input.completedAt !== undefined) {
                update.completedAt = input.completedAt;
            }
            if (input.metadata !== undefined) {
                update.metadata = input.metadata;
            }

            await database.update(productCheckoutAttempts)
                .set(update)
                .where(eq(productCheckoutAttempts.id, input.attemptId));
        },
        async findSubscriptionByStripeSubscriptionId(subscriptionId) {
            const rows = await database.select()
                .from(productSubscriptions)
                .where(eq(productSubscriptions.stripeSubscriptionId, subscriptionId))
                .limit(1);

            return rows[0] ?? null;
        },
        async findSubscriptionByStripeCustomerId(customerId) {
            const rows = await database.select()
                .from(productSubscriptions)
                .where(eq(productSubscriptions.stripeCustomerId, customerId))
                .orderBy(desc(productSubscriptions.updatedAt))
                .limit(1);

            return rows[0] ?? null;
        },
        async upsertSubscription(input) {
            const existing = await this.findSubscriptionByStripeSubscriptionId(input.stripeSubscriptionId);

            if (existing) {
                const [updated] = await database.update(productSubscriptions)
                    .set({
                        userId: input.userId,
                        stripeCustomerId: input.stripeCustomerId,
                        internalPriceKey: input.internalPriceKey,
                        tier: input.tier,
                        billingStatus: input.billingStatus,
                        accessState: input.accessState,
                        currentPeriodStart: input.currentPeriodStart,
                        currentPeriodEnd: input.currentPeriodEnd,
                        cancelAtPeriodEnd: input.cancelAtPeriodEnd,
                        canceledAt: input.canceledAt,
                        graceEndsAt: input.graceEndsAt,
                        suspendedAt: input.suspendedAt,
                        suspensionReason: input.suspensionReason,
                        metadata: input.metadata,
                        updatedAt: new Date(),
                    })
                    .where(eq(productSubscriptions.id, existing.id))
                    .returning();

                if (!updated) {
                    throw new Error('Failed to update product subscription');
                }

                return updated;
            }

            const [created] = await database.insert(productSubscriptions).values({
                userId: input.userId,
                stripeCustomerId: input.stripeCustomerId,
                stripeSubscriptionId: input.stripeSubscriptionId,
                internalPriceKey: input.internalPriceKey,
                tier: input.tier,
                billingStatus: input.billingStatus,
                accessState: input.accessState,
                currentPeriodStart: input.currentPeriodStart,
                currentPeriodEnd: input.currentPeriodEnd,
                cancelAtPeriodEnd: input.cancelAtPeriodEnd,
                canceledAt: input.canceledAt,
                graceEndsAt: input.graceEndsAt,
                suspendedAt: input.suspendedAt,
                suspensionReason: input.suspensionReason,
                metadata: input.metadata,
            }).returning();

            if (!created) {
                throw new Error('Failed to create product subscription');
            }

            return created;
        },
        async suspendSubscription(input) {
            const existing = input.stripeSubscriptionId
                ? await this.findSubscriptionByStripeSubscriptionId(input.stripeSubscriptionId)
                : input.stripeCustomerId
                    ? await this.findSubscriptionByStripeCustomerId(input.stripeCustomerId)
                    : null;

            if (!existing) {
                return null;
            }

            const [updated] = await database.update(productSubscriptions)
                .set({
                    billingStatus: 'suspended',
                    accessState: 'suspended',
                    suspendedAt: new Date(),
                    suspensionReason: input.reason,
                    metadata: {
                        ...existing.metadata,
                        ...input.metadata,
                    },
                    updatedAt: new Date(),
                })
                .where(eq(productSubscriptions.id, existing.id))
                .returning();

            return updated ?? null;
        },
        async recordBillingEvent(input) {
            await database.insert(productBillingEvents).values({
                userId: input.userId ?? null,
                eventType: input.eventType,
                targetType: input.targetType,
                targetId: input.targetId ?? null,
                severity: input.severity ?? 'info',
                metadata: input.metadata ?? {},
            });
        },
        async recordAnalyticsEvent(input) {
            await database.insert(monetizationAnalyticsEvents).values({
                userId: input.userId ?? null,
                eventType: input.eventType,
                priceKey: input.priceKey ?? null,
                billingStatus: input.billingStatus ?? null,
                accessState: input.accessState ?? null,
                metadata: input.metadata ?? {},
                eventSource: 'server',
            });
        },
    };
}

function asRecord(value: unknown): Record<string, unknown> {
    return typeof value === 'object' && value !== null ? value as Record<string, unknown> : {};
}

function getString(value: unknown): string | null {
    return typeof value === 'string' && value.trim().length > 0 ? value : null;
}

function getBoolean(value: unknown): boolean {
    return value === true;
}

function getNumber(value: unknown): number | null {
    return typeof value === 'number' ? value : null;
}

function getObjectId(value: unknown): string | null {
    if (typeof value === 'string') {
        return value;
    }

    return getString(asRecord(value).id);
}

function getMetadata(object: Record<string, unknown>): Record<string, string> {
    const metadata = asRecord(object.metadata);
    return Object.fromEntries(
        Object.entries(metadata)
            .filter((entry): entry is [string, string] => typeof entry[1] === 'string'),
    );
}

function requireProductPriceKey(value: string | null): ProductPriceKey {
    if (!value || !isProductPriceKey(value)) {
        throw new StripeFulfillmentRejectedError(`Unknown internal price key: ${value ?? 'missing'}`);
    }

    return value;
}

function requireMetadataIdentity(object: Record<string, unknown>) {
    const metadata = getMetadata(object);
    const userId = getString(metadata.userId);
    const checkoutAttemptId = getString(metadata.checkoutAttemptId);
    const internalPriceKey = requireProductPriceKey(getString(metadata.internalPriceKey));

    if (!userId || !checkoutAttemptId) {
        throw new StripeFulfillmentRejectedError('Stripe event is missing required Sens PUBG metadata');
    }

    return {
        userId,
        checkoutAttemptId,
        internalPriceKey,
    };
}

async function requireValidatedAttempt(input: {
    readonly repository: StripeFulfillmentRepository;
    readonly checkoutAttemptId: string;
    readonly userId: string;
    readonly internalPriceKey: ProductPriceKey;
    readonly stripeCustomerId?: string | null;
    readonly stripeCheckoutSessionId?: string | null;
}): Promise<ProductCheckoutAttemptRow> {
    const attempt = await input.repository.findCheckoutAttemptById(input.checkoutAttemptId);
    if (!attempt) {
        throw new StripeFulfillmentRejectedError('Unknown checkout attempt in Stripe event metadata');
    }
    if (attempt.userId !== input.userId) {
        throw new StripeFulfillmentRejectedError('Stripe event user metadata does not match checkout attempt');
    }
    if (attempt.internalPriceKey !== input.internalPriceKey) {
        throw new StripeFulfillmentRejectedError('Stripe event price key does not match checkout attempt');
    }
    if (attempt.stripeCustomerId && input.stripeCustomerId && attempt.stripeCustomerId !== input.stripeCustomerId) {
        throw new StripeFulfillmentRejectedError('Stripe customer does not match checkout attempt');
    }
    if (
        attempt.stripeCheckoutSessionId
        && input.stripeCheckoutSessionId
        && attempt.stripeCheckoutSessionId !== input.stripeCheckoutSessionId
    ) {
        throw new StripeFulfillmentRejectedError('Stripe Checkout Session does not match checkout attempt');
    }

    return attempt;
}

async function assertPriceIdsMatch(input: {
    readonly observedPriceIds: readonly string[];
    readonly expected: ResolvedProductPrice;
}): Promise<void> {
    if (!input.observedPriceIds.includes(input.expected.stripePriceId)) {
        throw new StripeFulfillmentRejectedError('Stripe price does not match the internal server-owned price key');
    }
}

function extractSubscriptionPriceIds(subscription: Record<string, unknown>): readonly string[] {
    const items = asRecord(subscription.items);
    const data = Array.isArray(items.data) ? items.data : [];

    return data
        .map((item) => getObjectId(asRecord(asRecord(item).price)))
        .filter((priceId): priceId is string => Boolean(priceId));
}

function extractStripeStatus(status: string | null): StripeSubscriptionStatusInput {
    switch (status) {
        case 'active':
        case 'trialing':
        case 'past_due':
        case 'canceled':
        case 'unpaid':
        case 'incomplete':
        case 'incomplete_expired':
        case 'paused':
            return status;
        default:
            return 'incomplete';
    }
}

function getTierFromPriceKey(priceKey: ProductPriceKey): Exclude<ProductTier, 'free'> {
    return priceKey.includes('founder') ? 'founder' : 'pro';
}

async function processCheckoutSessionCompleted(
    event: Stripe.Event,
    deps: StripeFulfillmentDeps,
): Promise<StripeEventStatusInput> {
    const session = asRecord(event.data.object);
    const sessionId = getString(session.id);
    if (!sessionId) {
        throw new StripeFulfillmentRejectedError('Checkout Session event is missing an id');
    }
    if (session.mode !== 'subscription') {
        throw new StripeFulfillmentRejectedError('Checkout Session is not a subscription checkout');
    }

    const customerId = getObjectId(session.customer);
    const subscriptionId = getObjectId(session.subscription);
    if (!subscriptionId) {
        throw new StripeFulfillmentRejectedError('Checkout Session completed without a subscription id');
    }

    const identity = requireMetadataIdentity(session);
    const attempt = await requireValidatedAttempt({
        repository: deps.repository,
        checkoutAttemptId: identity.checkoutAttemptId,
        userId: identity.userId,
        internalPriceKey: identity.internalPriceKey,
        stripeCustomerId: customerId,
        stripeCheckoutSessionId: sessionId,
    });
    const expected = deps.resolvePrice({ priceKey: identity.internalPriceKey });
    const observedPriceIds = await deps.stripe.getCheckoutSessionLinePriceIds(sessionId);
    await assertPriceIdsMatch({ observedPriceIds, expected });

    await deps.repository.updateCheckoutAttemptFromFulfillment({
        attemptId: attempt.id,
        stripeCheckoutSessionId: sessionId,
        stripeCustomerId: customerId,
        stripeSubscriptionId: subscriptionId,
        status: 'completed_webhook_received',
        completedAt: deps.now(),
        metadata: {
            ...attempt.metadata,
            stripeSubscriptionId: subscriptionId,
            webhookEventId: event.id,
            note: 'Checkout completion is recorded; subscription access waits for subscription/invoice truth.',
        },
    });
    await deps.repository.recordAnalyticsEvent({
        userId: identity.userId,
        eventType: 'checkout.completed',
        priceKey: identity.internalPriceKey,
        metadata: {
            checkoutAttemptId: attempt.id,
            stripeCheckoutSessionId: sessionId,
        },
    });

    return {
        processedEventId: '',
        checkoutAttemptId: attempt.id,
        metadata: {
            action: 'checkout_completed_recorded_without_granting_pro',
            stripeSubscriptionId: subscriptionId,
        },
    };
}

async function processSubscriptionObject(
    event: Stripe.Event,
    deps: StripeFulfillmentDeps,
    subscriptionObject: unknown,
    statusOverride?: StripeSubscriptionStatusInput,
): Promise<StripeEventStatusInput> {
    const subscription = asRecord(subscriptionObject);
    const stripeSubscriptionId = getString(subscription.id);
    const stripeCustomerId = getObjectId(subscription.customer);
    if (!stripeSubscriptionId || !stripeCustomerId) {
        throw new StripeFulfillmentRejectedError('Subscription event is missing subscription or customer id');
    }

    const existing = await deps.repository.findSubscriptionByStripeSubscriptionId(stripeSubscriptionId);
    const metadata = getMetadata(subscription);
    const userId = getString(metadata.userId) ?? existing?.userId ?? null;
    const checkoutAttemptId = getString(metadata.checkoutAttemptId);
    const internalPriceKey = getString(metadata.internalPriceKey)
        ? requireProductPriceKey(getString(metadata.internalPriceKey))
        : existing?.internalPriceKey ?? null;

    if (!userId || !internalPriceKey) {
        throw new StripeFulfillmentRejectedError('Subscription event cannot be matched to a Sens PUBG user and price key');
    }

    let attempt: ProductCheckoutAttemptRow | null = null;
    if (checkoutAttemptId) {
        attempt = await requireValidatedAttempt({
            repository: deps.repository,
            checkoutAttemptId,
            userId,
            internalPriceKey,
            stripeCustomerId,
        });
    }

    const expected = deps.resolvePrice({ priceKey: internalPriceKey });
    const observedPriceIds = extractSubscriptionPriceIds(subscription);
    await assertPriceIdsMatch({ observedPriceIds, expected });

    const status = statusOverride ?? extractStripeStatus(getString(subscription.status));
    const currentPeriodEnd = stripeSecondsToDate(getNumber(subscription.current_period_end));
    const normalized = normalizeSubscriptionState({
        status,
        tier: getTierFromPriceKey(internalPriceKey),
        currentPeriodStart: stripeSecondsToDate(getNumber(subscription.current_period_start)),
        currentPeriodEnd,
        cancelAtPeriodEnd: getBoolean(subscription.cancel_at_period_end),
        previousCurrentPeriodEnd: existing?.currentPeriodEnd ?? null,
        previousAccessState: existing?.accessState ?? null,
        now: deps.now(),
    });

    if (!normalized.shouldApply) {
        return {
            processedEventId: '',
            checkoutAttemptId: attempt?.id ?? null,
            subscriptionId: existing?.id ?? null,
            metadata: {
                action: 'ignored_out_of_order_subscription_event',
                reason: normalized.reason,
            },
        };
    }

    const saved = await deps.repository.upsertSubscription({
        userId,
        stripeCustomerId,
        stripeSubscriptionId,
        internalPriceKey,
        tier: normalized.tier,
        billingStatus: normalized.billingStatus,
        accessState: normalized.accessState,
        currentPeriodStart: normalized.currentPeriodStart,
        currentPeriodEnd: normalized.currentPeriodEnd,
        cancelAtPeriodEnd: normalized.cancelAtPeriodEnd,
        canceledAt: normalized.accessState === 'canceled' ? deps.now() : null,
        graceEndsAt: normalized.graceEndsAt,
        suspendedAt: normalized.suspendedAt,
        suspensionReason: normalized.suspensionReason,
        metadata: {
            stripeEventId: event.id,
            sourceEventType: event.type,
            reason: normalized.reason,
            checkoutAttemptId: attempt?.id ?? checkoutAttemptId ?? null,
        },
    });

    await deps.repository.recordAnalyticsEvent({
        userId,
        eventType: normalized.accessState === 'past_due_grace'
            ? 'pro.grace_entered'
            : normalized.accessState === 'canceled' || normalized.accessState === 'past_due_blocked'
                ? 'pro.revoked'
                : 'pro.activated',
        priceKey: internalPriceKey,
        billingStatus: normalized.billingStatus,
        accessState: normalized.accessState,
        metadata: {
            stripeSubscriptionId,
            reason: normalized.reason,
        },
    });

    return {
        processedEventId: '',
        checkoutAttemptId: attempt?.id ?? null,
        subscriptionId: saved.id,
        metadata: {
            action: 'subscription_state_applied',
            accessState: normalized.accessState,
            billingStatus: normalized.billingStatus,
            reason: normalized.reason,
        },
    };
}

async function processInvoiceEvent(
    event: Stripe.Event,
    deps: StripeFulfillmentDeps,
    statusOverride?: StripeSubscriptionStatusInput,
): Promise<StripeEventStatusInput> {
    const invoice = asRecord(event.data.object);
    const stripeSubscriptionId = getObjectId(invoice.subscription)
        ?? getObjectId(asRecord(invoice.parent).subscription_details);
    if (!stripeSubscriptionId) {
        throw new StripeFulfillmentRejectedError('Invoice event is missing a subscription id');
    }

    const subscription = await deps.stripe.retrieveSubscription(stripeSubscriptionId);
    if (!subscription) {
        throw new StripeFulfillmentRejectedError('Unable to retrieve subscription for invoice event');
    }

    return processSubscriptionObject(event, deps, subscription, statusOverride);
}

async function processSuspensionEvent(
    event: Stripe.Event,
    deps: StripeFulfillmentDeps,
): Promise<StripeEventStatusInput> {
    const object = asRecord(event.data.object);
    const charge = asRecord(object.charge);
    const stripeCustomerId = getObjectId(object.customer) ?? getObjectId(charge.customer);
    const stripeSubscriptionId = getObjectId(object.subscription);
    const reason = event.type.includes('dispute') ? 'chargeback' : 'fraud';

    const subscription = await deps.repository.suspendSubscription({
        stripeCustomerId,
        stripeSubscriptionId,
        reason,
        metadata: {
            stripeEventId: event.id,
            sourceEventType: event.type,
        },
    });
    if (!subscription) {
        throw new StripeFulfillmentRejectedError('Fraud or dispute event could not be matched to a subscription');
    }

    await deps.repository.recordAnalyticsEvent({
        userId: subscription.userId,
        eventType: 'pro.revoked',
        priceKey: subscription.internalPriceKey,
        billingStatus: 'suspended',
        accessState: 'suspended',
        metadata: {
            reason,
            stripeEventId: event.id,
        },
    });

    return {
        processedEventId: '',
        subscriptionId: subscription.id,
        metadata: {
            action: 'subscription_suspended',
            reason,
        },
    };
}

async function processKnownEvent(
    event: Stripe.Event,
    deps: StripeFulfillmentDeps,
): Promise<StripeEventStatusInput> {
    switch (event.type) {
        case 'checkout.session.completed':
            return processCheckoutSessionCompleted(event, deps);
        case 'invoice.paid':
            return processInvoiceEvent(event, deps, 'active');
        case 'invoice.payment_failed':
            return processInvoiceEvent(event, deps, 'past_due');
        case 'customer.subscription.updated':
            return processSubscriptionObject(event, deps, event.data.object);
        case 'customer.subscription.deleted':
            return processSubscriptionObject(event, deps, event.data.object, 'canceled');
        case 'charge.dispute.created':
        case 'review.opened':
            return processSuspensionEvent(event, deps);
        default:
            return {
                processedEventId: '',
                metadata: {
                    action: 'ignored_supported_noop',
                    eventType: event.type,
                },
            };
    }
}

async function createDefaultFulfillmentDeps(): Promise<StripeFulfillmentDeps> {
    const { db } = await import('@/db');

    return {
        repository: createDrizzleStripeFulfillmentRepository(db),
        stripe: createStripeFulfillmentGateway(createStripeClient()),
        resolvePrice: resolveProductPrice,
        now: () => new Date(),
    };
}

export async function fulfillStripeEvent(
    event: Stripe.Event,
    deps?: StripeFulfillmentDeps,
): Promise<FulfillmentResult> {
    const fulfillmentDeps = deps ?? await createDefaultFulfillmentDeps();
    const received = await fulfillmentDeps.repository.recordStripeEventReceived({
        stripeEventId: event.id,
        eventType: event.type,
        livemode: event.livemode,
        payloadHash: hashEventPayload(event),
    });

    if (received.duplicate) {
        return {
            status: 'duplicate',
            stripeEventId: event.id,
            message: 'Stripe event already processed or recorded',
        };
    }

    try {
        const statusInput = await processKnownEvent(event, fulfillmentDeps);
        await fulfillmentDeps.repository.markStripeEventProcessed({
            ...statusInput,
            processedEventId: received.row.id,
        });
        await fulfillmentDeps.repository.recordBillingEvent({
            userId: null,
            eventType: 'webhook.processed',
            targetType: 'stripe_event',
            targetId: event.id,
            metadata: {
                eventType: event.type,
                ...statusInput.metadata,
            },
        });
        await fulfillmentDeps.repository.recordAnalyticsEvent({
            userId: null,
            eventType: 'webhook.processed',
            metadata: {
                stripeEventId: event.id,
                eventType: event.type,
            },
        });

        return {
            status: statusInput.metadata?.action === 'ignored_out_of_order_subscription_event' ? 'ignored' : 'processed',
            stripeEventId: event.id,
            message: 'Stripe event fulfilled',
        };
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Stripe event rejected';
        await fulfillmentDeps.repository.markStripeEventRejected({
            processedEventId: received.row.id,
            errorMessage: message,
            metadata: {
                eventType: event.type,
            },
        });
        await fulfillmentDeps.repository.recordBillingEvent({
            userId: null,
            eventType: 'webhook.rejected',
            targetType: 'stripe_event',
            targetId: event.id,
            severity: 'warning',
            metadata: {
                eventType: event.type,
                message,
            },
        });
        await fulfillmentDeps.repository.recordAnalyticsEvent({
            userId: null,
            eventType: 'webhook.rejected',
            metadata: {
                stripeEventId: event.id,
                eventType: event.type,
                message,
            },
        });

        if (error instanceof StripeFulfillmentRejectedError) {
            return {
                status: 'rejected',
                stripeEventId: event.id,
                message,
            };
        }

        throw error;
    }
}
