import type {
    AnalysisResult,
    CoachProtocolOutcome,
    CompleteTrainingProtocol,
} from '@/types/engine';
import type { SprayLabCoachHandoff } from '@/core/spray-lab-coach-handoff';

export interface HistoryProtocolRevisionInput {
    readonly revisionReason: string;
    readonly tierDirection: 'stronger' | 'same' | 'more_conservative';
    readonly changedFields: readonly string[] | Record<string, unknown>;
    readonly createdAt: Date | string;
}

export interface HistoryProtocolTransferInput {
    readonly situation: string;
    readonly weaponId?: string | null;
    readonly opticId?: string | null;
    readonly approximateDistanceMeters?: number | null;
    readonly pressureLevel: string;
    readonly feltControl: string;
    readonly result: string;
    readonly countsAsTechnicalValidation: false;
    readonly createdAt: Date | string;
}

export interface HistoryProtocolSnapshotCard {
    readonly title: string;
    readonly version: CompleteTrainingProtocol['version'];
    readonly tier: CompleteTrainingProtocol['tier'];
    readonly tierLabel: string;
    readonly drillId: CompleteTrainingProtocol['drillId'];
    readonly savedAt: string;
    readonly focus: string;
    readonly duration: string;
}

export interface HistoryProtocolOutcomeCard {
    readonly status: CoachProtocolOutcome['status'] | 'pending';
    readonly statusLabel: string;
    readonly evidenceStrength: CoachProtocolOutcome['evidenceStrength'] | 'none';
    readonly pending: boolean;
    readonly needsCompatibleValidation: boolean;
    readonly conflictCopy: string | null;
}

export interface HistoryProtocolValidationCard {
    readonly title: 'Validacao compativel';
    readonly checklist: readonly string[];
    readonly successCriteria: readonly string[];
    readonly nextClipCopy: string;
}

export interface HistoryProtocolTransferCard {
    readonly title: 'Transferencia em partida/TDM';
    readonly checklist: readonly string[];
    readonly latestRecord: {
        readonly situation: string;
        readonly result: string;
        readonly createdAt: string;
        readonly countsAsTechnicalValidation: false;
    } | null;
    readonly countsAsTechnicalValidationCopy: string;
}

export interface HistoryProtocolRevisionRow {
    readonly revisionReason: string;
    readonly tierDirection: 'stronger' | 'same' | 'more_conservative';
    readonly changedFieldsLabel: string;
    readonly createdAt: string;
}

export interface HistoryProtocolAuditRow {
    readonly label: string;
    readonly value: string;
}

export interface HistoryProtocolSprayLabCard {
    readonly title: 'Spray Lab';
    readonly contextLabel: string;
    readonly fidelityLabel: string;
    readonly indexLabel: string;
    readonly validationLabel: string;
    readonly transferLabel: string;
    readonly nextActionLabel: string;
    readonly nextActionHref: string;
    readonly blockerReasons: readonly string[];
}

export interface HistoryProtocolViewModel {
    readonly snapshotCard: HistoryProtocolSnapshotCard;
    readonly outcomeCard: HistoryProtocolOutcomeCard;
    readonly validationCard: HistoryProtocolValidationCard;
    readonly transferCard: HistoryProtocolTransferCard;
    readonly revisionTimeline: readonly HistoryProtocolRevisionRow[];
    readonly sprayLabCard: HistoryProtocolSprayLabCard | null;
    readonly auditRows: readonly HistoryProtocolAuditRow[];
}

