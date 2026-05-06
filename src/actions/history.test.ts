import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
    analysisSessions,
    coachProtocolOutcomes,
    precisionCheckpoints,
    precisionEvolutionLines,
    sensitivityHistory,
} from '@/db/schema';
import { createAnalysisContext } from '@/app/analyze/analysis-context';
import { CURRENT_PUBG_PATCH_VERSION } from '@/game/pubg/patch';
import type { AnalysisResult, CoachPlan, PrecisionTrendSummary } from '@/types/engine';

const mocks = vi.hoisted(() => {
    const auth = vi.fn();
    const select = vi.fn();
    const from = vi.fn();
    const leftJoin = vi.fn();
    const where = vi.fn();
    const limit = vi.fn();
    const orderBy = vi.fn();
    const insert = vi.fn();
    const sessionValues = vi.fn();
    const returning = vi.fn();
    const lineValues = vi.fn();
    const onConflictDoUpdate = vi.fn();
    const lineReturning = vi.fn();
    const checkpointValues = vi.fn();
    const outcomeValues = vi.fn();
    const historyValues = vi.fn();
    const update = vi.fn();
    const updateSet = vi.fn();
    const updateWhere = vi.fn();
    const revalidatePath = vi.fn();
    const enrichAnalysisResultCoaching = vi.fn();
    const createGroqCoachClient = vi.fn();

    return {
        auth,
        select,
        from,
        leftJoin,
        where,
        limit,
        orderBy,
        insert,
        sessionValues,
        returning,
        lineValues,
        onConflictDoUpdate,
        lineReturning,
        checkpointValues,
        outcomeValues,
        historyValues,
        update,
        updateSet,
        updateWhere,
        revalidatePath,
        enrichAnalysisResultCoaching,
        createGroqCoachClient,
    };
});

vi.mock('@/auth', () => ({
    auth: mocks.auth,
}));

vi.mock('@/db', () => ({
    db: {
        select: mocks.select,
        insert: mocks.insert,
        update: mocks.update,
    },
}));

vi.mock('next/cache', () => ({
    revalidatePath: mocks.revalidatePath,
}));

vi.mock('@/core/analysis-result-coach-enrichment', () => ({
    enrichAnalysisResultCoaching: mocks.enrichAnalysisResultCoaching,
}));

vi.mock('@/server/coach/groq-coach-client', () => ({
    createGroqCoachClient: mocks.createGroqCoachClient,
}));

import {
    getCoachProtocolOutcomesForSession,
    getHistorySessions,
    getPrecisionHistoryLines,
    recordCoachProtocolOutcome,
    recordSensitivityAcceptance,
    saveAnalysisResult,
} from './history';

function createAnalysisResult(): AnalysisResult {
    return {
        id: 'analysis-1',
        timestamp: new Date('2026-04-13T12:00:00.000Z'),
        patchVersion: CURRENT_PUBG_PATCH_VERSION,
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
            confidenceScore: 0.72,
            reasoning: 'Patch-aware recommendation',
            suggestedVSM: 1.05,
        },
        coaching: [],
    };
}

function createPrecisionReadyAnalysisResult(input: {
    readonly id: string;
    readonly timestamp: string;
    readonly sprayScore: number;
    readonly consistencyScore?: number;
    readonly confidence?: number;
    readonly qualityScore?: number;
}): AnalysisResult {
    const confidence = input.confidence ?? 0.9;
    const qualityScore = input.qualityScore ?? 86;
    const base = createAnalysisResult();

    return {
        ...base,
        id: input.id,
        timestamp: new Date(input.timestamp),
        analysisContext: createAnalysisContext({
            patchVersion: CURRENT_PUBG_PATCH_VERSION,
            scopeId: 'red-dot',
            distanceMeters: 30,
            distanceMode: 'exact',
        }),
        videoQualityReport: {
            overallScore: qualityScore as never,
            sharpness: 82 as never,
            compressionBurden: 15 as never,
            reticleContrast: 84 as never,
            roiStability: 88 as never,
            fpsStability: 90 as never,
            usableForAnalysis: true,
            blockingReasons: [],
            diagnostic: {
                tier: 'analysis_ready',
                summary: 'Clip bom para validar linha precisa.',
                recommendations: [],
                preprocessing: {
                    normalizationApplied: true,
                    sampledFrames: 32,
                    selectedFrames: 30,
                    sprayWindow: {
                        startMs: 120 as never,
                        endMs: 2800 as never,
                        confidence: 0.9,
                        shotLikeEvents: 30,
                        rejectedLeadingMs: 80 as never,
                        rejectedTrailingMs: 100 as never,
                    },
                },
            },
        },
        trajectory: {
            ...base.trajectory,
            durationMs: 2800 as never,
            displacements: Array.from({ length: 30 }, (_, index) => ({
                dx: 0,
                dy: 1,
                timestamp: (index * 90) as never,
                shotIndex: index,
            })),
        },
        metrics: {
            ...base.metrics,
            sprayScore: input.sprayScore,
            consistencyScore: (input.consistencyScore ?? input.sprayScore) as never,
            metricQuality: {
                sprayScore: {
                    coverage: 0.92,
                    confidence,
                    sampleSize: 30,
                    framesTracked: 30,
                    framesLost: 2,
                    framesProcessed: 32,
                },
            } as never,
        },
    };
}

