import { describe, expect, it } from 'vitest';
import type { CoachPlan, CompleteTrainingProtocol } from '@/types/engine';
import {
    buildCoachImmutableFacts,
    buildCoachInput,
    CoachBatchSchema,
} from './coach-llm-contract';

const completeProtocol: CompleteTrainingProtocol = {
    version: 'complete-protocol-v1',
    id: 'complete-protocol-v1:session-1:vertical_recoil_lane:test_protocol',
    drillId: 'vertical_recoil_lane',
    tier: 'test_protocol',
    title: 'Teste curto de controle vertical',
    summary: 'Ficha pratica de controle vertical com validacao controlada.',
    environment: 'training_mode',
    context: {
        weaponId: 'beryl-m762',
        weaponName: 'Beryl M762',
        opticId: 'scope-3x',
        opticName: '3x',
        distanceMeters: 50,
        distanceMode: 'exact',
        stance: 'standing',
        attachments: {
            muzzle: 'compensator',
            grip: 'vertical',
            stock: 'tactical',
            missing: [],
        },
        sensitivityProfile: 'balanced',
        patchVersion: '41.1',
        supportStatus: 'full',
        personalizationLimited: false,
        limitationReasons: [],
    },
    objective: 'Treinar puxada vertical constante durante burst, sustain e fadiga.',
    dose: {
        durationMinutes: 12,
        sprayReps: 4,
        spraysPerRep: 1,
        restBetweenSpraysSeconds: 60,
        restBetweenRepsSeconds: 70,
        stopAfterMinutes: 12,
    },
    target: 'Linha vertical mais curta e repetivel no alvo.',
    executionSteps: [
        'Escolha um alvo fixo e preserve a mesma mira.',
        'Puxe para baixo de forma progressiva sem trocar sensibilidade.',
    ],
    preparation: [
        {
            id: 'pull-space',
            label: 'Deixe espaco livre no mousepad para puxar para baixo.',
            reason: 'Controle vertical depende de espaco consistente para a puxada.',
            required: true,
            safetyKind: 'setup_control',
        },
        {
            id: 'pain-stop-rule',
            label: 'Pare se houver dor, dormencia, formigamento ou desconforto forte.',
            reason: 'Isso rebaixa o bloco para seguranca/aprendizado.',
            required: true,
            safetyKind: 'stop_rule',
        },
    ],
    validation: {
        compatibleClipChecklist: ['Arma: Beryl M762.'],
        minimumConfidence: 0.86,
        minimumCoverage: 0.9,
        successCriteria: ['Erro vertical sustentado cai no proximo clip compativel.'],
        failCriteria: ['Cansaco ou desconforto aparece antes da validacao.'],
        variableControlChecklist: ['Nao mudar sensibilidade durante o bloco.'],
        nextClipCopy: 'Grave o proximo clip assim para validar sem forcar conclusao.',
    },
    transfer: {
        situationChecklist: ['Use em TDM apenas quando aparecer spray parecido.'],
        conservativeConfidenceCopy: 'Transferencia em partida e evidencia pratica, nao prova tecnica.',
        countsAsTechnicalValidation: false,
    },
    downgrade: {
        tierBefore: 'test_protocol',
        tierAfter: 'test_protocol',
        reasons: [],
        blockedFields: [],
        repairCtas: [],
        userCopy: 'Sem downgrade: a ficha segue o nivel deterministico do coach.',
    },
    audit: {
        createdAt: '2026-04-15T12:00:00.000Z',
        analysisDecisionLevel: 'usable_analysis',
        primaryFocusArea: 'vertical_control',
        secondaryFocusAreas: [],
        confidence: 0.86,
        coverage: 0.9,
        source: 'deterministic_coach',
    },
    stopConditions: ['Pare se a captura cair abaixo da confianca ou cobertura minima.'],
    continueCriteria: ['Use o proximo clip compativel antes de subir agressividade.'],
    antiMixingNotes: ['Execute um protocolo por vez.'],
    freeSummary: ['Controle vertical por 12 min em modo teste curto.'],
    proSections: ['Dose completa e criterio de validacao'],
    llmRewriteAllowed: false,
};

