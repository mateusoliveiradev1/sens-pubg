import { describe, expect, it } from 'vitest';
import { createVideoQualityReport } from './capture-quality';
import { validateAndPrepareVideo } from './video-ingestion';

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
