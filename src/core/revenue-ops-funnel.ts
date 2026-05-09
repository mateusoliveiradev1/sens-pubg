import type {
    BillingStatus,
    MonetizationEventType,
    ProductAccessState,
    ProductQuotaState,
    QuotaReasonCode,
} from '@/types/monetization';
import {
    findUnsafeRevenueOpsFields,
    revenueOpsDetailReasonValues,
    sanitizeRevenueOpsRecord,
    type RevenueOpsMetricCard,
    type RevenueOpsOperationalStatus,
    type RevenueOpsPrivacyPosture,
} from '@/types/revenue-ops';

const UPGRADE_INTENT_EVENT_TYPES = new Set<string>([
    'upgrade_intent.limit_hit',
    'upgrade_intent.premium_feature_attempted',
    'upgrade_intent.checkout_requested',
]);

const PASSIVE_IMPRESSION_EVENT_TYPES = new Set<string>([
    'premium.lock_viewed',
    'paywall.viewed',
    'social_pro.passive_impression',
    'feed.passive_impression',
    'lock.impression',
]);

const CHECKOUT_STARTED_EVENT_TYPES = new Set<string>([
    'checkout.started',
    'checkout.created',
]);

const CHECKOUT_CONFIRMED_EVENT_TYPES = new Set<string>([
    'checkout.confirmed',
    'checkout.completed',
]);

const PRO_VALUE_EVENT_TYPES = new Set<string>([
    'pro.feature_value',
    'billing.portal_opened',
]);

export interface RevenueOpsAnalyticsEventLike {
    readonly id?: string | null;
    readonly userId?: string | null;
    readonly eventType: MonetizationEventType | string;
    readonly surface?: string | null;
    readonly accessState?: ProductAccessState | string | null;
    readonly quotaState?: ProductQuotaState | string | null;
    readonly billingStatus?: BillingStatus | string | null;
    readonly reasonCode?: QuotaReasonCode | string | null;
    readonly metadata?: Record<string, unknown> | null;
    readonly createdAt?: Date | string | null;
}

export interface RevenueOpsCheckoutAttemptLike {
    readonly id?: string | null;
    readonly userId?: string | null;
    readonly status: string;
    readonly internalPriceKey?: string | null;
    readonly stripeCheckoutSessionId?: string | null;
    readonly metadata?: Record<string, unknown> | null;
    readonly createdAt?: Date | string | null;
    readonly completedAt?: Date | string | null;
}

export interface RevenueOpsSubscriptionLike {
    readonly id?: string | null;
    readonly userId?: string | null;
    readonly billingStatus: BillingStatus | string;
    readonly accessState: ProductAccessState | string;
    readonly tier?: string | null;
    readonly cancelAtPeriodEnd?: boolean | null;
    readonly currentPeriodEnd?: Date | string | null;
}

export interface RevenueOpsQuotaEntryLike {
    readonly id?: string | null;
    readonly userId?: string | null;
    readonly state: ProductQuotaState | string;
    readonly reasonCode: QuotaReasonCode | string;
    readonly amount?: number | null;
    readonly createdAt?: Date | string | null;
}

export interface BuildRevenueOpsFunnelInput {
    readonly events?: readonly RevenueOpsAnalyticsEventLike[];
    readonly checkoutAttempts?: readonly RevenueOpsCheckoutAttemptLike[];
    readonly subscriptions?: readonly RevenueOpsSubscriptionLike[];
    readonly quotaEntries?: readonly RevenueOpsQuotaEntryLike[];
}

export interface RevenueOpsFunnelSnapshot {
    readonly generatedAt: string;
    readonly metrics: readonly RevenueOpsMetricCard[];
    readonly conversion: {
        readonly checkoutStartedToConfirmedRate: number | null;
        readonly upgradeIntentToCheckoutRate: number | null;
    };
    readonly breakdowns: {
        readonly ignoredPassiveImpressions: number;
        readonly churnStates: Record<string, number>;
        readonly quotaStates: Record<string, number>;
    };
    readonly privacy: RevenueOpsPrivacyPosture;
}

function countBy<T>(items: readonly T[], predicate: (item: T) => boolean): number {
    return items.filter(predicate).length;
}

