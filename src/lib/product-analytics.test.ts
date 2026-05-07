import { describe, expect, it, vi } from 'vitest';

import {
    recordCheckoutEvent,
    recordFirstUsableAnalysis,
    recordBillingPortalOpened,
    recordLoopRailCtaClicked,
    recordPaidRouteClick,
    recordPremiumLockViewed,
    recordPricingPlanSelected,
    recordProductEvent,
    recordProLifecycleEvent,
    recordQuotaEvent,
    recordUpgradeIntent,
    recordUploadGuidanceCorrection,
    sanitizeProductAnalyticsEvent,
    sanitizeProductAnalyticsMetadata,
    type ProductAnalyticsRepository,
} from './product-analytics';

function createRepository() {
    const recordProductEventMock = vi.fn<Parameters<ProductAnalyticsRepository['recordProductEvent']>, ReturnType<ProductAnalyticsRepository['recordProductEvent']>>()
        .mockResolvedValue(undefined);

    return {
        repository: {
            recordProductEvent: recordProductEventMock,
        } satisfies ProductAnalyticsRepository,
        recordProductEventMock,
    };
}

describe('product analytics privacy contract', () => {
    it('drops unknown, nested, and prohibited clip/payment fields from metadata', () => {
        expect(sanitizeProductAnalyticsMetadata({
            surface: 'analysis',
            featureKey: 'coach.full_plan',
            videoUrl: 'private-video.mp4',
            frames: [1, 2, 3],
            trajectory: { points: [] },
            filename: 'clip.mp4',
            privateNote: 'sensitive',
            cardNumber: '4242',
            cpf: '123',
            address: 'Rua X',
            bankAccount: '000',
            arbitrary: 'dropped',
            quotaUsed: 3,
        })).toEqual({
            surface: 'analysis',
            featureKey: 'coach.full_plan',
            quotaUsed: 3,
        });
    });

    it('normalizes event columns and metadata through a typed allowlist', () => {
        const event = sanitizeProductAnalyticsEvent({
            userId: 'user-1',
            eventType: 'premium.lock_viewed',
            surface: 'history',
            featureKey: 'history.full',
            accessState: 'free',
            quotaState: 'available',
            reasonCode: 'limit_blocked',
            metadata: {
                featureKey: 'history.full',
                fullResult: { hidden: true },
            stripeCustomerId: 'cus_test',
            route: '/pricing',
            ctaId: 'founder_checkout',
            lockReason: 'pro_feature',
            loopStage: 'coach',
            guidanceReason: 'weak_capture',
        },
    });

        expect(event).toMatchObject({
            userId: 'user-1',
            eventType: 'premium.lock_viewed',
            surface: 'history',
            featureKey: 'history.full',
            accessState: 'free',
            quotaState: 'available',
            reasonCode: 'limit_blocked',
            eventSource: 'server',
            metadata: {
                featureKey: 'history.full',
                stripeCustomerId: 'cus_test',
                route: '/pricing',
                ctaId: 'founder_checkout',
                lockReason: 'pro_feature',
                loopStage: 'coach',
                guidanceReason: 'weak_capture',
            },
        });
        expect(event.metadata).not.toHaveProperty('fullResult');
    });

    it('records activation, quota, upgrade, checkout, and lifecycle helpers without private payloads', async () => {
        const { repository, recordProductEventMock } = createRepository();

        await recordFirstUsableAnalysis({
            userId: 'user-1',
            accessState: 'free',
            quotaState: 'available',
            repository,
        });
        await recordQuotaEvent({
            userId: 'user-1',
            eventType: 'quota.exhausted',
            quotaState: 'limit_reached',
            reasonCode: 'limit_blocked',
            quotaUsed: 3,
            quotaLimit: 3,
            repository,
        });
        await recordUpgradeIntent({
            userId: 'user-1',
            surface: 'analysis_save',
            featureKey: 'analysis.save.pro_limit',
            accessState: 'free_limit_reached',
            reasonCode: 'limit_blocked',
            repository,
        });
        await recordCheckoutEvent({
            userId: 'user-1',
            eventType: 'checkout.created',
            priceKey: 'pro_founder_brl_monthly',
            checkoutAttemptId: 'attempt-1',
            stripeCheckoutSessionId: 'cs_test',
            repository,
        });
        await recordProLifecycleEvent({
            userId: 'user-1',
            eventType: 'pro.activated',
            priceKey: 'pro_founder_brl_monthly',
            billingStatus: 'active',
            accessState: 'founder_active',
            stripeSubscriptionId: 'sub_test',
            repository,
        });

        expect(recordProductEventMock).toHaveBeenCalledTimes(5);
        expect(recordProductEventMock.mock.calls.map(([event]) => event.eventType)).toEqual([
            'activation.first_usable_analysis',
            'quota.exhausted',
            'upgrade_intent.limit_hit',
            'checkout.created',
            'pro.activated',
        ]);
        expect(recordProductEventMock.mock.calls[4]?.[0]).toMatchObject({
            eventSource: 'webhook',
            metadata: {
                stripeSubscriptionId: 'sub_test',
            },
        });
    });

    it('swallows analytics repository errors so product truth is not mutated by telemetry failure', async () => {
        const repository: ProductAnalyticsRepository = {
            recordProductEvent: vi.fn().mockRejectedValue(new Error('analytics down')),
        };

        await expect(recordProductEvent({
            eventType: 'checkout.failed',
            surface: 'checkout',
        }, repository)).resolves.toBeUndefined();
    });

    it('records Phase 7 paid UI helpers with only allowlisted scalar metadata', async () => {
        const { repository, recordProductEventMock } = createRepository();

        await recordPaidRouteClick({
            userId: 'user-1',
            surface: 'mobile_nav',
            route: '/pricing',
            accessState: 'free',
            repository,
        });
        await recordPricingPlanSelected({
            userId: 'user-1',
            priceKey: 'pro_founder_brl_monthly',
            ctaId: 'founder_checkout',
            repository,
        });
        await recordPremiumLockViewed({
            userId: 'user-1',
            surface: 'analysis_result',
            featureKey: 'coach.full_plan',
            accessState: 'free',
            lockReason: 'pro_feature',
            repository,
        });
        await recordLoopRailCtaClicked({
            userId: 'user-1',
            surface: 'pricing',
            loopStage: 'coach',
            ctaId: 'pricing_hero_founder',
            repository,
        });
        await recordBillingPortalOpened({
            userId: 'user-1',
            billingStatus: 'active',
            accessState: 'founder_active',
            repository,
        });
        await recordUploadGuidanceCorrection({
            userId: 'user-1',
            guidanceReason: 'weak_capture',
            accessState: 'free',
            repository,
        });

        expect(recordProductEventMock).toHaveBeenCalledTimes(6);
        expect(recordProductEventMock.mock.calls.map(([event]) => event.eventType)).toEqual([
            'paywall.viewed',
            'upgrade_intent.checkout_requested',
            'premium.lock_viewed',
            'pro.feature_value',
            'billing.portal_opened',
            'pro.feature_value',
        ]);
        expect(recordProductEventMock.mock.calls[0]?.[0]).toMatchObject({
            surface: 'paid_route',
            metadata: {
                source: 'mobile_nav',
                route: '/pricing',
            },
        });
        expect(recordProductEventMock.mock.calls[2]?.[0]).toMatchObject({
            surface: 'analysis_result',
            featureKey: 'coach.full_plan',
            metadata: {
                lockReason: 'pro_feature',
            },
        });
        expect(recordProductEventMock.mock.calls[5]?.[0].metadata).toEqual({
            guidanceReason: 'weak_capture',
        });
    });
});