function createStoredPrecisionTrend(overrides: Partial<PrecisionTrendSummary> = {}): PrecisionTrendSummary {
    return {
        label: 'validated_progress',
        evidenceLevel: 'strong',
        compatibleCount: 3,
        baseline: {
            resultId: 'baseline-result',
            timestamp: '2026-04-18T12:00:00.000Z',
            actionableScore: 62,
            mechanicalScore: 66,
            coverage: 0.9,
            confidence: 0.88,
            clipQuality: 84,
        },
        current: {
            resultId: 'current-result',
            timestamp: '2026-04-20T12:00:00.000Z',
            actionableScore: 82,
            mechanicalScore: 80,
            coverage: 0.92,
            confidence: 0.9,
            clipQuality: 86,
        },
        recentWindow: {
            count: 3,
            resultIds: ['baseline-result', 'prior-result', 'current-result'],
            actionableAverage: 72,
            mechanicalAverage: 73,
            coverageAverage: 0.9,
            confidenceAverage: 0.88,
            clipQualityAverage: 84,
        },
        actionableDelta: {
            baseline: 62,
            current: 82,
            delta: 20,
            recentWindowAverage: 72,
            recentWindowDelta: 10,
        },
        mechanicalDelta: {
            baseline: 66,
            current: 80,
            delta: 14,
            recentWindowAverage: 73,
            recentWindowDelta: 7,
        },
        pillarDeltas: [],
        recurringDiagnoses: [],
        blockerSummaries: [],
        blockedClips: [],
        confidence: 0.9,
        coverage: 0.92,
        nextValidationHint: 'Consolidar antes de mudar outra variavel.',
        ...overrides,
    };
}

function createStoredCoachPlan(): CoachPlan {
    return {
        tier: 'test_protocol',
        sessionSummary: 'Plano salvo para validar um bloco curto.',
        primaryFocus: {
            id: 'vertical-focus',
            area: 'vertical_control',
            title: 'Controle vertical',
            whyNow: 'O sustain vertical ainda decide o bloco.',
            priorityScore: 0.86,
            severity: 0.8,
            confidence: 0.84,
            coverage: 0.88,
            dependencies: [],
            blockedBy: [],
            signals: [],
        },
        secondaryFocuses: [],
        actionProtocols: [
            {
                id: 'vertical-drill',
                kind: 'technique',
                instruction: 'Faca tres sprays mantendo o mesmo alvo.',
                expectedEffect: 'Reduzir erro vertical sem mexer na sens.',
                risk: 'low',
                applyWhen: 'Use com cobertura acima de 80%.',
            },
        ],
        nextBlock: {
            title: 'Bloco vertical curto',
            durationMinutes: 12,
            steps: ['Grave tres sprays comparaveis.'],
            checks: [
                {
                    label: 'Validacao vertical',
                    target: 'vertical_control',
                    minimumCoverage: 0.8,
                    minimumConfidence: 0.75,
                    successCondition: 'VCI melhora sem piorar ruido.',
                    failCondition: 'VCI nao melhora ou captura cai.',
                },
            ],
        },
        stopConditions: ['Pare se a captura cair.'],
        adaptationWindowDays: 3,
        llmRewriteAllowed: true,
    };
}

function createStoredCoachOutcomeRow(overrides: Record<string, unknown> = {}) {
    return {
        id: 'outcome-1',
        userId: 'user-1',
        analysisSessionId: 'history-outcome-1',
        coachPlanId: 'plan-1',
        protocolId: 'vertical-control-drill-protocol',
        focusArea: 'vertical_control',
        status: 'improved',
        reasonCodes: [],
        note: null,
        revisionOfId: null,
        evidenceStrength: 'conflict',
        conflictPayload: {
            userOutcomeId: 'outcome-1',
            precisionTrendLabel: 'validated_regression',
            reason: 'Self-report improved, but strict compatible precision validated regression.',
            nextValidationCopy: 'Grave uma validacao curta antes de avancar.',
        },
        payload: {
            coachSnapshot: {
                tier: 'test_protocol',
                primaryFocusArea: 'vertical_control',
                primaryFocusTitle: 'Controle vertical',
                protocolId: 'vertical-control-drill-protocol',
                validationTarget: 'reduzir erro vertical',
                precisionTrendLabel: 'validated_regression',
            },
        },
        createdAt: new Date('2026-04-12T12:30:00.000Z'),
        updatedAt: new Date('2026-04-12T12:30:00.000Z'),
        ...overrides,
    };
}

