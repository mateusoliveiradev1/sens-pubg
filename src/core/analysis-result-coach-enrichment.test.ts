import { describe, expect, it, vi } from 'vitest';

import type { AnalysisResult, CoachFeedback } from '@/types/engine';

import { enrichAnalysisResultCoaching } from './analysis-result-coach-enrichment';
import type { CoachLlmClient } from './coach-llm-adapter';

const outcomeLayer = {
    source: 'strict_compatible' as const,
    outcomeCount: 1,
    pendingCount: 0,
    neutralCount: 0,
    weakSelfReportCount: 1,
    confirmedCount: 0,
    invalidCount: 0,
    conflictCount: 0,
    repeatedFailureCount: 0,
    staleOutcomeCount: 0,
    technicalEvidenceCount: 0,
    focusAreas: ['vertical_control' as const],
    confidence: 0.62,
    summary: 'Improvement needs compatible validation.',
};

function createFeedback(problem: string): CoachFeedback {
    return {
        diagnosis: {
            type: 'underpull',
            severity: 3,
            verticalControlIndex: 0.72,
            deficitPercent: 28,
            description: problem,
            cause: 'Controle vertical insuficiente',
            remediation: 'Ajuste o pulldown',
        },
        mode: 'standard',
        problem,
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
        whatIsWrong: problem,
        whyItHappens: 'Controle vertical insuficiente',
        whatToAdjust: 'Ajuste o pulldown',
        howToTest: 'Drill deterministico',
        adaptationTimeDays: 3,
    };
}

function createResult(id: string, coaching: readonly CoachFeedback[], subSessions?: readonly AnalysisResult[]): AnalysisResult {
    return {
        id,
        timestamp: new Date('2026-04-15T12:00:00.000Z'),
        patchVersion: '41.1',
        trajectory: {
            points: [],
            trackingFrames: [],
            displacements: [],
            totalFrames: 30,
            durationMs: 1000 as never,
            weaponId: 'beryl-m762',
            trackingQuality: 0.92,
            framesTracked: 28,
            framesLost: 2,
            visibleFrames: 28,
            framesProcessed: 30,
            statusCounts: {
                tracked: 28,
                occluded: 0,
                lost: 2,
                uncertain: 0,
            },
        },
        loadout: {
            stance: 'standing',
            muzzle: 'compensator',
            grip: 'vertical',
            stock: 'none',
        },
        metrics: {
            stabilityScore: 78 as never,
            verticalControlIndex: 1.02,
            horizontalNoiseIndex: 2.1,
            angularErrorDegrees: 0.4,
            linearErrorCm: 18,
            linearErrorSeverity: 2,
            targetDistanceMeters: 30,
            initialRecoilResponseMs: 145 as never,
            driftDirectionBias: { direction: 'neutral', magnitude: 0 },
            consistencyScore: 82 as never,
            burstVCI: 1.01,
            sustainedVCI: 1.03,
            fatigueVCI: 1.04,
            burstHNI: 1.9,
            sustainedHNI: 2.1,
            fatigueHNI: 2.3,
            sprayScore: 81,
        },
        diagnoses: [],
        sensitivity: {
            profiles: [
                {
                    type: 'low',
                    label: 'Low',
                    description: 'Low sens',
                    general: 45 as never,
                    ads: 43 as never,
                    scopes: [],
                    cmPer360: 48 as never,
                },
                {
                    type: 'balanced',
                    label: 'Balanced',
                    description: 'Balanced sens',
                    general: 50 as never,
                    ads: 48 as never,
                    scopes: [],
                    cmPer360: 41 as never,
                },
                {
                    type: 'high',
                    label: 'High',
                    description: 'High sens',
                    general: 55 as never,
                    ads: 53 as never,
                    scopes: [],
                    cmPer360: 35 as never,
                },
            ],
            recommended: 'balanced',
            tier: 'test_profiles',
            evidenceTier: 'moderate',
            confidenceScore: 0.78,
            reasoning: 'Patch-aware recommendation',
        },
        coaching,
        ...(subSessions ? { subSessions } : {}),
    };
}

