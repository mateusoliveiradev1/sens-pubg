import type {
    WeaponProfileAttachmentModifier,
    WeaponProfileAttachmentSlot,
    WeaponProfileCanonical,
    WeaponProfileLegacyGripMultiplier,
    WeaponProfileLegacyMultipliers,
} from './schema';

export interface WeaponSeed {
    readonly name: string;
    readonly category: 'AR' | 'SMG' | 'DMR';
    readonly baseVerticalRecoil: number;
    readonly baseHorizontalRng: number;
    readonly fireRateMs: number;
    readonly attachments: readonly WeaponProfileAttachmentSlot[];
    readonly multipliers: WeaponProfileLegacyMultipliers;
}

const LEGACY_ATTACHMENT_IDS = {
    muzzle_brake: 'muzzle-brake',
    compensator: 'compensator',
    heavy_stock: 'heavy-stock',
    vertical_grip: 'vertical-grip',
    half_grip: 'half-grip',
    tilted_grip: 'tilted-grip',
} as const;

const LEGACY_ATTACHMENT_SLOTS: Partial<Record<keyof typeof LEGACY_ATTACHMENT_IDS, WeaponProfileAttachmentSlot>> = {
    muzzle_brake: 'muzzle',
    compensator: 'muzzle',
    heavy_stock: 'stock',
    vertical_grip: 'grip',
    half_grip: 'grip',
    tilted_grip: 'grip',
};

const FULL_GRIP_MULTIPLIERS = {
    vertical_grip: { vertical: 0.85, horizontal: 1.0 },
    half_grip: { vertical: 0.95, horizontal: 0.85 },
    tilted_grip: { vertical: 0.88, horizontal: 0.94 },
} as const satisfies Pick<WeaponProfileLegacyMultipliers, 'vertical_grip' | 'half_grip' | 'tilted_grip'>;

const VERTICAL_ONLY_GRIP_MULTIPLIERS = {
    vertical_grip: { vertical: 0.85, horizontal: 1.0 },
    half_grip: { vertical: 1.0, horizontal: 1.0 },
    tilted_grip: { vertical: 1.0, horizontal: 1.0 },
} as const satisfies Pick<WeaponProfileLegacyMultipliers, 'vertical_grip' | 'half_grip' | 'tilted_grip'>;

const NO_GRIP_MULTIPLIERS = {
    vertical_grip: { vertical: 1.0, horizontal: 1.0 },
    half_grip: { vertical: 1.0, horizontal: 1.0 },
    tilted_grip: { vertical: 1.0, horizontal: 1.0 },
} as const satisfies Pick<WeaponProfileLegacyMultipliers, 'vertical_grip' | 'half_grip' | 'tilted_grip'>;

function isGripMultiplier(value: unknown): value is WeaponProfileLegacyGripMultiplier {
    return typeof value === 'object'
        && value !== null
        && typeof (value as WeaponProfileLegacyGripMultiplier).vertical === 'number'
        && typeof (value as WeaponProfileLegacyGripMultiplier).horizontal === 'number';
}

function normalizeAttachmentProfile(
    key: string,
    value: unknown
): [string, WeaponProfileAttachmentModifier] | null {
    const legacyKey = key as keyof typeof LEGACY_ATTACHMENT_IDS;
    const attachmentId = LEGACY_ATTACHMENT_IDS[legacyKey] ?? key.replace(/_/g, '-');
    const slot = LEGACY_ATTACHMENT_SLOTS[legacyKey];

    if (!slot) {
        return null;
    }

    if (typeof value === 'number') {
        return [
            attachmentId,
            {
                slot,
                multipliers: {
                    verticalRecoil: value,
                },
            },
        ];
    }

    if (isGripMultiplier(value)) {
        return [
            attachmentId,
            {
                slot,
                multipliers: {
                    verticalRecoil: value.vertical,
                    horizontalRecoil: value.horizontal,
                },
            },
        ];
    }

    return null;
}