describe('saveAnalysisResult', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mocks.limit.mockReset();
        mocks.orderBy.mockReset();
        mocks.insert.mockReset();
        mocks.outcomeValues.mockReset();
        mocks.update.mockReset();

        mocks.auth.mockResolvedValue({
            user: { id: 'user-1' },
        });

        mocks.select.mockReturnValue({
            from: mocks.from,
        });
        mocks.from.mockReturnValue({
            where: mocks.where,
            leftJoin: mocks.leftJoin,
        });
        mocks.leftJoin.mockReturnValue({
            where: mocks.where,
        });
        mocks.where.mockReturnValue({
            limit: mocks.limit,
            orderBy: mocks.orderBy,
        });
        mocks.limit.mockResolvedValue([{ id: 'profile-1' }]);
        mocks.orderBy.mockResolvedValue([]);

        mocks.insert.mockImplementation((table) => {
            if (table === analysisSessions) {
                return {
                    values: mocks.sessionValues,
                };
            }

            if (table === precisionEvolutionLines) {
                return {
                    values: mocks.lineValues,
                };
            }

            if (table === precisionCheckpoints) {
                return {
                    values: mocks.checkpointValues,
                };
            }

            if (table === coachProtocolOutcomes) {
                return {
                    values: mocks.outcomeValues,
                };
            }

            if (table === sensitivityHistory) {
                return {
                    values: mocks.historyValues,
                };
            }

            throw new Error('Unexpected table');
        });

        mocks.sessionValues.mockReturnValue({
            returning: mocks.returning,
        });
        mocks.returning.mockResolvedValue([{ id: 'session-1' }]);
        mocks.lineValues.mockReturnValue({
            onConflictDoUpdate: mocks.onConflictDoUpdate,
        });
        mocks.onConflictDoUpdate.mockReturnValue({
            returning: mocks.lineReturning,
        });
        mocks.lineReturning.mockResolvedValue([{ id: 'precision-line-1' }]);
        mocks.checkpointValues.mockResolvedValue(undefined);
        mocks.outcomeValues.mockResolvedValue(undefined);
        mocks.limit.mockResolvedValueOnce([{ id: 'profile-1' }]).mockResolvedValue([]);
        mocks.historyValues.mockResolvedValue(undefined);
        mocks.update.mockReturnValue({
            set: mocks.updateSet,
        });
        mocks.updateSet.mockReturnValue({
            where: mocks.updateWhere,
        });
        mocks.updateWhere.mockResolvedValue(undefined);
        mocks.createGroqCoachClient.mockReturnValue(undefined);
        mocks.enrichAnalysisResultCoaching.mockImplementation(async (result) => result);
    });

    it('persists patchVersion with the saved session and full result payload', async () => {
        const result = createAnalysisResult();

        const saved = await saveAnalysisResult(result, 'beryl-m762', 'red-dot', 30);

        expect(mocks.sessionValues).toHaveBeenCalledWith(expect.objectContaining({
            weaponId: 'beryl-m762',
            scopeId: 'red-dot',
            patchVersion: CURRENT_PUBG_PATCH_VERSION,
            fullResult: expect.objectContaining({
                patchVersion: CURRENT_PUBG_PATCH_VERSION,
            }),
        }));
        expect(saved).toMatchObject({
            success: true,
            sessionId: 'session-1',
            result: {
                historySessionId: 'session-1',
            },
        });
    });

    it('enriches coaching through the server helper and returns the enriched payload', async () => {
        const result = createAnalysisResult();
        const enrichedResult = {
            ...result,
            coaching: [{ problem: 'Coach IA' }] as unknown as AnalysisResult['coaching'],
        };

        mocks.enrichAnalysisResultCoaching.mockResolvedValue(enrichedResult);

        const saved = await saveAnalysisResult(result, 'beryl-m762', 'red-dot', 30);

        expect(mocks.createGroqCoachClient).toHaveBeenCalledTimes(1);
        expect(mocks.enrichAnalysisResultCoaching).toHaveBeenCalledWith(expect.objectContaining({
            id: result.id,
            analysisContext: expect.objectContaining({
                targetDistanceMeters: 30,
                distanceMode: 'exact',
            }),
        }), undefined);
        expect(saved).toMatchObject({
            success: true,
            result: enrichedResult,
        });
        expect(mocks.sessionValues).toHaveBeenCalledWith(expect.objectContaining({
            coachingData: enrichedResult.coaching,
            fullResult: expect.objectContaining({
                coaching: enrichedResult.coaching,
            }),
        }));
    });

    it('strengthens sensitivity confidence when compatible history converges on the same recommendation', async () => {
        const result = createAnalysisResult();

        mocks.limit.mockReset();
        mocks.limit
            .mockResolvedValueOnce([{ id: 'profile-1' }])
            .mockResolvedValueOnce([
                {
                    id: 'history-1',
                    createdAt: new Date('2026-04-16T12:00:00.000Z'),
                    weaponId: 'beryl-m762',
                    scopeId: 'red-dot',
                    patchVersion: CURRENT_PUBG_PATCH_VERSION,
                    distance: 30,
                    stance: 'standing',
                    attachments: {
                        muzzle: 'compensator',
                        grip: 'vertical',
                        stock: 'none',
                    },
                    fullResult: {
                        sensitivity: {
                            recommended: 'balanced',
                            tier: 'apply_ready',
                            evidenceTier: 'strong',
                            confidenceScore: 0.9,
                        },
                    },
                },
                {
                    id: 'history-2',
                    createdAt: new Date('2026-04-15T12:00:00.000Z'),
                    weaponId: 'beryl-m762',
                    scopeId: 'red-dot',
                    patchVersion: CURRENT_PUBG_PATCH_VERSION,
                    distance: 35,
                    stance: 'standing',
                    attachments: {
                        muzzle: 'compensator',
                        grip: 'vertical',
                        stock: 'none',
                    },
                    fullResult: {
                        sensitivity: {
                            recommended: 'balanced',
                            tier: 'test_profiles',
                            evidenceTier: 'strong',
                            confidenceScore: 0.84,
                        },
                    },
                },
                {
                    id: 'history-3',
                    createdAt: new Date('2026-04-14T12:00:00.000Z'),
                    weaponId: 'beryl-m762',
                    scopeId: 'red-dot',
                    patchVersion: CURRENT_PUBG_PATCH_VERSION,
                    distance: 28,
                    stance: 'standing',
                    attachments: {
                        muzzle: 'compensator',
                        grip: 'vertical',
                        stock: 'none',
                    },
                    fullResult: {
                        sensitivity: {
                            recommended: 'balanced',
                            tier: 'test_profiles',
                            evidenceTier: 'moderate',
                            confidenceScore: 0.78,
                        },
                    },
                },
            ]);

        await saveAnalysisResult(result, 'beryl-m762', 'red-dot', 30);

        expect(mocks.sessionValues).toHaveBeenCalledWith(expect.objectContaining({
            fullResult: expect.objectContaining({
                sensitivity: expect.objectContaining({
                    tier: 'apply_ready',
                    evidenceTier: 'strong',
                    historyConvergence: expect.objectContaining({
                        matchingSessions: 3,
                        consideredSessions: 3,
                        consensusProfile: 'balanced',
                        agreement: 'aligned',
                    }),
                }),
            }),
        }));
    });

    it('uses prior coach protocol outcomes for save-time memory and stores an auditable decision snapshot', async () => {
        const result: AnalysisResult = {
            ...createAnalysisResult(),
            diagnoses: [
                {
                    type: 'underpull',
                    severity: 4,
                    verticalControlIndex: 0.58,
                    deficitPercent: 42,
                    confidence: 0.9,
                    evidence: {
                        confidence: 0.9,
                        coverage: 0.91,
                        angularErrorDegrees: 1.6,
                        linearErrorCm: 64,
                        linearErrorSeverity: 4,
                    },
                    description: 'Controle vertical ainda sobe demais no sustain.',
                    cause: 'O bloco anterior conflitou com a validacao compativel.',
                    remediation: 'Revisar hipotese antes de repetir o mesmo protocolo.',
                },
            ],
        };

        mocks.limit.mockReset();
        mocks.limit
            .mockResolvedValueOnce([{ id: 'profile-1' }])
            .mockResolvedValueOnce([
                {
                    id: 'history-outcome-1',
                    createdAt: new Date('2026-04-12T12:00:00.000Z'),
                    weaponId: 'beryl-m762',
                    scopeId: 'red-dot',
                    patchVersion: CURRENT_PUBG_PATCH_VERSION,
                    distance: 30,
                    stance: 'standing',
                    attachments: {
                        muzzle: 'compensator',
                        grip: 'vertical',
                        stock: 'none',
                    },
                    fullResult: {
                        coachPlan: createStoredCoachPlan(),
                    },
                },
            ]);
        mocks.orderBy.mockResolvedValueOnce([
            createStoredCoachOutcomeRow(),
        ]);

        await saveAnalysisResult(result, 'beryl-m762', 'red-dot', 30);

        expect(mocks.sessionValues).toHaveBeenCalledWith(expect.objectContaining({
            fullResult: expect.objectContaining({
                coachPlan: expect.objectContaining({
                    tier: 'test_protocol',
                    primaryFocus: expect.objectContaining({
                        area: 'validation',
                    }),
                    secondaryFocuses: expect.arrayContaining([
                        expect.objectContaining({
                            area: 'vertical_control',
                            blockedBy: expect.arrayContaining(['outcome_conflict']),
                        }),
                    ]),
                }),
                coachDecisionSnapshot: expect.objectContaining({
                    tier: 'test_protocol',
                    primaryFocusArea: 'validation',
                    protocolId: expect.any(String),
                    outcomeEvidenceState: 'conflict',
                    outcomeMemory: expect.objectContaining({
                        activeLayer: 'strict_compatible',
                        conflictCount: 1,
                    }),
                    conflicts: [
                        expect.objectContaining({
                            precisionTrendLabel: 'validated_regression',
                        }),
                    ],
                    blockerReasons: expect.arrayContaining([
                        'outcome_conflict',
                        'memory_conflict:vertical_control',
                    ]),
                }),
            }),
        }));
    });

    it('persists a baseline precision trend and checkpoint for the first compatible clip', async () => {
        const result = createPrecisionReadyAnalysisResult({
            id: 'precision-current-1',
            timestamp: '2026-04-18T12:00:00.000Z',
            sprayScore: 72,
        });

        await saveAnalysisResult(result, 'beryl-m762', 'red-dot', 30);

        expect(mocks.sessionValues).toHaveBeenCalledWith(expect.objectContaining({
            fullResult: expect.objectContaining({
                precisionTrend: expect.objectContaining({
                    label: 'baseline',
                    compatibleCount: 1,
                }),
            }),
        }));
        expect(mocks.lineValues).toHaveBeenCalledWith(expect.objectContaining({
            status: 'baseline_created',
            variableInTest: 'validation',
            validClipCount: 1,
            blockedClipCount: 0,
            payload: expect.objectContaining({
                trend: expect.objectContaining({ label: 'baseline' }),
            }),
        }));
        expect(mocks.checkpointValues).toHaveBeenCalledWith(expect.objectContaining({
            lineId: 'precision-line-1',
            analysisSessionId: 'session-1',
            state: 'baseline_created',
        }));
    });

    it('persists an initial precision signal for the second strict compatible clip', async () => {
        const prior = createPrecisionReadyAnalysisResult({
            id: 'precision-prior-1',
            timestamp: '2026-04-18T12:00:00.000Z',
            sprayScore: 70,
        });
        const current = createPrecisionReadyAnalysisResult({
            id: 'precision-current-2',
            timestamp: '2026-04-19T12:00:00.000Z',
            sprayScore: 78,
        });

        mocks.limit.mockReset();
        mocks.limit
            .mockResolvedValueOnce([{ id: 'profile-1' }])
            .mockResolvedValueOnce([{
                id: 'session-prior-1',
                createdAt: prior.timestamp,
                weaponId: 'beryl-m762',
                scopeId: 'red-dot',
                patchVersion: CURRENT_PUBG_PATCH_VERSION,
                distance: 30,
                stance: 'standing',
                attachments: {
                    muzzle: 'compensator',
                    grip: 'vertical',
                    stock: 'none',
                },
                fullResult: prior as unknown as Record<string, unknown>,
            }]);

        await saveAnalysisResult(current, 'beryl-m762', 'red-dot', 30);

        expect(mocks.sessionValues).toHaveBeenCalledWith(expect.objectContaining({
            fullResult: expect.objectContaining({
                precisionTrend: expect.objectContaining({
                    label: 'initial_signal',
                    compatibleCount: 2,
                    actionableDelta: expect.objectContaining({
                        delta: expect.any(Number),
                    }),
                }),
            }),
        }));
        expect(mocks.lineValues).toHaveBeenCalledWith(expect.objectContaining({
            status: 'initial_signal',
            validClipCount: 2,
            baselineSessionId: 'session-prior-1',
        }));
    });

    it('persists validated progress only after three strong compatible clips', async () => {
        const baseline = createPrecisionReadyAnalysisResult({
            id: 'precision-baseline',
            timestamp: '2026-04-18T12:00:00.000Z',
            sprayScore: 62,
        });
        const prior = createPrecisionReadyAnalysisResult({
            id: 'precision-prior-progress',
            timestamp: '2026-04-19T12:00:00.000Z',
            sprayScore: 70,
        });
        const current = createPrecisionReadyAnalysisResult({
            id: 'precision-current-progress',
            timestamp: '2026-04-20T12:00:00.000Z',
            sprayScore: 82,
        });

        mocks.limit.mockReset();
        mocks.limit
            .mockResolvedValueOnce([{ id: 'profile-1' }])
            .mockResolvedValueOnce([
                {
                    id: 'session-prior-progress',
                    createdAt: prior.timestamp,
                    weaponId: 'beryl-m762',
                    scopeId: 'red-dot',
                    patchVersion: CURRENT_PUBG_PATCH_VERSION,
                    distance: 30,
                    stance: 'standing',
                    attachments: {
                        muzzle: 'compensator',
                        grip: 'vertical',
                        stock: 'none',
                    },
                    fullResult: prior as unknown as Record<string, unknown>,
                },
                {
                    id: 'session-baseline',
                    createdAt: baseline.timestamp,
                    weaponId: 'beryl-m762',
                    scopeId: 'red-dot',
                    patchVersion: CURRENT_PUBG_PATCH_VERSION,
                    distance: 30,
                    stance: 'standing',
                    attachments: {
                        muzzle: 'compensator',
                        grip: 'vertical',
                        stock: 'none',
                    },
                    fullResult: baseline as unknown as Record<string, unknown>,
                },
            ]);

        await saveAnalysisResult(current, 'beryl-m762', 'red-dot', 30);

        expect(mocks.sessionValues).toHaveBeenCalledWith(expect.objectContaining({
            fullResult: expect.objectContaining({
                precisionTrend: expect.objectContaining({
                    label: 'validated_progress',
                    compatibleCount: 3,
                }),
            }),
        }));
        expect(mocks.lineValues).toHaveBeenCalledWith(expect.objectContaining({
            status: 'validated_progress',
            validClipCount: 3,
            baselineSessionId: 'session-baseline',
        }));
    });

    it('records non-comparable clips as blocked checkpoints without incrementing valid count', async () => {
        const result = createPrecisionReadyAnalysisResult({
            id: 'precision-blocked',
            timestamp: '2026-04-18T12:00:00.000Z',
            sprayScore: 72,
            qualityScore: 40,
        });

        await saveAnalysisResult({
            ...result,
            videoQualityReport: {
                ...result.videoQualityReport!,
                usableForAnalysis: false,
            },
        }, 'beryl-m762', 'red-dot', 30);

        expect(mocks.sessionValues).toHaveBeenCalledWith(expect.objectContaining({
            fullResult: expect.objectContaining({
                precisionTrend: expect.objectContaining({
                    label: 'not_comparable',
                    evidenceLevel: 'blocked',
                }),
            }),
        }));
        expect(mocks.lineValues).toHaveBeenCalledWith(expect.objectContaining({
            status: 'not_comparable',
            validClipCount: 0,
            blockedClipCount: expect.any(Number),
        }));
        expect(mocks.checkpointValues).toHaveBeenCalledWith(expect.objectContaining({
            state: 'not_comparable',
        }));
    });

    it('records real-world acceptance feedback for the recommended profile and syncs applied history', async () => {
        const result = createAnalysisResult();

        mocks.limit.mockReset();
        mocks.limit.mockResolvedValueOnce([
            {
                id: 'session-1',
                fullResult: result as unknown as Record<string, unknown>,
            },
        ]);

        const saved = await recordSensitivityAcceptance('session-1', 'improved');

        expect(saved).toMatchObject({
            success: true,
            acceptanceFeedback: {
                outcome: 'improved',
                testedProfile: 'balanced',
            },
        });
        expect(mocks.update).toHaveBeenNthCalledWith(1, analysisSessions);
        expect(mocks.updateSet).toHaveBeenNthCalledWith(1, expect.objectContaining({
            fullResult: expect.objectContaining({
                sensitivity: expect.objectContaining({
                    acceptanceFeedback: expect.objectContaining({
                        outcome: 'improved',
                        testedProfile: 'balanced',
                    }),
                }),
            }),
        }));
        expect(mocks.update).toHaveBeenNthCalledWith(2, sensitivityHistory);
        expect(mocks.updateSet).toHaveBeenNthCalledWith(2, { applied: false });
        expect(mocks.update).toHaveBeenNthCalledWith(3, sensitivityHistory);
        expect(mocks.updateSet).toHaveBeenNthCalledWith(3, { applied: true });
    });
});

