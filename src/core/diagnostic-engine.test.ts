/**
 * Tests: Diagnostic Engine
 * Valida as 6 classificações de diagnóstico.
 */

import { describe, it, expect } from 'vitest';
import { runDiagnostics } from '@/core/diagnostic-engine';
import type { MetricEvidenceQuality, SprayMetricQuality, SprayMetricQualityKey, SprayMetrics } from '@/types/engine';
import { asMilliseconds, asScore } from '@/types/branded';

const metricQualityKeys: readonly SprayMetricQualityKey[] = [
    'stabilityScore',
    'verticalControlIndex',
    'horizontalNoiseIndex',
    'shotAlignmentErrorMs',
    'angularErrorDegrees',
    'linearErrorCm',
    'linearErrorSeverity',
    'initialRecoilResponseMs',
    'driftDirectionBias',
    'consistencyScore',
    'burstVCI',
    'sustainedVCI',
    'fatigueVCI',
    'burstHNI',
    'sustainedHNI',
    'fatigueHNI',
    'shotResiduals',
    'sprayScore',
] as const;

function makeMetricQuality(overrides: Partial<MetricEvidenceQuality> = {}): SprayMetricQuality {
    const evidence: MetricEvidenceQuality = {
        coverage: 1,
        confidence: 1,
        sampleSize: 30,
        framesTracked: 30,
        framesLost: 0,
        framesProcessed: 30,
        cameraMotionPenalty: 0,
        hardCutPenalty: 0,
        flickPenalty: 0,
        targetSwapPenalty: 0,
        identityPenalty: 0,
        contaminatedFrameCount: 0,
        ...overrides,
    };

    return Object.fromEntries(
        metricQualityKeys.map((key) => [key, evidence])
    ) as SprayMetricQuality;
}

// Helper: create metrics with defaults
function makeMetrics(overrides: Partial<SprayMetrics> = {}): SprayMetrics {
    return {
        stabilityScore: asScore(70),
        verticalControlIndex: 1.0,
        horizontalNoiseIndex: 0.1, // Angular Degrees (AR Threshold is 0.18)
        shotAlignmentErrorMs: 0,
        angularErrorDegrees: 0.1,
        linearErrorCm: 1,
        linearErrorSeverity: 1,
        targetDistanceMeters: 30,
        initialRecoilResponseMs: asMilliseconds(100),
        driftDirectionBias: { direction: 'neutral', magnitude: 0 },
        consistencyScore: asScore(70),
        burstVCI: 1.0,
        sustainedVCI: 1.0,
        fatigueVCI: 1.0,
        burstHNI: 0.1,
        sustainedHNI: 0.1,
        fatigueHNI: 0.1,
        shotResiduals: [],
        metricQuality: makeMetricQuality(),
        sprayScore: 80,
        ...overrides,
    };
}

