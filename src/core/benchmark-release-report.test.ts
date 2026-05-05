import { describe, expect, it } from 'vitest';
import { buildBenchmarkReleaseReport } from './benchmark-release-report';
import type { BenchmarkCoverageSummary } from './benchmark-coverage';
import type { BenchmarkClipResult, BenchmarkReport } from '../../scripts/run-benchmark';

const baseClip: BenchmarkClipResult = {
    clipId: 'captured-clip1',
    sourceType: 'captured',
    reviewStatus: 'reviewed',
    passed: true,
    tracking: {
        passed: true,
        fixtureName: 'tracking',
        expectedTier: 'clean',
        actualTier: 'clean',
        coverage: 1,
        meanErrorPx: 0,
        shotAlignmentErrorMs: 0,
        statusMismatches: 0,
        confidenceCalibration: {
            sampleCount: 1,
            meanConfidence: 1,
            observedVisibleRate: 1,
            brierScore: 0,
            expectedCalibrationError: 0,
        },
    },
    diagnostics: {
        passed: true,
        fixtureName: 'diagnostic',
        expectedTypes: [],
        actualTypes: [],
    },
    coach: {
        passed: true,
        fixtureName: 'coach',
    },
    truth: {
        passed: true,
        fixtureName: 'truth',
        expected: {
            actionState: 'testable',
            mechanicalLevel: 'advanced',
            evidenceTier: 'moderate',
            weakEvidenceDowngrade: false,
            primaryFocusArea: 'validation',
            nextBlock: {
                tier: 'test_protocol',
                key: 'validation-block-protocol',
                title: 'Bloco curto de teste de validacao',
                durationMinutes: 12,
                stepMarker: 'Faca 3 sprays comparaveis focados em validacao.',
                target: 'evidencia mais forte para a proxima decisao do coach',
                minimumCoverage: 0.65,
                minimumConfidence: 0.65,
                successCondition: 'Sucesso quando validacao melhorar.',
                failCondition: 'Falha se validacao nao melhorar.',
                nextClipValidation: 'Validacao de validacao',
            },
        },
        actual: {
            actionState: 'testable',
            mechanicalLevel: 'advanced',
            evidenceTier: 'moderate',
            weakEvidenceDowngrade: false,
            primaryFocusArea: 'validation',
            nextBlock: {
                tier: 'test_protocol',
                key: 'validation-block-protocol',
                title: 'Bloco curto de teste de validacao',
                durationMinutes: 12,
                stepMarker: 'Faca 3 sprays comparaveis focados em validacao.',
                target: 'evidencia mais forte para a proxima decisao do coach',
                minimumCoverage: 0.65,
                minimumConfidence: 0.65,
                successCondition: 'Sucesso quando validacao melhorar.',
                failCondition: 'Falha se validacao nao melhorar.',
                nextClipValidation: 'Validacao de validacao',
            },
        },
        mismatches: [],
    },
};

function report(input: {
    readonly datasetId: string;
    readonly clips: readonly BenchmarkClipResult[];
    readonly regression?: boolean;
}): BenchmarkReport {
    const failedClips = input.clips.filter((clip) => !clip.passed).length;

    return {
        datasetId: input.datasetId,
        generatedAt: '2026-05-05T15:00:00.000Z',
        passed: failedClips === 0,
        summary: {
            totalClips: input.clips.length,
            failedClips,
            tracking: {
                passed: input.clips.filter((clip) => clip.tracking.passed).length,
                total: input.clips.length,
                meanCoverage: 1,
                meanErrorPx: 0,
                meanShotAlignmentErrorMs: 0,
                confidenceCalibration: {
                    sampleCount: input.clips.length,
                    meanConfidence: 1,
                    observedVisibleRate: 1,
                    brierScore: 0,
                    expectedCalibrationError: 0,
                },
            },
            diagnostics: {
                passed: input.clips.filter((clip) => clip.diagnostics.passed).length,
                total: input.clips.length,
            },
            coach: {
                passed: input.clips.filter((clip) => clip.coach.passed).length,
                total: input.clips.length,
            },
            truth: {
                passed: input.clips.filter((clip) => clip.truth.passed).length,
                total: input.clips.length,
            },
            score: failedClips === 0 ? 100 : 75,
        },
        sourceBreakdown: {},
        clips: input.clips,
        ...(input.regression
            ? {
                regression: {
                    baselineDatasetId: input.datasetId,
                    isRegression: true,
                    deltas: {
                        failedClips: 1,
                        score: -25,
                        trackingMeanCoverage: 0,
                        trackingMeanErrorPx: 0,
                        trackingMeanShotAlignmentErrorMs: 0,
                        diagnosticsPassRate: 0,
                        coachPassRate: 0,
                        truthPassRate: -1,
                    },
                },
            }
            : {}),
    };
}