describe('recordCoachProtocolOutcome', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mocks.limit.mockReset();
        mocks.orderBy.mockReset();
        mocks.insert.mockReset();

        mocks.auth.mockResolvedValue({
            user: { id: 'user-1' },
        });
        mocks.select.mockReturnValue({
            from: mocks.from,
        });
        mocks.from.mockReturnValue({
            where: mocks.where,
        });
        mocks.where.mockReturnValue({
            limit: mocks.limit,
            orderBy: mocks.orderBy,
        });
        mocks.insert.mockImplementation((table) => {
            if (table === coachProtocolOutcomes) {
                return {
                    values: mocks.outcomeValues,
                };
            }

            throw new Error('Unexpected table');
        });
        mocks.outcomeValues.mockResolvedValue(undefined);
    });

    it('rejects unauthenticated users', async () => {
        mocks.auth.mockResolvedValue(null);

        const result = await recordCoachProtocolOutcome({
            sessionId: 'session-1',
            coachPlanId: 'plan-1',
            protocolId: 'vertical-drill',
            focusArea: 'vertical_control',
            status: 'started',
        });

        expect(result).toEqual({
            success: false,
            error: 'Nao autenticado.',
        });
        expect(mocks.insert).not.toHaveBeenCalled();
    });

    it('rejects attempts to write outcomes for another user session', async () => {
        mocks.limit.mockResolvedValueOnce([]);

        const result = await recordCoachProtocolOutcome({
            sessionId: 'other-session',
            coachPlanId: 'plan-1',
            protocolId: 'vertical-drill',
            focusArea: 'vertical_control',
            status: 'completed',
        });

        expect(result).toEqual({
            success: false,
            error: 'Sessao nao encontrada.',
        });
        expect(mocks.insert).not.toHaveBeenCalled();
    });

    it('rejects invalid_capture without a structured reason code before writing', async () => {
        const result = await recordCoachProtocolOutcome({
            sessionId: 'session-1',
            coachPlanId: 'plan-1',
            protocolId: 'vertical-drill',
            focusArea: 'vertical_control',
            status: 'invalid_capture',
            reasonCodes: [],
        });

        expect(result).toEqual({
            success: false,
            error: 'invalid_capture requires at least one reason code.',
        });
        expect(mocks.select).not.toHaveBeenCalled();
        expect(mocks.insert).not.toHaveBeenCalled();
    });

    it('records a protocol outcome with evidence strength, snapshot payload, and dashboard revalidation', async () => {
        mocks.limit.mockResolvedValueOnce([{
            id: 'session-1',
            fullResult: {
                coachPlan: createStoredCoachPlan(),
                precisionTrend: createStoredPrecisionTrend(),
            },
        }]);

        const result = await recordCoachProtocolOutcome({
            sessionId: 'session-1',
            coachPlanId: 'plan-1',
            protocolId: 'vertical-drill',
            focusArea: 'vertical_control',
            status: 'improved',
            note: '  bloco controlado  ',
        });

        expect(result).toEqual({
            success: true,
            outcome: expect.objectContaining({
                id: expect.any(String),
                sessionId: 'session-1',
                status: 'improved',
                evidenceStrength: 'confirmed_by_compatible_clip',
                note: 'bloco controlado',
                coachSnapshot: expect.objectContaining({
                    tier: 'test_protocol',
                    primaryFocusArea: 'vertical_control',
                    protocolId: 'vertical-drill',
                    validationTarget: 'vertical_control',
                    precisionTrendLabel: 'validated_progress',
                }),
            }),
        });
        expect(mocks.outcomeValues).toHaveBeenCalledWith(expect.objectContaining({
            userId: 'user-1',
            analysisSessionId: 'session-1',
            protocolId: 'vertical-drill',
            focusArea: 'vertical_control',
            status: 'improved',
            reasonCodes: [],
            note: 'bloco controlado',
            evidenceStrength: 'confirmed_by_compatible_clip',
            payload: expect.objectContaining({
                validationTarget: 'vertical_control',
                recordedBy: 'user',
            }),
        }));
        expect(mocks.revalidatePath).toHaveBeenCalledWith('/history');
        expect(mocks.revalidatePath).toHaveBeenCalledWith('/history/session-1');
        expect(mocks.revalidatePath).toHaveBeenCalledWith('/dashboard');
    });

    it('creates a new linked row when correcting a prior outcome', async () => {
        mocks.limit
            .mockResolvedValueOnce([{
                id: 'session-1',
                fullResult: {
                    coachPlan: createStoredCoachPlan(),
                },
            }])
            .mockResolvedValueOnce([{ id: 'outcome-original' }]);

        const result = await recordCoachProtocolOutcome({
            sessionId: 'session-1',
            coachPlanId: 'plan-1',
            protocolId: 'vertical-drill',
            focusArea: 'vertical_control',
            status: 'worse',
            reasonCodes: ['poor_execution'],
            revisionOfOutcomeId: 'outcome-original',
        });

        expect(result).toEqual({
            success: true,
            outcome: expect.objectContaining({
                revisionOfOutcomeId: 'outcome-original',
                evidenceStrength: 'invalid',
            }),
        });
        expect(mocks.outcomeValues).toHaveBeenCalledWith(expect.objectContaining({
            revisionOfId: 'outcome-original',
            evidenceStrength: 'invalid',
            payload: expect.objectContaining({
                metadata: expect.objectContaining({
                    invalidBecauseOfExecutionOrCapture: true,
                }),
            }),
        }));
        expect(mocks.update).not.toHaveBeenCalled();
    });
});

