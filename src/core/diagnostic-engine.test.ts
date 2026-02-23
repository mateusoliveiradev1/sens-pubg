/**
 * Tests: Diagnostic Engine
 * Valida as 6 classificações de diagnóstico.
 */

import { describe, it, expect } from 'vitest';
import { runDiagnostics } from '@/core/diagnostic-engine';
import type { SprayMetrics } from '@/types/engine';
import { asMilliseconds, asScore } from '@/types/branded';

// Helper: create metrics with defaults
function makeMetrics(overrides: Partial<SprayMetrics> = {}): SprayMetrics {
    return {
        stabilityScore: asScore(70),
        verticalControlIndex: 1.0,
        horizontalNoiseIndex: 0.1, // Angular Degrees (AR Threshold is 0.18)
        initialRecoilResponseMs: asMilliseconds(100),
        driftDirectionBias: { direction: 'neutral', magnitude: 0 },
        consistencyScore: asScore(70),
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
});