export function buildHistoryProtocolViewModel(input: {
    readonly result: AnalysisResult;
    readonly savedAt?: Date | string;
    readonly outcomes?: readonly CoachProtocolOutcome[];
    readonly revisions?: readonly HistoryProtocolRevisionInput[];
    readonly transfers?: readonly HistoryProtocolTransferInput[];
    readonly sprayLabHandoff?: SprayLabCoachHandoff | null;
    readonly canSeeFullProtocol?: boolean;
}): HistoryProtocolViewModel | null {
    const protocol = input.result.coachPlan?.completeProtocol;

    if (!protocol) {
        return null;
    }

    const outcomes = input.outcomes ?? [];
    const latestOutcome = outcomes.at(-1) ?? null;
    const transfers = input.transfers ?? [];
    const latestTransfer = transfers.at(-1) ?? null;
    const blockerReasons = Array.from(new Set([
        ...(input.result.coachDecisionSnapshot?.blockerReasons ?? []),
        ...(input.result.mastery?.blockedRecommendations ?? []),
        protocol.downgrade.userCopy,
    ].filter((reason) => reason.trim().length > 0)));
    const supportLimitations = Array.from(new Set([
        protocol.context.limitedSupportReason,
        ...protocol.context.limitationReasons,
    ].filter((reason): reason is string => typeof reason === 'string' && reason.length > 0)));

    return {
        snapshotCard: {
            title: protocol.title,
            version: protocol.version,
            tier: protocol.tier,
            tierLabel: formatProtocolTier(protocol.tier),
            drillId: protocol.drillId,
            savedAt: formatDate(input.savedAt ?? protocol.audit.createdAt),
            focus: formatFocus(protocol.audit.primaryFocusArea),
            duration: `${protocol.dose.durationMinutes} min`,
        },
        outcomeCard: {
            status: latestOutcome?.status ?? 'pending',
            statusLabel: latestOutcome ? formatOutcomeStatus(latestOutcome.status) : 'Resultado pendente',
            evidenceStrength: latestOutcome?.evidenceStrength ?? 'none',
            pending: !latestOutcome || latestOutcome.status === 'started' || latestOutcome.status === 'completed',
            needsCompatibleValidation: latestOutcome?.evidenceStrength !== 'confirmed_by_compatible_clip',
            conflictCopy: latestOutcome?.conflict?.nextValidationCopy ?? null,
        },
        validationCard: {
            title: 'Validacao compativel',
            checklist: protocol.validation.compatibleClipChecklist,
            successCriteria: protocol.validation.successCriteria,
            nextClipCopy: protocol.validation.nextClipCopy,
        },
        transferCard: {
            title: 'Transferencia em partida/TDM',
            checklist: protocol.transfer.situationChecklist,
            latestRecord: latestTransfer ? {
                situation: latestTransfer.situation,
                result: latestTransfer.result,
                createdAt: formatDate(latestTransfer.createdAt),
                countsAsTechnicalValidation: latestTransfer.countsAsTechnicalValidation,
            } : null,
            countsAsTechnicalValidationCopy: 'Transferencia em partida/TDM nao conta como validacao tecnica; ela confirma transferencia pratica depois do clip compativel.',
        },
        revisionTimeline: (input.revisions ?? []).map((revision) => ({
            revisionReason: revision.revisionReason,
            tierDirection: revision.tierDirection,
            changedFieldsLabel: formatChangedFields(revision.changedFields),
            createdAt: formatDate(revision.createdAt),
        })),
        sprayLabCard: input.sprayLabHandoff ? {
            title: 'Spray Lab',
            contextLabel: input.sprayLabHandoff.contextLabel,
            fidelityLabel: input.sprayLabHandoff.fidelityTier
                ? `${formatSprayLabFidelityTier(input.sprayLabHandoff.fidelityTier)} / ${formatSprayLabEvidenceLevel(input.sprayLabHandoff.evidenceLevel)}`
                : formatSprayLabEvidenceLevel(input.sprayLabHandoff.evidenceLevel),
            indexLabel: formatSprayLabIndex(input.sprayLabHandoff),
            validationLabel: input.sprayLabHandoff.compatibleClipProof.label,
            transferLabel: input.sprayLabHandoff.practicalTransfer.label,
            nextActionLabel: input.sprayLabHandoff.nextAction.label,
            nextActionHref: input.sprayLabHandoff.nextAction.href,
            blockerReasons: input.sprayLabHandoff.blockerReasons,
        } : null,
        auditRows: [
            { label: 'Downgrade codes', value: protocol.downgrade.reasons.join(', ') || 'sem downgrade' },
            { label: 'Blocker reasons', value: blockerReasons.join(' | ') || 'sem bloqueio ativo' },
            { label: 'Support limitations', value: supportLimitations.join(', ') || 'suporte completo para esta ficha' },
            { label: 'Confidence/Coverage', value: `${formatPercent(protocol.audit.confidence)} / ${formatPercent(protocol.audit.coverage)}` },
            {
                label: 'Free/Pro state',
                value: input.canSeeFullProtocol === false
                    ? 'Free ve resumo; Pro mostra auditoria, revisoes, validacao e transferencia completas.'
                    : 'Protocolo completo visivel com auditoria tecnica.',
            },
        ],
    };
}

