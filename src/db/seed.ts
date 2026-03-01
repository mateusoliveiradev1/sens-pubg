import { config } from 'dotenv';
config({ path: '.env.local' });

import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema';
import { weaponProfiles } from './schema';

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql, { schema });

const weapons = [
    // ================= ASSAULT RIFLES (ARs) =================
    {
        "name": "Beryl M762", "category": "AR", "baseVerticalRecoil": 1.45, "baseHorizontalRng": 1.30, "fireRateMs": 86,
        "multipliers": { "muzzle_brake": 0.85, "compensator": 0.90, "heavy_stock": 0.92, "vertical_grip": { "vertical": 0.85, "horizontal": 1.0 }, "half_grip": { "vertical": 0.95, "horizontal": 0.85 } }
    },
    {
        "name": "M416", "category": "AR", "baseVerticalRecoil": 1.15, "baseHorizontalRng": 1.10, "fireRateMs": 86,
        "multipliers": { "muzzle_brake": 0.88, "compensator": 0.90, "heavy_stock": 0.90, "vertical_grip": { "vertical": 0.85, "horizontal": 1.0 }, "half_grip": { "vertical": 0.95, "horizontal": 0.85 } }
    },
    {
        "name": "AUG", "category": "AR", "baseVerticalRecoil": 1.20, "baseHorizontalRng": 1.15, "fireRateMs": 84,
        "multipliers": { "muzzle_brake": 0.88, "compensator": 0.90, "heavy_stock": 0.90, "vertical_grip": { "vertical": 0.85, "horizontal": 1.0 }, "half_grip": { "vertical": 0.95, "horizontal": 0.85 } }
    },
    {
        "name": "ACE32", "category": "AR", "baseVerticalRecoil": 1.35, "baseHorizontalRng": 1.25, "fireRateMs": 88,
        "multipliers": { "muzzle_brake": 0.85, "compensator": 0.90, "heavy_stock": 0.92, "vertical_grip": { "vertical": 0.85, "horizontal": 1.0 }, "half_grip": { "vertical": 0.95, "horizontal": 0.85 } }
    },
    {
        "name": "AKM", "category": "AR", "baseVerticalRecoil": 1.30, "baseHorizontalRng": 1.20, "fireRateMs": 100,
        "multipliers": { "muzzle_brake": 0.85, "compensator": 0.90, "heavy_stock": 1.0, "vertical_grip": { "vertical": 1.0, "horizontal": 1.0 }, "half_grip": { "vertical": 1.0, "horizontal": 1.0 } }
    },
    {
        "name": "SCAR-L", "category": "AR", "baseVerticalRecoil": 1.05, "baseHorizontalRng": 1.05, "fireRateMs": 96,
        "multipliers": { "muzzle_brake": 0.88, "compensator": 0.90, "heavy_stock": 1.0, "vertical_grip": { "vertical": 0.85, "horizontal": 1.0 }, "half_grip": { "vertical": 0.95, "horizontal": 0.85 } }
    },
    {
        "name": "G36C", "category": "AR", "baseVerticalRecoil": 1.10, "baseHorizontalRng": 1.08, "fireRateMs": 86,
        "multipliers": { "muzzle_brake": 0.88, "compensator": 0.90, "heavy_stock": 1.0, "vertical_grip": { "vertical": 0.85, "horizontal": 1.0 }, "half_grip": { "vertical": 0.95, "horizontal": 0.85 } }
    },
    {
        "name": "QBZ", "category": "AR", "baseVerticalRecoil": 1.12, "baseHorizontalRng": 1.10, "fireRateMs": 92,
        "multipliers": { "muzzle_brake": 0.88, "compensator": 0.90, "heavy_stock": 1.0, "vertical_grip": { "vertical": 0.85, "horizontal": 1.0 }, "half_grip": { "vertical": 0.95, "horizontal": 0.85 } }
    },
    {
        "name": "K2", "category": "AR", "baseVerticalRecoil": 1.18, "baseHorizontalRng": 1.12, "fireRateMs": 88,
        "multipliers": { "muzzle_brake": 0.88, "compensator": 0.90, "heavy_stock": 1.0, "vertical_grip": { "vertical": 1.0, "horizontal": 1.0 }, "half_grip": { "vertical": 1.0, "horizontal": 1.0 } }
    },
    {
        "name": "Groza", "category": "AR", "baseVerticalRecoil": 1.25, "baseHorizontalRng": 1.15, "fireRateMs": 80,
        "multipliers": { "muzzle_brake": 1.0, "compensator": 1.0, "heavy_stock": 1.0, "vertical_grip": { "vertical": 1.0, "horizontal": 1.0 }, "half_grip": { "vertical": 1.0, "horizontal": 1.0 } }
    },
    {
        "name": "FAMAS", "category": "AR", "baseVerticalRecoil": 1.15, "baseHorizontalRng": 1.05, "fireRateMs": 66,
        "multipliers": { "muzzle_brake": 1.0, "compensator": 1.0, "heavy_stock": 1.0, "vertical_grip": { "vertical": 1.0, "horizontal": 1.0 }, "half_grip": { "vertical": 1.0, "horizontal": 1.0 } }
    },
    {
        "name": "M16A4", "category": "AR", "baseVerticalRecoil": 1.20, "baseHorizontalRng": 1.05, "fireRateMs": 75,
        "multipliers": { "muzzle_brake": 0.85, "compensator": 0.90, "heavy_stock": 0.90, "vertical_grip": { "vertical": 1.0, "horizontal": 1.0 }, "half_grip": { "vertical": 1.0, "horizontal": 1.0 } }
    },
    {
        "name": "Mk47 Mutant", "category": "AR", "baseVerticalRecoil": 1.30, "baseHorizontalRng": 1.10, "fireRateMs": 100,
        "multipliers": { "muzzle_brake": 0.85, "compensator": 0.90, "heavy_stock": 0.90, "vertical_grip": { "vertical": 0.85, "horizontal": 1.0 }, "half_grip": { "vertical": 0.95, "horizontal": 0.85 } }
    },

    // ================= SUBMACHINE GUNS (SMGs) =================
    {
        "name": "UMP45", "category": "SMG", "baseVerticalRecoil": 0.85, "baseHorizontalRng": 0.80, "fireRateMs": 92,
        "multipliers": { "muzzle_brake": 1.0, "compensator": 0.90, "heavy_stock": 1.0, "vertical_grip": { "vertical": 0.85, "horizontal": 1.0 }, "half_grip": { "vertical": 0.95, "horizontal": 0.85 } }
    },
    {
        "name": "Vector", "category": "SMG", "baseVerticalRecoil": 0.95, "baseHorizontalRng": 0.85, "fireRateMs": 55,
        "multipliers": { "muzzle_brake": 1.0, "compensator": 0.90, "heavy_stock": 0.90, "vertical_grip": { "vertical": 0.85, "horizontal": 1.0 }, "half_grip": { "vertical": 0.95, "horizontal": 0.85 } }
    },
    {
        "name": "Micro UZI", "category": "SMG", "baseVerticalRecoil": 0.75, "baseHorizontalRng": 0.70, "fireRateMs": 48,
        "multipliers": { "muzzle_brake": 1.0, "compensator": 0.90, "heavy_stock": 0.90, "vertical_grip": { "vertical": 1.0, "horizontal": 1.0 }, "half_grip": { "vertical": 1.0, "horizontal": 1.0 } }
    },
    {
        "name": "MP5K", "category": "SMG", "baseVerticalRecoil": 0.90, "baseHorizontalRng": 0.82, "fireRateMs": 66,
        "multipliers": { "muzzle_brake": 1.0, "compensator": 0.90, "heavy_stock": 0.90, "vertical_grip": { "vertical": 0.85, "horizontal": 1.0 }, "half_grip": { "vertical": 0.95, "horizontal": 0.85 } }
    },
    {
        "name": "PP-19 Bizon", "category": "SMG", "baseVerticalRecoil": 0.80, "baseHorizontalRng": 0.75, "fireRateMs": 86,
        "multipliers": { "muzzle_brake": 1.0, "compensator": 0.90, "heavy_stock": 1.0, "vertical_grip": { "vertical": 1.0, "horizontal": 1.0 }, "half_grip": { "vertical": 1.0, "horizontal": 1.0 } }
    },
    {
        "name": "Tommy Gun", "category": "SMG", "baseVerticalRecoil": 1.00, "baseHorizontalRng": 0.90, "fireRateMs": 86,
        "multipliers": { "muzzle_brake": 1.0, "compensator": 1.0, "heavy_stock": 1.0, "vertical_grip": { "vertical": 0.85, "horizontal": 1.0 }, "half_grip": { "vertical": 1.0, "horizontal": 1.0 } }
    },
    {
        "name": "JS9", "category": "SMG", "baseVerticalRecoil": 0.70, "baseHorizontalRng": 0.65, "fireRateMs": 66,
        "multipliers": { "muzzle_brake": 1.0, "compensator": 0.90, "heavy_stock": 1.0, "vertical_grip": { "vertical": 1.0, "horizontal": 1.0 }, "half_grip": { "vertical": 1.0, "horizontal": 1.0 } }
    },
    {
        "name": "P90", "category": "SMG", "baseVerticalRecoil": 0.60, "baseHorizontalRng": 0.60, "fireRateMs": 60,
        "multipliers": { "muzzle_brake": 1.0, "compensator": 1.0, "heavy_stock": 1.0, "vertical_grip": { "vertical": 1.0, "horizontal": 1.0 }, "half_grip": { "vertical": 1.0, "horizontal": 1.0 } }
    },

    // ================= DESIGNATED MARKSMAN RIFLES (DMRs) =================
    {
        "name": "Mini14", "category": "DMR", "baseVerticalRecoil": 1.40, "baseHorizontalRng": 1.10, "fireRateMs": 100,
        "multipliers": { "muzzle_brake": 0.85, "compensator": 0.90, "heavy_stock": 1.0, "vertical_grip": { "vertical": 1.0, "horizontal": 1.0 }, "half_grip": { "vertical": 1.0, "horizontal": 1.0 } }
    },
    {
        "name": "Mk12", "category": "DMR", "baseVerticalRecoil": 1.35, "baseHorizontalRng": 1.05, "fireRateMs": 100,
        "multipliers": { "muzzle_brake": 0.85, "compensator": 0.90, "heavy_stock": 1.0, "vertical_grip": { "vertical": 0.85, "horizontal": 1.0 }, "half_grip": { "vertical": 0.95, "horizontal": 0.85 } }
    },
    {
        "name": "SKS", "category": "DMR", "baseVerticalRecoil": 1.70, "baseHorizontalRng": 1.30, "fireRateMs": 90,
        "multipliers": { "muzzle_brake": 0.85, "compensator": 0.90, "heavy_stock": 0.90, "vertical_grip": { "vertical": 0.85, "horizontal": 1.0 }, "half_grip": { "vertical": 0.95, "horizontal": 0.85 } }
    },
    {
        "name": "SLR", "category": "DMR", "baseVerticalRecoil": 1.85, "baseHorizontalRng": 1.40, "fireRateMs": 100,
        "multipliers": { "muzzle_brake": 0.85, "compensator": 0.90, "heavy_stock": 0.90, "vertical_grip": { "vertical": 1.0, "horizontal": 1.0 }, "half_grip": { "vertical": 1.0, "horizontal": 1.0 } }
    },
    {
        "name": "Dragunov", "category": "DMR", "baseVerticalRecoil": 1.95, "baseHorizontalRng": 1.25, "fireRateMs": 150,
        "multipliers": { "muzzle_brake": 0.85, "compensator": 0.90, "heavy_stock": 0.90, "vertical_grip": { "vertical": 1.0, "horizontal": 1.0 }, "half_grip": { "vertical": 1.0, "horizontal": 1.0 } }
    },
    {
        "name": "QBU", "category": "DMR", "baseVerticalRecoil": 1.38, "baseHorizontalRng": 1.08, "fireRateMs": 100,
        "multipliers": { "muzzle_brake": 0.85, "compensator": 0.90, "heavy_stock": 1.0, "vertical_grip": { "vertical": 1.0, "horizontal": 1.0 }, "half_grip": { "vertical": 1.0, "horizontal": 1.0 } }
    },
    {
        "name": "VSS", "category": "DMR", "baseVerticalRecoil": 1.25, "baseHorizontalRng": 1.15, "fireRateMs": 86,
        "multipliers": { "muzzle_brake": 1.0, "compensator": 1.0, "heavy_stock": 0.90, "vertical_grip": { "vertical": 1.0, "horizontal": 1.0 }, "half_grip": { "vertical": 1.0, "horizontal": 1.0 } }
    },
    {
        "name": "Mk14", "category": "DMR", "baseVerticalRecoil": 2.10, "baseHorizontalRng": 1.80, "fireRateMs": 90,
        "multipliers": { "muzzle_brake": 0.85, "compensator": 0.90, "heavy_stock": 0.92, "vertical_grip": { "vertical": 1.0, "horizontal": 1.0 }, "half_grip": { "vertical": 1.0, "horizontal": 1.0 } }
    }
];

async function main() {
    console.log('Seeding weapons...');
    for (const weapon of weapons) {
        await db.insert(weaponProfiles).values(weapon).onConflictDoUpdate({
            target: weaponProfiles.name,
            set: {
                category: weapon.category,
                baseVerticalRecoil: weapon.baseVerticalRecoil,
                baseHorizontalRng: weapon.baseHorizontalRng,
                fireRateMs: weapon.fireRateMs,
                multipliers: weapon.multipliers,
                updatedAt: new Date(),
            },
        });
    }
    console.log('Seed completed successfully!');
}

main().catch((err) => {
    console.error('Seed failed:', err);
    process.exit(1);
});
