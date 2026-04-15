import { describe, expect, it } from 'vitest';
import { horizontalToVerticalFov, pixelDisplacementToDegrees } from './scope-multipliers';

describe('scope projection helpers', () => {
    it('delegates vertical FOV to exact projection math for variable aspect ratios', () => {
        expect(horizontalToVerticalFov(90, 16 / 9)).toBeCloseTo(58.7155070856, 10);
        expect(horizontalToVerticalFov(90, 21 / 9)).toBeCloseTo(46.3971810273, 10);
    });

    it('converts pixel displacement through exact projection instead of linear pixels-per-degree', () => {
        expect(pixelDisplacementToDegrees(480, 1920, 90)).toBeCloseTo(26.5650511771, 10);
        expect(pixelDisplacementToDegrees(-480, 1920, 90)).toBeCloseTo(-26.5650511771, 10);
    });
});
