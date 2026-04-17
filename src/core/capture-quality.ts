import { asScore } from '../types/branded';
import type { VideoQualityBlockingReason, VideoQualityReport } from '../types/engine';
import type { CrosshairColor } from './crosshair-tracking';

export interface CreateVideoQualityReportInput {
    readonly sharpness: number;
    readonly compressionBurden: number;
    readonly reticleContrast: number;
    readonly roiStability: number;
    readonly fpsStability: number;
    readonly blockingReasons?: readonly VideoQualityBlockingReason[];
}

export interface AnalyzeCaptureQualityFramesOptions {
    readonly targetColor?: CrosshairColor;
    readonly roiStability?: number;
    readonly fpsStability?: number;
}

export interface CaptureQualityMetrics {
    readonly sharpness: number;
    readonly compressionBurden: number;
    readonly reticleContrast: number;
}

interface PixelBounds {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
}

interface StrongComponent {
    readonly strongPixelCount: number;
    readonly bounds: PixelBounds;
    readonly profile: TargetPixelProfile;
}

interface TargetPixelProfile {
    readonly primaryMin: number;
    readonly secondaryMax: number;
    readonly dominanceMin: number;
    readonly looseMin: number;
    readonly looseRatio: number;
}

const STRICT_TARGET_PIXEL_PROFILE: TargetPixelProfile = {
    primaryMin: 200,
    secondaryMax: 90,
    dominanceMin: 120,
    looseMin: 90,
    looseRatio: 1.25,
};

const RELAXED_TARGET_PIXEL_PROFILE: TargetPixelProfile = {
    primaryMin: 150,
    secondaryMax: 150,
    dominanceMin: 45,
    looseMin: 80,
    looseRatio: 1.08,
};

function normalizeScore(value: number): number {
    return Number(asScore(value));
}

function clampUnit(value: number): number {
    return Math.max(0, Math.min(1, value));
}

function pushReason(
    reasons: VideoQualityBlockingReason[],
    reason: VideoQualityBlockingReason
): void {
    if (!reasons.includes(reason)) {
        reasons.push(reason);
    }
}

function isStrongTargetPixel(
    r: number,
    g: number,
    b: number,
    targetColor: CrosshairColor,
    profile: TargetPixelProfile = STRICT_TARGET_PIXEL_PROFILE,
): boolean {
    if (targetColor === 'GREEN') {
        return g >= profile.primaryMin
            && r <= profile.secondaryMax
            && b <= profile.secondaryMax
            && (g - Math.max(r, b)) >= profile.dominanceMin;
    }

    return r >= profile.primaryMin
        && g <= profile.secondaryMax
        && b <= profile.secondaryMax
        && (r - Math.max(g, b)) >= profile.dominanceMin;
}

function isLooseTargetPixel(
    r: number,
    g: number,
    b: number,
    targetColor: CrosshairColor,
    profile: TargetPixelProfile = STRICT_TARGET_PIXEL_PROFILE,
): boolean {
    if (targetColor === 'GREEN') {
        return g >= profile.looseMin
            && g > (r * profile.looseRatio)
            && g > (b * profile.looseRatio);
    }

    return r >= profile.looseMin
        && r > (g * profile.looseRatio)
        && r > (b * profile.looseRatio);
}

function getTargetDominance(
    r: number,
    g: number,
    b: number,
    targetColor: CrosshairColor
): number {
    const rawDominance = targetColor === 'GREEN'
        ? (g - Math.max(r, b)) / 255
        : (r - Math.max(g, b)) / 255;

    return clampUnit(rawDominance);
}

function createBounds(x: number, y: number): PixelBounds {
    return { minX: x, maxX: x, minY: y, maxY: y };
}

function extendBounds(bounds: PixelBounds, x: number, y: number): void {
    bounds.minX = Math.min(bounds.minX, x);
    bounds.maxX = Math.max(bounds.maxX, x);
    bounds.minY = Math.min(bounds.minY, y);
    bounds.maxY = Math.max(bounds.maxY, y);
}

