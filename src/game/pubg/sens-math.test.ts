import { describe, expect, it } from 'vitest';
import { getPixelToDegree } from './sens-math';

describe('PUBG sensitivity projection helpers', () => {
    it('uses exact center-pixel projection and caller-provided aspect ratio', () => {
        expect(getPixelToDegree(90, 1080, 1920)).toBeCloseTo(0.0596830821, 10);
        expect(getPixelToDegree(90, 1080, 2560)).toBeCloseTo(0.0447623186, 10);
    });
});
