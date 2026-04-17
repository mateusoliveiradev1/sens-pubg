function clampByte(value: number): number {
    return Math.max(0, Math.min(255, Math.round(value)));
}

function getLuma(r: number, g: number, b: number): number {
    return (0.299 * r) + (0.587 * g) + (0.114 * b);
}

function lerp(left: number, right: number, ratio: number): number {
    return left + ((right - left) * ratio);
}

function normalizePixel(r: number, g: number, b: number): [number, number, number] {
    const brightness = (r + g + b) / 3;
    const maxChannel = Math.max(r, g, b);
    const minChannel = Math.min(r, g, b);
    const chroma = maxChannel - minChannel;

    if (brightness <= 0) {
        return [0, 0, 0];
    }

    const suppressCompetingChannel = (channel: number): number => clampByte(channel - (chroma * 0.2));

    if (chroma >= 32) {
        const boostedDominantChannel = (channel: number): number => clampByte(channel + (chroma * 0.85));

        if (r === maxChannel && r > g && r > b) {
            return [
                boostedDominantChannel(r),
                suppressCompetingChannel(g),
                suppressCompetingChannel(b),
            ];
        }

        if (g === maxChannel && g > r && g > b) {
            return [
                suppressCompetingChannel(r),
                boostedDominantChannel(g),
                suppressCompetingChannel(b),
            ];
        }

        if (b === maxChannel && b > r && b > g) {
            return [
                suppressCompetingChannel(r),
                suppressCompetingChannel(g),
                boostedDominantChannel(b),
            ];
        }
    }

    if (brightness >= 155) {
        const liftFactor = Math.min(1.4, 255 / brightness);
        return [
            clampByte(r * liftFactor),
            clampByte(g * liftFactor),
            clampByte(b * liftFactor),
        ];
    }

    return [r, g, b];
}

interface FocusBounds {
    readonly minX: number;
    readonly maxX: number;
    readonly minY: number;
    readonly maxY: number;
}

interface FocusStats {
    readonly minLuma: number;
    readonly maxLuma: number;
    readonly meanLuma: number;
    readonly contrastGain: number;
}

function createFocusBounds(width: number, height: number): FocusBounds {
    const radiusX = Math.max(1, Math.floor(width * 0.28));
    const radiusY = Math.max(1, Math.floor(height * 0.28));
    const centerX = Math.floor(width / 2);
    const centerY = Math.floor(height / 2);

    return {
        minX: Math.max(0, centerX - radiusX),
        maxX: Math.min(width - 1, centerX + radiusX),
        minY: Math.max(0, centerY - radiusY),
        maxY: Math.min(height - 1, centerY + radiusY),
    };
}

function createFallbackFocusStats(): FocusStats {
    return {
        minLuma: 0,
        maxLuma: 255,
        meanLuma: 127.5,
        contrastGain: 1.08,
    };
}

function measureFocusStats(imageData: ImageData, bounds: FocusBounds): FocusStats {
    let minLuma = Number.POSITIVE_INFINITY;
    let maxLuma = Number.NEGATIVE_INFINITY;
    let totalLuma = 0;
    let sampleCount = 0;
    const area = (bounds.maxX - bounds.minX + 1) * (bounds.maxY - bounds.minY + 1);
    const sampleStep = area > 160_000 ? 2 : 1;

    for (let y = bounds.minY; y <= bounds.maxY; y += sampleStep) {
        for (let x = bounds.minX; x <= bounds.maxX; x += sampleStep) {
            const index = ((y * imageData.width) + x) * 4;
            const r = imageData.data[index] ?? 0;
            const g = imageData.data[index + 1] ?? 0;
            const b = imageData.data[index + 2] ?? 0;
            const luma = getLuma(r, g, b);

            minLuma = Math.min(minLuma, luma);
            maxLuma = Math.max(maxLuma, luma);
            totalLuma += luma;
            sampleCount++;
        }
    }

    if (sampleCount === 0 || !Number.isFinite(minLuma) || !Number.isFinite(maxLuma)) {
        return createFallbackFocusStats();
    }

    const meanLuma = totalLuma / sampleCount;
    const dynamicRange = maxLuma - minLuma;
    const contrastGain = dynamicRange < 32
        ? 1.42
        : dynamicRange < 52
            ? 1.3
            : dynamicRange < 80
                ? 1.18
                : 1.08;

    return {
        minLuma,
        maxLuma,
        meanLuma,
        contrastGain,
    };
}

