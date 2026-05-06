import { z } from 'zod';

import type { CoachLlmPayloadItem } from '@/core/coach-llm-adapter';
import type { AnalysisResult, CoachPlan } from '@/types/engine';

export const CoachTextOutputSchema = z.object({
    problem: z.string().min(1).max(320),
    likelyCause: z.string().min(1).max(320),
    adjustment: z.string().min(1).max(360),
    drill: z.string().min(1).max(360),
    verifyNextClip: z.string().min(1).max(320),
}).strict();

export const CoachPlanProtocolTextOutputSchema = z.object({
    id: z.string().min(1).max(140),
    instruction: z.string().min(1).max(420),
}).strict();

export const CoachPlanTextOutputSchema = z.object({
    sessionSummary: z.string().min(1).max(420),
    primaryFocusWhyNow: z.string().min(1).max(360),
    actionProtocols: z.array(CoachPlanProtocolTextOutputSchema).max(8),
    nextBlockTitle: z.string().min(1).max(180),
}).strict();

export const CoachBatchSchema = z.object({
    items: z.array(CoachTextOutputSchema),
    coachPlan: CoachPlanTextOutputSchema.optional(),
}).strict();

export interface CoachImmutableFactsInput {
    readonly tier: CoachPlan['tier'];
    readonly focusOrder: readonly {
        readonly id: string;
        readonly area: string;
    }[];
    readonly protocolOrder: readonly string[];
    readonly nextBlock: {
        readonly durationMinutes: number;
        readonly checks: readonly {
            readonly label: string;
            readonly target: string;
            readonly minimumCoverage: number;
            readonly minimumConfidence: number;
        }[];
    };
    readonly blockerReasons: readonly string[];
    readonly validationTarget: string | null;
    readonly thresholds: readonly {
        readonly checkLabel: string;
        readonly minimumCoverage: number;
        readonly minimumConfidence: number;
    }[];
    readonly outcome: {
        readonly status: string | null;
        readonly evidenceStrength: string;
        readonly reasonCodes: readonly string[];
        readonly conflictState: 'none' | 'active';
        readonly conflictReasons: readonly string[];
        readonly pending: boolean;
        readonly validationCta: string | null;
        readonly latestProtocolId: string | null;
        readonly latestFocusArea: string | null;
    };
    readonly memory: {
        readonly summary: string;
        readonly activeLayer: string;
        readonly pendingCount: number;
        readonly neutralCount: number;
        readonly weakSelfReportCount: number;
        readonly confirmedCount: number;
        readonly invalidCount: number;
        readonly conflictCount: number;
        readonly repeatedFailureCount: number;
        readonly staleOutcomeCount: number;
        readonly confidence: number;
    };
    readonly precisionTrendLabel: string | null;
}

export function buildCoachInstructions(): string {
    return [
        'Voce e um coach especialista em spray control de PUBG.',
        'Reescreva o feedback de coach e, quando existir coachPlan, tambem a copy curta do plano em portugues do Brasil.',
        'Todos os campos de texto devem sair em PT-BR natural. Nao escreva frases em ingles como "Short test block", "Success when", "Fail if", "threshold", "setup", "drift", "grip", "loadout", "capture" ou "sensitivity".',
        'Termos de jogo muito comuns podem ficar como spray, ADS, VSM, DPI, FPS e PUBG; o restante deve ficar em portugues.',
        'Use apenas os fatos presentes no payload; nunca invente metricas, anexos, armas, distancias ou causas novas.',
        'Mantenha o mesmo diagnostico e a mesma ordem dos itens.',
        'No coachPlan, voce so pode reescrever sessionSummary, primaryFocusWhyNow, actionProtocols[].instruction e nextBlockTitle.',
        'O bloco immutableFacts e apenas contexto de seguranca: nunca copie novos campos dele para a saida, nunca altere outcome, memoria, conflitos, status, reason codes, tier, scores, dependencies, blockedBy, thresholds, ids, checks, duracao, ordem de prioridade ou stopConditions.',
        'Nao prometa sensibilidade perfeita, melhoria garantida, subida de rank ou veredito definitivo.',
        'Se o item estiver com baixa confianca ou inconclusivo, explicite cautela sem soar robotico.',
        'Cada campo deve ser curto, direto e util para o jogador.',
        'Evite repetir a mesma abertura e a mesma estrutura entre itens.',
        'Retorne apenas JSON valido no schema pedido.',
    ].join(' ');
}

export function buildCoachInput(
    payload: readonly CoachLlmPayloadItem[],
    coachPlan?: CoachPlan,
    immutableFacts?: CoachImmutableFactsInput
): string {
    return JSON.stringify(
        {
            locale: 'pt-BR',
            task: coachPlan
                ? 'Reescreva estes itens de coach e os campos permitidos do coachPlan mantendo o mesmo sentido tecnico.'
                : 'Reescreva estes itens de coach mantendo o mesmo sentido tecnico.',
            items: payload,
            ...(coachPlan ? { coachPlan: buildCoachPlanInput(coachPlan) } : {}),
            ...(coachPlan ? { immutableFacts: immutableFacts ?? buildCoachImmutableFacts({ coachPlan }) } : {}),
        },
        null,
        2
    );
}

