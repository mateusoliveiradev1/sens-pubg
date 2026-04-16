import { describe, expect, it, vi } from 'vitest';

import {
    buildTrajectory,
    calculateSprayMetrics,
    detectSprayWindow,
    extractFramesFromBitmaps,
    generateCoaching,
    generateSensitivityRecommendation,
    runDiagnostics,
    summarizeShotAlignmentError,
    sliceExtractedFramesToWindow,
    summarizeFrameTimestampDrift,
} from '@/core';
import { mapWorkerTrackingResultToEngine, summarizePointErrorAgainstReference } from '@/app/analyze/tracking-result-mapper';
import { CURRENT_PUBG_PATCH_VERSION, getWeapon } from '@/game/pubg';
import type { TrackingResult, WeaponLoadout } from '@/types/engine';
import { asMilliseconds, asPixels } from '@/types/branded';
import { createAimAnalyzerSession, type WorkerAnalysisContext } from '@/workers/aim-analyzer-session';

const defaultLoadout: WeaponLoadout = {
    stance: 'standing',
    muzzle: 'none',
    grip: 'none',
    stock: 'none',
};

const defaultWorkerContext: WorkerAnalysisContext = {
    fov: 90,
    resolutionY: 1080,
    weapon: {
        id: 'm416',
        name: 'M416',
        category: 'ar',
        baseVerticalRecoil: 1,
        baseHorizontalRng: 1,
        fireRateMs: 88,
        multipliers: {},
    },
    multipliers: {
        vertical: 1,
        horizontal: 1,
    },
    vsm: 1,
    crosshairColor: 'RED',
};

type SyntheticBitmap = {
    readonly width: number;
    readonly height: number;
    readonly imageData: ImageData;
};

type ControlFrame = {
    readonly frame: number;
    readonly timestamp: number;
    readonly x: number;
    readonly y: number;
};

class FakeBitmapCanvasContext {
    private bitmap: SyntheticBitmap | null = null;

    drawImage(bitmap: SyntheticBitmap): void {
        this.bitmap = bitmap;
    }

    getImageData(): ImageData {
        if (!this.bitmap) {
            throw new Error('Bitmap not drawn before reading image data');
        }

        return this.bitmap.imageData;
    }
}

class FakeBitmapOffscreenCanvas {
    readonly width: number;
    readonly height: number;
    private readonly context = new FakeBitmapCanvasContext();

    constructor(width: number, height: number) {
        this.width = width;
        this.height = height;
    }

    getContext(contextId: string): FakeBitmapCanvasContext | null {
        return contextId === '2d' ? this.context : null;
    }
}

function createOverpullTrackingResult(frameCount: number, msPerShot: number): TrackingResult {
    const points = Array.from({ length: frameCount }, (_, frame) => ({
        frame,
        x: asPixels(960),
        y: asPixels(540 - (frame * 2)),
        timestamp: asMilliseconds(frame * msPerShot),
        // Keep confidence below the smoothing threshold so the test controls the
        // exact synthetic trajectory instead of exercising the jitter smoother.
        confidence: 0.69,
    }));

    return {
        points,
        trackingFrames: points.map((point) => ({
            frame: point.frame,
            timestamp: point.timestamp,
            status: 'tracked' as const,
            confidence: 0.95,
            visiblePixels: 42,
            x: point.x,
            y: point.y,
        })),
        trackingQuality: 0.95,
        framesTracked: frameCount,
        framesLost: 0,
        visibleFrames: frameCount,
        framesProcessed: frameCount,
        statusCounts: {
            tracked: frameCount,
            occluded: 0,
            lost: 0,
            uncertain: 0,
        },
    };
}

function createTrackedFrame(width: number, height: number, x: number, y: number): ImageData {
    const data = new Uint8ClampedArray(width * height * 4);

    for (let index = 3; index < data.length; index += 4) {
        data[index] = 255;
    }

    for (let currentY = y - 2; currentY <= y + 2; currentY++) {
        for (let currentX = x - 2; currentX <= x + 2; currentX++) {
            if (currentX < 0 || currentY < 0 || currentX >= width || currentY >= height) {
                continue;
            }

            const pixelIndex = ((currentY * width) + currentX) * 4;
            data[pixelIndex] = 255;
            data[pixelIndex + 1] = 0;
            data[pixelIndex + 2] = 0;
            data[pixelIndex + 3] = 255;
        }
    }

    return { data, width, height } as ImageData;
}

