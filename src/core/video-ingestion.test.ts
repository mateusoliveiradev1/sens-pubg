import { describe, expect, it } from 'vitest';
import { createVideoQualityReport } from './capture-quality';
import {
    selectVideoQualityFrameSample,
    selectVideoQualityFrames,
    validateAndPrepareVideo,
} from './video-ingestion';
import type { ExtractedFrame } from './frame-extraction';

function createFrame(
    width: number,
    height: number,
    reticle?: {
        readonly x: number;
        readonly y: number;
    }
): ImageData {
    const data = new Uint8ClampedArray(width * height * 4);

    for (let index = 3; index < data.length; index += 4) {
        data[index] = 255;
    }

    if (reticle) {
        for (let y = reticle.y - 2; y <= reticle.y + 2; y++) {
            for (let x = reticle.x - 2; x <= reticle.x + 2; x++) {
                const pixelIndex = ((y * width) + x) * 4;
                data[pixelIndex] = 255;
                data[pixelIndex + 3] = 255;
            }
        }
    }

    return { data, width, height } as ImageData;
}

function createExtractedFrames(
    positions: readonly Array<{
        readonly timestamp: number;
        readonly x: number;
        readonly y: number;
    }>
): ExtractedFrame[] {
    return positions.map((position, index) => ({
        index,
        timestamp: position.timestamp,
        imageData: createFrame(40, 40, { x: position.x, y: position.y }),
    }));
}

describe('validateAndPrepareVideo', () => {
    it('attaches the quality report to validated metadata', async () => {
        const file = new File(['fake-video'], 'clip.mp4', { type: 'video/mp4' });
        const qualityReport = createVideoQualityReport({
            sharpness: 88,
            compressionBurden: 12,
            reticleContrast: 84,
            roiStability: 91,
            fpsStability: 95,
        });

        const result = await validateAndPrepareVideo(file, {
            validateMagicBytes: async () => true,
            loadVideoMetadata: async () => ({
                width: 1920,
                height: 1080,
                duration: 8,
                url: 'blob:test-clean',
            }),
            estimateFps: async () => 60,
            assessQuality: async () => qualityReport,
        });

        expect(result).toEqual({
            valid: true,
            metadata: {
                file,
                url: 'blob:test-clean',
                mimeType: 'video/mp4',
                width: 1920,
                height: 1080,
                duration: 8,
                fps: 60,
                qualityReport,
            },
        });
    });

    it('preserves blocked quality reports so the caller can stop the analysis flow', async () => {
        const file = new File(['fake-video'], 'clip.mp4', { type: 'video/mp4' });
        const qualityReport = createVideoQualityReport({
            sharpness: 10,
            compressionBurden: 92,
            reticleContrast: 18,
            roiStability: 100,
            fpsStability: 100,
        });

        const result = await validateAndPrepareVideo(file, {
            validateMagicBytes: async () => true,
            loadVideoMetadata: async () => ({
                width: 1920,
                height: 1080,
                duration: 8,
                url: 'blob:test-blocked',
            }),
            estimateFps: async () => 60,
            assessQuality: async () => qualityReport,
        });

        expect(result.valid).toBe(true);
        if (!result.valid) {
            throw new Error('Expected validated metadata with blocking quality report');
        }

        expect(result.metadata.qualityReport.usableForAnalysis).toBe(false);
        expect(result.metadata.qualityReport.blockingReasons).toEqual([
            'low_sharpness',
            'high_compression_burden',
            'low_reticle_contrast',
        ]);
    });
});

describe('selectVideoQualityFrames', () => {
    it('uses the detected spray window instead of the opening dead time for quality scoring', () => {
        const frames = createExtractedFrames([
            { timestamp: 0, x: 20, y: 20 },
            { timestamp: 500, x: 20, y: 20 },
            { timestamp: 1000, x: 20, y: 20 },
            { timestamp: 1500, x: 20, y: 18 },
            { timestamp: 2000, x: 21, y: 15 },
            { timestamp: 2500, x: 23, y: 11 },
            { timestamp: 3000, x: 23, y: 11 },
        ]);

        const selected = selectVideoQualityFrames(frames, {
            fallbackFrameCount: 3,
            minDisplacementPx: 2,
            minShotLikeEvents: 2,
        });

        expect(selected.map((frame) => frame.timestamp)).toEqual([
            1000,
            1500,
            2000,
            2500,
            3000,
        ]);
    });

    it('falls back to the initial sample when no spray window is detectable', () => {
        const frames = createExtractedFrames([
            { timestamp: 0, x: 20, y: 20 },
            { timestamp: 500, x: 20, y: 20 },
            { timestamp: 1000, x: 20, y: 20 },
            { timestamp: 1500, x: 20, y: 20 },
        ]);

        const selected = selectVideoQualityFrames(frames, {
            fallbackFrameCount: 2,
            minDisplacementPx: 2,
            minShotLikeEvents: 2,
        });

        expect(selected.map((frame) => frame.timestamp)).toEqual([0, 500]);
    });

    it('returns spray-window metadata for upload quality diagnostics', () => {
        const frames = createExtractedFrames([
            { timestamp: 0, x: 20, y: 20 },
            { timestamp: 500, x: 20, y: 20 },
            { timestamp: 1000, x: 20, y: 20 },
            { timestamp: 1500, x: 20, y: 18 },
            { timestamp: 2000, x: 21, y: 15 },
            { timestamp: 2500, x: 23, y: 11 },
            { timestamp: 3000, x: 23, y: 11 },
        ]);

        const sample = selectVideoQualityFrameSample(frames, {
            fallbackFrameCount: 3,
            minDisplacementPx: 2,
            minShotLikeEvents: 2,
        });

        expect(sample.frames.map((frame) => frame.timestamp)).toEqual([
            1000,
            1500,
            2000,
            2500,
            3000,
        ]);
        expect(sample.sprayWindow).toMatchObject({
            startMs: 1000,
            endMs: 3000,
            shotLikeEvents: 3,
        });
    });
});
