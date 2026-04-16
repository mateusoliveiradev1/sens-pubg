export interface TrackingRoi {
    readonly x: number;
    readonly y: number;
    readonly width: number;
    readonly height: number;
}

export function normalizeTrackingRoi(
    roi: TrackingRoi | undefined,
    frameWidth: number,
    frameHeight: number
): TrackingRoi {
    if (!roi) {
        return { x: 0, y: 0, width: frameWidth, height: frameHeight };
    }

    const x = Math.max(0, Math.min(frameWidth, Math.floor(roi.x)));
    const y = Math.max(0, Math.min(frameHeight, Math.floor(roi.y)));
    const right = Math.max(x, Math.min(frameWidth, Math.ceil(roi.x + roi.width)));
    const bottom = Math.max(y, Math.min(frameHeight, Math.ceil(roi.y + roi.height)));

    return {
        x,
        y,
        width: right - x,
        height: bottom - y,
    };
}

export function createCenteredRoi(
    centerX: number,
    centerY: number,
    frameWidth: number,
    frameHeight: number,
    radiusPx: number
): TrackingRoi {
    return normalizeTrackingRoi({
        x: centerX - radiusPx,
        y: centerY - radiusPx,
        // Include both radius endpoints so a candidate sitting exactly on the edge
        // is still fully visible inside the ROI.
        width: (radiusPx * 2) + 1,
        height: (radiusPx * 2) + 1,
    }, frameWidth, frameHeight);
}
