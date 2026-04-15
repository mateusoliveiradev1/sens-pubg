import { describe, expect, it } from 'vitest';
import { benchmarkDatasetSchema, parseBenchmarkDataset } from './benchmark';

describe('benchmark dataset schema', () => {
    it('accepts benchmark datasets with patch, weapon, optic, attachments, labels, and quality metadata', () => {
        const dataset = {
            schemaVersion: 1,
            datasetId: 'pubg-spray-benchmark-v1',
            createdAt: '2026-04-14T12:00:00.000Z',
            clips: [
                {
                    clipId: 'beryl-411-hybrid-clean-001',
                    media: {
                        videoPath: 'tests/goldens/real/beryl-411-hybrid-clean-001.mp4',
                        frameLabelsPath: 'tests/goldens/real/beryl-411-hybrid-clean-001.labels.json',
                    },
                    sprayWindow: {
                        startSeconds: 6.8,
                        endSeconds: 12.4,
                    },
                    capture: {
                        patchVersion: '41.1',
                        weaponId: 'beryl-m762',
                        distanceMeters: 30,
                        stance: 'standing',
                        optic: {
                            opticId: 'hybrid-scope',
                            stateId: '4x',
                        },
                        attachments: {
                            muzzle: 'compensator',
                            grip: 'vertical',
                            stock: 'none',
                        },
                    },
                    labels: {
                        expectedDiagnoses: ['underpull'],
                        expectedCoachMode: 'standard',
                        expectedTrackingTier: 'clean',
                    },
                    quality: {
                        sourceType: 'captured',
                        reviewStatus: 'golden',
                        occlusionLevel: 'none',
                        compressionLevel: 'light',
                        visibilityTier: 'clean',
                    },
                    fixtures: {
                        trackingFixturePath: 'tests/goldens/tracking/clean-centered-red.json',
                        diagnosticFixturePath: 'tests/goldens/diagnostic/clean-no-diagnosis-411.json',
                        coachFixturePath: 'tests/goldens/coach/clean-no-diagnosis-411.json',
                    },
                },
            ],
        };

        const parsed = parseBenchmarkDataset(dataset);

        expect(parsed.clips[0]?.capture.patchVersion).toBe('41.1');
        expect(parsed.clips[0]?.sprayWindow?.startSeconds).toBe(6.8);
        expect(parsed.clips[0]?.capture.optic.opticId).toBe('hybrid-scope');
        expect(parsed.clips[0]?.labels.expectedCoachMode).toBe('standard');
        expect(parsed.clips[0]?.fixtures?.trackingFixturePath).toBe('tests/goldens/tracking/clean-centered-red.json');
    });

    it('accepts clean benchmark clips without diagnoses or coach mode labels', () => {
        const result = benchmarkDatasetSchema.safeParse({
            schemaVersion: 1,
            datasetId: 'clean-dataset',
            createdAt: '2026-04-14T12:00:00.000Z',
            clips: [
                {
                    clipId: 'ace-clean-411-001',
                    media: {
                        videoPath: 'tests/goldens/tracking/clean-centered-red.json',
                    },
                    capture: {
                        patchVersion: '41.1',
                        weaponId: 'ace32',
                        distanceMeters: 25,
                        stance: 'standing',
                        optic: {
                            opticId: 'red-dot-sight',
                            stateId: '1x',
                        },
                        attachments: {
                            muzzle: 'compensator',
                            grip: 'vertical',
                            stock: 'none',
                        },
                    },
                    labels: {
                        expectedDiagnoses: [],
                        expectedTrackingTier: 'clean',
                    },
                    quality: {
                        sourceType: 'synthetic',
                        reviewStatus: 'reviewed',
                        occlusionLevel: 'none',
                        compressionLevel: 'lossless',
                        visibilityTier: 'clean',
                    },
                },
            ],
        });

        expect(result.success).toBe(true);
    });

    it('rejects datasets that omit labels and quality metadata', () => {
        const result = benchmarkDatasetSchema.safeParse({
            schemaVersion: 1,
            datasetId: 'broken-dataset',
            createdAt: '2026-04-14T12:00:00.000Z',
            clips: [
                {
                    clipId: 'broken-clip',
                    media: {
                        videoPath: 'tests/goldens/real/broken.mp4',
                    },
                    capture: {
                        patchVersion: '41.1',
                        weaponId: 'beryl-m762',
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
                },
            ],
        });

        expect(result.success).toBe(false);
        expect(result.error.issues.some((issue) => issue.path.join('.') === 'clips.0.labels')).toBe(true);
        expect(result.error.issues.some((issue) => issue.path.join('.') === 'clips.0.quality')).toBe(true);
    });

    it('rejects patch-specific optics and attachments that do not exist in the chosen patch', () => {
        const result = benchmarkDatasetSchema.safeParse({
            schemaVersion: 1,
            datasetId: 'invalid-patch-links',
            createdAt: '2026-04-14T12:00:00.000Z',
            clips: [
                {
                    clipId: 'invalid-361-hybrid-tilted',
                    media: {
                        videoPath: 'tests/goldens/real/invalid-361-hybrid-tilted.mp4',
                    },
                    capture: {
                        patchVersion: '36.1',
                        weaponId: 'beryl-m762',
                        distanceMeters: 30,
                        stance: 'standing',
                        optic: {
                            opticId: 'hybrid-scope',
                            stateId: '4x',
                        },
                        attachments: {
                            muzzle: 'none',
                            grip: 'tilted',
                            stock: 'none',
                        },
                    },
                    labels: {
                        expectedDiagnoses: ['horizontal_drift'],
                        expectedCoachMode: 'standard',
                        expectedTrackingTier: 'degraded',
                    },
                    quality: {
                        sourceType: 'captured',
                        reviewStatus: 'reviewed',
                        occlusionLevel: 'light',
                        compressionLevel: 'medium',
                        visibilityTier: 'degraded',
                    },
                },
            ],
        });

        expect(result.success).toBe(false);
        expect(result.error.issues.some((issue) => issue.path.join('.') === 'clips.0.capture.optic.opticId')).toBe(true);
        expect(result.error.issues.some((issue) => issue.path.join('.') === 'clips.0.capture.attachments.grip')).toBe(true);
    });
});