describe('getCoachProtocolOutcomesForSession', () => {
    beforeEach(() => {
        vi.clearAllMocks();

        mocks.auth.mockResolvedValue({
            user: { id: 'user-1' },
        });
        mocks.select.mockReturnValue({
            from: mocks.from,
        });
        mocks.from.mockReturnValue({
            where: mocks.where,
        });
        mocks.where.mockReturnValue({
            limit: mocks.limit,
            orderBy: mocks.orderBy,
        });
    });

    it('returns owned session outcomes as typed audit records', async () => {
        mocks.limit.mockResolvedValueOnce([{ id: 'session-1' }]);
        mocks.orderBy.mockResolvedValueOnce([{
            id: 'outcome-1',
            userId: 'user-1',
            analysisSessionId: 'session-1',
            coachPlanId: 'plan-1',
            protocolId: 'vertical-drill',
            focusArea: 'vertical_control',
            status: 'started',
            reasonCodes: [],
            note: null,
            revisionOfId: null,
            evidenceStrength: 'neutral',
            conflictPayload: null,
            payload: {
                coachSnapshot: {
                    tier: 'test_protocol',
                    primaryFocusArea: 'vertical_control',
                    primaryFocusTitle: 'Controle vertical',
                    protocolId: 'vertical-drill',
                    validationTarget: 'vertical_control',
                },
            },
            createdAt: new Date('2026-05-06T00:00:00.000Z'),
            updatedAt: new Date('2026-05-06T00:00:00.000Z'),
        }]);

        const outcomes = await getCoachProtocolOutcomesForSession('session-1');

        expect(outcomes).toEqual([
            expect.objectContaining({
                id: 'outcome-1',
                sessionId: 'session-1',
                status: 'started',
                evidenceStrength: 'neutral',
                coachSnapshot: expect.objectContaining({
                    protocolId: 'vertical-drill',
                }),
            }),
        ]);
    });
});

