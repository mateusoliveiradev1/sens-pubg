import { createStreamingCrosshairTracker, type CrosshairColor } from '../core/crosshair-tracking';
import { detectOpticState } from '../core/optic-state-detection';
import type {
    ReticleExogenousDisturbance,
    ReticleObservation,
    TrackingFrameStatus,
    TrackingStatusCounts,
} from '../types/engine';

export type WorkerWeaponProfile = {
    readonly id: string;
    readonly name: string;
    readonly category: string;
    readonly baseVerticalRecoil: number;
    readonly baseHorizontalRng: number;
    readonly fireRateMs: number;
    readonly multipliers: Record<string, unknown>;
};

export type WorkerTrackingPoint = {
    readonly frame: number;
    readonly timestamp: number;
    readonly x: number;
    readonly y: number;
    readonly confidence: number;
};

export type WorkerTrackingFrameObservation = ReticleObservation<number, number>;

export type WorkerAnalysisContext = {
    readonly fov: number;
    readonly resolutionY: number;
    readonly weapon: WorkerWeaponProfile;
    readonly multipliers: {
        readonly vertical: number;
        readonly horizontal: number;
    };
    readonly vsm: number;
    readonly crosshairColor?: CrosshairColor;
    readonly opticState?: string;
    readonly opticStateConfidence?: number;
};

export type WorkerAnalysisProgress = {
    readonly frameCount: number;
    readonly framesProcessed: number;
    readonly framesLost: number;
    readonly visibleFrames: number;
    readonly statusCounts: TrackingStatusCounts;
    readonly trackingQuality: number;
};

export type WorkerAnalysisResult = {
    readonly score: number;
    readonly metrics: {
        readonly jitter: number;
        readonly drift: number;
        readonly vError: number;
    };
    readonly points: readonly WorkerTrackingPoint[];
    readonly trackingQuality: number;
    readonly framesTracked: number;
    readonly framesLost: number;
    readonly visibleFrames: number;
    readonly framesProcessed: number;
    readonly statusCounts: TrackingStatusCounts;
    readonly trackingFrames: readonly WorkerTrackingFrameObservation[];
    readonly suggestion: string;
};

export type WorkerSessionStartInput = {
    readonly startX?: number;
    readonly startY?: number;
};

export type WorkerSessionProcessFrameInput = {
    readonly imageData: ImageData;
    readonly timestamp: number;
    readonly context: WorkerAnalysisContext;
};

type MutableStatusCounts = Record<TrackingFrameStatus, number>;

type SessionState = {
    previousCrosshairX: number | null;
    previousCrosshairY: number | null;
    streamingTracker: ReturnType<typeof createStreamingCrosshairTracker>;
    totalJitter: number;
    totalDrift: number;
    totalVerticalError: number;
    frameCount: number;
    framesProcessed: number;
    framesLost: number;
    visibleFrames: number;
    statusCounts: MutableStatusCounts;
    trackedPoints: WorkerTrackingPoint[];
    trackingFrames: WorkerTrackingFrameObservation[];
};

function createStatusCounts(): MutableStatusCounts {
    return {
        tracked: 0,
        occluded: 0,
        lost: 0,
        uncertain: 0,
    };
}

function cloneStatusCounts(statusCounts: MutableStatusCounts): TrackingStatusCounts {
    return {
        tracked: statusCounts.tracked,
        occluded: statusCounts.occluded,
        lost: statusCounts.lost,
        uncertain: statusCounts.uncertain,
    };
}

function createTrackingFrameObservation(observation: {
    readonly frame: number;
    readonly timestamp: number;
    readonly status: TrackingFrameStatus;
    readonly confidence: number;
    readonly visiblePixels: number;
    readonly reacquisitionFrames?: number | undefined;
    readonly colorState: WorkerTrackingFrameObservation['colorState'];
    readonly exogenousDisturbance: ReticleExogenousDisturbance;
    readonly opticState?: string | undefined;
    readonly opticStateConfidence?: number | undefined;
    readonly x?: number | undefined;
    readonly y?: number | undefined;
}): WorkerTrackingFrameObservation {
    const base = {
        frame: observation.frame,
        timestamp: observation.timestamp,
        status: observation.status,
        confidence: observation.confidence,
        visiblePixels: observation.visiblePixels,
        ...(observation.reacquisitionFrames !== undefined
            ? { reacquisitionFrames: observation.reacquisitionFrames }
            : {}),
        colorState: observation.colorState,
        exogenousDisturbance: observation.exogenousDisturbance,
        ...(observation.opticState !== undefined ? { opticState: observation.opticState } : {}),
        ...(observation.opticStateConfidence !== undefined
            ? { opticStateConfidence: observation.opticStateConfidence }
            : {}),
    };

    if (observation.x === undefined || observation.y === undefined) {
        return base;
    }

    return {
        ...base,
        x: observation.x,
        y: observation.y,
    };
}

function createInitialState(): SessionState {
    return {
        previousCrosshairX: null,
        previousCrosshairY: null,
        streamingTracker: createStreamingCrosshairTracker({
            normalizeBeforeTracking: true,
            globalMotionCompensation: true,
            globalMotionSearchRadiusPx: 6,
            globalMotionSampleStepPx: 16,
        }),
        totalJitter: 0,
        totalDrift: 0,
        totalVerticalError: 0,
        frameCount: 0,
        framesProcessed: 0,
        framesLost: 0,
        visibleFrames: 0,
        statusCounts: createStatusCounts(),
        trackedPoints: [],
        trackingFrames: [],
    };
}

function calculateTrackingQuality(statusCounts: MutableStatusCounts, framesProcessed: number): number {
    if (framesProcessed === 0) {
        return 0;
    }

    return (statusCounts.tracked + (statusCounts.uncertain * 0.5)) / framesProcessed;
}

