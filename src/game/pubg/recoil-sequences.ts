import { CURRENT_PUBG_PATCH_VERSION } from './patch';
import { getWeaponPatchProfile, resolveWeaponCatalogVersion } from './weapon-patch-catalog';
import { getWeapon, type RecoilVector, type WeaponData } from './weapon-data';

export interface ExpectedRecoilSequenceInput {
    readonly weaponId: string;
    readonly patchVersion?: string;
    readonly shotCount?: number;
    readonly weapon?: WeaponData;
}

export type RecoilPatchAvailability = 'active' | 'deprecated' | 'removed' | 'unknown';

export interface ExpectedRecoilShot {
    readonly shotIndex: number;
    readonly timestampMs: number;
    readonly recoil: RecoilVector;
    readonly cumulative: RecoilVector;
}

export interface ExpectedRecoilSequence {
    readonly weaponId: string;
    readonly patchVersion: string;
    readonly resolvedPatchVersion: string;
    readonly patchAvailability: RecoilPatchAvailability;
    readonly msPerShot: number;
    readonly shots: readonly ExpectedRecoilShot[];
}

function roundDegrees(value: number): number {
    return Math.round(value * 1_000_000) / 1_000_000;
}

function clampShotCount(requested: number | undefined, available: number): number {
    if (requested === undefined) {
        return available;
    }

    return Math.max(0, Math.min(Math.floor(requested), available));
}

export function getExpectedRecoilSequence(
    input: ExpectedRecoilSequenceInput
): ExpectedRecoilSequence {
    const weapon = input.weapon ?? getWeapon(input.weaponId);
    if (!weapon) {
        throw new Error(`Unknown weapon for recoil sequence: ${input.weaponId}`);
    }

    const patchVersion = input.patchVersion ?? CURRENT_PUBG_PATCH_VERSION;
    const resolvedPatchVersion = resolveWeaponCatalogVersion(patchVersion);
    const patchProfile = getWeaponPatchProfile(resolvedPatchVersion, weapon.id);
    const shotCount = clampShotCount(input.shotCount, weapon.recoilPattern.length);

    let cumulativeYaw = 0;
    let cumulativePitch = 0;
    const shots = weapon.recoilPattern.slice(0, shotCount).map((recoil, shotIndex) => {
        cumulativeYaw = roundDegrees(cumulativeYaw + recoil.yaw);
        cumulativePitch = roundDegrees(cumulativePitch + recoil.pitch);

        return {
            shotIndex,
            timestampMs: shotIndex * weapon.msPerShot,
            recoil,
            cumulative: {
                yaw: cumulativeYaw,
                pitch: cumulativePitch,
            },
        };
    });

    return {
        weaponId: weapon.id,
        patchVersion,
        resolvedPatchVersion,
        patchAvailability: patchProfile?.availability.status ?? 'unknown',
        msPerShot: weapon.msPerShot,
        shots,
    };
}

export function getExpectedRecoilAtShot(
    sequence: ExpectedRecoilSequence,
    shotIndex: number
): ExpectedRecoilShot | undefined {
    return sequence.shots.find((shot) => shot.shotIndex === shotIndex);
}
