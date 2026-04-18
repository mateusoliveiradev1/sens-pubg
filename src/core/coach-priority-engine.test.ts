import { describe, expect, it } from 'vitest';

import {
    analysisResultBase,
    analysisResultWithStrongSensitivity,
    analysisResultWithWeakCapture,
    createAnalysisResultFixture,
} from './coach-test-fixtures';
import { rankCoachPriorities } from './coach-priority-engine';
import { extractCoachSignals } from './coach-signal-extractor';
import { asScore } from '../types/branded';

describe('rankCoachPriorities', () => {
    it('prioritizes capture quality when weak capture makes the clip unusable', () => {
        const signals = extractCoachSignals({ analysisResult: analysisResultWithWeakCapture });

        const priorities = rankCoachPriorities({ signals });

        expect(priorities).toHaveLength(3);
        expect(priorities[0]).toEqual(expect.objectContaining({
            area: 'capture_quality',
            priorityScore: expect.any(Number),
            severity: expect.any(Number),
            confidence: 1,
            coverage: 1,
        }));
        expect(priorities[0]?.priorityScore).toBeGreaterThan(priorities[1]?.priorityScore ?? 0);
    });

    it('prioritizes vertical control when the dominant diagnosis has strong evidence', () => {
        const signals = extractCoachSignals({ analysisResult: analysisResultBase });

        const priorities = rankCoachPriorities({ signals });

        expect(priorities[0]).toEqual(expect.objectContaining({
            area: 'vertical_control',
            title: 'Vertical control',
            severity: 0.8,
            confidence: 0.86,
            coverage: 0.9,
        }));
        expect(priorities.map((priority) => priority.area)).toContain('sensitivity');
        expect(priorities.map((priority) => priority.area)).toContain('capture_quality');
    });

    it('blocks sensitivity recommendations when capture quality is not reliable enough', () => {
        const signals = extractCoachSignals({ analysisResult: analysisResultWithWeakCapture });

        const priorities = rankCoachPriorities({ signals });

        expect(priorities[0]?.area).toBe('capture_quality');

        const sensitivityPriority = priorities.find((priority) => priority.area === 'sensitivity');
        expect(sensitivityPriority).toEqual(expect.objectContaining({
            blockedBy: ['capture_quality'],
            dependencies: ['capture_quality'],
        }));
    });

    it('downgrades sensitivity when consistency dominates the next coaching decision', () => {
        const lowConsistencyWithStrongSensitivity = createAnalysisResultFixture({
            ...analysisResultWithStrongSensitivity,
            diagnoses: [{
                type: 'inconsistency',
                severity: 4,
                consistencyScore: asScore(34),
                confidence: 0.85,
                evidence: {
                    confidence: 0.85,
                    coverage: 0.8,
                    angularErrorDegrees: 1.6,
                    linearErrorCm: 61,
                    linearErrorSeverity: 4,
                },
                description: 'Spray muito variavel entre tentativas compativeis',
                cause: 'A variabilidade ainda domina antes de mexer na sensibilidade',
                remediation: 'Estabilize o mesmo bloco antes de aplicar nova sensibilidade',
            }],
        });
        const signals = extractCoachSignals({ analysisResult: lowConsistencyWithStrongSensitivity });

        const priorities = rankCoachPriorities({ signals });

        expect(priorities[0]?.area).toBe('consistency');

        const sensitivityPriority = priorities.find((priority) => priority.area === 'sensitivity');
        expect(sensitivityPriority).toEqual(expect.objectContaining({
            blockedBy: ['consistency'],
            dependencies: ['consistency'],
        }));
        expect(sensitivityPriority?.priorityScore).toBeLessThan(priorities[0]?.priorityScore ?? 0);
    });
});
