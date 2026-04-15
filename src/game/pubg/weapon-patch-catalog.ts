import { CURRENT_PUBG_PATCH_VERSION, normalizePatchVersion, UNKNOWN_PUBG_PATCH_VERSION } from './patch';
import { weaponSeeds } from '@/db/weapon-profile-seed';

export type WeaponPatchCategory = 'AR' | 'SMG' | 'DMR';
export type WeaponPatchAttachmentSlot = 'muzzle' | 'grip' | 'stock';
export type WeaponPatchLifecycleStatus = 'active' | 'deprecated' | 'removed';

export interface WeaponPatchLegacyGripMultiplier {
    readonly vertical: number;
    readonly horizontal: number;
}

export interface WeaponPatchLegacyMultipliers {
    readonly muzzle_brake?: number;
    readonly compensator?: number;
    readonly heavy_stock?: number;
    readonly vertical_grip?: WeaponPatchLegacyGripMultiplier;
    readonly half_grip?: WeaponPatchLegacyGripMultiplier;
    readonly [key: string]: unknown;
}

export interface WeaponRegistryDefinition {
    readonly weaponId: string;
    readonly name: string;
    readonly category: WeaponPatchCategory;
}

export interface WeaponAvailabilityDefinition {
    readonly status: WeaponPatchLifecycleStatus;
    readonly note?: string;
}

export interface WeaponPatchProfileDefinition extends WeaponRegistryDefinition {
    readonly patchVersion: string;
    readonly availability: WeaponAvailabilityDefinition;
    readonly baseVerticalRecoil: number;
    readonly baseHorizontalRng: number;
    readonly fireRateMs: number;
    readonly attachments: readonly WeaponPatchAttachmentSlot[];
    readonly multipliers: WeaponPatchLegacyMultipliers;
}

export interface WeaponPatchCatalogSnapshot {
    readonly patchVersion: string;
    readonly weapons: readonly WeaponPatchProfileDefinition[];
}

const LEGACY_WEAPON_IDS: Record<(typeof weaponSeeds)[number]['name'], string> = {
    'Beryl M762': 'beryl-m762',
    'M416': 'm416',
    'AUG': 'aug',
    'ACE32': 'ace32',
    'AKM': 'akm',
    'SCAR-L': 'scar-l',
    'G36C': 'g36c',
    'QBZ': 'qbz',
    'K2': 'k2',
    'Groza': 'groza',
    'FAMAS': 'famas',
    'M16A4': 'm16a4',
    'Mk47 Mutant': 'mk47-mutant',
    'UMP45': 'ump45',
    'Vector': 'vector',
    'Micro UZI': 'micro-uzi',
    'MP5K': 'mp5k',
    'PP-19 Bizon': 'pp-19-bizon',
    'Tommy Gun': 'tommy-gun',
    'JS9': 'js9',
    'P90': 'p90',
    'Mini14': 'mini14',
    'Mk12': 'mk12',
    'SKS': 'sks',
    'SLR': 'slr',
    'Dragunov': 'dragunov',
    'QBU': 'qbu',
    'VSS': 'vss',
    'Mk14': 'mk14',
};

function toRegistryDefinition(
    seed: (typeof weaponSeeds)[number]
): WeaponRegistryDefinition {
    return {
        weaponId: LEGACY_WEAPON_IDS[seed.name],
        name: seed.name,
        category: seed.category,
    };
}

function toPatchProfile(
    seed: (typeof weaponSeeds)[number],
    patchVersion: string,
    overrides?: Partial<Omit<WeaponPatchProfileDefinition, keyof WeaponRegistryDefinition | 'patchVersion'>>
): WeaponPatchProfileDefinition {
    const registry = toRegistryDefinition(seed);

    return {
        ...registry,
        patchVersion,
        availability: overrides?.availability ?? { status: 'active' },
        baseVerticalRecoil: overrides?.baseVerticalRecoil ?? seed.baseVerticalRecoil,
        baseHorizontalRng: overrides?.baseHorizontalRng ?? seed.baseHorizontalRng,
        fireRateMs: overrides?.fireRateMs ?? seed.fireRateMs,
        attachments: overrides?.attachments ?? seed.attachments,
        multipliers: overrides?.multipliers ?? seed.multipliers,
    };
}

function buildLegacySnapshot(patchVersion: string): readonly WeaponPatchProfileDefinition[] {
    return weaponSeeds.map((seed) => toPatchProfile(seed, patchVersion));
}

const legacySnapshot361 = buildLegacySnapshot('36.1');
const legacySnapshotUnknown = buildLegacySnapshot(UNKNOWN_PUBG_PATCH_VERSION);

