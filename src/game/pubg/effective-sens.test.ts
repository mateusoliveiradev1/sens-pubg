import { describe, expect, it } from 'vitest';
import { CURRENT_PUBG_PATCH_VERSION } from './patch';
import {
    effective_pitch,
    effective_yaw,
    phi_patch,
    resolveEffectiveSensitivity,
    scopeSliderFromEffectiveYaw,
} from './effective-sens';

const baseInput = {
    patchVersion: CURRENT_PUBG_PATCH_VERSION,
    generalSlider: 50,
    adsSlider: 50,
    scopeSlider: 50,
    opticId: 'red-dot-sight',
    opticStateId: '1x',
    verticalMultiplier: 1,
} as const;

describe('effective sensitivity', () => {
    it('encapsulates patch coefficient and separates yaw from pitch', () => {
        const result = resolveEffectiveSensitivity({
            ...baseInput,
            verticalMultiplier: 1.2,
        });

        expect(phi_patch(CURRENT_PUBG_PATCH_VERSION)).toBe(1);
        expect(result.phiPatch).toBe(1);
        expect(result.opticMultiplier).toBeCloseTo(0.777, 10);
        expect(result.effectiveYaw).toBeCloseTo(0.777, 10);
        expect(result.effectivePitch).toBeCloseTo(0.9324, 10);
        expect(effective_yaw(result.input)).toBeCloseTo(result.effectiveYaw, 10);
        expect(effective_pitch(result.input)).toBeCloseTo(result.effectivePitch, 10);
    });

    it('uses the requested optic state, including Hybrid Scope state changes', () => {
        const hybrid1x = resolveEffectiveSensitivity({
            ...baseInput,
            opticId: 'hybrid-scope',
            opticStateId: '1x',
        });
        const hybrid4x = resolveEffectiveSensitivity({
            ...baseInput,
            opticId: 'hybrid-scope',
            opticStateId: '4x',
        });

        expect(hybrid1x.effectiveYaw).toBeCloseTo(0.777, 10);
        expect(hybrid4x.effectiveYaw).toBeCloseTo(0.211, 10);
        expect(hybrid4x.effectiveYaw).toBeLessThan(hybrid1x.effectiveYaw);
    });

    it('is monotonic for general, ADS, scope sliders, and VSM', () => {
        expect(effective_yaw({ ...baseInput, generalSlider: 60 })).toBeGreaterThan(
            effective_yaw({ ...baseInput, generalSlider: 40 })
        );
        expect(effective_yaw({ ...baseInput, adsSlider: 60 })).toBeGreaterThan(
            effective_yaw({ ...baseInput, adsSlider: 40 })
        );
        expect(effective_yaw({ ...baseInput, scopeSlider: 60 })).toBeGreaterThan(
            effective_yaw({ ...baseInput, scopeSlider: 40 })
        );
        expect(effective_yaw({ ...baseInput, verticalMultiplier: 1.5 })).toBeCloseTo(
            effective_yaw({ ...baseInput, verticalMultiplier: 0.7 }),
            10
        );
        expect(effective_pitch({ ...baseInput, verticalMultiplier: 1.5 })).toBeGreaterThan(
            effective_pitch({ ...baseInput, verticalMultiplier: 0.7 })
        );
    });

    it('round-trips scope slider from target effective yaw', () => {
        for (const scopeSlider of [10, 25, 50, 63, 75, 90]) {
            const targetEffectiveYaw = effective_yaw({ ...baseInput, scopeSlider });
            expect(scopeSliderFromEffectiveYaw({ ...baseInput, targetEffectiveYaw })).toBe(scopeSlider);
        }
    });
});
