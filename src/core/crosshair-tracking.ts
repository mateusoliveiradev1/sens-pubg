/**
 * Crosshair Tracking — Rastreamento de mira frame-a-frame.
 * Color filtering (HSV) + centroid detection.
 * GPU accelerated via processing multiple frames.
 */

import { asPixels, asMilliseconds } from '../types/branded';
import type {
    ReticleColorState,
    ReticleExogenousDisturbance,
    ReticleObservationShape,
    TrackingFrameObservation,
    TrackingFrameStatus,
    TrackingPoint,
    TrackingQualitySummary,
    TrackingStatusCounts,
} from '../types/engine';
import type { ExtractedFrame } from './frame-extraction';
import { classifyGlobalMotionTransition, type GlobalMotionEstimate } from './global-motion-compensation';
import { createCenteredRoi, normalizeTrackingRoi, type TrackingRoi } from './roi-stabilization';
import { normalizeTrackingFrame } from './video-normalization';

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

export type StreamingCrosshairObservation = ReticleObservationShape<number>;

export interface StreamingCrosshairTrackerConfig extends Partial<TemplateMatchingConfig> {
    readonly roiRadiusPx?: number;
    readonly normalizeBeforeTracking?: boolean;
    readonly globalMotionCompensation?: boolean;
    readonly globalMotionSearchRadiusPx?: number;
    readonly globalMotionSampleStepPx?: number;
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

interface VisibleReticleCandidate {
    readonly visibleReticle: {
        readonly detection: CrosshairCentroidDetection;
        readonly colorState: ReticleColorState;
    };
    readonly priority: number;
}

interface VisibleReticleDetection {
    readonly detection: CrosshairCentroidDetection;
    readonly colorState: ReticleColorState;
}

interface VisualHypothesis {
    readonly centerX?: number;
    readonly centerY?: number;
    readonly priority: number;
}

interface ExogenousDisturbanceContext {
    readonly status: TrackingFrameStatus;
    readonly visiblePixels: number;
    readonly confidence: number;
    readonly muzzleFlash: number;
    readonly shake: number;
    readonly cameraMotion?: number;
    readonly hardCut?: number;
    readonly flick?: number;
    readonly targetSwap?: number;
    readonly identityConfidence?: number;
}

interface DisturbanceAdjustedObservation {
    readonly confidence: number;
    readonly status: TrackingFrameStatus;
    readonly exogenousDisturbance: ReticleExogenousDisturbance;
}

function detectCentroidWithPredicate(
    imageData: ImageData,
    roi: TrackingRoi | undefined,
    matcher: (r: number, g: number, b: number) => number,
    minimumVisiblePixels: number = MIN_VISIBLE_PIXELS
): CrosshairCentroidDetection | null {
    const data = imageData.data;
    const width = imageData.width;
    const height = imageData.height;
    const bounds = normalizeTrackingRoi(roi, width, height);

    let totalX = 0;
    let totalY = 0;
    let totalWeight = 0;
    let matchCount = 0;

    for (let y = bounds.y; y < bounds.y + bounds.height; y++) {
        for (let x = bounds.x; x < bounds.x + bounds.width; x++) {
            const i = ((y * width) + x) * 4;
            const r = data[i]!;
            const g = data[i + 1]!;
            const b = data[i + 2]!;
            const weight = matcher(r, g, b);

            if (weight <= 0) {
                continue;
            }

            totalX += x * weight;
            totalY += y * weight;
            totalWeight += weight;
            matchCount++;
        }
    }

    if (matchCount < minimumVisiblePixels || totalWeight <= 0) {
        return null;
    }

    return {
        currentX: totalX / totalWeight,
        currentY: totalY / totalWeight,
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

        if (isRedMatch) {
            return Math.max(0, r - Math.max(g, b)) / 255;
        }

        if (isGreenMatch) {
            return Math.max(0, g - Math.max(r, b)) / 255;
        }

        return 0;
    });
}

