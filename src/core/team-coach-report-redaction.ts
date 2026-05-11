import type { TeamCoachHonestyFields } from '@/types/team-coach';

export const teamCoachRequiredHonestyFieldValues = [
    'confidence',
    'coverage',
    'blockers',
    'inconclusive_state',
    'limited_support',
    'validation_state',
    'no_overclaim_disclaimer',
] as const;

export const teamCoachSafeSectionKeyValues = [
    'technical_proof',
    'training_execution',
    'practical_transfer',
    'compatible_validation',
    'blockers',
    'repairs',
    'coach_notes',
    'current_state',
] as const;

export type TeamCoachRequiredHonestyField = typeof teamCoachRequiredHonestyFieldValues[number];
export type TeamCoachSafeSectionKey = typeof teamCoachSafeSectionKeyValues[number];

export interface TeamCoachReportControls {
    readonly showConfidence: true;
    readonly showCoverage: true;
    readonly showBlockers: true;
    readonly showInconclusiveState: true;
    readonly showLimitedSupport: true;
    readonly showValidationState: true;
    readonly showDisclaimer: true;
    readonly showCoachNotes: boolean;
    readonly showAuditMetadata: boolean;
    readonly showSourceList: boolean;
    readonly visibleSections: readonly TeamCoachSafeSectionKey[];
}

export interface TeamCoachSafeReportSnapshot {
    readonly id: string;
    readonly snapshotVersion: 1;
    readonly sourceSummary: Record<string, unknown>;
    readonly honesty: TeamCoachHonestyFields;
    readonly controls: TeamCoachReportControls;
    readonly requiredHonestyFields: readonly TeamCoachRequiredHonestyField[];
    readonly sections: Partial<Record<TeamCoachSafeSectionKey, unknown>>;
    readonly generatedAt: string | null;
    readonly [key: string]: unknown;
}

const DEFAULT_NO_OVERCLAIM_DISCLAIMER =
    'Team Review Packet organizes limited evidence for coach review without certification, rank proof, perfect sensitivity, or guaranteed improvement.';

const DEFAULT_VISIBLE_SECTIONS: readonly TeamCoachSafeSectionKey[] = teamCoachSafeSectionKeyValues;

const SAFE_SOURCE_SUMMARY_KEYS = new Set([
    'analysisSessionId',
    'historySessionId',
    'protocolRevisionId',
    'sprayLabSessionId',
    'trainingProgramCycleId',
    'validationLinkId',
    'playerLabel',
    'playerDisplayName',
    'teamRole',
    'weapon',
    'weaponId',
    'weaponName',
    'optic',
    'opticId',
    'distanceMeters',
    'patchVersion',
    'createdAt',
    'contextLabel',
    'currentState',
    'reviewStatus',
    'requestedNextAction',
]);

const FORBIDDEN_NESTED_KEYS = new Set([
    'account',
    'accountData',
    'adminNote',
    'adminNotes',
    'billing',
    'billingState',
    'bodyMetrics',
    'customerId',
    'email',
    'frameData',
    'frames',
    'health',
    'healthDetail',
    'hiddenHistory',
    'invoice',
    'invoiceId',
    'painHistory',
    'payment',
    'paymentMetadata',
    'privateAccountData',
    'privateAdminNotes',
    'privateCollections',
    'privateHistory',
    'privateLinks',
    'privateNotes',
    'privateReaders',
    'rawAnalysis',
    'rawAnalysisPayload',
    'rawFrameData',
    'rawVideo',
    'readerIdentity',
    'sensitivePreparation',
    'stripeCustomerId',
    'supportNote',
    'supportNotes',
    'token',
    'video',
]);

const sectionKeySet = new Set<string>(teamCoachSafeSectionKeyValues);

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readRecord(value: unknown): Record<string, unknown> {
    return isRecord(value) ? value : {};
}

function readString(value: unknown, fallback: string): string {
    return typeof value === 'string' && value.trim().length > 0 ? value : fallback;
}

function readOptionalString(value: unknown): string | null {
    return typeof value === 'string' && value.trim().length > 0 ? value : null;
}

function readBoolean(value: unknown, fallback: boolean): boolean {
    return typeof value === 'boolean' ? value : fallback;
}

