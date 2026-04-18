import { describe, expect, it, vi } from 'vitest';
import type { CoachFeedback, CoachPlan } from '@/types/engine';
import {
    adaptCoachResultWithOptionalLlm,
    adaptCoachWithOptionalLlm,
    buildCoachLlmPayload,
    type CoachLlmClient,
} from './coach-llm-adapter';
import { buildCoachInput, buildCoachInstructions, CoachBatchSchema } from './coach-llm-contract';

const deterministicFeedback: CoachFeedback = {
    diagnosis: {
        type: 'underpull',
        severity: 3,
        verticalControlIndex: 0.72,
        deficitPercent: 28,
        description: 'Pulldown baixo',
        cause: 'Controle vertical insuficiente',
        remediation: 'Ajuste o pulldown',
    },
    mode: 'standard',
    problem: 'Pulldown baixo',
    evidence: {
        diagnosisType: 'underpull',
        severity: 3,
        confidence: 0.9,
        coverage: 0.95,
        angularErrorDegrees: 0.8,
        linearErrorCm: 31,
        linearErrorSeverity: 3,
        patchVersion: '41.1',
        attachmentCatalogVersion: '41.1',
    },
    confidence: 0.9,
    likelyCause: 'Controle vertical insuficiente',
    adjustment: 'Ajuste o pulldown',
    drill: 'Drill deterministico',
    verifyNextClip: 'Verifique no proximo clip',
    whatIsWrong: 'Pulldown baixo',
    whyItHappens: 'Controle vertical insuficiente',
    whatToAdjust: 'Ajuste o pulldown',
    howToTest: 'Drill deterministico',
    adaptationTimeDays: 3,
};

const deterministicCoachPlan: CoachPlan = {
    tier: 'test_protocol',
    sessionSummary: 'Plano deterministico para validar controle vertical.',
    primaryFocus: {
        id: 'vertical-control',
        area: 'vertical_control',
        title: 'Controle vertical',
        whyNow: 'O erro vertical e o sinal mais forte agora.',
        priorityScore: 0.81,
        severity: 0.8,
        confidence: 0.86,
        coverage: 0.9,
        dependencies: ['capture_quality'],
        blockedBy: [],
        signals: [],
    },
    secondaryFocuses: [],
    actionProtocols: [
        {
            id: 'vertical-control-drill-protocol',
            kind: 'drill',
            instruction: 'Run three deterministic sprays.',
            expectedEffect: 'Confirms whether vertical error improves.',
            risk: 'low',
            applyWhen: 'Use when vertical control is primary.',
            avoidWhen: 'Avoid changing sensitivity in the same block.',
        },
    ],
    nextBlock: {
        title: 'Short vertical control test block',
        durationMinutes: 12,
        steps: ['Run 3 comparable sprays focused on vertical control.'],
        checks: [
            {
                label: 'vertical control validation',
                target: 'lower sustained vertical error',
                minimumCoverage: 0.9,
                minimumConfidence: 0.86,
                successCondition: 'Success when vertical control improves.',
                failCondition: 'Fail if evidence falls below threshold.',
            },
        ],
    },
    stopConditions: ['Stop if capture quality drops.'],
    adaptationWindowDays: 2,
    llmRewriteAllowed: false,
};

