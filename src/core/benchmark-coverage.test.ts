import { describe, expect, it } from 'vitest';
import type { BenchmarkDataset } from '@/types/benchmark';
import {
    buildBenchmarkCoverageSummary,
    renderBenchmarkCoverageMarkdown,
} from './benchmark-coverage';

const dataset: BenchmarkDataset = {
    schemaVersion: 1,
    datasetId: 'captured-benchmark-draft',
    createdAt: '2026-04-14T22:00:00.000Z',
    clips: [
        {
            clipId: 'captured-clean-001',
            media: {
                videoPath: 'tests/fixtures/captured-clips/clip1.mp4',
                frameLabelsPath: 'tests/fixtures/captured-clips/labels/clip1.frames.json',
            },
            sprayWindow: {
                startSeconds: 10,
                endSeconds: 13,
            },
            capture: {
                patchVersion: '40.1',
                weaponId: 'aug',
                distanceMeters: 45,
                stance: 'standing',
                optic: {
                    opticId: 'red-dot-sight',
                    stateId: '1x',
                },
                attachments: {
                    muzzle: 'muzzle_brake',
                    grip: 'thumb',
                    stock: 'none',
                },
            },
            labels: {
                expectedDiagnoses: [],
                expectedTrackingTier: 'clean',
            },
            quality: {
                sourceType: 'captured',
                reviewStatus: 'reviewed',
                occlusionLevel: 'light',
                compressionLevel: 'light',
                visibilityTier: 'clean',
            },
        },
        {
            clipId: 'captured-degraded-002',
            media: {
                videoPath: 'tests/fixtures/captured-clips/clip2.mp4',
                frameLabelsPath: 'tests/fixtures/captured-clips/labels/clip2.frames.json',
            },
            sprayWindow: {
                startSeconds: 11,
                endSeconds: 14,
            },
            capture: {
                patchVersion: '40.1',
                weaponId: 'aug',
                distanceMeters: 85,
                stance: 'standing',
                optic: {
                    opticId: 'red-dot-sight',
                    stateId: '1x',
                },
                attachments: {
                    muzzle: 'muzzle_brake',
                    grip: 'thumb',
                    stock: 'none',
                },
            },
            labels: {
                expectedDiagnoses: [],
                expectedTrackingTier: 'degraded',
            },
            quality: {
                sourceType: 'captured',
                reviewStatus: 'reviewed',
                occlusionLevel: 'moderate',
                compressionLevel: 'light',
                visibilityTier: 'degraded',
            },
        },
    ],
};

describe('benchmark coverage', () => {
    it('summarizes captured coverage and highlights starter gaps for the next real dataset tranche', () => {
        const summary = buildBenchmarkCoverageSummary(dataset);

        expect(summary.datasetId).toBe('captured-benchmark-draft');
        expect(summary.totalClips).toBe(2);
        expect(summary.sourceTypes.captured).toBe(2);
        expect(summary.reviewStatuses.reviewed).toBe(2);
        expect(summary.trackingTiers.clean).toBe(1);
        expect(summary.trackingTiers.degraded).toBe(1);
        expect(summary.distanceBuckets['31-60m']).toBe(1);
        expect(summary.distanceBuckets['61-100m']).toBe(1);
        expect(summary.uniqueWeapons).toEqual(['aug']);
        expect(summary.uniqueOptics).toEqual(['red-dot-sight:1x']);
        expect(summary.clipsWithDiagnoses).toBe(0);
        expect(summary.goldenClips).toBe(0);
        expect(summary.starterGate.passed).toBe(false);
        expect(summary.starterGate.checks).toEqual([
            {
                key: 'capturedClips',
                label: 'Captured clips',
                actual: 2,
                required: 4,
                passed: false,
            },
            {
                key: 'distinctWeapons',
                label: 'Distinct weapons',
                actual: 1,
                required: 2,
                passed: false,
            },
            {
                key: 'capturedDiagnosedClips',
                label: 'Captured clips with diagnoses',
                actual: 0,
                required: 1,
                passed: false,
            },
            {
                key: 'capturedGoldenClips',
                label: 'Captured golden clips',
                actual: 0,
                required: 1,
                passed: false,
            },
        ]);
        expect(summary.starterGaps).toEqual([
            'Adicionar pelo menos 2 clips capturados extras para sair do draft minimo de 2/4.',
            'Adicionar pelo menos 1 arma distinta ao corpus capturado inicial.',
            'Adicionar pelo menos 1 clip capturado com diagnostico esperado nao vazio.',
            'Promover pelo menos 1 clip capturado para reviewStatus=golden.',
        ]);
    });

    it('renders a markdown report with coverage counts and starter gaps', () => {
        const summary = buildBenchmarkCoverageSummary(dataset);
        const markdown = renderBenchmarkCoverageMarkdown(summary, {
            title: 'Benchmark Coverage 2026-04-14',
            generatedFor: 'tests/goldens/benchmark/captured-benchmark-draft.json',
        });

        expect(markdown).toContain('# Benchmark Coverage 2026-04-14');
        expect(markdown).toContain('Dataset: `captured-benchmark-draft`');
        expect(markdown).toContain('| Total clips | 2 |');
        expect(markdown).toContain('| Tracking tier clean | 1 |');
        expect(markdown).toContain('| Tracking tier degraded | 1 |');
        expect(markdown).toContain('## Starter Gate');
        expect(markdown).toContain('| Captured clips | 2 | 4 | FAIL |');
        expect(markdown).toContain('- Adicionar pelo menos 1 arma distinta ao corpus capturado inicial.');
    });
});
