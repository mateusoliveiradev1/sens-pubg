import type {
    AnalysisResult,
    CoachProtocolOutcomeStatus,
} from '@/types/engine';

export type DashboardActiveCoachLoopStatus =
    | 'pending'
    | 'started'
    | 'completed'
    | 'validation_needed'
    | 'conflict';

export interface DashboardActiveCoachLoop {
    readonly sessionId: string;
    readonly status: DashboardActiveCoachLoopStatus;
    readonly statusLabel: string;
    readonly body: string;
    readonly ctaLabel: 'Fechar protocolo pendente' | 'Gravar validacao compativel';
    readonly ctaHref: string;
    readonly primaryFocusTitle: string;
    readonly nextBlockTitle: string;
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
    }
}

function toIsoDate(value: Date | string): string {
    return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
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

    if (!latestOutcome) {
        return {
            sessionId: input.sessionId,
            status: 'pending',
            statusLabel: 'Protocolo pendente',
            body: 'Execute o bloco curto e registre o resultado antes do coach usar esse sinal como memoria.',
            ctaLabel: 'Fechar protocolo pendente',
            ctaHref: `/history/${input.sessionId}`,
            primaryFocusTitle: coachPlan.primaryFocus.title,
            nextBlockTitle: coachPlan.nextBlock.title,
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
            ctaLabel: 'Fechar protocolo pendente',
            ctaHref: `/history/${input.sessionId}`,
            primaryFocusTitle: coachPlan.primaryFocus.title,
            nextBlockTitle: coachPlan.nextBlock.title,
            memorySummary,
            updatedAt: latestOutcome.createdAt.toISOString(),
        };
    }

    return {
        sessionId: input.sessionId,
        status: 'validation_needed',
        statusLabel: formatCoachOutcomeStatus(latestOutcome.status),
        body: latestOutcome.status === 'invalid_capture'
            ? 'Nao conte isso contra o protocolo ainda. A captura ou execucao invalidou a leitura; repita com contexto controlado.'
            : 'Resultado registrado. Agora grave um clip compativel para confirmar se o efeito aparece na leitura controlada.',
        ctaLabel: 'Gravar validacao compativel',
        ctaHref: '/analyze',
        primaryFocusTitle: coachPlan.primaryFocus.title,
        nextBlockTitle: coachPlan.nextBlock.title,
        memorySummary,
        updatedAt: latestOutcome.createdAt.toISOString(),
    };
}