function incrementCounter(counter: Record<string, number>, key: string | null | undefined): void {
    const normalized = key && key.trim().length > 0 ? key : 'unknown';

    counter[normalized] = (counter[normalized] ?? 0) + 1;
}

function rate(numerator: number, denominator: number): number | null {
    if (denominator <= 0) {
        return null;
    }

    return Number((numerator / denominator).toFixed(4));
}

function statusForCount(count: number): RevenueOpsOperationalStatus {
    return count > 0 ? 'PASS' : 'WARN';
}

function metric(input: {
    readonly key: RevenueOpsMetricCard['key'];
    readonly label: string;
    readonly count: number;
    readonly detail: string;
    readonly status?: RevenueOpsOperationalStatus;
    readonly rate?: number | null;
    readonly reasonCodes?: readonly string[];
}): RevenueOpsMetricCard {
    return {
        key: input.key,
        label: input.label,
        count: input.count,
        status: input.status ?? statusForCount(input.count),
        detail: input.detail,
        ...(input.rate !== undefined ? { rate: input.rate } : {}),
        ...(input.reasonCodes ? { reasonCodes: input.reasonCodes } : {}),
    };
}

function isCheckoutStartedAttempt(attempt: RevenueOpsCheckoutAttemptLike): boolean {
    return ['created', 'started', 'open', 'pending'].includes(attempt.status);
}

function isCheckoutConfirmedAttempt(attempt: RevenueOpsCheckoutAttemptLike): boolean {
    return ['completed', 'confirmed', 'fulfilled'].includes(attempt.status) || attempt.completedAt != null;
}

function isActiveSubscription(subscription: RevenueOpsSubscriptionLike): boolean {
    return (
        subscription.billingStatus === 'active'
        || subscription.billingStatus === 'trialing'
        || subscription.accessState === 'pro_active'
        || subscription.accessState === 'founder_active'
        || subscription.accessState === 'manual_grant_active'
        || subscription.accessState === 'canceling'
    );
}

function isChurnSubscription(subscription: RevenueOpsSubscriptionLike): boolean {
    return (
        subscription.billingStatus === 'canceled'
        || subscription.billingStatus === 'unpaid'
        || subscription.billingStatus === 'past_due'
        || subscription.billingStatus === 'suspended'
        || subscription.accessState === 'canceled'
        || subscription.accessState === 'past_due_blocked'
        || subscription.accessState === 'suspended'
        || subscription.cancelAtPeriodEnd === true
    );
}

function isQuotaLimitEntry(entry: RevenueOpsQuotaEntryLike): boolean {
    return (
        entry.reasonCode === 'limit_blocked'
        || entry.reasonCode === 'entitlement_blocked'
        || entry.reasonCode === 'safe_mode_paused'
        || entry.state === 'limit_reached'
        || entry.state === 'blocked'
        || entry.state === 'paused'
    );
}

function privacyPosture(input: BuildRevenueOpsFunnelInput): RevenueOpsPrivacyPosture {
    return {
        defaultMode: 'aggregate_only',
        userDetailRequiresReason: true,
        allowedDetailReasons: revenueOpsDetailReasonValues,
        prohibitedInputFieldCount: findUnsafeRevenueOpsFields(input).length,
        prohibitedFieldLabels: [
            'raw video',
            'frame data',
            'trajectory data',
            'raw analysis payload',
            'private notes',
            'private links/readers',
            'private collection contents',
            'payment cards',
            'addresses',
            'bank data',
            'private financial metadata',
        ],
    };
}

