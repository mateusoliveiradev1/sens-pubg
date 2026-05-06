import { z } from 'zod';

function createMonetizationEnumContract<const TValues extends readonly [string, ...string[]]>(
    values: TValues,
) {
    const schema = z.enum(values);
    const valueSet = new Set<string>(values);

    return {
        values,
        schema,
        isValue(value: string): value is TValues[number] {
            return valueSet.has(value);
        },
        parse(value: string): TValues[number] {
            return schema.parse(value);
        },
    };
}

const stripeEnvironmentContract = createMonetizationEnumContract([
    'test',
    'production',
]);

export const stripeEnvironmentValues = stripeEnvironmentContract.values;
export const stripeEnvironmentSchema = stripeEnvironmentContract.schema;
export type StripeEnvironment = z.infer<typeof stripeEnvironmentSchema>;
export const isStripeEnvironment = stripeEnvironmentContract.isValue;
export const parseStripeEnvironment = stripeEnvironmentContract.parse;

const productPriceKeyContract = createMonetizationEnumContract([
    'pro_founder_brl_monthly',
    'pro_founder_usd_monthly',
    'pro_public_brl_monthly',
    'pro_public_usd_monthly',
    'pro_founder_brl_yearly',
    'pro_founder_usd_yearly',
    'pro_public_brl_yearly',
    'pro_public_usd_yearly',
]);

export const productPriceKeyValues = productPriceKeyContract.values;
export const productPriceKeySchema = productPriceKeyContract.schema;
export type ProductPriceKey = z.infer<typeof productPriceKeySchema>;
export const isProductPriceKey = productPriceKeyContract.isValue;
export const parseProductPriceKey = productPriceKeyContract.parse;

const productEntitlementKeyContract = createMonetizationEnumContract([
    'analysis.save.free_limit',
    'analysis.save.pro_limit',
    'analysis.save.quota_warning',
    'coach.summary',
    'coach.full_plan',
    'training.next_block_protocol',
    'history.basic_recent',
    'history.full',
    'trends.compatible_summary',
    'trends.compatible_full',
    'precision.evolution_lines',
    'precision.checkpoints',
    'metrics.basic',
    'metrics.advanced',
    'coach.outcome_capture',
    'coach.validation_loop',
    'billing.portal_access',
    'admin.entitlements.view',
    'admin.entitlements.grant',
    'admin.entitlements.revoke',
    'admin.entitlements.suspend',
    'admin.billing.reconcile',
    'support.entitlements.view',
    'support.entitlements.note',
    'programs.guided_weekly',
    'programs.guided_monthly',
    'spray_lab.session_runner',
    'spray_lab.benchmarks',
    'community.pro_badge',
    'community.premium_report_share',
    'community.creator_attribution',
    'team.player_review',
    'team.seats',
]);

export const productEntitlementKeyValues = productEntitlementKeyContract.values;
export const productEntitlementKeySchema = productEntitlementKeyContract.schema;
export type ProductEntitlementKey = z.infer<typeof productEntitlementKeySchema>;
export const isProductEntitlementKey = productEntitlementKeyContract.isValue;
export const parseProductEntitlementKey = productEntitlementKeyContract.parse;

const productTierContract = createMonetizationEnumContract([
    'free',
    'pro',
    'founder',
]);

export const productTierValues = productTierContract.values;
export const productTierSchema = productTierContract.schema;
export type ProductTier = z.infer<typeof productTierSchema>;
export const isProductTier = productTierContract.isValue;
export const parseProductTier = productTierContract.parse;

const productAccessStateContract = createMonetizationEnumContract([
    'free',
    'free_limit_reached',
    'checkout_pending',
    'pro_active',
    'founder_active',
    'past_due_grace',
    'past_due_blocked',
    'canceling',
    'canceled',
    'suspended',
    'manual_grant_active',
    'manual_grant_expired',
]);

export const productAccessStateValues = productAccessStateContract.values;
export const productAccessStateSchema = productAccessStateContract.schema;
export type ProductAccessState = z.infer<typeof productAccessStateSchema>;
export const isProductAccessState = productAccessStateContract.isValue;
export const parseProductAccessState = productAccessStateContract.parse;

const billingStatusContract = createMonetizationEnumContract([
    'none',
    'checkout_pending',
    'active',
    'trialing',
    'past_due',
    'canceling',
    'canceled',
    'unpaid',
    'incomplete',
    'incomplete_expired',
    'paused',
    'manual_grant',
    'suspended',
]);

export const billingStatusValues = billingStatusContract.values;
export const billingStatusSchema = billingStatusContract.schema;
export type BillingStatus = z.infer<typeof billingStatusSchema>;
export const isBillingStatus = billingStatusContract.isValue;
export const parseBillingStatus = billingStatusContract.parse;

const quotaReasonCodeContract = createMonetizationEnumContract([
    'billable',
    'non_billable_weak_capture',
    'technical_failure',
    'limit_blocked',
    'support_adjustment',
    'duplicate_attempt',
    'entitlement_blocked',
    'safe_mode_paused',
]);

export const quotaReasonCodeValues = quotaReasonCodeContract.values;
export const quotaReasonCodeSchema = quotaReasonCodeContract.schema;
export type QuotaReasonCode = z.infer<typeof quotaReasonCodeSchema>;
export const isQuotaReasonCode = quotaReasonCodeContract.isValue;
export const parseQuotaReasonCode = quotaReasonCodeContract.parse;

