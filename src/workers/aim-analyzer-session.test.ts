import { describe, expect, it } from 'vitest';
import { createAimAnalyzerSession, type WorkerAnalysisContext } from './aim-analyzer-session';

function createFrame(
    width: number,
    height: number,
    reticle?: {
        readonly x: number;
        readonly y: number;
        readonly shape: 'block' | 'plus';
        readonly size?: number;
    },
    background: {
        readonly r: number;
        readonly g: number;
        readonly b: number;
    } = { r: 0, g: 0, b: 0 },
    extraBlocks: readonly {
        readonly x: number;
        readonly y: number;
        readonly size: number;
        readonly color?: {
            readonly r: number;
            readonly g: number;
            readonly b: number;
        };
    }[] = []
): ImageData {
    const data = new Uint8ClampedArray(width * height * 4);

    for (let index = 0; index < data.length; index += 4) {
        data[index] = background.r;
        data[index + 1] = background.g;
        data[index + 2] = background.b;
        data[index + 3] = 255;
    }

    const setPixel = (x: number, y: number) => {
        if (x < 0 || y < 0 || x >= width || y >= height) return;
        const index = ((y * width) + x) * 4;
        data[index] = 255;
        data[index + 1] = 0;
        data[index + 2] = 0;
        data[index + 3] = 255;
    };

    const paintBlock = (
        centerX: number,
        centerY: number,
        size: number,
        color: {
            readonly r: number;
            readonly g: number;
            readonly b: number;
        } = { r: 255, g: 0, b: 0 }
    ) => {
        const half = Math.floor(size / 2);
        for (let y = centerY - half; y <= centerY + half; y++) {
            for (let x = centerX - half; x <= centerX + half; x++) {
                if (x < 0 || y < 0 || x >= width || y >= height) continue;
                const index = ((y * width) + x) * 4;
                data[index] = color.r;
                data[index + 1] = color.g;
                data[index + 2] = color.b;
                data[index + 3] = 255;
            }
        }
    };

    if (reticle) {
        if (reticle.shape === 'plus') {
            setPixel(reticle.x, reticle.y);
            setPixel(reticle.x - 1, reticle.y);
            setPixel(reticle.x + 1, reticle.y);
            setPixel(reticle.x, reticle.y - 1);
            setPixel(reticle.x, reticle.y + 1);
        } else {
            paintBlock(reticle.x, reticle.y, reticle.size ?? 5);
        }
    }

    for (const block of extraBlocks) {
        paintBlock(block.x, block.y, block.size, block.color);
    }

    return { data, width, height } as ImageData;
}

const defaultContext: WorkerAnalysisContext = {
    fov: 90,
    resolutionY: 1080,
    weapon: {
        id: 'm416',
        name: 'M416',
        category: 'ar',
        baseVerticalRecoil: 1,
        baseHorizontalRng: 1,
        fireRateMs: 86,
        multipliers: {},
    },
    multipliers: {
        vertical: 1,
        horizontal: 1,
    },
    vsm: 1,
    crosshairColor: 'RED',
    opticState: '1x',
    opticStateConfidence: 1,
};

