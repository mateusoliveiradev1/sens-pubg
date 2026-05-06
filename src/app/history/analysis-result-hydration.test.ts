import { describe, expect, it } from 'vitest';
import { hydrateAnalysisResultFromHistory } from './analysis-result-hydration';
import { resolveMeasurementTruth } from '@/core/measurement-truth';
import { resolvePrecisionTrend } from '@/core/precision-loop';
import {
    analysisResultBase,
    analysisResultWithWeakCapture,
} from '@/core/coach-test-fixtures';
import type { AnalysisContextDetails, CoachPlan, CoachProtocolOutcomeSnapshot } from '@/types/engine';

function createStoredResult(overrides: Record<string, unknown> = {}): Record<string, unknown> {
    return {
        id: 'analysis-1',
        timestamp: new Date('2026-04-13T12:00:00.000Z'),
        trajectory: {
            points: [],
            trackingFrames: [],
            displacements: [],
            trackingQuality: 0.8,
            framesTracked: 8,
            framesLost: 2,
            visibleFrames: 8,
            framesProcessed: 10,
            statusCounts: { tracked: 8, occluded: 0, lost: 2, uncertain: 0 },
            totalFrames: 10,
            durationMs: 1000,
            weaponId: 'beryl-m762',
        },
        metrics: {
            targetDistanceMeters: 30,
        },
        ...overrides,
    };
}

function createStoredCoachPlan(): CoachPlan {
    return {
        tier: 'test_protocol',
        sessionSummary: 'A leitura salva escolheu controle vertical como foco do bloco.',
        primaryFocus: {
            id: 'vertical-control',
            area: 'vertical_control',
            title: 'Controle vertical sustentado',
            whyNow: 'O erro vertical tem boa cobertura e ainda move o resultado do spray.',
            priorityScore: 0.82,
            severity: 0.8,
            confidence: 0.86,
            coverage: 0.9,
            dependencies: [],
            blockedBy: [],
            signals: [
                {
                    source: 'diagnosis',
                    area: 'vertical_control',
                    key: 'underpull',
                    summary: 'Underpull dominante no sustain.',
                    confidence: 0.86,
                    coverage: 0.9,
                    weight: 0.8,
                },
            ],
        },
        secondaryFocuses: [],
        actionProtocols: [
            {
                id: 'vertical-drill',
                kind: 'technique',
                instruction: 'Faca 3 sprays mantendo o mesmo ponto de mira.',
                expectedEffect: 'Reduzir subida no sustain.',
                risk: 'low',
                applyWhen: 'Quando o tracking tiver cobertura acima de 80%.',
            },
        ],
        nextBlock: {
            title: 'Bloco curto de controle vertical',
            durationMinutes: 12,
            steps: ['Grave 3 sprays na mesma distancia.', 'Compare o sustain antes de mexer na sens.'],
            checks: [
                {
                    label: 'Sustain vertical',
                    target: 'vertical_control',
                    minimumCoverage: 0.8,
                    minimumConfidence: 0.75,
                    successCondition: 'VCI sobe sem aumentar o ruido horizontal.',
                    failCondition: 'VCI continua baixo ou tracking cai abaixo do minimo.',
                },
            ],
        },
        stopConditions: ['Pare se o tracking ficar abaixo de 80% de cobertura.'],
        adaptationWindowDays: 3,
        llmRewriteAllowed: true,
    };
}

function createStoredCoachOutcomeSnapshot(): CoachProtocolOutcomeSnapshot {
    return {
        latest: {
            id: 'outcome-1',
            sessionId: 'session-1',
            coachPlanId: 'plan-1',
            protocolId: 'vertical-drill',
            focusArea: 'vertical_control',
            status: 'improved',
            reasonCodes: [],
            recordedAt: '2026-05-06T00:00:00.000Z',
            evidenceStrength: 'weak_self_report',
            coachSnapshot: {
                tier: 'test_protocol',
                primaryFocusArea: 'vertical_control',
                primaryFocusTitle: 'Controle vertical',
                protocolId: 'vertical-drill',
                validationTarget: 'vertical_control',
                precisionTrendLabel: 'initial_signal',
            },
        },
        revisions: [],
        pending: false,
        validationCta: 'Gravar validacao compativel',
        conflicts: [],
    };
}