describe('adaptCoachWithOptionalLlm', () => {
    it('returns deterministic feedback when no LLM client is available', async () => {
        await expect(adaptCoachWithOptionalLlm([deterministicFeedback])).resolves.toEqual([
            deterministicFeedback,
        ]);
    });

    it('sends only structured coach data and confidence to the LLM client', async () => {
        const generate = vi.fn<CoachLlmClient['generate']>().mockResolvedValue([
            {
                problem: 'Pulldown baixo, explicado melhor',
                likelyCause: 'Controle vertical insuficiente',
                adjustment: 'Ajuste o pulldown com cautela',
                drill: 'Drill deterministico',
                verifyNextClip: 'Verifique no proximo clip',
            },
        ]);

        await adaptCoachWithOptionalLlm([deterministicFeedback], { generate });

        expect(generate).toHaveBeenCalledTimes(1);
        const payload = generate.mock.calls[0]![0];
        expect(payload[0]).toMatchObject({
            mode: 'standard',
            confidence: 0.9,
            evidence: deterministicFeedback.evidence,
        });
        expect(payload[0]).not.toHaveProperty('diagnosis');
        expect(payload[0]).not.toHaveProperty('whatToAdjust');
    });

    it('falls back when LLM output invents fields outside the schema', async () => {
        const client: CoachLlmClient = {
            generate: async () => [
                {
                    problem: 'Pulldown baixo, explicado melhor',
                    likelyCause: 'Controle vertical insuficiente',
                    adjustment: 'Ajuste o pulldown com cautela',
                    drill: 'Drill deterministico',
                    verifyNextClip: 'Verifique no proximo clip',
                    inventedMetric: 999,
                },
            ],
        };

        await expect(adaptCoachWithOptionalLlm([deterministicFeedback], client)).resolves.toEqual([
            deterministicFeedback,
        ]);
    });

    it('applies valid text-only output while preserving deterministic evidence', async () => {
        const client: CoachLlmClient = {
            generate: async () => [
                {
                    problem: 'Pulldown baixo, explicado melhor',
                    likelyCause: 'Controle vertical insuficiente sustentado',
                    adjustment: 'Ajuste o pulldown com cautela',
                    drill: 'Drill deterministico refinado',
                    verifyNextClip: 'Verifique no proximo clip com o mesmo loadout',
                },
            ],
        };

        const [adapted] = await adaptCoachWithOptionalLlm([deterministicFeedback], client);

        expect(adapted).toMatchObject({
            diagnosis: deterministicFeedback.diagnosis,
            mode: 'standard',
            evidence: deterministicFeedback.evidence,
            confidence: 0.9,
            adjustment: 'Ajuste o pulldown com cautela',
            whatToAdjust: 'Ajuste o pulldown com cautela',
            howToTest: 'Drill deterministico refinado',
        });
    });

    it('rewrites expanded coach plan copy while preserving tier, scores, dependencies, and thresholds', async () => {
        const client: CoachLlmClient = {
            generate: async () => ({
                items: [
                    {
                        problem: 'Pulldown baixo, explicado melhor',
                        likelyCause: 'Controle vertical insuficiente sustentado',
                        adjustment: 'Ajuste o pulldown com cautela',
                        drill: 'Drill deterministico refinado',
                        verifyNextClip: 'Verifique no proximo clip com o mesmo loadout',
                    },
                ],
                coachPlan: {
                    sessionSummary: 'Resumo humano do bloco de controle vertical.',
                    primaryFocusWhyNow: 'O controle vertical venceu porque tem evidencia mais forte no bloco.',
                    actionProtocols: [
                        {
                            id: 'vertical-control-drill-protocol',
                            instruction: 'Execute 3 sprays iguais e observe apenas o eixo vertical.',
                        },
                    ],
                    nextBlockTitle: 'Bloco curto de controle vertical',
                },
            }),
        };

        const adapted = await adaptCoachResultWithOptionalLlm({
            coaching: [deterministicFeedback],
            coachPlan: deterministicCoachPlan,
        }, client);

        expect(adapted.coaching[0]).toMatchObject({
            problem: 'Pulldown baixo, explicado melhor',
            evidence: deterministicFeedback.evidence,
            confidence: deterministicFeedback.confidence,
        });
        expect(adapted.coachPlan).toMatchObject({
            tier: deterministicCoachPlan.tier,
            sessionSummary: 'Resumo humano do bloco de controle vertical.',
            primaryFocus: {
                whyNow: 'O controle vertical venceu porque tem evidencia mais forte no bloco.',
                priorityScore: deterministicCoachPlan.primaryFocus.priorityScore,
                dependencies: deterministicCoachPlan.primaryFocus.dependencies,
                blockedBy: deterministicCoachPlan.primaryFocus.blockedBy,
            },
            actionProtocols: [
                {
                    id: 'vertical-control-drill-protocol',
                    kind: 'drill',
                    instruction: 'Execute 3 sprays iguais e observe apenas o eixo vertical.',
                    expectedEffect: deterministicCoachPlan.actionProtocols[0]!.expectedEffect,
                    risk: deterministicCoachPlan.actionProtocols[0]!.risk,
                },
            ],
            nextBlock: {
                title: 'Bloco curto de controle vertical',
                durationMinutes: deterministicCoachPlan.nextBlock.durationMinutes,
                checks: deterministicCoachPlan.nextBlock.checks,
            },
        });
    });

    it('falls back to deterministic coach plan when expanded LLM output contains forbidden fields', async () => {
        const client: CoachLlmClient = {
            generate: async () => ({
                items: [
                    {
                        problem: 'Pulldown baixo, explicado melhor',
                        likelyCause: 'Controle vertical insuficiente sustentado',
                        adjustment: 'Ajuste o pulldown com cautela',
                        drill: 'Drill deterministico refinado',
                        verifyNextClip: 'Verifique no proximo clip com o mesmo loadout',
                    },
                ],
                coachPlan: {
                    sessionSummary: 'Resumo humano do bloco.',
                    primaryFocusWhyNow: 'Motivo reescrito.',
                    actionProtocols: [
                        {
                            id: 'vertical-control-drill-protocol',
                            instruction: 'Instrucao reescrita.',
                            risk: 'high',
                        },
                    ],
                    nextBlockTitle: 'Titulo reescrito',
                    tier: 'apply_protocol',
                },
            }),
        };

        await expect(adaptCoachResultWithOptionalLlm({
            coaching: [deterministicFeedback],
            coachPlan: deterministicCoachPlan,
        }, client)).resolves.toEqual({
            coaching: [deterministicFeedback],
            coachPlan: deterministicCoachPlan,
        });
    });

    it('falls back when expanded LLM coach plan copy is still in English', async () => {
        const client: CoachLlmClient = {
            generate: async () => ({
                items: [
                    {
                        problem: 'Pulldown baixo, explicado melhor',
                        likelyCause: 'Controle vertical insuficiente sustentado',
                        adjustment: 'Ajuste o pulldown com cautela',
                        drill: 'Drill deterministico refinado',
                        verifyNextClip: 'Verifique no proximo clip com o mesmo loadout',
                    },
                ],
                coachPlan: {
                    sessionSummary: 'Coach plan summary in Portuguese.',
                    primaryFocusWhyNow: 'Motivo reescrito sem mudar score.',
                    actionProtocols: [
                        {
                            id: 'vertical-control-drill-protocol',
                            instruction: 'Run 3 comparable sprays focused on vertical control.',
                        },
                    ],
                    nextBlockTitle: 'Short vertical control test block',
                },
            }),
        };

        await expect(adaptCoachResultWithOptionalLlm({
            coaching: [deterministicFeedback],
            coachPlan: deterministicCoachPlan,
        }, client)).resolves.toEqual({
            coaching: [deterministicFeedback],
            coachPlan: deterministicCoachPlan,
        });
    });
});

