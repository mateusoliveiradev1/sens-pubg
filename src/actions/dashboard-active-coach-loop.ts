import type {
    AnalysisResult,
    CoachProtocolOutcomeStatus,
    CompleteTrainingProtocol,
} from '@/types/engine';

export type DashboardActiveCoachLoopStatus =
    | 'pending'
    | 'started'
    | 'completed'
    | 'validation_needed'
    | 'conflict';

export const DASHBOARD_PROTOCOL_EVIDENCE_HIERARCHY_LABEL = 'Resultado registra execucao; clip compativel valida tecnica; partida/TDM valida transferencia pratica.';

export interface DashboardActiveCompleteProtocol {
    readonly protocolTitle: string;
    readonly protocolTier: CompleteTrainingProtocol['tier'];
    readonly durationLabel: string;
    readonly environmentLabel: string;
    readonly primaryFocusTitle: string;
    readonly nextCompatibleClipChecklist: readonly string[];
    readonly repairActionLabel: string | null;
    readonly transferPromptLabel: string;
    readonly safetyStopLabel: string | null;
    readonly evidenceHierarchyLabel: typeof DASHBOARD_PROTOCOL_EVIDENCE_HIERARCHY_LABEL;
}

export interface DashboardActiveCoachLoop {
    readonly sessionId: string;
    readonly status: DashboardActiveCoachLoopStatus;
    readonly statusLabel: string;
    readonly body: string;
    readonly ctaLabel: 'Continuar protocolo' | 'Gravar validacao compativel';
    readonly ctaHref: string;
    readonly primaryFocusTitle: string;
    readonly nextBlockTitle: string;
    readonly completeProtocol: DashboardActiveCompleteProtocol | null;
    readonly memorySummary: string | null;
    readonly updatedAt: string;
}