function detectNeutralCrosshairCentroid(
    imageData: ImageData,
    roi?: TrackingRoi
): CrosshairCentroidDetection | null {
    return detectCentroidWithPredicate(imageData, roi, (r, g, b) => {
        const brightness = (r + g + b) / 3;
        const chroma = Math.max(r, g, b) - Math.min(r, g, b);

        if (brightness < 210 || chroma > 45) {
            return 0;
        }

        return clampUnit((brightness - chroma) / 255);
    }, 4);
}

function clampUnit(value: number): number {
    return Math.max(0, Math.min(1, value));
}

function cloneImageData(imageData: ImageData): ImageData {
    return {
        data: new Uint8ClampedArray(imageData.data),
        width: imageData.width,
        height: imageData.height,
    } as ImageData;
}

function compareVisibleReticleDetections(
    left: VisibleReticleDetection,
    right: VisibleReticleDetection
): number {
    if (right.detection.confidence !== left.detection.confidence) {
        return right.detection.confidence - left.detection.confidence;
    }

    if (right.detection.visiblePixels !== left.detection.visiblePixels) {
        return right.detection.visiblePixels - left.detection.visiblePixels;
    }

    const colorPriority = (colorState: ReticleColorState): number => {
        switch (colorState) {
            case 'red':
            case 'green':
                return 2;
            case 'neutral':
                return 1;
            default:
                return 0;
        }
    };

    return colorPriority(right.colorState) - colorPriority(left.colorState);
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
    const status: TrackingFrameStatus = hasPriorLock ? 'occluded' : 'lost';

    return {
        confidence: 0,
        visiblePixels: 0,
        status,
        colorState: 'unknown',
        exogenousDisturbance: createExogenousDisturbance({
            status,
            visiblePixels: 0,
            confidence: 0,
            muzzleFlash: 0,
            shake: 0,
        }),
    };
}

function createHardCutObservation(
    hasPriorLock: boolean,
    globalMotionEstimate: GlobalMotionEstimate
): StreamingCrosshairObservation {
    const status: TrackingFrameStatus = hasPriorLock ? 'occluded' : 'lost';

    return {
        confidence: 0,
        visiblePixels: 0,
        status,
        colorState: 'unknown',
        exogenousDisturbance: createExogenousDisturbance({
            status,
            visiblePixels: 0,
            confidence: 0,
            muzzleFlash: 0,
            shake: 0,
            cameraMotion: estimateCameraMotionDisturbance(globalMotionEstimate),
            hardCut: 1,
            identityConfidence: 0,
        }),
    };
}

function createVisibleObservation(
    detection: CrosshairCentroidDetection,
    status: TrackingFrameStatus,
    colorState: ReticleColorState,
    exogenousDisturbance: ReticleExogenousDisturbance,
    reacquisitionFrames?: number
): StreamingCrosshairObservation {
    return {
        x: detection.currentX,
        y: detection.currentY,
        confidence: detection.confidence,
        visiblePixels: detection.visiblePixels,
        status,
        ...(reacquisitionFrames !== undefined ? { reacquisitionFrames } : {}),
        colorState,
        exogenousDisturbance,
    };
}

function createExogenousDisturbance(context: ExogenousDisturbanceContext): ReticleExogenousDisturbance {
    const hasVisibleReticle = context.visiblePixels > 0;
    const blur = hasVisibleReticle ? clampUnit(1 - context.confidence) : 0.25;
    const occlusion = context.status === 'lost' || context.status === 'occluded'
        ? 1
        : hasVisibleReticle
            ? 0
            : 0.65;
    const hardCut = clampUnit(context.hardCut ?? 0);
    const flick = clampUnit(context.flick ?? 0);
    const targetSwap = clampUnit(context.targetSwap ?? 0);
    const identityConfidence = clampUnit(
        context.identityConfidence ??
        (1 - Math.max(hardCut, flick * 0.85, targetSwap, occlusion * 0.35))
    );

    return {
        muzzleFlash: clampUnit(context.muzzleFlash),
        blur,
        shake: clampUnit(context.shake),
        occlusion,
        cameraMotion: clampUnit(context.cameraMotion ?? 0),
        hardCut,
        flick,
        targetSwap,
        identityConfidence,
    };
}

