/**
 * Crosshair Tracking — Rastreamento de mira frame-a-frame.
 * Color filtering (HSV) + centroid detection.
 * GPU accelerated via processing multiple frames.
 */

import { asPixels, asMilliseconds } from '../types/branded';
import type {
    TrackingFrameObservation,
    TrackingFrameStatus,
    TrackingPoint,
    TrackingQualitySummary,
    TrackingStatusCounts,
} from '../types/engine';
import type { ExtractedFrame } from './frame-extraction';
import { createCenteredRoi, normalizeTrackingRoi, type TrackingRoi } from './roi-stabilization';

// ═══════════════════════════════════════════
// Configuration
// ═══════════════════════════════════════════

export interface TemplateMatchingConfig {
    /** Tamanho do template central em Frame 0 (pixel width/height). Pre-defined to 64x64. */
    readonly templateSize: number;
    /** O quão longe do local anterior procuramos o novo match (px) */
    readonly searchRadius: number;
}

const DEFAULT_CONFIG: TemplateMatchingConfig = {
    templateSize: 64,   // 64x64 center extraction
    searchRadius: 100,  // Procura até 100px pra cima/baixo/lados do ponto antigo
} as const;
const DEFAULT_ROI_RADIUS_PX = 96;
const MIN_VISIBLE_PIXELS = 5;
const MIN_TEMPLATE_FALLBACK_CONFIDENCE = 0.3;

export type CrosshairColor = 'RED' | 'GREEN';

export interface CrosshairCentroidDetection {
    readonly currentX: number;
    readonly currentY: number;
    readonly confidence: number;
    readonly visiblePixels: number;
}

export interface StreamingCrosshairObservation {
    readonly x?: number;
    readonly y?: number;
    readonly confidence: number;
    readonly visiblePixels: number;
    readonly status: TrackingFrameStatus;
}

export interface StreamingCrosshairTrackerConfig extends Partial<TemplateMatchingConfig> {
    readonly roiRadiusPx?: number;
}

export interface StreamingCrosshairTracker {
    track(
        imageData: ImageData,
        options?: {
            readonly targetColor?: CrosshairColor;
        }
    ): StreamingCrosshairObservation;
    reset(seed?: {
        readonly x?: number;
        readonly y?: number;
    }): void;
    getLastKnownPosition(): {
        readonly x: number;
        readonly y: number;
    } | null;
}

function detectCentroidWithPredicate(
    imageData: ImageData,
    roi: TrackingRoi | undefined,
    predicate: (r: number, g: number, b: number) => boolean,
    minimumVisiblePixels: number = MIN_VISIBLE_PIXELS
): CrosshairCentroidDetection | null {
    const data = imageData.data;
    const width = imageData.width;
    const height = imageData.height;
    const bounds = normalizeTrackingRoi(roi, width, height);

    let totalX = 0;
    let totalY = 0;
    let matchCount = 0;

    for (let y = bounds.y; y < bounds.y + bounds.height; y++) {
        for (let x = bounds.x; x < bounds.x + bounds.width; x++) {
            const i = ((y * width) + x) * 4;
            const r = data[i]!;
            const g = data[i + 1]!;
            const b = data[i + 2]!;

            if (!predicate(r, g, b)) {
                continue;
            }

            totalX += x;
            totalY += y;
            matchCount++;
        }
    }

    if (matchCount < minimumVisiblePixels) {
        return null;
    }

    return {
        currentX: totalX / matchCount,
        currentY: totalY / matchCount,
        confidence: Math.min(1, matchCount / 25),
        visiblePixels: matchCount,
    };
}

/**
 * Detects a PUBG red/green crosshair by color threshold and returns its centroid.
 * Confidence is measured from the amount of visible reticle pixels, not assumed.
 */
export function detectCrosshairCentroid(
    imageData: ImageData,
    targetColor: CrosshairColor = 'RED',
    roi?: TrackingRoi
): CrosshairCentroidDetection | null {
    return detectCentroidWithPredicate(imageData, roi, (r, g, b) => {
        const isRedMatch = targetColor === 'RED' && r > 200 && g < 80 && b < 80;
        const isGreenMatch = targetColor === 'GREEN' && g > 200 && r < 100 && b < 100;

        return isRedMatch || isGreenMatch;
    });
}

function detectNeutralCrosshairCentroid(
    imageData: ImageData,
    roi?: TrackingRoi
): CrosshairCentroidDetection | null {
    return detectCentroidWithPredicate(imageData, roi, (r, g, b) => {
        const brightness = (r + g + b) / 3;
        const chroma = Math.max(r, g, b) - Math.min(r, g, b);

        return brightness >= 210 && chroma <= 45;
    }, 4);
}