function formatCoachOutcomeStatus(status: CoachProtocolOutcomeStatus): string {
    switch (status) {
        case 'started':
            return 'Bloco iniciado';
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

function toIsoDate(value: Date | string): string {
    return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function formatProtocolEnvironment(environment: CompleteTrainingProtocol['environment']): string {
    switch (environment) {
        case 'training_mode':
            return 'Training Mode';
        case 'training_mode_custom':
            return 'Training Mode custom';
        case 'ugc_range':
            return 'UGC experimental';
        case 'aim_sound_lab':
            return 'Aim/Sound Lab';
        case 'tdm_warmup':
            return 'TDM warmup';
        case 'real_match_transfer':
            return 'Partida/TDM';
        case 'future_spray_lab':
            return 'Spray Lab futuro';
    }
}

function buildCompatibleChecklist(protocol: CompleteTrainingProtocol): readonly string[] {
    const checklist = [...protocol.validation.compatibleClipChecklist];
    const successCriterion = protocol.validation.successCriteria[0];

    if (successCriterion && !checklist.includes(successCriterion)) {
        checklist.push(successCriterion);
    }

    return checklist;
}

function buildSafetyStopLabel(protocol: CompleteTrainingProtocol): string | null {
    const stopRule = protocol.preparation.find((item) => (
        item.safetyKind === 'stop_rule'
        || /dor|fadiga|dormencia|formigamento/i.test(`${item.label} ${item.reason}`)
    ));

    if (!stopRule) {
        return null;
    }

    return `${stopRule.label}: dor, formigamento ou dormencia interrompe o bloco.`;
}

function buildDashboardCompleteProtocol(
    protocol: CompleteTrainingProtocol | undefined,
    primaryFocusTitle: string,
): DashboardActiveCompleteProtocol | null {
    if (!protocol) {
        return null;
    }

    return {
        protocolTitle: protocol.title,
        protocolTier: protocol.tier,
        durationLabel: `${protocol.dose.durationMinutes} min`,
        environmentLabel: formatProtocolEnvironment(protocol.environment),
        primaryFocusTitle,
        nextCompatibleClipChecklist: buildCompatibleChecklist(protocol),
        repairActionLabel: protocol.downgrade.reasons.length > 0
            ? protocol.downgrade.repairCtas[0] ?? protocol.downgrade.userCopy
            : null,
        transferPromptLabel: protocol.transfer.conservativeConfidenceCopy,
        safetyStopLabel: buildSafetyStopLabel(protocol),
        evidenceHierarchyLabel: DASHBOARD_PROTOCOL_EVIDENCE_HIERARCHY_LABEL,
    };
}

export function buildDashboardActiveCoachLoop(input: {
    readonly sessionId: string | null;
    readonly result: AnalysisResult | null;
    readonly latestOutcome?: {
        readonly status: CoachProtocolOutcomeStatus;
        readonly evidenceStrength: string;
        readonly conflictPayload: unknown;
        readonly createdAt: Date;
    } | null;
}): DashboardActiveCoachLoop | null {
    const coachPlan = input.result?.coachPlan;

    if (!input.sessionId || !coachPlan) {
        return null;
    }

    const latestOutcome = input.latestOutcome ?? null;
    const hasConflict = Boolean(latestOutcome?.conflictPayload) || latestOutcome?.evidenceStrength === 'conflict';
    const memorySummary = input.result?.coachDecisionSnapshot?.memorySummary
        ?? input.result?.coachDecisionSnapshot?.outcomeMemory.summary
        ?? null;
    const completeProtocol = buildDashboardCompleteProtocol(
        coachPlan.completeProtocol,
        coachPlan.primaryFocus.title,
    );

    if (!latestOutcome) {
        return {
            sessionId: input.sessionId,
            status: 'pending',
            statusLabel: 'Protocolo pendente',
            body: 'Execute o bloco curto e registre o resultado antes do coach usar esse sinal como memoria.',
            ctaLabel: 'Continuar protocolo',
            ctaHref: `/history/${input.sessionId}`,
            primaryFocusTitle: coachPlan.primaryFocus.title,
            nextBlockTitle: coachPlan.nextBlock.title,
            completeProtocol,
            memorySummary,
            updatedAt: toIsoDate(input.result.timestamp),
        };
    }

    if (hasConflict) {
        return {
            sessionId: input.sessionId,
            status: 'conflict',
            statusLabel: 'Resultado em conflito',
            body: 'Outcome e validacao compativel discordam. Grave uma validacao curta antes de avancar ou aplicar protocolo mais forte.',
            ctaLabel: 'Gravar validacao compativel',
            ctaHref: '/analyze',
            primaryFocusTitle: coachPlan.primaryFocus.title,
            nextBlockTitle: coachPlan.nextBlock.title,
            completeProtocol,
            memorySummary,
            updatedAt: latestOutcome.createdAt.toISOString(),
        };
    }

    if (latestOutcome.status === 'started' || latestOutcome.status === 'completed') {
        return {
            sessionId: input.sessionId,
            status: latestOutcome.status,
            statusLabel: formatCoachOutcomeStatus(latestOutcome.status),
            body: latestOutcome.status === 'completed'
                ? 'Voce completou o bloco, mas ainda falta dizer o efeito. Feche o resultado antes do coach ficar mais agressivo.'
                : 'Bloco iniciado. Feche o resultado quando terminar para manter a memoria do coach honesta.',
            ctaLabel: 'Continuar protocolo',
            ctaHref: `/history/${input.sessionId}`,
            primaryFocusTitle: coachPlan.primaryFocus.title,
            nextBlockTitle: coachPlan.nextBlock.title,
            completeProtocol,
            memorySummary,
            updatedAt: latestOutcome.createdAt.toISOString(),
        };
    }

    return {
        sessionId: input.sessionId,
        status: 'validation_needed',
        statusLabel: formatCoachOutcomeStatus(latestOutcome.status),
        body: latestOutcome.status === 'invalid_capture'
            || latestOutcome.status === 'fatigue_or_pain'
            || latestOutcome.status === 'variable_changed'
            ? 'Nao conte isso contra o protocolo ainda. A captura ou execucao invalidou a leitura; repita com contexto controlado.'
            : 'Resultado registrado. Agora grave um clip compativel para confirmar se o efeito aparece na leitura controlada.',
        ctaLabel: 'Gravar validacao compativel',
        ctaHref: '/analyze',
        primaryFocusTitle: coachPlan.primaryFocus.title,
        nextBlockTitle: coachPlan.nextBlock.title,
        completeProtocol,
        memorySummary,
        updatedAt: latestOutcome.createdAt.toISOString(),
    };
}
