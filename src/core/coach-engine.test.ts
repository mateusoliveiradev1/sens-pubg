/**
 * Tests: Coach Engine
 * Valida o feedback de coaching para cada diagnóstico.
 */

import { describe, it, expect } from 'vitest';
import { generateCoaching } from '@/core/coach-engine';
import type { Diagnosis } from '@/types/engine';

describe('generateCoaching', () => {
    it('should return empty array for no diagnoses', () => {
        const coaching = generateCoaching([]);
        expect(coaching).toHaveLength(0);
    });

    it('should return one coaching item per diagnosis', () => {
        const diagnoses: Diagnosis[] = [
            {
                type: 'overpull',
                severity: 3,
                verticalControlIndex: 1.3,
                excessPercent: 30,
                description: 'Overpull detectado',
                cause: 'Sens muito baixa',
                remediation: 'Aumente a sens',
            },
            {
                type: 'inconsistency',
                severity: 2,
                consistencyScore: 40 as never,
                description: 'Spray inconsistente',
                cause: 'Falta de prática',
                remediation: 'Pratique mais',
            },
        ];

        const coaching = generateCoaching(diagnoses);
        expect(coaching).toHaveLength(2);
    });

    it('should include all coaching fields', () => {
        const diagnoses: Diagnosis[] = [{
            type: 'excessive_jitter',
            severity: 4,
            horizontalNoise: 15,
            threshold: 5,
            description: 'Jitter excessivo',
            cause: 'Grip instável',
            remediation: 'Relaxe o grip',
        }];

        const coaching = generateCoaching(diagnoses);
        const feedback = coaching[0]!;

        expect(feedback.whatIsWrong).toBe('Jitter excessivo');
        expect(feedback.whyItHappens).toBe('Grip instável');
        expect(feedback.whatToAdjust).toBe('Relaxe o grip');
        expect(feedback.howToTest).toBeTruthy();
        expect(feedback.adaptationTimeDays).toBeGreaterThanOrEqual(1);
    });

    it('should estimate longer adaptation for higher severity', () => {
        const mild: Diagnosis[] = [{
            type: 'horizontal_drift',
            severity: 1,
            bias: { direction: 'left', magnitude: 1.2 },
            description: 'test', cause: 'test', remediation: 'test',
        }];

        const severe: Diagnosis[] = [{
            type: 'horizontal_drift',
            severity: 5,
            bias: { direction: 'right', magnitude: 5 },
            description: 'test', cause: 'test', remediation: 'test',
        }];

        const mildCoaching = generateCoaching(mild);
        const severeCoaching = generateCoaching(severe);

        expect(severeCoaching[0]!.adaptationTimeDays).toBeGreaterThan(mildCoaching[0]!.adaptationTimeDays);
    });
});
