import { describe, expect, it } from 'vitest';
import { benchmarkDatasetSchema, parseBenchmarkDataset } from './benchmark';

function expectedTruth(overrides: Record<string, unknown> = {}) {
    return {
        actionState: 'testable',
        mechanicalLevel: 'advanced',
        evidenceTier: 'strong',
        weakEvidenceDowngrade: false,
        primaryFocusArea: 'validation',
        secondaryFocusAreas: ['consistency'],
        nextBlock: {
            tier: 'test_protocol',
            key: 'validation-block-protocol',
            title: 'Bloco curto de teste de validacao',
            durationMinutes: 12,
            stepMarker: 'Faca 3 sprays comparaveis focados em validacao.',
            target: 'evidencia mais forte para a proxima decisao do coach',
            minimumCoverage: 0.65,
            minimumConfidence: 0.65,
            successCondition: 'Sucesso quando validacao melhorar e cobertura/confianca continuarem acima do limite.',
            failCondition: 'Falha se validacao nao melhorar ou se a evidencia cair abaixo do limite.',
            nextClipValidation: 'Validacao de validacao',
        },
        ...overrides,
    };
}

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
                        expectedCoachPlan: {
                            tier: 'test_protocol',
                            primaryFocusArea: 'vertical_control',
                            nextBlockTitle: 'Bloco curto de teste de controle vertical',
                        },
                        expectedTrackingTier: 'clean',
                        expectedTruth: expectedTruth({
                            primaryFocusArea: 'vertical_control',
                        }),
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
                        expectedTruth: expectedTruth(),
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
                        expectedCoachPlan: {
                            tier: 'test_protocol',
                            primaryFocusArea: 'horizontal_control',
                            nextBlockTitle: 'Bloco curto de teste de controle horizontal',
                        },
                        expectedTrackingTier: 'degraded',
                        expectedTruth: expectedTruth({
                            primaryFocusArea: 'horizontal_control',
                        }),
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

    it('rejects ready truth expectations with weak-evidence downgrade', () => {
        const result = benchmarkDatasetSchema.safeParse({
            schemaVersion: 1,
            datasetId: 'invalid-truth-dataset',
            createdAt: '2026-04-14T12:00:00.000Z',
            clips: [
                {
                    clipId: 'invalid-ready-downgrade',
                    media: {
                        videoPath: 'tests/goldens/real/invalid.mp4',
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
                            muzzle: 'none',
                            grip: 'none',
                            stock: 'none',
                        },
                    },
                    labels: {
                        expectedDiagnoses: [],
                        expectedTrackingTier: 'clean',
                        expectedTruth: expectedTruth({
                            actionState: 'ready',
                            weakEvidenceDowngrade: true,
                        }),
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

        expect(result.success).toBe(false);
        expect(result.error.issues.some((issue) => issue.path.join('.') === 'clips.0.labels.expectedTruth.weakEvidenceDowngrade')).toBe(true);
    });

    it('rejects diagnosed clips that omit coach and truth protocol expectations', () => {
        const result = benchmarkDatasetSchema.safeParse({
            schemaVersion: 1,
            datasetId: 'invalid-diagnosed-dataset',
            createdAt: '2026-04-14T12:00:00.000Z',
            clips: [
                {
                    clipId: 'diagnosed-without-plan',
                    media: {
                        videoPath: 'tests/goldens/real/invalid.mp4',
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
                            muzzle: 'none',
                            grip: 'none',
                            stock: 'none',
                        },
                    },
                    labels: {
                        expectedDiagnoses: ['underpull'],
                        expectedTrackingTier: 'clean',
                        expectedTruth: expectedTruth(),
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

        expect(result.success).toBe(false);
        expect(result.error.issues.some((issue) => issue.path.join('.') === 'clips.0.labels.expectedCoachMode')).toBe(true);
        expect(result.error.issues.some((issue) => issue.path.join('.') === 'clips.0.labels.expectedCoachPlan')).toBe(true);
    });

    it('accepts stable truth enums without user-facing UI labels', () => {
        const result = benchmarkDatasetSchema.safeParse({
            schemaVersion: 1,
            datasetId: 'stable-truth-dataset',
            createdAt: '2026-04-14T12:00:00.000Z',
            clips: [
                {
                    clipId: 'stable-truth',
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
                        expectedTruth: expectedTruth({
                            actionState: 'inconclusive',
                            evidenceTier: 'weak',
                            weakEvidenceDowngrade: true,
                        }),
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
        expect(JSON.stringify(result.data.clips[0]?.labels.expectedTruth)).not.toContain('Pronto');
        expect(JSON.stringify(result.data.clips[0]?.labels.expectedTruth)).not.toContain('Capturar de novo');
    });
});
