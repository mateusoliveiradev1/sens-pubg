import { describe, expect, it } from 'vitest';

import {
    analysisResultBase,
    analysisResultWithStrongSensitivity,
} from './coach-test-fixtures';
import { resolveMeasurementTruth } from './measurement-truth';
import { resolvePrecisionTrend } from './precision-loop';
import {
    buildCoachMemorySnapshot,
    type CoachMemoryHistorySession,
} from './coach-memory';
import type {
    AnalysisResult,
    CoachFocusArea,
    CoachProtocolOutcome,
    ProfileType,
    SensitivityAcceptanceOutcome,
} from '../types/engine';

function compatibleHistorySession(
    currentResult: AnalysisResult,
    fullResult: Record<string, unknown>,
    id: string,
): CoachMemoryHistorySession {
    return {
        id,
        createdAt: new Date('2026-04-17T12:00:00.000Z'),
        patchVersion: currentResult.patchVersion,
        distance: currentResult.analysisContext?.targetDistanceMeters,
        loadout: currentResult.loadout,
        fullResult,
    };
}

function historyWithPrimaryFocus(area: CoachFocusArea, id: string): CoachMemoryHistorySession {
    return compatibleHistorySession(analysisResultBase, {
        coachPlan: {
            primaryFocus: { area },
        },
    }, id);
}

function historyWithSensitivityOutcome(
    testedProfile: ProfileType,
    outcome: SensitivityAcceptanceOutcome,
): CoachMemoryHistorySession {
    return compatibleHistorySession(analysisResultWithStrongSensitivity, {
        coachPlan: {
            primaryFocus: { area: 'sensitivity' },
        },
        sensitivity: {
            recommended: testedProfile,
            acceptanceFeedback: {
                testedProfile,
                outcome,
                recordedAt: '2026-04-17T13:00:00.000Z',
            },
        },
    }, `history-sensitivity-${outcome}`);
}

function coachProtocolOutcome(
    overrides: Partial<CoachProtocolOutcome> = {},
): CoachProtocolOutcome {
    return {
        id: 'outcome-1',
        sessionId: 'history-outcome-1',
        coachPlanId: 'plan-1',
        protocolId: 'vertical-control-drill-protocol',
        focusArea: 'vertical_control',
        status: 'completed',
        reasonCodes: [],
        recordedAt: '2026-04-17T12:30:00.000Z',
        evidenceStrength: 'neutral',
        ...overrides,
    };
}

