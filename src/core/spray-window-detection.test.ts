import { describe, expect, it } from 'vitest';
import type { ExtractedFrame } from './frame-extraction';
import { detectSprayWindow } from './spray-window-detection';

function createFrame(
    width: number,
    height: number,
    reticle?: {
        readonly x: number;
        readonly y: number;
        readonly size?: number;
    }
): ImageData {
    const data = new Uint8ClampedArray(width * height * 4);

    for (let index = 3; index < data.length; index += 4) {
        data[index] = 255;
    }

    if (reticle) {
        const half = Math.floor((reticle.size ?? 5) / 2);
        for (let y = reticle.y - half; y <= reticle.y + half; y++) {
            for (let x = reticle.x - half; x <= reticle.x + half; x++) {
                if (x < 0 || y < 0 || x >= width || y >= height) {
                    continue;
                }

                const pixelIndex = ((y * width) + x) * 4;
                data[pixelIndex] = 255;
                data[pixelIndex + 1] = 0;
                data[pixelIndex + 2] = 0;
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

describe('detectSprayWindow', () => {
    it('detects the main spray window when the clip has dead time before and after the burst', () => {
        const frames = createExtractedFrames([
            { timestamp: 0, x: 20, y: 20 },
            { timestamp: 16, x: 20, y: 20 },
            { timestamp: 32, x: 20, y: 20 },
            { timestamp: 48, x: 20, y: 18 },
            { timestamp: 64, x: 21, y: 15 },
            { timestamp: 80, x: 23, y: 11 },
            { timestamp: 96, x: 23, y: 11 },
            { timestamp: 112, x: 23, y: 11 },
        ]);

        const window = detectSprayWindow(frames, {
            minDisplacementPx: 2,
            minShotLikeEvents: 2,
            preRollFrames: 1,
            postRollFrames: 1,
            targetColor: 'RED',
        });

        expect(window).toMatchObject({
            startMs: 32,
            endMs: 96,
            shotLikeEvents: 3,
            rejectedLeadingMs: 32,
            rejectedTrailingMs: 16,
        });
        expect(window?.confidence).toBeGreaterThan(0.5);
    });

    it('returns null when the clip has no meaningful reticle movement', () => {
        const frames = createExtractedFrames([
            { timestamp: 0, x: 20, y: 20 },
            { timestamp: 16, x: 20, y: 20 },
            { timestamp: 32, x: 20, y: 20 },
            { timestamp: 48, x: 20, y: 20 },
        ]);

        expect(detectSprayWindow(frames, { minDisplacementPx: 2, targetColor: 'RED' })).toBeNull();
    });
});
