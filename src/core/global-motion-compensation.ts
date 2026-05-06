export type GlobalMotionTransitionKind = 'stable' | 'camera_motion' | 'hard_cut';

export interface GlobalMotionEstimate {
    readonly dx: number;
    readonly dy: number;
    readonly confidence: number;
    readonly meanAbsoluteError: number;
    readonly magnitudePx: number;
    readonly transitionKind: GlobalMotionTransitionKind;
    readonly reliability: number;
}

export interface EstimateGlobalMotionOptions {
    readonly searchRadiusPx?: number;
    readonly sampleStepPx?: number;
}

const DEFAULT_SEARCH_RADIUS_PX = 6;
const DEFAULT_SAMPLE_STEP_PX = 2;
const STABLE_MOTION_THRESHOLD_PX = 2;
const CAMERA_MOTION_MAX_PX = 24;
const LOW_CONFIDENCE_THRESHOLD = 0.2;
const CAMERA_MOTION_CONFIDENCE_THRESHOLD = 0.35;
const HARD_CUT_MAE_THRESHOLD = 72;

function clampUnit(value: number): number {
    return Math.max(0, Math.min(1, value));
}

function getPixelLuma(data: Uint8ClampedArray, width: number, x: number, y: number): number {
    const index = ((y * width) + x) * 4;
    const r = data[index] ?? 0;
    const g = data[index + 1] ?? 0;
    const b = data[index + 2] ?? 0;

    return (0.299 * r) + (0.587 * g) + (0.114 * b);
}

function calculateMeanAbsoluteError(
    previousFrame: ImageData,
    currentFrame: ImageData,
    dx: number,
    dy: number,
    sampleStepPx: number
): number {
    const startX = Math.max(0, -dx);
    const endX = Math.min(previousFrame.width, currentFrame.width - dx);
    const startY = Math.max(0, -dy);
    const endY = Math.min(previousFrame.height, currentFrame.height - dy);

    if (startX >= endX || startY >= endY) {
        return Number.POSITIVE_INFINITY;
    }

    let totalAbsoluteError = 0;
    let sampleCount = 0;

    for (let y = startY; y < endY; y += sampleStepPx) {
        for (let x = startX; x < endX; x += sampleStepPx) {
            const previousLuma = getPixelLuma(previousFrame.data, previousFrame.width, x, y);
            const currentLuma = getPixelLuma(currentFrame.data, currentFrame.width, x + dx, y + dy);

            totalAbsoluteError += Math.abs(previousLuma - currentLuma);
            sampleCount++;
        }
    }

    if (sampleCount === 0) {
        return Number.POSITIVE_INFINITY;
    }

    return totalAbsoluteError / sampleCount;
}

function classifyEstimate(
    dx: number,
    dy: number,
    confidence: number,
    meanAbsoluteError: number
): Pick<GlobalMotionEstimate, 'magnitudePx' | 'transitionKind' | 'reliability'> {
    const magnitudePx = Math.hypot(dx, dy);
    const errorReliability = Number.isFinite(meanAbsoluteError)
        ? clampUnit(1 - (meanAbsoluteError / 255))
        : 0;
    const reliability = clampUnit((confidence * 0.7) + (errorReliability * 0.3));

    if (
        meanAbsoluteError > HARD_CUT_MAE_THRESHOLD ||
        (magnitudePx > CAMERA_MOTION_MAX_PX && confidence < CAMERA_MOTION_CONFIDENCE_THRESHOLD)
    ) {
        return {
            magnitudePx,
            transitionKind: 'hard_cut',
            reliability,
        };
    }

    if (magnitudePx < STABLE_MOTION_THRESHOLD_PX || confidence < LOW_CONFIDENCE_THRESHOLD) {
        return {
            magnitudePx,
            transitionKind: 'stable',
            reliability,
        };
    }

    if (
        magnitudePx <= CAMERA_MOTION_MAX_PX &&
        confidence >= CAMERA_MOTION_CONFIDENCE_THRESHOLD
    ) {
        return {
            magnitudePx,
            transitionKind: 'camera_motion',
            reliability,
        };
    }

    return {
        magnitudePx,
        transitionKind: 'stable',
        reliability,
    };
}

export function estimateGlobalMotion(
    previousFrame: ImageData,
    currentFrame: ImageData,
    options: EstimateGlobalMotionOptions = {}
): GlobalMotionEstimate {
    if (
        previousFrame.width !== currentFrame.width ||
        previousFrame.height !== currentFrame.height
    ) {
        return {
            dx: 0,
            dy: 0,
            confidence: 0,
            meanAbsoluteError: Number.POSITIVE_INFINITY,
            magnitudePx: 0,
            transitionKind: 'hard_cut',
            reliability: 0,
        };
    }

    const searchRadiusPx = Math.max(0, options.searchRadiusPx ?? DEFAULT_SEARCH_RADIUS_PX);
    const sampleStepPx = Math.max(1, options.sampleStepPx ?? DEFAULT_SAMPLE_STEP_PX);
    let bestDx = 0;
    let bestDy = 0;
    let bestError = Number.POSITIVE_INFINITY;
    let secondBestError = Number.POSITIVE_INFINITY;

    for (let dy = -searchRadiusPx; dy <= searchRadiusPx; dy++) {
        for (let dx = -searchRadiusPx; dx <= searchRadiusPx; dx++) {
            const meanAbsoluteError = calculateMeanAbsoluteError(
                previousFrame,
                currentFrame,
                dx,
                dy,
                sampleStepPx
            );

            if (meanAbsoluteError < bestError) {
                secondBestError = bestError;
                bestError = meanAbsoluteError;
                bestDx = dx;
                bestDy = dy;
                continue;
            }

            if (meanAbsoluteError < secondBestError) {
                secondBestError = meanAbsoluteError;
            }
        }
    }

    const normalizedBestError = Number.isFinite(bestError)
        ? clampUnit(1 - (bestError / 255))
        : 0;
    const relativeGap = Number.isFinite(secondBestError) && secondBestError > 0
        ? clampUnit((secondBestError - bestError) / secondBestError)
        : 0;
    const confidence = clampUnit((normalizedBestError * 0.6) + (relativeGap * 0.4));

    const classification = classifyEstimate(bestDx, bestDy, confidence, bestError);

    return {
        dx: bestDx,
        dy: bestDy,
        confidence,
        meanAbsoluteError: bestError,
        ...classification,
    };
}

export function classifyGlobalMotionTransition(
    previousFrame: ImageData,
    currentFrame: ImageData,
    options: EstimateGlobalMotionOptions = {}
): GlobalMotionEstimate {
    return estimateGlobalMotion(previousFrame, currentFrame, options);
}
