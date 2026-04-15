import { describe, expect, it } from 'vitest';
import type { BenchmarkDataset } from '@/types/benchmark';
import type { CapturedClipIntakeManifest } from '@/types/captured-clip-intake';
import type { CapturedClipLabelSet } from '@/types/captured-clip-labels';
import {
    buildCapturedBenchmarkPlan,
    renderCapturedBenchmarkPlanMarkdown,
} from './captured-benchmark-plan';

const dataset: BenchmarkDataset = {
    schemaVersion: 1,
    datasetId: 'captured-benchmark-draft',
    createdAt: '2026-04-14T22:00:00.000Z',
    clips: [
        {
            clipId: 'captured-clip1-2026-04-14',
            media: {
                videoPath: 'tests/fixtures/captured-clips/clip1.mp4',
                frameLabelsPath: 'tests/fixtures/captured-clips/labels/captured-clip1-2026-04-14.frames.todo.json',
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
            clipId: 'captured-clip2-2026-04-14',
            media: {
                videoPath: 'tests/fixtures/captured-clips/clip2.mp4',
                frameLabelsPath: 'tests/fixtures/captured-clips/labels/captured-clip2-2026-04-14.frames.todo.json',
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

const intakeManifest: CapturedClipIntakeManifest = {
    schemaVersion: 1,
    manifestId: 'captured-clips-intake-2026-04-14',
    createdAt: '2026-04-14T18:45:00.000Z',
    clips: [
        {
            clipId: 'captured-clip1-2026-04-14',
            media: {
                videoPath: 'tests/fixtures/captured-clips/clip1.mp4',
                contactPreviewPath: 'tests/fixtures/captured-clips/previews/clip1_contact.jpg',
                centerPreviewPath: 'tests/fixtures/captured-clips/previews/clip1_center.jpg',
                sha256: '267f1b1147f44a0ac629c71b309b19880e2e84829d17a2cf5f4da251c567ffc9',
                sizeBytes: 48402783,
                width: 1744,
                height: 1080,
                fps: 143.477,
                frameCount: 2192,
                durationSeconds: 15.278,
                codecFourcc: 'hevc',
                meanBlurLaplacian: 693.39,
                meanCenterBlurLaplacian: 744.35,
            },
            quality: {
                reviewStatus: 'human-reviewed',
                qualityTier: 'candidate-clean',
                occlusionLevel: 'light',
                compressionLevel: 'light',
                reticleVisibility: 'intermittent',
                benchmarkReadiness: 'ready-for-golden-labels',
                rationale: 'Clip limpo o suficiente para promover depois do rotulo.',
            },
            unknownCaptureFields: [],
        },
        {
            clipId: 'captured-clip2-2026-04-14',
            media: {
                videoPath: 'tests/fixtures/captured-clips/clip2.mp4',
                contactPreviewPath: 'tests/fixtures/captured-clips/previews/clip2_contact.jpg',
                centerPreviewPath: 'tests/fixtures/captured-clips/previews/clip2_center.jpg',
                sha256: '42b3bfe535de191c9f8f6667341daa49a57232f51c9ca4dc82e10d86c882cba0',
                sizeBytes: 47630289,
                width: 1728,
                height: 1080,
                fps: 143.733,
                frameCount: 2149,
                durationSeconds: 14.951,
                codecFourcc: 'hevc',
                meanBlurLaplacian: 491.01,
                meanCenterBlurLaplacian: 427.97,
            },
            quality: {
                reviewStatus: 'human-reviewed',
                qualityTier: 'candidate-degraded',
                occlusionLevel: 'moderate',
                compressionLevel: 'light',
                reticleVisibility: 'intermittent',
                benchmarkReadiness: 'ready-for-golden-labels',
                rationale: 'Clip degradado mas rotulavel.',
            },
            unknownCaptureFields: [],
        },
    ],
};

const labelSet: CapturedClipLabelSet = {
    schemaVersion: 1,
    labelSetId: 'captured-clips-labels-todo-2026-04-14',
    intakeManifestId: 'captured-clips-intake-2026-04-14',
    createdAt: '2026-04-14T19:05:00.000Z',
    clips: [
        {
            clipId: 'captured-clip1-2026-04-14',
            capture: {
                patchVersion: '40.1',
                weaponId: 'aug',
                distanceMeters: 100,
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
            sprayWindow: {
                startSeconds: 11.8,
                endSeconds: 14.8,
            },
            frameLabelsPath: 'tests/fixtures/captured-clips/labels/captured-clip1-2026-04-14.frames.todo.json',
            labels: {
                expectedDiagnoses: [],
                expectedTrackingTier: 'clean',
                expectedCoachMode: null,
            },
        },
        {
            clipId: 'captured-clip2-2026-04-14',
            capture: {
                patchVersion: '40.1',
                weaponId: 'aug',
                distanceMeters: 50,
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
            sprayWindow: {
                startSeconds: 11,
                endSeconds: 14.951,
            },
            frameLabelsPath: 'tests/fixtures/captured-clips/labels/captured-clip2-2026-04-14.frames.todo.json',
            labels: {
                expectedDiagnoses: [],
                expectedTrackingTier: 'degraded',
                expectedCoachMode: null,
            },
        },
    ],
};

describe('captured benchmark plan', () => {
    it('turns coverage gaps into a minimal promotion + capture plan that closes the starter gate', () => {
        const plan = buildCapturedBenchmarkPlan(dataset, intakeManifest, labelSet);

        expect(plan.datasetId).toBe('captured-benchmark-draft');
        expect(plan.currentStarterGate.passed).toBe(false);
        expect(plan.promotionActions).toEqual([
            {
                clipId: 'captured-clip1-2026-04-14',
                currentReviewStatus: 'reviewed',
                targetReviewStatus: 'golden',
                qualityTier: 'candidate-clean',
                reason: 'clip capturado ja esta em `reviewed`, rotulos completos, intake marcado como `candidate-clean`, pronto para promover sem capturar video novo',
            },
        ]);
        expect(plan.captureBlueprints).toHaveLength(2);
        expect(plan.captureBlueprints[0]).toMatchObject({
            slotId: 'captured-slot-1',
            targetReviewStatus: 'reviewed',
            targetTrackingTier: 'clean',
            targetVisibilityTier: 'clean',
            targetOcclusionLevel: 'light',
            targetCompressionLevel: 'light',
            targetDistanceBucket: '0-30m',
            weaponPolicy: 'new-distinct-weapon',
            avoidWeaponIds: ['aug'],
            requiresExpectedDiagnosis: true,
        });
        expect(plan.captureBlueprints[0].purpose).toEqual([
            'fechar gap de quantidade minima de clips capturados',
            'fechar gap de arma distinta',
            'fechar gap de diagnostico esperado',
        ]);
        expect(plan.captureBlueprints[1]).toMatchObject({
            slotId: 'captured-slot-2',
            targetReviewStatus: 'reviewed',
            targetTrackingTier: 'degraded',
            targetVisibilityTier: 'degraded',
            targetOcclusionLevel: 'moderate',
            targetCompressionLevel: 'medium',
            targetDistanceBucket: '101m+',
            weaponPolicy: 'any',
            requiresExpectedDiagnosis: false,
        });
        expect(plan.projectedStarterGate.passed).toBe(true);
        expect(plan.projectedStarterGate.checks).toEqual([
            {
                key: 'capturedClips',
                label: 'Captured clips',
                actual: 4,
                required: 4,
                passed: true,
            },
            {
                key: 'distinctWeapons',
                label: 'Distinct weapons',
                actual: 2,
                required: 2,
                passed: true,
            },
            {
                key: 'capturedDiagnosedClips',
                label: 'Captured clips with diagnoses',
                actual: 1,
                required: 1,
                passed: true,
            },
            {
                key: 'capturedGoldenClips',
                label: 'Captured golden clips',
                actual: 1,
                required: 1,
                passed: true,
            },
        ]);
    });

    it('renders a markdown action plan with promotions, capture blueprints, and a projected passing gate', () => {
        const markdown = renderCapturedBenchmarkPlanMarkdown(
            buildCapturedBenchmarkPlan(dataset, intakeManifest, labelSet),
            {
                title: 'Captured Benchmark Plan 2026-04-14',
                generatedFor: 'tests/goldens/benchmark/captured-benchmark-draft.json',
            }
        );

        expect(markdown).toContain('# Captured Benchmark Plan 2026-04-14');
        expect(markdown).toContain('## Immediate Promotions');
        expect(markdown).toContain('Promover `captured-clip1-2026-04-14` de `reviewed` para `golden`.');
        expect(markdown).toContain('## New Capture Blueprints');
        expect(markdown).toContain('### captured-slot-1');
        expect(markdown).toContain('- Weapon policy: `new-distinct-weapon`');
        expect(markdown).toContain('## Projected Starter Gate After Plan');
        expect(markdown).toContain('| Captured golden clips | 1 | 1 | PASS |');
    });

    it('renders a closed-gate note when no promotions or captures remain', () => {
        const markdown = renderCapturedBenchmarkPlanMarkdown(
            {
                datasetId: 'captured-benchmark-draft',
                currentStarterGate: {
                    passed: true,
                    checks: [
                        {
                            key: 'capturedClips',
                            label: 'Captured clips',
                            actual: 4,
                            required: 4,
                            passed: true,
                        },
                        {
                            key: 'distinctWeapons',
                            label: 'Distinct weapons',
                            actual: 2,
                            required: 2,
                            passed: true,
                        },
                        {
                            key: 'capturedDiagnosedClips',
                            label: 'Captured clips with diagnoses',
                            actual: 1,
                            required: 1,
                            passed: true,
                        },
                        {
                            key: 'capturedGoldenClips',
                            label: 'Captured golden clips',
                            actual: 1,
                            required: 1,
                            passed: true,
                        },
                    ],
                },
                promotionActions: [],
                captureBlueprints: [],
                projectedStarterGate: {
                    passed: true,
                    checks: [
                        {
                            key: 'capturedClips',
                            label: 'Captured clips',
                            actual: 4,
                            required: 4,
                            passed: true,
                        },
                        {
                            key: 'distinctWeapons',
                            label: 'Distinct weapons',
                            actual: 2,
                            required: 2,
                            passed: true,
                        },
                        {
                            key: 'capturedDiagnosedClips',
                            label: 'Captured clips with diagnoses',
                            actual: 1,
                            required: 1,
                            passed: true,
                        },
                        {
                            key: 'capturedGoldenClips',
                            label: 'Captured golden clips',
                            actual: 1,
                            required: 1,
                            passed: true,
                        },
                    ],
                },
            },
            {
                title: 'Captured Benchmark Plan 2026-04-14',
                generatedFor: 'tests/goldens/benchmark/captured-benchmark-draft.json',
            },
        );

        expect(markdown).toContain('Nenhuma promocao imediata restante; o starter gate ja esta fechado com a cobertura atual.');
        expect(markdown).toContain('- Nenhum clip novo necessario para fechar o starter gate.');
    });
});
