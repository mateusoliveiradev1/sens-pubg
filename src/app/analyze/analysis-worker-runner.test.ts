import { describe, expect, it, vi } from 'vitest';
import { runWorkerTrackingAnalysis } from './analysis-worker-runner';
import type { ExtractedFrame } from '@/core';
import type { WorkerAnalysisContext } from '../../workers/aim-analyzer-session';

class FakeWorker {
    readonly sentMessages: Array<{ readonly type: string; readonly payload?: unknown }> = [];
    private readonly listeners = new Map<string, Set<(event: MessageEvent) => void>>();

    addEventListener(type: string, listener: (event: MessageEvent) => void): void {
        const listeners = this.listeners.get(type) ?? new Set();
        listeners.add(listener);
        this.listeners.set(type, listeners);
    }

    removeEventListener(type: string, listener: (event: MessageEvent) => void): void {
        this.listeners.get(type)?.delete(listener);
    }

    postMessage(message: { readonly type: string; readonly payload?: unknown }): void {
        this.sentMessages.push(message);
    }

    emitMessage(message: { readonly type: string; readonly payload?: unknown }): void {
        for (const listener of this.listeners.get('message') ?? []) {
            listener({ data: message } as MessageEvent);
        }
    }

    emitError(message = 'worker failed'): void {
        for (const listener of this.listeners.get('error') ?? []) {
            listener({ message } as ErrorEvent as MessageEvent);
        }
    }
}

function createFrame(index: number): ExtractedFrame {
    return {
        index,
        timestamp: index * 16,
        imageData: {
            width: 2,
            height: 2,
            data: new Uint8ClampedArray(16),
        } as ImageData,
    };
}

const context = {
    fov: 90,
    resolutionY: 1080,
    weapon: {
        id: 'beryl-m762',
        name: 'Beryl M762',
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
} satisfies WorkerAnalysisContext;

describe('runWorkerTrackingAnalysis', () => {
    it('processes frames with backpressure before requesting the final result', async () => {
        const worker = new FakeWorker();
        const progress = vi.fn();
        const resultPromise = runWorkerTrackingAnalysis({
            worker: worker as unknown as Worker,
            frames: [createFrame(0), createFrame(1)],
            context,
            startX: 960,
            startY: 540,
            progressStart: 50,
            progressEnd: 85,
            timeoutMs: 1_000,
            onProgress: progress,
        });

        expect(worker.sentMessages.map((message) => message.type)).toEqual([
            'START_ANALYSIS',
            'PROCESS_FRAME',
        ]);

        worker.emitMessage({ type: 'PROGRESS', payload: { framesProcessed: 1 } });
        await Promise.resolve();

        expect(progress).toHaveBeenLastCalledWith(67.5);
        expect(worker.sentMessages.map((message) => message.type)).toEqual([
            'START_ANALYSIS',
            'PROCESS_FRAME',
            'PROCESS_FRAME',
        ]);

        worker.emitMessage({ type: 'PROGRESS', payload: { framesProcessed: 2 } });
        await Promise.resolve();

        expect(progress).toHaveBeenLastCalledWith(85);
        expect(worker.sentMessages.map((message) => message.type)).toEqual([
            'START_ANALYSIS',
            'PROCESS_FRAME',
            'PROCESS_FRAME',
            'FINISH_ANALYSIS',
        ]);

        worker.emitMessage({
            type: 'RESULT',
            payload: {
                points: [],
                trackingFrames: [],
                trackingQuality: 0,
                framesTracked: 0,
                framesLost: 0,
                visibleFrames: 0,
                framesProcessed: 2,
                statusCounts: {
                    tracked: 0,
                    occluded: 0,
                    lost: 0,
                    uncertain: 0,
                },
            },
        });

        await expect(resultPromise).resolves.toMatchObject({
            framesProcessed: 2,
        });
    });

    it('rejects instead of leaving the UI stuck when the worker errors', async () => {
        const worker = new FakeWorker();
        const resultPromise = runWorkerTrackingAnalysis({
            worker: worker as unknown as Worker,
            frames: [createFrame(0)],
            context,
            startX: 960,
            startY: 540,
            timeoutMs: 1_000,
            onProgress: vi.fn(),
        });

        worker.emitError('tracking crashed');

        await expect(resultPromise).rejects.toThrow('tracking crashed');
    });
});
