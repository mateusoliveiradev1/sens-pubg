import type { MonetizationFlagKey } from '@/types/monetization';

export interface MonetizationFlagOverride {
    readonly key: MonetizationFlagKey;
    readonly enabled: boolean;
    readonly source?: 'db' | 'env' | 'test';
    readonly auditRef?: string | null;
}

export interface ResolveMonetizationFlagsInput {
    readonly overrides?: readonly MonetizationFlagOverride[];
    readonly environment?: 'development' | 'test' | 'production';
}

export interface ResolvedMonetizationFlags {
    readonly checkoutEnabled: boolean;
    readonly founderPricingEnabled: boolean;
    readonly billingPortalEnabled: boolean;
    readonly entitlementEnforcementEnabled: boolean;
    readonly entitlementSafeMode: boolean;
    readonly manualGrantsEnabled: boolean;
    readonly monetizationAnalyticsEnabled: boolean;
    readonly publicPricingEnabled: boolean;
    readonly quotaConsumptionPaused: boolean;
    readonly webhookSignatureRequired: boolean;
    readonly preserveConfirmedPaidAccess: boolean;
    readonly grantProToEveryone: false;
    readonly blockers: readonly string[];
    readonly auditRefs: readonly string[];
}

const DEFAULT_FLAGS: Record<MonetizationFlagKey, boolean> = {
    checkout_enabled: false,
    founder_pricing_enabled: false,
    billing_portal_enabled: false,
    entitlement_enforcement_enabled: true,
    entitlement_safe_mode: false,
    manual_grants_enabled: false,
    monetization_analytics_enabled: false,
    public_pricing_enabled: false,
    quota_consumption_paused: false,
    webhook_signature_required: true,
};

export function resolveMonetizationFlags(
    input: ResolveMonetizationFlagsInput = {},
): ResolvedMonetizationFlags {
    const flags = { ...DEFAULT_FLAGS };
    const auditRefs: string[] = [];

    for (const override of input.overrides ?? []) {
        flags[override.key] = override.enabled;

        if (override.auditRef) {
            auditRefs.push(override.auditRef);
        }
    }

    if (input.environment === 'production') {
        flags.webhook_signature_required = true;
    }

    const safeMode = flags.entitlement_safe_mode;
    const blockers = safeMode
        ? ['monetization_safe_mode']
        : [];

    return {
        checkoutEnabled: flags.checkout_enabled && !safeMode,
        founderPricingEnabled: flags.founder_pricing_enabled,
        billingPortalEnabled: flags.billing_portal_enabled,
        entitlementEnforcementEnabled: flags.entitlement_enforcement_enabled,
        entitlementSafeMode: safeMode,
        manualGrantsEnabled: flags.manual_grants_enabled,
        monetizationAnalyticsEnabled: flags.monetization_analytics_enabled,
        publicPricingEnabled: flags.public_pricing_enabled,
        quotaConsumptionPaused: flags.quota_consumption_paused,
        webhookSignatureRequired: flags.webhook_signature_required,
        preserveConfirmedPaidAccess: true,
        grantProToEveryone: false,
        blockers,
        auditRefs,
    };
}
