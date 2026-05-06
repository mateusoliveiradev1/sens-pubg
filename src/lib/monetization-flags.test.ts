import { describe, expect, it } from 'vitest';

async function loadMonetizationFlagsModule() {
    return import('./monetization-flags');
}

describe('monetization flag resolver', () => {
    it('fails closed by default while keeping entitlement enforcement and webhook signature checks on', async () => {
        const { resolveMonetizationFlags } = await loadMonetizationFlagsModule();

        const result = resolveMonetizationFlags();

        expect(result).toMatchObject({
            checkoutEnabled: false,
            founderPricingEnabled: false,
            billingPortalEnabled: false,
            entitlementEnforcementEnabled: true,
            entitlementSafeMode: false,
            manualGrantsEnabled: false,
            monetizationAnalyticsEnabled: false,
            publicPricingEnabled: false,
            quotaConsumptionPaused: false,
            webhookSignatureRequired: true,
            preserveConfirmedPaidAccess: true,
            grantProToEveryone: false,
        });
    });

    it('safe mode blocks new checkout without granting Pro globally', async () => {
        const { resolveMonetizationFlags } = await loadMonetizationFlagsModule();

        const result = resolveMonetizationFlags({
            overrides: [
                { key: 'checkout_enabled', enabled: true, auditRef: 'flag:checkout' },
                { key: 'entitlement_safe_mode', enabled: true, auditRef: 'flag:safe-mode' },
            ],
        });

        expect(result.checkoutEnabled).toBe(false);
        expect(result.preserveConfirmedPaidAccess).toBe(true);
        expect(result.grantProToEveryone).toBe(false);
        expect(result.blockers).toContain('monetization_safe_mode');
        expect(result.auditRefs).toEqual(['flag:checkout', 'flag:safe-mode']);
    });

    it('requires webhook signatures in production even when a bad override tries to disable them', async () => {
        const { resolveMonetizationFlags } = await loadMonetizationFlagsModule();

        const result = resolveMonetizationFlags({
            environment: 'production',
            overrides: [
                { key: 'webhook_signature_required', enabled: false },
            ],
        });

        expect(result.webhookSignatureRequired).toBe(true);
    });

    it('pauses quota consumption only when the dedicated flag is explicitly enabled', async () => {
        const { resolveMonetizationFlags } = await loadMonetizationFlagsModule();

        expect(resolveMonetizationFlags().quotaConsumptionPaused).toBe(false);
        expect(resolveMonetizationFlags({
            overrides: [
                { key: 'quota_consumption_paused', enabled: true },
            ],
        }).quotaConsumptionPaused).toBe(true);
    });
});
