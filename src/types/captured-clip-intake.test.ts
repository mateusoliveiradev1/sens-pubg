import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
    capturedClipIntakeManifestSchema,
    parseCapturedClipIntakeManifest,
} from './captured-clip-intake';

const manifestPath = 'tests/fixtures/captured-clips/intake.v1.json';

const readManifest = (): unknown => JSON.parse(readFileSync(manifestPath, 'utf8'));

describe('captured clip intake manifest schema', () => {
    it('accepts the four captured PUBG clips after human review marks labels as ready', () => {
        const manifest = parseCapturedClipIntakeManifest(readManifest());

        expect(manifest.schemaVersion).toBe(1);
        expect(manifest.clips).toHaveLength(4);
        expect(manifest.clips[0]?.clipId).toBe('captured-clip1-2026-04-14');
        expect(manifest.clips[0]?.quality.reviewStatus).toBe('human-reviewed');
        expect(manifest.clips[0]?.quality.qualityTier).toBe('candidate-clean');
        expect(manifest.clips[0]?.quality.benchmarkReadiness).toBe('ready-for-golden-labels');
        expect(manifest.clips[0]?.unknownCaptureFields).toEqual([]);
        expect(manifest.clips[1]?.clipId).toBe('captured-clip2-2026-04-14');
        expect(manifest.clips[1]?.quality.reviewStatus).toBe('human-reviewed');
        expect(manifest.clips[1]?.quality.qualityTier).toBe('candidate-degraded');
        expect(manifest.clips[1]?.quality.occlusionLevel).toBe('moderate');
        expect(manifest.clips[1]?.media.codecFourcc).toBe('hevc');
        expect(manifest.clips[2]?.clipId).toBe('captured-clip3-2026-04-14');
        expect(manifest.clips[2]?.quality.qualityTier).toBe('candidate-clean');
        expect(manifest.clips[3]?.clipId).toBe('captured-clip4-2026-04-14');
        expect(manifest.clips[3]?.quality.qualityTier).toBe('candidate-degraded');
        expect(manifest.clips[3]?.quality.benchmarkReadiness).toBe('ready-for-golden-labels');
    });

    it('rejects candidate clips marked as benchmark-ready while human labels are still unknown', () => {
        const result = capturedClipIntakeManifestSchema.safeParse({
            schemaVersion: 1,
            manifestId: 'invalid-intake',
            createdAt: '2026-04-14T18:50:00.000Z',
            clips: [
                {
                    clipId: 'invalid-ready-without-labels',
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
                        reviewStatus: 'auto-triaged',
                        qualityTier: 'candidate-clean',
                        occlusionLevel: 'light',
                        compressionLevel: 'light',
                        reticleVisibility: 'intermittent',
                        benchmarkReadiness: 'ready-for-golden-labels',
                        rationale: 'Invalid because labels are still unknown.',
                    },
                    unknownCaptureFields: ['expectedDiagnoses'],
                },
            ],
        });

        expect(result.success).toBe(false);
        expect(result.error.issues.some((issue) => issue.path.join('.') === 'clips.0.quality.benchmarkReadiness')).toBe(
            true,
        );
    });
});