describe('hydrateAnalysisResultFromHistory', () => {
    it('adds missing analysis context from the stored session fields', () => {
        const result = hydrateAnalysisResultFromHistory({
            fullResult: createStoredResult({ patchVersion: '41.1' }),
            recordPatchVersion: '41.1',
            scopeId: 'red-dot',
            distanceMeters: 45,
        });

        expect(result.patchVersion).toBe('41.1');
        expect(result.analysisContext).toEqual(expect.objectContaining({
            targetDistanceMeters: 45,
            distanceMode: 'estimated',
            optic: expect.objectContaining({
                scopeId: 'red-dot',
                opticId: 'red-dot-sight',
                opticStateId: '1x',
                opticName: 'Red Dot Sight',
            }),
        }));
    });

    it('preserves an existing explicit analysis context from the saved payload', () => {
        const explicitContext: AnalysisContextDetails = {
            targetDistanceMeters: 60,
            optic: {
                scopeId: 'hybrid-scope',
                opticId: 'hybrid-scope',
                opticStateId: '4x',
                opticName: 'Hybrid Scope',
                opticStateName: '4x',
                availableStateIds: ['1x', '4x'],
                isDynamicOptic: true,
            },
        };

        const result = hydrateAnalysisResultFromHistory({
            fullResult: createStoredResult({
                patchVersion: '41.1',
                analysisContext: explicitContext,
            }),
            recordPatchVersion: '41.1',
            scopeId: 'red-dot',
            distanceMeters: 30,
        });

        expect(result.analysisContext).toBe(explicitContext);
    });

    it('backfills missing tracking status counts for legacy history payloads', () => {
        const result = hydrateAnalysisResultFromHistory({
            fullResult: createStoredResult({
                trajectory: {
                    points: [],
                    trackingFrames: [],
                    displacements: [],
                    trackingQuality: 0.8,
                    framesTracked: 8,
                    framesLost: 2,
                    visibleFrames: 8,
                    framesProcessed: 10,
                    totalFrames: 10,
                    durationMs: 1000,
                    weaponId: 'beryl-m762',
                },
                subSessions: [
                    createStoredResult({
                        id: 'analysis-sub-1',
                        trajectory: {
                            points: [],
                            trackingFrames: [],
                            displacements: [],
                            trackingQuality: 0.6,
                            framesTracked: 4,
                            framesLost: 1,
                            visibleFrames: 4,
                            framesProcessed: 5,
                            totalFrames: 5,
                            durationMs: 500,
                            weaponId: 'beryl-m762',
                        },
                    }),
                ],
            }),
            recordPatchVersion: '41.1',
            scopeId: 'red-dot',
            distanceMeters: 30,
        });

        expect(result.trajectory.statusCounts).toEqual({
            tracked: 8,
            occluded: 0,
            lost: 2,
            uncertain: 0,
        });
        expect(result.subSessions?.[0]?.trajectory.statusCounts).toEqual({
            tracked: 4,
            occluded: 0,
            lost: 1,
            uncertain: 0,
        });
    });

    it('backfills missing sensitivity recommendation tier metadata for legacy history payloads', () => {
        const result = hydrateAnalysisResultFromHistory({
            fullResult: createStoredResult({
                sensitivity: {
                    profiles: [],
                    recommended: 'balanced',
                    reasoning: 'legacy recommendation',
                },
                subSessions: [
                    createStoredResult({ id: 'sub-1' }),
                    createStoredResult({ id: 'sub-2' }),
                    createStoredResult({ id: 'sub-3' }),
                ],
            }),
            recordPatchVersion: '41.1',
            scopeId: 'red-dot',
            distanceMeters: 30,
        });

        expect(result.sensitivity.evidenceTier).toBe('moderate');
        expect(result.sensitivity.confidenceScore).toBe(0.5);
        expect(result.sensitivity.tier).toBe('test_profiles');
    });

    it('drops malformed sensitivity acceptance feedback from legacy payloads', () => {
        const result = hydrateAnalysisResultFromHistory({
            fullResult: createStoredResult({
                sensitivity: {
                    profiles: [],
                    recommended: 'balanced',
                    reasoning: 'legacy recommendation',
                    acceptanceFeedback: {
                        outcome: 'great',
                        testedProfile: 'balanced',
                        recordedAt: 123,
                    },
                },
            }),
            recordPatchVersion: '41.1',
            scopeId: 'red-dot',
            distanceMeters: 30,
        });

        expect(result.sensitivity.acceptanceFeedback).toBeUndefined();
    });

    it('preserves a valid coach plan from the saved history payload', () => {
        const coachPlan = createStoredCoachPlan();

        const result = hydrateAnalysisResultFromHistory({
            fullResult: createStoredResult({ coachPlan }),
            recordPatchVersion: '41.1',
            scopeId: 'red-dot',
            distanceMeters: 30,
        });

        expect(result.coachPlan).toEqual(coachPlan);
    });

    it('localizes legacy saved coach plan copy before rendering history', () => {
        const coachPlan: CoachPlan = {
            ...createStoredCoachPlan(),
            sessionSummary: 'CoachPlan contract stub awaiting signal extraction and ranking.',
            primaryFocus: {
                ...createStoredCoachPlan().primaryFocus,
                title: 'Vertical control',
                whyNow: 'Compensacao vertical abaixo do ideal. Cause: sensibilidade alta.',
            },
            actionProtocols: [
                {
                    id: 'vertical-control-drill-protocol',
                    kind: 'drill',
                    instruction: 'Run three sprays focused on steady downward pull through the sustained phase.',
                    expectedEffect: 'Confirms whether the vertical error improves before escalating to a sensitivity change.',
                    risk: 'low',
                    applyWhen: 'Use when vertical control is the primary focus and sensitivity is still experimental.',
                    avoidWhen: 'Avoid changing sensitivity during the same three-spray comparison.',
                },
            ],
            nextBlock: {
                title: 'Short vertical control test block',
                durationMinutes: 12,
                steps: [
                    'Run 3 comparable sprays focused on vertical control.',
                    'Keep weapon, optic, distance, stance, attachments, and sensitivity fixed.',
                    'Use the next clip to confirm whether the same signal repeats.',
                ],
                checks: [
                    {
                        label: 'vertical control validation',
                        target: 'lower sustained vertical error across comparable sprays',
                        minimumCoverage: 0.8,
                        minimumConfidence: 0.75,
                        successCondition: 'Success when vertical control improves while coverage and confidence stay above threshold.',
                        failCondition: 'Fail if vertical control does not improve or evidence falls below threshold.',
                    },
                ],
            },
            stopConditions: [
                'Stop if vertical control is no longer the dominant repeated signal.',
                'Stop if capture, optic, distance, or stance changes during the test block.',
            ],
        };

        const result = hydrateAnalysisResultFromHistory({
            fullResult: createStoredResult({ coachPlan }),
            recordPatchVersion: '41.1',
            scopeId: 'red-dot',
            distanceMeters: 30,
        });

        expect(result.coachPlan).toEqual(expect.objectContaining({
            sessionSummary: expect.stringContaining('controle vertical'),
            primaryFocus: expect.objectContaining({
                title: 'Controle vertical',
                whyNow: 'Compensacao vertical abaixo do ideal. Causa: sensibilidade alta.',
            }),
            nextBlock: expect.objectContaining({
                title: 'Bloco curto de teste de controle vertical',
                steps: expect.arrayContaining([
                    expect.stringContaining('sprays comparaveis focados em controle vertical'),
                ]),
            }),
        }));
        expect(result.coachPlan?.nextBlock.checks[0]?.successCondition).toContain('Sucesso quando controle vertical');
        expect(JSON.stringify(result.coachPlan)).not.toMatch(/Short vertical|Success when|Fail if|threshold|loadout|sensitivity profile/i);
    });

    it('drops malformed coach plan payloads so legacy history can render safely', () => {
        const result = hydrateAnalysisResultFromHistory({
            fullResult: createStoredResult({
                coachPlan: {
                    tier: 'apply_protocol',
                    sessionSummary: 'Plano parcial salvo antes do contrato final.',
                },
            }),
            recordPatchVersion: '41.1',
            scopeId: 'red-dot',
            distanceMeters: 30,
        });

        expect(result.coachPlan).toBeUndefined();
    });

    it('preserves valid coach outcome snapshots from saved history payloads', () => {
        const coachOutcomeSnapshot = createStoredCoachOutcomeSnapshot();

        const result = hydrateAnalysisResultFromHistory({
            fullResult: createStoredResult({ coachOutcomeSnapshot }),
            recordPatchVersion: '41.1',
            scopeId: 'red-dot',
            distanceMeters: 30,
        });

        expect(result.coachOutcomeSnapshot).toEqual(coachOutcomeSnapshot);
    });

    it('leaves missing coach outcome snapshots absent for legacy history payloads', () => {
        const result = hydrateAnalysisResultFromHistory({
            fullResult: createStoredResult(),
            recordPatchVersion: '41.1',
            scopeId: 'red-dot',
            distanceMeters: 30,
        });

        expect(result.coachOutcomeSnapshot).toBeUndefined();
    });

    it('drops malformed coach outcome snapshots instead of inventing protocol outcomes', () => {
        const result = hydrateAnalysisResultFromHistory({
            fullResult: createStoredResult({
                coachOutcomeSnapshot: {
                    latest: {
                        id: 'outcome-1',
                        status: 'perfect',
                    },
                    revisions: [],
                    pending: false,
                    validationCta: 'Gravar validacao compativel',
                    conflicts: [],
                },
            }),
            recordPatchVersion: '41.1',
            scopeId: 'red-dot',
            distanceMeters: 30,
        });

        expect(result.coachOutcomeSnapshot).toBeUndefined();
    });

    it('preserves valid stored mastery from history payloads', () => {
        const mastery = resolveMeasurementTruth(analysisResultBase);

        const result = hydrateAnalysisResultFromHistory({
            fullResult: {
                ...analysisResultBase,
                mastery,
            } as unknown as Record<string, unknown>,
            recordPatchVersion: '41.1',
            scopeId: 'red-dot',
            distanceMeters: 30,
        });

        expect(result.mastery).toEqual(mastery);
    });

    it('backfills missing mastery for legacy fullResult records', () => {
        const result = hydrateAnalysisResultFromHistory({
            fullResult: {
                ...analysisResultBase,
                mastery: undefined,
            } as unknown as Record<string, unknown>,
            recordPatchVersion: '41.1',
            scopeId: 'red-dot',
            distanceMeters: 30,
        });

        expect(result.mastery).toEqual(expect.objectContaining({
            actionLabel: 'Testavel',
            mechanicalLevelLabel: 'Avancado',
        }));
    });

    it('drops malformed stored mastery and recomputes it', () => {
        const result = hydrateAnalysisResultFromHistory({
            fullResult: {
                ...analysisResultBase,
                mastery: {
                    actionState: 'ready',
                    actionLabel: 'Pronto',
                },
            } as unknown as Record<string, unknown>,
            recordPatchVersion: '41.1',
            scopeId: 'red-dot',
            distanceMeters: 30,
        });

        expect(result.mastery).toEqual(expect.objectContaining({
            actionLabel: 'Testavel',
        }));
        expect(result.mastery?.actionableScore).toEqual(expect.any(Number));
    });

    it('keeps capture_again when legacy evidence is weak', () => {
        const result = hydrateAnalysisResultFromHistory({
            fullResult: analysisResultWithWeakCapture as unknown as Record<string, unknown>,
            recordPatchVersion: '41.1',
            scopeId: 'red-dot',
            distanceMeters: 30,
        });

        expect(result.mastery).toEqual(expect.objectContaining({
            actionState: 'capture_again',
            actionLabel: 'Capturar de novo',
        }));
    });

    it('preserves a valid stored precision trend summary', () => {
        const precisionTrend = resolvePrecisionTrend({
            current: {
                ...analysisResultBase,
                mastery: resolveMeasurementTruth(analysisResultBase),
            },
            history: [],
        });

        const result = hydrateAnalysisResultFromHistory({
            fullResult: {
                ...analysisResultBase,
                precisionTrend,
            } as unknown as Record<string, unknown>,
            recordPatchVersion: '41.1',
            scopeId: 'red-dot',
            distanceMeters: 30,
        });

        expect(result.precisionTrend).toEqual(precisionTrend);
    });

    it('drops malformed precision trends instead of inventing legacy progress', () => {
        const result = hydrateAnalysisResultFromHistory({
            fullResult: {
                ...analysisResultBase,
                precisionTrend: {
                    label: 'validated_progress',
                    compatibleCount: 1,
                },
            } as unknown as Record<string, unknown>,
            recordPatchVersion: '41.1',
            scopeId: 'red-dot',
            distanceMeters: 30,
        });

        expect(result.precisionTrend).toBeUndefined();
    });
});
