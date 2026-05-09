import { z } from 'zod';

function createSocialProEnumContract<const TValues extends readonly [string, ...string[]]>(
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

const reportVisibilityContract = createSocialProEnumContract([
    'public',
    'link_private',
]);

export const socialProReportVisibilityValues = reportVisibilityContract.values;
export const socialProReportVisibilitySchema = reportVisibilityContract.schema;
export type SocialProReportVisibility = z.infer<typeof socialProReportVisibilitySchema>;
export const isSocialProReportVisibility = reportVisibilityContract.isValue;
export const parseSocialProReportVisibility = reportVisibilityContract.parse;

const reportStatusContract = createSocialProEnumContract([
    'draft',
    'published',
    'hidden',
    'disabled',
    'archived',
]);

export const socialProReportStatusValues = reportStatusContract.values;
export const socialProReportStatusSchema = reportStatusContract.schema;
export type SocialProReportStatus = z.infer<typeof socialProReportStatusSchema>;
export const isSocialProReportStatus = reportStatusContract.isValue;
export const parseSocialProReportStatus = reportStatusContract.parse;

const privateLinkStatusContract = createSocialProEnumContract([
    'active',
    'revoked',
    'expired',
]);

export const socialProPrivateLinkStatusValues = privateLinkStatusContract.values;
export const socialProPrivateLinkStatusSchema = privateLinkStatusContract.schema;
export type SocialProPrivateLinkStatus = z.infer<typeof socialProPrivateLinkStatusSchema>;
export const isSocialProPrivateLinkStatus = privateLinkStatusContract.isValue;
export const parseSocialProPrivateLinkStatus = privateLinkStatusContract.parse;

const publicSectionKeyContract = createSocialProEnumContract([
    'public_summary',
    'setup_summary',
    'drill_context',
    'evidence_timeline',
    'validation',
    'advanced_context',
    'safe_sensitivity_setup',
    'next_actions',
]);

export const socialProPublicSectionKeyValues = publicSectionKeyContract.values;
export const socialProPublicSectionKeySchema = publicSectionKeyContract.schema;
export type SocialProPublicSectionKey = z.infer<typeof socialProPublicSectionKeySchema>;
export const isSocialProPublicSectionKey = publicSectionKeyContract.isValue;
export const parseSocialProPublicSectionKey = publicSectionKeyContract.parse;

const requiredHonestyFieldContract = createSocialProEnumContract([
    'confidence',
    'coverage',
    'blockers',
    'inconclusive_state',
    'limited_support',
    'validation_state',
    'no_overclaim_disclaimer',
]);

export const socialProRequiredHonestyFieldValues = requiredHonestyFieldContract.values;
export const socialProRequiredHonestyFieldSchema = requiredHonestyFieldContract.schema;
export type SocialProRequiredHonestyField = z.infer<typeof socialProRequiredHonestyFieldSchema>;
export const isSocialProRequiredHonestyField = requiredHonestyFieldContract.isValue;
export const parseSocialProRequiredHonestyField = requiredHonestyFieldContract.parse;

const libraryItemKindContract = createSocialProEnumContract([
    'report',
    'community_post',
    'setup',
    'drill',
    'program_mission',
    'spray_lab_session',
    'compatible_validation',
]);

export const socialProLibraryItemKindValues = libraryItemKindContract.values;
export const socialProLibraryItemKindSchema = libraryItemKindContract.schema;
export type SocialProLibraryItemKind = z.infer<typeof socialProLibraryItemKindSchema>;
export const isSocialProLibraryItemKind = libraryItemKindContract.isValue;
export const parseSocialProLibraryItemKind = libraryItemKindContract.parse;

const collectionModeContract = createSocialProEnumContract([
    'automatic',
    'manual',
]);

export const socialProCollectionModeValues = collectionModeContract.values;
export const socialProCollectionModeSchema = collectionModeContract.schema;
export type SocialProCollectionMode = z.infer<typeof socialProCollectionModeSchema>;
export const isSocialProCollectionMode = collectionModeContract.isValue;
export const parseSocialProCollectionMode = collectionModeContract.parse;

const safeCreatorMetricKeyContract = createSocialProEnumContract([
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

export const socialProSafeCreatorMetricKeyValues = safeCreatorMetricKeyContract.values;
export const socialProSafeCreatorMetricKeySchema = safeCreatorMetricKeyContract.schema;
export type SocialProSafeCreatorMetricKey = z.infer<typeof socialProSafeCreatorMetricKeySchema>;
export const isSocialProSafeCreatorMetricKey = safeCreatorMetricKeyContract.isValue;
export const parseSocialProSafeCreatorMetricKey = safeCreatorMetricKeyContract.parse;

const reportModerationReasonContract = createSocialProEnumContract([
    'exposicao_indevida',
    'dados_sensiveis',
    'claim_enganosa',
    'falsa_autoridade',
    'abuso_badge_pro',
    'uso_indevido_contexto_premium',
]);

export const socialProReportModerationReasonValues = reportModerationReasonContract.values;
export const socialProReportModerationReasonSchema = reportModerationReasonContract.schema;
export type SocialProReportModerationReason = z.infer<typeof socialProReportModerationReasonSchema>;
export const isSocialProReportModerationReason = reportModerationReasonContract.isValue;
export const parseSocialProReportModerationReason = reportModerationReasonContract.parse;

const badgeMeaningContract = createSocialProEnumContract([
    'active_pro_access',
]);

export const socialProBadgeMeaningValues = badgeMeaningContract.values;
export const socialProBadgeMeaningSchema = badgeMeaningContract.schema;
export type SocialProBadgeMeaning = z.infer<typeof socialProBadgeMeaningSchema>;
export const isSocialProBadgeMeaning = badgeMeaningContract.isValue;
export const parseSocialProBadgeMeaning = badgeMeaningContract.parse;

export interface SocialProReportHonesty {
    readonly confidence: number | null;
    readonly coverage: number | null;
    readonly blockers: readonly string[];
    readonly inconclusiveState: boolean;
    readonly limitedSupport: readonly string[];
    readonly validationState: string;
    readonly noOverclaimDisclaimer: string;
}

export interface SocialProReportPublicSummary {
    readonly title: string;
    readonly whatChanged: string;
    readonly nextAction: string;
}

export interface SocialProReportControls {
    readonly showConfidence: boolean;
    readonly showCoverage: boolean;
    readonly showBlockers: boolean;
    readonly showInconclusiveState: boolean;
    readonly showLimitedSupport: boolean;
    readonly showValidationState: boolean;
    readonly showDisclaimer: boolean;
    readonly showTimeline: boolean;
    readonly visibleOptionalSections: readonly SocialProPublicSectionKey[];
}

export interface SocialProPublicReport {
    readonly id: string;
    readonly visibility: SocialProReportVisibility;
    readonly status: SocialProReportStatus;
    readonly publicSummary: SocialProReportPublicSummary;
    readonly honesty: SocialProReportHonesty;
    readonly controls: SocialProReportControls;
    readonly sections: Partial<Record<SocialProPublicSectionKey, unknown>>;
}
