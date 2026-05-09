import {
    redactSocialProReportForPublic,
} from '@/core/social-pro-report-redaction';
import type {
    SocialProPublicReport,
    SocialProRequiredHonestyField,
} from '@/types/social-pro';

export const socialProEvidenceLayerOrder = [
    'technical_evidence',
    'training_execution',
    'practical_transfer',
    'compatible_validation',
    'blockers',
    'repairs',
    'current_state',
] as const;

export type SocialProEvidenceLayerKind = typeof socialProEvidenceLayerOrder[number];

export type SocialProEvidenceStrength =
    | 'technical'
    | 'execution'
    | 'practical_only'
    | 'validation'
    | 'blocker'
    | 'repair'
    | 'state';

export type SocialProContinuityActionKind =
    | 'update_report'
    | 'save_to_library'
    | 'continue_ciclo_pro'
    | 'open_spray_lab'
    | 'record_validation'
    | 'resolve_blockers';

export interface SocialProReportSourceIds {
    readonly analysisSessionId?: string;
    readonly historySessionId?: string;
    readonly protocolRevisionId?: string;
    readonly sprayLabSessionId?: string;
    readonly trainingProgramCycleId?: string;
    readonly validationLinkId?: string;
}

export interface SocialProReportHonestyRow {
    readonly key: SocialProRequiredHonestyField;
    readonly label: string;
    readonly value: string;
    readonly visible: true;
}

export interface SocialProReportEvidenceLayer {
    readonly kind: SocialProEvidenceLayerKind;
    readonly title: string;
    readonly summary: string;
    readonly evidenceStrength: SocialProEvidenceStrength;
    readonly sourceId: string | null;
}

export interface SocialProReportContinuityAction {
    readonly kind: SocialProContinuityActionKind;
    readonly label: string;
    readonly sourceId: string | null;
    readonly requiresActivePro: boolean;
}

export interface SocialProReportViewModel {
    readonly reportId: string;
    readonly title: string;
    readonly caseLabel: 'Relatorio Pro Compartilhavel';
    readonly visibility: SocialProPublicReport['visibility'];
    readonly status: SocialProPublicReport['status'];
    readonly generatedAt: string | null;
    readonly publicSummary: {
        readonly whatChanged: string;
        readonly evidenceSupport: string;
        readonly blockers: readonly string[];
        readonly nextAction: string;
    };
    readonly requiredHonesty: readonly SocialProReportHonestyRow[];
    readonly evidenceLayers: readonly SocialProReportEvidenceLayer[];
    readonly continuityActions: readonly SocialProReportContinuityAction[];
}

export interface BuildSocialProReportViewModelInput {
    readonly report: SocialProPublicReport | Record<string, unknown>;
    readonly sourceIds?: SocialProReportSourceIds;
    readonly generatedAt?: string;
}

interface TimelineEntry {
    readonly layer: SocialProEvidenceLayerKind;
    readonly title: string;
    readonly summary: string;
    readonly sourceId: string | null;
}

const HONESTY_LABELS: Record<SocialProRequiredHonestyField, string> = {
    confidence: 'Confianca',
    coverage: 'Cobertura',
    blockers: 'Bloqueios',
    inconclusive_state: 'Estado inconclusivo',
    limited_support: 'Suporte limitado',
    validation_state: 'Validacao',
    no_overclaim_disclaimer: 'Aviso sem overclaim',
};

const EVIDENCE_STRENGTH_BY_LAYER: Record<SocialProEvidenceLayerKind, SocialProEvidenceStrength> = {
    technical_evidence: 'technical',
    training_execution: 'execution',
    practical_transfer: 'practical_only',
    compatible_validation: 'validation',
    blockers: 'blocker',
    repairs: 'repair',
    current_state: 'state',
};

