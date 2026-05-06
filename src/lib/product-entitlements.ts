import {
    productEntitlementKeyValues,
    type BillingStatus,
    type ProductAccessState,
    type ProductEntitlementDefinition,
    type ProductEntitlementKey,
    type ProductQuotaState,
    type ProductQuotaSummary,
    type ProductTier,
    type QuotaReasonCode,
} from '@/types/monetization';

export type ProductAccessSource =
    | 'default_free'
    | 'stripe_subscription'
    | 'manual_grant'
    | 'checkout_pending'
    | 'suspension'
    | 'legacy_free'
    | 'none';

export type ProductAccessBlockerCode =
    | 'payment_issue'
    | 'quota_exhausted'
    | 'suspended'
    | 'safe_mode'
    | 'checkout_pending'
    | 'manual_grant_expired';

export interface ProductAccessBlocker {
    readonly code: ProductAccessBlockerCode;
    readonly message: string;
}

export interface ProductSubscriptionFact {
    readonly status: BillingStatus;
    readonly tier: Exclude<ProductTier, 'free'>;
    readonly currentPeriodStart?: Date | null;
    readonly currentPeriodEnd?: Date | null;
    readonly graceEndsAt?: Date | null;
    readonly cancelAtPeriodEnd?: boolean;
    readonly auditRef?: string | null;
}

export interface ProductManualGrantFact {
    readonly tier: Exclude<ProductTier, 'free'>;
    readonly startsAt?: Date | null;
    readonly endsAt?: Date | null;
    readonly auditRef?: string | null;
}

export interface ProductSuspensionFact {
    readonly active: boolean;
    readonly reason: 'fraud' | 'chargeback' | 'abuse' | 'manual';
    readonly auditRef?: string | null;
}

export interface ProductAccessFlagFacts {
    readonly entitlementSafeMode?: boolean;
    readonly quotaConsumptionPaused?: boolean;
    readonly preserveConfirmedPaidAccess?: boolean;
}

export interface ProductFeatureAccess {
    readonly key: ProductEntitlementKey;
    readonly granted: boolean;
    readonly source: ProductAccessSource;
    readonly tier: ProductEntitlementDefinition['tier'];
    readonly gatingMode: ProductEntitlementDefinition['gatingMode'];
}

export interface ResolveProductAccessInput {
    readonly userId?: string | null;
    readonly subscription?: ProductSubscriptionFact | null;
    readonly checkoutPending?: boolean;
    readonly manualGrants?: readonly ProductManualGrantFact[];
    readonly suspension?: ProductSuspensionFact | null;
    readonly quota?: ProductQuotaSummary | null;
    readonly featureCatalog?: readonly ProductEntitlementDefinition[];
    readonly flags?: ProductAccessFlagFacts | null;
    readonly now?: Date;
}

export interface ProductAccessResolution {
    readonly userId: string | null;
    readonly effectiveTier: ProductTier;
    readonly accessState: ProductAccessState;
    readonly source: ProductAccessSource;
    readonly billingStatus: BillingStatus;
    readonly quota: ProductQuotaSummary;
    readonly features: Record<ProductEntitlementKey, ProductFeatureAccess>;
    readonly blockers: readonly ProductAccessBlocker[];
    readonly periodStart: Date | null;
    readonly periodEnd: Date | null;
    readonly expiresAt: Date | null;
    readonly auditRefs: readonly string[];
}

const FREE_LIMIT = 3;
const PRO_LIMIT = 100;
const GRACE_PERIOD_MS = 3 * 24 * 60 * 60 * 1000;

export const productDefaultFreeEntitlementKeys = [
    'analysis.save.free_limit',
    'analysis.save.quota_warning',
    'coach.summary',
    'history.basic_recent',
    'trends.compatible_summary',
    'metrics.basic',
] as const satisfies readonly ProductEntitlementKey[];

export const productProEntitlementKeys = [
    'analysis.save.pro_limit',
    'coach.full_plan',
    'training.next_block_protocol',
    'history.full',
    'trends.compatible_full',
    'precision.evolution_lines',
    'precision.checkpoints',
    'metrics.advanced',
    'coach.outcome_capture',
    'coach.validation_loop',
    'billing.portal_access',
] as const satisfies readonly ProductEntitlementKey[];

const operationalEntitlementKeys = [
    'admin.entitlements.view',
    'admin.entitlements.grant',
    'admin.entitlements.revoke',
    'admin.entitlements.suspend',
    'admin.billing.reconcile',
    'support.entitlements.view',
    'support.entitlements.note',
] as const satisfies readonly ProductEntitlementKey[];

const defaultFreeKeySet = new Set<ProductEntitlementKey>(productDefaultFreeEntitlementKeys);
const proKeySet = new Set<ProductEntitlementKey>(productProEntitlementKeys);
const operationalKeySet = new Set<ProductEntitlementKey>(operationalEntitlementKeys);

