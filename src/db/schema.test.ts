import { describe, expect, it } from 'vitest';
import { analysisSessions, weaponPatchProfiles, weaponProfiles, weaponRegistry } from './schema';

describe('analysisSessions schema', () => {
    it('defines a dedicated patch_version column for patch-aware queries', () => {
        expect(analysisSessions.patchVersion).toBeDefined();
        expect(analysisSessions.patchVersion.name).toBe('patch_version');
    });
});

describe('weaponProfiles schema', () => {
    it('defines a canonical_profile column for multidimensional attachment data', () => {
        expect(weaponProfiles.canonicalProfile).toBeDefined();
        expect(weaponProfiles.canonicalProfile.name).toBe('canonical_profile');
    });
});

describe('weapon patch-aware schema', () => {
    it('defines a registry with stable weapon_id slugs', () => {
        expect(weaponRegistry.weaponId).toBeDefined();
        expect(weaponRegistry.weaponId.name).toBe('weapon_id');
    });

    it('defines patch profiles with patch_version and lifecycle_status', () => {
        expect(weaponPatchProfiles.patchVersion).toBeDefined();
        expect(weaponPatchProfiles.patchVersion.name).toBe('patch_version');
        expect(weaponPatchProfiles.lifecycleStatus).toBeDefined();
        expect(weaponPatchProfiles.lifecycleStatus.name).toBe('lifecycle_status');
    });
});