const DEFAULT_LAYER_COPY: Record<SocialProEvidenceLayerKind, {
    readonly title: string;
    readonly summary: string;
}> = {
    technical_evidence: {
        title: 'Analise tecnica',
        summary: 'Evidencia tecnica resumida pelo snapshot publico seguro.',
    },
    training_execution: {
        title: 'Execucao de treino',
        summary: 'Protocolos e Spray Lab aparecem como execucao auditavel, nao como prova tecnica isolada.',
    },
    practical_transfer: {
        title: 'Transferencia pratica',
        summary: 'Partida ou TDM conta como transferencia pratica e nao substitui validacao compativel.',
    },
    compatible_validation: {
        title: 'Validacao compativel',
        summary: 'Validacao compativel continua sendo o caminho de prova tecnica.',
    },
    blockers: {
        title: 'Bloqueios e limites',
        summary: 'Sem bloqueios adicionais alem dos campos obrigatorios de honestidade.',
    },
    repairs: {
        title: 'Reparos',
        summary: 'Reparos preservam contexto quando captura, fidelidade ou variaveis mudam.',
    },
    current_state: {
        title: 'Estado atual',
        summary: 'Estado atual resumido sem expor historico privado completo.',
    },
};

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readString(value: unknown): string | null {
    return typeof value === 'string' && value.trim().length > 0 ? value : null;
}

function formatPercent(value: number | null): string {
    return value === null ? 'Nao disponivel' : `${Math.round(value * 100)}%`;
}

function readTimelineEntry(value: unknown): TimelineEntry | null {
    if (!isRecord(value)) {
        return null;
    }

    const layer = readString(value.layer);

    if (!layer || !socialProEvidenceLayerOrder.includes(layer as SocialProEvidenceLayerKind)) {
        return null;
    }

    return {
        layer: layer as SocialProEvidenceLayerKind,
        title: readString(value.title) ?? DEFAULT_LAYER_COPY[layer as SocialProEvidenceLayerKind].title,
        summary: readString(value.summary) ?? DEFAULT_LAYER_COPY[layer as SocialProEvidenceLayerKind].summary,
        sourceId: readString(value.sourceId),
    };
}

function readTimeline(report: SocialProPublicReport): readonly TimelineEntry[] {
    const timeline = report.sections.evidence_timeline;

    if (!Array.isArray(timeline)) {
        return [];
    }

    return timeline.flatMap((entry) => {
        const parsed = readTimelineEntry(entry);

        return parsed ? [parsed] : [];
    });
}

function sourceIdForLayer(
    kind: SocialProEvidenceLayerKind,
    sourceIds: SocialProReportSourceIds,
): string | null {
    switch (kind) {
        case 'technical_evidence':
            return sourceIds.analysisSessionId ?? sourceIds.historySessionId ?? null;
        case 'training_execution':
            return sourceIds.sprayLabSessionId ?? sourceIds.protocolRevisionId ?? null;
        case 'compatible_validation':
            return sourceIds.validationLinkId ?? null;
        case 'repairs':
            return sourceIds.protocolRevisionId ?? null;
        case 'current_state':
            return sourceIds.trainingProgramCycleId ?? null;
        case 'practical_transfer':
        case 'blockers':
            return null;
    }
}

function buildHonestyRows(report: SocialProPublicReport): readonly SocialProReportHonestyRow[] {
    const blockers = report.honesty.blockers.length > 0
        ? report.honesty.blockers.join(' | ')
        : 'Sem blocker publico informado.';
    const limitedSupport = report.honesty.limitedSupport.length > 0
        ? report.honesty.limitedSupport.join(' | ')
        : 'Sem limite adicional informado.';

    return [
        {
            key: 'confidence',
            label: HONESTY_LABELS.confidence,
            value: formatPercent(report.honesty.confidence),
            visible: true,
        },
        {
            key: 'coverage',
            label: HONESTY_LABELS.coverage,
            value: formatPercent(report.honesty.coverage),
            visible: true,
        },
        {
            key: 'blockers',
            label: HONESTY_LABELS.blockers,
            value: blockers,
            visible: true,
        },
        {
            key: 'inconclusive_state',
            label: HONESTY_LABELS.inconclusive_state,
            value: report.honesty.inconclusiveState ? 'Inconclusivo' : 'Nao inconclusivo',
            visible: true,
        },
        {
            key: 'limited_support',
            label: HONESTY_LABELS.limited_support,
            value: limitedSupport,
            visible: true,
        },
        {
            key: 'validation_state',
            label: HONESTY_LABELS.validation_state,
            value: report.honesty.validationState,
            visible: true,
        },
        {
            key: 'no_overclaim_disclaimer',
            label: HONESTY_LABELS.no_overclaim_disclaimer,
            value: report.honesty.noOverclaimDisclaimer,
            visible: true,
        },
    ];
}

