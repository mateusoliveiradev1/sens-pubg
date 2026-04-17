import type { ExtractedFrame } from '@/core';
import type { WorkerAnalysisContext } from '../../workers/aim-analyzer-session';
import type { WorkerTrackingResult } from './tracking-result-mapper';

type WorkerMessageType = 'PROGRESS' | 'RESULT';

interface WorkerMessage<TPayload = unknown> {
    readonly type: string;
    readonly payload?: TPayload;
}

export interface RunWorkerTrackingAnalysisInput {
    readonly worker: Worker;
    readonly frames: readonly ExtractedFrame[];
    readonly context: WorkerAnalysisContext;
    readonly startX: number;
    readonly startY: number;
    readonly progressStart?: number;
    readonly progressEnd?: number;
    readonly timeoutMs?: number;
    readonly onProgress?: (progress: number) => void;
}

const DEFAULT_WORKER_TIMEOUT_MS = 30_000;

function createWorkerError(event: Event): Error {
    if ('message' in event && typeof event.message === 'string' && event.message.length > 0) {
        return new Error(event.message);
    }

    return new Error('O worker de tracking parou de responder.');
}

function waitForWorkerMessage<TPayload>(
    worker: Worker,
    expectedType: WorkerMessageType,
    timeoutMs: number
): Promise<TPayload> {
    return new Promise((resolve, reject) => {
        const timeoutId = globalThis.setTimeout(() => {
            cleanup();
            reject(new Error(`Timeout aguardando ${expectedType} do worker de tracking.`));
        }, timeoutMs);

        const cleanup = (): void => {
            globalThis.clearTimeout(timeoutId);
            worker.removeEventListener('message', handleMessage);
            worker.removeEventListener('error', handleError);
            worker.removeEventListener('messageerror', handleError);
        };

        const handleMessage = (event: MessageEvent<WorkerMessage<TPayload>>): void => {
            if (event.data.type !== expectedType) {
                return;
            }

            cleanup();
            resolve(event.data.payload as TPayload);
        };

        const handleError = (event: Event): void => {
            cleanup();
            reject(createWorkerError(event));
        };

        worker.addEventListener('message', handleMessage);
        worker.addEventListener('error', handleError);
        worker.addEventListener('messageerror', handleError);
    });
}

function calculateFrameProgress(
    processedFrames: number,
    totalFrames: number,
    progressStart: number,
    progressEnd: number
): number {
    if (totalFrames <= 0) {
        return progressEnd;
    }

    const progressRatio = Math.max(0, Math.min(1, processedFrames / totalFrames));
    return progressStart + ((progressEnd - progressStart) * progressRatio);
}

export async function runWorkerTrackingAnalysis(
    input: RunWorkerTrackingAnalysisInput
): Promise<WorkerTrackingResult> {
    const {
        worker,
        frames,
        context,
        startX,
        startY,
        onProgress,
        progressStart = 50,
        progressEnd = 85,
        timeoutMs = DEFAULT_WORKER_TIMEOUT_MS,
    } = input;

    worker.postMessage({
        type: 'START_ANALYSIS',
        payload: {
            startX,
            startY,
        },
    });

    for (const frame of frames) {
        const progressPromise = waitForWorkerMessage<{
            readonly framesProcessed?: number;
        }>(worker, 'PROGRESS', timeoutMs);

        worker.postMessage(
            {
                type: 'PROCESS_FRAME',
                payload: {
                    imageData: frame.imageData,
                    timestamp: frame.timestamp,
                    context,
                },
            },
            [frame.imageData.data.buffer]
        );

        const progress = await progressPromise;
        onProgress?.(calculateFrameProgress(
            progress.framesProcessed ?? frame.index + 1,
            frames.length,
            progressStart,
            progressEnd
        ));
    }

    onProgress?.(progressEnd);

    const resultPromise = waitForWorkerMessage<WorkerTrackingResult>(worker, 'RESULT', timeoutMs);
    worker.postMessage({ type: 'FINISH_ANALYSIS' });

    return resultPromise;
}
