import { describe, expect, it } from 'vitest';
import { detectOpticState } from './optic-state-detection';

function makeFrame(): ImageData {
    return {
        width: 8,
        height: 8,
        data: new Uint8ClampedArray(8 * 8 * 4),
    } as ImageData;
}

describe('detectOpticState', () => {
    it('returns unknown honestly when there is no optic evidence', () => {
        const result = detectOpticState(makeFrame());

        expect(result).toEqual({
            opticState: 'unknown',
            opticStateConfidence: 0,
        });
    });

    it('uses a trusted optic state hint when supplied and clamps confidence', () => {
        const result = detectOpticState(makeFrame(), {
            opticStateHint: '1x',
            opticStateConfidenceHint: 1.5,
        });

        expect(result).toEqual({
            opticState: '1x',
            opticStateConfidence: 1,
        });
    });
});
