import {
    socialProPublicSectionKeyValues,
    socialProReportStatusSchema,
    socialProReportVisibilitySchema,
    type SocialProPublicReport,
    type SocialProPublicSectionKey,
    type SocialProReportControls,
    type SocialProReportHonesty,
    type SocialProReportPublicSummary,
} from '@/types/social-pro';

const DEFAULT_NO_OVERCLAIM_DISCLAIMER =
    'Relatorio publico organiza evidencias de treino e validacao sem prometer sensibilidade perfeita, rank ou melhora garantida.';

const DEFAULT_SUMMARY: SocialProReportPublicSummary = {
    title: 'Relatorio Pro Compartilhavel',
    whatChanged: 'Evolucao apresentada com evidencia limitada e contexto publico seguro.',
    nextAction: 'Continuar o fluxo de treino com analise, coach, Spray Lab, Ciclo Pro e validacao compativel.',
};

const publicSectionKeySet = new Set<string>(socialProPublicSectionKeyValues);

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readRecord(value: unknown): Record<string, unknown> {
    return isRecord(value) ? value : {};
}

function readString(value: unknown, fallback: string): string {
    return typeof value === 'string' && value.trim().length > 0 ? value : fallback;
}

function readBoolean(value: unknown, fallback: boolean): boolean {
    return typeof value === 'boolean' ? value : fallback;
}

function readNumber(value: unknown): number | null {
    return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function readStringArray(value: unknown): readonly string[] {
    if (!Array.isArray(value)) {
        return [];
    }

    return value.filter((item): item is string => typeof item === 'string');
}

function clonePublicValue(value: unknown): unknown {
    return JSON.parse(JSON.stringify(value)) as unknown;
}

function readPublicSummary(value: unknown): SocialProReportPublicSummary {
    const summary = readRecord(value);

    return {
        title: readString(summary.title, DEFAULT_SUMMARY.title),
        whatChanged: readString(summary.whatChanged, DEFAULT_SUMMARY.whatChanged),
        nextAction: readString(summary.nextAction, DEFAULT_SUMMARY.nextAction),
    };
}

function readHonesty(value: unknown): SocialProReportHonesty {
    const honesty = readRecord(value);

    return {
        confidence: readNumber(honesty.confidence),
        coverage: readNumber(honesty.coverage),
        blockers: readStringArray(honesty.blockers),
        inconclusiveState: readBoolean(honesty.inconclusiveState, false),
        limitedSupport: readStringArray(honesty.limitedSupport),
        validationState: readString(honesty.validationState, 'validation_not_available'),
        noOverclaimDisclaimer: readString(
            honesty.noOverclaimDisclaimer,
            DEFAULT_NO_OVERCLAIM_DISCLAIMER,
        ),
    };
}

function readOptionalSections(value: unknown): readonly SocialProPublicSectionKey[] {
    if (!Array.isArray(value)) {
        return [];
    }

    return value.filter((item): item is SocialProPublicSectionKey => (
        typeof item === 'string' && publicSectionKeySet.has(item)
    ));
}

export function sanitizeSocialProReportControls(input: Record<string, unknown>): SocialProReportControls {
    return {
        showConfidence: true,
        showCoverage: true,
        showBlockers: true,
        showInconclusiveState: true,
        showLimitedSupport: true,
        showValidationState: true,
        showDisclaimer: true,
        showTimeline: readBoolean(input.showTimeline, true),
        visibleOptionalSections: readOptionalSections(input.visibleOptionalSections),
    };
}

function readPublicSections(value: unknown): SocialProPublicReport['sections'] {
    const sections = readRecord(value);

    return Object.fromEntries(
        Object.entries(sections)
            .filter(([sectionKey]) => publicSectionKeySet.has(sectionKey))
            .map(([sectionKey, sectionValue]) => [
                sectionKey,
                clonePublicValue(sectionValue),
            ]),
    ) as SocialProPublicReport['sections'];
}

export function redactSocialProReportForPublic(input: Record<string, unknown>): SocialProPublicReport {
    const visibilityParse = socialProReportVisibilitySchema.safeParse(input.visibility);
    const statusParse = socialProReportStatusSchema.safeParse(input.status);

    return {
        id: readString(input.id, 'social-pro-report'),
        visibility: visibilityParse.success ? visibilityParse.data : 'public',
        status: statusParse.success ? statusParse.data : 'published',
        publicSummary: readPublicSummary(input.publicSummary),
        honesty: readHonesty(input.honesty),
        controls: sanitizeSocialProReportControls(readRecord(input.controls)),
        sections: readPublicSections(input.sections),
    };
}

function normalizeCopy(copy: string): string {
    return copy
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase();
}

const DISALLOWED_PUBLIC_REPORT_COPY_PATTERNS: readonly RegExp[] = [
    /\bsensibilidade perfeita\b/,
    /\bperfect sensitivity\b/,
    /\bsensibilidade definitiva\b/,
    /\bdefinitive sensitivity\b/,
    /\bmelhora garantida\b/,
    /\bguaranteed improvement\b/,
    /\bresultado garantido\b/,
    /\brank garantido\b/,
    /\bguaranteed rank\b/,
    /\bglobal player grade\b/,
    /\bgrade global\b/,
    /\bpubg oficial\b/,
    /\bofficial pubg\b/,
    /\bkrafton partner\b/,
    /\bparceiro krafton\b/,
    /\bpaid players are better\b/,
    /\bjogadores pagos sao melhores\b/,
    /\bcreator certified by pro payment\b/,
    /\bcriador certificado\b.*\bpagamento pro\b/,
    /\bexclusive pubg api data\b/,
    /\bapi pubg exclusiva\b/,
    /\btdm proves technical improvement\b/,
    /\btdm\b.*\b(prova|confirma|valida)\b.*\b(tecnica|technical improvement)\b/,
];

export function assertSocialProReportCopySafe(copy: string): void {
    const normalized = normalizeCopy(copy);
    const blockedPattern = DISALLOWED_PUBLIC_REPORT_COPY_PATTERNS.find((pattern) => (
        pattern.test(normalized)
    ));

    if (blockedPattern) {
        throw new Error(`Unsafe Social Pro public report copy matched ${blockedPattern}.`);
    }
}