function expandBounds(
    bounds: PixelBounds,
    width: number,
    height: number,
    margin: number
): PixelBounds {
    return {
        minX: Math.max(0, bounds.minX - margin),
        maxX: Math.min(width - 1, bounds.maxX + margin),
        minY: Math.max(0, bounds.minY - margin),
        maxY: Math.min(height - 1, bounds.maxY + margin),
    };
}

function getCenterFocusBounds(width: number, height: number): PixelBounds {
    const halfSize = Math.max(48, Math.round(Math.min(width, height) * 0.18));
    const centerX = Math.floor(width / 2);
    const centerY = Math.floor(height / 2);

    return {
        minX: Math.max(0, centerX - halfSize),
        maxX: Math.min(width - 1, centerX + halfSize),
        minY: Math.max(0, centerY - halfSize),
        maxY: Math.min(height - 1, centerY + halfSize),
    };
}

function findFocusedStrongComponent(
    frame: ImageData,
    targetColor: CrosshairColor,
): StrongComponent | null {
    const focusBounds = getCenterFocusBounds(frame.width, frame.height);
    const focusWidth = focusBounds.maxX - focusBounds.minX + 1;
    const focusHeight = focusBounds.maxY - focusBounds.minY + 1;
    const centerX = Math.floor(frame.width / 2);
    const centerY = Math.floor(frame.height / 2);

    const detectWithProfile = (profile: TargetPixelProfile): StrongComponent | null => {
        const strongMask = new Uint8Array(focusWidth * focusHeight);

        for (let y = focusBounds.minY; y <= focusBounds.maxY; y++) {
            for (let x = focusBounds.minX; x <= focusBounds.maxX; x++) {
                const index = ((y * frame.width) + x) * 4;
                const r = frame.data[index] ?? 0;
                const g = frame.data[index + 1] ?? 0;
                const b = frame.data[index + 2] ?? 0;

                if (!isStrongTargetPixel(r, g, b, targetColor, profile)) {
                    continue;
                }

                const focusIndex = ((y - focusBounds.minY) * focusWidth) + (x - focusBounds.minX);
                strongMask[focusIndex] = 1;
            }
        }

        const visited = new Uint8Array(strongMask.length);
        const queueX = new Int32Array(strongMask.length);
        const queueY = new Int32Array(strongMask.length);

        let bestComponent: StrongComponent | null = null;
        let bestScore = Number.NEGATIVE_INFINITY;

        for (let localY = 0; localY < focusHeight; localY++) {
            for (let localX = 0; localX < focusWidth; localX++) {
                const startIndex = (localY * focusWidth) + localX;
                if (strongMask[startIndex] === 0 || visited[startIndex] === 1) {
                    continue;
                }

                visited[startIndex] = 1;
                queueX[0] = localX;
                queueY[0] = localY;

                let head = 0;
                let tail = 1;
                let strongPixelCount = 0;
                let sumX = 0;
                let sumY = 0;
                const bounds = createBounds(localX + focusBounds.minX, localY + focusBounds.minY);

                while (head < tail) {
                    const currentLocalX = queueX[head]!;
                    const currentLocalY = queueY[head]!;
                    head++;

                    const globalX = currentLocalX + focusBounds.minX;
                    const globalY = currentLocalY + focusBounds.minY;
                    strongPixelCount++;
                    sumX += globalX;
                    sumY += globalY;
                    extendBounds(bounds, globalX, globalY);

                    for (let offsetY = -1; offsetY <= 1; offsetY++) {
                        for (let offsetX = -1; offsetX <= 1; offsetX++) {
                            if (offsetX === 0 && offsetY === 0) {
                                continue;
                            }

                            const nextLocalX = currentLocalX + offsetX;
                            const nextLocalY = currentLocalY + offsetY;
                            if (
                                nextLocalX < 0
                                || nextLocalY < 0
                                || nextLocalX >= focusWidth
                                || nextLocalY >= focusHeight
                            ) {
                                continue;
                            }

                            const nextIndex = (nextLocalY * focusWidth) + nextLocalX;
                            if (strongMask[nextIndex] === 0 || visited[nextIndex] === 1) {
                                continue;
                            }

                            visited[nextIndex] = 1;
                            queueX[tail] = nextLocalX;
                            queueY[tail] = nextLocalY;
                            tail++;
                        }
                    }
                }

                const centroidX = sumX / strongPixelCount;
                const centroidY = sumY / strongPixelCount;
                const distanceToCenter = Math.hypot(centroidX - centerX, centroidY - centerY);
                const score = strongPixelCount - (distanceToCenter * 0.35);

                if (score > bestScore) {
                    bestScore = score;
                    bestComponent = {
                        strongPixelCount,
                        bounds,
                        profile,
                    };
                }
            }
        }

        return bestComponent;
    };

    const strictComponent = detectWithProfile(STRICT_TARGET_PIXEL_PROFILE);
    if (strictComponent && strictComponent.strongPixelCount >= 5) {
        return strictComponent;
    }

    return detectWithProfile(RELAXED_TARGET_PIXEL_PROFILE) ?? strictComponent;
}