// ═══════════════════════════════════════════
// Template Matching (SAD)
// ═══════════════════════════════════════════

interface DetectionResult {
    readonly found: boolean;
    readonly x: number;
    readonly y: number;
    readonly confidence: number;
}

/**
 * Calcula a Soma das Diferenças Absolutas (SAD) entre duas regiões.
 * Quanto menor o score, mais perfeito é o match.
 */
function calculateSAD(
    template: Uint8ClampedArray,
    templateW: number,
    templateH: number,
    searchData: Uint8ClampedArray,
    searchW: number,
    startX: number,
    startY: number
): number {
    let sad = 0;
    // Iterating per pixel (4 channels: RGBA)
    for (let y = 0; y < templateH; y++) {
        for (let x = 0; x < templateW; x++) {
            const tIdx = (y * templateW + x) * 4;
            const sIdx = ((startY + y) * searchW + (startX + x)) * 4;

            // Only compare RGB (ignore A)
            sad += Math.abs((template[tIdx] ?? 0) - (searchData[sIdx] ?? 0));
            sad += Math.abs((template[tIdx + 1] ?? 0) - (searchData[sIdx + 1] ?? 0));
            sad += Math.abs((template[tIdx + 2] ?? 0) - (searchData[sIdx + 2] ?? 0));
        }
    }
    return sad;
}

/**
 * Encontra um Template 64x64 dentro de uma área de busca (frame atual).
 */
function matchTemplate(
    templateData: Uint8ClampedArray,
    templateSize: number,
    frameData: ImageData,
    lastX: number,
    lastY: number,
    searchRadius: number
): DetectionResult {
    const { width: fw, height: fh, data: fdata } = frameData;

    // Define ROI (Bounding Box of the search)
    // We search around the PREVIOUS known position 'lastX', 'lastY'
    const startSearchX = Math.max(0, Math.floor(lastX - searchRadius));
    const startSearchY = Math.max(0, Math.floor(lastY - searchRadius));
    const endSearchX = Math.min(fw - templateSize, Math.floor(lastX + searchRadius));
    const endSearchY = Math.min(fh - templateSize, Math.floor(lastY + searchRadius));

    let bestSad = Infinity;
    let bestX = lastX;
    let bestY = lastY;

    // Slide the template over the search area
    // Optimizer: Instead of checking every single pixel (slow), we can check every 2nd or 3rd pixel for speed,
    // but SAD is fairly fast for a ~200x200 area on modern engines. We'll do strict per-2-pixel sliding for web performance.
    for (let y = startSearchY; y <= endSearchY; y += 2) {
        for (let x = startSearchX; x <= endSearchX; x += 2) {
            const sad = calculateSAD(templateData, templateSize, templateSize, fdata, fw, x, y);

            if (sad < bestSad) {
                bestSad = sad;
                bestX = x + (templateSize / 2); // Center of the matched template
                bestY = y + (templateSize / 2);
            }
        }
    }

    // Determine confidence based on SAD score (Perfect match = 0).
    const maxPossibleSAD = templateSize * templateSize * 3 * 255;
    const confidence = 1 - (bestSad / maxPossibleSAD);

    return {
        found: true,
        x: bestX,
        y: bestY,
        confidence: confidence > 0.85 ? confidence : Math.max(0, (confidence - 0.5) * 2), // Boost the penalty on bad matches
    };
}

// ═══════════════════════════════════════════
function clampTemplateSize(imageData: ImageData, templateSize: number): number {
    const maxSquare = Math.min(imageData.width, imageData.height);
    if (maxSquare <= 0) {
        return 0;
    }

    return Math.max(1, Math.min(templateSize, maxSquare));
}

function extractTemplate(
    imageData: ImageData,
    centerX: number,
    centerY: number,
    templateSize: number
): Uint8ClampedArray | null {
    const size = clampTemplateSize(imageData, templateSize);
    if (size <= 0) {
        return null;
    }

    const halfSize = Math.floor(size / 2);
    const startX = Math.max(0, Math.min(imageData.width - size, Math.round(centerX) - halfSize));
    const startY = Math.max(0, Math.min(imageData.height - size, Math.round(centerY) - halfSize));
    const templateData = new Uint8ClampedArray(size * size * 4);

    for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
            const frameIndex = ((startY + y) * imageData.width + (startX + x)) * 4;
            const templateIndex = (y * size + x) * 4;
            templateData[templateIndex] = imageData.data[frameIndex] ?? 0;
            templateData[templateIndex + 1] = imageData.data[frameIndex + 1] ?? 0;
            templateData[templateIndex + 2] = imageData.data[frameIndex + 2] ?? 0;
            templateData[templateIndex + 3] = 255;
        }
    }

    return templateData;
}

