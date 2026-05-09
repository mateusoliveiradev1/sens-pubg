import { describe, expect, it } from 'vitest';

interface SocialProCreatorAnalyticsModule {
    readonly buildSocialProCreatorAnalytics?: (input: Record<string, unknown>) => Record<string, unknown>;
    readonly socialProCreatorAnalyticsMetricKeys?: readonly string[];
}

async function loadCreatorAnalyticsModule(): Promise<Required<SocialProCreatorAnalyticsModule>> {
    const modulePath = './social-pro-creator-analytics';

    let socialProModule: SocialProCreatorAnalyticsModule;
    try {
        socialProModule = await import(modulePath) as SocialProCreatorAnalyticsModule;
    } catch (error) {
        throw new Error(
            [
                'Missing Social Pro creator analytics module at src/core/social-pro-creator-analytics.ts.',
                'Expected safe aggregate creator impact metrics with private/payment/funnel leakage blocked.',
                error instanceof Error ? error.message : String(error),
            ].join(' '),
        );
    }

    expect(typeof socialProModule.buildSocialProCreatorAnalytics).toBe('function');
    expect(Array.isArray(socialProModule.socialProCreatorAnalyticsMetricKeys)).toBe(true);

    return socialProModule as Required<SocialProCreatorAnalyticsModule>;
}

function expectNoPrivateAnalyticsLeak(value: unknown): void {
    const serialized = JSON.stringify(value).toLowerCase();

    for (const prohibited of [
        'reader-private-1',
        'private@example.com',
        'private-link-token',
        'raw trajectory payload',
        'stripe',
        'sub_private',
        'checkout',
        'revenue',
        'funnel',
        'financial',
    ]) {
        expect(serialized).not.toContain(prohibited);
    }
}

describe('Social Pro creator analytics privacy', () => {
    it('declares only safe aggregate Social Pro metric keys', async () => {
        const { socialProCreatorAnalyticsMetricKeys } = await loadCreatorAnalyticsModule();

        expect(socialProCreatorAnalyticsMetricKeys).toEqual([
            'public_posts',
            'public_comments',
            'public_saves',
            'public_follows',
            'setup_copies',
            'generated_reports',
            'analysis_cta_clicks',
            'training_cta_clicks',
            'context_interest',
        ]);
        expect(socialProCreatorAnalyticsMetricKeys).not.toEqual(expect.arrayContaining([
            'private_reader_ids',
            'private_link_readers',
            'raw_private_analysis',
            'payment_state',
            'checkout_funnel',
            'revenue',
        ]));
    });

    it('builds safe creator impact aggregates without private readers, links, raw analysis, payment, funnel, or financial data', async () => {
        const { buildSocialProCreatorAnalytics } = await loadCreatorAnalyticsModule();

        const result = buildSocialProCreatorAnalytics({
            creatorId: 'creator-1',
            publicEvents: [
                { type: 'public_post', context: { weaponId: 'beryl-m762', opticId: '3x' } },
                { type: 'setup_copy', context: { weaponId: 'beryl-m762', opticId: '3x' } },
                { type: 'training_cta_click', context: { program: 'ciclo_pro' } },
                { type: 'generated_report', context: { validationState: 'pending' } },
            ],
            privateSignals: {
                privateReaders: [{ id: 'reader-private-1', email: 'private@example.com' }],
                privateLinkToken: 'private-link-token',
                rawPrivateAnalysis: 'raw trajectory payload',
                paymentState: { provider: 'stripe', subscriptionId: 'sub_private' },
                funnel: { checkoutStarted: 3, revenue: 100 },
                financial: { mrr: 100 },
            },
        });

        expect(result).toMatchObject({
            creatorId: 'creator-1',
            metrics: {
                public_posts: 1,
                setup_copies: 1,
                generated_reports: 1,
                training_cta_clicks: 1,
            },
            topContexts: expect.arrayContaining([
                expect.objectContaining({ weaponId: 'beryl-m762' }),
            ]),
        });
        expectNoPrivateAnalyticsLeak(result);
    });

    it('treats upgrade intent as real Pro actions or CTA clicks, not passive lock impressions', async () => {
        const { buildSocialProCreatorAnalytics } = await loadCreatorAnalyticsModule();

        const result = buildSocialProCreatorAnalytics({
            creatorId: 'creator-1',
            publicEvents: [
                { type: 'lock_impression', context: { surface: 'feed' } },
                { type: 'pro_cta_click', context: { surface: 'report_controls' } },
                { type: 'pro_library_attempt', context: { kind: 'report' } },
            ],
        });

        expect(result).toMatchObject({
            upgradeIntent: {
                countedEvents: 2,
                ignoredPassiveImpressions: 1,
            },
        });
        expectNoPrivateAnalyticsLeak(result);
    });
});