function buildShotReference(controlFrames: readonly ControlFrame[], msPerShot: number): Array<{ frame: number; x: number; y: number }> {
    if (controlFrames.length === 0) {
        return [];
    }

    const shotReference: Array<{ frame: number; x: number; y: number }> = [];
    const lastTimestamp = controlFrames[controlFrames.length - 1]!.timestamp;

    for (let shotFrame = 0, targetTimestamp = controlFrames[0]!.timestamp; targetTimestamp <= lastTimestamp; shotFrame++, targetTimestamp += msPerShot) {
        let left = controlFrames[0]!;
        let right = controlFrames[controlFrames.length - 1]!;

        for (let index = 0; index < controlFrames.length - 1; index++) {
            const current = controlFrames[index]!;
            const next = controlFrames[index + 1]!;
            if (current.timestamp <= targetTimestamp && next.timestamp >= targetTimestamp) {
                left = current;
                right = next;
                break;
            }
        }

        const interval = right.timestamp - left.timestamp;
        const ratio = interval > 0 ? (targetTimestamp - left.timestamp) / interval : 0;

        shotReference.push({
            frame: shotFrame,
            x: left.x + ((right.x - left.x) * ratio),
            y: left.y + ((right.y - left.y) * ratio),
        });
    }

    return shotReference;
}

