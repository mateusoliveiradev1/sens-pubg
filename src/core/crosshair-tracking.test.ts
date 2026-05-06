import { describe, expect, it } from 'vitest';
import * as tracking from './crosshair-tracking';

type CentroidDetector = (
    imageData: ImageData,
    targetColor?: 'RED' | 'GREEN',
    roi?: { x: number; y: number; width: number; height: number }
) => { currentX: number; currentY: number; confidence: number; visiblePixels: number } | null;

type StreamingTracker = {
    track: (
        imageData: ImageData,
        options?: { targetColor?: 'RED' | 'GREEN' }
    ) => {
        x?: number;
        y?: number;
        confidence: number;
        visiblePixels: number;
        reacquisitionFrames?: number;
        status: 'tracked' | 'occluded' | 'lost' | 'uncertain';
        colorState: 'red' | 'green' | 'neutral' | 'unknown';
        exogenousDisturbance: {
            muzzleFlash: number;
            blur: number;
            shake: number;
            occlusion: number;
        };
    };
    reset: (seed?: { x?: number; y?: number }) => void;
};

type TrackerConfig = {
    templateSize?: number;
    searchRadius?: number;
    roiRadiusPx?: number;
    normalizeBeforeTracking?: boolean;
    globalMotionCompensation?: boolean;
    globalMotionSearchRadiusPx?: number;
    globalMotionSampleStepPx?: number;
};

function makeImageData(
    width: number,
    height: number,
    pixels: readonly { x: number; y: number; r: number; g: number; b: number }[]
): ImageData {
    const data = new Uint8ClampedArray(width * height * 4);
    for (let i = 3; i < data.length; i += 4) {
        data[i] = 255;
    }

    for (const pixel of pixels) {
        const index = ((pixel.y * width) + pixel.x) * 4;
        data[index] = pixel.r;
        data[index + 1] = pixel.g;
        data[index + 2] = pixel.b;
        data[index + 3] = 255;
    }

    return { data, width, height } as ImageData;
}

function makeSolidImageData(
    width: number,
    height: number,
    color: { r: number; g: number; b: number }
): ImageData {
    const pixels = Array.from({ length: width * height }, (_, index) => ({
        x: index % width,
        y: Math.floor(index / width),
        ...color,
    }));

    return makeImageData(width, height, pixels);
}

function makeBlockPixels(
    centerX: number,
    centerY: number,
    size: number,
    color: { r: number; g: number; b: number } = { r: 255, g: 0, b: 0 }
): { x: number; y: number; r: number; g: number; b: number }[] {
    const half = Math.floor(size / 2);
    const pixels: { x: number; y: number; r: number; g: number; b: number }[] = [];

    for (let y = centerY - half; y <= centerY + half; y++) {
        for (let x = centerX - half; x <= centerX + half; x++) {
            pixels.push({ x, y, ...color });
        }
    }

    return pixels;
}

function shiftPixels(
    pixels: readonly { x: number; y: number; r: number; g: number; b: number }[],
    dx: number,
    dy: number,
    width: number,
    height: number
): { x: number; y: number; r: number; g: number; b: number }[] {
    return pixels.flatMap((pixel) => {
        const shiftedX = pixel.x + dx;
        const shiftedY = pixel.y + dy;

        if (shiftedX < 0 || shiftedY < 0 || shiftedX >= width || shiftedY >= height) {
            return [];
        }

        return [{
            x: shiftedX,
            y: shiftedY,
            r: pixel.r,
            g: pixel.g,
            b: pixel.b,
        }];
    });
}

function makePatternPixels(): { x: number; y: number; r: number; g: number; b: number }[] {
    return [
        ...makeBlockPixels(8, 8, 5, { r: 0, g: 220, b: 220 }),
        ...makeBlockPixels(28, 8, 5, { r: 80, g: 220, b: 0 }),
        ...makeBlockPixels(8, 28, 5, { r: 0, g: 120, b: 255 }),
        ...makeBlockPixels(28, 28, 5, { r: 220, g: 220, b: 0 }),
        ...makeBlockPixels(20, 12, 3, { r: 120, g: 120, b: 255 }),
        ...makeBlockPixels(13, 22, 3, { r: 0, g: 200, b: 120 }),
        ...makeBlockPixels(24, 20, 3, { r: 180, g: 180, b: 255 }),
    ];
}

