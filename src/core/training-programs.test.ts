import { describe, expect, it } from 'vitest';

import { resolveAnalysisDecision } from './analysis-decision';
import { buildCoachPlan } from './coach-plan-builder';
import {
    analysisResultWithWeakCapture,
    createAnalysisResultFixture,
} from './coach-test-fixtures';
import {
    createRepairProgramCycle,
    createTrainingProgramCycle,
    resolveTrainingProgramContextKey,
    resolveTrainingProgramEligibility,
} from './training-programs';
import type {
    AnalysisResult,
    CompleteTrainingProtocol,
} from '../types/engine';

const NOW = '2026-05-08T20:00:00.000Z';

function savedAnalysis(overrides: Parameters<typeof createAnalysisResultFixture>[0] = {}): AnalysisResult {
    return createAnalysisResultFixture({
        historySessionId: 'history-analysis-1',
        analysisDecision: resolveAnalysisDecision({
            confidence: 0.88,
            coverage: 0.86,
            commercialEvidence: true,
        }),
        mastery: {
            actionState: 'ready',
            actionLabel: 'Pronto',
            mechanicalLevel: 'advanced',
            mechanicalLevelLabel: 'Avancado',
            actionableScore: 78,
            mechanicalScore: 76,
            pillars: {
                control: 77,
                consistency: 75,
                confidence: 88,
                clipQuality: 84,
            },
            evidence: {
                coverage: 0.86,
                confidence: 0.88,
                visibleFrames: 30,
                lostFrames: 2,
                framesProcessed: 32,
                sampleSize: 30,
                qualityScore: 84,
                usableForAnalysis: true,
            },
            reasons: [],
            blockedRecommendations: [],
        },
        ...overrides,
    });
}

function protocolFor(result: AnalysisResult): CompleteTrainingProtocol {
    const protocol = buildCoachPlan({ analysisResult: result }).completeProtocol;

    if (!protocol) {
        throw new Error('Expected complete protocol fixture');
    }

    return protocol;
}

describe('training program eligibility and cycle birth', () => {
    it('creates a full Ciclo Pro for a saved usable analysis with a complete protocol', () => {
        const analysis = savedAnalysis();
        const protocol = protocolFor(analysis);
        const cycle = createTrainingProgramCycle({
            analysisResult: analysis,
            protocol,
            now: NOW,
        });

        expect(cycle).toMatchObject({
            version: 'ciclo-pro-v1',
            kind: 'ciclo_pro',
            state: 'ativo',
            baseAnalysisId: 'history-analysis-1',
            currentWeekNumber: 1,
            recoveryAction: 'consolidar',
        });
        expect(cycle.reasonCodes).toEqual([]);
        expect(cycle.activeLine?.contextKey).toBe(cycle.strictContextKey);
        expect(cycle.evidenceSummary.protocolId).toBe(protocol.id);
    });

    it('routes weak analysis evidence into Ciclo de Reparo instead of fake progress', () => {
        const weakAnalysis = createAnalysisResultFixture({
            ...analysisResultWithWeakCapture,
            historySessionId: 'history-weak-1',
            analysisDecision: resolveAnalysisDecision({
                blockerReasons: ['low_confidence', 'low_coverage'],
                confidence: 0.42,
                coverage: 0.48,
            }),
        });
        const cycle = createTrainingProgramCycle({
            analysisResult: weakAnalysis,
            protocol: protocolFor(weakAnalysis),
            now: NOW,
        });

        expect(cycle.kind).toBe('ciclo_reparo');
        expect(cycle.state).toBe('reparando');
        expect(cycle.reasonCodes).toEqual(expect.arrayContaining([
            'weak_base_evidence',
            'low_confidence',
            'low_coverage',
        ]));
        expect(cycle.evidenceSummary.summary).toContain('reparo');
    });

    it('keeps missing context or missing protocol as visible repair reasons', () => {
        const analysis = savedAnalysis({
            analysisContext: {
                targetDistanceMeters: Number.NaN,
                distanceMode: 'unknown',
                optic: {
                    scopeId: '',
                    opticId: '',
                    opticStateId: 'unknown',
                    opticName: '',
                    opticStateName: 'unknown',
                    availableStateIds: [],
                    isDynamicOptic: false,
                },
            },
        });
        const eligibility = resolveTrainingProgramEligibility({
            analysisResult: analysis,
            protocol: null,
            now: NOW,
        });
        const repairCycle = createRepairProgramCycle({
            analysisResult: analysis,
            protocol: null,
            now: NOW,
        });

        expect(eligibility.kind).toBe('ciclo_reparo');
        expect(eligibility.reasonCodes).toEqual(expect.arrayContaining([
            'missing_context',
            'missing_protocol',
        ]));
        expect(eligibility.userVisibleReasons.join(' ')).toContain('ficha de treino');
        expect(repairCycle.kind).toBe('ciclo_reparo');
    });

    it('restarts the active line for structural context changes without overwriting the old line', () => {
        const originalAnalysis = savedAnalysis();
        const originalProtocol = protocolFor(originalAnalysis);
        const originalCycle = createTrainingProgramCycle({
            analysisResult: originalAnalysis,
            protocol: originalProtocol,
            now: NOW,
        });
        const changedAnalysis = savedAnalysis({
            id: 'analysis-weapon-change',
            historySessionId: 'history-analysis-2',
            trajectory: {
                weaponId: 'akm',
            },
        });
        const changedProtocol = protocolFor(changedAnalysis);
        const restartedCycle = createTrainingProgramCycle({
            analysisResult: changedAnalysis,
            protocol: changedProtocol,
            activeLine: originalCycle.activeLine,
            now: '2026-05-09T20:00:00.000Z',
        });

        expect(resolveTrainingProgramContextKey({
            analysisResult: originalAnalysis,
            protocol: originalProtocol,
        })).not.toBe(resolveTrainingProgramContextKey({
            analysisResult: changedAnalysis,
            protocol: changedProtocol,
        }));
        expect(restartedCycle.kind).toBe('ciclo_pro');
        expect(restartedCycle.state).toBe('linha_reiniciada');
        expect(restartedCycle.reasonCodes).toContain('line_restart');
        expect(restartedCycle.archivedLines).toHaveLength(1);
        expect(restartedCycle.archivedLines[0]).toMatchObject({
            active: false,
            contextKey: originalCycle.strictContextKey,
        });
        expect(restartedCycle.activeLine?.contextKey).toBe(restartedCycle.strictContextKey);
    });
});