function coverage(passed = true): BenchmarkCoverageSummary {
    return {
        datasetId: 'captured-benchmark-draft',
        totalClips: 1,
        generatedFrom: 'all-clips',
        sourceTypes: { captured: 1, synthetic: 0, augmented: 0 },
        reviewStatuses: { draft: 0, reviewed: 1, golden: 0 },
        reviewProvenanceSources: {
            unspecified: 0,
            'machine-assisted': 1,
            'codex-assisted': 0,
            'human-reviewed': 0,
            'specialist-reviewed': 0,
        },
        trackingTiers: { clean: 1, degraded: 0 },
        visibilityTiers: { clean: 1, degraded: 0, rejected: 0 },
        occlusionLevels: { none: 1, light: 0, moderate: 0, heavy: 0 },
        compressionLevels: { lossless: 1, light: 0, medium: 0, heavy: 0 },
        patchVersions: { '41.1': 1 },
        weapons: { ace32: 1 },
        optics: { 'red-dot-sight:1x': 1 },
        distanceBuckets: { '0-30m': 1, '31-60m': 0, '61-100m': 0, '101m+': 0 },
        diagnosisTypes: {},
        uniqueWeapons: ['ace32'],
        uniqueOptics: ['red-dot-sight:1x'],
        clipsWithDiagnoses: 0,
        goldenClips: 0,
        currentPatchCapturedClips: 1,
        specialistReviewedGoldenClips: 0,
        starterGate: { passed: true, checks: [] },
        starterGaps: [],
        sddGate: {
            passed,
            checks: [
                { key: 'currentPatchCapturedClips', label: 'Current patch', actual: passed ? 1 : 0, required: 1, passed },
            ],
        },
        sddGaps: passed ? [] : ['Adicionar pelo menos 1 clip capturado no patch atual 41.1.'],
    };
}

describe('buildBenchmarkReleaseReport', () => {
    it('renders synthetic, captured, reviewed, golden, and coverage sections', () => {
        const release = buildBenchmarkReleaseReport({
            generatedAt: '2026-05-05T15:00:00.000Z',
            syntheticReport: report({ datasetId: 'synthetic', clips: [{ ...baseClip, sourceType: 'synthetic', reviewStatus: 'golden' }] }),
            capturedReport: report({ datasetId: 'captured', clips: [baseClip, { ...baseClip, clipId: 'golden-clip', reviewStatus: 'golden' }] }),
            coverageSummary: coverage(),
        });

        expect(release.passed).toBe(true);
        expect(release.consoleLines.join('\n')).toContain('benchmark:release PASS');
        expect(release.markdown).toContain('| Synthetic | 1 | 0 | 0 |');
        expect(release.markdown).toContain('| Captured | 2 | 0 | 0 |');
        expect(release.markdown).toContain('| Reviewed | 1 | 0 | 0 |');
        expect(release.markdown).toContain('| Golden | 1 | 0 | 0 |');
        expect(release.markdown).toContain('SDD coverage');
        expect(release.datedReportPath).toBe('docs/benchmark-reports/2026-05-05.md');
    });

    it('blocks the strict gate on SDD coverage gaps', () => {
        const release = buildBenchmarkReleaseReport({
            generatedAt: '2026-05-05T15:00:00.000Z',
            syntheticReport: report({ datasetId: 'synthetic', clips: [{ ...baseClip, sourceType: 'synthetic' }] }),
            capturedReport: report({ datasetId: 'captured', clips: [baseClip] }),
            coverageSummary: coverage(false),
        });

        expect(release.passed).toBe(false);
        expect(release.coverageGaps).toEqual(['Adicionar pelo menos 1 clip capturado no patch atual 41.1.']);
        expect(release.consoleLines.join('\n')).toContain('sdd coverage: FAIL');
    });

    it('blocks reviewed regression even when golden clips are unaffected', () => {
        const release = buildBenchmarkReleaseReport({
            generatedAt: '2026-05-05T15:00:00.000Z',
            syntheticReport: report({ datasetId: 'synthetic', clips: [{ ...baseClip, sourceType: 'synthetic' }] }),
            capturedReport: report({
                datasetId: 'captured',
                clips: [baseClip, { ...baseClip, clipId: 'golden-clip', reviewStatus: 'golden' }],
                regression: true,
            }),
            coverageSummary: coverage(),
        });

        expect(release.passed).toBe(false);
        expect(release.regressions).toContain('captured.reviewed: reviewed clips regressed while golden clips were unaffected');
    });

    it('shows truth mismatches in failed clip detail', () => {
        const failedTruthClip: BenchmarkClipResult = {
            ...baseClip,
            passed: false,
            truth: {
                ...baseClip.truth,
                passed: false,
                mismatches: ['actionState: expected "ready" but received "capture_again"'],
            },
        };
        const release = buildBenchmarkReleaseReport({
            generatedAt: '2026-05-05T15:00:00.000Z',
            syntheticReport: report({ datasetId: 'synthetic', clips: [{ ...baseClip, sourceType: 'synthetic' }] }),
            capturedReport: report({ datasetId: 'captured', clips: [failedTruthClip] }),
            coverageSummary: coverage(),
        });

        expect(release.passed).toBe(false);
        expect(release.markdown).toContain('actionState');
        expect(release.markdown).toContain('| captured | captured-clip1 | reviewed | truth |');
    });
});
