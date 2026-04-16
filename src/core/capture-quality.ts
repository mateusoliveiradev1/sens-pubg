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
    targetColor: CrosshairColor
): boolean {
    if (targetColor === 'GREEN') {
        return g >= 200 && r <= 90 && b <= 90 && (g - Math.max(r, b)) >= 120;
    }

    return r >= 200 && g <= 90 && b <= 90 && (r - Math.max(g, b)) >= 120;
}

function isLooseTargetPixel(
    r: number,
    g: number,
    b: number,
    targetColor: CrosshairColor
): boolean {
    if (targetColor === 'GREEN') {
        return g >= 90 && g > (r * 1.25) && g > (b * 1.25);
    }

    return r >= 90 && r > (g * 1.25) && r > (b * 1.25);
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

function calculateBoundsArea(bounds: PixelBounds | null): number {
    if (!bounds) {
        return 0;
    }

    return (bounds.maxX - bounds.minX + 1) * (bounds.maxY - bounds.minY + 1);
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

export function deriveVideoQualityBlockingReasons(
    input: CreateVideoQualityReportInput
): readonly VideoQualityBlockingReason[] {
    const sharpness = normalizeScore(input.sharpness);
    const compressionBurden = normalizeScore(input.compressionBurden);
    const reticleContrast = normalizeScore(input.reticleContrast);
    const roiStability = normalizeScore(input.roiStability);
    const fpsStability = normalizeScore(input.fpsStability);
    const reasons: VideoQualityBlockingReason[] = [];

    if (sharpness < 40) {
        pushReason(reasons, 'low_sharpness');
    }

    if (compressionBurden > 60) {
        pushReason(reasons, 'high_compression_burden');
    }

    if (reticleContrast < 40) {
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
    let strongPixelCount = 0;
    let strongDominanceSum = 0;
    let strongBounds: PixelBounds | null = null;
    let looseBounds: PixelBounds | null = null;

    for (let y = 0; y < frame.height; y++) {
        for (let x = 0; x < frame.width; x++) {
            const index = ((y * frame.width) + x) * 4;
            const r = frame.data[index] ?? 0;
            const g = frame.data[index + 1] ?? 0;
            const b = frame.data[index + 2] ?? 0;
            const isStrong = isStrongTargetPixel(r, g, b, targetColor);
            const isLoose = isStrong || isLooseTargetPixel(r, g, b, targetColor);

            if (!isLoose) {
                continue;
            }

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

    const looseArea = Math.max(calculateBoundsArea(looseBounds), 1);
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
    const sharpness = Math.sqrt(strongPixelCount / looseArea) * 100;
    const compressionBurden = (1 - (strongPixelCount / looseArea)) * 100;
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
        usableForAnalysis: blockingReasons.length === 0 && overallScore >= 60,
        blockingReasons,
    };
}
