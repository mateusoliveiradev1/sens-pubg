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
    getOpticCatalog,
    getOptic,
    getOpticState,
    listLegacyScopes,
    resolveOpticCatalogVersion,
    SUPPORTED_OPTIC_PATCHES,
    type OpticCatalogSnapshot,
    type OpticDefinition,
    type OpticStateDefinition,
    type LegacyScopeData,
} from './optic-catalog';

export {
    getAttachmentCatalog,
    getAttachment,
    listAttachmentsBySlot,
    resolveAttachmentCatalogVersion,
    SUPPORTED_ATTACHMENT_PATCHES,
    type AttachmentSlot,
    type AttachmentEffects,
    type AttachmentAvailability,
    type AttachmentDefinition,
    type AttachmentCatalogSnapshot,
} from './attachment-catalog';

export {
    sliderToInternal, internalToSlider, PUBG_BASE_ROTATION_CONSTANT,
} from './sens-math';

export {
    DEFAULT_SCOPE_SENS_VALUE,
    normalizeScopeSensitivityMap,
    resolveScopeSensitivityValue,
} from './scope-sensitivity';

export {
    fov_v,
    ang_x,
    ang_y,
    delta_theta,
    type PixelPoint,
    type ProjectionConfig,
    type AngularDelta,
} from './projection-math';

export {
    phi_patch,
    effective_yaw,
    effective_pitch,
    resolveEffectiveSensitivity,
    scopeSliderFromEffectiveYaw,
    type EffectiveSensitivityInput,
    type EffectiveSensitivityResult,
    type ScopeSliderFromEffectiveYawInput,
} from './effective-sens';

export {
    angularErrorToLinearMeters,
    angularErrorToLinearCentimeters,
    linearErrorSeverity,
} from './error-math';

export {
    PRO_PLAYERS, getProPlayer, getProsByRole, getProStats,
    getPlayerImageUrl, getTeamLogoUrl, TEAM_SLUGS,
    PLAYER_PHOTO_FILES, PUBG_ICON,
    type ProPlayer,
} from './pro-players';

export {
    CURRENT_PUBG_PATCH,
    CURRENT_PUBG_PATCH_VERSION,
    UNKNOWN_PUBG_PATCH_VERSION,
    normalizePatchVersion,
    type PubgPatchInfo,
} from './patch';

export {
    getExpectedRecoilAtShot,
    getExpectedRecoilSequence,
    type ExpectedRecoilSequence,
    type ExpectedRecoilSequenceInput,
    type ExpectedRecoilShot,
    type RecoilPatchAvailability,
} from './recoil-sequences';
