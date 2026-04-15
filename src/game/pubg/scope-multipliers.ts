import { sliderToInternal, PUBG_BASE_ROTATION_CONSTANT } from './sens-math';
import { CURRENT_PUBG_PATCH_VERSION } from './patch';
import { listLegacyScopes, type LegacyScopeData } from './optic-catalog';
import { ang_x, fov_v } from './projection-math';

export type ScopeData = LegacyScopeData;

const CURRENT_LEGACY_SCOPES = listLegacyScopes(CURRENT_PUBG_PATCH_VERSION);

export const SCOPES: Record<string, ScopeData> = Object.fromEntries(
    CURRENT_LEGACY_SCOPES.map((scope) => [scope.id, scope])
);

export type ScopeId = string;

export const SCOPE_LIST: readonly ScopeData[] = CURRENT_LEGACY_SCOPES;

export function getScope(id: string, patchVersion: string = CURRENT_PUBG_PATCH_VERSION): ScopeData | undefined {
    return listLegacyScopes(patchVersion).find((scope) => scope.id === id);
}

export function calculateEffectiveSensitivity(
    generalSlider: number,
    adsSlider: number,
    scopeMultiplier: number,
    scopeSlider: number
): number {
    const general = sliderToInternal(generalSlider);
    const ads = sliderToInternal(adsSlider);
    const scope = sliderToInternal(scopeSlider);

    return general * ads * scopeMultiplier * scope;
}

export function calculateCmPer360(
    dpi: number,
    internalMultiplier: number
): number {
    const inchesPer360 = 360 / (dpi * PUBG_BASE_ROTATION_CONSTANT * internalMultiplier);
    return Math.round(inchesPer360 * 2.54 * 100) / 100;
}

export function internalFromCmPer360(
    dpi: number,
    targetCmPer360: number
): number {
    const targetInchesPer360 = targetCmPer360 / 2.54;
    return 360 / (dpi * PUBG_BASE_ROTATION_CONSTANT * targetInchesPer360);
}

export function horizontalToVerticalFov(
    horizontalFov: number,
    aspectRatio: number = 16 / 9
): number {
    return fov_v(horizontalFov, aspectRatio);
}

/**
 * Linear average helper kept for legacy display code.
 * Main angular conversions should use `pixelDisplacementToDegrees` or `delta_theta`.
 */
export function pixelsPerDegree(
    horizontalResolution: number,
    horizontalFov: number
): number {
    return horizontalResolution / horizontalFov;
}

export function pixelDisplacementToDegrees(
    pixelDisplacement: number,
    horizontalResolution: number,
    horizontalFov: number
): number {
    if (horizontalResolution <= 0) return 0;

    return ang_x(
        (horizontalResolution / 2) + pixelDisplacement,
        horizontalResolution,
        horizontalFov
    );
}

export function isSensViableForMousepad(
    cmPer360: number,
    mousepadWidthCm: number
): boolean {
    const cmPer180 = cmPer360 / 2;
    return cmPer180 <= mousepadWidthCm * 0.6;
}
