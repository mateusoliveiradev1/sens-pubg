function clampByte(value: number): number {
    return Math.max(0, Math.min(255, Math.round(value)));
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

    if (chroma >= 40) {
        const boostedDominantChannel = (channel: number): number => clampByte(channel + (chroma * 0.8));

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

    if (brightness >= 160) {
        const liftFactor = Math.min(1.35, 255 / brightness);
        return [
            clampByte(r * liftFactor),
            clampByte(g * liftFactor),
            clampByte(b * liftFactor),
        ];
    }

    return [r, g, b];
}

export function normalizeTrackingFrame(imageData: ImageData): ImageData {
    const normalizedData = new Uint8ClampedArray(imageData.data.length);

    for (let index = 0; index < imageData.data.length; index += 4) {
        const r = imageData.data[index] ?? 0;
        const g = imageData.data[index + 1] ?? 0;
        const b = imageData.data[index + 2] ?? 0;
        const a = imageData.data[index + 3] ?? 255;
        const [normalizedR, normalizedG, normalizedB] = normalizePixel(r, g, b);

        normalizedData[index] = normalizedR;
        normalizedData[index + 1] = normalizedG;
        normalizedData[index + 2] = normalizedB;
        normalizedData[index + 3] = a;
    }

    return {
        data: normalizedData,
        width: imageData.width,
        height: imageData.height,
    } as ImageData;
}
