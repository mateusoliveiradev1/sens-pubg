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
    readonly pubgApiAssetId?: string;
    readonly pubgApiImagePath?: string;
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

const PUBG_API_WEAPON_IMAGE_FILES: Partial<Record<WeaponSilhouetteId, string>> = {
    'beryl-m762': 'Item_Weapon_BerylM762_C.png',
    m416: 'Item_Weapon_HK416_C.png',
    aug: 'Item_Weapon_AUG_C.png',
    ace32: 'Item_Weapon_ACE32_C.png',
    akm: 'Item_Weapon_AK47_C.png',
    'scar-l': 'Item_Weapon_SCAR-L_C.png',
    g36c: 'Item_Weapon_G36C_C.png',
    qbz: 'Item_Weapon_QBZ95_C.png',
    k2: 'Item_Weapon_K2_C.png',
    groza: 'Item_Weapon_Groza_C.png',
    famas: 'Item_Weapon_FAMASG2_C.png',
    m16a4: 'Item_Weapon_M16A4_C.png',
    'mk47-mutant': 'Item_Weapon_Mk47Mutant_C.png',
    ump45: 'Item_Weapon_UMP_C.png',
    vector: 'Item_Weapon_Vector_C.png',
    'micro-uzi': 'Item_Weapon_UZI_C.png',
    mp5k: 'Item_Weapon_MP5K_C.png',
    'pp-19-bizon': 'Item_Weapon_BizonPP19_C.png',
    'tommy-gun': 'Item_Weapon_Thompson_C.png',
    p90: 'Item_Weapon_P90_C.png',
    mini14: 'Item_Weapon_Mini14_C.png',
    mk12: 'Item_Weapon_Mk12_C.png',
    sks: 'Item_Weapon_SKS_C.png',
    slr: 'Item_Weapon_FNFal_C.png',
    dragunov: 'Item_Weapon_Dragunov_C.png',
    qbu: 'Item_Weapon_QBU88_C.png',
    vss: 'Item_Weapon_VSS_C.png',
    mk14: 'Item_Weapon_Mk14_C.png',
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
    const pubgApiAssetId = PUBG_API_WEAPON_IMAGE_FILES[slug];
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
        ...(pubgApiAssetId ? {
            pubgApiAssetId,
            pubgApiImagePath: `/pubg-api-assets/weapons/main/${slug}.png`,
        } : {}),
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
