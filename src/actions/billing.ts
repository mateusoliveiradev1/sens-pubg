import { randomUUID } from 'node:crypto';

import { desc, eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import Stripe from 'stripe';
import { z } from 'zod';

import type { Database } from '@/db';
import {
    monetizationAnalyticsEvents,
    monetizationFlags,
    productBillingEvents,
    productCheckoutAttempts,
    productSubscriptions,
    type ProductCheckoutAttemptRow,
} from '@/db/schema';
import {
    checkBillingActionRateLimit,
    type CheckBillingActionRateLimitInput,
} from '@/lib/rate-limit';
import {
    createStripeClient,
    type StripeClient,
} from '@/lib/stripe';
import {
    resolveMonetizationFlags,
    type ResolvedMonetizationFlags,
} from '@/lib/monetization-flags';
import {
    resolveProductPrice,
    type ResolvedProductPrice,
} from '@/lib/product-price-catalog';
import type {
    MonetizationEventType,
    ProductPriceKey,
} from '@/types/monetization';

const checkoutIntentValues = [
    'founder_brl_monthly',
    'founder_usd_monthly',
    'public_brl_monthly',
    'public_usd_monthly',
] as const;

const checkoutInputSchema = z.object({
    intent: z.enum(checkoutIntentValues),
    clientId: z.string().min(1).max(256).optional(),
}).strict();

export type StartProCheckoutInput = z.infer<typeof checkoutInputSchema>;

export interface StartProCheckoutResult {
    readonly checkoutAttemptId: string;
    readonly checkoutSessionId: string;
    readonly checkoutUrl: string;
    readonly accessState: 'checkout_pending';
}

export interface OpenBillingPortalInput {
    readonly clientId?: string;
}

export interface OpenBillingPortalResult {
    readonly portalUrl: string;
}

interface AuthSession {
    readonly user?: {
        readonly id?: string | null;
        readonly email?: string | null;
    } | null;
}

export interface CheckoutAttemptCreateInput {
    readonly id: string;
    readonly userId: string;
    readonly internalPriceKey: ProductPriceKey;
    readonly idempotencyKey: string;
    readonly environment: string;
    readonly metadata: Record<string, unknown>;
}

export interface CheckoutAttemptSessionUpdateInput {
    readonly attemptId: string;
    readonly stripeCheckoutSessionId: string;
    readonly stripeCustomerId: string | null;
    readonly status: string;
    readonly expiresAt: Date | null;
    readonly metadata: Record<string, unknown>;
}

export interface BillingEventInput {
    readonly userId?: string | null;
    readonly eventType: string;
    readonly targetType: string;
    readonly targetId?: string | null;
    readonly severity?: 'info' | 'warning' | 'error';
    readonly metadata?: Record<string, unknown>;
}

export interface MonetizationAnalyticsEventInput {
    readonly userId?: string | null;
    readonly eventType: MonetizationEventType;
    readonly priceKey?: ProductPriceKey | null;
    readonly metadata?: Record<string, unknown>;
}

export interface BillingRepository {
    readonly loadFlags: () => Promise<ResolvedMonetizationFlags>;
    readonly findReusableCheckoutAttempt: (input: {
        readonly userId: string;
        readonly internalPriceKey: ProductPriceKey;
    }) => Promise<ProductCheckoutAttemptRow | null>;
    readonly createCheckoutAttempt: (input: CheckoutAttemptCreateInput) => Promise<ProductCheckoutAttemptRow>;
    readonly updateCheckoutAttemptWithSession: (input: CheckoutAttemptSessionUpdateInput) => Promise<void>;
    readonly findTrustedStripeCustomerIdForUser: (userId: string) => Promise<string | null>;
    readonly recordBillingEvent: (input: BillingEventInput) => Promise<void>;
    readonly recordAnalyticsEvent: (input: MonetizationAnalyticsEventInput) => Promise<void>;
}

export interface BillingStripeGateway {
    readonly createCheckoutSession: (
        params: Stripe.Checkout.SessionCreateParams,
        options: Stripe.RequestOptions,
    ) => Promise<Stripe.Checkout.Session>;
    readonly createPortalSession: (
        params: Stripe.BillingPortal.SessionCreateParams,
    ) => Promise<Stripe.BillingPortal.Session>;
}

export interface StartProCheckoutDeps {
    readonly getSession: () => Promise<AuthSession | null>;
    readonly repository: BillingRepository;
    readonly stripe: BillingStripeGateway;
    readonly resolvePrice: typeof resolveProductPrice;
    readonly rateLimit: (input: CheckBillingActionRateLimitInput) => ReturnType<typeof checkBillingActionRateLimit>;
    readonly createId: () => string;
    readonly getAppUrl: () => string;
}

export interface OpenBillingPortalDeps {
    readonly getSession: () => Promise<AuthSession | null>;
    readonly repository: Pick<BillingRepository, 'loadFlags' | 'findTrustedStripeCustomerIdForUser' | 'recordBillingEvent' | 'recordAnalyticsEvent'>;
    readonly stripe: Pick<BillingStripeGateway, 'createPortalSession'>;
    readonly rateLimit: (input: CheckBillingActionRateLimitInput) => ReturnType<typeof checkBillingActionRateLimit>;
    readonly getAppUrl: () => string;
}

function getAppUrl(): string {
    return process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
}

function checkoutIntentToPriceKey(intent: StartProCheckoutInput['intent']): ProductPriceKey {
    switch (intent) {
        case 'founder_brl_monthly':
            return 'pro_founder_brl_monthly';
        case 'founder_usd_monthly':
            return 'pro_founder_usd_monthly';
        case 'public_brl_monthly':
            return 'pro_public_brl_monthly';
        case 'public_usd_monthly':
            return 'pro_public_usd_monthly';
    }
}

function requireAuthenticatedUser(session: AuthSession | null): { id: string; email: string | null } {
    const userId = session?.user?.id?.trim();
    if (!userId) {
        throw new Error('Unauthorized: billing actions require an authenticated user');
    }

    return {
        id: userId,
        email: session?.user?.email ?? null,
    };
}

function assertCheckoutFlags(flags: ResolvedMonetizationFlags, price: ResolvedProductPrice): void {
    if (!flags.checkoutEnabled) {
        throw new Error('Stripe Checkout is disabled for this environment');
    }

    if (price.founder && !flags.founderPricingEnabled) {
        throw new Error('Founder checkout is disabled for this user or environment');
    }

    if (!price.founder && !flags.publicPricingEnabled) {
        throw new Error('Public checkout is not enabled yet');
    }
}

function normalizeStripeId(value: string | { id?: string } | null): string | null {
    if (typeof value === 'string') {
        return value;
    }

    return value?.id ?? null;
}

function metadataStringRecord(metadata: Record<string, string>): Record<string, string> {
    return metadata;
}

function getSessionUrlFromAttempt(attempt: ProductCheckoutAttemptRow): string | null {
    const metadata = attempt.metadata as Record<string, unknown>;
    const sessionUrl = metadata.sessionUrl;

    return typeof sessionUrl === 'string' && sessionUrl.startsWith('http')
        ? sessionUrl
        : null;
}

function createStripeGateway(stripe: StripeClient): BillingStripeGateway {
    return {
        createCheckoutSession(params, options) {
            return stripe.checkout.sessions.create(params, options);
        },
        createPortalSession(params) {
            return stripe.billingPortal.sessions.create(params);
        },
    };
}

function createDrizzleBillingRepository(database: Database): BillingRepository {
    return {
        async loadFlags() {
            const rows = await database.select({
                key: monetizationFlags.key,
                enabled: monetizationFlags.enabled,
            }).from(monetizationFlags);

            return resolveMonetizationFlags({
                environment: process.env.NODE_ENV === 'production'
                    ? 'production'
                    : process.env.NODE_ENV === 'test'
                        ? 'test'
                        : 'development',
                overrides: rows.map((row) => ({
                    key: row.key,
                    enabled: row.enabled,
                    source: 'db',
                })),
            });
        },
        async findReusableCheckoutAttempt(input) {
            const rows = await database.select()
                .from(productCheckoutAttempts)
                .where(eq(productCheckoutAttempts.userId, input.userId))
                .orderBy(desc(productCheckoutAttempts.createdAt))
                .limit(10);

            return rows.find((row) => (
                row.internalPriceKey === input.internalPriceKey
                && (row.status === 'created' || row.status === 'stripe_session_created')
            )) ?? null;
        },
        async createCheckoutAttempt(input) {
            const [attempt] = await database.insert(productCheckoutAttempts).values({
                id: input.id,
                userId: input.userId,
                internalPriceKey: input.internalPriceKey,
                idempotencyKey: input.idempotencyKey,
                environment: input.environment,
                metadata: input.metadata,
                status: 'created',
            }).returning();

            if (!attempt) {
                throw new Error('Failed to create checkout attempt');
            }

            return attempt;
        },
        async updateCheckoutAttemptWithSession(input) {
            await database.update(productCheckoutAttempts)
                .set({
                    stripeCheckoutSessionId: input.stripeCheckoutSessionId,
                    stripeCustomerId: input.stripeCustomerId,
                    status: input.status,
                    expiresAt: input.expiresAt,
                    metadata: input.metadata,
                    updatedAt: new Date(),
                })
                .where(eq(productCheckoutAttempts.id, input.attemptId));
        },
        async findTrustedStripeCustomerIdForUser(userId) {
            const rows = await database.select({
                stripeCustomerId: productSubscriptions.stripeCustomerId,
            })
                .from(productSubscriptions)
                .where(eq(productSubscriptions.userId, userId))
                .orderBy(desc(productSubscriptions.updatedAt))
                .limit(1);

            return rows[0]?.stripeCustomerId ?? null;
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
                metadata: input.metadata ?? {},
                eventSource: 'server',
            });
        },
    };
}

