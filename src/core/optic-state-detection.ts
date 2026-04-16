export interface OpticStateDetectionOptions {
    readonly opticStateHint?: string;
    readonly opticStateConfidenceHint?: number;
}

export interface OpticStateDetection {
    readonly opticState: string;
    readonly opticStateConfidence: number;
}

function clampUnit(value: number): number {
    return Math.max(0, Math.min(1, value));
}

export function detectOpticState(
    _imageData: ImageData,
    options: OpticStateDetectionOptions = {}
): OpticStateDetection {
    const hint = options.opticStateHint?.trim();

    if (!hint) {
        return {
            opticState: 'unknown',
            opticStateConfidence: 0,
        };
    }

    return {
        opticState: hint,
        opticStateConfidence: clampUnit(options.opticStateConfidenceHint ?? 1),
    };
}