export function buildCanonicalWeaponProfile(
    weapon: WeaponSeed,
    sourcePatchVersion = 'legacy-unknown'
): WeaponProfileCanonical {
    const attachmentProfiles = Object.fromEntries(
        Object.entries(weapon.multipliers)
            .map(([key, value]) => normalizeAttachmentProfile(key, value))
            .filter((entry): entry is [string, WeaponProfileAttachmentModifier] => entry !== null)
    );

    return {
        schemaVersion: 1,
        sourcePatchVersion,
        baseStats: {
            verticalRecoil: weapon.baseVerticalRecoil,
            horizontalRecoil: weapon.baseHorizontalRng,
            fireRateMs: weapon.fireRateMs,
        },
        supportedSlots: [...weapon.attachments],
        attachmentProfiles,
    };
}

export const weaponSeeds = [
    {
        name: 'Beryl M762', category: 'AR', baseVerticalRecoil: 1.45, baseHorizontalRng: 1.30, fireRateMs: 86,
        attachments: ['muzzle', 'grip'],
        multipliers: { muzzle_brake: 0.85, compensator: 0.90, heavy_stock: 0.92, ...FULL_GRIP_MULTIPLIERS },
    },
    {
        name: 'M416', category: 'AR', baseVerticalRecoil: 1.15, baseHorizontalRng: 1.10, fireRateMs: 86,
        attachments: ['muzzle', 'grip', 'stock'],
        multipliers: { muzzle_brake: 0.88, compensator: 0.90, heavy_stock: 0.90, ...FULL_GRIP_MULTIPLIERS },
    },
    {
        name: 'AUG', category: 'AR', baseVerticalRecoil: 1.20, baseHorizontalRng: 1.15, fireRateMs: 84,
        attachments: ['muzzle', 'grip'],
        multipliers: { muzzle_brake: 0.88, compensator: 0.90, heavy_stock: 0.90, ...FULL_GRIP_MULTIPLIERS },
    },
    {
        name: 'ACE32', category: 'AR', baseVerticalRecoil: 1.35, baseHorizontalRng: 1.25, fireRateMs: 88,
        attachments: ['muzzle', 'grip', 'stock'],
        multipliers: { muzzle_brake: 0.85, compensator: 0.90, heavy_stock: 0.92, ...FULL_GRIP_MULTIPLIERS },
    },
    {
        name: 'AKM', category: 'AR', baseVerticalRecoil: 1.30, baseHorizontalRng: 1.20, fireRateMs: 100,
        attachments: ['muzzle'],
        multipliers: { muzzle_brake: 0.85, compensator: 0.90, heavy_stock: 1.0, ...NO_GRIP_MULTIPLIERS },
    },
    {
        name: 'SCAR-L', category: 'AR', baseVerticalRecoil: 1.05, baseHorizontalRng: 1.05, fireRateMs: 96,
        attachments: ['muzzle', 'grip'],
        multipliers: { muzzle_brake: 0.88, compensator: 0.90, heavy_stock: 1.0, ...FULL_GRIP_MULTIPLIERS },
    },
    {
        name: 'G36C', category: 'AR', baseVerticalRecoil: 1.10, baseHorizontalRng: 1.08, fireRateMs: 86,
        attachments: ['muzzle', 'grip'],
        multipliers: { muzzle_brake: 0.88, compensator: 0.90, heavy_stock: 1.0, ...FULL_GRIP_MULTIPLIERS },
    },
    {
        name: 'QBZ', category: 'AR', baseVerticalRecoil: 1.12, baseHorizontalRng: 1.10, fireRateMs: 92,
        attachments: ['muzzle', 'grip'],
        multipliers: { muzzle_brake: 0.88, compensator: 0.90, heavy_stock: 1.0, ...FULL_GRIP_MULTIPLIERS },
    },
    {
        name: 'K2', category: 'AR', baseVerticalRecoil: 1.18, baseHorizontalRng: 1.12, fireRateMs: 88,
        attachments: ['muzzle'],
        multipliers: { muzzle_brake: 0.88, compensator: 0.90, heavy_stock: 1.0, ...NO_GRIP_MULTIPLIERS },
    },
    {
        name: 'Groza', category: 'AR', baseVerticalRecoil: 1.25, baseHorizontalRng: 1.15, fireRateMs: 80,
        attachments: ['muzzle'],
        multipliers: { muzzle_brake: 1.0, compensator: 1.0, heavy_stock: 1.0, ...NO_GRIP_MULTIPLIERS },
    },
    {
        name: 'FAMAS', category: 'AR', baseVerticalRecoil: 1.15, baseHorizontalRng: 1.05, fireRateMs: 66,
        attachments: ['muzzle'],
        multipliers: { muzzle_brake: 1.0, compensator: 1.0, heavy_stock: 1.0, ...NO_GRIP_MULTIPLIERS },
    },
    {
        name: 'M16A4', category: 'AR', baseVerticalRecoil: 1.20, baseHorizontalRng: 1.05, fireRateMs: 75,
        attachments: ['muzzle', 'stock'],
        multipliers: { muzzle_brake: 0.85, compensator: 0.90, heavy_stock: 0.90, ...NO_GRIP_MULTIPLIERS },
    },
    {
        name: 'Mk47 Mutant', category: 'AR', baseVerticalRecoil: 1.30, baseHorizontalRng: 1.10, fireRateMs: 100,
        attachments: ['muzzle', 'grip', 'stock'],
        multipliers: { muzzle_brake: 0.85, compensator: 0.90, heavy_stock: 0.90, ...FULL_GRIP_MULTIPLIERS },
    },
    {
        name: 'UMP45', category: 'SMG', baseVerticalRecoil: 0.85, baseHorizontalRng: 0.80, fireRateMs: 92,
        attachments: ['muzzle', 'grip'],
        multipliers: { muzzle_brake: 1.0, compensator: 0.90, heavy_stock: 1.0, ...FULL_GRIP_MULTIPLIERS },
    },
    {
        name: 'Vector', category: 'SMG', baseVerticalRecoil: 0.95, baseHorizontalRng: 0.85, fireRateMs: 55,
        attachments: ['muzzle', 'grip', 'stock'],
        multipliers: { muzzle_brake: 1.0, compensator: 0.90, heavy_stock: 0.90, ...FULL_GRIP_MULTIPLIERS },
    },
    {
        name: 'Micro UZI', category: 'SMG', baseVerticalRecoil: 0.75, baseHorizontalRng: 0.70, fireRateMs: 48,
        attachments: ['muzzle', 'stock'],
        multipliers: { muzzle_brake: 1.0, compensator: 0.90, heavy_stock: 0.90, ...NO_GRIP_MULTIPLIERS },
    },
    {
        name: 'MP5K', category: 'SMG', baseVerticalRecoil: 0.90, baseHorizontalRng: 0.82, fireRateMs: 66,
        attachments: ['muzzle', 'grip', 'stock'],
        multipliers: { muzzle_brake: 1.0, compensator: 0.90, heavy_stock: 0.90, ...FULL_GRIP_MULTIPLIERS },
    },
    {
        name: 'PP-19 Bizon', category: 'SMG', baseVerticalRecoil: 0.80, baseHorizontalRng: 0.75, fireRateMs: 86,
        attachments: ['muzzle'],
        multipliers: { muzzle_brake: 1.0, compensator: 0.90, heavy_stock: 1.0, ...NO_GRIP_MULTIPLIERS },
    },
    {
        name: 'Tommy Gun', category: 'SMG', baseVerticalRecoil: 1.00, baseHorizontalRng: 0.90, fireRateMs: 86,
        attachments: ['muzzle', 'grip'],
        multipliers: { muzzle_brake: 1.0, compensator: 1.0, heavy_stock: 1.0, ...VERTICAL_ONLY_GRIP_MULTIPLIERS },
    },
    {
        name: 'JS9', category: 'SMG', baseVerticalRecoil: 0.70, baseHorizontalRng: 0.65, fireRateMs: 66,
        attachments: ['muzzle'],
        multipliers: { muzzle_brake: 1.0, compensator: 0.90, heavy_stock: 1.0, ...NO_GRIP_MULTIPLIERS },
    },
    {
        name: 'P90', category: 'SMG', baseVerticalRecoil: 0.60, baseHorizontalRng: 0.60, fireRateMs: 60,
        attachments: [],
        multipliers: { muzzle_brake: 1.0, compensator: 1.0, heavy_stock: 1.0, ...NO_GRIP_MULTIPLIERS },
    },
    {
        name: 'Mini14', category: 'DMR', baseVerticalRecoil: 1.40, baseHorizontalRng: 1.10, fireRateMs: 100,
        attachments: ['muzzle'],
        multipliers: { muzzle_brake: 0.85, compensator: 0.90, heavy_stock: 1.0, ...NO_GRIP_MULTIPLIERS },
    },
    {
        name: 'Mk12', category: 'DMR', baseVerticalRecoil: 1.35, baseHorizontalRng: 1.05, fireRateMs: 100,
        attachments: ['muzzle', 'grip'],
        multipliers: { muzzle_brake: 0.85, compensator: 0.90, heavy_stock: 1.0, ...FULL_GRIP_MULTIPLIERS },
    },
    {
        name: 'SKS', category: 'DMR', baseVerticalRecoil: 1.70, baseHorizontalRng: 1.30, fireRateMs: 90,
        attachments: ['muzzle', 'grip', 'stock'],
        multipliers: { muzzle_brake: 0.85, compensator: 0.90, heavy_stock: 0.90, ...FULL_GRIP_MULTIPLIERS },
    },
    {
        name: 'SLR', category: 'DMR', baseVerticalRecoil: 1.85, baseHorizontalRng: 1.40, fireRateMs: 100,
        attachments: ['muzzle'],
        multipliers: { muzzle_brake: 0.85, compensator: 0.90, heavy_stock: 0.90, ...NO_GRIP_MULTIPLIERS },
    },
    {
        name: 'Dragunov', category: 'DMR', baseVerticalRecoil: 1.95, baseHorizontalRng: 1.25, fireRateMs: 150,
        attachments: ['muzzle'],
        multipliers: { muzzle_brake: 0.85, compensator: 0.90, heavy_stock: 0.90, ...NO_GRIP_MULTIPLIERS },
    },
    {
        name: 'QBU', category: 'DMR', baseVerticalRecoil: 1.38, baseHorizontalRng: 1.08, fireRateMs: 100,
        attachments: ['muzzle'],
        multipliers: { muzzle_brake: 0.85, compensator: 0.90, heavy_stock: 1.0, ...NO_GRIP_MULTIPLIERS },
    },
    {
        name: 'VSS', category: 'DMR', baseVerticalRecoil: 1.25, baseHorizontalRng: 1.15, fireRateMs: 86,
        attachments: ['stock'],
        multipliers: { muzzle_brake: 1.0, compensator: 1.0, heavy_stock: 0.90, ...NO_GRIP_MULTIPLIERS },
    },
    {
        name: 'Mk14', category: 'DMR', baseVerticalRecoil: 2.10, baseHorizontalRng: 1.80, fireRateMs: 90,
        attachments: ['muzzle', 'stock'],
        multipliers: { muzzle_brake: 0.85, compensator: 0.90, heavy_stock: 0.92, ...NO_GRIP_MULTIPLIERS },
    },
] as const satisfies readonly WeaponSeed[];
