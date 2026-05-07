import type { Database } from '@/db';
import { monetizationAnalyticsEvents } from '@/db/schema';
import type {
    BillingStatus,
    MonetizationEventType,
    PremiumLockReason,
    ProductAccessState,
    ProductEntitlementKey,
    ProductPriceKey,
    ProductQuotaState,
    QuotaReasonCode,
} from '@/types/monetization';

const SAFE_METADATA_KEYS = new Set([
    'userId',
    'surface',
    'featureKey',
    'accessState',
    'quotaState',
    'priceKey',
    'billingStatus',
    'reasonCode',
    'cohortTag',
    'creatorCode',
    'eventSource',
    'stripeCustomerId',
    'stripeSubscriptionId',
    'stripeCheckoutSessionId',
    'checkoutAttemptId',
    'analysisSaveAttemptId',
    'quotaUsed',
    'quotaLimit',
    'tier',
    'source',
    'result',
    'route',
    'ctaId',
    'lockReason',
    'loopStage',
    'guidanceReason',
]);

const PROHIBITED_KEY_PATTERN = /video|frame|trajectory|filename|file_name|analysisPayload|fullResult|full_result|privateNote|note|card|cpf|document|address|bank/i;

export interface ProductAnalyticsRepository {
    readonly recordProductEvent: (input: SanitizedProductAnalyticsEvent) => Promise<void>;
}

export interface ProductAnalyticsEventInput {
    readonly userId?: string | null;
    readonly eventType: MonetizationEventType;
    readonly surface?: string | null;
    readonly featureKey?: ProductEntitlementKey | null;
    readonly accessState?: ProductAccessState | null;
    readonly quotaState?: ProductQuotaState | null;
    readonly priceKey?: ProductPriceKey | null;
    readonly billingStatus?: BillingStatus | null;
    readonly reasonCode?: QuotaReasonCode | null;
    readonly cohortTag?: string | null;
    readonly creatorCode?: string | null;
    readonly eventSource?: 'server' | 'webhook' | 'admin';
    readonly metadata?: Record<string, unknown>;
}

export interface SanitizedProductAnalyticsEvent {
    readonly userId: string | null;
    readonly eventType: MonetizationEventType;
    readonly surface: string | null;
    readonly featureKey: ProductEntitlementKey | null;
    readonly accessState: ProductAccessState | null;
    readonly quotaState: ProductQuotaState | null;
    readonly priceKey: ProductPriceKey | null;
    readonly billingStatus: BillingStatus | null;
    readonly reasonCode: QuotaReasonCode | null;
    readonly cohortTag: string | null;
    readonly creatorCode: string | null;
    readonly eventSource: 'server' | 'webhook' | 'admin';
    readonly metadata: Record<string, string | number | boolean | null>;
}

function isScalar(value: unknown): value is string | number | boolean | null {
    return value === null
        || typeof value === 'string'
        || typeof value === 'number'
        || typeof value === 'boolean';
}

function hasProhibitedShape(key: string, value: unknown): boolean {
    if (PROHIBITED_KEY_PATTERN.test(key)) {
        return true;
    }

    if (Array.isArray(value) || (typeof value === 'object' && value !== null)) {
        return true;
    }

    if (typeof value === 'string' && PROHIBITED_KEY_PATTERN.test(value)) {
        return true;
    }

    return false;
}

export function sanitizeProductAnalyticsMetadata(
    metadata: Record<string, unknown> = {},
): Record<string, string | number | boolean | null> {
    const sanitized: Record<string, string | number | boolean | null> = {};

    for (const [key, value] of Object.entries(metadata)) {
        if (!SAFE_METADATA_KEYS.has(key) || hasProhibitedShape(key, value) || !isScalar(value)) {
            continue;
        }

        sanitized[key] = value;
    }

    return sanitized;
}

export function sanitizeProductAnalyticsEvent(
    input: ProductAnalyticsEventInput,
): SanitizedProductAnalyticsEvent {
    return {
        userId: input.userId ?? null,
        eventType: input.eventType,
        surface: input.surface ?? null,
        featureKey: input.featureKey ?? null,
        accessState: input.accessState ?? null,
        quotaState: input.quotaState ?? null,
        priceKey: input.priceKey ?? null,
        billingStatus: input.billingStatus ?? null,
        reasonCode: input.reasonCode ?? null,
        cohortTag: input.cohortTag ?? null,
        creatorCode: input.creatorCode ?? null,
        eventSource: input.eventSource ?? 'server',
        metadata: sanitizeProductAnalyticsMetadata(input.metadata),
    };
}