describe('runDiagnostics', () => {
    it('should return empty array for perfect spray', () => {
        const metrics = makeMetrics();
        const diagnoses = runDiagnostics(metrics, 'ar');
        expect(diagnoses).toHaveLength(0);
    });

    it('should detect overpull when VCI > 1.15', () => {
        const metrics = makeMetrics({ verticalControlIndex: 1.4 });
        const diagnoses = runDiagnostics(metrics, 'ar');
        const overpull = diagnoses.find(d => d.type === 'overpull');
        expect(overpull).toBeDefined();
        expect(overpull!.severity).toBeGreaterThanOrEqual(1);
    });

    it('should detect underpull when VCI < 0.85', () => {
        const metrics = makeMetrics({ verticalControlIndex: 0.5 });
        const diagnoses = runDiagnostics(metrics, 'ar');
        const underpull = diagnoses.find(d => d.type === 'underpull');
        expect(underpull).toBeDefined();
    });

    it('should detect excessive jitter when noise exceeds threshold', () => {
        const metrics = makeMetrics({ horizontalNoiseIndex: 20 });
        const diagnoses = runDiagnostics(metrics, 'ar');
        const jitter = diagnoses.find(d => d.type === 'excessive_jitter');
        expect(jitter).toBeDefined();
    });

    it('should detect horizontal drift', () => {
        const metrics = makeMetrics({
            driftDirectionBias: { direction: 'left', magnitude: 2.5 },
        });
        const diagnoses = runDiagnostics(metrics, 'ar');
        const drift = diagnoses.find(d => d.type === 'horizontal_drift');
        expect(drift).toBeDefined();
    });

    it('should detect inconsistency when score < 65', () => {
        const metrics = makeMetrics({ consistencyScore: asScore(30) });
        const diagnoses = runDiagnostics(metrics, 'ar');
        const inconsistency = diagnoses.find(d => d.type === 'inconsistency');
        expect(inconsistency).toBeDefined();
    });

    it('does not flag late compensation when the spray already converges to a near-perfect result', () => {
        const metrics = makeMetrics({
            initialRecoilResponseMs: asMilliseconds(500),
            verticalControlIndex: 1,
            angularErrorDegrees: 0,
            linearErrorCm: 0,
            linearErrorSeverity: 1,
            sprayScore: 100,
        });

        const diagnoses = runDiagnostics(metrics, 'ar');
        const lateCompensation = diagnoses.find((diagnosis) => diagnosis.type === 'late_compensation');

        expect(lateCompensation).toBeUndefined();
    });

    it('should sort diagnoses by severity (highest first)', () => {
        const metrics = makeMetrics({
            verticalControlIndex: 1.8, // severe overpull
            horizontalNoiseIndex: 10, // mild jitter
            consistencyScore: asScore(20), // severe inconsistency
        });
        const diagnoses = runDiagnostics(metrics, 'ar');
        expect(diagnoses.length).toBeGreaterThanOrEqual(2);

        for (let i = 1; i < diagnoses.length; i++) {
            expect(diagnoses[i]!.severity).toBeLessThanOrEqual(diagnoses[i - 1]!.severity);
        }
    });

    it('returns inconclusive when metric evidence is weak', () => {
        const metrics = makeMetrics({
            metricQuality: makeMetricQuality({
                coverage: 0.42,
                confidence: 0.35,
                framesTracked: 5,
                framesLost: 7,
                framesProcessed: 12,
            }),
        });

        const diagnoses = runDiagnostics(metrics, 'ar');
        const inconclusive = diagnoses.find((diagnosis) => diagnosis.type === 'inconclusive');

        expect(inconclusive).toBeDefined();
        expect(inconclusive?.description.toLowerCase()).toContain('evid');
    });

    it('cites the dominant phase when vertical control is phase-localized', () => {
        const metrics = makeMetrics({
            verticalControlIndex: 0.72,
            burstVCI: 0.98,
            sustainedVCI: 0.88,
            fatigueVCI: 0.56,
        });

        const diagnoses = runDiagnostics(metrics, 'ar');
        const underpull = diagnoses.find((diagnosis) => diagnosis.type === 'underpull');

        expect(underpull).toBeDefined();
        expect(underpull?.dominantPhase).toBe('fatigue');
        expect(underpull?.description.toLowerCase()).toContain('fatigue');
    });

    it('uses shot residuals to identify the dominant phase when residuals are available', () => {
        const metrics = makeMetrics({
            verticalControlIndex: 1.3,
            burstVCI: 1.1,
            sustainedVCI: 1.1,
            fatigueVCI: 1.1,
            shotResiduals: [
                {
                    shotIndex: 2,
                    timestamp: asMilliseconds(200),
                    observed: { yaw: 0, pitch: 0.1 },
                    expected: { yaw: 0, pitch: 0.1 },
                    residual: { yaw: 0, pitch: 0 },
                    residualMagnitudeDegrees: 0,
                },
                {
                    shotIndex: 12,
                    timestamp: asMilliseconds(1_000),
                    observed: { yaw: 0.4, pitch: 1.8 },
                    expected: { yaw: 0, pitch: 0.2 },
                    residual: { yaw: 0.4, pitch: 1.6 },
                    residualMagnitudeDegrees: 1.65,
                },
                {
                    shotIndex: 22,
                    timestamp: asMilliseconds(1_800),
                    observed: { yaw: 0, pitch: 0.2 },
                    expected: { yaw: 0, pitch: 0.2 },
                    residual: { yaw: 0, pitch: 0 },
                    residualMagnitudeDegrees: 0,
                },
            ],
        });

        const diagnoses = runDiagnostics(metrics, 'ar');
        const overpull = diagnoses.find((diagnosis) => diagnosis.type === 'overpull');

        expect(overpull?.dominantPhase).toBe('sustained');
    });

    it('uses angular and linear error with confidence when ranking severity', () => {
        const lowError = makeMetrics({
            verticalControlIndex: 0.82,
            angularErrorDegrees: 0.2,
            linearErrorSeverity: 1,
            metricQuality: makeMetricQuality({ confidence: 0.7 }),
        });
        const highError = makeMetrics({
            verticalControlIndex: 0.82,
            angularErrorDegrees: 2.5,
            linearErrorSeverity: 5,
            metricQuality: makeMetricQuality({ confidence: 1 }),
        });

        const lowSeverity = runDiagnostics(lowError, 'ar').find((diagnosis) => diagnosis.type === 'underpull')?.severity;
        const highSeverity = runDiagnostics(highError, 'ar').find((diagnosis) => diagnosis.type === 'underpull')?.severity;

        expect(highSeverity).toBeGreaterThan(lowSeverity ?? 0);
    });
});
