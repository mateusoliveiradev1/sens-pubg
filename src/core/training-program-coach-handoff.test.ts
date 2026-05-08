import { describe, expect, it } from 'vitest';

import { buildCoachPlan } from './coach-plan-builder';
import {
    analysisResultBase,
    analysisResultWithStrongSensitivity,
} from './coach-test-fixtures';
import { buildTrainingProgramTechnicalCheckpoint } from './training-program-checkpoints';
import { buildTrainingProgramCoachHandoff } from './training-program-coach-handoff';
import { createTrainingProgramCycle } from './training-programs';
import type {
    PrecisionTrendSummary,
    SprayLabValidationLink,
} from '@/types/engine';
import type {
    TrainingProgramCycleSnapshot,
    TrainingProgramEvidenceSummary,
    TrainingProgramReasonCode,
} from '@/types/training-programs';

const NOW = '2026-05-08T21:00:00.000Z';

function baseCycle(): TrainingProgramCycleSnapshot {
    const protocol = buildCoachPlan({ analysisResult: analysisResultBase }).completeProtocol;

    if (!protocol) {
        throw new Error('Expected complete protocol fixture');
    }

    return createTrainingProgramCycle({
        analysisResult: analysisResultBase,
        protocol,
        now: NOW,
    });
}

function precisionTrend(label: PrecisionTrendSummary['label']): PrecisionTrendSummary {
    return {
        label,
        evidenceLevel: 'strong',
        compatibleCount: 3,
        baseline: null,
        current: null,
        recentWindow: null,
        actionableDelta: null,
        mechanicalDelta: null,
        pillarDeltas: [],
        recurringDiagnoses: [],
        blockerSummaries: [],
        blockedClips: [],
        confidence: 0.91,
        coverage: 0.9,
        nextValidationHint: 'Manter o mesmo contexto antes de trocar variavel.',
    };
}

function validationLink(status: SprayLabValidationLink['status']): SprayLabValidationLink {
    return {
        version: 'spray-lab-v1',
        id: `program-validation-${status}`,
        labSessionId: 'lab-program-1',
        baseAnalysisId: 'analysis-fixture-base',
        validationAnalysisId: 'analysis-program-validation',
        contextKey: 'program:beryl:red-dot:30m',
        targetCopy: 'Beryl Red Dot 30m',
        status,
        confirmedVariables: status !== 'nao_compativel',
        blockers: status === 'nao_compativel'
            ? [{
                code: 'scope_mismatch',
                field: 'opticId',
                message: 'Mira mudou no clip de validacao.',
            }]
            : [],
        precisionTrend: precisionTrend(status === 'regressao_validada' ? 'validated_regression' : 'validated_progress'),
        createdAt: NOW,
        updatedAt: NOW,
    };
}

function evidenceWithValidation(
    cycle: TrainingProgramCycleSnapshot,
    status: SprayLabValidationLink['status'],
): TrainingProgramEvidenceSummary {
    return {
        ...cycle.evidenceSummary,
        validationLink: validationLink(status),
        validationStatus: status,
        precisionTrend: precisionTrend(status === 'regressao_validada' ? 'validated_regression' : 'validated_progress'),
        blockers: [],
        confidence: 0.91,
        coverage: 0.9,
        summary: 'Validacao compativel anexada ao ciclo.',
    };
}

function cycleWithTechnicalCheckpoint(
    status: SprayLabValidationLink['status'],
    reasonCodes: readonly TrainingProgramReasonCode[] = [],
): TrainingProgramCycleSnapshot {
    const cycle = baseCycle();
    const evidenceSummary = evidenceWithValidation(cycle, status);
    const checkpoint = buildTrainingProgramTechnicalCheckpoint({
        cycle,
        evidenceSummary,
        now: NOW,
    });

    if (!checkpoint) {
        throw new Error('Expected technical checkpoint fixture');
    }

    return {
        ...cycle,
        state: checkpoint.state,
        checkpoints: [checkpoint],
        reasonCodes: [...checkpoint.reasonCodes, ...reasonCodes],
        evidenceSummary,
    };
}