function readNumber(value: unknown): number | null {
    return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function readStringArray(value: unknown): readonly string[] {
    return Array.isArray(value)
        ? value.filter((item): item is string => typeof item === 'string')
        : [];
}

function isForbiddenKey(key: string): boolean {
    return FORBIDDEN_NESTED_KEYS.has(key)
        || /token/i.test(key)
        || /secret/i.test(key)
        || /stripe/i.test(key)
        || /payment/i.test(key)
        || /billing/i.test(key)
        || /^raw/i.test(key)
        || /^private/i.test(key);
}

function cloneTeamSafeValue(value: unknown): unknown {
    if (Array.isArray(value)) {
        return value
            .map(cloneTeamSafeValue)
            .filter((item) => item !== undefined);
    }

    if (isRecord(value)) {
        return Object.fromEntries(
            Object.entries(value)
                .filter(([key]) => !isForbiddenKey(key))
                .map(([key, nestedValue]) => [key, cloneTeamSafeValue(nestedValue)])
                .filter((entry): entry is [string, unknown] => entry[1] !== undefined),
        );
    }

    if (
        typeof value === 'string'
        || typeof value === 'number'
        || typeof value === 'boolean'
        || value === null
    ) {
        return value;
    }

    return undefined;
}

function readHonesty(value: unknown): TeamCoachHonestyFields {
    const honesty = readRecord(value);
    const confidence = readNumber(honesty.confidence);
    const coverage = readNumber(honesty.coverage);

    return {
        confidence,
        coverage,
        blockers: readStringArray(honesty.blockers),
        inconclusiveState: readBoolean(
            honesty.inconclusiveState,
            confidence === null || coverage === null,
        ),
        limitedSupport: readStringArray(honesty.limitedSupport),
        validationState: readString(honesty.validationState, 'validation_not_available'),
        noOverclaimDisclaimer: readString(
            honesty.noOverclaimDisclaimer,
            DEFAULT_NO_OVERCLAIM_DISCLAIMER,
        ),
    };
}

function readVisibleSections(value: unknown): readonly TeamCoachSafeSectionKey[] {
    if (!Array.isArray(value)) {
        return DEFAULT_VISIBLE_SECTIONS;
    }

    const parsed = value.filter((item): item is TeamCoachSafeSectionKey => (
        typeof item === 'string' && sectionKeySet.has(item)
    ));

    return parsed.length > 0 ? parsed : DEFAULT_VISIBLE_SECTIONS;
}

export function sanitizeTeamCoachReportControls(input: Record<string, unknown>): TeamCoachReportControls {
    return {
        showConfidence: true,
        showCoverage: true,
        showBlockers: true,
        showInconclusiveState: true,
        showLimitedSupport: true,
        showValidationState: true,
        showDisclaimer: true,
        showCoachNotes: readBoolean(input.showCoachNotes, true),
        showAuditMetadata: readBoolean(input.showAuditMetadata, true),
        showSourceList: readBoolean(input.showSourceList, true),
        visibleSections: readVisibleSections(input.visibleSections),
    };
}

function readSourceSummary(value: unknown): Record<string, unknown> {
    const sourceSummary = readRecord(value);

    return Object.fromEntries(
        Object.entries(sourceSummary)
            .filter(([key]) => SAFE_SOURCE_SUMMARY_KEYS.has(key))
            .map(([key, nestedValue]) => [key, cloneTeamSafeValue(nestedValue)])
            .filter((entry): entry is [string, unknown] => entry[1] !== undefined),
    );
}

function readSections(value: unknown): Partial<Record<TeamCoachSafeSectionKey, unknown>> {
    const sections = readRecord(value);

    return Object.fromEntries(
        teamCoachSafeSectionKeyValues
            .filter((sectionKey) => sections[sectionKey] !== undefined)
            .map((sectionKey) => [sectionKey, cloneTeamSafeValue(sections[sectionKey])])
            .filter((entry): entry is [TeamCoachSafeSectionKey, unknown] => entry[1] !== undefined),
    );
}

export function redactTeamCoachReportForWorkspace(
    input: Record<string, unknown>,
): TeamCoachSafeReportSnapshot {
    return {
        id: readString(input.id, 'team-coach-report'),
        snapshotVersion: 1,
        sourceSummary: readSourceSummary(input.sourceSummary),
        honesty: readHonesty(input.honesty),
        controls: sanitizeTeamCoachReportControls(readRecord(input.controls)),
        requiredHonestyFields: teamCoachRequiredHonestyFieldValues,
        sections: readSections(input.sections),
        generatedAt: readOptionalString(input.generatedAt),
    };
}

function normalizeCopy(copy: string): string {
    return copy
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase();
}

const DISALLOWED_TEAM_REPORT_COPY_PATTERNS: readonly RegExp[] = [
    /\bcoach certificado\b/,
    /\bcertificacao\b/,
    /\bcertification\b/,
    /\bcertified coach\b/,
    /\brank proof\b/,
    /\bprova de rank\b/,
    /\brank garantido\b/,
    /\bguaranteed rank\b/,
    /\bmelhora garantida\b/,
    /\bguaranteed improvement\b/,
    /\bsens perfeita\b/,
    /\bsensibilidade perfeita\b/,
    /\bperfect sensitivity\b/,
    /\bglobal player grade\b/,
    /\bgrade global\b/,
    /\bpubg oficial\b/,
    /\bofficial pubg\b/,
    /\bkrafton partner\b/,
    /\bparceiro krafton\b/,
    /\bexclusive pubg api data\b/,
    /\bapi pubg exclusiva\b/,
];

export function assertTeamCoachReportCopySafe(copy: string): void {
    const normalized = normalizeCopy(copy);
    const blockedPattern = DISALLOWED_TEAM_REPORT_COPY_PATTERNS.find((pattern) => (
        pattern.test(normalized)
    ));

    if (blockedPattern) {
        throw new Error(`Unsafe Team Coach report copy matched ${blockedPattern}.`);
    }
}