async function createBillingActionDeps(): Promise<StartProCheckoutDeps & OpenBillingPortalDeps> {
    const [{ auth }, { db }] = await Promise.all([
        import('@/auth'),
        import('@/db'),
    ]);
    const stripe = createStripeGateway(createStripeClient());
    const repository = createDrizzleBillingRepository(db);

    return {
        getSession: auth,
        repository,
        stripe,
        resolvePrice: resolveProductPrice,
        rateLimit: checkBillingActionRateLimit,
        createId: randomUUID,
        getAppUrl,
    };
}

export function createStartProCheckoutHandler(deps: StartProCheckoutDeps) {
    return async function startProCheckoutWithDeps(input: unknown): Promise<StartProCheckoutResult> {
        const parsed = checkoutInputSchema.parse(input);
        const session = await deps.getSession();
        const user = requireAuthenticatedUser(session);
        const priceKey = checkoutIntentToPriceKey(parsed.intent);
        const price = deps.resolvePrice({ priceKey });
        const flags = await deps.repository.loadFlags();

        assertCheckoutFlags(flags, price);

        const rateLimitInput: CheckBillingActionRateLimitInput = parsed.clientId
            ? {
                action: 'billing.checkout.start',
                userId: user.id,
                clientId: parsed.clientId,
            }
            : {
                action: 'billing.checkout.start',
                userId: user.id,
            };

        const rateLimitResult = deps.rateLimit(rateLimitInput);
        if (!rateLimitResult.success) {
            throw new Error(`Checkout rate limit exceeded. Try again in ${rateLimitResult.resetMs}ms.`);
        }

        const reusableAttempt = await deps.repository.findReusableCheckoutAttempt({
            userId: user.id,
            internalPriceKey: price.key,
        });
        const existingUrl = reusableAttempt ? getSessionUrlFromAttempt(reusableAttempt) : null;
        if (reusableAttempt?.stripeCheckoutSessionId && existingUrl) {
            return {
                checkoutAttemptId: reusableAttempt.id,
                checkoutSessionId: reusableAttempt.stripeCheckoutSessionId,
                checkoutUrl: existingUrl,
                accessState: 'checkout_pending',
            };
        }

        const attemptId = reusableAttempt?.id ?? deps.createId();
        const idempotencyKey = reusableAttempt?.idempotencyKey ?? `stripe-checkout:${attemptId}`;
        const attempt = reusableAttempt ?? await deps.repository.createCheckoutAttempt({
            id: attemptId,
            userId: user.id,
            internalPriceKey: price.key,
            idempotencyKey,
            environment: price.environment,
            metadata: {
                intent: parsed.intent,
                source: 'startProCheckout',
            },
        });

        const appUrl = deps.getAppUrl();
        const trustedCustomerId = await deps.repository.findTrustedStripeCustomerIdForUser(user.id);
        const checkoutMetadata = metadataStringRecord({
            userId: user.id,
            checkoutAttemptId: attempt.id,
            internalPriceKey: price.key,
        });
        const sessionCreateParams: Stripe.Checkout.SessionCreateParams = {
            mode: 'subscription',
            line_items: [
                {
                    price: price.stripePriceId,
                    quantity: 1,
                },
            ],
            client_reference_id: user.id,
            metadata: checkoutMetadata,
            subscription_data: {
                metadata: checkoutMetadata,
            },
            success_url: `${appUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${appUrl}/checkout/cancel`,
            billing_address_collection: 'auto',
            allow_promotion_codes: false,
        };

        if (trustedCustomerId) {
            sessionCreateParams.customer = trustedCustomerId;
        } else if (user.email) {
            sessionCreateParams.customer_email = user.email;
        }

        const checkoutSession = await deps.stripe.createCheckoutSession(
            sessionCreateParams,
            { idempotencyKey: attempt.idempotencyKey },
        );
        const checkoutUrl = checkoutSession.url;
        if (!checkoutUrl) {
            throw new Error('Stripe did not return a Checkout URL');
        }

        const stripeCustomerId = normalizeStripeId(checkoutSession.customer);
        await deps.repository.updateCheckoutAttemptWithSession({
            attemptId: attempt.id,
            stripeCheckoutSessionId: checkoutSession.id,
            stripeCustomerId,
            status: 'stripe_session_created',
            expiresAt: typeof checkoutSession.expires_at === 'number'
                ? new Date(checkoutSession.expires_at * 1000)
                : null,
            metadata: {
                ...attempt.metadata,
                sessionUrl: checkoutUrl,
                stripePriceId: price.stripePriceId,
            },
        });
        await deps.repository.recordBillingEvent({
            userId: user.id,
            eventType: 'checkout.created',
            targetType: 'checkout_attempt',
            targetId: attempt.id,
            metadata: {
                internalPriceKey: price.key,
                stripeCheckoutSessionId: checkoutSession.id,
            },
        });
        await deps.repository.recordAnalyticsEvent({
            userId: user.id,
            eventType: 'checkout.started',
            priceKey: price.key,
            metadata: {
                checkoutAttemptId: attempt.id,
            },
        });

        return {
            checkoutAttemptId: attempt.id,
            checkoutSessionId: checkoutSession.id,
            checkoutUrl,
            accessState: 'checkout_pending',
        };
    };
}