function formatSprayLabFidelityTier(tier: NonNullable<SprayLabCoachHandoff['fidelityTier']>): string {
    switch (tier) {
        case 'strong':
            return 'forte';
        case 'usable':
            return 'util';
        case 'practice_only':
            return 'pratica';
        case 'invalid_for_benchmark':
            return 'fora do benchmark';
    }
}

function formatSprayLabEvidenceLevel(level: SprayLabCoachHandoff['evidenceLevel']): string {
    switch (level) {
        case 'validated_benchmark':
            return 'benchmark validado';
        case 'provisional_benchmark':
            return 'benchmark provisorio';
        case 'weak_execution':
            return 'execucao fraca';
        case 'practice':
            return 'pratica';
    }
}

function formatSprayLabIndex(handoff: SprayLabCoachHandoff): string {
    if (handoff.validatedScore !== null) {
        return `validado ${handoff.validatedScore}/100`;
    }

    if (handoff.provisionalScore !== null) {
        return `provisorio ${handoff.provisionalScore}/100`;
    }

    return 'indice pendente';
}

function formatProtocolTier(tier: CompleteTrainingProtocol['tier']): string {
    switch (tier) {
        case 'capture_again':
            return 'Recapturar';
        case 'test_protocol':
            return 'Teste controlado';
        case 'stabilize_block':
            return 'Estabilizacao';
        case 'apply_protocol':
            return 'Aplicar e validar';
    }
}

function formatFocus(area: CompleteTrainingProtocol['audit']['primaryFocusArea']): string {
    switch (area) {
        case 'capture_quality':
            return 'Qualidade da captura';
        case 'vertical_control':
            return 'Controle vertical';
        case 'horizontal_control':
            return 'Controle horizontal';
        case 'timing':
            return 'Timing';
        case 'consistency':
            return 'Consistencia';
        case 'sensitivity':
            return 'Sensibilidade';
        case 'loadout':
            return 'Loadout';
        case 'validation':
            return 'Validacao';
    }
}

function formatOutcomeStatus(status: CoachProtocolOutcome['status']): string {
    switch (status) {
        case 'started':
            return 'Comecou o bloco';
        case 'completed':
            return 'Completou sem medir';
        case 'improved':
            return 'Melhorou - relato';
        case 'unchanged':
            return 'Ficou igual';
        case 'worse':
            return 'Piorou no treino';
        case 'invalid_capture':
            return 'Captura invalida';
        case 'fatigue_or_pain':
            return 'Dor ou fadiga';
        case 'confused':
            return 'Protocolo confuso';
        case 'variable_changed':
            return 'Variavel mudou';
    }
}

function formatChangedFields(value: readonly string[] | Record<string, unknown>): string {
    if (Array.isArray(value)) {
        return value.join(', ') || 'sem campo declarado';
    }

    return Object.keys(value).join(', ') || 'payload auditavel';
}

function formatDate(value: Date | string): string {
    return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function formatPercent(value: number): string {
    return `${Math.round(value * 100)}%`;
}