const productQuotaStateContract = createMonetizationEnumContract([
    'available',
    'warning',
    'limit_reached',
    'blocked',
    'paused',
    'not_applicable',
]);

export const productQuotaStateValues = productQuotaStateContract.values;
export const productQuotaStateSchema = productQuotaStateContract.schema;
export type ProductQuotaState = z.infer<typeof productQuotaStateSchema>;
export const isProductQuotaState = productQuotaStateContract.isValue;
export const parseProductQuotaState = productQuotaStateContract.parse;

const monetizationEventTypeContract = createMonetizationEnumContract([
    'activation.first_usable_analysis',
    'quota.consumed',
    'quota.warning',
    'quota.limit_hit',
    'quota.adjusted',
    'upgrade_intent.limit_hit',
    'upgrade_intent.premium_feature_attempted',
    'paywall.viewed',
    'checkout.started',
    'checkout.canceled',
    'checkout.completed',
    'checkout.confirmed',
    'webhook.processed',
    'webhook.rejected',
    'pro.activated',
    'pro.payment_failed',
    'pro.grace_entered',
    'pro.revoked',
    'billing.portal_opened',
    'admin.grant_created',
    'admin.grant_revoked',
    'admin.suspension_created',
    'admin.suspension_removed',
    'pro.feature_value',
]);

export const monetizationEventTypeValues = monetizationEventTypeContract.values;
export const monetizationEventTypeSchema = monetizationEventTypeContract.schema;
export type MonetizationEventType = z.infer<typeof monetizationEventTypeSchema>;
export const isMonetizationEventType = monetizationEventTypeContract.isValue;
export const parseMonetizationEventType = monetizationEventTypeContract.parse;

const monetizationFlagKeyContract = createMonetizationEnumContract([
    'checkout_enabled',
    'founder_pricing_enabled',
    'billing_portal_enabled',
    'entitlement_enforcement_enabled',
    'entitlement_safe_mode',
    'manual_grants_enabled',
    'monetization_analytics_enabled',
    'public_pricing_enabled',
    'quota_consumption_paused',
    'webhook_signature_required',
]);

export const monetizationFlagKeyValues = monetizationFlagKeyContract.values;
export const monetizationFlagKeySchema = monetizationFlagKeyContract.schema;
export type MonetizationFlagKey = z.infer<typeof monetizationFlagKeySchema>;
export const isMonetizationFlagKey = monetizationFlagKeyContract.isValue;
export const parseMonetizationFlagKey = monetizationFlagKeyContract.parse;

const noFalseDoneEvidenceStatusContract = createMonetizationEnumContract([
    'not_started',
    'implemented',
    'verified',
    'blocked',
    'not_delivered',
    'partially_delivered',
    'delivered',
]);

export const noFalseDoneEvidenceStatusValues = noFalseDoneEvidenceStatusContract.values;
export const noFalseDoneEvidenceStatusSchema = noFalseDoneEvidenceStatusContract.schema;
export type NoFalseDoneEvidenceStatus = z.infer<typeof noFalseDoneEvidenceStatusSchema>;
export const isNoFalseDoneEvidenceStatus = noFalseDoneEvidenceStatusContract.isValue;
export const parseNoFalseDoneEvidenceStatus = noFalseDoneEvidenceStatusContract.parse;

const noFalseDoneEvidenceTypeContract = createMonetizationEnumContract([
    'implementation',
    'automated_test',
    'manual_test',
    'schema_push',
    'benchmark_gate',
    'build_gate',
    'blocker',
]);

export const noFalseDoneEvidenceTypeValues = noFalseDoneEvidenceTypeContract.values;
export const noFalseDoneEvidenceTypeSchema = noFalseDoneEvidenceTypeContract.schema;
export type NoFalseDoneEvidenceType = z.infer<typeof noFalseDoneEvidenceTypeSchema>;
export const isNoFalseDoneEvidenceType = noFalseDoneEvidenceTypeContract.isValue;
export const parseNoFalseDoneEvidenceType = noFalseDoneEvidenceTypeContract.parse;

export type ProductFeatureTier = 'free' | 'pro' | 'operational' | 'future';
export type ProductEntitlementStatus = 'active' | 'operational' | 'planned' | 'inactive';
export type ProductEntitlementGatingMode =
    | 'default_free'
    | 'requires_pro'
    | 'admin_only'
    | 'planned_future';

export interface ProductEntitlementDefinition {
    readonly key: ProductEntitlementKey;
    readonly status: ProductEntitlementStatus;
    readonly tier: ProductFeatureTier;
    readonly surface: string;
    readonly labelKey: string;
    readonly internalDescription: string;
    readonly introducedPhase: '05';
    readonly ownerDomain: string;
    readonly gatingMode: ProductEntitlementGatingMode;
}

export interface ProductQuotaSummary {
    readonly tier: ProductTier;
    readonly limit: number;
    readonly used: number;
    readonly remaining: number;
    readonly state: ProductQuotaState;
    readonly periodStart: Date | null;
    readonly periodEnd: Date | null;
    readonly warningAt: number | null;
    readonly reason: QuotaReasonCode | null;
}

export interface NoFalseDoneEvidenceItem {
    readonly requirementId: string;
    readonly evidenceType: NoFalseDoneEvidenceType;
    readonly evidence: string;
    readonly command: string | null;
    readonly result: NoFalseDoneEvidenceStatus;
    readonly remainingGap: string | null;
}