describe('buildTrainingProgramCoachHandoff', () => {
    it('keeps program completion as execution evidence when compatible proof is missing', () => {
        const handoff = buildTrainingProgramCoachHandoff({
            cycle: {
                ...baseCycle(),
                state: 'concluido',
                currentMissionId: null,
                reasonCodes: [],
            },
        });

        expect(handoff).toEqual(expect.objectContaining({
            technicalProofState: 'none',
            aggressiveness: 'support_continuity',
            llmFactsMutable: false,
        }));
        expect(handoff?.executionEvidence.countsAsTechnicalProof).toBe(false);
        expect(handoff?.compatibleValidation.countsAsTechnicalProof).toBe(false);
        expect(handoff?.coachSignals.some((signal) => signal.key === 'training_program.technical.validated_progress')).toBe(false);
    });

    it('uses compatible technical checkpoints as bounded continuity evidence', () => {
        const handoff = buildTrainingProgramCoachHandoff({
            cycle: cycleWithTechnicalCheckpoint('validacao_confirmada'),
        });

        expect(handoff?.technicalProofState).toBe('validated_progress');
        expect(handoff?.compatibleValidation.countsAsTechnicalProof).toBe(true);
        expect(handoff?.summary).toContain('sem garantir melhora futura');
        expect(handoff?.coachSignals).toEqual(expect.arrayContaining([
            expect.objectContaining({
                key: 'training_program.technical.validated_progress',
                weight: 0.34,
            }),
        ]));
    });

    it('routes validated regression toward recovery instead of stronger action', () => {
        const handoff = buildTrainingProgramCoachHandoff({
            cycle: cycleWithTechnicalCheckpoint('regressao_validada'),
        });

        expect(handoff?.technicalProofState).toBe('validated_regression');
        expect(handoff?.aggressiveness).toBe('recovery_or_baseline');
        expect(handoff?.nextAction.kind).toBe('recover_baseline');
        expect(handoff?.coachSignals).toEqual(expect.arrayContaining([
            expect.objectContaining({
                key: 'training_program.technical.validated_regression',
                weight: 0.56,
            }),
        ]));
    });

    it('treats discomfort stop as dose safety, not skill failure', () => {
        const handoff = buildTrainingProgramCoachHandoff({
            cycle: {
                ...baseCycle(),
                state: 'pausado',
                reasonCodes: ['discomfort_stop'],
            },
        });

        expect(handoff?.aggressiveness).toBe('reduce_dose');
        expect(handoff?.nextAction.kind).toBe('pause_for_safety');
        expect(handoff?.summary).not.toMatch(/falha de habilidade/i);
        expect(handoff?.coachSignals).toEqual(expect.arrayContaining([
            expect.objectContaining({
                key: 'training_program.safety.reduce_dose',
                summary: expect.stringContaining('nao conta como falha de habilidade'),
            }),
        ]));
    });

    it('lets the coach use validated program progress but not completion alone', () => {
        const completedOnly = buildTrainingProgramCoachHandoff({
            cycle: {
                ...baseCycle(),
                state: 'concluido',
                currentMissionId: null,
                reasonCodes: [],
            },
        });
        const validatedProgress = buildTrainingProgramCoachHandoff({
            cycle: cycleWithTechnicalCheckpoint('validacao_confirmada'),
        });

        const completedOnlyPlan = buildCoachPlan({
            analysisResult: analysisResultWithStrongSensitivity,
            trainingProgramHandoffs: completedOnly ? [completedOnly] : [],
        });
        const validatedPlan = buildCoachPlan({
            analysisResult: analysisResultWithStrongSensitivity,
            trainingProgramHandoffs: validatedProgress ? [validatedProgress] : [],
        });

        expect(completedOnlyPlan.tier).toBe('test_protocol');
        expect(validatedPlan.tier).toBe('apply_protocol');
    });
});
