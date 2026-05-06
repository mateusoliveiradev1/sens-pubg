import { describe, expect, it } from 'vitest';
import { classifyGlobalMotionTransition, estimateGlobalMotion } from './global-motion-compensation';

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

function makeBlockPixels(
    centerX: number,
    centerY: number,
    size: number,
    color: { r: number; g: number; b: number }
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

describe('estimateGlobalMotion', () => {
    it('detects a known background shift even when the reticle itself stays screen-fixed', () => {
        const frameWidth = 40;
        const frameHeight = 40;
        const backgroundPixels = makePatternPixels();
        const previousFrame = makeImageData(frameWidth, frameHeight, [
            ...backgroundPixels,
            ...makeBlockPixels(20, 20, 5, { r: 255, g: 0, b: 0 }),
        ]);
        const currentFrame = makeImageData(frameWidth, frameHeight, [
            ...shiftPixels(backgroundPixels, 4, 3, frameWidth, frameHeight),
            ...makeBlockPixels(20, 20, 5, { r: 255, g: 0, b: 0 }),
        ]);

        const estimate = estimateGlobalMotion(previousFrame, currentFrame, {
            searchRadiusPx: 6,
            sampleStepPx: 1,
        });

        expect(estimate.dx).toBe(4);
        expect(estimate.dy).toBe(3);
        expect(estimate.confidence).toBeGreaterThan(0.5);
        expect(estimate.magnitudePx).toBeCloseTo(5);
        expect(estimate.transitionKind).toBe('camera_motion');
        expect(estimate.reliability).toBeGreaterThan(0.5);
    });

    it('classifies unchanged frames as stable', () => {
        const frame = makeImageData(40, 40, makePatternPixels());

        const estimate = classifyGlobalMotionTransition(frame, frame, {
            searchRadiusPx: 6,
            sampleStepPx: 1,
        });

        expect(estimate.dx).toBe(0);
        expect(estimate.dy).toBe(0);
        expect(estimate.transitionKind).toBe('stable');
    });

    it('classifies incompatible frames as a hard cut', () => {
        const previousFrame = makeImageData(40, 40, makePatternPixels());
        const currentFrame = makeImageData(41, 40, makePatternPixels());

        const estimate = classifyGlobalMotionTransition(previousFrame, currentFrame);

        expect(estimate.transitionKind).toBe('hard_cut');
        expect(estimate.confidence).toBe(0);
        expect(estimate.meanAbsoluteError).toBe(Number.POSITIVE_INFINITY);
    });
});
