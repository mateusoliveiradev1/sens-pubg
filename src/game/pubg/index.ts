/**
 * PUBG Game Data — Barrel re-export.
 */

export {
    WEAPONS, WEAPON_LIST, getWeapon, getWeaponsByCategory, getJitterThreshold,
    type WeaponData, type WeaponCategory, type WeaponId, type RecoilVector,
} from './weapon-data';

export {
    SCOPES, SCOPE_LIST, getScope,
    calculateEffectiveSensitivity, calculateCmPer360, sensFromCmPer360,
    horizontalToVerticalFov, pixelsPerDegree, pixelDisplacementToDegrees,
    isSensViableForMousepad,
    type ScopeData, type ScopeId,
} from './scope-multipliers';