export function createOpenBillingPortalHandler(deps: OpenBillingPortalDeps) {
    return async function openBillingPortalWithDeps(input: OpenBillingPortalInput = {}): Promise<OpenBillingPortalResult> {
        const session = await deps.getSession();
        const user = requireAuthenticatedUser(session);
        const flags = await deps.repository.loadFlags();

        if (!flags.billingPortalEnabled) {
            throw new Error('Billing Portal is disabled for this environment');
        }

        const rateLimitInput: CheckBillingActionRateLimitInput = input.clientId
            ? {
                action: 'billing.portal.open',
                userId: user.id,
                clientId: input.clientId,
            }
            : {
                action: 'billing.portal.open',
                userId: user.id,
            };

        const rateLimitResult = deps.rateLimit(rateLimitInput);
        if (!rateLimitResult.success) {
            throw new Error(`Billing Portal rate limit exceeded. Try again in ${rateLimitResult.resetMs}ms.`);
        }

        const stripeCustomerId = await deps.repository.findTrustedStripeCustomerIdForUser(user.id);
        if (!stripeCustomerId) {
            throw new Error('No trusted Stripe customer is available for this user');
        }

        const appUrl = deps.getAppUrl();
        const portalSession = await deps.stripe.createPortalSession({
            customer: stripeCustomerId,
            return_url: `${appUrl}/billing`,
        });

        await deps.repository.recordBillingEvent({
            userId: user.id,
            eventType: 'billing.portal_opened',
            targetType: 'stripe_customer',
            targetId: stripeCustomerId,
        });
        await deps.repository.recordAnalyticsEvent({
            userId: user.id,
            eventType: 'billing.portal_opened',
            metadata: {
                stripeCustomerId,
            },
        });

        return {
            portalUrl: portalSession.url,
        };
    };
}

export async function startProCheckout(input: unknown): Promise<StartProCheckoutResult> {
    'use server';
    const result = await createStartProCheckoutHandler(await createBillingActionDeps())(input);
    revalidatePath('/billing');
    return result;
}

export async function openBillingPortal(input: OpenBillingPortalInput = {}): Promise<OpenBillingPortalResult> {
    'use server';
    return createOpenBillingPortalHandler(await createBillingActionDeps())(input);
}