describe('getHistorySessions', () => {
    beforeEach(() => {
        vi.clearAllMocks();

        mocks.auth.mockResolvedValue({
            user: { id: 'user-1' },
        });

        mocks.select.mockReturnValue({
            from: mocks.from,
        });
        mocks.from.mockReturnValue({
            where: mocks.where,
            leftJoin: mocks.leftJoin,
        });
        mocks.leftJoin.mockReturnValue({
            where: mocks.where,
        });
        mocks.where.mockReturnValue({
            limit: mocks.limit,
            orderBy: mocks.orderBy,
        });
    });

    it('returns normalized recommended profile and acceptance feedback for history cards', async () => {
        mocks.orderBy.mockResolvedValue([
            {
                id: 'session-1',
                weaponId: 'beryl-m762',
                scopeId: 'red-dot',
                patchVersion: CURRENT_PUBG_PATCH_VERSION,
                stabilityScore: 78,
                verticalControl: 1.02,
                horizontalNoise: 0.18,
                createdAt: new Date('2026-04-17T12:00:00.000Z'),
                weaponName: 'Beryl M762',
                weaponCategory: 'ar',
                fullResult: {
                    sensitivity: {
                        recommended: 'balanced',
                        acceptanceFeedback: {
                            outcome: 'same',
                            testedProfile: 'balanced',
                            recordedAt: '2026-04-17T12:30:00.000Z',
                        },
                    },
                },
            },
        ]);

        const sessions = await getHistorySessions();

        expect(sessions).toEqual([
            expect.objectContaining({
                id: 'session-1',
                recommendedProfile: 'balanced',
                acceptanceFeedback: expect.objectContaining({
                    outcome: 'same',
                    testedProfile: 'balanced',
                    recordedAt: '2026-04-17T12:30:00.000Z',
                }),
            }),
        ]);
    });

    it('drops malformed acceptance feedback instead of leaking invalid payloads to the page', async () => {
        mocks.orderBy.mockResolvedValue([
            {
                id: 'session-2',
                weaponId: 'm416',
                scopeId: 'red-dot',
                patchVersion: CURRENT_PUBG_PATCH_VERSION,
                stabilityScore: 84,
                verticalControl: 0.98,
                horizontalNoise: 0.14,
                createdAt: new Date('2026-04-17T13:00:00.000Z'),
                weaponName: 'M416',
                weaponCategory: 'ar',
                fullResult: {
                    sensitivity: {
                        recommended: 'balanced',
                        acceptanceFeedback: {
                            outcome: 'broken',
                            testedProfile: 'balanced',
                            recordedAt: 123,
                        },
                    },
                },
            },
        ]);

        const [session] = await getHistorySessions();

        expect(session).toMatchObject({
            id: 'session-2',
            recommendedProfile: 'balanced',
        });
        expect(session).not.toHaveProperty('acceptanceFeedback');
    });

    it('adds the latest coach protocol outcome status to history cards', async () => {
        mocks.orderBy
            .mockResolvedValueOnce([
                {
                    id: 'session-1',
                    weaponId: 'beryl-m762',
                    scopeId: 'red-dot',
                    patchVersion: CURRENT_PUBG_PATCH_VERSION,
                    stabilityScore: 78,
                    verticalControl: 1.02,
                    horizontalNoise: 0.18,
                    createdAt: new Date('2026-04-17T12:00:00.000Z'),
                    weaponName: 'Beryl M762',
                    weaponCategory: 'ar',
                    fullResult: {
                        coachPlan: createStoredCoachPlan(),
                    },
                },
            ])
            .mockResolvedValueOnce([
                createStoredCoachOutcomeRow({
                    analysisSessionId: 'session-1',
                    status: 'improved',
                    evidenceStrength: 'conflict',
                    conflictPayload: {
                        userOutcomeId: 'outcome-1',
                        precisionTrendLabel: 'validated_regression',
                        reason: 'Self-report improved, but strict compatible precision validated regression.',
                        nextValidationCopy: 'Grave uma validacao curta antes de avancar.',
                    },
                }),
                createStoredCoachOutcomeRow({
                    id: 'outcome-2',
                    analysisSessionId: 'session-1',
                    status: 'worse',
                    evidenceStrength: 'invalid',
                    conflictPayload: null,
                    revisionOfId: 'outcome-1',
                }),
            ]);

        const [session] = await getHistorySessions();

        expect(session).toMatchObject({
            id: 'session-1',
            coachOutcomeStatus: {
                status: 'worse',
                label: 'Piorou no treino',
                evidenceStrength: 'invalid',
                revisionCount: 1,
            },
        });
    });
});

