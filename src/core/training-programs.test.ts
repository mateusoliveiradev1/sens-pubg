import { describe, expect, it } from 'vitest';

import { resolveAnalysisDecision } from './analysis-decision';
import { buildCoachPlan } from './coach-plan-builder';
import {
    buildTrainingProgramMonthlyCheckpoint,
    buildTrainingProgramTechnicalCheckpoint,
    buildTrainingProgramWeeklyCheckpoint,
} from './training-program-checkpoints';
import {
    analysisResultWithWeakCapture,
    createAnalysisResultFixture,
} from './coach-test-fixtures';
import {
    createRepairProgramCycle,
    createTrainingProgramCycle,
    reduceTrainingProgramEvent,
    resolveTrainingProgramRecoveryState,
    resolveTrainingProgramContextKey,
    resolveTrainingProgramEligibility,
} from './training-programs';
import type {
    AnalysisResult,
    CompleteTrainingProtocol,
    PrecisionTrendSummary,
    SprayLabValidationLink,
} from '../types/engine';
import type {
    TrainingProgramCycleSnapshot,
    TrainingProgramEvidenceSummary,
    TrainingProgramReasonCode,
    TrainingProgramTransitionEvent,
} from '../types/training-programs';

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

function fullCycle(): TrainingProgramCycleSnapshot {
    const analysis = savedAnalysis();

    return createTrainingProgramCycle({
        analysisResult: analysis,
        protocol: protocolFor(analysis),
        now: NOW,
    });
}

function precisionTrend(label: PrecisionTrendSummary['label']): PrecisionTrendSummary {
    return {
        label,
        evidenceLevel: 'strong',
        compatibleCount: 3,
        baseline: null,
        current: {
            resultId: 'history-validation-1',
            timestamp: '2026-05-08T21:00:00.000Z',
            actionableScore: 82,
            mechanicalScore: 78,
            coverage: 0.9,
            confidence: 0.91,
            clipQuality: 86,
        },
        recentWindow: null,
        actionableDelta: null,
        mechanicalDelta: null,
        pillarDeltas: [],
        recurringDiagnoses: [],
        blockerSummaries: [],
        blockedClips: [],
        confidence: 0.91,
        coverage: 0.9,
        nextValidationHint: 'Manter contexto compativel.',
    };
}

function validationLink(status: SprayLabValidationLink['status']): SprayLabValidationLink {
    return {
        version: 'spray-lab-v1',
        id: `validation-${status}`,
        labSessionId: 'lab-1',
        baseAnalysisId: 'history-analysis-1',
        validationAnalysisId: 'history-validation-1',
        contextKey: 'program:context',
        targetCopy: 'Beryl Red Dot 30m',
        status,
        confirmedVariables: true,
        blockers: [],
        precisionTrend: precisionTrend(status === 'regressao_validada' ? 'validated_regression' : 'validated_progress'),
        createdAt: '2026-05-08T21:00:00.000Z',
        updatedAt: '2026-05-08T21:00:00.000Z',
    };
}

function technicalEvidence(
    cycle: TrainingProgramCycleSnapshot,
    status: SprayLabValidationLink['status'] = 'validacao_confirmada',
): TrainingProgramEvidenceSummary {
    return {
        ...cycle.evidenceSummary,
        validationLink: validationLink(status),
        validationStatus: status,
        precisionTrend: precisionTrend(status === 'regressao_validada' ? 'validated_regression' : 'validated_progress'),
        fidelityTier: 'strong',
        blockers: [],
        confidence: 0.91,
        coverage: 0.9,
        summary: 'Validacao compativel anexada ao contexto do ciclo.',
    };
}

