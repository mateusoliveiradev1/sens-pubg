import { describe, expect, it } from 'vitest';
import { parseCapturedClipIntakeManifest } from '@/types/captured-clip-intake';
import {
    buildCapturedFrameLabelTemplate,
    summarizeCapturedFrameLabelTemplate,
} from './captured-frame-label-template';

describe('captured frame label template', () => {
    it('creates a per-clip frame labeling worksheet without guessing human labels', () => {
        const intake = parseCapturedClipIntakeManifest({
            schemaVersion: 1,
            manifestId: 'captured-clips-intake-test',
            createdAt: '2026-04-14T18:45:00.000Z',
            clips: [
                {
                    clipId: 'captured-clip-test',
                    media: {
                        videoPath: 'tests/fixtures/captured-clips/clip-test.mp4',
                        contactPreviewPath: 'tests/fixtures/captured-clips/previews/clip-test-contact.jpg',
                        centerPreviewPath: 'tests/fixtures/captured-clips/previews/clip-test-center.jpg',
                        sha256: 'a'.repeat(64),
                        sizeBytes: 10,
                        width: 1920,
                        height: 1080,
                        fps: 60,
                        frameCount: 181,
                        durationSeconds: 3,
                        codecFourcc: 'h264',
                        meanBlurLaplacian: 100,
                        meanCenterBlurLaplacian: 100,
                    },
                    quality: {
                        reviewStatus: 'auto-triaged',
                        qualityTier: 'candidate-clean',
                        occlusionLevel: 'none',
                        compressionLevel: 'light',
                        reticleVisibility: 'visible',
                        benchmarkReadiness: 'needs-labels',
                        rationale: 'test fixture',
                    },
                    unknownCaptureFields: ['frameLabels'],
                },
            ],
        });

        const template = buildCapturedFrameLabelTemplate(intake.clips[0]!, {
            sampleIntervalSeconds: 1,
            createdAt: '2026-04-14T19:30:00.000Z',
        });
        const summary = summarizeCapturedFrameLabelTemplate(template);

        expect(template.clipId).toBe('captured-clip-test');
        expect(template.sourceVideoPath).toBe('tests/fixtures/captured-clips/clip-test.mp4');
        expect(template.frameSize).toEqual({ width: 1920, height: 1080 });
        expect(template.frames.map((frame) => frame.timestampSeconds)).toEqual([0, 1, 2, 3]);
        expect(template.frames.map((frame) => frame.frameIndex)).toEqual([0, 60, 120, 180]);
        expect(template.frames.every((frame) => frame.label.status === null)).toBe(true);
        expect(summary.readyFrameCount).toBe(0);
        expect(summary.missingFrameCount).toBe(4);
    });

    it('requires coordinates only for visible frame statuses', () => {
        const template = buildCapturedFrameLabelTemplate({
            clipId: 'visibility-rules',
            media: {
                videoPath: 'tests/fixtures/captured-clips/clip-test.mp4',
                contactPreviewPath: 'tests/fixtures/captured-clips/previews/clip-test-contact.jpg',
                centerPreviewPath: 'tests/fixtures/captured-clips/previews/clip-test-center.jpg',
                sha256: 'b'.repeat(64),
                sizeBytes: 10,
                width: 100,
                height: 100,
                fps: 10,
                frameCount: 11,
                durationSeconds: 1,
                codecFourcc: 'h264',
                meanBlurLaplacian: 100,
                meanCenterBlurLaplacian: 100,
            },
            quality: {
                reviewStatus: 'auto-triaged',
                qualityTier: 'candidate-degraded',
                occlusionLevel: 'moderate',
                compressionLevel: 'light',
                reticleVisibility: 'intermittent',
                benchmarkReadiness: 'needs-labels',
                rationale: 'test fixture',
            },
            unknownCaptureFields: ['frameLabels'],
        }, {
            sampleIntervalSeconds: 1,
            createdAt: '2026-04-14T19:30:00.000Z',
        });

        const labeled = {
            ...template,
            frames: [
                { ...template.frames[0]!, label: { status: 'tracked' as const, x: 50, y: 50 } },
                { ...template.frames[1]!, label: { status: 'occluded' as const, x: null, y: null } },
            ],
        };
        const summary = summarizeCapturedFrameLabelTemplate(labeled);

        expect(summary.readyFrameCount).toBe(2);
        expect(summary.missingFrameCount).toBe(0);
    });
});