describe('detectCrosshairCentroid', () => {
    it('detects a red crosshair centroid with measured confidence', () => {
        const detect = (tracking as { detectCrosshairCentroid?: CentroidDetector }).detectCrosshairCentroid;
        expect(detect).toBeTypeOf('function');
        if (!detect) return;

        const imageData = makeImageData(5, 5, [
            { x: 2, y: 1, r: 255, g: 0, b: 0 },
            { x: 1, y: 2, r: 255, g: 0, b: 0 },
            { x: 2, y: 2, r: 255, g: 0, b: 0 },
            { x: 3, y: 2, r: 255, g: 0, b: 0 },
            { x: 2, y: 3, r: 255, g: 0, b: 0 },
        ]);

        const result = detect(imageData, 'RED');

        expect(result).toEqual({
            currentX: 2,
            currentY: 2,
            confidence: 0.2,
            visiblePixels: 5,
        });
    });

    it('refines the centroid to subpixel precision when reticle intensities are asymmetric', () => {
        const detect = (tracking as { detectCrosshairCentroid?: CentroidDetector }).detectCrosshairCentroid;
        expect(detect).toBeTypeOf('function');
        if (!detect) return;

        const imageData = makeImageData(7, 7, [
            { x: 3, y: 2, r: 255, g: 0, b: 0 },
            { x: 2, y: 3, r: 205, g: 0, b: 0 },
            { x: 3, y: 3, r: 255, g: 0, b: 0 },
            { x: 4, y: 3, r: 255, g: 0, b: 0 },
            { x: 3, y: 4, r: 255, g: 0, b: 0 },
        ]);

        const result = detect(imageData, 'RED');

        expect(result?.confidence).toBe(0.2);
        expect(result?.visiblePixels).toBe(5);
        expect(result?.currentX).toBeCloseTo(3.0408, 3);
        expect(result?.currentY).toBeCloseTo(3, 3);
    });

    it('returns null when the crosshair is not visible', () => {
        const detect = (tracking as { detectCrosshairCentroid?: CentroidDetector }).detectCrosshairCentroid;
        expect(detect).toBeTypeOf('function');
        if (!detect) return;

        const imageData = makeImageData(5, 5, []);

        expect(detect(imageData, 'RED')).toBeNull();
    });

    it('can restrict centroid detection to a region around the previous reticle', () => {
        const detect = (tracking as { detectCrosshairCentroid?: CentroidDetector }).detectCrosshairCentroid;
        expect(detect).toBeTypeOf('function');
        if (!detect) return;

        const crosshairPixels = [
            { x: 2, y: 1, r: 255, g: 0, b: 0 },
            { x: 1, y: 2, r: 255, g: 0, b: 0 },
            { x: 2, y: 2, r: 255, g: 0, b: 0 },
            { x: 3, y: 2, r: 255, g: 0, b: 0 },
            { x: 2, y: 3, r: 255, g: 0, b: 0 },
        ];
        const noisePixels = Array.from({ length: 25 }, (_, index) => ({
            x: 7 + (index % 3),
            y: 7 + Math.floor(index / 9),
            r: 255,
            g: 0,
            b: 0,
        }));
        const imageData = makeImageData(12, 12, [...crosshairPixels, ...noisePixels]);

        const fullFrame = detect(imageData, 'RED');
        const scoped = detect(imageData, 'RED', { x: 0, y: 0, width: 5, height: 5 });

        expect(fullFrame?.currentX).toBeGreaterThan(5);
        expect(scoped).toEqual({
            currentX: 2,
            currentY: 2,
            confidence: 0.2,
            visiblePixels: 5,
        });
    });
});