export const productDefaultEntitlementCatalog = productEntitlementKeyValues.map(
    (key): ProductEntitlementDefinition => {
        if (defaultFreeKeySet.has(key)) {
            return {
                key,
                status: 'active',
                tier: 'free',
                surface: key.split('.')[0] ?? 'product',
                labelKey: `monetization.entitlement.${key}`,
                internalDescription: `Default free entitlement: ${key}`,
                introducedPhase: '05',
                ownerDomain: 'product',
                gatingMode: 'default_free',
            };
        }

        if (proKeySet.has(key)) {
            return {
                key,
                status: 'active',
                tier: 'pro',
                surface: key.split('.')[0] ?? 'product',
                labelKey: `monetization.entitlement.${key}`,
                internalDescription: `Phase 5 Pro entitlement: ${key}`,
                introducedPhase: '05',
                ownerDomain: 'product',
                gatingMode: 'requires_pro',
            };
        }

        if (operationalKeySet.has(key)) {
            return {
                key,
                status: 'operational',
                tier: 'operational',
                surface: key.split('.')[0] ?? 'admin',
                labelKey: `monetization.entitlement.${key}`,
                internalDescription: `Operational monetization entitlement: ${key}`,
                introducedPhase: '05',
                ownerDomain: 'ops',
                gatingMode: 'admin_only',
            };
        }

        return {
            key,
            status: 'planned',
            tier: 'future',
            surface: key.split('.')[0] ?? 'future',
            labelKey: `monetization.entitlement.${key}`,
            internalDescription: `Planned future monetization entitlement: ${key}`,
            introducedPhase: '05',
            ownerDomain: 'future',
            gatingMode: 'planned_future',
        };
    },
);

function isDateActive(startsAt: Date | null | undefined, endsAt: Date | null | undefined, now: Date): boolean {
    const starts = startsAt?.getTime() ?? Number.NEGATIVE_INFINITY;
    const ends = endsAt?.getTime() ?? Number.POSITIVE_INFINITY;
    const current = now.getTime();

    return starts <= current && current < ends;
}

function getGraceEndsAt(subscription: ProductSubscriptionFact, now: Date): Date {
    if (subscription.graceEndsAt) {
        return subscription.graceEndsAt;
    }

    const base = subscription.currentPeriodEnd ?? now;
    return new Date(base.getTime() + GRACE_PERIOD_MS);
}

function createQuota(
    tier: ProductTier,
    quota: ProductQuotaSummary | null | undefined,
    flags: ProductAccessFlagFacts | null | undefined,
): ProductQuotaSummary {
    if (quota) {
        if (flags?.quotaConsumptionPaused === true) {
            return {
                ...quota,
                state: 'paused',
                reason: 'safe_mode_paused',
            };
        }

        return quota;
    }

    const limit = tier === 'free' ? FREE_LIMIT : PRO_LIMIT;

    return {
        tier,
        limit,
        used: 0,
        remaining: limit,
        state: 'available',
        periodStart: null,
        periodEnd: null,
        warningAt: tier === 'free' ? null : 80,
        reason: null,
    };
}

function isQuotaBlocked(quota: ProductQuotaSummary): boolean {
    return quota.remaining <= 0 || quota.state === 'limit_reached' || quota.state === 'blocked';
}

function createFeatures(
    catalog: readonly ProductEntitlementDefinition[],
    tier: ProductTier,
    source: ProductAccessSource,
): Record<ProductEntitlementKey, ProductFeatureAccess> {
    return catalog.reduce(
        (features, definition) => {
            const granted =
                definition.gatingMode === 'default_free'
                || (definition.gatingMode === 'requires_pro' && tier !== 'free');

            features[definition.key] = {
                key: definition.key,
                granted,
                source: granted ? source : 'none',
                tier: definition.tier,
                gatingMode: definition.gatingMode,
            };

            return features;
        },
        {} as Record<ProductEntitlementKey, ProductFeatureAccess>,
    );
}

function makeResolution(args: {
    input: ResolveProductAccessInput;
    effectiveTier: ProductTier;
    accessState: ProductAccessState;
    source: ProductAccessSource;
    billingStatus: BillingStatus;
    blockers?: readonly ProductAccessBlocker[];
    periodStart?: Date | null;
    periodEnd?: Date | null;
    expiresAt?: Date | null;
    auditRefs?: readonly (string | null | undefined)[];
}): ProductAccessResolution {
    const flags = args.input.flags;
    const quota = createQuota(args.effectiveTier, args.input.quota, flags);
    const blockers = [...(args.blockers ?? [])];
    let accessState = args.accessState;

    if (isQuotaBlocked(quota)) {
        blockers.push({
            code: 'quota_exhausted',
            message: 'Saving is blocked by the current quota state.',
        });

        if (args.effectiveTier === 'free') {
            accessState = 'free_limit_reached';
        }
    }

    if (flags?.entitlementSafeMode === true) {
        blockers.push({
            code: 'safe_mode',
            message: 'Monetization is in safe mode; confirmed access is preserved but new risky actions are degraded.',
        });
    }

    const catalog = args.input.featureCatalog ?? productDefaultEntitlementCatalog;

    return {
        userId: args.input.userId ?? null,
        effectiveTier: args.effectiveTier,
        accessState,
        source: args.source,
        billingStatus: args.billingStatus,
        quota,
        features: createFeatures(catalog, args.effectiveTier, args.source),
        blockers,
        periodStart: args.periodStart ?? null,
        periodEnd: args.periodEnd ?? null,
        expiresAt: args.expiresAt ?? null,
        auditRefs: (args.auditRefs ?? []).filter((ref): ref is string => Boolean(ref)),
    };
}

