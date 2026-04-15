import { describe, expect, it } from 'vitest';

import type { AnalysisResult, CoachFeedback } from '@/types/engine';

import { enrichAnalysisResultCoaching } from './analysis-result-coach-enrichment';
import type { CoachLlmClient } from './coach-llm-adapter';

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
            reasoning: 'Patch-aware recommendation',
        },
        coaching,
        ...(subSessions ? { subSessions } : {}),
    };
}

describe('enrichAnalysisResultCoaching', () => {
    it('returns the original result when no client is available', async () => {
        const result = createResult('root', [createFeedback('Pulldown baixo')]);

        await expect(enrichAnalysisResultCoaching(result)).resolves.toBe(result);
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
        expect(enriched.subSessions?.[0]?.metrics).toBe(result.subSessions?.[0]?.metrics);
    });
});