export function createDrizzleProductAnalyticsRepository(database: Database): ProductAnalyticsRepository {
    return {
        async recordProductEvent(input) {
            await database.insert(monetizationAnalyticsEvents).values({
                userId: input.userId,
                eventType: input.eventType,
                surface: input.surface,
                featureKey: input.featureKey,
                accessState: input.accessState,
                quotaState: input.quotaState,
                priceKey: input.priceKey,
                billingStatus: input.billingStatus,
                reasonCode: input.reasonCode,
                cohortTag: input.cohortTag,
                creatorCode: input.creatorCode,
                eventSource: input.eventSource,
                metadata: input.metadata,
            });
        },
    };
}

export async function recordProductEvent(
    input: ProductAnalyticsEventInput,
    repository?: ProductAnalyticsRepository,
): Promise<void> {
    try {
        const resolvedRepository = repository ?? createDrizzleProductAnalyticsRepository(
            (await import('@/db')).db,
        );

        await resolvedRepository.recordProductEvent(sanitizeProductAnalyticsEvent(input));
    } catch (error) {
        console.error('[product-analytics] event dropped:', error);
    }
}

export function recordFirstUsableAnalysis(input: {
    readonly userId: string;
    readonly quotaState: ProductQuotaState;
    readonly accessState: ProductAccessState;
    readonly repository?: ProductAnalyticsRepository;
}): Promise<void> {
    return recordProductEvent({
        userId: input.userId,
        eventType: 'activation.first_usable_analysis',
        surface: 'analysis_save',
        accessState: input.accessState,
        quotaState: input.quotaState,
    }, input.repository);
}

export function recordUpgradeIntent(input: {
    readonly userId?: string | null;
    readonly surface: string;
    readonly featureKey?: ProductEntitlementKey | null;
    readonly accessState?: ProductAccessState | null;
    readonly reasonCode?: QuotaReasonCode | null;
    readonly repository?: ProductAnalyticsRepository;
}): Promise<void> {
    return recordProductEvent({
        userId: input.userId ?? null,
        eventType: input.reasonCode === 'limit_blocked'
            ? 'upgrade_intent.limit_hit'
            : 'upgrade_intent.premium_feature_attempted',
        surface: input.surface,
        featureKey: input.featureKey ?? null,
        accessState: input.accessState ?? null,
        reasonCode: input.reasonCode ?? null,
    }, input.repository);
}

export function recordQuotaEvent(input: {
    readonly userId: string;
    readonly eventType: Extract<MonetizationEventType, 'quota.consumed' | 'quota.warning' | 'quota.limit_hit' | 'quota.exhausted'>;
    readonly quotaState: ProductQuotaState;
    readonly reasonCode?: QuotaReasonCode | null;
    readonly quotaUsed: number;
    readonly quotaLimit: number;
    readonly repository?: ProductAnalyticsRepository;
}): Promise<void> {
    return recordProductEvent({
        userId: input.userId,
        eventType: input.eventType,
        surface: 'analysis_save',
        quotaState: input.quotaState,
        reasonCode: input.reasonCode ?? null,
        metadata: {
            quotaUsed: input.quotaUsed,
            quotaLimit: input.quotaLimit,
        },
    }, input.repository);
}

export function recordCheckoutEvent(input: {
    readonly userId?: string | null;
    readonly eventType: Extract<MonetizationEventType, 'checkout.started' | 'checkout.created' | 'checkout.blocked' | 'checkout.failed'>;
    readonly priceKey?: ProductPriceKey | null;
    readonly checkoutAttemptId?: string | null;
    readonly stripeCheckoutSessionId?: string | null;
    readonly repository?: ProductAnalyticsRepository;
}): Promise<void> {
    return recordProductEvent({
        userId: input.userId ?? null,
        eventType: input.eventType,
        surface: 'checkout',
        priceKey: input.priceKey ?? null,
        metadata: {
            checkoutAttemptId: input.checkoutAttemptId ?? null,
            stripeCheckoutSessionId: input.stripeCheckoutSessionId ?? null,
        },
    }, input.repository);
}

