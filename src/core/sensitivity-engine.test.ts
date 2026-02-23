/**
 * Tests: Sensitivity Engine
 * Valida os 3 perfis de sensibilidade e recomendações.
 */

import { describe, it, expect } from 'vitest';
import { generateSensitivityRecommendation } from '@/core/sensitivity-engine';
import type { SprayMetrics, Diagnosis } from '@/types/engine';
import { asMilliseconds, asScore } from '@/types/branded';

function makeMetrics(): SprayMetrics {
    return {
        stabilityScore: asScore(70),
        verticalControlIndex: 1.0,
        horizontalNoiseIndex: 2.0,
        initialRecoilResponseMs: asMilliseconds(100),
        driftDirectionBias: { direction: 'neutral', magnitude: 0 },
        consistencyScore: asScore(70),
    };
}

describe('generateSensitivityRecommendation', () => {
    it('should return 3 profiles', () => {
        const rec = generateSensitivityRecommendation(
            makeMetrics(), [], 800, 'hybrid', 'claw', 45,
            { 'red-dot': 50, '2x': 50, '3x': 50, '4x': 50, '6x': 50, '8x': 50 }
        );
        expect(rec.profiles).toHaveLength(3);
        expect(rec.profiles.map(p => p.type)).toEqual(['low', 'balanced', 'high']);
    });

    it('should recommend balanced by default when no diagnoses', () => {
        const rec = generateSensitivityRecommendation(
            makeMetrics(), [], 800, 'hybrid', 'claw', 45, {}
        );
        expect(rec.recommended).toBe('balanced');
    });

    it('should recommend high sens for overpull diagnosis', () => {
        const overpullDiagnosis: Diagnosis = {
            type: 'overpull',
            severity: 3,
            verticalControlIndex: 1.4,
            excessPercent: 40,
            description: 'test',
            cause: 'test',
            remediation: 'test',
        };

        const rec = generateSensitivityRecommendation(
            makeMetrics(), [overpullDiagnosis], 800, 'hybrid', 'claw', 45, {}
        );
        expect(rec.recommended).toBe('high');
    });

    it('low profile should have higher cm/360° than high profile', () => {
        const rec = generateSensitivityRecommendation(
            makeMetrics(), [], 800, 'hybrid', 'claw', 45, {}
        );
        const low = rec.profiles.find(p => p.type === 'low')!;
        const high = rec.profiles.find(p => p.type === 'high')!;
        expect(Number(low.cmPer360)).toBeGreaterThan(Number(high.cmPer360));
    });

    it('should include reasoning string', () => {
        const rec = generateSensitivityRecommendation(
            makeMetrics(), [], 800, 'hybrid', 'claw', 45, {}
        );
        expect(rec.reasoning).toContain('hybrid');
        expect(rec.reasoning).toContain('800');
    });
});