export function deriveVideoQualityBlockingReasons(
    input: CreateVideoQualityReportInput
): readonly VideoQualityBlockingReason[] {
    const sharpness = normalizeScore(input.sharpness);
    const compressionBurden = normalizeScore(input.compressionBurden);
    const reticleContrast = normalizeScore(input.reticleContrast);
    const roiStability = normalizeScore(input.roiStability);
    const fpsStability = normalizeScore(input.fpsStability);
    const reasons: VideoQualityBlockingReason[] = [];

    if (sharpness < 25) {
        pushReason(reasons, 'low_sharpness');
    }

    if (compressionBurden > 90) {
        pushReason(reasons, 'high_compression_burden');
    }

    if (reticleContrast < 20) {
        pushReason(reasons, 'low_reticle_contrast');
    }

    if (roiStability < 50) {
        pushReason(reasons, 'unstable_roi');
    }

    if (fpsStability < 50) {
        pushReason(reasons, 'unstable_fps');
    }

    return reasons;
}

export function measureCaptureQualityFrame(
    frame: ImageData,
    targetColor: CrosshairColor = 'RED'
): CaptureQualityMetrics {
    const focusedComponent = findFocusedStrongComponent(frame, targetColor);
    if (!focusedComponent) {
        return {
            sharpness: 0,
            compressionBurden: 100,
            reticleContrast: 0,
        };
    }

    const measurementBounds = expandBounds(focusedComponent.bounds, frame.width, frame.height, 4);
    let strongPixelCount = 0;
    let loosePixelCount = 0;
    let strongDominanceSum = 0;
    let strongBounds: PixelBounds | null = null;
    let looseBounds: PixelBounds | null = null;

    for (let y = measurementBounds.minY; y <= measurementBounds.maxY; y++) {
        for (let x = measurementBounds.minX; x <= measurementBounds.maxX; x++) {
            const index = ((y * frame.width) + x) * 4;
            const r = frame.data[index] ?? 0;
            const g = frame.data[index + 1] ?? 0;
            const b = frame.data[index + 2] ?? 0;
            const isStrong = isStrongTargetPixel(r, g, b, targetColor, focusedComponent.profile);
            const isLoose = isStrong || isLooseTargetPixel(r, g, b, targetColor, focusedComponent.profile);

            if (!isLoose) {
                continue;
            }

            loosePixelCount++;

            if (!looseBounds) {
                looseBounds = createBounds(x, y);
            } else {
                extendBounds(looseBounds, x, y);
            }

            if (!isStrong) {
                continue;
            }

            if (!strongBounds) {
                strongBounds = createBounds(x, y);
            } else {
                extendBounds(strongBounds, x, y);
            }

            strongPixelCount++;
            strongDominanceSum += getTargetDominance(r, g, b, targetColor);
        }
    }

    if (!looseBounds || !strongBounds || strongPixelCount === 0) {
        return {
            sharpness: 0,
            compressionBurden: 100,
            reticleContrast: 0,
        };
    }

    const looseSignalCount = Math.max(loosePixelCount, 1);
    const strongAverageDominance = strongDominanceSum / strongPixelCount;
    const contrastBounds = expandBounds(strongBounds, frame.width, frame.height, 3);
    let surroundingDominanceSum = 0;
    let surroundingPixelCount = 0;

    for (let y = contrastBounds.minY; y <= contrastBounds.maxY; y++) {
        for (let x = contrastBounds.minX; x <= contrastBounds.maxX; x++) {
            if (
                x >= strongBounds.minX &&
                x <= strongBounds.maxX &&
                y >= strongBounds.minY &&
                y <= strongBounds.maxY
            ) {
                continue;
            }

            const index = ((y * frame.width) + x) * 4;
            const r = frame.data[index] ?? 0;
            const g = frame.data[index + 1] ?? 0;
            const b = frame.data[index + 2] ?? 0;
            surroundingDominanceSum += getTargetDominance(r, g, b, targetColor);
            surroundingPixelCount++;
        }
    }

    const surroundingAverageDominance = surroundingPixelCount > 0
        ? surroundingDominanceSum / surroundingPixelCount
        : 0;
    const sharpness = Math.sqrt(strongPixelCount / looseSignalCount) * 100;
    const compressionBurden = (1 - (strongPixelCount / looseSignalCount)) * 100;
    const reticleContrast = (strongAverageDominance - surroundingAverageDominance) * 100;

    return {
        sharpness: normalizeScore(sharpness),
        compressionBurden: normalizeScore(compressionBurden),
        reticleContrast: normalizeScore(reticleContrast),
    };
}