export function recordProLifecycleEvent(input: {
    readonly userId?: string | null;
    readonly eventType: Extract<MonetizationEventType, 'pro.activated' | 'pro.payment_failed' | 'pro.grace_entered' | 'pro.revoked' | 'pro.canceled' | 'pro.suspended'>;
    readonly priceKey?: ProductPriceKey | null;
    readonly billingStatus?: BillingStatus | null;
    readonly accessState?: ProductAccessState | null;
    readonly stripeSubscriptionId?: string | null;
    readonly repository?: ProductAnalyticsRepository;
}): Promise<void> {
    return recordProductEvent({
        userId: input.userId ?? null,
        eventType: input.eventType,
        surface: 'billing_lifecycle',
        priceKey: input.priceKey ?? null,
        billingStatus: input.billingStatus ?? null,
        accessState: input.accessState ?? null,
        eventSource: 'webhook',
        metadata: {
            stripeSubscriptionId: input.stripeSubscriptionId ?? null,
        },
    }, input.repository);
}

export function recordPaidRouteClick(input: {
    readonly userId?: string | null;
    readonly surface: 'mobile_nav' | 'desktop_nav' | 'pricing' | 'billing';
    readonly route: '/pricing' | '/billing';
    readonly accessState?: ProductAccessState | null;
    readonly repository?: ProductAnalyticsRepository;
}): Promise<void> {
    return recordProductEvent({
        userId: input.userId ?? null,
        eventType: 'paywall.viewed',
        surface: 'paid_route',
        accessState: input.accessState ?? null,
        metadata: {
            source: input.surface,
            route: input.route,
        },
    }, input.repository);
}

export function recordPricingPlanSelected(input: {
    readonly userId?: string | null;
    readonly priceKey: ProductPriceKey;
    readonly ctaId: 'founder_checkout' | 'public_checkout' | 'free_analysis';
    readonly repository?: ProductAnalyticsRepository;
}): Promise<void> {
    return recordProductEvent({
        userId: input.userId ?? null,
        eventType: 'upgrade_intent.checkout_requested',
        surface: 'pricing_plan',
        priceKey: input.priceKey,
        metadata: {
            ctaId: input.ctaId,
        },
    }, input.repository);
}

export function recordPremiumLockViewed(input: {
    readonly userId?: string | null;
    readonly surface: 'analysis_result' | 'history' | 'dashboard';
    readonly featureKey: ProductEntitlementKey;
    readonly accessState?: ProductAccessState | null;
    readonly lockReason: PremiumLockReason;
    readonly repository?: ProductAnalyticsRepository;
}): Promise<void> {
    return recordProductEvent({
        userId: input.userId ?? null,
        eventType: 'premium.lock_viewed',
        surface: input.surface,
        featureKey: input.featureKey,
        accessState: input.accessState ?? null,
        metadata: {
            lockReason: input.lockReason,
        },
    }, input.repository);
}

export function recordLoopRailCtaClicked(input: {
    readonly userId?: string | null;
    readonly surface: 'pricing' | 'dashboard' | 'history' | 'analysis_result';
    readonly loopStage: 'clip' | 'evidence' | 'coach' | 'block' | 'outcome' | 'validation' | 'checkpoint';
    readonly ctaId: string;
    readonly repository?: ProductAnalyticsRepository;
}): Promise<void> {
    return recordProductEvent({
        userId: input.userId ?? null,
        eventType: 'pro.feature_value',
        surface: input.surface,
        metadata: {
            loopStage: input.loopStage,
            ctaId: input.ctaId,
        },
    }, input.repository);
}

export function recordBillingPortalOpened(input: {
    readonly userId?: string | null;
    readonly billingStatus?: BillingStatus | null;
    readonly accessState?: ProductAccessState | null;
    readonly repository?: ProductAnalyticsRepository;
}): Promise<void> {
    return recordProductEvent({
        userId: input.userId ?? null,
        eventType: 'billing.portal_opened',
        surface: 'billing_portal',
        billingStatus: input.billingStatus ?? null,
        accessState: input.accessState ?? null,
    }, input.repository);
}

export function recordUploadGuidanceCorrection(input: {
    readonly userId?: string | null;
    readonly guidanceReason: 'metadata_missing' | 'weak_capture' | 'weapon_support' | 'quota_state';
    readonly accessState?: ProductAccessState | null;
    readonly repository?: ProductAnalyticsRepository;
}): Promise<void> {
    return recordProductEvent({
        userId: input.userId ?? null,
        eventType: 'pro.feature_value',
        surface: 'upload_guidance',
        accessState: input.accessState ?? null,
        metadata: {
            guidanceReason: input.guidanceReason,
        },
    }, input.repository);
}
