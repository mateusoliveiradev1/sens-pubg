import { weaponSeeds } from '@/db/weapon-profile-seed';
import { getWeapon } from '@/game/pubg';
import { CURRENT_PUBG_PATCH_VERSION } from '@/game/pubg/patch';
import { getWeaponPatchProfile } from '@/game/pubg/weapon-patch-catalog';

export type WeaponVisualCategory = 'AR' | 'SMG' | 'DMR';

export type WeaponVisualLifecycleStatus = 'active' | 'removed' | 'deprecated';

export type WeaponSilhouetteId =
    | 'beryl-m762'
    | 'm416'
    | 'aug'
    | 'ace32'
    | 'akm'
    | 'scar-l'
    | 'g36c'
    | 'qbz'
    | 'k2'
    | 'groza'
    | 'famas'
    | 'm16a4'
    | 'mk47-mutant'
    | 'ump45'
    | 'vector'
    | 'micro-uzi'
    | 'mp5k'
    | 'pp-19-bizon'
    | 'tommy-gun'
    | 'js9'
    | 'p90'
    | 'mini14'
    | 'mk12'
    | 'sks'
    | 'slr'
    | 'dragunov'
    | 'qbu'
    | 'vss'
    | 'mk14';

export interface WeaponVisualRegistryEntry {
    readonly id: string;
    readonly slug: string;
    readonly displayName: string;
    readonly category: WeaponVisualCategory;
    readonly silhouetteId: WeaponSilhouetteId;
    readonly lifecycleStatus: WeaponVisualLifecycleStatus;
    readonly technicalAnalysisSupported: boolean;
    readonly technicalWeaponId?: string;
    readonly aliases: readonly string[];
}

const SEED_WEAPON_IDS = {
    'Beryl M762': 'beryl-m762',
    M416: 'm416',
    AUG: 'aug',
    ACE32: 'ace32',
    AKM: 'akm',
    'SCAR-L': 'scar-l',
    G36C: 'g36c',
    QBZ: 'qbz',
    K2: 'k2',
    Groza: 'groza',
    FAMAS: 'famas',
    M16A4: 'm16a4',
    'Mk47 Mutant': 'mk47-mutant',
    UMP45: 'ump45',
    Vector: 'vector',
    'Micro UZI': 'micro-uzi',
    MP5K: 'mp5k',
    'PP-19 Bizon': 'pp-19-bizon',
    'Tommy Gun': 'tommy-gun',
    JS9: 'js9',
    P90: 'p90',
    Mini14: 'mini14',
    Mk12: 'mk12',
    SKS: 'sks',
    SLR: 'slr',
    Dragunov: 'dragunov',
    QBU: 'qbu',
    VSS: 'vss',
    Mk14: 'mk14',
} as const satisfies Record<(typeof weaponSeeds)[number]['name'], WeaponSilhouetteId>;

const EXTRA_ALIASES: Partial<Record<WeaponSilhouetteId, readonly string[]>> = {
    mini14: ['mini-14', 'mini 14'],
    'mk47-mutant': ['mk47', 'mutant'],
    'pp-19-bizon': ['pp19', 'bizon'],
    'micro-uzi': ['uzi'],
    'beryl-m762': ['beryl', 'm762'],
    'scar-l': ['scarl', 'scar l'],
};

export function normalizeWeaponVisualKey(value: string): string {
    return value
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '');
}

function buildEntry(seed: (typeof weaponSeeds)[number]): WeaponVisualRegistryEntry {
    const slug = SEED_WEAPON_IDS[seed.name];
    const technicalWeapon = getWeapon(seed.name);
    const patchProfile = getWeaponPatchProfile(CURRENT_PUBG_PATCH_VERSION, slug);
    const lifecycleStatus = patchProfile?.availability.status ?? 'active';
    const aliases = [
        slug,
        seed.name,
        normalizeWeaponVisualKey(slug),
        normalizeWeaponVisualKey(seed.name),
        ...(EXTRA_ALIASES[slug] ?? []),
    ];

    return {
        id: slug,
        slug,
        displayName: seed.name,
        category: seed.category,
        silhouetteId: slug,
        lifecycleStatus,
        technicalAnalysisSupported: Boolean(technicalWeapon),
        ...(technicalWeapon ? { technicalWeaponId: technicalWeapon.id } : {}),
        aliases,
    };
}

export const weaponVisualRegistry = weaponSeeds.map(buildEntry) as readonly WeaponVisualRegistryEntry[];

const LOOKUP = new Map<string, WeaponVisualRegistryEntry>(
    weaponVisualRegistry.flatMap((entry) =>
        entry.aliases.map((alias) => [normalizeWeaponVisualKey(alias), entry] as const)
    )
);

export function resolveWeaponVisualEntry(input: {
    readonly weaponId?: string | null | undefined;
    readonly weaponName?: string | null | undefined;
}): WeaponVisualRegistryEntry | undefined {
    const keys = [input.weaponId, input.weaponName].filter((value): value is string => Boolean(value?.trim()));

    for (const key of keys) {
        const match = LOOKUP.get(normalizeWeaponVisualKey(key));
        if (match) {
            return match;
        }
    }

    return undefined;
}

export function getWeaponVisualEntry(input: string): WeaponVisualRegistryEntry | undefined {
    return resolveWeaponVisualEntry({ weaponId: input, weaponName: input });
}

export function isSeedWeaponSilhouetteId(value: string): value is WeaponSilhouetteId {
    return weaponVisualRegistry.some((entry) => entry.silhouetteId === value);
}