describe('getPrecisionHistoryLines', () => {
    beforeEach(() => {
        vi.clearAllMocks();

        mocks.auth.mockResolvedValue({
            user: { id: 'user-1' },
        });

        mocks.select.mockReturnValue({
            from: mocks.from,
        });
        mocks.from.mockReturnValue({
            where: mocks.where,
            leftJoin: mocks.leftJoin,
        });
        mocks.where.mockReturnValue({
            orderBy: mocks.orderBy,
        });
    });

    it('returns compatible precision groups with checkpoint timeline summaries', async () => {
        const trend = createStoredPrecisionTrend();

        mocks.orderBy
            .mockResolvedValueOnce([
                {
                    id: 'line-1',
                    compatibilityKey: JSON.stringify({
                        patchVersion: CURRENT_PUBG_PATCH_VERSION,
                        weaponId: 'beryl-m762',
                        scopeId: 'red-dot',
                        stance: 'standing',
                        muzzle: 'compensator',
                        grip: 'vertical',
                        stock: 'none',
                        distanceMeters: 30,
                        sprayProtocolKey: 'window:2700:30',
                    }),
                    status: 'validated_progress',
                    variableInTest: 'vertical_control',
                    baselineSessionId: 'session-baseline',
                    currentSessionId: 'session-current',
                    validClipCount: 3,
                    blockedClipCount: 0,
                    payload: {
                        trend,
                        nextValidationHint: 'Consolidar antes de mudar outra variavel.',
                    },
                    createdAt: new Date('2026-04-18T12:00:00.000Z'),
                    updatedAt: new Date('2026-04-20T12:00:00.000Z'),
                },
            ])
            .mockResolvedValueOnce([
                {
                    id: 'checkpoint-1',
                    lineId: 'line-1',
                    analysisSessionId: 'session-current',
                    state: 'validated_progress',
                    variableInTest: 'vertical_control',
                    payload: {
                        trend,
                        nextValidationHint: 'Consolidar antes de mudar outra variavel.',
                    },
                    createdAt: new Date('2026-04-20T12:00:00.000Z'),
                },
            ]);

        const lines = await getPrecisionHistoryLines();

        expect(lines).toEqual([
            expect.objectContaining({
                id: 'line-1',
                contextLabel: expect.stringContaining('beryl-m762'),
                statusLabel: 'Progresso validado',
                latestTrendLabel: 'validated_progress',
                variableInTest: 'vertical_control',
                validClipCount: 3,
                blockedClipCount: 0,
                nextValidation: 'Consolidar antes de mudar outra variavel.',
                checkpoints: [
                    expect.objectContaining({
                        id: 'checkpoint-1',
                        stateLabel: 'Progresso validado',
                        analysisSessionId: 'session-current',
                    }),
                ],
            }),
        ]);
    });

    it('keeps blocked precision reasons visible for history audit cards', async () => {
        const trend = createStoredPrecisionTrend({
            label: 'not_comparable',
            evidenceLevel: 'blocked',
            compatibleCount: 0,
            blockerSummaries: [{
                code: 'capture_quality_weak',
                count: 1,
                message: 'Qualidade fraca bloqueia trend preciso.',
                resultIds: ['blocked-result'],
            }],
            blockedClips: [{
                resultId: 'blocked-result',
                blockers: [{
                    code: 'capture_quality_weak',
                    field: 'mastery.evidence',
                    message: 'Qualidade fraca bloqueia trend preciso.',
                }],
            }],
        });

        mocks.orderBy
            .mockResolvedValueOnce([
                {
                    id: 'blocked-line',
                    compatibilityKey: 'blocked:session-blocked',
                    status: 'not_comparable',
                    variableInTest: 'capture_quality',
                    baselineSessionId: null,
                    currentSessionId: 'session-blocked',
                    validClipCount: 0,
                    blockedClipCount: 1,
                    payload: {
                        trend,
                        nextValidationHint: 'Grave outro clip com captura limpa.',
                    },
                    createdAt: new Date('2026-04-18T12:00:00.000Z'),
                    updatedAt: new Date('2026-04-18T12:00:00.000Z'),
                },
            ])
            .mockResolvedValueOnce([]);

        const [line] = await getPrecisionHistoryLines();

        expect(line).toMatchObject({
            id: 'blocked-line',
            contextLabel: 'Clip bloqueado sem linha compativel',
            statusLabel: 'Nao comparavel',
            validClipCount: 0,
            blockedClipCount: 1,
            blockerReasons: ['Qualidade fraca bloqueia trend preciso.'],
        });
    });
});
