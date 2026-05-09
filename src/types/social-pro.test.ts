import { describe, expect, it } from 'vitest';

type SocialProTypesModule = Record<string, unknown>;

async function loadSocialProTypes(): Promise<SocialProTypesModule> {
    const modulePath = './social-pro';

    try {
        return await import(modulePath) as SocialProTypesModule;
    } catch (error) {
        throw new Error(
            [
                'Missing Social Pro type contract module at src/types/social-pro.ts.',
                'Wave 0 expects report, link, library, analytics, and moderation contracts before Phase 11 can pass.',
                error instanceof Error ? error.message : String(error),
            ].join(' '),
        );
    }
}

function expectValues(
    socialProModule: SocialProTypesModule,
    exportName: string,
    expectedValues: readonly string[],
): readonly string[] {
    const values = socialProModule[exportName];

    expect(Array.isArray(values), `${exportName} must export a readonly string value list.`).toBe(true);
    expect(values).toEqual(expectedValues);
    expect(new Set(values as readonly string[]).size, `${exportName} must not contain duplicates.`).toBe(
        expectedValues.length,
    );

    return values as readonly string[];
}

function expectParser(
    socialProModule: SocialProTypesModule,
    exportName: string,
    acceptedValue: string,
): void {
    const parser = socialProModule[exportName];

    expect(typeof parser, `${exportName} must be exported.`).toBe('function');
    expect((parser as (value: string) => string)(acceptedValue)).toBe(acceptedValue);
    expect(() => (parser as (value: string) => string)('__unsafe_social_pro_value__')).toThrow();
}

describe('Social Pro type contracts', () => {
    it('defines public report visibility, lifecycle status, private link status, and required honesty fields', async () => {
        const socialProModule = await loadSocialProTypes();

        expectValues(socialProModule, 'socialProReportVisibilityValues', [
            'public',
            'link_private',
        ]);
        expectValues(socialProModule, 'socialProReportStatusValues', [
            'draft',
            'published',
            'hidden',
            'disabled',
            'archived',
        ]);
        expectValues(socialProModule, 'socialProPrivateLinkStatusValues', [
            'active',
            'revoked',
            'expired',
        ]);
        expectValues(socialProModule, 'socialProRequiredHonestyFieldValues', [
            'confidence',
            'coverage',
            'blockers',
            'inconclusive_state',
            'limited_support',
            'validation_state',
            'no_overclaim_disclaimer',
        ]);

        expectParser(socialProModule, 'parseSocialProReportVisibility', 'link_private');
        expectParser(socialProModule, 'parseSocialProReportStatus', 'published');
        expectParser(socialProModule, 'parseSocialProPrivateLinkStatus', 'revoked');
    });

    it('defines private library item kinds and collection modes around original Sens PUBG training value', async () => {
        const socialProModule = await loadSocialProTypes();

        expectValues(socialProModule, 'socialProLibraryItemKindValues', [
            'report',
            'community_post',
            'setup',
            'drill',
            'program_mission',
            'spray_lab_session',
            'compatible_validation',
        ]);
        expectValues(socialProModule, 'socialProCollectionModeValues', [
            'automatic',
            'manual',
        ]);

        const itemKinds = socialProModule.socialProLibraryItemKindValues as readonly string[];
        expect(itemKinds).not.toContain('exclusive_pubg_api_data');
        expect(itemKinds).not.toContain('rank_boost');
        expect(itemKinds).not.toContain('team_coach_review');
    });

    it('limits creator analytics to safe aggregate metric keys', async () => {
        const socialProModule = await loadSocialProTypes();

        const values = expectValues(socialProModule, 'socialProSafeCreatorMetricKeyValues', [
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

        expect(values).not.toEqual(expect.arrayContaining([
            'private_reader_ids',
            'private_link_readers',
            'private_collection_contents',
            'raw_private_analysis',
            'payment_state',
            'checkout_funnel',
            'revenue',
        ]));
    });

    it('adds Pro-report moderation reasons without making the paid badge an authority signal', async () => {
        const socialProModule = await loadSocialProTypes();

        const values = expectValues(socialProModule, 'socialProReportModerationReasonValues', [
            'exposicao_indevida',
            'dados_sensiveis',
            'claim_enganosa',
            'falsa_autoridade',
            'abuso_badge_pro',
            'uso_indevido_contexto_premium',
        ]);

        expect(values).not.toContain('skill_disagreement');
        expect(values).not.toContain('non_pro_author');
        expectParser(socialProModule, 'parseSocialProReportModerationReason', 'abuso_badge_pro');
    });
});
