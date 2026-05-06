import { describe, expect, it } from 'vitest';
import type { ExtractedFrame } from './frame-extraction';
import { detectSprayValidity, detectSprayWindow } from './spray-window-detection';

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
    }>,
    size: { readonly width: number; readonly height: number } = { width: 40, height: 40 }
): ExtractedFrame[] {
    return positions.map((position, index) => ({
        index,
        timestamp: position.timestamp,
        imageData: createFrame(size.width, size.height, { x: position.x, y: position.y }),
    }));
}

function createBlankExtractedFrames(count: number): ExtractedFrame[] {
    return Array.from({ length: count }, (_, index) => ({
        index,
        timestamp: index * 16,
        imageData: createFrame(40, 40),
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

    it('reports too-short clips as invalid truth-protection evidence', () => {
        const report = detectSprayValidity(createExtractedFrames([
            { timestamp: 0, x: 20, y: 20 },
            { timestamp: 16, x: 21, y: 18 },
            { timestamp: 32, x: 22, y: 15 },
        ]));

        expect(report.valid).toBe(false);
        expect(report.blockerReasons).toContain('too_short');
        expect(report.decisionLevel).not.toMatch(/usable_analysis|strong_analysis/);
    });

    it('reports sustained static reticles as not a spray protocol', () => {
        const report = detectSprayValidity(createExtractedFrames([
            { timestamp: 0, x: 20, y: 20 },
            { timestamp: 16, x: 20, y: 20 },
            { timestamp: 32, x: 20, y: 20 },
            { timestamp: 48, x: 20, y: 20 },
            { timestamp: 64, x: 20, y: 20 },
            { timestamp: 80, x: 20, y: 20 },
        ]));

        expect(report.valid).toBe(false);
        expect(report.blockerReasons).toContain('not_spray_protocol');
        expect(report.window).toBeNull();
    });

    it('reports clips without a visible crosshair instead of forcing a window', () => {
        const report = detectSprayValidity(createBlankExtractedFrames(8));

        expect(report.valid).toBe(false);
        expect(report.blockerReasons).toContain('crosshair_not_visible');
        expect(report.recaptureGuidance).toContain('Use reticulo vermelho ou verde visivel no centro.');
    });

    it('reports flicks as invalid spray evidence', () => {
        const report = detectSprayValidity(createExtractedFrames([
            { timestamp: 0, x: 40, y: 40 },
            { timestamp: 16, x: 40, y: 38 },
            { timestamp: 32, x: 40, y: 35 },
            { timestamp: 48, x: 71, y: 35 },
            { timestamp: 64, x: 72, y: 32 },
            { timestamp: 80, x: 73, y: 29 },
        ], { width: 100, height: 100 }));

        expect(report.valid).toBe(false);
        expect(report.blockerReasons).toContain('flick');
        expect(report.decisionLevel).not.toMatch(/usable_analysis|strong_analysis/);
    });

    it('reports repeated large jumps as a target swap', () => {
        const report = detectSprayValidity(createExtractedFrames([
            { timestamp: 0, x: 30, y: 50 },
            { timestamp: 16, x: 74, y: 50 },
            { timestamp: 32, x: 76, y: 48 },
            { timestamp: 48, x: 78, y: 46 },
            { timestamp: 64, x: 34, y: 44 },
            { timestamp: 80, x: 36, y: 42 },
            { timestamp: 96, x: 38, y: 40 },
        ], { width: 120, height: 100 }));

        expect(report.valid).toBe(false);
        expect(report.blockerReasons).toContain('target_swap');
    });

    it('reports leading or trailing discontinuities as hard cuts', () => {
        const report = detectSprayValidity(createExtractedFrames([
            { timestamp: 0, x: 20, y: 50 },
            { timestamp: 16, x: 78, y: 50 },
            { timestamp: 32, x: 79, y: 47 },
            { timestamp: 48, x: 80, y: 44 },
            { timestamp: 64, x: 81, y: 41 },
            { timestamp: 80, x: 82, y: 38 },
        ], { width: 120, height: 100 }));

        expect(report.valid).toBe(false);
        expect(report.blockerReasons).toContain('hard_cut');
    });
});