function buildEvidenceLayers(
    report: SocialProPublicReport,
    sourceIds: SocialProReportSourceIds,
): readonly SocialProReportEvidenceLayer[] {
    const timelineByLayer = new Map(readTimeline(report).map((entry) => [entry.layer, entry]));

    return socialProEvidenceLayerOrder.map((kind) => {
        const timelineEntry = timelineByLayer.get(kind);
        const defaultCopy = DEFAULT_LAYER_COPY[kind];
        const summary = kind === 'blockers' && report.honesty.blockers.length > 0
            ? report.honesty.blockers.join(' | ')
            : timelineEntry?.summary ?? defaultCopy.summary;

        return {
            kind,
            title: timelineEntry?.title ?? defaultCopy.title,
            summary,
            evidenceStrength: EVIDENCE_STRENGTH_BY_LAYER[kind],
            sourceId: timelineEntry?.sourceId ?? sourceIdForLayer(kind, sourceIds),
        };
    });
}

function buildContinuityActions(
    report: SocialProPublicReport,
    sourceIds: SocialProReportSourceIds,
): readonly SocialProReportContinuityAction[] {
    const actions: SocialProReportContinuityAction[] = [
        {
            kind: 'update_report',
            label: 'Atualizar relatorio seguro',
            sourceId: report.id,
            requiresActivePro: true,
        },
        {
            kind: 'save_to_library',
            label: 'Salvar na biblioteca Pro',
            sourceId: report.id,
            requiresActivePro: true,
        },
    ];

    if (sourceIds.trainingProgramCycleId) {
        actions.push({
            kind: 'continue_ciclo_pro',
            label: 'Continuar Ciclo Pro',
            sourceId: sourceIds.trainingProgramCycleId,
            requiresActivePro: true,
        });
    }

    if (sourceIds.sprayLabSessionId) {
        actions.push({
            kind: 'open_spray_lab',
            label: 'Abrir Spray Lab',
            sourceId: sourceIds.sprayLabSessionId,
            requiresActivePro: true,
        });
    }

    if (sourceIds.validationLinkId) {
        actions.push({
            kind: 'record_validation',
            label: 'Registrar validacao compativel',
            sourceId: sourceIds.validationLinkId,
            requiresActivePro: true,
        });
    }

    if (report.honesty.blockers.length > 0) {
        actions.push({
            kind: 'resolve_blockers',
            label: 'Resolver blockers antes de overclaim',
            sourceId: report.id,
            requiresActivePro: true,
        });
    }

    return actions;
}

export function buildSocialProReportViewModel(
    input: BuildSocialProReportViewModelInput,
): SocialProReportViewModel {
    const report = redactSocialProReportForPublic(input.report as Record<string, unknown>);
    const sourceIds = input.sourceIds ?? {};

    return {
        reportId: report.id,
        title: report.publicSummary.title,
        caseLabel: 'Relatorio Pro Compartilhavel',
        visibility: report.visibility,
        status: report.status,
        generatedAt: input.generatedAt ?? null,
        publicSummary: {
            whatChanged: report.publicSummary.whatChanged,
            evidenceSupport: `Confianca ${formatPercent(report.honesty.confidence)} com cobertura ${formatPercent(report.honesty.coverage)}.`,
            blockers: report.honesty.blockers,
            nextAction: report.publicSummary.nextAction,
        },
        requiredHonesty: buildHonestyRows(report),
        evidenceLayers: buildEvidenceLayers(report, sourceIds),
        continuityActions: buildContinuityActions(report, sourceIds),
    };
}