describe('coach LLM contract V2', () => {
    const textOutput = {
        problem: 'Pulldown baixo, explicado melhor',
        likelyCause: 'Controle vertical insuficiente sustentado',
        adjustment: 'Ajuste o pulldown com cautela',
        drill: 'Drill deterministico refinado',
        verifyNextClip: 'Verifique no proximo clip com o mesmo loadout',
    };

    it('serializes deterministic coach plan context for safe rewrite', () => {
        const input = JSON.parse(
            buildCoachInput(buildCoachLlmPayload([deterministicFeedback]), deterministicCoachPlan)
        ) as Record<string, unknown>;

        expect(input).toMatchObject({
            locale: 'pt-BR',
            coachPlan: {
                tier: deterministicCoachPlan.tier,
                sessionSummary: deterministicCoachPlan.sessionSummary,
                primaryFocus: {
                    id: deterministicCoachPlan.primaryFocus.id,
                    priorityScore: deterministicCoachPlan.primaryFocus.priorityScore,
                    blockedBy: deterministicCoachPlan.primaryFocus.blockedBy,
                },
                nextBlock: {
                    title: deterministicCoachPlan.nextBlock.title,
                    checks: deterministicCoachPlan.nextBlock.checks,
                },
            },
        });
    });

    it('accepts coach plan rewrites only through the allowed V2 fields', () => {
        const parsed = CoachBatchSchema.safeParse({
            items: [textOutput],
            coachPlan: {
                sessionSummary: 'Resumo humano do bloco.',
                primaryFocusWhyNow: 'Motivo reescrito sem alterar score.',
                actionProtocols: [
                    {
                        id: 'vertical-control-drill-protocol',
                        instruction: 'Instrucao reescrita.',
                    },
                ],
                nextBlockTitle: 'Titulo reescrito',
            },
        });

        expect(parsed.success).toBe(true);
        expect(parsed.data).toMatchObject({
            coachPlan: {
                nextBlockTitle: 'Titulo reescrito',
            },
        });
    });

    it('documents the pt-BR-only copy requirement in the LLM instructions', () => {
        expect(buildCoachInstructions()).toContain('Todos os campos de texto devem sair em PT-BR natural');
        expect(buildCoachInstructions()).toContain('Nao escreva frases em ingles');
    });

    it('rejects coach plan rewrites that try to mutate forbidden facts', () => {
        const parsed = CoachBatchSchema.safeParse({
            items: [textOutput],
            coachPlan: {
                sessionSummary: 'Resumo humano do bloco.',
                primaryFocusWhyNow: 'Motivo reescrito sem alterar score.',
                actionProtocols: [
                    {
                        id: 'vertical-control-drill-protocol',
                        instruction: 'Instrucao reescrita.',
                    },
                ],
                nextBlockTitle: 'Titulo reescrito',
                tier: 'apply_protocol',
            },
        });

        expect(parsed.success).toBe(false);
    });
});
