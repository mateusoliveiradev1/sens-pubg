export interface PixelPoint {
    readonly x: number;
    readonly y: number;
}

export interface ProjectionConfig {
    readonly widthPx: number;
    readonly heightPx: number;
    readonly horizontalFovDegrees: number;
    readonly centerXPx?: number;
    readonly centerYPx?: number;
}

export interface AngularDelta {
    readonly yawDegrees: number;
    readonly pitchDegrees: number;
    readonly magnitudeDegrees: number;
}

function degreesToRadians(degrees: number): number {
    return (degrees * Math.PI) / 180;
}

function radiansToDegrees(radians: number): number {
    return (radians * 180) / Math.PI;
}

function assertFinite(value: number, label: string): void {
    if (!Number.isFinite(value)) {
        throw new RangeError(`${label} must be a finite number.`);
    }
}

function assertPositive(value: number, label: string): void {
    assertFinite(value, label);
    if (value <= 0) {
        throw new RangeError(`${label} must be greater than zero.`);
    }
}

function assertPerspectiveFov(value: number, label: string): void {
    assertPositive(value, label);
    if (value >= 180) {
        throw new RangeError(`${label} must be lower than 180 degrees.`);
    }
}

export function fov_v(horizontalFovDegrees: number, aspectRatio: number): number {
    assertPerspectiveFov(horizontalFovDegrees, 'horizontalFovDegrees');
    assertPositive(aspectRatio, 'aspectRatio');

    const horizontalFovRadians = degreesToRadians(horizontalFovDegrees);
    return radiansToDegrees(2 * Math.atan(Math.tan(horizontalFovRadians / 2) / aspectRatio));
}

export function ang_x(
    pixelX: number,
    widthPx: number,
    horizontalFovDegrees: number,
    centerXPx = widthPx / 2
): number {
    assertFinite(pixelX, 'pixelX');
    assertPositive(widthPx, 'widthPx');
    assertPerspectiveFov(horizontalFovDegrees, 'horizontalFovDegrees');
    assertFinite(centerXPx, 'centerXPx');

    const normalizedX = (pixelX - centerXPx) / (widthPx / 2);
    const horizontalFovRadians = degreesToRadians(horizontalFovDegrees);

    return radiansToDegrees(Math.atan(normalizedX * Math.tan(horizontalFovRadians / 2)));
}

export function ang_y(
    pixelY: number,
    heightPx: number,
    verticalFovDegrees: number,
    centerYPx = heightPx / 2
): number {
    assertFinite(pixelY, 'pixelY');
    assertPositive(heightPx, 'heightPx');
    assertPerspectiveFov(verticalFovDegrees, 'verticalFovDegrees');
    assertFinite(centerYPx, 'centerYPx');

    // Screen Y grows downward; pitch is positive when the screen point is above center.
    const normalizedY = (centerYPx - pixelY) / (heightPx / 2);
    const verticalFovRadians = degreesToRadians(verticalFovDegrees);

    return radiansToDegrees(Math.atan(normalizedY * Math.tan(verticalFovRadians / 2)));
}

export function delta_theta(
    from: PixelPoint,
    to: PixelPoint,
    projection: ProjectionConfig
): AngularDelta {
    assertPositive(projection.widthPx, 'widthPx');
    assertPositive(projection.heightPx, 'heightPx');

    const verticalFovDegrees = fov_v(
        projection.horizontalFovDegrees,
        projection.widthPx / projection.heightPx
    );

    const fromYawDegrees = ang_x(
        from.x,
        projection.widthPx,
        projection.horizontalFovDegrees,
        projection.centerXPx
    );
    const toYawDegrees = ang_x(
        to.x,
        projection.widthPx,
        projection.horizontalFovDegrees,
        projection.centerXPx
    );
    const fromPitchDegrees = ang_y(
        from.y,
        projection.heightPx,
        verticalFovDegrees,
        projection.centerYPx
    );
    const toPitchDegrees = ang_y(
        to.y,
        projection.heightPx,
        verticalFovDegrees,
        projection.centerYPx
    );

    const yawDegrees = toYawDegrees - fromYawDegrees;
    const pitchDegrees = toPitchDegrees - fromPitchDegrees;

    return {
        yawDegrees,
        pitchDegrees,
        magnitudeDegrees: Math.hypot(yawDegrees, pitchDegrees),
    };
}
