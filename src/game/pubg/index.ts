/**
 * PUBG Game Data — Barrel re-export.
 */

export {
    WEAPONS, WEAPON_LIST, getWeapon, getWeaponsByCategory, getJitterThreshold,
    type WeaponData, type WeaponCategory, type WeaponId, type RecoilVector,
} from './weapon-data';

export {
    SCOPES, SCOPE_LIST, getScope,
    calculateEffectiveSensitivity, calculateCmPer360, internalFromCmPer360,
    horizontalToVerticalFov, pixelsPerDegree, pixelDisplacementToDegrees,
    isSensViableForMousepad,
    type ScopeData, type ScopeId,
} from './scope-multipliers';

export {
    sliderToInternal, internalToSlider, PUBG_BASE_ROTATION_CONSTANT,
} from './sens-math';

export {
    PRO_PLAYERS, getProPlayer, getProsByRole, getProStats,
    getPlayerImageUrl, getTeamLogoUrl, TEAM_SLUGS,
    type ProPlayer,
} from './pro-players';
