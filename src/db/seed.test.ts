import { describe, expect, it } from 'vitest';
import { buildCanonicalWeaponProfile, weaponSeeds } from './weapon-profile-seed';

describe('weapon profile seed canonicalization', () => {
    it('projects legacy recoil data into the canonical multidimensional shape', () => {
        const m416 = weaponSeeds.find((weapon) => weapon.name === 'M416');

        expect(m416).toBeDefined();

        const canonicalProfile = buildCanonicalWeaponProfile(m416!);

        expect(canonicalProfile).toEqual({
            schemaVersion: 1,
            sourcePatchVersion: 'legacy-unknown',
            baseStats: {
                verticalRecoil: 1.15,
                horizontalRecoil: 1.10,
                fireRateMs: 86,
            },
            supportedSlots: ['muzzle', 'grip', 'stock'],
            attachmentProfiles: {
                'muzzle-brake': {
                    slot: 'muzzle',
                    multipliers: {
                        verticalRecoil: 0.88,
                    },
                },
                compensator: {
                    slot: 'muzzle',
                    multipliers: {
                        verticalRecoil: 0.90,
                    },
                },
                'heavy-stock': {
                    slot: 'stock',
                    multipliers: {
                        verticalRecoil: 0.90,
                    },
                },
                'vertical-grip': {
                    slot: 'grip',
                    multipliers: {
                        verticalRecoil: 0.85,
                        horizontalRecoil: 1.0,
                    },
                },
                'half-grip': {
                    slot: 'grip',
                    multipliers: {
                        verticalRecoil: 0.95,
                        horizontalRecoil: 0.85,
                    },
                },
            },
        });
    });

    it('keeps supported slots even when the current seed has no canonical attachments for a slot', () => {
        const microUzi = weaponSeeds.find((weapon) => weapon.name === 'Micro UZI');

        expect(microUzi).toBeDefined();

        const canonicalProfile = buildCanonicalWeaponProfile(microUzi!);

        expect(canonicalProfile.supportedSlots).toEqual(['muzzle', 'stock']);
        expect(canonicalProfile.attachmentProfiles['heavy-stock']).toEqual({
            slot: 'stock',
            multipliers: {
                verticalRecoil: 0.90,
            },
        });
    });
});