export function analyzeCaptureQualityFrames(
    frames: readonly ImageData[],
    options: AnalyzeCaptureQualityFramesOptions = {}
): VideoQualityReport {
    if (frames.length === 0) {
        return createVideoQualityReport({
            sharpness: 0,
            compressionBurden: 100,
            reticleContrast: 0,
            roiStability: options.roiStability ?? 0,
            fpsStability: options.fpsStability ?? 0,
        });
    }

    const metrics = frames.map((frame) => measureCaptureQualityFrame(frame, options.targetColor ?? 'RED'));
    const summarizeMetric = (selector: (metric: CaptureQualityMetrics) => number): number => (
        metrics.reduce((sum, metric) => sum + selector(metric), 0) / metrics.length
    );

    return createVideoQualityReport({
        sharpness: summarizeMetric((metric) => metric.sharpness),
        compressionBurden: summarizeMetric((metric) => metric.compressionBurden),
        reticleContrast: summarizeMetric((metric) => metric.reticleContrast),
        roiStability: options.roiStability ?? 100,
        fpsStability: options.fpsStability ?? 100,
    });
}

export function createVideoQualityReport(
    input: CreateVideoQualityReportInput
): VideoQualityReport {
    const sharpness = normalizeScore(input.sharpness);
    const compressionBurden = normalizeScore(input.compressionBurden);
    const reticleContrast = normalizeScore(input.reticleContrast);
    const roiStability = normalizeScore(input.roiStability);
    const fpsStability = normalizeScore(input.fpsStability);
    const blockingReasons: VideoQualityBlockingReason[] = [];

    for (const reason of input.blockingReasons ?? []) {
        pushReason(blockingReasons, reason);
    }

    for (const reason of deriveVideoQualityBlockingReasons(input)) {
        pushReason(blockingReasons, reason);
    }

    const overallScore = Math.round(
        (
            sharpness +
            reticleContrast +
            roiStability +
            fpsStability +
            (100 - compressionBurden)
        ) / 5
    );

    return {
        overallScore: asScore(overallScore),
        sharpness: asScore(sharpness),
        compressionBurden: asScore(compressionBurden),
        reticleContrast: asScore(reticleContrast),
        roiStability: asScore(roiStability),
        fpsStability: asScore(fpsStability),
        usableForAnalysis: blockingReasons.length === 0 && overallScore >= 55,
        blockingReasons,
    };
}
