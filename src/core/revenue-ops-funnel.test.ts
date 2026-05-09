import { describe, expect, it } from 'vitest';

import {
    buildRevenueOpsFunnelSnapshot,
    type RevenueOpsAnalyticsEventLike,
    type RevenueOpsCheckoutAttemptLike,
    type RevenueOpsQuotaEntryLike,
    type RevenueOpsSubscriptionLike,
} from './revenue-ops-funnel';

function metric(snapshot: ReturnType<typeof buildRevenueOpsFunnelSnapshot>, key: string) {
    const found = snapshot.metrics.find((item) => item.key === key);

    expect(found, `missing metric ${key}`).toBeDefined();

    return found!;
}

describe('Revenue Ops funnel aggregation', () => {
    it('counts the essential paid funnel from server-side events and state transitions', () => {
        const events: RevenueOpsAnalyticsEventLike[] = [
            { eventType: 'activation.first_usable_analysis', userId: 'u1' },
            { eventType: 'upgrade_intent.limit_hit', userId: 'u1' },
            { eventType: 'upgrade_intent.premium_feature_attempted', userId: 'u2' },
            { eventType: 'upgrade_intent.checkout_requested', userId: 'u2' },
            { eventType: 'checkout.started', userId: 'u2' },
            { eventType: 'checkout.confirmed', userId: 'u2' },
            { eventType: 'pro.activated', userId: 'u2' },
            { eventType: 'quota.limit_hit', userId: 'u1' },
        ];
        const checkoutAttempts: RevenueOpsCheckoutAttemptLike[] = [
            { id: 'attempt-1', status: 'created', userId: 'u2' },
            { id: 'attempt-2', status: 'completed', userId: 'u3', completedAt: new Date('2026-05-09T12:00:00.000Z') },
        ];
        const subscriptions: RevenueOpsSubscriptionLike[] = [
            { id: 'sub-1', userId: 'u2', billingStatus: 'active', accessState: 'pro_active', tier: 'pro' },
            { id: 'sub-2', userId: 'u3', billingStatus: 'canceled', accessState: 'canceled', tier: 'pro' },
        ];
        const quotaEntries: RevenueOpsQuotaEntryLike[] = [
            { id: 'quota-1', userId: 'u1', state: 'limit_reached', reasonCode: 'limit_blocked' },
            { id: 'quota-2', userId: 'u4', state: 'paused', reasonCode: 'safe_mode_paused' },
        ];

        const snapshot = buildRevenueOpsFunnelSnapshot({
            events,
            checkoutAttempts,
            subscriptions,
            quotaEntries,
        });

        expect(metric(snapshot, 'first_usable_analysis')).toMatchObject({ count: 1, status: 'PASS' });
        expect(metric(snapshot, 'upgrade_intent')).toMatchObject({ count: 3, status: 'PASS' });
        expect(metric(snapshot, 'checkout_started')).toMatchObject({ count: 2, status: 'PASS' });
        expect(metric(snapshot, 'checkout_confirmed')).toMatchObject({ count: 2, status: 'PASS', rate: 1 });
        expect(metric(snapshot, 'pro_active')).toMatchObject({ count: 2, status: 'PASS' });
        expect(metric(snapshot, 'churn_cancellation')).toMatchObject({
            count: 1,
            status: 'WARN',
            reasonCodes: ['canceled'],
        });
        expect(metric(snapshot, 'quota_limit_hit')).toMatchObject({
            count: 3,
            status: 'WARN',
            reasonCodes: expect.arrayContaining(['limit_blocked', 'safe_mode_paused']),
        });
        expect(snapshot.conversion).toEqual({
            checkoutStartedToConfirmedRate: 1,
            upgradeIntentToCheckoutRate: 0.6667,
        });
    });

    it('excludes passive impressions from upgrade intent while preserving them as ignored context', () => {
        const snapshot = buildRevenueOpsFunnelSnapshot({
            events: [
                { eventType: 'premium.lock_viewed', surface: 'analysis_result' },
                { eventType: 'paywall.viewed', surface: 'pricing' },
                { eventType: 'social_pro.passive_impression', surface: 'feed' },
                { eventType: 'upgrade_intent.checkout_requested', surface: 'pricing' },
            ],
        });

        expect(metric(snapshot, 'upgrade_intent')).toMatchObject({ count: 1 });
        expect(snapshot.breakdowns.ignoredPassiveImpressions).toBe(3);
    });

    it('keeps checkout confirmation tied to webhook/subscription facts, not success URL or client state metadata', () => {
        const snapshot = buildRevenueOpsFunnelSnapshot({
            events: [
                {
                    eventType: 'checkout.started',
                    metadata: {
                        successUrl: 'https://sens.example/success?paid=true',
                        localStoragePro: true,
                        clientState: 'pro_active',
                    },
                },
            ],
            checkoutAttempts: [
                {
                    status: 'created',
                    metadata: {
                        successUrl: 'https://sens.example/success?paid=true',
                    },
                },
            ],
            subscriptions: [],
        });

        expect(metric(snapshot, 'checkout_started')).toMatchObject({ count: 2 });
        expect(metric(snapshot, 'checkout_confirmed')).toMatchObject({
            count: 0,
            status: 'WARN',
            rate: 0,
        });
    });

    it('reports privacy posture and drops prohibited raw/private fields from aggregation output', () => {
        const snapshot = buildRevenueOpsFunnelSnapshot({
            events: [
                {
                    eventType: 'activation.first_usable_analysis',
                    metadata: {
                        rawVideo: 'clip.mp4',
                        frameTrajectory: [1, 2, 3],
                        privateLinkToken: 'secret',
                        paymentCard: '4242',
                        safeReasonCode: 'analysis_saved',
                    },
                },
            ],
        });
        const serialized = JSON.stringify(snapshot).toLowerCase();

        expect(snapshot.privacy.defaultMode).toBe('aggregate_only');
        expect(snapshot.privacy.userDetailRequiresReason).toBe(true);
        expect(snapshot.privacy.allowedDetailReasons).toEqual(expect.arrayContaining([
            'support_case',
            'webhook_failure',
            'reconciliation_request',
        ]));
        expect(snapshot.privacy.prohibitedInputFieldCount).toBeGreaterThanOrEqual(4);
        expect(serialized).not.toContain('clip.mp4');
        expect(serialized).not.toContain('4242');
        expect(serialized).not.toContain('secret');
    });
});
