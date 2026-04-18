/**
 * Tests: Sensitivity Engine
 * Valida os 3 perfis de sensibilidade e recomendações.
 */

import { describe, it, expect } from 'vitest';
import { generateSensitivityRecommendation } from '@/core/sensitivity-engine';
import type { ShotRecoilResidual, SprayMetrics, Diagnosis } from '@/types/engine';
import { asMilliseconds, asScore } from '@/types/branded';

function makeResidual(shotIndex: number, pitchResidual: number): ShotRecoilResidual {
    return {
        shotIndex,
        timestamp: asMilliseconds(shotIndex * 86),
        observed: { yaw: 0, pitch: pitchResidual },
        expected: { yaw: 0, pitch: 0 },
        residual: { yaw: 0, pitch: pitchResidual },
        residualMagnitudeDegrees: Math.abs(pitchResidual),
    };
}

function makeMetrics(overrides: Partial<SprayMetrics> = {}): SprayMetrics {
    return {
        stabilityScore: asScore(70),
        verticalControlIndex: 1.0,
        horizontalNoiseIndex: 2.0,
        shotAlignmentErrorMs: 0,
        angularErrorDegrees: 0.2,
        linearErrorCm: 2,
        linearErrorSeverity: 1,
        targetDistanceMeters: 30,
        initialRecoilResponseMs: asMilliseconds(100),
        driftDirectionBias: { direction: 'neutral', magnitude: 0 },
        consistencyScore: asScore(70),
        burstVCI: 1,
        sustainedVCI: 1,
        fatigueVCI: 1,
        burstHNI: 0.1,
        sustainedHNI: 0.1,
        fatigueHNI: 0.1,
        shotResiduals: [],
        sprayScore: 80,
        ...overrides,
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

    it('uses measured residual polarity as the sensitivity objective', () => {
        const overpullResidual = makeMetrics({
            shotResiduals: [
                makeResidual(0, -0.4),
                makeResidual(1, -0.4),
                makeResidual(2, -0.4),
            ],
        });
        const underpullResidual = makeMetrics({
            shotResiduals: [
                makeResidual(0, 0.4),
                makeResidual(1, 0.4),
                makeResidual(2, 0.4),
            ],
        });

        const overpullRec = generateSensitivityRecommendation(
            overpullResidual, [], 800, 'hybrid', 'claw', 45, {}
        );
        const underpullRec = generateSensitivityRecommendation(
            underpullResidual, [], 800, 'hybrid', 'claw', 45, {}
        );

        expect(overpullRec.recommended).toBe('high');
        expect(underpullRec.recommended).toBe('low');
        expect(overpullRec.reasoning).toContain('meanPitchResidual=-0.400');
        expect(underpullRec.reasoning).toContain('meanPitchResidual=0.400');
    });

    it('treats play style and grip as prior context instead of the core objective', () => {
        const metrics = makeMetrics({
            shotResiduals: [
                makeResidual(0, -0.35),
                makeResidual(1, -0.35),
                makeResidual(2, -0.35),
            ],
        });

        const armPalm = generateSensitivityRecommendation(
            metrics, [], 800, 'arm', 'palm', 45, {}
        );
        const wristFingertip = generateSensitivityRecommendation(
            metrics, [], 800, 'wrist', 'fingertip', 45, {}
        );

        expect(armPalm.recommended).toBe(wristFingertip.recommended);
        expect(armPalm.reasoning).toContain('prior=arm/palm');
        expect(wristFingertip.reasoning).toContain('prior=wrist/fingertip');
    });

    it('keeps the recommendation balanced when directional residuals have weak evidence', () => {
        const rec = generateSensitivityRecommendation(
            makeMetrics({
                shotResiduals: [
                    makeResidual(0, -0.4),
                    makeResidual(1, -0.35),
                ],
                metricQuality: {
                    shotResiduals: {
                        coverage: 0.42,
                        confidence: 0.38,
                        sampleSize: 2,
                        framesTracked: 8,
                        framesLost: 5,
                        framesProcessed: 13,
                    },
                } as never,
            }),
            [],
            800,
            'hybrid',
            'claw',
            45,
            {}
        );

        expect(rec.recommended).toBe('balanced');
        expect(rec.reasoning).toContain('evidenceTier=weak');
        expect(rec.suggestedVSM).toBeUndefined();
    });

    it('ignores low-confidence diagnostic fallbacks instead of forcing the same directional profile', () => {
        const rec = generateSensitivityRecommendation(
            makeMetrics(),
            [{
                type: 'overpull',
                severity: 4,
                verticalControlIndex: 1.32,
                excessPercent: 32,
                confidence: 0.43,
                evidence: {
                    confidence: 0.43,
                    coverage: 0.48,
                    angularErrorDegrees: 1.2,
                    linearErrorCm: 48,
                    linearErrorSeverity: 4,
                },
                description: 'Leitura parcial de overpull',
                cause: 'Tracking instavel',
                remediation: 'Suba a sens so depois de confirmar',
            }],
            800,
            'hybrid',
            'claw',
            45,
            {}
        );

        expect(rec.recommended).toBe('balanced');
        expect(rec.reasoning).toContain('diagnosticFallback=guarded');
    });

    it('derives scope sliders from optic multipliers instead of mirroring the general slider', () => {
        const rec = generateSensitivityRecommendation(
            makeMetrics(),
            [],
            800,
            'hybrid',
            'claw',
            45,
            { 'red-dot': 50, '2x': 50, '3x': 50, '4x': 50, '6x': 50, '8x': 50 }
        );
        const balanced = rec.profiles.find((profile) => profile.type === 'balanced')!;
        const scope4x = balanced.scopes.find((scope) => scope.scopeName === '4x ACOG');
        const scope8x = balanced.scopes.find((scope) => scope.scopeName === '8x CQBSS');

        expect(scope4x).toBeDefined();
        expect(scope8x).toBeDefined();
        expect(scope4x!.recommended).not.toBe(balanced.general);
        expect(Number(scope8x!.recommended)).toBeGreaterThan(Number(scope4x!.recommended));
    });

    it('reuses equivalent 1x scope values when legacy red-dot keys are absent', () => {
        const rec = generateSensitivityRecommendation(
            makeMetrics(),
            [],
            800,
            'hybrid',
            'claw',
            45,
            { '1x': 40, '2x': 40, '3x': 40, '4x': 40, '6x': 40, '8x': 40, '15x': 40 }
        );
        const balanced = rec.profiles.find((profile) => profile.type === 'balanced')!;
        const redDot = balanced.scopes.find((scope) => scope.scopeName === 'Red Dot Sight');

        expect(redDot).toBeDefined();
        expect(Number(redDot!.current)).toBe(40);
    });

    it('emits capture_again when the clip does not sustain a safe recommendation', () => {
        const rec = generateSensitivityRecommendation(
            makeMetrics({
                shotResiduals: [
                    makeResidual(0, -0.2),
                    makeResidual(1, -0.18),
                ],
                metricQuality: {
                    shotResiduals: {
                        coverage: 0.35,
                        confidence: 0.4,
                        sampleSize: 2,
                        framesTracked: 7,
                        framesLost: 4,
                        framesProcessed: 11,
                    },
                } as never,
            }),
            [],
            800,
            'hybrid',
            'claw',
            45,
            {},
            1.0,
            1
        );

        expect(rec.tier).toBe('capture_again');
    });

    it('emits test_profiles for a strong single-clip recommendation', () => {
        const rec = generateSensitivityRecommendation(
            makeMetrics({
                shotResiduals: [
                    makeResidual(0, -0.4),
                    makeResidual(1, -0.4),
                    makeResidual(2, -0.42),
                    makeResidual(3, -0.38),
                ],
                metricQuality: {
                    shotResiduals: {
                        coverage: 0.88,
                        confidence: 0.9,
                        sampleSize: 4,
                        framesTracked: 18,
                        framesLost: 1,
                        framesProcessed: 19,
                    },
                } as never,
            }),
            [],
            800,
            'hybrid',
            'claw',
            45,
            {},
            1.0,
            1
        );

        expect(rec.tier).toBe('test_profiles');
    });

    it('only emits apply_ready after strong evidence repeats across multiple clips', () => {
        const rec = generateSensitivityRecommendation(
            makeMetrics({
                shotResiduals: [
                    makeResidual(0, -0.45),
                    makeResidual(1, -0.43),
                    makeResidual(2, -0.44),
                    makeResidual(3, -0.46),
                    makeResidual(4, -0.42),
                ],
                metricQuality: {
                    shotResiduals: {
                        coverage: 0.94,
                        confidence: 0.93,
                        sampleSize: 5,
                        framesTracked: 26,
                        framesLost: 0,
                        framesProcessed: 26,
                    },
                } as never,
            }),
            [],
            800,
            'hybrid',
            'claw',
            45,
            {},
            1.0,
            3
        );

        expect(rec.tier).toBe('apply_ready');
    });

    it('exposes objective variables in the reasoning string', () => {
        const rec = generateSensitivityRecommendation(
            makeMetrics({
                shotResiduals: [
                    makeResidual(0, 0.2),
                    makeResidual(1, 0.4),
                ],
            }),
            [],
            800,
            'hybrid',
            'claw',
            45,
            {}
        );

        expect(rec.reasoning).toContain('residualObjective=');
        expect(rec.reasoning).toContain('meanAbsResidual=0.300');
        expect(rec.reasoning).toContain('coverage=');
        expect(rec.reasoning).toContain('confidence=');
    });
});