function applyDisturbanceConfidencePenalty(
    confidence: number,
    disturbance: ReticleExogenousDisturbance
): number {
    const penalty = clampUnit(
        (disturbance.muzzleFlash * 0.18) +
        (disturbance.shake * 0.12) +
        (disturbance.occlusion * 0.05) +
        ((disturbance.cameraMotion ?? 0) * 0.08) +
        ((disturbance.hardCut ?? 0) * 0.45) +
        ((disturbance.flick ?? 0) * 0.4) +
        ((disturbance.targetSwap ?? 0) * 0.4) +
        ((1 - clampUnit(disturbance.identityConfidence ?? 1)) * 0.35)
    );

    return clampUnit(confidence * (1 - penalty));
}

function createDisturbanceAdjustedObservation(
    status: TrackingFrameStatus,
    visiblePixels: number,
    confidence: number,
    muzzleFlash: number,
    shake: number,
    contamination: Pick<
        ExogenousDisturbanceContext,
        'cameraMotion' | 'hardCut' | 'flick' | 'targetSwap' | 'identityConfidence'
    > = {}
): DisturbanceAdjustedObservation {
    const initialDisturbance = createExogenousDisturbance({
        status,
        visiblePixels,
        confidence,
        muzzleFlash,
        shake,
        ...contamination,
    });
    const severeIdentityContamination = Math.max(
        initialDisturbance.flick ?? 0,
        initialDisturbance.targetSwap ?? 0
    );
    const adjustedConfidence = severeIdentityContamination > 0
        ? Math.min(0.49, applyDisturbanceConfidencePenalty(confidence, initialDisturbance))
        : applyDisturbanceConfidencePenalty(confidence, initialDisturbance);
    const adjustedStatus = status === 'tracked' || status === 'uncertain'
        ? classifyConfidence(adjustedConfidence)
        : status;
    const exogenousDisturbance = createExogenousDisturbance({
        status: adjustedStatus,
        visiblePixels,
        confidence: adjustedConfidence,
        muzzleFlash,
        shake,
        ...contamination,
    });

    return {
        confidence: adjustedConfidence,
        status: adjustedStatus,
        exogenousDisturbance,
    };
}

function estimateShakeDisturbance(globalMotionEstimate: GlobalMotionEstimate | null): number {
    if (!globalMotionEstimate) {
        return 0;
    }

    const magnitudePx = globalMotionEstimate.magnitudePx;
    if (magnitudePx < 0.5) {
        return 0;
    }

    return clampUnit((magnitudePx / 12) * globalMotionEstimate.confidence);
}

function estimateCameraMotionDisturbance(globalMotionEstimate: GlobalMotionEstimate | null): number {
    if (!globalMotionEstimate || globalMotionEstimate.transitionKind !== 'camera_motion') {
        return 0;
    }

    return clampUnit((globalMotionEstimate.magnitudePx / 24) * globalMotionEstimate.reliability);
}

function estimateMuzzleFlashDisturbance(
    imageData: ImageData,
    detection: CrosshairCentroidDetection
): number {
    const radiusPx = 14;
    const minX = Math.max(0, Math.floor(detection.currentX - radiusPx));
    const minY = Math.max(0, Math.floor(detection.currentY - radiusPx));
    const maxX = Math.min(imageData.width, Math.ceil(detection.currentX + radiusPx + 1));
    const maxY = Math.min(imageData.height, Math.ceil(detection.currentY + radiusPx + 1));
    let flashPixels = 0;
    let sampledPixels = 0;

    for (let y = minY; y < maxY; y++) {
        for (let x = minX; x < maxX; x++) {
            sampledPixels++;

            if (Math.hypot(x - detection.currentX, y - detection.currentY) <= 3) {
                continue;
            }

            const index = ((y * imageData.width) + x) * 4;
            const r = imageData.data[index] ?? 0;
            const g = imageData.data[index + 1] ?? 0;
            const b = imageData.data[index + 2] ?? 0;
            const brightness = (r + g + b) / 3;
            const chroma = Math.max(r, g, b) - Math.min(r, g, b);
            const isWarmFlash = r >= 230 && g >= 140 && b <= 180 && (r - b) >= 55;
            const isWhiteFlash = brightness >= 235 && chroma <= 35;

            if (isWarmFlash || isWhiteFlash) {
                flashPixels++;
            }
        }
    }

    if (flashPixels < 12 || sampledPixels === 0) {
        return 0;
    }

    const score = clampUnit((flashPixels / sampledPixels) * 6);
    return score >= 0.2 ? score : 0;
}