function createLostObservation(hasPriorLock: boolean): StreamingCrosshairObservation {
    return {
        confidence: 0,
        visiblePixels: 0,
        status: hasPriorLock ? 'occluded' : 'lost',
    };
}

function createVisibleObservation(
    detection: CrosshairCentroidDetection,
    status: TrackingFrameStatus
): StreamingCrosshairObservation {
    return {
        x: detection.currentX,
        y: detection.currentY,
        confidence: detection.confidence,
        visiblePixels: detection.visiblePixels,
        status,
    };
}

export function createStreamingCrosshairTracker(
    config: StreamingCrosshairTrackerConfig = {}
): StreamingCrosshairTracker {
    const fullConfig = { ...DEFAULT_CONFIG, ...config };
    let lastKnownX: number | null = null;
    let lastKnownY: number | null = null;
    let templateData: Uint8ClampedArray | null = null;
    let templateSize = Math.max(1, fullConfig.templateSize);

    function refreshTemplate(imageData: ImageData, x: number, y: number): void {
        const extractedTemplate = extractTemplate(imageData, x, y, templateSize);
        if (!extractedTemplate) {
            return;
        }

        templateSize = clampTemplateSize(imageData, templateSize);
        templateData = extractedTemplate;
    }

    return {
        track(imageData, options = {}) {
            const roi = (lastKnownX !== null && lastKnownY !== null)
                ? createCenteredRoi(
                    lastKnownX,
                    lastKnownY,
                    imageData.width,
                    imageData.height,
                    fullConfig.roiRadiusPx ?? DEFAULT_ROI_RADIUS_PX
                )
                : undefined;
            const primaryDetection = detectCrosshairCentroid(imageData, options.targetColor ?? 'RED', roi);
            const neutralDetection = primaryDetection ? null : detectNeutralCrosshairCentroid(imageData, roi);
            const visibleDetection = primaryDetection ?? neutralDetection;

            if (visibleDetection) {
                lastKnownX = visibleDetection.currentX;
                lastKnownY = visibleDetection.currentY;
                refreshTemplate(imageData, visibleDetection.currentX, visibleDetection.currentY);

                return createVisibleObservation(visibleDetection, classifyConfidence(visibleDetection.confidence));
            }

            if (templateData && lastKnownX !== null && lastKnownY !== null) {
                const templateMatch = matchTemplate(
                    templateData,
                    templateSize,
                    imageData,
                    lastKnownX,
                    lastKnownY,
                    fullConfig.searchRadius
                );
                const fallbackConfidence = Math.min(0.69, templateMatch.confidence * 0.75);

                if (fallbackConfidence >= MIN_TEMPLATE_FALLBACK_CONFIDENCE) {
                    lastKnownX = templateMatch.x;
                    lastKnownY = templateMatch.y;

                    return {
                        x: templateMatch.x,
                        y: templateMatch.y,
                        confidence: fallbackConfidence,
                        visiblePixels: 0,
                        status: 'uncertain',
                    };
                }
            }

            return createLostObservation(lastKnownX !== null && lastKnownY !== null);
        },
        reset(seed) {
            lastKnownX = seed?.x ?? null;
            lastKnownY = seed?.y ?? null;
            templateData = null;
            templateSize = Math.max(1, fullConfig.templateSize);
        },
        getLastKnownPosition() {
            if (lastKnownX === null || lastKnownY === null) {
                return null;
            }

            return {
                x: lastKnownX,
                y: lastKnownY,
            };
        },
    };
}

// Track All Frames
// ═══════════════════════════════════════════

export interface TrackingResult extends TrackingQualitySummary {
    readonly points: readonly TrackingPoint[];
    readonly trackingFrames: readonly TrackingFrameObservation[];
}

function createStatusCounts(): Record<TrackingFrameStatus, number> {
    return {
        tracked: 0,
        occluded: 0,
        lost: 0,
        uncertain: 0,
    };
}

function toStatusCounts(counts: Record<TrackingFrameStatus, number>): TrackingStatusCounts {
    return {
        tracked: counts.tracked,
        occluded: counts.occluded,
        lost: counts.lost,
        uncertain: counts.uncertain,
    };
}

function classifyConfidence(confidence: number): TrackingFrameStatus {
    return confidence >= 0.7 ? 'tracked' : 'uncertain';
}

function calculateQuality(counts: Record<TrackingFrameStatus, number>, framesProcessed: number): number {
    if (framesProcessed === 0) return 0;
    return (counts.tracked + (counts.uncertain * 0.5)) / framesProcessed;
}

