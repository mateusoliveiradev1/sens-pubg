import { describe, expect, it } from 'vitest';

import { buildCoachMemorySnapshot } from './coach-memory';
import { resolveAnalysisDecision } from './analysis-decision';
import { buildCoachPlan } from './coach-plan-builder';
import {
    analysisResultBase,
    analysisResultWithStrongSensitivity,
    analysisResultWithWeakCapture,
    createAnalysisResultFixture,
} from './coach-test-fixtures';
import { asScore } from '../types/branded';
import type { AnalysisResult, CoachProtocolOutcome, PrecisionTrendSummary } from '../types/engine';

function coachProtocolOutcome(
    overrides: Partial<CoachProtocolOutcome> = {},
): CoachProtocolOutcome {
    return {
        id: 'outcome-1',
        sessionId: 'history-outcome-1',
        coachPlanId: 'plan-1',
        protocolId: 'sensitivity-test-protocol',
        focusArea: 'sensitivity',
        status: 'improved',
        reasonCodes: [],
        recordedAt: '2026-04-17T12:30:00.000Z',
        evidenceStrength: 'weak_self_report',
        ...overrides,
    };
}

function validatedProgressTrend(): PrecisionTrendSummary {
    return {
        label: 'validated_progress',
        evidenceLevel: 'strong',
        compatibleCount: 3,
        baseline: {
            resultId: 'baseline-result',
            timestamp: '2026-04-15T12:00:00.000Z',
            actionableScore: 64,
            mechanicalScore: 68,
            coverage: 0.88,
            confidence: 0.86,
            clipQuality: 82,
        },
        current: {
            resultId: 'current-result',
            timestamp: '2026-04-18T12:00:00.000Z',
            actionableScore: 82,
            mechanicalScore: 80,
            coverage: 0.92,
            confidence: 0.9,
            clipQuality: 86,
        },
        recentWindow: {
            count: 3,
            resultIds: ['baseline-result', 'middle-result', 'current-result'],
            actionableAverage: 73,
            mechanicalAverage: 74,
            coverageAverage: 0.9,
            confidenceAverage: 0.88,
            clipQualityAverage: 84,
        },
        actionableDelta: {
            baseline: 64,
            current: 82,
            delta: 18,
            recentWindowAverage: 73,
            recentWindowDelta: 9,
        },
        mechanicalDelta: {
            baseline: 68,
            current: 80,
            delta: 12,
            recentWindowAverage: 74,
            recentWindowDelta: 6,
        },
        pillarDeltas: [],
        recurringDiagnoses: [],
        blockerSummaries: [],
        blockedClips: [],
        confidence: 0.9,
        coverage: 0.92,
        nextValidationHint: 'Progresso validado. Consolide o mesmo contexto antes de trocar variavel.',
    };
}

function buildValidatedSensitivityPlan(overrides: Partial<AnalysisResult> = {}) {
    const analysisResult = {
        ...analysisResultWithStrongSensitivity,
        precisionTrend: validatedProgressTrend(),
        ...overrides,
    };
    const memorySnapshot = buildCoachMemorySnapshot({
        currentResult: analysisResult,
        historySessions: [],
    });

    return buildCoachPlan({
        analysisResult,
        memorySnapshot,
    });
}