function getSafeChannel(
    data: Uint8ClampedArray,
    width: number,
    height: number,
    x: number,
    y: number,
    offset: number
): number {
    const safeX = Math.max(0, Math.min(width - 1, x));
    const safeY = Math.max(0, Math.min(height - 1, y));
    const index = ((safeY * width) + safeX) * 4;
    return data[index + offset] ?? 0;
}

function getBlurredChannel(
    data: Uint8ClampedArray,
    width: number,
    height: number,
    x: number,
    y: number,
    offset: number
): number {
    const center = getSafeChannel(data, width, height, x, y, offset);
    const north = getSafeChannel(data, width, height, x, y - 1, offset);
    const south = getSafeChannel(data, width, height, x, y + 1, offset);
    const east = getSafeChannel(data, width, height, x + 1, y, offset);
    const west = getSafeChannel(data, width, height, x - 1, y, offset);

    return ((center * 4) + north + south + east + west) / 8;
}

function applyAdaptiveContrast(channel: number, pivot: number, contrastGain: number): number {
    return clampByte(((channel - pivot) * contrastGain) + pivot);
}

function normalizeFocusPixel(
    imageData: ImageData,
    x: number,
    y: number,
    focusStats: FocusStats
): [number, number, number] {
    const data = imageData.data;
    const width = imageData.width;
    const height = imageData.height;
    const index = ((y * width) + x) * 4;
    const r = data[index] ?? 0;
    const g = data[index + 1] ?? 0;
    const b = data[index + 2] ?? 0;
    const blurredR = getBlurredChannel(data, width, height, x, y, 0);
    const blurredG = getBlurredChannel(data, width, height, x, y, 1);
    const blurredB = getBlurredChannel(data, width, height, x, y, 2);
    const denoisedR = lerp(r, blurredR, 0.18);
    const denoisedG = lerp(g, blurredG, 0.18);
    const denoisedB = lerp(b, blurredB, 0.18);
    const contrastPivot = focusStats.meanLuma;
    const contrastR = applyAdaptiveContrast(denoisedR, contrastPivot, focusStats.contrastGain);
    const contrastG = applyAdaptiveContrast(denoisedG, contrastPivot, focusStats.contrastGain);
    const contrastB = applyAdaptiveContrast(denoisedB, contrastPivot, focusStats.contrastGain);
    const [boostedR, boostedG, boostedB] = normalizePixel(contrastR, contrastG, contrastB);
    const sharpenStrength = 0.24;

    return [
        clampByte(boostedR + ((boostedR - blurredR) * sharpenStrength)),
        clampByte(boostedG + ((boostedG - blurredG) * sharpenStrength)),
        clampByte(boostedB + ((boostedB - blurredB) * sharpenStrength)),
    ];
}

export function normalizeTrackingFrame(imageData: ImageData): ImageData {
    const normalizedData = new Uint8ClampedArray(imageData.data);
    const focusBounds = createFocusBounds(imageData.width, imageData.height);
    const focusStats = measureFocusStats(imageData, focusBounds);

    for (let y = focusBounds.minY; y <= focusBounds.maxY; y++) {
        for (let x = focusBounds.minX; x <= focusBounds.maxX; x++) {
            const index = ((y * imageData.width) + x) * 4;
            const a = imageData.data[index + 3] ?? 255;
            const [normalizedR, normalizedG, normalizedB] = normalizeFocusPixel(imageData, x, y, focusStats);

            normalizedData[index] = normalizedR;
            normalizedData[index + 1] = normalizedG;
            normalizedData[index + 2] = normalizedB;
            normalizedData[index + 3] = a;
        }
    }

    return {
        data: normalizedData,
        width: imageData.width,
        height: imageData.height,
    } as ImageData;
}
