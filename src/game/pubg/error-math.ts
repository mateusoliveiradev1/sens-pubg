const DEFAULT_TARGET_WIDTH_CM = 45;

function degreesToRadians(degrees: number): number {
    return (degrees * Math.PI) / 180;
}

function assertFinite(value: number, label: string): void {
    if (!Number.isFinite(value)) {
        throw new RangeError(`${label} must be a finite number.`);
    }
}

function assertNonNegative(value: number, label: string): void {
    assertFinite(value, label);
    if (value < 0) {
        throw new RangeError(`${label} must be non-negative.`);
    }
}

function assertPositive(value: number, label: string): void {
    assertFinite(value, label);
    if (value <= 0) {
        throw new RangeError(`${label} must be greater than zero.`);
    }
}

export function angularErrorToLinearMeters(angularErrorDegrees: number, distanceMeters: number): number {
    assertFinite(angularErrorDegrees, 'angularErrorDegrees');
    assertNonNegative(distanceMeters, 'distanceMeters');

    return Math.tan(Math.abs(degreesToRadians(angularErrorDegrees))) * distanceMeters;
}

export function angularErrorToLinearCentimeters(angularErrorDegrees: number, distanceMeters: number): number {
    return angularErrorToLinearMeters(angularErrorDegrees, distanceMeters) * 100;
}

/**
 * Severity is expressed as percentage of a typical upper-body target width.
 * Values may exceed 100 when the projected miss is wider than the target.
 */
export function linearErrorSeverity(
    linearErrorCentimeters: number,
    targetWidthCentimeters: number = DEFAULT_TARGET_WIDTH_CM
): number {
    assertNonNegative(linearErrorCentimeters, 'linearErrorCentimeters');
    assertPositive(targetWidthCentimeters, 'targetWidthCentimeters');

    return (linearErrorCentimeters / targetWidthCentimeters) * 100;
}