describe('analysis pipeline integration', () => {
    it('keeps a deterministic overpull scenario coherent from trajectory to coaching', () => {
        const weapon = getWeapon('m416');
        expect(weapon).toBeDefined();

        const tracking = createOverpullTrackingResult(12, weapon!.msPerShot);
        const trajectory = buildTrajectory(tracking, weapon!);
        const metrics = calculateSprayMetrics(trajectory, weapon!, defaultLoadout, 0.1, 30);
        const diagnoses = runDiagnostics(metrics, weapon!.category);
        const sensitivity = generateSensitivityRecommendation(
            metrics,
            diagnoses,
            800,
            'hybrid',
            'claw',
            45,
            {},
            1.0
        );
        const coaching = generateCoaching(diagnoses, defaultLoadout, {
            patchVersion: CURRENT_PUBG_PATCH_VERSION,
        });

        expect(trajectory.displacements).toHaveLength(11);
        expect(trajectory.framesProcessed).toBe(12);

        expect(metrics.verticalControlIndex).toBeGreaterThan(1.15);
        expect(metrics.initialRecoilResponseMs).toBe(asMilliseconds(88));
        expect(metrics.metricQuality?.verticalControlIndex.coverage).toBeCloseTo(1, 5);
        expect(metrics.metricQuality?.verticalControlIndex.confidence).toBeCloseTo(0.95, 5);

        expect(diagnoses).toHaveLength(1);
        expect(diagnoses[0]?.type).toBe('overpull');
        expect(diagnoses[0]?.severity).toBeGreaterThanOrEqual(4);

        expect(sensitivity.recommended).toBe('high');
        expect(sensitivity.reasoning).toContain('residualObjective=increase_sens');

        expect(coaching).toHaveLength(1);
        expect(coaching[0]?.mode).toBe('standard');
        expect(coaching[0]?.diagnosis.type).toBe('overpull');
        expect(coaching[0]?.evidence.recommendedAttachments).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    name: 'Lightweight Grip',
                    slot: 'grip',
                }),
            ])
        );
    });

    it('separates extraction drift, raw tracking error, and trajectory pipeline error in a controlled fixture', async () => {
        vi.stubGlobal('OffscreenCanvas', FakeBitmapOffscreenCanvas);

        const weapon = getWeapon('m416');
        expect(weapon).toBeDefined();

        const controlFrames: readonly ControlFrame[] = [
            { frame: 0, timestamp: 0, x: 100, y: 100 },
            { frame: 1, timestamp: 17, x: 104, y: 96 },
            { frame: 2, timestamp: 34, x: 96, y: 92 },
            { frame: 3, timestamp: 51, x: 104, y: 88 },
            { frame: 4, timestamp: 68, x: 96, y: 84 },
            { frame: 5, timestamp: 85, x: 104, y: 80 },
            { frame: 6, timestamp: 102, x: 96, y: 76 },
            { frame: 7, timestamp: 119, x: 104, y: 72 },
            { frame: 8, timestamp: 136, x: 96, y: 68 },
            { frame: 9, timestamp: 153, x: 104, y: 64 },
            { frame: 10, timestamp: 170, x: 96, y: 60 },
            { frame: 11, timestamp: 187, x: 104, y: 56 },
        ];
        const extractedFrames = await extractFramesFromBitmaps(
            controlFrames.map((frame) => ({
                width: 220,
                height: 220,
                imageData: createTrackedFrame(220, 220, frame.x, frame.y),
            })) as unknown as readonly ImageBitmap[],
            controlFrames.map((frame) => frame.timestamp)
        );
        const extractionDrift = summarizeFrameTimestampDrift(
            extractedFrames,
            controlFrames.map((frame) => frame.timestamp)
        );
        const session = createAimAnalyzerSession();
        session.start({ startX: controlFrames[0]!.x, startY: controlFrames[0]!.y });

        for (const frame of extractedFrames) {
            session.processFrame({
                imageData: frame.imageData,
                timestamp: frame.timestamp,
                context: defaultWorkerContext,
            });
        }

        const workerResult = session.finish();
        const expectedTrackingReference = controlFrames.map((frame) => ({
            frame: frame.frame,
            x: frame.x,
            y: frame.y,
        }));
        const rawTrackingError = summarizePointErrorAgainstReference(
            workerResult.points,
            expectedTrackingReference
        );
        const mappedTracking = mapWorkerTrackingResultToEngine(workerResult);
        const mappedTrackingError = summarizePointErrorAgainstReference(
            mappedTracking.points.map((point) => ({
                frame: point.frame,
                x: Number(point.x),
                y: Number(point.y),
            })),
            expectedTrackingReference
        );
        const trajectory = buildTrajectory(mappedTracking, weapon!);
        const shotReference = buildShotReference(controlFrames, weapon!.msPerShot);
        const trajectoryError = summarizePointErrorAgainstReference(
            trajectory.points.map((point) => ({
                frame: point.frame,
                x: Number(point.x),
                y: Number(point.y),
            })),
            shotReference
        );

        expect(extractionDrift).toEqual({
            sampleCount: 12,
            meanErrorMs: 0,
            maxErrorMs: 0,
        });
        expect(rawTrackingError).toEqual({
            sampleCount: 12,
            meanErrorPx: 0,
            maxErrorPx: 0,
        });
        expect(mappedTrackingError).toEqual(rawTrackingError);
        expect(trajectory.points).toHaveLength(3);
        expect(trajectoryError.sampleCount).toBe(3);
        expect(trajectoryError.meanErrorPx).toBeGreaterThan(1);
        expect(trajectoryError.meanErrorPx).toBeGreaterThan(rawTrackingError.meanErrorPx);
        expect(trajectoryError.maxErrorPx).toBeGreaterThan(2);
    });

    it('cuts dead leading and trailing frames before the worker session runs', async () => {
        vi.stubGlobal('OffscreenCanvas', FakeBitmapOffscreenCanvas);

        const extractedFrames = await extractFramesFromBitmaps(
            [
                { width: 220, height: 220, imageData: createTrackedFrame(220, 220, 100, 100) },
                { width: 220, height: 220, imageData: createTrackedFrame(220, 220, 100, 100) },
                { width: 220, height: 220, imageData: createTrackedFrame(220, 220, 100, 100) },
                { width: 220, height: 220, imageData: createTrackedFrame(220, 220, 100, 98) },
                { width: 220, height: 220, imageData: createTrackedFrame(220, 220, 101, 95) },
                { width: 220, height: 220, imageData: createTrackedFrame(220, 220, 103, 91) },
                { width: 220, height: 220, imageData: createTrackedFrame(220, 220, 103, 91) },
                { width: 220, height: 220, imageData: createTrackedFrame(220, 220, 103, 91) },
            ] as unknown as readonly ImageBitmap[],
            [0, 16, 32, 48, 64, 80, 96, 112]
        );
        const detectedWindow = detectSprayWindow(extractedFrames, {
            targetColor: 'RED',
            minDisplacementPx: 2,
            minShotLikeEvents: 2,
            preRollFrames: 1,
            postRollFrames: 1,
        });

        expect(detectedWindow).not.toBeNull();

        const filteredFrames = sliceExtractedFramesToWindow(extractedFrames, detectedWindow!);
        const session = createAimAnalyzerSession();
        session.start({ startX: 100, startY: 100 });

        for (const frame of filteredFrames) {
            session.processFrame({
                imageData: frame.imageData,
                timestamp: frame.timestamp,
                context: defaultWorkerContext,
            });
        }

        const result = session.finish();

        expect(filteredFrames.map((frame) => frame.timestamp)).toEqual([32, 48, 64, 80, 96]);
        expect(filteredFrames).toHaveLength(5);
        expect(result.framesProcessed).toBe(5);
        expect(result.framesProcessed).toBeLessThan(extractedFrames.length);
    });

    it('aligns the trajectory shot cadence to the first real recoil movement instead of dead lead-in frames', () => {
        const weapon = getWeapon('m416');
        expect(weapon).toBeDefined();
        const syntheticTemporalWeapon = {
            ...weapon!,
            id: 'm416-temporal-fixture',
            fireRateRPM: 1500,
            msPerShot: 40,
        };

        const tracking = {
            points: [
                { frame: 0, x: asPixels(960), y: asPixels(540), timestamp: asMilliseconds(0), confidence: 0.95 },
                { frame: 1, x: asPixels(960), y: asPixels(540), timestamp: asMilliseconds(20), confidence: 0.95 },
                { frame: 2, x: asPixels(960), y: asPixels(536), timestamp: asMilliseconds(40), confidence: 0.95 },
                { frame: 3, x: asPixels(960), y: asPixels(532), timestamp: asMilliseconds(60), confidence: 0.95 },
                { frame: 4, x: asPixels(960), y: asPixels(528), timestamp: asMilliseconds(80), confidence: 0.95 },
                { frame: 5, x: asPixels(960), y: asPixels(524), timestamp: asMilliseconds(100), confidence: 0.95 },
                { frame: 6, x: asPixels(960), y: asPixels(520), timestamp: asMilliseconds(120), confidence: 0.95 },
            ],
            trackingFrames: [
                { frame: 0, timestamp: asMilliseconds(0), status: 'tracked' as const, confidence: 0.95, visiblePixels: 25, x: asPixels(960), y: asPixels(540) },
                { frame: 1, timestamp: asMilliseconds(20), status: 'tracked' as const, confidence: 0.95, visiblePixels: 25, x: asPixels(960), y: asPixels(540) },
                { frame: 2, timestamp: asMilliseconds(40), status: 'tracked' as const, confidence: 0.95, visiblePixels: 25, x: asPixels(960), y: asPixels(536) },
                { frame: 3, timestamp: asMilliseconds(60), status: 'tracked' as const, confidence: 0.95, visiblePixels: 25, x: asPixels(960), y: asPixels(532) },
                { frame: 4, timestamp: asMilliseconds(80), status: 'tracked' as const, confidence: 0.95, visiblePixels: 25, x: asPixels(960), y: asPixels(528) },
                { frame: 5, timestamp: asMilliseconds(100), status: 'tracked' as const, confidence: 0.95, visiblePixels: 25, x: asPixels(960), y: asPixels(524) },
                { frame: 6, timestamp: asMilliseconds(120), status: 'tracked' as const, confidence: 0.95, visiblePixels: 25, x: asPixels(960), y: asPixels(520) },
            ],
            trackingQuality: 0.95,
            framesTracked: 7,
            framesLost: 0,
            visibleFrames: 7,
            framesProcessed: 7,
            statusCounts: {
                tracked: 7,
                occluded: 0,
                lost: 0,
                uncertain: 0,
            },
        };

        const trajectory = buildTrajectory(tracking, syntheticTemporalWeapon);
        const expectedShotTimestamps = [40, 80, 120];
        const alignmentError = summarizeShotAlignmentError(
            trajectory.points.map((point) => Number(point.timestamp)),
            expectedShotTimestamps
        );

        expect(trajectory.points.map((point) => Number(point.timestamp))).toEqual(expectedShotTimestamps);
        expect(alignmentError).toEqual({
            sampleCount: 3,
            meanErrorMs: 0,
            maxErrorMs: 0,
        });
    });
});
