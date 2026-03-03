/**
 * Crosshair Tracking — Rastreamento de mira frame-a-frame.
 * Color filtering (HSV) + centroid detection.
 * GPU accelerated via processing multiple frames.
 */

import { asPixels, asMilliseconds } from '../types/branded';
import type { TrackingPoint } from '../types/engine';
import type { ExtractedFrame } from './frame-extraction';

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
// Track All Frames
// ═══════════════════════════════════════════

export interface TrackingResult {
    readonly points: readonly TrackingPoint[];
    readonly trackingQuality: number; // 0-1
    readonly framesTracked: number;
    readonly framesLost: number;
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
    let framesLost = 0;

    if (frames.length === 0) return { points: [], trackingQuality: 0, framesTracked: 0, framesLost: 0 };

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

    for (let i = 1; i < frames.length; i++) {
        const frame = frames[i]!;

        // Match the background pattern
        const result = matchTemplate(templateData, tSize, frame.imageData, lastX, lastY, fullConfig.searchRadius);

        if (result.confidence > 0.4) {
            points.push({
                frame: frame.index,
                timestamp: asMilliseconds(frame.timestamp),
                x: asPixels(result.x),
                y: asPixels(result.y),
                confidence: result.confidence,
            });
            lastX = result.x;
            lastY = result.y; // Clean tracking without artificial recoil bias
        } else {
            framesLost++;
            points.push({
                frame: frame.index,
                timestamp: asMilliseconds(frame.timestamp),
                x: asPixels(lastX),
                y: asPixels(lastY),
                confidence: result.confidence,
            });
        }
    }

    const tracked = frames.length - framesLost;
    const quality = frames.length > 0 ? tracked / frames.length : 0;

    return {
        points,
        trackingQuality: quality,
        framesTracked: tracked,
        framesLost,
    };
}