const currentPatchOverrides: Partial<Record<string, Partial<Omit<WeaponPatchProfileDefinition, keyof WeaponRegistryDefinition | 'patchVersion'>>>> = {
    'beryl-m762': {
        baseVerticalRecoil: 1.38,
        baseHorizontalRng: 1.24,
    },
    'm416': {
        baseVerticalRecoil: 1.12,
        baseHorizontalRng: 1.06,
    },
    'ace32': {
        baseVerticalRecoil: 1.32,
        baseHorizontalRng: 1.22,
    },
    'aug': {
        baseVerticalRecoil: 1.16,
        baseHorizontalRng: 1.10,
    },
    'qbz': {
        availability: {
            status: 'removed',
            note: 'Removed from the current canonical patch dataset.',
        },
    },
    'qbu': {
        availability: {
            status: 'deprecated',
            note: 'Kept only for historical lookups outside the current ranked pool.',
        },
    },
};

const currentSnapshot411 = weaponSeeds.map((seed) =>
    toPatchProfile(seed, CURRENT_PUBG_PATCH_VERSION, currentPatchOverrides[LEGACY_WEAPON_IDS[seed.name]])
);

export const WEAPON_REGISTRY = weaponSeeds.map(toRegistryDefinition) as readonly WeaponRegistryDefinition[];

export const WEAPON_CATALOG_SNAPSHOTS: readonly WeaponPatchCatalogSnapshot[] = [
    {
        patchVersion: UNKNOWN_PUBG_PATCH_VERSION,
        weapons: legacySnapshotUnknown,
    },
    {
        patchVersion: '36.1',
        weapons: legacySnapshot361,
    },
    {
        patchVersion: CURRENT_PUBG_PATCH_VERSION,
        weapons: currentSnapshot411,
    },
] as const;

export const SUPPORTED_WEAPON_PATCHES = WEAPON_CATALOG_SNAPSHOTS.map(
    (snapshot) => snapshot.patchVersion
);

function parsePatchVersion(version: string): [number, number] | null {
    const match = /^(\d+)\.(\d+)$/.exec(version.trim());
    if (!match) {
        return null;
    }

    return [Number(match[1]), Number(match[2])];
}

function comparePatchVersions(left: string, right: string): number {
    const parsedLeft = parsePatchVersion(left);
    const parsedRight = parsePatchVersion(right);

    if (!parsedLeft || !parsedRight) {
        return left.localeCompare(right, undefined, { numeric: true });
    }

    if (parsedLeft[0] !== parsedRight[0]) {
        return parsedLeft[0] - parsedRight[0];
    }

    return parsedLeft[1] - parsedRight[1];
}

export function getWeaponRegistry(): readonly WeaponRegistryDefinition[] {
    return WEAPON_REGISTRY;
}

export function resolveWeaponCatalogVersion(patchVersion: string): string {
    const normalized = normalizePatchVersion(patchVersion);
    const exact = WEAPON_CATALOG_SNAPSHOTS.find((snapshot) => snapshot.patchVersion === normalized);
    if (exact) {
        return exact.patchVersion;
    }

    const sortableSnapshots = WEAPON_CATALOG_SNAPSHOTS.filter(
        (snapshot) => snapshot.patchVersion !== UNKNOWN_PUBG_PATCH_VERSION
    );

    const sorted = [...sortableSnapshots].sort((left, right) =>
        comparePatchVersions(left.patchVersion, right.patchVersion)
    );

    let resolved = sorted[0]?.patchVersion ?? CURRENT_PUBG_PATCH_VERSION;
    for (const snapshot of sorted) {
        if (comparePatchVersions(snapshot.patchVersion, normalized) <= 0) {
            resolved = snapshot.patchVersion;
        }
    }

    return resolved;
}

export function getWeaponCatalog(patchVersion: string): WeaponPatchCatalogSnapshot {
    const resolvedVersion = resolveWeaponCatalogVersion(patchVersion);
    return WEAPON_CATALOG_SNAPSHOTS.find((snapshot) => snapshot.patchVersion === resolvedVersion)
        ?? WEAPON_CATALOG_SNAPSHOTS[WEAPON_CATALOG_SNAPSHOTS.length - 1]!;
}

export function getWeaponPatchProfile(
    patchVersion: string,
    weaponId: string
): WeaponPatchProfileDefinition | undefined {
    return getWeaponCatalog(patchVersion).weapons.find((weapon) => weapon.weaponId === weaponId);
}
