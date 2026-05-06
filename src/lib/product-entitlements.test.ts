import { describe, expect, it } from 'vitest';

import type { ProductQuotaSummary } from '@/types/monetization';

async function loadProductEntitlementsModule() {
    return import('./product-entitlements');
}

const now = new Date('2026-05-06T12:00:00.000Z');
const yesterday = new Date('2026-05-05T12:00:00.000Z');
const tomorrow = new Date('2026-05-07T12:00:00.000Z');
const nextWeek = new Date('2026-05-13T12:00:00.000Z');
const lastWeek = new Date('2026-04-29T12:00:00.000Z');

function quota(overrides: Partial<ProductQuotaSummary> = {}): ProductQuotaSummary {
    return {
        tier: 'free',
        limit: 3,
        used: 0,
        remaining: 3,
        state: 'available',
        periodStart: yesterday,
        periodEnd: nextWeek,
        warningAt: null,
        reason: null,
        ...overrides,
    };
}

describe('product entitlement resolver', () => {
    it('returns useful free access without Pro-only entitlements by default', async () => {
        const {
            resolveProductAccess,
            hasProductEntitlement,
        } = await loadProductEntitlementsModule();

        const result = resolveProductAccess({ now });

        expect(result).toMatchObject({
            effectiveTier: 'free',
            accessState: 'free',
            source: 'default_free',
            billingStatus: 'none',
        });
        expect(hasProductEntitlement(result, 'coach.summary')).toBe(true);
        expect(hasProductEntitlement(result, 'metrics.basic')).toBe(true);
        expect(hasProductEntitlement(result, 'coach.full_plan')).toBe(false);
        expect(hasProductEntitlement(result, 'history.full')).toBe(false);
    });

    it('keeps free access but marks save quota as blocked when the free limit is reached', async () => {
        const { resolveProductAccess, hasProductEntitlement } = await loadProductEntitlementsModule();

        const result = resolveProductAccess({
            now,
            quota: quota({
                used: 3,
                remaining: 0,
                state: 'limit_reached',
                reason: 'limit_blocked',
            }),
        });

        expect(result.accessState).toBe('free_limit_reached');
        expect(result.blockers).toContainEqual(expect.objectContaining({ code: 'quota_exhausted' }));
        expect(hasProductEntitlement(result, 'coach.summary')).toBe(true);
        expect(hasProductEntitlement(result, 'coach.full_plan')).toBe(false);
    });

    it('represents checkout as pending until trusted fulfillment confirms subscription access', async () => {
        const { resolveProductAccess } = await loadProductEntitlementsModule();

        const result = resolveProductAccess({
            now,
            checkoutPending: true,
        });

        expect(result).toMatchObject({
            effectiveTier: 'free',
            accessState: 'checkout_pending',
            source: 'checkout_pending',
            billingStatus: 'checkout_pending',
        });
        expect(result.blockers).toContainEqual(expect.objectContaining({ code: 'checkout_pending' }));
    });

    it('grants Pro and founder access for active Stripe subscriptions and preserves canceling access through period end', async () => {
        const { resolveProductAccess, hasProductEntitlement } = await loadProductEntitlementsModule();

        const pro = resolveProductAccess({
            now,
            subscription: {
                status: 'active',
                tier: 'pro',
                currentPeriodStart: yesterday,
                currentPeriodEnd: tomorrow,
                auditRef: 'sub:pro',
            },
        });
        const founder = resolveProductAccess({
            now,
            subscription: {
                status: 'active',
                tier: 'founder',
                currentPeriodStart: yesterday,
                currentPeriodEnd: tomorrow,
            },
        });
        const canceling = resolveProductAccess({
            now,
            subscription: {
                status: 'active',
                tier: 'pro',
                currentPeriodStart: yesterday,
                currentPeriodEnd: tomorrow,
                cancelAtPeriodEnd: true,
            },
        });

        expect(pro).toMatchObject({
            effectiveTier: 'pro',
            accessState: 'pro_active',
            source: 'stripe_subscription',
            billingStatus: 'active',
            auditRefs: ['sub:pro'],
        });
        expect(hasProductEntitlement(pro, 'coach.full_plan')).toBe(true);
        expect(founder.accessState).toBe('founder_active');
        expect(canceling.accessState).toBe('canceling');
        expect(hasProductEntitlement(canceling, 'billing.portal_access')).toBe(true);
    });

    it('allows past-due access only during grace and blocks it after grace expires', async () => {
        const { resolveProductAccess, hasProductEntitlement } = await loadProductEntitlementsModule();

        const grace = resolveProductAccess({
            now,
            subscription: {
                status: 'past_due',
                tier: 'pro',
                currentPeriodEnd: yesterday,
                graceEndsAt: tomorrow,
            },
        });
        const blocked = resolveProductAccess({
            now,
            subscription: {
                status: 'past_due',
                tier: 'pro',
                currentPeriodEnd: lastWeek,
                graceEndsAt: yesterday,
            },
        });

        expect(grace.accessState).toBe('past_due_grace');
        expect(hasProductEntitlement(grace, 'coach.full_plan')).toBe(true);
        expect(grace.blockers).toContainEqual(expect.objectContaining({ code: 'payment_issue' }));
        expect(blocked.accessState).toBe('past_due_blocked');
        expect(blocked.effectiveTier).toBe('free');
        expect(hasProductEntitlement(blocked, 'coach.full_plan')).toBe(false);
    });

    it('does not grant Pro for canceled subscriptions', async () => {
        const { resolveProductAccess, hasProductEntitlement } = await loadProductEntitlementsModule();

        const result = resolveProductAccess({
            now,
            subscription: {
                status: 'canceled',
                tier: 'pro',
            },
        });

        expect(result.accessState).toBe('canceled');
        expect(result.effectiveTier).toBe('free');
        expect(hasProductEntitlement(result, 'coach.full_plan')).toBe(false);
    });

    it('lets active manual grants apply when Stripe does not and marks expired grants honestly', async () => {
        const { resolveProductAccess, hasProductEntitlement } = await loadProductEntitlementsModule();

        const active = resolveProductAccess({
            now,
            manualGrants: [
                {
                    tier: 'pro',
                    startsAt: yesterday,
                    endsAt: tomorrow,
                    auditRef: 'grant:active',
                },
            ],
        });
        const expired = resolveProductAccess({
            now,
            manualGrants: [
                {
                    tier: 'pro',
                    startsAt: lastWeek,
                    endsAt: yesterday,
                    auditRef: 'grant:expired',
                },
            ],
        });

        expect(active).toMatchObject({
            effectiveTier: 'pro',
            accessState: 'manual_grant_active',
            source: 'manual_grant',
            billingStatus: 'manual_grant',
            auditRefs: ['grant:active'],
        });
        expect(hasProductEntitlement(active, 'coach.full_plan')).toBe(true);
        expect(expired.accessState).toBe('manual_grant_expired');
        expect(expired.effectiveTier).toBe('free');
        expect(expired.auditRefs).toEqual(['grant:expired']);
    });

    it('makes suspension override Stripe active and manual grants', async () => {
        const { resolveProductAccess, hasProductEntitlement } = await loadProductEntitlementsModule();

        const result = resolveProductAccess({
            now,
            subscription: {
                status: 'active',
                tier: 'pro',
                currentPeriodStart: yesterday,
                currentPeriodEnd: tomorrow,
            },
            manualGrants: [
                {
                    tier: 'founder',
                    startsAt: yesterday,
                    endsAt: nextWeek,
                },
            ],
            suspension: {
                active: true,
                reason: 'chargeback',
                auditRef: 'suspension:1',
            },
        });

        expect(result).toMatchObject({
            effectiveTier: 'free',
            accessState: 'suspended',
            source: 'suspension',
            billingStatus: 'suspended',
            auditRefs: ['suspension:1'],
        });
        expect(result.blockers).toContainEqual(expect.objectContaining({ code: 'suspended' }));
        expect(hasProductEntitlement(result, 'coach.full_plan')).toBe(false);
    });

    it('keeps billing access separate from quota blockers for active Pro users', async () => {
        const { resolveProductAccess, hasProductEntitlement } = await loadProductEntitlementsModule();

        const result = resolveProductAccess({
            now,
            subscription: {
                status: 'active',
                tier: 'pro',
                currentPeriodStart: yesterday,
                currentPeriodEnd: tomorrow,
            },
            quota: quota({
                tier: 'pro',
                limit: 100,
                used: 100,
                remaining: 0,
                state: 'limit_reached',
                warningAt: 80,
                reason: 'limit_blocked',
            }),
        });

        expect(result.accessState).toBe('pro_active');
        expect(result.effectiveTier).toBe('pro');
        expect(result.blockers).toContainEqual(expect.objectContaining({ code: 'quota_exhausted' }));
        expect(hasProductEntitlement(result, 'billing.portal_access')).toBe(true);
        expect(hasProductEntitlement(result, 'coach.full_plan')).toBe(true);
    });

    it('safe mode preserves confirmed access without creating universal Pro access', async () => {
        const { resolveProductAccess, hasProductEntitlement } = await loadProductEntitlementsModule();

        const freeSafeMode = resolveProductAccess({
            now,
            flags: {
                entitlementSafeMode: true,
            },
        });
        const paidSafeMode = resolveProductAccess({
            now,
            flags: {
                entitlementSafeMode: true,
                preserveConfirmedPaidAccess: true,
            },
            subscription: {
                status: 'active',
                tier: 'pro',
                currentPeriodStart: yesterday,
                currentPeriodEnd: tomorrow,
            },
        });

        expect(hasProductEntitlement(freeSafeMode, 'coach.full_plan')).toBe(false);
        expect(freeSafeMode.blockers).toContainEqual(expect.objectContaining({ code: 'safe_mode' }));
        expect(hasProductEntitlement(paidSafeMode, 'coach.full_plan')).toBe(true);
        expect(paidSafeMode.blockers).toContainEqual(expect.objectContaining({ code: 'safe_mode' }));
    });
});