/**
 * Rastreia o crosshair em todos os frames extraídos.
 * Retorna TrackingPoints com posição, timestamp e confiança.
 */
export function trackCrosshair(
    frames: readonly ExtractedFrame[],
    config?: Partial<TemplateMatchingConfig>
): TrackingResult {
    const fullConfig = { ...DEFAULT_CONFIG, ...config };
    const points: TrackingPoint[] = [];
    const trackingFrames: TrackingFrameObservation[] = [];
    const statusCounts = createStatusCounts();
    let framesLost = 0;

    if (frames.length === 0) {
        return {
            points: [],
            trackingFrames: [],
            trackingQuality: 0,
            framesTracked: 0,
            framesLost: 0,
            visibleFrames: 0,
            framesProcessed: 0,
            statusCounts: toStatusCounts(statusCounts),
        };
    }

    const firstFrame = frames[0]!;
    const fw = firstFrame.imageData.width;
    const fh = firstFrame.imageData.height;

    // Center starting point
    let lastX = fw / 2;
    let lastY = fh / 2;

    // Extract the Template from Frame 0
    // To do this natively without Canvas ctx, we manually copy the ArrayBuffer slice
    const tSize = fullConfig.templateSize;
    const tStartX = Math.floor(lastX - (tSize / 2));
    const tStartY = Math.floor(lastY - (tSize / 2));

    const templateData = new Uint8ClampedArray(tSize * tSize * 4);
    for (let ty = 0; ty < tSize; ty++) {
        for (let tx = 0; tx < tSize; tx++) {
            const frameIdx = ((tStartY + ty) * fw + (tStartX + tx)) * 4;
            const tplIdx = (ty * tSize + tx) * 4;
            templateData[tplIdx] = firstFrame.imageData.data[frameIdx] ?? 0;
            templateData[tplIdx + 1] = firstFrame.imageData.data[frameIdx + 1] ?? 0;
            templateData[tplIdx + 2] = firstFrame.imageData.data[frameIdx + 2] ?? 0;
            templateData[tplIdx + 3] = 255;
        }
    }

    // Force frame 0 point exactly at center
    points.push({
        frame: firstFrame.index,
        timestamp: asMilliseconds(firstFrame.timestamp),
        x: asPixels(lastX),
        y: asPixels(lastY),
        confidence: 1.0,
    });
    statusCounts.tracked++;
    trackingFrames.push({
        frame: firstFrame.index,
        timestamp: asMilliseconds(firstFrame.timestamp),
        status: 'tracked',
        confidence: 1,
        visiblePixels: fullConfig.templateSize * fullConfig.templateSize,
        x: asPixels(lastX),
        y: asPixels(lastY),
    });

    for (let i = 1; i < frames.length; i++) {
        const frame = frames[i]!;

        // Match the background pattern
        const result = matchTemplate(templateData, tSize, frame.imageData, lastX, lastY, fullConfig.searchRadius);

        if (result.confidence > 0.4) {
            const status = classifyConfidence(result.confidence);
            statusCounts[status]++;
            points.push({
                frame: frame.index,
                timestamp: asMilliseconds(frame.timestamp),
                x: asPixels(result.x),
                y: asPixels(result.y),
                confidence: result.confidence,
            });
            trackingFrames.push({
                frame: frame.index,
                timestamp: asMilliseconds(frame.timestamp),
                status,
                confidence: result.confidence,
                visiblePixels: fullConfig.templateSize * fullConfig.templateSize,
                x: asPixels(result.x),
                y: asPixels(result.y),
            });
            lastX = result.x;
            lastY = result.y; // Clean tracking without artificial recoil bias
        } else {
            const status: TrackingFrameStatus = points.length > 0 ? 'occluded' : 'lost';
            statusCounts[status]++;
            framesLost++;
            trackingFrames.push({
                frame: frame.index,
                timestamp: asMilliseconds(frame.timestamp),
                status,
                confidence: result.confidence,
                visiblePixels: 0,
            });
            points.push({
                frame: frame.index,
                timestamp: asMilliseconds(frame.timestamp),
                x: asPixels(lastX),
                y: asPixels(lastY),
                confidence: result.confidence,
            });
        }
    }

    const tracked = statusCounts.tracked + statusCounts.uncertain;
    const quality = calculateQuality(statusCounts, frames.length);

    return {
        points,
        trackingFrames,
        trackingQuality: quality,
        framesTracked: tracked,
        framesLost,
        visibleFrames: tracked,
        framesProcessed: frames.length,
        statusCounts: toStatusCounts(statusCounts),
    };
}
