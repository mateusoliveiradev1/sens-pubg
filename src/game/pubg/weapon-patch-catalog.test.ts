import { describe, expect, it } from 'vitest';
import { CURRENT_PUBG_PATCH_VERSION, UNKNOWN_PUBG_PATCH_VERSION } from './patch';
import {
    SUPPORTED_WEAPON_PATCHES,
    getWeaponCatalog,
    getWeaponPatchProfile,
    resolveWeaponCatalogVersion,
} from './weapon-patch-catalog';

describe('weapon patch catalog', () => {
    it('tracks the same weapon across legacy and current patch snapshots', () => {
        const legacyBeryl = getWeaponPatchProfile('36.1', 'beryl-m762');
        const currentBeryl = getWeaponPatchProfile(CURRENT_PUBG_PATCH_VERSION, 'beryl-m762');

        expect(legacyBeryl?.availability.status).toBe('active');
        expect(currentBeryl?.availability.status).toBe('active');
        expect(legacyBeryl?.baseVerticalRecoil).not.toBe(currentBeryl?.baseVerticalRecoil);
        expect(legacyBeryl?.baseVerticalRecoil).toBeGreaterThan(currentBeryl?.baseVerticalRecoil ?? 0);
    });

    it('represents removals explicitly instead of silently dropping the weapon', () => {
        const legacyQbz = getWeaponPatchProfile('36.1', 'qbz');
        const currentQbz = getWeaponPatchProfile(CURRENT_PUBG_PATCH_VERSION, 'qbz');

        expect(legacyQbz?.availability.status).toBe('active');
        expect(currentQbz?.availability.status).toBe('removed');
        expect(getWeaponCatalog(CURRENT_PUBG_PATCH_VERSION).weapons.some(
            (weapon) => weapon.weaponId === 'qbz' && weapon.availability.status === 'removed'
        )).toBe(true);
    });

    it('resolves exact and nearest snapshots consistently', () => {
        expect(SUPPORTED_WEAPON_PATCHES).toContain('36.1');
        expect(SUPPORTED_WEAPON_PATCHES).toContain(CURRENT_PUBG_PATCH_VERSION);
        expect(resolveWeaponCatalogVersion(UNKNOWN_PUBG_PATCH_VERSION)).toBe(UNKNOWN_PUBG_PATCH_VERSION);
        expect(resolveWeaponCatalogVersion('40.2')).toBe('36.1');
        expect(resolveWeaponCatalogVersion('41.2')).toBe(CURRENT_PUBG_PATCH_VERSION);
    });
});