describe('createStreamingCrosshairTracker', () => {
    it('auto-detects a green reticle when no target color hint is provided', () => {
        const createTracker = (tracking as { createStreamingCrosshairTracker?: () => StreamingTracker }).createStreamingCrosshairTracker;
        expect(createTracker).toBeTypeOf('function');
        if (!createTracker) return;

        const imageData = makeImageData(7, 7, makeBlockPixels(3, 3, 5, { r: 0, g: 255, b: 0 }));

        const trackerInstance = createTracker();
        const result = trackerInstance.track(imageData);

        expect(result).toMatchObject({
            x: 3,
            y: 3,
            visiblePixels: 25,
            status: 'tracked',
            colorState: 'green',
        });
        expect(result.confidence).toBe(1);
    });

    it('falls back to a bright neutral reticle when the selected color is missing', () => {
        const createTracker = (tracking as { createStreamingCrosshairTracker?: () => StreamingTracker }).createStreamingCrosshairTracker;
        expect(createTracker).toBeTypeOf('function');
        if (!createTracker) return;

        const imageData = makeImageData(5, 5, [
            { x: 2, y: 1, r: 255, g: 255, b: 255 },
            { x: 1, y: 2, r: 255, g: 255, b: 255 },
            { x: 2, y: 2, r: 255, g: 255, b: 255 },
            { x: 3, y: 2, r: 255, g: 255, b: 255 },
            { x: 2, y: 3, r: 255, g: 255, b: 255 },
        ]);

        const trackerInstance = createTracker();
        const result = trackerInstance.track(imageData, { targetColor: 'RED' });

        expect(result).toMatchObject({
            x: 2,
            y: 2,
            visiblePixels: 5,
            status: 'uncertain',
            colorState: 'neutral',
            exogenousDisturbance: {
                muzzleFlash: 0,
                shake: 0,
                occlusion: 0,
            },
        });
        expect(result.confidence).toBeGreaterThan(0);
        expect(result.exogenousDisturbance.blur).toBeGreaterThan(0.7);
    });

    it('uses template fallback to keep a short occlusion as uncertain instead of lost', () => {
        const createTracker = (
            tracking as {
                createStreamingCrosshairTracker?: (config?: { templateSize?: number; searchRadius?: number }) => StreamingTracker;
            }
        ).createStreamingCrosshairTracker;
        expect(createTracker).toBeTypeOf('function');
        if (!createTracker) return;

        const trackerInstance = createTracker({ templateSize: 5, searchRadius: 6 });
        const lockedFrame = makeImageData(9, 9, Array.from({ length: 25 }, (_, index) => ({
            x: 2 + (index % 5),
            y: 2 + Math.floor(index / 5),
            r: 255,
            g: 0,
            b: 0,
        })));
        const dimFrame = makeImageData(9, 9, Array.from({ length: 25 }, (_, index) => ({
            x: 2 + (index % 5),
            y: 2 + Math.floor(index / 5),
            r: 180,
            g: 60,
            b: 60,
        })));

        const first = trackerInstance.track(lockedFrame, { targetColor: 'RED' });
        const second = trackerInstance.track(dimFrame, { targetColor: 'RED' });

        expect(first.status).toBe('tracked');
        expect(second).toMatchObject({
            x: 4.5,
            y: 4.5,
            status: 'uncertain',
            visiblePixels: 0,
            colorState: 'unknown',
        });
        expect(second.confidence).toBeGreaterThan(0.3);
        expect(second.exogenousDisturbance.occlusion).toBeGreaterThan(0.5);
    });

    it('can optionally normalize a degraded reticle before tracking', () => {
        const createTracker = (
            tracking as {
                createStreamingCrosshairTracker?: (config?: TrackerConfig) => StreamingTracker;
            }
        ).createStreamingCrosshairTracker;
        expect(createTracker).toBeTypeOf('function');
        if (!createTracker) return;

        const degradedFrame = makeImageData(9, 9, makeBlockPixels(4, 4, 5, { r: 190, g: 80, b: 80 }));

        const withoutNormalization = createTracker({ templateSize: 5, searchRadius: 6 });
        const withNormalization = createTracker({
            templateSize: 5,
            searchRadius: 6,
            normalizeBeforeTracking: true,
        });

        expect(withoutNormalization.track(degradedFrame, { targetColor: 'RED' })).toMatchObject({
            status: 'lost',
            colorState: 'unknown',
        });
        const normalizedResult = withNormalization.track(degradedFrame, { targetColor: 'RED' });
        expect(normalizedResult).toMatchObject({
            visiblePixels: 25,
            status: 'tracked',
            colorState: 'red',
        });
        expect(normalizedResult.x).toBeCloseTo(4, 1);
        expect(normalizedResult.y).toBeCloseTo(4, 1);
    });

    it('can compensate global camera shake during template fallback', () => {
        const createTracker = (
            tracking as {
                createStreamingCrosshairTracker?: (config?: TrackerConfig) => StreamingTracker;
            }
        ).createStreamingCrosshairTracker;
        expect(createTracker).toBeTypeOf('function');
        if (!createTracker) return;

        const frameWidth = 40;
        const frameHeight = 40;
        const backgroundPixels = makePatternPixels();
        const lockedFrame = makeImageData(frameWidth, frameHeight, [
            ...backgroundPixels,
            ...makeBlockPixels(20, 20, 5),
        ]);
        const shakenOccludedFrame = makeImageData(
            frameWidth,
            frameHeight,
            shiftPixels(backgroundPixels, 4, 3, frameWidth, frameHeight)
        );

        const trackerWithoutCompensation = createTracker({
            templateSize: 9,
            searchRadius: 12,
            roiRadiusPx: 4,
        });
        const trackerWithCompensation = createTracker({
            templateSize: 9,
            searchRadius: 12,
            roiRadiusPx: 4,
            globalMotionCompensation: true,
            globalMotionSearchRadiusPx: 6,
        });

        trackerWithoutCompensation.track(lockedFrame, { targetColor: 'RED' });
        trackerWithCompensation.track(lockedFrame, { targetColor: 'RED' });

        const withoutCompensation = trackerWithoutCompensation.track(shakenOccludedFrame, { targetColor: 'RED' });
        const withCompensation = trackerWithCompensation.track(shakenOccludedFrame, { targetColor: 'RED' });
        const withoutCompensationError = Math.hypot(
            (withoutCompensation.x ?? 0) - 20,
            (withoutCompensation.y ?? 0) - 20
        );
        const withCompensationError = Math.hypot(
            (withCompensation.x ?? 0) - 20,
            (withCompensation.y ?? 0) - 20
        );

        expect(withoutCompensation.status).toBe('uncertain');
        expect(withoutCompensationError).toBeGreaterThan(4);
        expect(withCompensation).toMatchObject({
            status: 'uncertain',
            visiblePixels: 0,
            colorState: 'unknown',
        });
        expect(withCompensationError).toBeLessThan(withoutCompensationError);
        expect(withCompensationError).toBeLessThan(1);
    });

    it('classifies muzzle flash as an exogenous disturbance and dampens confidence', () => {
        const createTracker = (
            tracking as {
                createStreamingCrosshairTracker?: (config?: TrackerConfig) => StreamingTracker;
            }
        ).createStreamingCrosshairTracker;
        expect(createTracker).toBeTypeOf('function');
        if (!createTracker) return;

        const cleanFrame = makeImageData(32, 32, makeBlockPixels(16, 16, 5));
        const flashFrame = makeImageData(32, 32, [
            ...makeBlockPixels(24, 16, 7, { r: 255, g: 220, b: 90 }),
            ...makeBlockPixels(16, 16, 5),
        ]);
        const cleanTracker = createTracker({ roiRadiusPx: 12 });
        const flashTracker = createTracker({ roiRadiusPx: 12 });

        const clean = cleanTracker.track(cleanFrame, { targetColor: 'RED' });
        const flashed = flashTracker.track(flashFrame, { targetColor: 'RED' });

        expect(clean).toMatchObject({
            status: 'tracked',
            exogenousDisturbance: {
                muzzleFlash: 0,
            },
        });
        expect(flashed).toMatchObject({
            status: 'tracked',
            visiblePixels: 25,
            colorState: 'red',
        });
        expect(flashed.exogenousDisturbance.muzzleFlash).toBeGreaterThan(0.2);
        expect(flashed.confidence).toBeLessThan(clean.confidence);
    });

    it('classifies camera shake from global motion and dampens fallback confidence', () => {
        const createTracker = (
            tracking as {
                createStreamingCrosshairTracker?: (config?: TrackerConfig) => StreamingTracker;
            }
        ).createStreamingCrosshairTracker;
        expect(createTracker).toBeTypeOf('function');
        if (!createTracker) return;

        const frameWidth = 40;
        const frameHeight = 40;
        const backgroundPixels = makePatternPixels();
        const lockedFrame = makeImageData(frameWidth, frameHeight, [
            ...backgroundPixels,
            ...makeBlockPixels(20, 20, 5),
        ]);
        const staticOccludedFrame = makeImageData(frameWidth, frameHeight, backgroundPixels);
        const shakenOccludedFrame = makeImageData(
            frameWidth,
            frameHeight,
            shiftPixels(backgroundPixels, 4, 3, frameWidth, frameHeight)
        );
        const config: TrackerConfig = {
            templateSize: 9,
            searchRadius: 12,
            roiRadiusPx: 4,
            globalMotionCompensation: true,
            globalMotionSearchRadiusPx: 6,
        };

        const staticTracker = createTracker(config);
        const shakenTracker = createTracker(config);
        staticTracker.track(lockedFrame, { targetColor: 'RED' });
        shakenTracker.track(lockedFrame, { targetColor: 'RED' });

        const staticFallback = staticTracker.track(staticOccludedFrame, { targetColor: 'RED' });
        const shakenFallback = shakenTracker.track(shakenOccludedFrame, { targetColor: 'RED' });

        expect(staticFallback.status).toBe('uncertain');
        expect(staticFallback.exogenousDisturbance.shake).toBe(0);
        expect(shakenFallback.status).toBe('uncertain');
        expect(shakenFallback.exogenousDisturbance.shake).toBeGreaterThan(0.2);
        expect(shakenFallback.exogenousDisturbance.cameraMotion).toBeGreaterThan(0);
        expect(shakenFallback.confidence).toBeLessThan(staticFallback.confidence);
    });

    it('marks hard cuts as exogenous contamination instead of reticle movement', () => {
        const createTracker = (
            tracking as {
                createStreamingCrosshairTracker?: (config?: TrackerConfig) => StreamingTracker;
            }
        ).createStreamingCrosshairTracker;
        expect(createTracker).toBeTypeOf('function');
        if (!createTracker) return;

        const lockedFrame = makeImageData(32, 32, makeBlockPixels(16, 16, 5));
        const cutFrame = makeSolidImageData(32, 32, { r: 255, g: 255, b: 255 });
        const trackerInstance = createTracker({
            globalMotionCompensation: true,
            globalMotionSearchRadiusPx: 6,
        });

        const first = trackerInstance.track(lockedFrame, { targetColor: 'RED' });
        const second = trackerInstance.track(cutFrame, { targetColor: 'RED' });

        expect(first.status).toBe('tracked');
        expect(second.status).toBe('occluded');
        expect(second.confidence).toBe(0);
        expect(second.exogenousDisturbance.hardCut).toBeGreaterThan(0.8);
        expect(second.exogenousDisturbance.identityConfidence).toBe(0);
    });

    it('caps confidence for flicks and target swaps', () => {
        const createTracker = (
            tracking as {
                createStreamingCrosshairTracker?: (config?: TrackerConfig) => StreamingTracker;
            }
        ).createStreamingCrosshairTracker;
        expect(createTracker).toBeTypeOf('function');
        if (!createTracker) return;

        const trackerInstance = createTracker({ roiRadiusPx: 80, templateSize: 5, searchRadius: 80 });
        const firstFrame = makeImageData(80, 80, makeBlockPixels(20, 40, 5));
        const flickFrame = makeImageData(80, 80, makeBlockPixels(65, 40, 5));
        const targetSwapFrame = makeImageData(80, 80, makeBlockPixels(70, 40, 5));

        const first = trackerInstance.track(firstFrame, { targetColor: 'RED' });
        const flick = trackerInstance.track(flickFrame, { targetColor: 'RED' });
        const targetSwap = trackerInstance.track(targetSwapFrame, { targetColor: 'RED' });

        expect(first.status).toBe('tracked');
        expect(flick.confidence).toBeLessThan(0.5);
        expect(flick.exogenousDisturbance.flick).toBeGreaterThan(0);
        expect(targetSwap.confidence).toBeLessThan(0.5);
        expect(targetSwap.exogenousDisturbance.targetSwap).toBeGreaterThan(0);
        expect(targetSwap.exogenousDisturbance.identityConfidence).toBeLessThan(0.6);
    });

    it('reacquires the visible reticle after a short decoy-induced drift instead of staying lost', () => {
        const createTracker = (
            tracking as {
                createStreamingCrosshairTracker?: (config?: TrackerConfig) => StreamingTracker;
            }
        ).createStreamingCrosshairTracker;
        expect(createTracker).toBeTypeOf('function');
        if (!createTracker) return;

        const trackerInstance = createTracker({ templateSize: 5, searchRadius: 20, roiRadiusPx: 3 });
        const lockedFrame = makeImageData(32, 32, makeBlockPixels(8, 8, 5));
        const decoyFrame = makeImageData(32, 32, makeBlockPixels(20, 20, 5));
        const reacquiredFrame = makeImageData(32, 32, makeBlockPixels(9, 8, 5));

        const first = trackerInstance.track(lockedFrame, { targetColor: 'RED' });
        const second = trackerInstance.track(decoyFrame, { targetColor: 'RED' });
        const third = trackerInstance.track(reacquiredFrame, { targetColor: 'RED' });

        expect(first.status).toBe('tracked');
        expect(second.status).toBe('uncertain');
        expect(second.x).toBeGreaterThan(15);
        expect(second.y).toBeGreaterThan(15);
        expect(third).toMatchObject({
            status: 'tracked',
            visiblePixels: 25,
            colorState: 'red',
            reacquisitionFrames: 1,
        });
        expect(third.x).toBeCloseTo(9, 1);
        expect(third.y).toBeCloseTo(8, 1);
    });

    it('prefers the temporal prediction hypothesis over an ambiguous full-frame visual candidate', () => {
        const createTracker = (
            tracking as {
                createStreamingCrosshairTracker?: (config?: TrackerConfig) => StreamingTracker;
            }
        ).createStreamingCrosshairTracker;
        expect(createTracker).toBeTypeOf('function');
        if (!createTracker) return;

        const trackerInstance = createTracker({ templateSize: 5, searchRadius: 24, roiRadiusPx: 6 });
        const firstFrame = makeImageData(32, 32, makeBlockPixels(8, 8, 5));
        const secondFrame = makeImageData(32, 32, makeBlockPixels(12, 8, 5));
        const occludedWithDecoyFrame = makeImageData(32, 32, makeBlockPixels(22, 22, 5));
        const ambiguousRecoveryFrame = makeImageData(32, 32, [
            ...makeBlockPixels(19, 8, 5),
            ...makeBlockPixels(4, 20, 5),
        ]);

        const first = trackerInstance.track(firstFrame, { targetColor: 'RED' });
        const second = trackerInstance.track(secondFrame, { targetColor: 'RED' });
        const third = trackerInstance.track(occludedWithDecoyFrame, { targetColor: 'RED' });
        const fourth = trackerInstance.track(ambiguousRecoveryFrame, { targetColor: 'RED' });

        expect(first.status).toBe('tracked');
        expect(second.status).toBe('tracked');
        expect(second.x).toBeCloseTo(12, 1);
        expect(second.y).toBeCloseTo(8, 1);
        expect(third.status).toBe('uncertain');
        expect(third.x).toBeGreaterThan(18);
        expect(third.y).toBeGreaterThan(18);
        expect(fourth).toMatchObject({
            status: 'tracked',
            colorState: 'red',
            reacquisitionFrames: 1,
        });
        expect(fourth.x).toBeCloseTo(19, 1);
        expect(fourth.y).toBeCloseTo(8, 1);
        expect(fourth.x).toBeLessThan(21);
        expect(fourth.y).toBeLessThan(12);
    });
});