describe('buildCoachMemorySnapshot', () => {
    it('emits a conflict signal when the current sensitivity profile failed in compatible history', () => {
        const snapshot = buildCoachMemorySnapshot({
            currentResult: analysisResultWithStrongSensitivity,
            historySessions: [
                historyWithSensitivityOutcome('high', 'worse'),
            ],
        });

        expect(snapshot.compatibleSessionCount).toBe(1);
        expect(snapshot.conflictingFocusAreas).toEqual(['sensitivity']);
        expect(snapshot.signals).toEqual(expect.arrayContaining([
            expect.objectContaining({
                source: 'history',
                area: 'sensitivity',
                key: 'history.conflict.sensitivity',
                summary: expect.stringContaining('worse'),
            }),
        ]));
    });

    it('recognizes recurrent aligned primary focuses from compatible sessions', () => {
        const snapshot = buildCoachMemorySnapshot({
            currentResult: analysisResultBase,
            historySessions: [
                historyWithPrimaryFocus('vertical_control', 'history-vertical-1'),
                historyWithPrimaryFocus('vertical_control', 'history-vertical-2'),
            ],
        });

        expect(snapshot.compatibleSessionCount).toBe(2);
        expect(snapshot.alignedFocusAreas).toEqual(['vertical_control']);
        expect(snapshot.recurrentFocuses).toEqual([
            expect.objectContaining({
                area: 'vertical_control',
                count: 2,
                supportRatio: 1,
            }),
        ]);
        expect(snapshot.signals).toEqual(expect.arrayContaining([
            expect.objectContaining({
                source: 'history',
                area: 'vertical_control',
                key: 'history.aligned.vertical_control',
            }),
        ]));
    });

    it('ignores sessions outside the compatible patch, loadout, and distance window', () => {
        const snapshot = buildCoachMemorySnapshot({
            currentResult: analysisResultBase,
            historySessions: [
                {
                    ...historyWithPrimaryFocus('vertical_control', 'history-incompatible'),
                    patchVersion: '40.1',
                    distance: 120,
                    loadout: {
                        ...analysisResultBase.loadout,
                        grip: 'angled',
                    },
                },
            ],
        });

        expect(snapshot.compatibleSessionCount).toBe(0);
        expect(snapshot.signals).toEqual([]);
    });

    it('adds conservative validation signals for baseline precision trends', () => {
        const precisionTrend = resolvePrecisionTrend({
            current: {
                ...analysisResultBase,
                mastery: resolveMeasurementTruth(analysisResultBase),
            },
            history: [],
        });
        const snapshot = buildCoachMemorySnapshot({
            currentResult: {
                ...analysisResultBase,
                precisionTrend,
            },
            historySessions: [],
        });

        expect(snapshot.precisionTrend).toEqual(expect.objectContaining({
            label: 'baseline',
            compatibleCount: 1,
        }));
        expect(snapshot.signals).toEqual(expect.arrayContaining([
            expect.objectContaining({
                source: 'history',
                area: 'validation',
                key: 'precision.baseline',
            }),
        ]));
    });

    it('marks precision regression as a conservative history conflict', () => {
        const precisionTrend = {
            ...resolvePrecisionTrend({
                current: {
                    ...analysisResultBase,
                    mastery: resolveMeasurementTruth(analysisResultBase),
                },
                history: [],
            }),
            label: 'validated_regression' as const,
            compatibleCount: 3,
            evidenceLevel: 'strong' as const,
            actionableDelta: {
                baseline: 84,
                current: 70,
                delta: -14,
                recentWindowAverage: 80,
                recentWindowDelta: -10,
            },
            nextValidationHint: 'Regressao validada. Volte ao ultimo baseline confiavel.',
        };

        const snapshot = buildCoachMemorySnapshot({
            currentResult: {
                ...analysisResultBase,
                precisionTrend,
            },
            historySessions: [],
        });

        expect(snapshot.conflictingFocusAreas).toEqual(['sensitivity']);
        expect(snapshot.signals).toEqual(expect.arrayContaining([
            expect.objectContaining({
                key: 'precision.validated_regression',
                summary: expect.stringContaining('regression'),
            }),
        ]));
    });

    it('uses strict compatible outcome memory before global fallback outcomes', () => {
        const compatibleSession = historyWithPrimaryFocus('vertical_control', 'history-outcome-1');
        const snapshot = buildCoachMemorySnapshot({
            currentResult: analysisResultBase,
            historySessions: [compatibleSession],
            protocolOutcomes: [
                coachProtocolOutcome({
                    id: 'strict-completed',
                    sessionId: compatibleSession.id,
                    status: 'completed',
                    evidenceStrength: 'neutral',
                }),
                coachProtocolOutcome({
                    id: 'global-confirmed',
                    sessionId: 'different-context-session',
                    focusArea: 'sensitivity',
                    status: 'improved',
                    evidenceStrength: 'confirmed_by_compatible_clip',
                    coachSnapshot: {
                        tier: 'test_protocol',
                        primaryFocusArea: 'sensitivity',
                        primaryFocusTitle: 'Sensibilidade',
                        protocolId: 'sensitivity-test-protocol',
                        validationTarget: 'perfil recomendado melhora com contexto fixo',
                        precisionTrendLabel: 'validated_progress',
                    },
                }),
            ],
        });

        expect(snapshot.outcomeMemory.activeLayer).toBe('strict_compatible');
        expect(snapshot.outcomeMemory.strictCompatible.neutralCount).toBe(1);
        expect(snapshot.outcomeMemory.globalFallback.confirmedCount).toBe(1);
        expect(snapshot.signals).toEqual(expect.arrayContaining([
            expect.objectContaining({
                key: 'outcome.strict_compatible.pending',
                area: 'validation',
            }),
        ]));
        expect(snapshot.signals).not.toEqual(expect.arrayContaining([
            expect.objectContaining({
                key: 'outcome.global_fallback.confirmed.sensitivity',
            }),
        ]));
    });

    it('keeps improved outcomes weak until compatible precision validates progress', () => {
        const compatibleSession = historyWithPrimaryFocus('vertical_control', 'history-outcome-1');
        const snapshot = buildCoachMemorySnapshot({
            currentResult: analysisResultBase,
            historySessions: [compatibleSession],
            protocolOutcomes: [
                coachProtocolOutcome({
                    id: 'weak-improved',
                    sessionId: compatibleSession.id,
                    status: 'improved',
                    evidenceStrength: 'weak_self_report',
                }),
            ],
        });

        expect(snapshot.outcomeMemory.activeLayer).toBe('strict_compatible');
        expect(snapshot.outcomeMemory.confirmedCount).toBe(0);
        expect(snapshot.outcomeMemory.strictCompatible.weakSelfReportCount).toBe(1);
        expect(snapshot.alignedFocusAreas).not.toContain('vertical_control');
        expect(snapshot.signals).toEqual(expect.arrayContaining([
            expect.objectContaining({
                key: 'outcome.strict_compatible.weak_self_report.vertical_control',
                weight: expect.any(Number),
            }),
        ]));
    });

    it('downweights stale compatible outcomes outside the hybrid memory window', () => {
        const compatibleSession = {
            ...historyWithPrimaryFocus('vertical_control', 'history-stale-outcome'),
            createdAt: new Date('2026-03-01T12:00:00.000Z'),
        };
        const snapshot = buildCoachMemorySnapshot({
            currentResult: analysisResultBase,
            historySessions: [compatibleSession],
            protocolOutcomes: [
                coachProtocolOutcome({
                    id: 'stale-confirmed',
                    sessionId: compatibleSession.id,
                    recordedAt: '2026-03-01T12:30:00.000Z',
                    status: 'improved',
                    evidenceStrength: 'confirmed_by_compatible_clip',
                    coachSnapshot: {
                        tier: 'test_protocol',
                        primaryFocusArea: 'vertical_control',
                        primaryFocusTitle: 'Controle vertical',
                        protocolId: 'vertical-control-drill-protocol',
                        validationTarget: 'consolidar o mesmo contexto',
                        precisionTrendLabel: 'validated_progress',
                    },
                }),
            ],
        });

        expect(snapshot.outcomeMemory.activeLayer).toBe('none');
        expect(snapshot.outcomeMemory.strictCompatible.outcomeCount).toBe(0);
        expect(snapshot.outcomeMemory.strictCompatible.staleOutcomeCount).toBe(1);
        expect(snapshot.signals).toEqual(expect.arrayContaining([
            expect.objectContaining({
                key: 'outcome.strict_compatible.stale',
                area: 'validation',
            }),
        ]));
    });

    it('treats invalid capture outcomes as validation friction instead of protocol failure', () => {
        const compatibleSession = historyWithPrimaryFocus('vertical_control', 'history-outcome-1');
        const snapshot = buildCoachMemorySnapshot({
            currentResult: analysisResultBase,
            historySessions: [compatibleSession],
            protocolOutcomes: [
                coachProtocolOutcome({
                    id: 'invalid-capture',
                    sessionId: compatibleSession.id,
                    status: 'invalid_capture',
                    reasonCodes: ['capture_quality'],
                    evidenceStrength: 'invalid',
                }),
            ],
        });

        expect(snapshot.outcomeMemory.invalidCount).toBe(1);
        expect(snapshot.outcomeMemory.repeatedFailureCount).toBe(0);
        expect(snapshot.conflictingFocusAreas).not.toContain('vertical_control');
        expect(snapshot.signals).toEqual(expect.arrayContaining([
            expect.objectContaining({
                key: 'outcome.strict_compatible.invalid_capture',
                area: 'capture_quality',
            }),
        ]));
    });
});