const coachPlan: CoachPlan = {
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
            instruction: 'Treine sprays deterministas.',
            expectedEffect: 'Confirma se o erro vertical melhora.',
            risk: 'low',
            applyWhen: 'Use quando controle vertical for primario.',
            avoidWhen: 'Evite mudar sensibilidade no mesmo bloco.',
        },
    ],
    nextBlock: {
        title: 'Bloco curto de controle vertical',
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
    completeProtocol,
};

describe('coach LLM complete protocol contract', () => {
    it('serializes complete protocol immutable facts', () => {
        const facts = buildCoachImmutableFacts({ coachPlan });

        expect(facts.completeProtocol).toMatchObject({
            version: 'complete-protocol-v1',
            id: completeProtocol.id,
            drillId: 'vertical_recoil_lane',
            tier: 'test_protocol',
            environment: 'training_mode',
            context: {
                weaponId: 'beryl-m762',
                opticId: 'scope-3x',
                distanceMeters: 50,
                distanceMode: 'exact',
                attachments: {
                    muzzle: 'compensator',
                    grip: 'vertical',
                    stock: 'tactical',
                    missing: [],
                },
            },
            dose: {
                durationMinutes: 12,
                sprayReps: 4,
            },
            validation: {
                compatibleClipChecklistCount: 1,
                minimumCoverage: 0.9,
                minimumConfidence: 0.86,
            },
            downgrade: {
                reasons: [],
                repairCtas: [],
            },
            preparationIds: ['pull-space', 'pain-stop-rule'],
            transferCountsAsTechnicalValidation: false,
        });
    });

    it('includes only display-safe complete protocol fields in the LLM prompt', () => {
        const input = JSON.parse(buildCoachInput([], coachPlan)) as {
            coachPlan: {
                completeProtocol: Record<string, unknown>;
            };
            immutableFacts: {
                completeProtocol: {
                    drillId: string;
                };
            };
        };

        expect(input.coachPlan.completeProtocol).toEqual({
            id: completeProtocol.id,
            title: completeProtocol.title,
            summary: completeProtocol.summary,
            executionSteps: completeProtocol.executionSteps,
            preparation: [
                {
                    id: 'pull-space',
                    label: 'Deixe espaco livre no mousepad para puxar para baixo.',
                },
                {
                    id: 'pain-stop-rule',
                    label: 'Pare se houver dor, dormencia, formigamento ou desconforto forte.',
                },
            ],
        });
        expect(input.coachPlan.completeProtocol).not.toHaveProperty('dose');
        expect(input.coachPlan.completeProtocol).not.toHaveProperty('validation');
        expect(input.immutableFacts.completeProtocol.drillId).toBe('vertical_recoil_lane');
    });

    it('allows safe complete protocol display rewrites in the output schema', () => {
        const parsed = CoachBatchSchema.safeParse({
            items: [],
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
                completeProtocol: {
                    id: completeProtocol.id,
                    title: 'Ficha curta de puxada controlada',
                    summary: 'Resumo polido sem mudar dose, alvo ou validacao.',
                    executionSteps: [
                        'Escolha um alvo fixo e mantenha a mesma mira.',
                        'Puxe de forma progressiva sem trocar sensibilidade.',
                    ],
                    preparation: [
                        {
                            id: 'pull-space',
                            label: 'Garanta espaco livre no mousepad antes do bloco.',
                        },
                        {
                            id: 'pain-stop-rule',
                            label: 'Pare se sentir dor, dormencia ou formigamento.',
                        },
                    ],
                },
            },
        });

        expect(parsed.success).toBe(true);
    });

    it('rejects complete protocol rewrites that include technical fields', () => {
        const parsed = CoachBatchSchema.safeParse({
            items: [],
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
                completeProtocol: {
                    id: completeProtocol.id,
                    durationMinutes: 5,
                    transferCountsAsTechnicalValidation: true,
                },
            },
        });

        expect(parsed.success).toBe(false);
    });
});
