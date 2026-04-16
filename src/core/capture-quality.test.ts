import { describe, expect, it } from 'vitest';
import { analyzeCaptureQualityFrames, createVideoQualityReport } from './capture-quality';

type RgbColor = {
    readonly r: number;
    readonly g: number;
    readonly b: number;
};

function createFrame(
    width: number,
    height: number,
    background: RgbColor = { r: 0, g: 0, b: 0 }
): ImageData {
    const data = new Uint8ClampedArray(width * height * 4);

    for (let index = 0; index < data.length; index += 4) {
        data[index] = background.r;
        data[index + 1] = background.g;
        data[index + 2] = background.b;
        data[index + 3] = 255;
    }

    return { data, width, height } as ImageData;
}

function paintSquare(
    imageData: ImageData,
    centerX: number,
    centerY: number,
    size: number,
    color: RgbColor
): void {
    const half = Math.floor(size / 2);

    for (let y = centerY - half; y <= centerY + half; y++) {
        for (let x = centerX - half; x <= centerX + half; x++) {
            if (x < 0 || y < 0 || x >= imageData.width || y >= imageData.height) {
                continue;
            }

            const index = ((y * imageData.width) + x) * 4;
            imageData.data[index] = color.r;
            imageData.data[index + 1] = color.g;
            imageData.data[index + 2] = color.b;
            imageData.data[index + 3] = 255;
        }
    }
}

function createCleanFixtureFrame(): ImageData {
    const frame = createFrame(40, 40);
    paintSquare(frame, 20, 20, 5, { r: 255, g: 0, b: 0 });
    return frame;
}

function createDegradedFixtureFrame(): ImageData {
    const frame = createFrame(40, 40);

    paintSquare(frame, 20, 20, 9, { r: 145, g: 55, b: 55 });
    paintSquare(frame, 20, 20, 3, { r: 210, g: 70, b: 70 });
    paintSquare(frame, 14, 20, 3, { r: 132, g: 46, b: 46 });
    paintSquare(frame, 26, 20, 3, { r: 132, g: 46, b: 46 });
    paintSquare(frame, 20, 14, 3, { r: 132, g: 46, b: 46 });
    paintSquare(frame, 20, 26, 3, { r: 132, g: 46, b: 46 });

    return frame;
}

describe('createVideoQualityReport', () => {
    it('returns the complete contract with normalized component scores', () => {
        const report = createVideoQualityReport({
            sharpness: 82,
            compressionBurden: 18,
            reticleContrast: 77,
            roiStability: 91,
            fpsStability: 88,
        });

        expect(report).toEqual({
            overallScore: 84,
            sharpness: 82,
            compressionBurden: 18,
            reticleContrast: 77,
            roiStability: 91,
            fpsStability: 88,
            usableForAnalysis: true,
            blockingReasons: [],
        });
    });

    it('dedupes blocking reasons and blocks clips that fail hard quality gates', () => {
        const report = createVideoQualityReport({
            sharpness: -10,
            compressionBurden: 130,
            reticleContrast: 20,
            roiStability: 35,
            fpsStability: 55,
            blockingReasons: ['low_sharpness', 'low_sharpness', 'high_compression_burden'],
        });

        expect(report).toEqual({
            overallScore: 22,
            sharpness: 0,
            compressionBurden: 100,
            reticleContrast: 20,
            roiStability: 35,
            fpsStability: 55,
            usableForAnalysis: false,
            blockingReasons: [
                'low_sharpness',
                'high_compression_burden',
                'low_reticle_contrast',
                'unstable_roi',
            ],
        });
    });
});

describe('analyzeCaptureQualityFrames', () => {
    it('distinguishes clean and degraded fixtures by sharpness, contrast, and compression burden', () => {
        const cleanReport = analyzeCaptureQualityFrames([
            createCleanFixtureFrame(),
            createCleanFixtureFrame(),
        ]);
        const degradedReport = analyzeCaptureQualityFrames([
            createDegradedFixtureFrame(),
            createDegradedFixtureFrame(),
        ]);

        expect(cleanReport.sharpness).toBeGreaterThan(80);
        expect(cleanReport.reticleContrast).toBeGreaterThan(80);
        expect(cleanReport.compressionBurden).toBeLessThan(20);

        expect(degradedReport.sharpness).toBeLessThan(45);
        expect(degradedReport.reticleContrast).toBeLessThan(60);
        expect(degradedReport.compressionBurden).toBeGreaterThan(60);

        expect(cleanReport.sharpness).toBeGreaterThan(degradedReport.sharpness);
        expect(cleanReport.reticleContrast).toBeGreaterThan(degradedReport.reticleContrast);
        expect(cleanReport.compressionBurden).toBeLessThan(degradedReport.compressionBurden);
    });
});
