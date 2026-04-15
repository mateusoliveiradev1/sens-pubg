/**
 * aimAnalyzer.worker.ts
 * Thin worker wrapper around the shared aim analyzer session.
 */

import {
    createAimAnalyzerSession,
    type WorkerSessionProcessFrameInput,
    type WorkerSessionStartInput,
} from './aim-analyzer-session';

const session = createAimAnalyzerSession();

self.onmessage = (event: MessageEvent<{ type: string; payload?: unknown }>) => {
    const { type, payload } = event.data;

    switch (type) {
        case 'START_ANALYSIS':
            session.start(payload as WorkerSessionStartInput | undefined);
            break;

        case 'PROCESS_FRAME':
            self.postMessage({
                type: 'PROGRESS',
                payload: session.processFrame(payload as WorkerSessionProcessFrameInput),
            });
            break;

        case 'FINISH_ANALYSIS':
            self.postMessage({
                type: 'RESULT',
                payload: session.finish(),
            });
            break;

        default:
            break;
    }
};
