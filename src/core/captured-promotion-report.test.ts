import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { buildCapturedPromotionMarkdownReport } from './captured-promotion-report';
import type { BenchmarkCoverageSummary } from './benchmark-coverage';
import type { CapturedBenchmarkPromotionReport } from './captured-golden-promotion';
import type { BenchmarkDataset } from '@/types/benchmark';

const dataset: BenchmarkDataset = {
    schemaVersion: 1,
    datasetId: 'captured-benchmark-draft',
    createdAt: '2026-05-05T15:00:00.000Z',
    clips: [
        {
            clipId: 'captured-clip1',
            media: {
                videoPath: 'tests/fixtures/captured-clips/clip1.mp4',
                frameLabelsPath: 'tests/fixtures/captured-clips/labels/clip1.frames.json',
            },
            sprayWindow: {
                startSeconds: 1,
                endSeconds: 3,
            },
            capture: {
                patchVersion: '41.1',
                weaponId: 'ace32',
                distanceMeters: 30,
                stance: 'standing',
                optic: {
                    opticId: 'red-dot-sight',
                    stateId: '1x',
                },
                attachments: {
                    muzzle: 'none',
                    grip: 'none',
                    stock: 'none',
                },
            },
            labels: {
                expectedDiagnoses: [],
                expectedTrackingTier: 'clean',
                expectedTruth: {
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
            },
            quality: {
                sourceType: 'captured',
                reviewStatus: 'reviewed',
                occlusionLevel: 'none',
                compressionLevel: 'lossless',
                visibilityTier: 'clean',
                reviewProvenance: {
                    source: 'human-reviewed',
                    reviewerId: 'maintainer',
                },
            },
        },
    ],
};

function coverage(totalClips: number, goldenClips: number): BenchmarkCoverageSummary {
    return {
        datasetId: 'captured-benchmark-draft',
        totalClips,
        generatedFrom: 'all-clips',
        sourceTypes: { captured: totalClips, synthetic: 0, augmented: 0 },
        reviewStatuses: { draft: 0, reviewed: totalClips - goldenClips, golden: goldenClips },
        reviewProvenanceSources: {
            unspecified: 0,
            'machine-assisted': 0,
            'codex-assisted': 0,
            'human-reviewed': totalClips,
            'specialist-reviewed': 0,
        },
        trackingTiers: { clean: totalClips, degraded: 0 },
        visibilityTiers: { clean: totalClips, degraded: 0, rejected: 0 },
        occlusionLevels: { none: totalClips, light: 0, moderate: 0, heavy: 0 },
        compressionLevels: { lossless: totalClips, light: 0, medium: 0, heavy: 0 },
        patchVersions: { '41.1': totalClips },
        weapons: { ace32: totalClips },
        optics: { 'red-dot-sight:1x': totalClips },
        distanceBuckets: { '0-30m': totalClips, '31-60m': 0, '61-100m': 0, '101m+': 0 },
        diagnosisTypes: {},
        uniqueWeapons: ['ace32'],
        uniqueOptics: ['red-dot-sight:1x'],
        clipsWithDiagnoses: 0,
        goldenClips,
        currentPatchCapturedClips: totalClips,
        specialistReviewedGoldenClips: 0,
        starterGate: { passed: true, checks: [] },
        starterGaps: [],
        sddGate: { passed: true, checks: [] },
        sddGaps: [],
    };
}

describe('buildCapturedPromotionMarkdownReport', () => {
    it('includes checks, coverage impact, reason, and next gaps', () => {
        const promotion: CapturedBenchmarkPromotionReport = {
            totalClipCount: 1,
            promotedClipCount: 1,
            goldenClipCount: 0,
            blockedClips: [],
            consent: [
                {
                    clipId: 'captured-clip1',
                    consentStatus: 'label_review',
                    allowedPurposes: ['internal_validation'],
                    trainabilityAuthorized: false,
                    derivativeScope: 'metadata_and_report',
                    redistributionAllowed: false,
                    withdrawn: false,
                },
            ],
            dataset,
        };
        const report = buildCapturedPromotionMarkdownReport({
            generatedAt: '2026-05-05T15:00:00.000Z',
            selectedClipIds: ['captured-clip1'],
            intendedMaturity: 'reviewed',
            reason: 'Close release evidence gap.',
            reviewer: 'maintainer',
            benchmarkPassed: true,
            promotion,
            coverageBefore: coverage(0, 0),
            coverageAfter: coverage(1, 0),
        });

        expect(report.passed).toBe(true);
        expect(report.markdown).toContain('Close release evidence gap.');
        expect(report.markdown).toContain('| Total clips | 0 | 1 | 1 |');
        expect(report.markdown).toContain('| Metadata and label completeness | PASS |');
        expect(report.markdown).toContain('| Consent and corpus permission | PASS |');
        expect(report.markdown).toContain('| captured-clip1 | label_review | internal_validation | no | metadata_and_report | no | no |');
        expect(report.markdown).toContain('Public streamer/pro videos are qualitative reference only unless formal permission/trainability is verified.');
        expect(report.markdown).toContain('Internal maintainer/dev/reviewer workflow only');
    });

    it('reports blockers and next gaps when promotion cannot count', () => {
        const promotion: CapturedBenchmarkPromotionReport = {
            totalClipCount: 1,
            promotedClipCount: 0,
            goldenClipCount: 0,
            blockedClips: [
                {
                    clipId: 'captured-clip1',
                    reason: 'missing-truth-expectation',
                    missingFieldPaths: ['labels.expectedTruth'],
                },
            ],
            consent: [
                {
                    clipId: 'captured-clip1',
                    consentStatus: 'withdrawn',
                    allowedPurposes: ['internal_validation'],
                    trainabilityAuthorized: false,
                    derivativeScope: 'metadata_and_report',
                    redistributionAllowed: false,
                    withdrawn: true,
                    quarantineRequired: true,
                    requiresRebaseline: true,
                },
            ],
        };
        const report = buildCapturedPromotionMarkdownReport({
            generatedAt: '2026-05-05T15:00:00.000Z',
            selectedClipIds: ['captured-clip1'],
            intendedMaturity: 'golden',
            reason: 'Promote only if complete.',
            benchmarkPassed: false,
            promotion,
            coverageBefore: {
                ...coverage(1, 0),
                sddGaps: ['Promover pelo menos 1 clip golden com reviewProvenance.source=specialist-reviewed.'],
            },
        });

        expect(report.passed).toBe(false);
        expect(report.nextGaps).toEqual([
            'captured-clip1: missing-truth-expectation (labels.expectedTruth)',
            'Promover pelo menos 1 clip golden com reviewProvenance.source=specialist-reviewed.',
        ]);
        expect(report.markdown).toContain('missing-truth-expectation');
    });
});

describe('captured promotion docs', () => {
    it('documents the internal maturity workflow without implying public labeling', () => {
        const videoSpec = readFileSync('docs/video-benchmark-spec.md', 'utf8');
        const benchmarkRunner = readFileSync('docs/benchmark-runner.md', 'utf8');

        expect(videoSpec).toContain('draft -> reviewed -> golden');
        expect(videoSpec).toContain('internal maintainer/dev/reviewer workflow');
        expect(videoSpec).toContain('Public streamer/pro videos are qualitative reference only unless formal permission/trainability is verified.');
        expect(videoSpec).toContain('Missing metadata blocks promotion');
        expect(videoSpec).toContain('npm run benchmark:release');
        expect(benchmarkRunner).toContain('expectedTruth');
    });
});