describe('enrichAnalysisResultCoaching', () => {
    it('attaches a deterministic coachPlan when no client is available', async () => {
        const result = createResult('root', [createFeedback('Pulldown baixo')]);

        const enriched = await enrichAnalysisResultCoaching(result);

        expect(enriched).not.toBe(result);
        expect(enriched.coaching).toBe(result.coaching);
        expect(enriched.coachPlan).toEqual(expect.objectContaining({
            tier: expect.any(String),
            primaryFocus: expect.any(Object),
            nextBlock: expect.any(Object),
        }));
    });

    it('rewrites final and segmented coaching while preserving the rest of the analysis', async () => {
        const result = createResult('root', [createFeedback('Pulldown baixo')], [
            createResult('segment-1', [createFeedback('Spray tremendo')]),
        ]);
        const client: CoachLlmClient = {
            generate: async (payload) => payload.map((item, index) => ({
                problem: `${item.problem} [IA ${index + 1}]`,
                likelyCause: `${item.likelyCause} refinada`,
                adjustment: `${item.adjustment} com contexto`,
                drill: `${item.drill} refinado`,
                verifyNextClip: `${item.verifyNextClip} com validacao`,
            })),
        };

        const enriched = await enrichAnalysisResultCoaching(result, client);

        expect(enriched).not.toBe(result);
        expect(enriched.coaching[0]).toMatchObject({
            problem: 'Pulldown baixo [IA 1]',
            likelyCause: 'Controle vertical insuficiente refinada',
            whatToAdjust: 'Ajuste o pulldown com contexto',
        });
        expect(enriched.subSessions?.[0]?.coaching[0]).toMatchObject({
            problem: 'Spray tremendo [IA 1]',
            howToTest: 'Drill deterministico refinado',
        });
        expect(enriched.metrics).toBe(result.metrics);
        expect(enriched.coachPlan).toEqual(expect.objectContaining({
            tier: expect.any(String),
            primaryFocus: expect.any(Object),
        }));
        expect(enriched.subSessions?.[0]?.coachPlan).toEqual(expect.objectContaining({
            tier: expect.any(String),
            primaryFocus: expect.any(Object),
        }));
        expect(enriched.subSessions?.[0]?.metrics).toBe(result.subSessions?.[0]?.metrics);
    });

    it('rewrites allowed coachPlan copy while preserving deterministic plan facts', async () => {
        const result = createResult('root', [createFeedback('Pulldown baixo')]);
        const client: CoachLlmClient = {
            generate: async (payload, coachPlan) => ({
                items: payload.map((item) => ({
                    problem: `${item.problem} [IA]`,
                    likelyCause: `${item.likelyCause} refinada`,
                    adjustment: `${item.adjustment} com contexto`,
                    drill: `${item.drill} refinado`,
                    verifyNextClip: `${item.verifyNextClip} com validacao`,
                })),
                coachPlan: {
                    sessionSummary: 'Resumo reescrito da sessao.',
                    primaryFocusWhyNow: 'Motivo reescrito sem mudar score ou tier.',
                    actionProtocols: coachPlan?.actionProtocols.map((protocol) => ({
                        id: protocol.id,
                        instruction: `${protocol.instruction} [IA]`,
                    })) ?? [],
                    nextBlockTitle: 'Bloco reescrito pelo LLM',
                },
            }),
        };

        const enriched = await enrichAnalysisResultCoaching(result, client);

        expect(enriched.coaching[0]?.problem).toBe('Pulldown baixo [IA]');
        expect(enriched.coachPlan).toEqual(expect.objectContaining({
            tier: expect.any(String),
            sessionSummary: 'Resumo reescrito da sessao.',
            primaryFocus: expect.objectContaining({
                whyNow: 'Motivo reescrito sem mudar score ou tier.',
                priorityScore: expect.any(Number),
                dependencies: expect.any(Array),
                blockedBy: expect.any(Array),
            }),
            nextBlock: expect.objectContaining({
                title: 'Bloco reescrito pelo LLM',
                checks: expect.any(Array),
            }),
        }));
        expect(enriched.coachPlan?.actionProtocols[0]?.instruction).toContain('[IA]');
    });

    it('passes persisted outcome and memory facts to the LLM as immutable context', async () => {
        const result = {
            ...createResult('root', [createFeedback('Pulldown baixo')]),
            coachDecisionSnapshot: {
                tier: 'test_protocol' as const,
                primaryFocusArea: 'vertical_control' as const,
                primaryFocusTitle: 'Controle vertical',
                secondaryFocusAreas: [],
                protocolId: 'vertical-control-drill-protocol',
                validationTarget: 'reduzir erro vertical',
                memorySummary: 'Self-report fraco aguardando validacao compativel.',
                outcomeMemory: {
                    activeLayer: 'strict_compatible' as const,
                    strictCompatible: outcomeLayer,
                    globalFallback: { ...outcomeLayer, source: 'global_fallback' as const },
                    pendingCount: 0,
                    neutralCount: 0,
                    confirmedCount: 0,
                    invalidCount: 0,
                    conflictCount: 0,
                    repeatedFailureCount: 0,
                    staleOutcomeCount: 0,
                    confidence: 0.62,
                    summary: 'Self-report fraco aguardando validacao compativel.',
                },
                outcomeEvidenceState: 'weak_self_report' as const,
                conflicts: [],
                blockerReasons: ['outcome.strict_compatible.weak_self_report.vertical_control'],
                precisionTrendLabel: 'in_validation' as const,
                createdAt: '2026-04-15T12:00:00.000Z',
            },
            coachOutcomeSnapshot: {
                latest: {
                    id: 'outcome-1',
                    sessionId: 'session-1',
                    coachPlanId: 'plan-1',
                    protocolId: 'vertical-control-drill-protocol',
                    focusArea: 'vertical_control' as const,
                    status: 'improved' as const,
                    reasonCodes: ['other' as const],
                    recordedAt: '2026-04-15T12:00:00.000Z',
                    evidenceStrength: 'weak_self_report' as const,
                },
                revisions: [],
                pending: false,
                validationCta: 'Gravar validacao compativel',
                conflicts: [],
            },
        };
        const generate = vi.fn<CoachLlmClient['generate']>().mockResolvedValue([
            {
                problem: 'Pulldown baixo [IA]',
                likelyCause: 'Controle vertical insuficiente refinada',
                adjustment: 'Ajuste o pulldown com contexto',
                drill: 'Drill deterministico refinado',
                verifyNextClip: 'Verifique no proximo clip com validacao',
            },
        ]);

        await enrichAnalysisResultCoaching(result, { generate });

        expect(generate).toHaveBeenCalled();
        expect(generate.mock.calls[0]?.[2]).toMatchObject({
            tier: expect.any(String),
            outcome: {
                status: 'improved',
                evidenceStrength: 'weak_self_report',
                reasonCodes: ['other'],
                latestProtocolId: 'vertical-control-drill-protocol',
            },
            memory: {
                activeLayer: 'strict_compatible',
                weakSelfReportCount: 1,
                summary: 'Self-report fraco aguardando validacao compativel.',
            },
            precisionTrendLabel: 'in_validation',
        });
    });
});
