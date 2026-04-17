import { describe, expect, it } from 'vitest';
import {
    analyzeCaptureQualityFrames,
    createVideoQualityDiagnosticReport,
    createVideoQualityFrameDiagnostics,
    createVideoQualityReport,
} from './capture-quality';

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

function createHudNoiseFixtureFrame(): ImageData {
    const frame = createFrame(160, 160);

    paintSquare(frame, 80, 80, 5, { r: 255, g: 0, b: 0 });
    paintSquare(frame, 16, 16, 21, { r: 255, g: 0, b: 0 });
    paintSquare(frame, 144, 16, 21, { r: 255, g: 0, b: 0 });
    paintSquare(frame, 16, 144, 21, { r: 255, g: 0, b: 0 });
    paintSquare(frame, 144, 144, 21, { r: 255, g: 0, b: 0 });

    return frame;
}

function createBlankFixtureFrame(): ImageData {
    return createFrame();
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
            reticleContrast: 10,
            roiStability: 35,
            fpsStability: 55,
            blockingReasons: ['low_sharpness', 'low_sharpness', 'high_compression_burden'],
        });

        expect(report).toEqual({
            overallScore: 20,
            sharpness: 0,
            compressionBurden: 100,
            reticleContrast: 10,
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

    it('treats captured-like borderline clips as usable when the signal is stable enough', () => {
        const report = createVideoQualityReport({
            sharpness: 33,
            compressionBurden: 89,
            reticleContrast: 34,
            roiStability: 100,
            fpsStability: 100,
        });

        expect(report).toEqual({
            overallScore: 56,
            sharpness: 33,
            compressionBurden: 89,
            reticleContrast: 34,
            roiStability: 100,
            fpsStability: 100,
            usableForAnalysis: true,
            blockingReasons: [],
        });
    });

    it('allows lower reticle contrast during real spray windows when the reticle remains trackable', () => {
        const report = createVideoQualityReport({
            sharpness: 42,
            compressionBurden: 77,
            reticleContrast: 24,
            roiStability: 100,
            fpsStability: 100,
        });

        expect(report).toEqual({
            overallScore: 58,
            sharpness: 42,
            compressionBurden: 77,
            reticleContrast: 24,
            roiStability: 100,
            fpsStability: 100,
            usableForAnalysis: true,
            blockingReasons: [],
        });
    });

    it('does not hard-block slightly low contrast when normalized sharpness and compression are healthy', () => {
        const report = createVideoQualityReport({
            sharpness: 70,
            compressionBurden: 38,
            reticleContrast: 18,
            roiStability: 100,
            fpsStability: 100,
        });

        expect(report.usableForAnalysis).toBe(true);
        expect(report.blockingReasons).toEqual([]);
        expect(report.overallScore).toBe(70);
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

    it('ignores off-center HUD-sized red noise when the centered reticle stays clean', () => {
        const noisyHudReport = analyzeCaptureQualityFrames([
            createHudNoiseFixtureFrame(),
            createHudNoiseFixtureFrame(),
        ]);

        expect(noisyHudReport.usableForAnalysis).toBe(true);
        expect(noisyHudReport.sharpness).toBeGreaterThan(80);
        expect(noisyHudReport.compressionBurden).toBeLessThan(20);
        expect(noisyHudReport.reticleContrast).toBeGreaterThan(80);
    });

    it('can normalize degraded Medal-like frames before quality scoring', () => {
        const rawReport = analyzeCaptureQualityFrames([
            createDegradedFixtureFrame(),
            createDegradedFixtureFrame(),
        ]);
        const normalizedReport = analyzeCaptureQualityFrames(
            [
                createDegradedFixtureFrame(),
                createDegradedFixtureFrame(),
            ],
            { normalizeBeforeScoring: true }
        );

        expect(normalizedReport.overallScore).toBeGreaterThan(rawReport.overallScore);
        expect(normalizedReport.reticleContrast).toBeGreaterThan(rawReport.reticleContrast);
        expect(normalizedReport.usableForAnalysis).toBe(true);
    });
});

describe('createVideoQualityDiagnosticReport', () => {
    it('labels frame-by-frame quality evidence and degraded timeline segments', () => {
        const timeline = createVideoQualityFrameDiagnostics([
            { index: 0, timestamp: 0, imageData: createCleanFixtureFrame() },
            { index: 1, timestamp: 500, imageData: createBlankFixtureFrame() },
            { index: 2, timestamp: 1000, imageData: createDegradedFixtureFrame() },
        ]);

        expect(timeline.summary).toMatchObject({
            totalFrames: 3,
            goodFrames: 1,
            degradedFrames: 1,
            lostFrames: 1,
        });
        expect(timeline.frames[0]).toMatchObject({
            frameIndex: 0,
            timestampMs: 0,
            status: 'good',
            issues: [],
        });
        expect(timeline.frames[1]).toMatchObject({
            frameIndex: 1,
            timestampMs: 500,
            status: 'lost',
        });
        expect(timeline.frames[1]?.issues).toContain('reticle_lost');
        expect(timeline.frames[2]).toMatchObject({
            frameIndex: 2,
            timestampMs: 1000,
            status: 'degraded',
        });
        expect(timeline.frames[2]?.issues).toContain('compression');
        expect(timeline.degradedSegments).toEqual([
            {
                startMs: 500,
                endMs: 1000,
                severity: 'critical',
                primaryIssue: 'reticle_lost',
                frameCount: 2,
            },
        ]);
    });

    it('summarizes preprocessing, spray-window evidence, and upgrade recommendations', () => {
        const timeline = createVideoQualityFrameDiagnostics([
            { index: 0, timestamp: 1000, imageData: createCleanFixtureFrame() },
            { index: 1, timestamp: 1500, imageData: createCleanFixtureFrame() },
        ]);
        const report = createVideoQualityReport({
            sharpness: 54,
            compressionBurden: 31,
            reticleContrast: 56,
            roiStability: 100,
            fpsStability: 100,
        });

        const diagnostic = createVideoQualityDiagnosticReport({
            report,
            sampledFrames: 9,
            selectedFrames: 5,
            normalizationApplied: true,
            timeline,
            sprayWindow: {
                startMs: 1000 as never,
                endMs: 3000 as never,
                confidence: 0.86,
                shotLikeEvents: 4,
                rejectedLeadingMs: 1000 as never,
                rejectedTrailingMs: 500 as never,
            },
        });

        expect(diagnostic).toMatchObject({
            tier: 'production_ready',
            preprocessing: {
                normalizationApplied: true,
                sampledFrames: 9,
                selectedFrames: 5,
                sprayWindow: {
                    startMs: 1000,
                    endMs: 3000,
                    confidence: 0.86,
                },
            },
            timeline: {
                summary: {
                    totalFrames: 2,
                    goodFrames: 2,
                },
            },
        });
        expect(diagnostic.summary).toContain('janela util');
        expect(diagnostic.recommendations).toContain('O pipeline aplicou normalizacao de cor/contraste antes da leitura.');
    });
});