function calculateSprayScore(jitter: number, drift: number, vError: number, frames: number): number {
    if (frames === 0) {
        return 0;
    }

    const avgJitter = jitter / frames;
    const avgVError = Math.abs(vError) / frames;
    const penalty = (avgJitter * 150) + (avgVError * 100) + (drift * 0);

    return Math.max(0, Math.min(100, 100 - penalty));
}

function generateSuggestion(score: number, vError: number): string {
    if (score > 90) {
        return 'Perfeito! Seu controle de recoil esta impecavel.';
    }

    if (vError > 0) {
        return 'Voce esta puxando demais para baixo. Tente diminuir o Multiplicador Vertical.';
    }

    if (vError < -5) {
        return 'Voce nao esta compensando o suficiente. Aumente seu Multiplicador Vertical ou Sensibilidade Geral.';
    }

    return 'Tente focar em reduzir o tremor horizontal durante o spray.';
}

function buildProgress(state: SessionState): WorkerAnalysisProgress {
    return {
        frameCount: state.frameCount,
        framesProcessed: state.framesProcessed,
        framesLost: state.framesLost,
        visibleFrames: state.visibleFrames,
        statusCounts: cloneStatusCounts(state.statusCounts),
        trackingQuality: calculateTrackingQuality(state.statusCounts, state.framesProcessed),
    };
}

function recordFrameStatus(state: SessionState, observation: WorkerTrackingFrameObservation): void {
    state.statusCounts[observation.status]++;
    state.trackingFrames.push(observation);
}

export function createAimAnalyzerSession() {
    let state = createInitialState();

    return {
        start(seed?: WorkerSessionStartInput): void {
            state = createInitialState();
            state.previousCrosshairX = seed?.startX ?? null;
            state.previousCrosshairY = seed?.startY ?? null;

            const trackerSeed = {
                ...(seed?.startX !== undefined ? { x: seed.startX } : {}),
                ...(seed?.startY !== undefined ? { y: seed.startY } : {}),
            };

            state.streamingTracker.reset(
                Object.keys(trackerSeed).length > 0 ? trackerSeed : undefined
            );
        },

        processFrame(input: WorkerSessionProcessFrameInput): WorkerAnalysisProgress {
            const { imageData, timestamp, context } = input;

            state.framesProcessed++;
            const trackingOptions = context.crosshairColor !== undefined
                ? { targetColor: context.crosshairColor }
                : undefined;
            const opticStateDetection = detectOpticState(imageData, {
                ...(context.opticState !== undefined ? { opticStateHint: context.opticState } : {}),
                ...(context.opticStateConfidence !== undefined
                    ? { opticStateConfidenceHint: context.opticStateConfidence }
                    : {}),
            });

            const crosshairObservation = state.streamingTracker.track(imageData, trackingOptions);

            recordFrameStatus(state, createTrackingFrameObservation({
                frame: state.framesProcessed - 1,
                timestamp,
                status: crosshairObservation.status,
                confidence: crosshairObservation.confidence,
                visiblePixels: crosshairObservation.visiblePixels,
                reacquisitionFrames: crosshairObservation.reacquisitionFrames,
                colorState: crosshairObservation.colorState,
                exogenousDisturbance: crosshairObservation.exogenousDisturbance,
                opticState: opticStateDetection.opticState,
                opticStateConfidence: opticStateDetection.opticStateConfidence,
                x: crosshairObservation.x,
                y: crosshairObservation.y,
            }));

            if (crosshairObservation.x === undefined || crosshairObservation.y === undefined) {
                state.framesLost++;
                return buildProgress(state);
            }

            state.visibleFrames++;

            const currentX = crosshairObservation.x;
            const currentY = crosshairObservation.y;
            const confidence = crosshairObservation.confidence;

            if (state.previousCrosshairX === null || state.previousCrosshairY === null) {
                state.previousCrosshairX = currentX;
                state.previousCrosshairY = currentY;
                return buildProgress(state);
            }

            const deltaX = currentX - state.previousCrosshairX;
            const deltaY = currentY - state.previousCrosshairY;
            const allowedHorizontalDelta = context.weapon.baseHorizontalRng * context.multipliers.horizontal;

            if (Math.abs(deltaX) > allowedHorizontalDelta) {
                state.totalJitter += Math.abs(deltaX) - allowedHorizontalDelta;
            }

            state.totalVerticalError += deltaY;
            state.previousCrosshairX = currentX;
            state.previousCrosshairY = currentY;

            state.trackedPoints.push({
                frame: state.framesProcessed - 1,
                timestamp,
                x: currentX,
                y: currentY,
                confidence,
            });

            state.frameCount++;

            return buildProgress(state);
        },

        finish(): WorkerAnalysisResult {
            const trackingQuality = calculateTrackingQuality(state.statusCounts, state.framesProcessed);
            const score = calculateSprayScore(
                state.totalJitter,
                state.totalDrift,
                state.totalVerticalError,
                state.frameCount
            );

            return {
                score,
                metrics: {
                    jitter: state.totalJitter,
                    drift: state.totalDrift,
                    vError: state.totalVerticalError,
                },
                points: [...state.trackedPoints],
                trackingQuality,
                framesTracked: state.visibleFrames,
                framesLost: state.framesLost,
                visibleFrames: state.visibleFrames,
                framesProcessed: state.framesProcessed,
                statusCounts: cloneStatusCounts(state.statusCounts),
                trackingFrames: [...state.trackingFrames],
                suggestion: generateSuggestion(score, state.totalVerticalError),
            };
        },
    };
}
