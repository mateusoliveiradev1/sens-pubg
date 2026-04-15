import { getOpticState, resolveOpticCatalogVersion } from './optic-catalog';
import { internalToSlider, sliderToInternal } from './sens-math';

const PATCH_SENSITIVITY_COEFFICIENTS: Readonly<Record<string, number>> = {
    '36.1': 1,
    '37.1': 1,
    '41.1': 1,
};

export interface EffectiveSensitivityInput {
    readonly patchVersion: string;
    readonly generalSlider: number;
    readonly adsSlider: number;
    readonly scopeSlider: number;
    readonly opticId: string;
    readonly opticStateId?: string;
    readonly verticalMultiplier: number;
}

export interface EffectiveSensitivityResult {
    readonly input: EffectiveSensitivityInput;
    readonly resolvedPatchVersion: string;
    readonly phiPatch: number;
    readonly opticMultiplier: number;
    readonly generalInternal: number;
    readonly adsInternal: number;
    readonly scopeInternal: number;
    readonly effectiveYaw: number;
    readonly effectivePitch: number;
}

export type ScopeSliderFromEffectiveYawInput = Omit<EffectiveSensitivityInput, 'scopeSlider'> & {
    readonly targetEffectiveYaw: number;
    readonly scopeSlider?: number;
};

export function phi_patch(patchVersion: string): number {
    const resolvedPatchVersion = resolveOpticCatalogVersion(patchVersion);
    return PATCH_SENSITIVITY_COEFFICIENTS[resolvedPatchVersion] ?? 1;
}

function resolveOpticMultiplier(input: Pick<EffectiveSensitivityInput, 'patchVersion' | 'opticId' | 'opticStateId'>): number {
    const opticState = getOpticState(input.patchVersion, input.opticId, input.opticStateId);
    if (!opticState) {
        throw new RangeError(`Unknown optic state: ${input.opticId}/${input.opticStateId ?? 'default'}`);
    }

    return opticState.sensitivityMultiplier;
}

export function resolveEffectiveSensitivity(input: EffectiveSensitivityInput): EffectiveSensitivityResult {
    const resolvedPatchVersion = resolveOpticCatalogVersion(input.patchVersion);
    const phiPatch = phi_patch(input.patchVersion);
    const opticMultiplier = resolveOpticMultiplier(input);
    const generalInternal = sliderToInternal(input.generalSlider);
    const adsInternal = sliderToInternal(input.adsSlider);
    const scopeInternal = sliderToInternal(input.scopeSlider);
    const effectiveYaw = phiPatch * generalInternal * adsInternal * scopeInternal * opticMultiplier;

    return {
        input,
        resolvedPatchVersion,
        phiPatch,
        opticMultiplier,
        generalInternal,
        adsInternal,
        scopeInternal,
        effectiveYaw,
        effectivePitch: effectiveYaw * input.verticalMultiplier,
    };
}

export function effective_yaw(input: EffectiveSensitivityInput): number {
    return resolveEffectiveSensitivity(input).effectiveYaw;
}

export function effective_pitch(input: EffectiveSensitivityInput): number {
    return resolveEffectiveSensitivity(input).effectivePitch;
}

export function scopeSliderFromEffectiveYaw(input: ScopeSliderFromEffectiveYawInput): number {
    if (!Number.isFinite(input.targetEffectiveYaw) || input.targetEffectiveYaw <= 0) {
        throw new RangeError('targetEffectiveYaw must be greater than zero.');
    }

    const denominator = phi_patch(input.patchVersion)
        * sliderToInternal(input.generalSlider)
        * sliderToInternal(input.adsSlider)
        * resolveOpticMultiplier(input);

    if (denominator <= 0) {
        throw new RangeError('Cannot invert scope slider from a non-positive sensitivity denominator.');
    }

    return internalToSlider(input.targetEffectiveYaw / denominator);
}
