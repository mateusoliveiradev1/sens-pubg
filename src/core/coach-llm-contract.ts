import { z } from 'zod';

import type { CoachLlmPayloadItem } from '@/core/coach-llm-adapter';
import type { CoachPlan } from '@/types/engine';

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

export function buildCoachInstructions(): string {
    return [
        'Voce e um coach especialista em spray control de PUBG.',
        'Reescreva o feedback de coach e, quando existir coachPlan, tambem a copy curta do plano em portugues do Brasil.',
        'Use apenas os fatos presentes no payload; nunca invente metricas, anexos, armas, distancias ou causas novas.',
        'Mantenha o mesmo diagnostico e a mesma ordem dos itens.',
        'No coachPlan, voce so pode reescrever sessionSummary, primaryFocusWhyNow, actionProtocols[].instruction e nextBlockTitle.',
        'Nunca altere tier, scores, dependencies, blockedBy, thresholds, ids, checks, duracao, ordem de prioridade ou stopConditions.',
        'Se o item estiver com baixa confianca ou inconclusivo, explicite cautela sem soar robotico.',
        'Cada campo deve ser curto, direto e util para o jogador.',
        'Evite repetir a mesma abertura e a mesma estrutura entre itens.',
        'Retorne apenas JSON valido no schema pedido.',
    ].join(' ');
}

export function buildCoachInput(
    payload: readonly CoachLlmPayloadItem[],
    coachPlan?: CoachPlan
): string {
    return JSON.stringify(
        {
            locale: 'pt-BR',
            task: coachPlan
                ? 'Reescreva estes itens de coach e os campos permitidos do coachPlan mantendo o mesmo sentido tecnico.'
                : 'Reescreva estes itens de coach mantendo o mesmo sentido tecnico.',
            items: payload,
            ...(coachPlan ? { coachPlan: buildCoachPlanInput(coachPlan) } : {}),
        },
        null,
        2
    );
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
