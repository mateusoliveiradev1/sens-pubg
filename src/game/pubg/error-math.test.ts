import { describe, expect, it } from 'vitest';
import {
    angularErrorToLinearCentimeters,
    angularErrorToLinearMeters,
    linearErrorSeverity,
} from './error-math';

describe('target error math', () => {
    it('converts angular error to larger linear error as target distance increases', () => {
        const nearMeters = angularErrorToLinearMeters(1, 15);
        const farMeters = angularErrorToLinearMeters(1, 80);

        expect(nearMeters).toBeCloseTo(0.2618259739, 10);
        expect(farMeters).toBeCloseTo(1.3964051943, 10);
        expect(farMeters / nearMeters).toBeCloseTo(80 / 15, 10);
    });

    it('calculates severity as target-width percentage', () => {
        const nearCentimeters = angularErrorToLinearCentimeters(1, 15);
        const farCentimeters = angularErrorToLinearCentimeters(1, 80);

        expect(linearErrorSeverity(nearCentimeters)).toBeCloseTo(58.2, 1);
        expect(linearErrorSeverity(farCentimeters)).toBeCloseTo(310.3, 1);
        expect(linearErrorSeverity(farCentimeters)).toBeGreaterThan(linearErrorSeverity(nearCentimeters));
    });
});
