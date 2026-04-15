import { config } from 'dotenv';
config({ path: '.env.local' });

import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema';
import { weaponPatchProfiles, weaponProfiles, weaponRegistry } from './schema';
import { buildCanonicalWeaponProfile, weaponSeeds } from './weapon-profile-seed';
import { WEAPON_CATALOG_SNAPSHOTS, getWeaponRegistry } from '@/game/pubg/weapon-patch-catalog';

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql, { schema });

async function main() {
    console.log('Seeding weapons...');

    for (const weapon of weaponSeeds) {
        await db.insert(weaponProfiles).values({
            ...weapon,
            attachments: [...weapon.attachments],
            canonicalProfile: buildCanonicalWeaponProfile(weapon),
        }).onConflictDoUpdate({
            target: weaponProfiles.name,
            set: {
                category: weapon.category,
                baseVerticalRecoil: weapon.baseVerticalRecoil,
                baseHorizontalRng: weapon.baseHorizontalRng,
                fireRateMs: weapon.fireRateMs,
                multipliers: weapon.multipliers,
                attachments: [...weapon.attachments],
                canonicalProfile: buildCanonicalWeaponProfile(weapon),
                updatedAt: new Date(),
            },
        });
    }

    console.log('Seeding weapon registry...');

    for (const weapon of getWeaponRegistry()) {
        await db.insert(weaponRegistry).values({
            weaponId: weapon.weaponId,
            name: weapon.name,
            category: weapon.category,
        }).onConflictDoUpdate({
            target: weaponRegistry.weaponId,
            set: {
                name: weapon.name,
                category: weapon.category,
                updatedAt: new Date(),
            },
        });
    }

    console.log('Seeding patch-aware weapon profiles...');

    const registryRows = await db.select({
        id: weaponRegistry.id,
        weaponId: weaponRegistry.weaponId,
    }).from(weaponRegistry);
    const registryIdByWeaponId = new Map(registryRows.map((row) => [row.weaponId, row.id]));

    for (const snapshot of WEAPON_CATALOG_SNAPSHOTS) {
        for (const weapon of snapshot.weapons) {
            const registryId = registryIdByWeaponId.get(weapon.weaponId);
            if (!registryId) {
                throw new Error(`Weapon registry row not found for ${weapon.weaponId}`);
            }

            await db.insert(weaponPatchProfiles).values({
                weaponId: registryId,
                patchVersion: snapshot.patchVersion,
                lifecycleStatus: weapon.availability.status,
                baseVerticalRecoil: weapon.baseVerticalRecoil,
                baseHorizontalRng: weapon.baseHorizontalRng,
                fireRateMs: weapon.fireRateMs,
                multipliers: weapon.multipliers,
                attachments: [...weapon.attachments],
                canonicalProfile: buildCanonicalWeaponProfile({
                    name: weapon.name,
                    category: weapon.category,
                    baseVerticalRecoil: weapon.baseVerticalRecoil,
                    baseHorizontalRng: weapon.baseHorizontalRng,
                    fireRateMs: weapon.fireRateMs,
                    attachments: weapon.attachments,
                    multipliers: weapon.multipliers,
                }, snapshot.patchVersion),
            }).onConflictDoUpdate({
                target: [weaponPatchProfiles.weaponId, weaponPatchProfiles.patchVersion],
                set: {
                    lifecycleStatus: weapon.availability.status,
                    baseVerticalRecoil: weapon.baseVerticalRecoil,
                    baseHorizontalRng: weapon.baseHorizontalRng,
                    fireRateMs: weapon.fireRateMs,
                    multipliers: weapon.multipliers,
                    attachments: [...weapon.attachments],
                    canonicalProfile: buildCanonicalWeaponProfile({
                        name: weapon.name,
                        category: weapon.category,
                        baseVerticalRecoil: weapon.baseVerticalRecoil,
                        baseHorizontalRng: weapon.baseHorizontalRng,
                        fireRateMs: weapon.fireRateMs,
                        attachments: weapon.attachments,
                        multipliers: weapon.multipliers,
                    }, snapshot.patchVersion),
                    updatedAt: new Date(),
                },
            });
        }
    }

    console.log('Seed completed successfully!');
}

main().catch((err) => {
    console.error('Seed failed:', err);
    process.exit(1);
});
