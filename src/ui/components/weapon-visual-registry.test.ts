import { existsSync } from 'node:fs';
import { join } from 'node:path';

import { weaponSeeds } from '@/db/weapon-profile-seed';
import { describe, expect, it } from 'vitest';

import { getWeaponVisualEntry, weaponVisualRegistry } from './weapon-visual-registry';

const visualOnlySeedNames = [
    'QBZ',
    'K2',
    'Groza',
    'FAMAS',
    'M16A4',
    'Mk47 Mutant',
    'Micro UZI',
    'PP-19 Bizon',
    'Tommy Gun',
    'JS9',
    'P90',
    'Mk12',
    'Dragunov',
    'QBU',
    'VSS',
    'Mk14',
] as const;

describe('weapon visual registry', () => {
    it('covers every current weapon seed with a stable non-generic silhouette', () => {
        expect(weaponVisualRegistry).toHaveLength(29);
        expect(weaponVisualRegistry).toHaveLength(weaponSeeds.length);

        for (const seed of weaponSeeds) {
            const entry = getWeaponVisualEntry(seed.name);

            expect(entry, seed.name).toBeDefined();
            expect(entry?.displayName).toBe(seed.name);
            expect(entry?.silhouetteId).toBe(entry?.id);
            expect(entry?.silhouetteId).not.toMatch(/generic|fallback|category/i);
        }
    });

    it('keeps visual-only seed weapons renderable without pretending they are technical analysis weapons', () => {
        for (const seedName of visualOnlySeedNames) {
            const entry = getWeaponVisualEntry(seedName);

            expect(entry, seedName).toBeDefined();
            expect(entry?.technicalAnalysisSupported).toBe(false);
            expect(entry?.silhouetteId).not.toMatch(/generic|fallback|category/i);
        }
    });

    it('marks current technical analysis seed weapons separately from visual coverage', () => {
        const technicalEntries = weaponVisualRegistry.filter((entry) => entry.technicalAnalysisSupported);

        expect(technicalEntries.map((entry) => entry.displayName)).toEqual([
            'Beryl M762',
            'M416',
            'AUG',
            'ACE32',
            'AKM',
            'SCAR-L',
            'G36C',
            'UMP45',
            'Vector',
            'MP5K',
            'Mini14',
            'SKS',
            'SLR',
        ]);
    });

    it('uses available official PUBG API weapon renders without blocking the JS9 authored fallback', () => {
        const apiAssetEntries = weaponVisualRegistry.filter((entry) => entry.pubgApiImagePath);

        expect(apiAssetEntries).toHaveLength(28);
        expect(apiAssetEntries.map((entry) => entry.displayName)).not.toContain('JS9');

        for (const entry of apiAssetEntries) {
            expect(entry.pubgApiImagePath, entry.displayName).toBe(`/pubg-api-assets/weapons/main/${entry.slug}.png`);
            expect(entry.pubgApiAssetId, entry.displayName).toMatch(/^Item_Weapon_.+_C\.png$/);
            expect(
                existsSync(join(process.cwd(), 'public', entry.pubgApiImagePath!.slice(1))),
                entry.displayName,
            ).toBe(true);
        }
    });
});