describe('createAimAnalyzerSession', () => {
    it('auto-detects the reticle color in the worker when context omits the hint', () => {
        const session = createAimAnalyzerSession();
        session.start();

        const progress = session.processFrame({
            imageData: createFrame(
                24,
                24,
                undefined,
                { r: 0, g: 0, b: 0 },
                [
                    {
                        x: 10,
                        y: 10,
                        size: 5,
                        color: { r: 0, g: 255, b: 0 },
                    },
                ]
            ),
            timestamp: 0,
            context: {
                ...defaultContext,
                crosshairColor: undefined,
            },
        });

        const result = session.finish();

        expect(progress.statusCounts.tracked).toBe(1);
        expect(progress.framesLost).toBe(0);
        expect(result.trackingFrames[0]).toMatchObject({
            status: 'tracked',
            colorState: 'green',
            x: 10,
            y: 10,
        });
    });

    it('normalizes degraded Medal-like reticle colors before worker tracking', () => {
        const session = createAimAnalyzerSession();
        session.start();

        const progress = session.processFrame({
            imageData: createFrame(
                24,
                24,
                undefined,
                { r: 0, g: 0, b: 0 },
                [
                    {
                        x: 12,
                        y: 12,
                        size: 5,
                        color: { r: 190, g: 80, b: 80 },
                    },
                ]
            ),
            timestamp: 0,
            context: defaultContext,
        });

        const result = session.finish();

        expect(progress.statusCounts.tracked).toBe(1);
        expect(progress.framesLost).toBe(0);
        expect(result.trackingFrames[0]).toMatchObject({
            status: 'tracked',
            colorState: 'red',
        });
        expect(result.trackingFrames[0]?.x).toBeCloseTo(12, 3);
        expect(result.trackingFrames[0]?.y).toBeCloseTo(12, 3);
    });

    it('propagates exogenous disturbance scores into tracking frame payloads', () => {
        const session = createAimAnalyzerSession();
        session.start();

        session.processFrame({
            imageData: createFrame(
                32,
                32,
                { x: 16, y: 16, shape: 'block', size: 5 },
                { r: 0, g: 0, b: 0 },
                [
                    {
                        x: 24,
                        y: 16,
                        size: 7,
                        color: { r: 255, g: 220, b: 90 },
                    },
                ]
            ),
            timestamp: 0,
            context: defaultContext,
        });

        const frame = session.finish().trackingFrames[0];

        expect(frame).toMatchObject({
            status: 'tracked',
            colorState: 'red',
        });
        expect(frame?.exogenousDisturbance.muzzleFlash).toBeGreaterThan(0.2);
        expect(frame?.confidence).toBeLessThan(1);
    });

    it('records unknown optic state when the worker has no optic evidence', () => {
        const session = createAimAnalyzerSession();
        session.start();

        session.processFrame({
            imageData: createFrame(24, 24, { x: 10, y: 10, shape: 'block', size: 5 }),
            timestamp: 0,
            context: {
                ...defaultContext,
                opticState: undefined,
                opticStateConfidence: undefined,
            },
        });

        expect(session.finish().trackingFrames[0]).toMatchObject({
            opticState: 'unknown',
            opticStateConfidence: 0,
        });
    });

    it('tracks visible, uncertain, and occluded frames with auditable counters', () => {
        const session = createAimAnalyzerSession();
        session.start();

        session.processFrame({
            imageData: createFrame(24, 24, { x: 10, y: 10, shape: 'block', size: 5 }),
            timestamp: 0,
            context: defaultContext,
        });

        session.processFrame({
            imageData: createFrame(24, 24, { x: 11, y: 10, shape: 'plus' }),
            timestamp: 16,
            context: defaultContext,
        });

        session.processFrame({
            imageData: createFrame(24, 24, undefined, { r: 0, g: 255, b: 0 }),
            timestamp: 32,
            context: defaultContext,
        });

        const progress = session.processFrame({
            imageData: createFrame(24, 24, { x: 12, y: 14, shape: 'block', size: 5 }),
            timestamp: 48,
            context: defaultContext,
        });

        expect(progress).toMatchObject({
            frameCount: 2,
            framesProcessed: 4,
            framesLost: 1,
            visibleFrames: 3,
            statusCounts: {
                tracked: 2,
                uncertain: 1,
                occluded: 1,
                lost: 0,
            },
        });
        expect(progress.trackingQuality).toBeCloseTo(0.625, 5);

        const result = session.finish();

        expect(result.points).toHaveLength(2);
        expect(result.trackingFrames.map((frame) => frame.status)).toEqual([
            'tracked',
            'uncertain',
            'occluded',
            'tracked',
        ]);
        expect(result.trackingFrames[0]).toMatchObject({
            colorState: 'red',
            opticState: '1x',
            opticStateConfidence: 1,
        });
        expect(result.trackingFrames[2]?.exogenousDisturbance.occlusion).toBe(1);
        expect(result.trackingQuality).toBeCloseTo(0.625, 5);
        expect(result.suggestion).toContain('puxando demais');
    });

    it('marks a frame as lost before the tracker has any prior lock', () => {
        const session = createAimAnalyzerSession();
        session.start();

        const progress = session.processFrame({
            imageData: createFrame(24, 24),
            timestamp: 0,
            context: defaultContext,
        });

        expect(progress).toMatchObject({
            frameCount: 0,
            framesProcessed: 1,
            framesLost: 1,
            visibleFrames: 0,
            statusCounts: {
                tracked: 0,
                uncertain: 0,
                occluded: 0,
                lost: 1,
            },
            trackingQuality: 0,
        });

        expect(session.finish().trackingFrames[0]?.status).toBe('lost');
    });

    it('keeps the worker locked on the local reticle when red noise appears outside the ROI', () => {
        const session = createAimAnalyzerSession();
        session.start();

        session.processFrame({
            imageData: createFrame(400, 400, { x: 100, y: 100, shape: 'block', size: 5 }),
            timestamp: 0,
            context: defaultContext,
        });

        const progress = session.processFrame({
            imageData: createFrame(
                400,
                400,
                { x: 104, y: 102, shape: 'block', size: 5 },
                { r: 0, g: 0, b: 0 },
                [
                    {
                        x: 320,
                        y: 320,
                        size: 21,
                    },
                ]
            ),
            timestamp: 16,
            context: defaultContext,
        });

        const result = session.finish();
        const trackedFrame = result.trackingFrames[1];
        const trackedPoint = result.points[0];

        expect(progress.statusCounts.tracked).toBe(2);
        expect(progress.framesLost).toBe(0);
        expect(trackedFrame).toMatchObject({
            status: 'tracked',
        });
        expect(trackedFrame?.x).toBeCloseTo(104, 0);
        expect(trackedFrame?.y).toBeCloseTo(102, 0);
        expect(trackedFrame?.x).toBeLessThan(150);
        expect(trackedPoint).toMatchObject({
            x: 104,
            y: 102,
        });
    });
});
