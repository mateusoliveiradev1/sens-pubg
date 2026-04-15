import { afterEach, describe, expect, it, vi } from 'vitest';
import { extractFrames, extractFramesFromBitmaps, type ExtractedFrame } from './frame-extraction';

type FakeSeekHandler = () => void;

class FakeVideoElement {
    src = '';
    muted = false;
    preload = '';
    videoWidth = 1920;
    videoHeight = 1080;
    duration = 2;
    oncanplaythrough: (() => void) | null = null;
    onerror: (() => void) | null = null;
    private current = 0;
    private readonly listeners = new Map<string, Set<FakeSeekHandler>>();

    get currentTime(): number {
        return this.current;
    }

    set currentTime(value: number) {
        this.current = value;
        const handlers = this.listeners.get('seeked');
        if (!handlers) {
            return;
        }

        for (const handler of [...handlers]) {
            handler();
        }
    }

    load(): void {
        this.oncanplaythrough?.();
    }

    addEventListener(type: string, handler: FakeSeekHandler): void {
        const handlers = this.listeners.get(type) ?? new Set<FakeSeekHandler>();
        handlers.add(handler);
        this.listeners.set(type, handlers);
    }

    removeEventListener(type: string, handler: FakeSeekHandler): void {
        this.listeners.get(type)?.delete(handler);
    }
}

class FakeCanvasRenderingContext2D {
    drawTimes: number[] = [];

    constructor(private readonly getCurrentTime: () => number, private readonly getSize: () => { width: number; height: number }) {}

    drawImage(): void {
        this.drawTimes.push(this.getCurrentTime());
    }

    getImageData(): ImageData {
        const { width, height } = this.getSize();
        const data = new Uint8ClampedArray(width * height * 4);
        const encodedTime = Math.round(this.getCurrentTime() * 100);
        data[0] = encodedTime;
        data[3] = 255;

        return { data, width, height } as ImageData;
    }
}

class FakeCanvasElement {
    width = 0;
    height = 0;
    readonly context: FakeCanvasRenderingContext2D;

    constructor(video: FakeVideoElement) {
        this.context = new FakeCanvasRenderingContext2D(
            () => video.currentTime,
            () => ({ width: this.width, height: this.height })
        );
    }

    getContext(kind: string): FakeCanvasRenderingContext2D | null {
        return kind === '2d' ? this.context : null;
    }
}

type FakeBitmap = {
    readonly width: number;
    readonly height: number;
};

class FakeOffscreenCanvasRenderingContext2D {
    lastBitmap: FakeBitmap | null = null;

    drawImage(bitmap: FakeBitmap): void {
        this.lastBitmap = bitmap;
    }

    getImageData(_x: number, _y: number, width: number, height: number): ImageData {
        const data = new Uint8ClampedArray(width * height * 4);
        data[0] = this.lastBitmap?.width ?? 0;
        data[1] = this.lastBitmap?.height ?? 0;
        data[3] = 255;

        return { data, width, height } as ImageData;
    }
}

class FakeOffscreenCanvas {
    readonly context = new FakeOffscreenCanvasRenderingContext2D();

    constructor(public readonly width: number, public readonly height: number) {}

    getContext(kind: string): FakeOffscreenCanvasRenderingContext2D | null {
        return kind === '2d' ? this.context : null;
    }
}

afterEach(() => {
    vi.unstubAllGlobals();
});

describe('extractFrames', () => {
    it('extracts frames at regular timestamps and reports progress', async () => {
        const video = new FakeVideoElement();
        const canvas = new FakeCanvasElement(video);

        vi.stubGlobal('document', {
            createElement: (tag: string) => {
                if (tag === 'video') {
                    return video;
                }

                if (tag === 'canvas') {
                    return canvas;
                }

                throw new Error(`Unexpected tag requested: ${tag}`);
            },
        });

        const progressUpdates: Array<{ current: number; total: number; percent: number }> = [];
        const streamedFrames: ExtractedFrame[] = [];

        const frames = await extractFrames(
            'blob://clip',
            5,
            0.2,
            0.6,
            (progress) => progressUpdates.push(progress),
            (frame) => streamedFrames.push(frame)
        );

        expect(frames).toHaveLength(3);
        expect(frames.map((frame) => ({
            index: frame.index,
            timestamp: frame.timestamp,
            encodedTime: frame.imageData.data[0],
        }))).toEqual([
            { index: 0, timestamp: 200, encodedTime: 20 },
            { index: 1, timestamp: 400, encodedTime: 40 },
            { index: 2, timestamp: 600, encodedTime: 60 },
        ]);
        expect(streamedFrames.map((frame) => frame.timestamp)).toEqual([200, 400, 600]);
        expect(progressUpdates).toEqual([
            { current: 1, total: 3, percent: 33 },
            { current: 2, total: 3, percent: 67 },
            { current: 3, total: 3, percent: 100 },
        ]);
        expect(canvas.context.drawTimes).toEqual([0.2, 0.4, 0.6000000000000001]);
    });
});

describe('extractFramesFromBitmaps', () => {
    it('converts bitmap frames into extracted frames while preserving indexes and timestamps', async () => {
        vi.stubGlobal('OffscreenCanvas', FakeOffscreenCanvas);

        const bitmaps = [
            { width: 4, height: 3 },
            { width: 2, height: 2 },
        ] as unknown as readonly ImageBitmap[];

        const frames = await extractFramesFromBitmaps(bitmaps, [100, 240]);

        expect(frames).toHaveLength(2);
        expect(frames.map((frame) => ({
            index: frame.index,
            timestamp: frame.timestamp,
            width: frame.imageData.width,
            height: frame.imageData.height,
            encodedBitmapWidth: frame.imageData.data[0],
            encodedBitmapHeight: frame.imageData.data[1],
        }))).toEqual([
            { index: 0, timestamp: 100, width: 4, height: 3, encodedBitmapWidth: 4, encodedBitmapHeight: 3 },
            { index: 1, timestamp: 240, width: 2, height: 2, encodedBitmapWidth: 2, encodedBitmapHeight: 2 },
        ]);
    });

    it('skips bitmap entries that do not have a matching timestamp', async () => {
        vi.stubGlobal('OffscreenCanvas', FakeOffscreenCanvas);

        const bitmaps = [
            { width: 4, height: 3 },
            { width: 2, height: 2 },
        ] as unknown as readonly ImageBitmap[];

        const frames = await extractFramesFromBitmaps(bitmaps, [100]);

        expect(frames).toHaveLength(1);
        expect(frames[0]).toMatchObject({
            index: 0,
            timestamp: 100,
        });
    });
});
