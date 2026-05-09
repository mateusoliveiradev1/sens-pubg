import { describe, expect, it } from 'vitest';

type SocialProTypesModule = Record<string, unknown>;

interface EnumContractCase {
    readonly valuesExport: string;
    readonly schemaExport: string;
    readonly isValueExport: string;
    readonly parseExport: string;
    readonly expectedValues: readonly string[];
    readonly acceptedValue: string;
}

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

function expectEnumContract(
    socialProModule: SocialProTypesModule,
    testCase: EnumContractCase,
): void {
    const values = expectValues(
        socialProModule,
        testCase.valuesExport,
        testCase.expectedValues,
    );
    const schema = socialProModule[testCase.schemaExport] as {
        safeParse?: (value: string) => { success: boolean };
    };
    const isValue = socialProModule[testCase.isValueExport];
    const parser = socialProModule[testCase.parseExport];

    expect(schema?.safeParse, `${testCase.schemaExport} must be exported.`).toBeTypeOf('function');
    expect(typeof isValue, `${testCase.isValueExport} must be exported.`).toBe('function');
    expect(typeof parser, `${testCase.parseExport} must be exported.`).toBe('function');

    for (const value of values) {
        expect(schema.safeParse?.(value).success, `${testCase.schemaExport} accepts ${value}`).toBe(true);
        expect((isValue as (candidate: string) => boolean)(value), `${testCase.isValueExport} accepts ${value}`).toBe(true);
        expect((parser as (value: string) => string)(value), `${testCase.parseExport} parses ${value}`).toBe(value);
    }

    expect((parser as (value: string) => string)(testCase.acceptedValue)).toBe(testCase.acceptedValue);
    expect(schema.safeParse?.('__unsafe_social_pro_value__').success).toBe(false);
    expect((isValue as (candidate: string) => boolean)('__unsafe_social_pro_value__')).toBe(false);
    expect(() => (parser as (value: string) => string)('__unsafe_social_pro_value__')).toThrow();
}

describe('Social Pro type contracts', () => {
    it('defines public report visibility, lifecycle status, private link status, and required honesty fields', async () => {
        const socialProModule = await loadSocialProTypes();

        for (const testCase of [
            {
                valuesExport: 'socialProReportVisibilityValues',
                schemaExport: 'socialProReportVisibilitySchema',
                isValueExport: 'isSocialProReportVisibility',
                parseExport: 'parseSocialProReportVisibility',
                expectedValues: ['public', 'link_private'],
                acceptedValue: 'link_private',
            },
            {
                valuesExport: 'socialProReportStatusValues',
                schemaExport: 'socialProReportStatusSchema',
                isValueExport: 'isSocialProReportStatus',
                parseExport: 'parseSocialProReportStatus',
                expectedValues: ['draft', 'published', 'hidden', 'disabled', 'archived'],
                acceptedValue: 'published',
            },
            {
                valuesExport: 'socialProPrivateLinkStatusValues',
                schemaExport: 'socialProPrivateLinkStatusSchema',
                isValueExport: 'isSocialProPrivateLinkStatus',
                parseExport: 'parseSocialProPrivateLinkStatus',
                expectedValues: ['active', 'revoked', 'expired'],
                acceptedValue: 'revoked',
            },
            {
                valuesExport: 'socialProRequiredHonestyFieldValues',
                schemaExport: 'socialProRequiredHonestyFieldSchema',
                isValueExport: 'isSocialProRequiredHonestyField',
                parseExport: 'parseSocialProRequiredHonestyField',
                expectedValues: [
                    'confidence',
                    'coverage',
                    'blockers',
                    'inconclusive_state',
                    'limited_support',
                    'validation_state',
                    'no_overclaim_disclaimer',
                ],
                acceptedValue: 'confidence',
            },
        ] satisfies readonly EnumContractCase[]) {
            expectEnumContract(socialProModule, testCase);
        }
    });

    it('defines private library item kinds and collection modes around original Sens PUBG training value', async () => {
        const socialProModule = await loadSocialProTypes();

        expectEnumContract(socialProModule, {
            valuesExport: 'socialProLibraryItemKindValues',
            schemaExport: 'socialProLibraryItemKindSchema',
            isValueExport: 'isSocialProLibraryItemKind',
            parseExport: 'parseSocialProLibraryItemKind',
            expectedValues: [
                'report',
                'community_post',
                'setup',
                'drill',
                'program_mission',
                'spray_lab_session',
                'compatible_validation',
            ],
            acceptedValue: 'report',
        });
        expectEnumContract(socialProModule, {
            valuesExport: 'socialProCollectionModeValues',
            schemaExport: 'socialProCollectionModeSchema',
            isValueExport: 'isSocialProCollectionMode',
            parseExport: 'parseSocialProCollectionMode',
            expectedValues: ['automatic', 'manual'],
            acceptedValue: 'automatic',
        });

        const itemKinds = socialProModule.socialProLibraryItemKindValues as readonly string[];
        expect(itemKinds).not.toContain('exclusive_pubg_api_data');
        expect(itemKinds).not.toContain('rank_boost');
        expect(itemKinds).not.toContain('team_coach_review');
    });

    it('limits creator analytics to safe aggregate metric keys', async () => {
        const socialProModule = await loadSocialProTypes();

        expectEnumContract(socialProModule, {
            valuesExport: 'socialProSafeCreatorMetricKeyValues',
            schemaExport: 'socialProSafeCreatorMetricKeySchema',
            isValueExport: 'isSocialProSafeCreatorMetricKey',
            parseExport: 'parseSocialProSafeCreatorMetricKey',
            expectedValues: [
                'public_posts',
                'public_comments',
                'public_saves',
                'public_follows',
                'setup_copies',
                'generated_reports',
                'analysis_cta_clicks',
                'training_cta_clicks',
                'context_interest',
            ],
            acceptedValue: 'public_posts',
        });

        const values = socialProModule.socialProSafeCreatorMetricKeyValues as readonly string[];

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

        expectEnumContract(socialProModule, {
            valuesExport: 'socialProReportModerationReasonValues',
            schemaExport: 'socialProReportModerationReasonSchema',
            isValueExport: 'isSocialProReportModerationReason',
            parseExport: 'parseSocialProReportModerationReason',
            expectedValues: [
                'exposicao_indevida',
                'dados_sensiveis',
                'claim_enganosa',
                'falsa_autoridade',
                'abuso_badge_pro',
                'uso_indevido_contexto_premium',
            ],
            acceptedValue: 'abuso_badge_pro',
        });

        const values = socialProModule.socialProReportModerationReasonValues as readonly string[];

        expect(values).not.toContain('skill_disagreement');
        expect(values).not.toContain('non_pro_author');
    });
});