describe('buildCoachPlan', () => {
    it('returns the base CoachPlan fields needed by the coaching session summary', () => {
        const plan = buildCoachPlan({ analysisResult: analysisResultBase });

        expect(plan).toEqual(expect.objectContaining({
            tier: expect.any(String),
            primaryFocus: expect.objectContaining({
                id: expect.any(String),
                area: expect.any(String),
                title: expect.any(String),
                whyNow: expect.any(String),
                priorityScore: expect.any(Number),
                severity: expect.any(Number),
                confidence: expect.any(Number),
                coverage: expect.any(Number),
                dependencies: expect.any(Array),
                blockedBy: expect.any(Array),
                signals: expect.any(Array),
            }),
            nextBlock: expect.objectContaining({
                title: expect.any(String),
                durationMinutes: expect.any(Number),
                steps: expect.any(Array),
                checks: expect.any(Array),
            }),
        }));
        expect(plan.secondaryFocuses.length).toBeLessThanOrEqual(2);
        expect(plan.actionProtocols).toHaveLength(1);
    });

    it('uses the highest ranked raw priority as the primary focus', () => {
        const plan = buildCoachPlan({ analysisResult: analysisResultBase });

        expect(plan.primaryFocus).toEqual(expect.objectContaining({
            area: 'vertical_control',
            priorityScore: expect.any(Number),
        }));
    });

    it('exposes blocked sensitivity as a secondary focus when capture quality wins', () => {
        const plan = buildCoachPlan({ analysisResult: analysisResultWithWeakCapture });

        expect(plan.primaryFocus.area).toBe('capture_quality');
        expect(plan.secondaryFocuses).toEqual(expect.arrayContaining([
            expect.objectContaining({
                area: 'sensitivity',
                blockedBy: ['capture_quality'],
                dependencies: ['capture_quality'],
            }),
        ]));
    });

    it('uses capture_again when capture quality does not sustain analysis', () => {
        const plan = buildCoachPlan({ analysisResult: analysisResultWithWeakCapture });

        expect(plan.tier).toBe('capture_again');
        expect(plan.tier).not.toBe('apply_protocol');
    });

    it('uses test_protocol when evidence is partial and still experimental', () => {
        const plan = buildCoachPlan({ analysisResult: analysisResultBase });

        expect(plan.tier).toBe('test_protocol');
    });

    it('uses stabilize_block when consistency is the dominant focus', () => {
        const inconsistentAnalysis = createAnalysisResultFixture({
            ...analysisResultWithStrongSensitivity,
            diagnoses: [{
                type: 'inconsistency',
                severity: 4,
                consistencyScore: asScore(34),
                confidence: 0.86,
                evidence: {
                    confidence: 0.86,
                    coverage: 0.82,
                    angularErrorDegrees: 1.5,
                    linearErrorCm: 58,
                    linearErrorSeverity: 4,
                },
                description: 'Spray muito variavel entre tentativas compativeis',
                cause: 'A variabilidade ainda domina antes de mexer em sensibilidade',
                remediation: 'Estabilize o mesmo bloco antes de aplicar nova sensibilidade',
            }],
        });

        const plan = buildCoachPlan({ analysisResult: inconsistentAnalysis });

        expect(plan.primaryFocus.area).toBe('consistency');
        expect(plan.tier).toBe('stabilize_block');
    });

    it('keeps a strong current clip in test_protocol until compatible memory validates it', () => {
        const plan = buildCoachPlan({ analysisResult: analysisResultWithStrongSensitivity });

        expect(plan.primaryFocus.area).toBe('sensitivity');
        expect(plan.tier).toBe('test_protocol');
    });

    it('uses apply_protocol when strong current evidence has strict compatible validation', () => {
        const plan = buildValidatedSensitivityPlan();

        expect(plan.primaryFocus.area).toBe('sensitivity');
        expect(plan.tier).toBe('apply_protocol');
    });

    it('requires strong_analysis decision before applying a protocol', () => {
        const usablePlan = buildValidatedSensitivityPlan({
            analysisDecision: resolveAnalysisDecision({
                confidence: 0.91,
                coverage: 0.9,
            }),
        });
        const partialPlan = buildCoachPlan({
            analysisResult: {
                ...analysisResultBase,
                analysisDecision: resolveAnalysisDecision({
                    blockerReasons: ['low_confidence'],
                    confidence: 0.55,
                    coverage: 0.7,
                }),
            },
        });

        expect(usablePlan.tier).toBe('test_protocol');
        expect(partialPlan.tier).toBe('test_protocol');
        expect(partialPlan.tier).not.toBe('apply_protocol');
    });

    it('downgrades strong evidence to test_protocol when sensitivity history is conflicting', () => {
        const conflictingStrongEvidence = createAnalysisResultFixture({
            ...analysisResultWithStrongSensitivity,
            sensitivity: {
                historyConvergence: {
                    matchingSessions: 1,
                    consideredSessions: 3,
                    consensusProfile: 'low',
                    supportRatio: 0.34,
                    agreement: 'conflicting',
                    summary: 'Historico recente conflita com a sessao atual.',
                },
            },
        });

        const plan = buildCoachPlan({ analysisResult: conflictingStrongEvidence });

        expect(plan.tier).toBe('test_protocol');
    });

    it('downgrades apply_protocol when coach memory conflicts with the current sensitivity profile', () => {
        const memorySnapshot = buildCoachMemorySnapshot({
            currentResult: analysisResultWithStrongSensitivity,
            historySessions: [{
                id: 'history-sensitivity-worse',
                createdAt: new Date('2026-04-17T12:00:00.000Z'),
                patchVersion: analysisResultWithStrongSensitivity.patchVersion,
                distance: analysisResultWithStrongSensitivity.analysisContext?.targetDistanceMeters,
                loadout: analysisResultWithStrongSensitivity.loadout,
                fullResult: {
                    coachPlan: {
                        primaryFocus: { area: 'sensitivity' },
                    },
                    sensitivity: {
                        recommended: 'high',
                        acceptanceFeedback: {
                            testedProfile: 'high',
                            outcome: 'worse',
                            recordedAt: '2026-04-17T13:00:00.000Z',
                        },
                    },
                },
            }],
        });

        const plan = buildCoachPlan({
            analysisResult: analysisResultWithStrongSensitivity,
            memorySnapshot,
        });

        const sensitivityPriority = [plan.primaryFocus, ...plan.secondaryFocuses]
            .find((priority) => priority.area === 'sensitivity');

        expect(sensitivityPriority?.blockedBy).toContain('history_conflict');
        expect(plan.tier).toBe('test_protocol');
    });

    it('blocks apply_protocol when self-report conflicts with compatible trend evidence', () => {
        const analysisResult = {
            ...analysisResultWithStrongSensitivity,
            precisionTrend: {
                ...validatedProgressTrend(),
                label: 'validated_regression' as const,
                actionableDelta: {
                    baseline: 84,
                    current: 70,
                    delta: -14,
                    recentWindowAverage: 78,
                    recentWindowDelta: -8,
                },
                nextValidationHint: 'Regressao validada. Grave uma validacao curta antes de avancar.',
            },
        };
        const memorySnapshot = buildCoachMemorySnapshot({
            currentResult: analysisResult,
            historySessions: [{
                id: 'history-outcome-1',
                createdAt: new Date('2026-04-17T12:00:00.000Z'),
                patchVersion: analysisResult.patchVersion,
                distance: analysisResult.analysisContext?.targetDistanceMeters,
                loadout: analysisResult.loadout,
                fullResult: {
                    coachPlan: {
                        primaryFocus: { area: 'sensitivity' },
                    },
                },
            }],
            protocolOutcomes: [
                coachProtocolOutcome({
                    status: 'improved',
                    evidenceStrength: 'conflict',
                    conflict: {
                        userOutcomeId: 'outcome-1',
                        precisionTrendLabel: 'validated_regression',
                        reason: 'Self-report improved, but strict compatible precision validated regression.',
                        nextValidationCopy: 'Grave uma validacao curta.',
                    },
                    coachSnapshot: {
                        tier: 'test_protocol',
                        primaryFocusArea: 'sensitivity',
                        primaryFocusTitle: 'Sensibilidade',
                        protocolId: 'sensitivity-test-protocol',
                        validationTarget: 'perfil recomendado melhora com contexto fixo',
                        precisionTrendLabel: 'validated_regression',
                    },
                }),
            ],
        });

        const plan = buildCoachPlan({ analysisResult, memorySnapshot });

        expect(plan.tier).toBe('test_protocol');
        expect(memorySnapshot.conflictingFocusAreas).toContain('sensitivity');
    });

    it('uses stabilize_block when neutral outcomes or initial trend make stronger action premature', () => {
        const analysisResult = {
            ...analysisResultWithStrongSensitivity,
            precisionTrend: {
                ...validatedProgressTrend(),
                label: 'initial_signal' as const,
                evidenceLevel: 'initial' as const,
                compatibleCount: 2,
                nextValidationHint: 'Sinal inicial registrado. Grave uma terceira validacao compativel.',
            },
        };
        const memorySnapshot = buildCoachMemorySnapshot({
            currentResult: analysisResult,
            historySessions: [{
                id: 'history-outcome-1',
                createdAt: new Date('2026-04-17T12:00:00.000Z'),
                patchVersion: analysisResult.patchVersion,
                distance: analysisResult.analysisContext?.targetDistanceMeters,
                loadout: analysisResult.loadout,
                fullResult: {
                    coachPlan: {
                        primaryFocus: { area: 'sensitivity' },
                    },
                },
            }],
            protocolOutcomes: [
                coachProtocolOutcome({
                    status: 'completed',
                    evidenceStrength: 'neutral',
                }),
            ],
        });

        const plan = buildCoachPlan({ analysisResult, memorySnapshot });
        const sensitivityPriority = [plan.primaryFocus, ...plan.secondaryFocuses]
            .find((priority) => priority.area === 'sensitivity');

        expect(plan.tier).toBe('stabilize_block');
        expect(sensitivityPriority?.blockedBy).toContain('validation');
    });

    it('adds a revised hypothesis when the same focus fails twice', () => {
        const verticalDominantResult = createAnalysisResultFixture({
            ...analysisResultBase,
            diagnoses: [{
                type: 'underpull',
                severity: 5,
                verticalControlIndex: 0.58,
                deficitPercent: 42,
                confidence: 0.95,
                evidence: {
                    confidence: 0.95,
                    coverage: 0.92,
                    angularErrorDegrees: 1.8,
                    linearErrorCm: 70,
                    linearErrorSeverity: 5,
                },
                description: 'Controle vertical segue dominante no clip atual',
                cause: 'O sustain ainda perde pressao mesmo com captura usavel',
                remediation: 'Revise a hipotese antes de repetir o mesmo bloco vertical',
            }],
        });
        const memorySnapshot = buildCoachMemorySnapshot({
            currentResult: verticalDominantResult,
            historySessions: [
                {
                    id: 'history-outcome-1',
                    createdAt: new Date('2026-04-17T12:00:00.000Z'),
                    patchVersion: verticalDominantResult.patchVersion,
                    distance: verticalDominantResult.analysisContext?.targetDistanceMeters,
                    loadout: verticalDominantResult.loadout,
                    fullResult: {
                        coachPlan: {
                            primaryFocus: { area: 'vertical_control' },
                        },
                    },
                },
                {
                    id: 'history-outcome-2',
                    createdAt: new Date('2026-04-16T12:00:00.000Z'),
                    patchVersion: verticalDominantResult.patchVersion,
                    distance: verticalDominantResult.analysisContext?.targetDistanceMeters,
                    loadout: verticalDominantResult.loadout,
                    fullResult: {
                        coachPlan: {
                            primaryFocus: { area: 'vertical_control' },
                        },
                    },
                },
            ],
            protocolOutcomes: [
                coachProtocolOutcome({
                    id: 'worse-outcome-1',
                    sessionId: 'history-outcome-1',
                    protocolId: 'vertical-control-drill-protocol',
                    focusArea: 'vertical_control',
                    status: 'worse',
                    evidenceStrength: 'weak_self_report',
                }),
                coachProtocolOutcome({
                    id: 'worse-outcome-2',
                    sessionId: 'history-outcome-2',
                    protocolId: 'vertical-control-drill-protocol',
                    focusArea: 'vertical_control',
                    status: 'worse',
                    evidenceStrength: 'weak_self_report',
                    recordedAt: '2026-04-16T12:30:00.000Z',
                }),
            ],
        });

        const plan = buildCoachPlan({
            analysisResult: verticalDominantResult,
            memorySnapshot,
        });

        expect(plan.tier).toBe('test_protocol');
        expect(plan.primaryFocus.area).toBe('vertical_control');
        expect(plan.primaryFocus.blockedBy).toContain('revised_hypothesis');
        expect(plan.actionProtocols).toHaveLength(1);
        expect(plan.actionProtocols[0]).toEqual(expect.objectContaining({
            id: expect.stringContaining('revised-hypothesis'),
            avoidWhen: expect.stringContaining('nova hipotese'),
        }));
    });

    it('raises primary focus confidence when coach memory strongly aligns', () => {
        const planWithoutMemory = buildCoachPlan({ analysisResult: analysisResultBase });
        const memorySnapshot = buildCoachMemorySnapshot({
            currentResult: analysisResultBase,
            historySessions: [
                {
                    id: 'history-vertical-1',
                    createdAt: new Date('2026-04-17T12:00:00.000Z'),
                    patchVersion: analysisResultBase.patchVersion,
                    distance: analysisResultBase.analysisContext?.targetDistanceMeters,
                    loadout: analysisResultBase.loadout,
                    fullResult: {
                        coachPlan: {
                            primaryFocus: { area: 'vertical_control' },
                        },
                    },
                },
                {
                    id: 'history-vertical-2',
                    createdAt: new Date('2026-04-17T13:00:00.000Z'),
                    patchVersion: analysisResultBase.patchVersion,
                    distance: analysisResultBase.analysisContext?.targetDistanceMeters,
                    loadout: analysisResultBase.loadout,
                    fullResult: {
                        coachPlan: {
                            primaryFocus: { area: 'vertical_control' },
                        },
                    },
                },
            ],
        });

        const planWithMemory = buildCoachPlan({
            analysisResult: analysisResultBase,
            memorySnapshot,
        });

        expect(planWithMemory.primaryFocus.area).toBe('vertical_control');
        expect(planWithMemory.primaryFocus.confidence).toBeGreaterThan(planWithoutMemory.primaryFocus.confidence);
        expect(planWithMemory.primaryFocus.signals).toEqual(expect.arrayContaining([
            expect.objectContaining({
                source: 'history',
                key: 'history.aligned.vertical_control',
            }),
        ]));
    });

    it('builds action protocols that match conservative and apply-ready tiers', () => {
        const weakCapturePlan = buildCoachPlan({ analysisResult: analysisResultWithWeakCapture });
        const applyReadyPlan = buildValidatedSensitivityPlan();

        expect(weakCapturePlan.actionProtocols).toEqual([
            expect.objectContaining({
                kind: 'capture',
                risk: 'low',
                instruction: expect.any(String),
                expectedEffect: expect.any(String),
                applyWhen: expect.any(String),
            }),
        ]);
        expect(weakCapturePlan.actionProtocols).not.toEqual(expect.arrayContaining([
            expect.objectContaining({ kind: 'sens' }),
        ]));

        expect(applyReadyPlan.actionProtocols).toEqual(expect.arrayContaining([
            expect.objectContaining({
                kind: 'sens',
                risk: expect.stringMatching(/^(low|medium)$/),
                instruction: expect.any(String),
                expectedEffect: expect.any(String),
                applyWhen: expect.any(String),
                avoidWhen: expect.any(String),
            }),
        ]));
    });

    it('builds the next block with objective steps and validation checks', () => {
        const plan = buildCoachPlan({ analysisResult: analysisResultBase });

        expect(plan.nextBlock.durationMinutes).toBeGreaterThan(0);
        expect(plan.nextBlock.steps.length).toBeGreaterThan(0);
        expect(plan.nextBlock.checks.length).toBeGreaterThan(0);
        expect(plan.nextBlock.steps.every((step) => step.length > 0)).toBe(true);
        expect(plan.nextBlock.checks).toEqual(expect.arrayContaining([
            expect.objectContaining({
                label: expect.any(String),
                target: expect.any(String),
                minimumCoverage: expect.any(Number),
                minimumConfidence: expect.any(Number),
                successCondition: expect.any(String),
                failCondition: expect.any(String),
            }),
        ]));
        expect(plan.nextBlock.checks.every((check) => (
            check.minimumCoverage > 0
            && check.minimumCoverage <= 1
            && check.minimumConfidence > 0
            && check.minimumConfidence <= 1
        ))).toBe(true);
    });

    it('keeps deterministic coach plan copy in pt-BR for user-facing fields', () => {
        const plan = buildCoachPlan({ analysisResult: analysisResultBase });
        const copy = [
            plan.sessionSummary,
            plan.primaryFocus.title,
            plan.primaryFocus.whyNow,
            ...plan.actionProtocols.flatMap((protocol) => [
                protocol.instruction,
                protocol.expectedEffect,
                protocol.applyWhen,
                protocol.avoidWhen ?? '',
            ]),
            plan.nextBlock.title,
            ...plan.nextBlock.steps,
            ...plan.nextBlock.checks.flatMap((check) => [
                check.label,
                check.target,
                check.successCondition,
                check.failCondition,
            ]),
            ...plan.stopConditions,
        ].join(' ');

        expect(copy).not.toMatch(/short vertical|vertical control|success when|fail if|threshold|setup|drift|grip|loadout|sensitivity profile/i);
        expect(copy).toContain('controle vertical');
        expect(copy).toContain('Sucesso quando');
    });

    it('adds stop conditions and an adaptation window for the current tier', () => {
        const testPlan = buildCoachPlan({ analysisResult: analysisResultBase });
        const weakCapturePlan = buildCoachPlan({ analysisResult: analysisResultWithWeakCapture });
        const applyReadyPlan = buildValidatedSensitivityPlan();

        expect(testPlan.stopConditions.length).toBeGreaterThan(0);
        expect(testPlan.adaptationWindowDays).toBeGreaterThan(0);

        expect(weakCapturePlan.stopConditions).toEqual(expect.arrayContaining([
            expect.stringContaining('captura'),
        ]));
        expect(weakCapturePlan.adaptationWindowDays).toBe(1);

        expect(applyReadyPlan.adaptationWindowDays).toBeGreaterThanOrEqual(3);
    });
});
