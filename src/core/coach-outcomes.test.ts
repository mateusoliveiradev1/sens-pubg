import { describe, expect, it } from 'vitest';

import {
    detectCoachOutcomePrecisionConflict,
    isCoachProtocolOutcomeReasonCode,
    isCoachProtocolOutcomeStatus,
    normalizeCoachProtocolOutcomeInput,
    resolveCoachOutcomeEvidence,
    summarizeCoachOutcomeForMemory,
} from './coach-outcomes';
import type { CoachProtocolOutcome, CoachProtocolOutcomeStatus } from '../types/engine';

describe('coach protocol outcome contract', () => {
    it('recognizes all locked protocol outcome statuses', () => {
        const statuses: readonly CoachProtocolOutcomeStatus[] = [
            'started',
            'completed',
            'improved',
            'unchanged',
            'worse',
            'invalid_capture',
        ];

        for (const status of statuses) {
            expect(isCoachProtocolOutcomeStatus(status)).toBe(true);
        }

        expect(isCoachProtocolOutcomeStatus('accepted')).toBe(false);
    });

    it('recognizes structured reason codes and rejects unknown values', () => {
        expect(isCoachProtocolOutcomeReasonCode('capture_quality')).toBe(true);
        expect(isCoachProtocolOutcomeReasonCode('poor_execution')).toBe(true);
        expect(isCoachProtocolOutcomeReasonCode('guessed_outcome')).toBe(false);
    });

    it('requires invalid_capture to include at least one reason code', () => {
        const invalid = normalizeCoachProtocolOutcomeInput({
            sessionId: 'session-1',
            coachPlanId: 'plan-1',
            protocolId: 'protocol-1',
            focusArea: 'capture_quality',
            status: 'invalid_capture',
            reasonCodes: [],
        });

        expect(invalid).toEqual({
            ok: false,
            errors: expect.arrayContaining([
                'invalid_capture requires at least one reason code.',
            ]),
        });

        const valid = normalizeCoachProtocolOutcomeInput({
            sessionId: 'session-1',
            coachPlanId: 'plan-1',
            protocolId: 'protocol-1',
            focusArea: 'capture_quality',
            status: 'invalid_capture',
            reasonCodes: ['capture_quality'],
            note: '  video tremido  ',
        });

        expect(valid).toEqual({
            ok: true,
            value: expect.objectContaining({
                reasonCodes: ['capture_quality'],
                note: 'video tremido',
            }),
        });
    });

    it('classifies started and completed as neutral pending states instead of technical evidence', () => {
        expect(resolveCoachOutcomeEvidence({ status: 'started' })).toEqual(expect.objectContaining({
            evidenceStrength: 'neutral',
            countsAsTechnicalEvidence: false,
            pendingClosure: true,
            needsCompatibleValidation: false,
        }));

        expect(resolveCoachOutcomeEvidence({ status: 'completed' })).toEqual(expect.objectContaining({
            evidenceStrength: 'neutral',
            countsAsTechnicalEvidence: false,
            pendingClosure: true,
            needsCompatibleValidation: true,
        }));
    });

    it('keeps improved as weak self-report until strict compatible progress confirms it', () => {
        expect(resolveCoachOutcomeEvidence({ status: 'improved' })).toEqual(expect.objectContaining({
            evidenceStrength: 'weak_self_report',
            countsAsTechnicalEvidence: false,
            needsCompatibleValidation: true,
        }));

        expect(resolveCoachOutcomeEvidence({
            status: 'improved',
            precisionTrend: {
                label: 'validated_progress',
                evidenceLevel: 'strong',
            },
        })).toEqual(expect.objectContaining({
            evidenceStrength: 'confirmed_by_compatible_clip',
            countsAsTechnicalEvidence: true,
            needsCompatibleValidation: false,
        }));
    });

    it('treats worse with execution or capture reasons as invalid evidence, not protocol failure', () => {
        const resolution = resolveCoachOutcomeEvidence({
            status: 'worse',
            reasonCodes: ['poor_execution'],
        });

        expect(resolution).toEqual(expect.objectContaining({
            evidenceStrength: 'invalid',
            countsAsTechnicalEvidence: false,
            invalidBecauseOfExecutionOrCapture: true,
        }));
    });

    it('detects explicit conflicts between self-report and strict precision trends', () => {
        const conflict = detectCoachOutcomePrecisionConflict({
            outcomeId: 'outcome-1',
            status: 'improved',
            precisionTrend: {
                label: 'validated_regression',
                nextValidationHint: 'Repita uma validacao curta antes de avancar.',
            },
        });

        expect(conflict).toEqual({
            userOutcomeId: 'outcome-1',
            precisionTrendLabel: 'validated_regression',
            reason: expect.stringContaining('Self-report improved'),
            nextValidationCopy: 'Repita uma validacao curta antes de avancar.',
        });

        expect(resolveCoachOutcomeEvidence({
            status: 'improved',
            precisionTrend: {
                label: 'validated_regression',
                evidenceLevel: 'strong',
            },
        })).toEqual(expect.objectContaining({
            evidenceStrength: 'conflict',
            countsAsTechnicalEvidence: false,
            needsCompatibleValidation: true,
        }));
    });

    it('summarizes outcomes for future memory without upgrading conflicts', () => {
        const outcome: CoachProtocolOutcome = {
            id: 'outcome-1',
            sessionId: 'session-1',
            coachPlanId: 'plan-1',
            protocolId: 'protocol-1',
            focusArea: 'vertical_control',
            status: 'improved',
            reasonCodes: [],
            recordedAt: '2026-05-06T00:00:00.000Z',
            evidenceStrength: 'conflict',
            conflict: {
                userOutcomeId: 'outcome-1',
                precisionTrendLabel: 'validated_regression',
                reason: 'Resultado em conflito.',
                nextValidationCopy: 'Grave uma validacao curta.',
            },
        };

        expect(summarizeCoachOutcomeForMemory(outcome)).toEqual(expect.objectContaining({
            outcomeId: 'outcome-1',
            evidenceStrength: 'conflict',
            countsAsTechnicalEvidence: false,
            needsCompatibleValidation: true,
            failureMode: 'conflict',
        }));
    });
});