function transitionEvent(
    cycle: TrainingProgramCycleSnapshot,
    type: TrainingProgramTransitionEvent['type'],
    reasons: readonly TrainingProgramReasonCode[] = [],
    patch: Partial<TrainingProgramTransitionEvent> = {},
): TrainingProgramTransitionEvent {
    return {
        id: `${cycle.id}:event:${type}:${reasons.join('-') || 'none'}`,
        cycleId: cycle.id,
        type,
        occurredAt: '2026-05-08T22:00:00.000Z',
        fromState: cycle.state,
        toState: cycle.state,
        reasonCodes: reasons,
        userVisibleReason: reasons[0] ?? 'sem mudanca automatica',
        evidenceRefs: [],
        ...patch,
    };
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

describe('training program adaptive week and mission composition', () => {
    it('composes four adaptive weeks with five main missions and two flex slots each', () => {
        const analysis = savedAnalysis();
        const cycle = createTrainingProgramCycle({
            analysisResult: analysis,
            protocol: protocolFor(analysis),
            now: NOW,
        });

        expect(cycle.weeks).toHaveLength(4);

        for (const week of cycle.weeks) {
            expect(week.missions).toHaveLength(7);
            expect(week.missions.map((mission) => mission.slot)).toEqual([
                'main_1',
                'main_2',
                'main_3',
                'main_4',
                'main_5',
                'flex_1',
                'flex_2',
            ]);
        }

        expect(cycle.weeks[0]?.missions.map((mission) => mission.category)).toEqual([
            'preparation',
            'execution',
            'repair',
            'validation',
            'validation',
            'repair',
            'transfer',
        ]);
        expect(cycle.currentMissionId).toBe(cycle.weeks[0]?.missions[0]?.id);
    });

    it('keeps every mission evidence-bound with complete anatomy and handoff CTAs', () => {
        const analysis = savedAnalysis();
        const cycle = createTrainingProgramCycle({
            analysisResult: analysis,
            protocol: protocolFor(analysis),
            now: NOW,
        });
        const missions = cycle.weeks.flatMap((week) => week.missions);

        expect(missions.length).toBe(28);

        for (const current of missions) {
            expect(current.anatomy.agora).not.toHaveLength(0);
            expect(current.anatomy.porQueImporta).not.toHaveLength(0);
            expect(current.anatomy.oQueInvalida).not.toHaveLength(0);
            expect(current.anatomy.evidenciaGerada).not.toHaveLength(0);
            expect(current.anatomy.proximoCta.label).not.toHaveLength(0);
            expect(current.anatomy.proximoCta.href).toMatch(/^\/(spray-lab|analyze\?mode=validation)/);
            expect(current.stateAfterCompletion).not.toBe('preparando');
            expect(current.evidenceRefs.some((ref) => ref.kind === 'protocol')).toBe(true);
        }

        const copy = missions.map((mission) => [
            mission.title,
            mission.anatomy.agora,
            mission.anatomy.porQueImporta,
            mission.anatomy.oQueInvalida,
            mission.anatomy.evidenciaGerada,
            mission.anatomy.proximoCta.label,
        ].join(' ')).join(' ').toLowerCase();

        expect(copy).not.toMatch(/\bxp\b|curso|aula|lesson|grind|rank|garantid|melhore sua mira|treine 20 minutos/);
        expect(copy).not.toContain('nota global');
    });

    it('routes execution to Spray Lab and validation to Analyze validation mode', () => {
        const analysis = savedAnalysis();
        const cycle = createTrainingProgramCycle({
            analysisResult: analysis,
            protocol: protocolFor(analysis),
            now: NOW,
        });
        const missions = cycle.weeks[0]?.missions ?? [];
        const execution = missions.find((mission) => mission.slot === 'main_2');
        const validation = missions.find((mission) => mission.slot === 'main_4');

        expect(execution?.category).toBe('execution');
        expect(execution?.anatomy.agora).toContain('lane vinculada');
        expect(execution?.anatomy.evidenciaGerada).toContain('Fidelidade');
        expect(execution?.anatomy.proximoCta.href).toContain('/spray-lab');

        expect(validation?.category).toBe('validation');
        expect(validation?.anatomy.agora).toContain('mesmo contexto');
        expect(validation?.anatomy.oQueInvalida).toContain('sensibilidade');
        expect(validation?.anatomy.proximoCta.href).toContain('/analyze?mode=validation');
    });

    it('creates repair missions for weak base evidence without pretending full progression', () => {
        const weakAnalysis = createAnalysisResultFixture({
            ...analysisResultWithWeakCapture,
            historySessionId: 'history-weak-2',
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
        const missions = cycle.weeks.flatMap((week) => week.missions);

        expect(cycle.kind).toBe('ciclo_reparo');
        expect(cycle.weeks).toHaveLength(1);
        expect(missions.some((mission) => mission.category === 'repair')).toBe(true);
        expect(missions.every((mission) => mission.reasonCodes.length > 0)).toBe(true);
        expect(missions.map((mission) => mission.stateAfterCompletion)).toContain('validacao_pendente');
    });
});

describe('training program checkpoints and recovery', () => {
    it('always builds an operational weekly checkpoint without escalating on rhythm alone', () => {
        const cycle = fullCycle();
        const checkpoint = buildTrainingProgramWeeklyCheckpoint({
            cycle,
            weekNumber: 1,
            now: NOW,
        });

        expect(checkpoint.layer).toBe('weekly_operational');
        expect(checkpoint.weekNumber).toBe(1);
        expect(checkpoint.summary).toContain('Semana 1 fechada');
        expect(checkpoint.canIncreaseDifficulty).toBe(false);
        expect(checkpoint.reasonCodes).toContain('compatible_proof_missing');
    });

    it('creates technical checkpoints only when compatible clip evidence exists', () => {
        const cycle = fullCycle();
        const withoutValidation = buildTrainingProgramTechnicalCheckpoint({
            cycle,
            now: NOW,
        });
        const withValidation = buildTrainingProgramTechnicalCheckpoint({
            cycle,
            evidenceSummary: technicalEvidence(cycle),
            now: NOW,
        });

        expect(withoutValidation).toBeNull();
        expect(withValidation).toMatchObject({
            layer: 'technical_validated',
            state: 'progresso_validado',
            outcome: 'progress_validated',
            canIncreaseDifficulty: true,
        });
        expect(withValidation?.summary).toContain('Conta apenas para este contexto compativel');
    });

    it('summarizes monthly context without a global player grade', () => {
        const cycle = fullCycle();
        const weekly = buildTrainingProgramWeeklyCheckpoint({
            cycle,
            evidenceSummary: technicalEvidence(cycle),
            now: NOW,
        });
        const technical = buildTrainingProgramTechnicalCheckpoint({
            cycle,
            evidenceSummary: technicalEvidence(cycle),
            now: NOW,
        });
        const monthly = buildTrainingProgramMonthlyCheckpoint({
            cycle: {
                ...cycle,
                checkpoints: technical ? [weekly, technical] : [weekly],
                state: 'progresso_validado',
            },
            evidenceSummary: technicalEvidence(cycle),
            now: NOW,
        });

        expect(monthly.layer).toBe('monthly_program');
        expect(monthly.outcome).toBe('cycle_completed');
        expect(monthly.summary).toContain(cycle.strictContextLabel.split(' ')[0] ?? 'Beryl');
        expect(monthly.summary.toLowerCase()).not.toMatch(/rank|nota global|grade global|garantid/);
    });

    it('reduces fatigue, discomfort, confusion and repeated failure without treating them as skill regression', () => {
        const cycle = fullCycle();
        const fatigue = resolveTrainingProgramRecoveryState({
            cycle,
            event: transitionEvent(cycle, 'fatigue_reported', ['fatigue_reduced_dose']),
        });
        const discomfort = resolveTrainingProgramRecoveryState({
            cycle,
            event: transitionEvent(cycle, 'discomfort_reported', ['discomfort_stop']),
        });
        const confusion = resolveTrainingProgramRecoveryState({
            cycle,
            event: transitionEvent(cycle, 'confusion_reported', ['confusion_simplified']),
        });
        const repeatedFailure = resolveTrainingProgramRecoveryState({
            cycle,
            repeatedFailureCount: 2,
        });

        expect(fatigue).toMatchObject({
            state: 'reparando',
            recoveryAction: 'reparar',
            canIncreaseDifficulty: false,
        });
        expect(fatigue.doseMultiplier).toBeLessThan(1);
        expect(fatigue.doseMultiplier).toBeGreaterThan(0);

        expect(discomfort).toMatchObject({
            state: 'pausado',
            recoveryAction: 'pausar_bloco',
            doseMultiplier: 0,
        });
        expect(discomfort.state).not.toBe('regressao_validada');

        expect(confusion.reasonCodes).toContain('confusion_simplified');
        expect(confusion.userVisibleReason).toContain('simplificada');
        expect(repeatedFailure).toMatchObject({
            state: 'consolidando',
            recoveryAction: 'consolidar',
            canIncreaseDifficulty: false,
        });
    });

    it('reduces mission events into auditable state transitions', () => {
        const cycle = fullCycle();
        const missionId = cycle.currentMissionId;

        if (!missionId) {
            throw new Error('Expected active mission');
        }

        const reduced = reduceTrainingProgramEvent(cycle, transitionEvent(cycle, 'mission_completed', [], {
            missionId,
            toState: 'ativo',
        }));

        expect(reduced.transitionEvents).toHaveLength(1);
        expect(reduced.weeks[0]?.missions[0]?.status).toBe('completed');
        expect(reduced.currentMissionId).not.toBe(missionId);
        expect(reduced.state).toBe('ativo');
    });
});