export function buildCoachImmutableFacts(input: {
    readonly coachPlan: CoachPlan;
    readonly result?: AnalysisResult;
}): CoachImmutableFactsInput {
    const decisionSnapshot = input.result?.coachDecisionSnapshot;
    const outcomeSnapshot = input.result?.coachOutcomeSnapshot;
    const latestOutcome = outcomeSnapshot?.latest ?? null;
    const outcomeEvidenceStrength = latestOutcome?.evidenceStrength
        ?? decisionSnapshot?.outcomeEvidenceState
        ?? 'none';
    const conflicts = [
        ...(outcomeSnapshot?.conflicts ?? []),
        ...(decisionSnapshot?.conflicts ?? []),
    ];
    const memory = decisionSnapshot?.outcomeMemory;
    const blockerReasons = Array.from(new Set([
        ...input.coachPlan.primaryFocus.blockedBy,
        ...input.coachPlan.secondaryFocuses.flatMap((focus) => focus.blockedBy),
        ...(decisionSnapshot?.blockerReasons ?? []),
        ...conflicts.map((conflict) => conflict.reason),
    ].filter((reason) => reason.trim().length > 0)));
    const checks = input.coachPlan.nextBlock.checks;

    const activeLayer = memory?.activeLayer === 'strict_compatible'
        ? memory.strictCompatible
        : memory?.activeLayer === 'global_fallback'
            ? memory.globalFallback
            : undefined;

    return {
        tier: input.coachPlan.tier,
        focusOrder: [
            input.coachPlan.primaryFocus,
            ...input.coachPlan.secondaryFocuses,
        ].map((focus) => ({
            id: focus.id,
            area: focus.area,
        })),
        protocolOrder: input.coachPlan.actionProtocols.map((protocol) => protocol.id),
        nextBlock: {
            durationMinutes: input.coachPlan.nextBlock.durationMinutes,
            checks: checks.map((check) => ({
                label: check.label,
                target: check.target,
                minimumCoverage: check.minimumCoverage,
                minimumConfidence: check.minimumConfidence,
            })),
        },
        blockerReasons,
        validationTarget: decisionSnapshot?.validationTarget
            ?? checks[0]?.target
            ?? null,
        thresholds: checks.map((check) => ({
            checkLabel: check.label,
            minimumCoverage: check.minimumCoverage,
            minimumConfidence: check.minimumConfidence,
        })),
        outcome: {
            status: latestOutcome?.status ?? null,
            evidenceStrength: outcomeEvidenceStrength,
            reasonCodes: latestOutcome?.reasonCodes ?? [],
            conflictState: conflicts.length > 0 || outcomeEvidenceStrength === 'conflict'
                ? 'active'
                : 'none',
            conflictReasons: conflicts.map((conflict) => conflict.reason),
            pending: outcomeSnapshot?.pending ?? false,
            validationCta: outcomeSnapshot?.validationCta ?? null,
            latestProtocolId: latestOutcome?.protocolId ?? decisionSnapshot?.protocolId ?? null,
            latestFocusArea: latestOutcome?.focusArea ?? decisionSnapshot?.primaryFocusArea ?? null,
        },
        memory: {
            summary: decisionSnapshot?.memorySummary
                ?? memory?.summary
                ?? 'No coach protocol outcome memory available.',
            activeLayer: memory?.activeLayer ?? 'none',
            pendingCount: memory?.pendingCount ?? 0,
            neutralCount: memory?.neutralCount ?? 0,
            weakSelfReportCount: activeLayer?.weakSelfReportCount ?? 0,
            confirmedCount: memory?.confirmedCount ?? 0,
            invalidCount: memory?.invalidCount ?? 0,
            conflictCount: memory?.conflictCount ?? 0,
            repeatedFailureCount: memory?.repeatedFailureCount ?? 0,
            staleOutcomeCount: memory?.staleOutcomeCount ?? 0,
            confidence: memory?.confidence ?? 0,
        },
        precisionTrendLabel: decisionSnapshot?.precisionTrendLabel
            ?? input.result?.precisionTrend?.label
            ?? latestOutcome?.coachSnapshot?.precisionTrendLabel
            ?? null,
    };
}

function buildCoachPlanInput(coachPlan: CoachPlan) {
    return {
        tier: coachPlan.tier,
        sessionSummary: coachPlan.sessionSummary,
        primaryFocus: {
            id: coachPlan.primaryFocus.id,
            area: coachPlan.primaryFocus.area,
            title: coachPlan.primaryFocus.title,
            whyNow: coachPlan.primaryFocus.whyNow,
            priorityScore: coachPlan.primaryFocus.priorityScore,
            severity: coachPlan.primaryFocus.severity,
            confidence: coachPlan.primaryFocus.confidence,
            coverage: coachPlan.primaryFocus.coverage,
            dependencies: coachPlan.primaryFocus.dependencies,
            blockedBy: coachPlan.primaryFocus.blockedBy,
        },
        secondaryFocuses: coachPlan.secondaryFocuses.map((focus) => ({
            id: focus.id,
            area: focus.area,
            title: focus.title,
            whyNow: focus.whyNow,
            priorityScore: focus.priorityScore,
            blockedBy: focus.blockedBy,
        })),
        actionProtocols: coachPlan.actionProtocols.map((protocol) => ({
            id: protocol.id,
            kind: protocol.kind,
            instruction: protocol.instruction,
            expectedEffect: protocol.expectedEffect,
            risk: protocol.risk,
            applyWhen: protocol.applyWhen,
            ...(protocol.avoidWhen ? { avoidWhen: protocol.avoidWhen } : {}),
        })),
        nextBlock: {
            title: coachPlan.nextBlock.title,
            durationMinutes: coachPlan.nextBlock.durationMinutes,
            steps: coachPlan.nextBlock.steps,
            checks: coachPlan.nextBlock.checks,
        },
        stopConditions: coachPlan.stopConditions,
        adaptationWindowDays: coachPlan.adaptationWindowDays,
    };
}