function activeSubscriptionResolution(
    input: ResolveProductAccessInput,
    subscription: ProductSubscriptionFact,
): ProductAccessResolution {
    const accessState: ProductAccessState = subscription.cancelAtPeriodEnd === true
        ? 'canceling'
        : subscription.tier === 'founder'
            ? 'founder_active'
            : 'pro_active';

    return makeResolution({
        input,
        effectiveTier: subscription.tier,
        accessState,
        source: 'stripe_subscription',
        billingStatus: subscription.status,
        periodStart: subscription.currentPeriodStart ?? null,
        periodEnd: subscription.currentPeriodEnd ?? null,
        expiresAt: subscription.currentPeriodEnd ?? null,
        auditRefs: [subscription.auditRef],
    });
}

export function resolveProductAccess(input: ResolveProductAccessInput = {}): ProductAccessResolution {
    const now = input.now ?? new Date();
    const suspension = input.suspension;

    if (suspension?.active === true) {
        return makeResolution({
            input,
            effectiveTier: 'free',
            accessState: 'suspended',
            source: 'suspension',
            billingStatus: 'suspended',
            blockers: [{
                code: 'suspended',
                message: `Product access is suspended because of ${suspension.reason}.`,
            }],
            auditRefs: [suspension.auditRef],
        });
    }

    const subscription = input.subscription;
    if (subscription) {
        if (
            (subscription.status === 'active' || subscription.status === 'trialing')
            && isDateActive(subscription.currentPeriodStart, subscription.currentPeriodEnd, now)
        ) {
            return activeSubscriptionResolution(input, subscription);
        }

        if (subscription.status === 'past_due') {
            const graceEndsAt = getGraceEndsAt(subscription, now);
            if (graceEndsAt.getTime() > now.getTime()) {
                return makeResolution({
                    input,
                    effectiveTier: subscription.tier,
                    accessState: 'past_due_grace',
                    source: 'stripe_subscription',
                    billingStatus: 'past_due',
                    blockers: [{
                        code: 'payment_issue',
                        message: 'Payment needs attention, but Pro remains available during the grace period.',
                    }],
                    periodStart: subscription.currentPeriodStart ?? null,
                    periodEnd: subscription.currentPeriodEnd ?? null,
                    expiresAt: graceEndsAt,
                    auditRefs: [subscription.auditRef],
                });
            }

            return makeResolution({
                input,
                effectiveTier: 'free',
                accessState: 'past_due_blocked',
                source: 'stripe_subscription',
                billingStatus: 'past_due',
                blockers: [{
                    code: 'payment_issue',
                    message: 'Past-due grace expired; Pro features are blocked until payment recovers.',
                }],
                auditRefs: [subscription.auditRef],
            });
        }

        if (subscription.status === 'canceled' || subscription.status === 'unpaid' || subscription.status === 'incomplete_expired') {
            return makeResolution({
                input,
                effectiveTier: 'free',
                accessState: 'canceled',
                source: 'stripe_subscription',
                billingStatus: subscription.status,
                auditRefs: [subscription.auditRef],
            });
        }
    }

    const manualGrants = input.manualGrants ?? [];
    const activeManualGrant = manualGrants.find((grant) => isDateActive(grant.startsAt, grant.endsAt, now));
    if (activeManualGrant) {
        return makeResolution({
            input,
            effectiveTier: activeManualGrant.tier,
            accessState: 'manual_grant_active',
            source: 'manual_grant',
            billingStatus: 'manual_grant',
            periodStart: activeManualGrant.startsAt ?? null,
            periodEnd: activeManualGrant.endsAt ?? null,
            expiresAt: activeManualGrant.endsAt ?? null,
            auditRefs: [activeManualGrant.auditRef],
        });
    }

    if (manualGrants.length > 0) {
        return makeResolution({
            input,
            effectiveTier: 'free',
            accessState: 'manual_grant_expired',
            source: 'manual_grant',
            billingStatus: 'manual_grant',
            blockers: [{
                code: 'manual_grant_expired',
                message: 'Manual grant expired; default free access applies.',
            }],
            auditRefs: manualGrants.map((grant) => grant.auditRef),
        });
    }

    if (input.checkoutPending === true) {
        return makeResolution({
            input,
            effectiveTier: 'free',
            accessState: 'checkout_pending',
            source: 'checkout_pending',
            billingStatus: 'checkout_pending',
            blockers: [{
                code: 'checkout_pending',
                message: 'Checkout is pending webhook confirmation before Pro access is granted.',
            }],
        });
    }

    return makeResolution({
        input,
        effectiveTier: 'free',
        accessState: 'free',
        source: 'default_free',
        billingStatus: 'none',
    });
}

export function hasProductEntitlement(
    resolution: ProductAccessResolution,
    key: ProductEntitlementKey,
): boolean {
    return resolution.features[key].granted;
}
