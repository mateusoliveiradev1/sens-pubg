import { describe, expect, it } from 'vitest';
import { normalizeTrackingFrame } from './video-normalization';

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

function readPixel(imageData: ImageData, x: number, y: number): [number, number, number, number] {
    const index = ((y * imageData.width) + x) * 4;
    return [
        imageData.data[index] ?? 0,
        imageData.data[index + 1] ?? 0,
        imageData.data[index + 2] ?? 0,
        imageData.data[index + 3] ?? 0,
    ];
}

describe('normalizeTrackingFrame', () => {
    it('boosts dominant reticle colors while keeping neutral highlights neutral', () => {
        const imageData = makeImageData(3, 1, [
            { x: 0, y: 0, r: 190, g: 80, b: 80 },
            { x: 1, y: 0, r: 80, g: 190, b: 80 },
            { x: 2, y: 0, r: 200, g: 200, b: 200 },
        ]);

        const normalized = normalizeTrackingFrame(imageData);
        const redPixel = readPixel(normalized, 0, 0);
        const greenPixel = readPixel(normalized, 1, 0);
        const neutralPixel = readPixel(normalized, 2, 0);

        expect(redPixel[0]).toBeGreaterThan(200);
        expect(redPixel[1]).toBeLessThan(80);
        expect(redPixel[2]).toBeLessThan(80);
        expect(greenPixel[1]).toBeGreaterThan(200);
        expect(greenPixel[0]).toBeLessThan(80);
        expect(greenPixel[2]).toBeLessThan(80);
        expect(neutralPixel[0]).toBeGreaterThan(210);
        expect(neutralPixel[1]).toBeGreaterThan(210);
        expect(neutralPixel[2]).toBeGreaterThan(210);
        expect(Math.abs(neutralPixel[0] - neutralPixel[1])).toBeLessThanOrEqual(5);
        expect(Math.abs(neutralPixel[1] - neutralPixel[2])).toBeLessThanOrEqual(5);
        expect(redPixel[3]).toBe(255);
    });
});