export function buildRevenueOpsFunnelSnapshot(input: BuildRevenueOpsFunnelInput = {}): RevenueOpsFunnelSnapshot {
    const sanitized = sanitizeRevenueOpsRecord(input) as BuildRevenueOpsFunnelInput;
    const events = sanitized.events ?? [];
    const checkoutAttempts = sanitized.checkoutAttempts ?? [];
    const subscriptions = sanitized.subscriptions ?? [];
    const quotaEntries = sanitized.quotaEntries ?? [];

    const firstUsableAnalysis = countBy(events, (event) => event.eventType === 'activation.first_usable_analysis');
    const upgradeIntent = countBy(events, (event) => UPGRADE_INTENT_EVENT_TYPES.has(event.eventType));
    const ignoredPassiveImpressions = countBy(events, (event) => PASSIVE_IMPRESSION_EVENT_TYPES.has(event.eventType));
    const checkoutStarted = countBy(events, (event) => CHECKOUT_STARTED_EVENT_TYPES.has(event.eventType))
        + countBy(checkoutAttempts, isCheckoutStartedAttempt);
    const checkoutConfirmed = countBy(events, (event) => CHECKOUT_CONFIRMED_EVENT_TYPES.has(event.eventType))
        + countBy(checkoutAttempts, isCheckoutConfirmedAttempt);
    const proActive = countBy(subscriptions, isActiveSubscription)
        + countBy(events, (event) => event.eventType === 'pro.activated');
    const churnCancellation = countBy(events, (event) => (
        event.eventType === 'pro.canceled'
        || event.eventType === 'pro.revoked'
        || event.eventType === 'pro.payment_failed'
        || event.eventType === 'pro.suspended'
    )) + countBy(subscriptions, isChurnSubscription);
    const quotaLimitHit = countBy(events, (event) => (
        event.eventType === 'quota.limit_hit'
        || event.eventType === 'quota.exhausted'
    )) + countBy(quotaEntries, isQuotaLimitEntry);
    const proValueUsage = countBy(events, (event) => PRO_VALUE_EVENT_TYPES.has(event.eventType));
    const churnStates: Record<string, number> = {};
    const quotaStates: Record<string, number> = {};

    for (const subscription of subscriptions.filter(isChurnSubscription)) {
        incrementCounter(churnStates, String(subscription.accessState || subscription.billingStatus));
    }

    for (const entry of quotaEntries.filter(isQuotaLimitEntry)) {
        incrementCounter(quotaStates, String(entry.reasonCode || entry.state));
    }

    const snapshot: RevenueOpsFunnelSnapshot = {
        generatedAt: new Date().toISOString(),
        metrics: [
            metric({
                key: 'first_usable_analysis',
                label: 'First usable analysis',
                count: firstUsableAnalysis,
                detail: 'Activation is counted only after a usable analysis completes.',
            }),
            metric({
                key: 'upgrade_intent',
                label: 'Upgrade intent',
                count: upgradeIntent,
                detail: 'Only limit hits, premium feature attempts, and checkout requests count as intent.',
                reasonCodes: ['limit_hit', 'premium_feature_attempted', 'checkout_requested'],
            }),
            metric({
                key: 'checkout_started',
                label: 'Checkout started',
                count: checkoutStarted,
                detail: 'Checkout starts derive from server checkout attempts or checkout events.',
            }),
            metric({
                key: 'checkout_confirmed',
                label: 'Checkout confirmed',
                count: checkoutConfirmed,
                detail: 'Confirmation derives from webhook/subscription truth, not success URLs or client state.',
                rate: rate(checkoutConfirmed, checkoutStarted),
            }),
            metric({
                key: 'pro_active',
                label: 'Pro active',
                count: proActive,
                detail: 'Active Pro uses subscription, founder, or manual-grant access truth.',
            }),
            metric({
                key: 'churn_cancellation',
                label: 'Churn / cancellation',
                count: churnCancellation,
                status: churnCancellation > 0 ? 'WARN' : 'PASS',
                detail: 'Cancellation and payment-risk states are separated from active Pro access.',
                reasonCodes: Object.keys(churnStates),
            }),
            metric({
                key: 'quota_limit_hit',
                label: 'Quota limit hit',
                count: quotaLimitHit,
                status: quotaLimitHit > 0 ? 'WARN' : 'PASS',
                detail: 'Usage-limit signals include limit, exhausted, blocked, and safe-mode paused states.',
                reasonCodes: Object.keys(quotaStates),
            }),
            metric({
                key: 'pro_value_usage',
                label: 'Pro value usage',
                count: proValueUsage,
                detail: 'Coach, history, Spray Lab, Ciclo Pro, and Social Pro usage stays secondary to launch gates.',
            }),
        ],
        conversion: {
            checkoutStartedToConfirmedRate: rate(checkoutConfirmed, checkoutStarted),
            upgradeIntentToCheckoutRate: rate(checkoutStarted, upgradeIntent),
        },
        breakdowns: {
            ignoredPassiveImpressions,
            churnStates,
            quotaStates,
        },
        privacy: privacyPosture(input),
    };

    return snapshot;
}