export function createStreamingCrosshairTracker(
    config: StreamingCrosshairTrackerConfig = {}
): StreamingCrosshairTracker {
    const fullConfig = { ...DEFAULT_CONFIG, ...config };
    let lastKnownX: number | null = null;
    let lastKnownY: number | null = null;
    let lastReliableX: number | null = null;
    let lastReliableY: number | null = null;
    let motionDeltaX = 0;
    let motionDeltaY = 0;
    let consecutiveInvisibleFrames = 0;
    let frameSequence = 0;
    let recentLargeDisplacementFrame: number | null = null;
    let templateData: Uint8ClampedArray | null = null;
    let templateSize = Math.max(1, fullConfig.templateSize);
    let previousTrackingFrame: ImageData | null = null;

    function refreshTemplate(imageData: ImageData, x: number, y: number): void {
        const extractedTemplate = extractTemplate(imageData, x, y, templateSize);
        if (!extractedTemplate) {
            return;
        }

        templateSize = clampTemplateSize(imageData, templateSize);
        templateData = extractedTemplate;
    }

    function detectVisibleReticle(
        imageData: ImageData,
        targetColor: CrosshairColor | undefined,
        roi?: TrackingRoi
    ): {
        readonly detection: CrosshairCentroidDetection;
        readonly colorState: ReticleColorState;
    } | null {
        if (targetColor) {
            const primaryDetection = detectCrosshairCentroid(imageData, targetColor, roi);
            const neutralDetection = primaryDetection ? null : detectNeutralCrosshairCentroid(imageData, roi);
            const visibleDetection = primaryDetection ?? neutralDetection;

            if (!visibleDetection) {
                return null;
            }

            return {
                detection: visibleDetection,
                colorState: primaryDetection
                    ? (targetColor === 'GREEN' ? 'green' : 'red')
                    : 'neutral',
            };
        }

        const candidates: VisibleReticleDetection[] = [];
        const redDetection = detectCrosshairCentroid(imageData, 'RED', roi);
        const greenDetection = detectCrosshairCentroid(imageData, 'GREEN', roi);
        const neutralDetection = detectNeutralCrosshairCentroid(imageData, roi);

        if (redDetection) {
            candidates.push({
                detection: redDetection,
                colorState: 'red',
            });
        }

        if (greenDetection) {
            candidates.push({
                detection: greenDetection,
                colorState: 'green',
            });
        }

        if (neutralDetection) {
            candidates.push({
                detection: neutralDetection,
                colorState: 'neutral',
            });
        }

        candidates.sort(compareVisibleReticleDetections);

        return candidates[0] ?? null;
    }

    function commitVisibleDetection(
        imageData: ImageData,
        visibleReticle: {
            readonly detection: CrosshairCentroidDetection;
            readonly colorState: ReticleColorState;
        },
        globalMotionEstimate: GlobalMotionEstimate | null,
        currentFrameSequence: number
    ): StreamingCrosshairObservation {
        const reacquisitionFrames = consecutiveInvisibleFrames > 0
            ? consecutiveInvisibleFrames
            : undefined;
        const muzzleFlash = estimateMuzzleFlashDisturbance(imageData, visibleReticle.detection);
        const shake = estimateShakeDisturbance(globalMotionEstimate);
        const cameraMotion = estimateCameraMotionDisturbance(globalMotionEstimate);
        let displacementMagnitudePx = 0;
        let flick = 0;
        let targetSwap = 0;

        if (lastReliableX !== null && lastReliableY !== null) {
            displacementMagnitudePx = Math.hypot(
                visibleReticle.detection.currentX - lastReliableX,
                visibleReticle.detection.currentY - lastReliableY
            );

            if (displacementMagnitudePx > 28) {
                flick = clampUnit((displacementMagnitudePx - 28) / 12);
            }

            if (displacementMagnitudePx > 40) {
                if (
                    recentLargeDisplacementFrame !== null &&
                    currentFrameSequence - recentLargeDisplacementFrame <= 3
                ) {
                    targetSwap = clampUnit((displacementMagnitudePx - 40) / 12);
                }

                recentLargeDisplacementFrame = currentFrameSequence;
            } else if (
                recentLargeDisplacementFrame !== null &&
                currentFrameSequence - recentLargeDisplacementFrame > 3
            ) {
                recentLargeDisplacementFrame = null;
            }
        }

        const identityConfidence = clampUnit(1 - Math.max(flick * 0.85, targetSwap));
        const adjustedObservation = createDisturbanceAdjustedObservation(
            classifyConfidence(visibleReticle.detection.confidence),
            visibleReticle.detection.visiblePixels,
            visibleReticle.detection.confidence,
            muzzleFlash,
            shake,
            {
                cameraMotion,
                flick,
                targetSwap,
                identityConfidence,
            }
        );
        const adjustedDetection = {
            ...visibleReticle.detection,
            confidence: adjustedObservation.confidence,
        };

        if (lastReliableX !== null && lastReliableY !== null) {
            motionDeltaX = visibleReticle.detection.currentX - lastReliableX;
            motionDeltaY = visibleReticle.detection.currentY - lastReliableY;
        }

        if (identityConfidence >= 0.6) {
            lastReliableX = visibleReticle.detection.currentX;
            lastReliableY = visibleReticle.detection.currentY;
        }
        lastKnownX = visibleReticle.detection.currentX;
        lastKnownY = visibleReticle.detection.currentY;
        refreshTemplate(imageData, visibleReticle.detection.currentX, visibleReticle.detection.currentY);
        consecutiveInvisibleFrames = 0;

        return createVisibleObservation(
            adjustedDetection,
            adjustedObservation.status,
            visibleReticle.colorState,
            adjustedObservation.exogenousDisturbance,
            reacquisitionFrames
        );
    }

    function buildTrackingRoi(centerX: number, centerY: number, imageData: ImageData): TrackingRoi {
        return createCenteredRoi(
            centerX,
            centerY,
            imageData.width,
            imageData.height,
            fullConfig.roiRadiusPx ?? DEFAULT_ROI_RADIUS_PX
        );
    }

    function addVisualHypothesis(
        hypotheses: VisualHypothesis[],
        hypothesis: VisualHypothesis
    ): void {
        if (hypothesis.centerX === undefined || hypothesis.centerY === undefined) {
            hypotheses.push(hypothesis);
            return;
        }

        const centerX = hypothesis.centerX;
        const centerY = hypothesis.centerY;
        const alreadyExists = hypotheses.some((candidate) => (
            candidate.centerX !== undefined &&
            candidate.centerY !== undefined &&
            Math.abs(candidate.centerX - centerX) < 1 &&
            Math.abs(candidate.centerY - centerY) < 1
        ));

        if (alreadyExists) {
            return;
        }

        hypotheses.push(hypothesis);
    }

    function selectBestVisibleReticle(
        imageData: ImageData,
        targetColor: CrosshairColor | undefined
    ): VisibleReticleCandidate | null {
        const hypotheses: VisualHypothesis[] = [];
        const hasInvisibleHistory = consecutiveInvisibleFrames > 0;

        if (!hasInvisibleHistory) {
            if (lastKnownX !== null && lastKnownY !== null) {
                addVisualHypothesis(hypotheses, {
                    centerX: lastKnownX,
                    centerY: lastKnownY,
                    priority: 0,
                });
            } else {
                addVisualHypothesis(hypotheses, { priority: 0 });
            }
        } else {
            if (lastReliableX !== null && lastReliableY !== null && (motionDeltaX !== 0 || motionDeltaY !== 0)) {
                addVisualHypothesis(hypotheses, {
                    centerX: lastReliableX + (motionDeltaX * consecutiveInvisibleFrames),
                    centerY: lastReliableY + (motionDeltaY * consecutiveInvisibleFrames),
                    priority: 0,
                });
            }

            if (lastReliableX !== null && lastReliableY !== null) {
                addVisualHypothesis(hypotheses, {
                    centerX: lastReliableX,
                    centerY: lastReliableY,
                    priority: 1,
                });
            }

            if (lastKnownX !== null && lastKnownY !== null) {
                addVisualHypothesis(hypotheses, {
                    centerX: lastKnownX,
                    centerY: lastKnownY,
                    priority: 2,
                });
            }

            addVisualHypothesis(hypotheses, { priority: 3 });
        }

        const candidates = hypotheses.flatMap((hypothesis) => {
            const hypothesisRoi = (
                hypothesis.centerX !== undefined &&
                hypothesis.centerY !== undefined
            )
                ? buildTrackingRoi(hypothesis.centerX, hypothesis.centerY, imageData)
                : undefined;
            const visibleReticle = detectVisibleReticle(
                imageData,
                targetColor,
                hypothesisRoi
            );

            return visibleReticle ? [{
                visibleReticle,
                priority: hypothesis.priority,
            }] : [];
        });

        if (candidates.length === 0) {
            return null;
        }

        candidates.sort((left, right) => {
            if (right.visibleReticle.detection.confidence !== left.visibleReticle.detection.confidence) {
                return right.visibleReticle.detection.confidence - left.visibleReticle.detection.confidence;
            }

            return left.priority - right.priority;
        });

        return candidates[0] ?? null;
    }

    function estimateFrameGlobalMotion(imageData: ImageData): GlobalMotionEstimate | null {
        if (!fullConfig.globalMotionCompensation || !previousTrackingFrame) {
            return null;
        }

        const motionOptions = {
            ...(fullConfig.globalMotionSearchRadiusPx !== undefined
                ? { searchRadiusPx: fullConfig.globalMotionSearchRadiusPx }
                : {}),
            ...(fullConfig.globalMotionSampleStepPx !== undefined
                ? { sampleStepPx: fullConfig.globalMotionSampleStepPx }
                : {}),
        };
        const estimate = classifyGlobalMotionTransition(previousTrackingFrame, imageData, motionOptions);

        return estimate.transitionKind === 'hard_cut' || estimate.confidence > 0.2
            ? estimate
            : null;
    }

    function rememberTrackingFrame(imageData: ImageData): void {
        previousTrackingFrame = cloneImageData(imageData);
    }

    function clearIdentityLock(): void {
        lastKnownX = null;
        lastKnownY = null;
        lastReliableX = null;
        lastReliableY = null;
        motionDeltaX = 0;
        motionDeltaY = 0;
        consecutiveInvisibleFrames = 0;
        recentLargeDisplacementFrame = null;
        templateData = null;
    }

    return {
        track(imageData, options = {}) {
            const currentFrameSequence = frameSequence;
            frameSequence++;
            const trackingImage = fullConfig.normalizeBeforeTracking
                ? normalizeTrackingFrame(imageData)
                : imageData;
            const targetColor = options.targetColor;
            const globalMotionEstimate = estimateFrameGlobalMotion(trackingImage);

            if (globalMotionEstimate?.transitionKind === 'hard_cut') {
                const hadPriorLock = lastKnownX !== null && lastKnownY !== null;
                const observation = createHardCutObservation(hadPriorLock, globalMotionEstimate);
                clearIdentityLock();
                rememberTrackingFrame(trackingImage);
                return observation;
            }

            const bestVisibleReticle = selectBestVisibleReticle(trackingImage, targetColor);

            if (bestVisibleReticle) {
                const observation = commitVisibleDetection(
                    trackingImage,
                    bestVisibleReticle.visibleReticle,
                    globalMotionEstimate,
                    currentFrameSequence
                );
                rememberTrackingFrame(trackingImage);
                return observation;
            }

            if (templateData && lastKnownX !== null && lastKnownY !== null) {
                const templateSearchX = globalMotionEstimate
                    ? lastKnownX + globalMotionEstimate.dx
                    : lastKnownX;
                const templateSearchY = globalMotionEstimate
                    ? lastKnownY + globalMotionEstimate.dy
                    : lastKnownY;
                const templateMatch = matchTemplate(
                    templateData,
                    templateSize,
                    trackingImage,
                    templateSearchX,
                    templateSearchY,
                    fullConfig.searchRadius
                );
                const fallbackConfidence = Math.min(0.69, templateMatch.confidence * 0.75);

                if (fallbackConfidence >= MIN_TEMPLATE_FALLBACK_CONFIDENCE) {
                    const shake = estimateShakeDisturbance(globalMotionEstimate);
                    const adjustedObservation = createDisturbanceAdjustedObservation(
                        'uncertain',
                        0,
                        fallbackConfidence,
                        0,
                        shake,
                        {
                            cameraMotion: estimateCameraMotionDisturbance(globalMotionEstimate),
                        }
                    );
                    const correctedX = globalMotionEstimate
                        ? templateMatch.x - globalMotionEstimate.dx
                        : templateMatch.x;
                    const correctedY = globalMotionEstimate
                        ? templateMatch.y - globalMotionEstimate.dy
                        : templateMatch.y;
                    lastKnownX = correctedX;
                    lastKnownY = correctedY;
                    consecutiveInvisibleFrames++;

                    const observation: StreamingCrosshairObservation = {
                        x: correctedX,
                        y: correctedY,
                        confidence: adjustedObservation.confidence,
                        visiblePixels: 0,
                        status: adjustedObservation.status,
                        colorState: 'unknown',
                        exogenousDisturbance: adjustedObservation.exogenousDisturbance,
                    };
                    rememberTrackingFrame(trackingImage);
                    return observation;
                }
            }

            if (lastKnownX !== null && lastKnownY !== null) {
                consecutiveInvisibleFrames++;
            }

            const observation = createLostObservation(lastKnownX !== null && lastKnownY !== null);
            rememberTrackingFrame(trackingImage);
            return observation;
        },
        reset(seed) {
            lastKnownX = seed?.x ?? null;
            lastKnownY = seed?.y ?? null;
            lastReliableX = null;
            lastReliableY = null;
            motionDeltaX = 0;
            motionDeltaY = 0;
            consecutiveInvisibleFrames = 0;
            frameSequence = 0;
            recentLargeDisplacementFrame = null;
            templateData = null;
            templateSize = Math.max(1, fullConfig.templateSize);
            previousTrackingFrame = null;
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
        colorState: 'unknown',
        exogenousDisturbance: createExogenousDisturbance({
            status: 'tracked',
            visiblePixels: fullConfig.templateSize * fullConfig.templateSize,
            confidence: 1,
            muzzleFlash: 0,
            shake: 0,
        }),
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
                colorState: 'unknown',
                exogenousDisturbance: createExogenousDisturbance({
                    status,
                    visiblePixels: fullConfig.templateSize * fullConfig.templateSize,
                    confidence: result.confidence,
                    muzzleFlash: 0,
                    shake: 0,
                }),
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
                colorState: 'unknown',
                exogenousDisturbance: createExogenousDisturbance({
                    status,
                    visiblePixels: 0,
                    confidence: result.confidence,
                    muzzleFlash: 0,
                    shake: 0,
                }),
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
