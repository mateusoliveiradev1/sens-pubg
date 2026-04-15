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
        status: 'tracked' | 'occluded' | 'lost' | 'uncertain';
    };
    reset: (seed?: { x?: number; y?: number }) => void;
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
        });
        expect(result.confidence).toBeGreaterThan(0);
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
        });
        expect(second.confidence).toBeGreaterThan(0.3);
    });
});
