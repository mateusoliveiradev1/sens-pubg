/**
 * PUBG Weapon Data — Base de dados completa de armas com curvas de recoil.
 * Cada arma tem: fire rate, recoil pattern ({dx,dy}[] por tiro), dano, categoria.
 * Todos os dados são `as const` para inferência de tipos literal.
 */

// ═══════════════════════════════════════════
// Types
// ═══════════════════════════════════════════

export interface RecoilVector {
    readonly dx: number; // Deslocamento horizontal (px a 1080p). Positivo = direita.
    readonly dy: number; // Deslocamento vertical (px a 1080p). Positivo = cima (recoil sobe).
}

export type WeaponCategory = 'ar' | 'smg' | 'dmr' | 'lmg' | 'sr' | 'shotgun' | 'pistol';

export interface WeaponData {
    readonly id: string;
    readonly name: string;
    readonly category: WeaponCategory;
    readonly fireRateRPM: number;         // Rounds per minute
    readonly msPerShot: number;           // Intervalo em ms entre tiros
    readonly magazineSize: number;
    readonly damage: number;              // Dano base corpo
    readonly recoilPattern: readonly RecoilVector[];  // Vetor por tiro
    readonly horizontalNoiseBase: number; // Ruído horizontal base (desvio padrão)
    readonly verticalRecoilBase: number;  // Recoil vertical base (soma total)
}

// ═══════════════════════════════════════════
// Helper: Tempo entre tiros
// ═══════════════════════════════════════════

function rpmToMs(rpm: number): number {
    return Math.round(60_000 / rpm);
}

// ═══════════════════════════════════════════
// Assault Rifles
// ═══════════════════════════════════════════

const M416: WeaponData = {
    id: 'm416',
    name: 'M416',
    category: 'ar',
    fireRateRPM: 680,
    msPerShot: rpmToMs(680),
    magazineSize: 30,
    damage: 41,
    horizontalNoiseBase: 2.5,
    verticalRecoilBase: 180,
    recoilPattern: [
        { dx: 0, dy: 8 }, { dx: 1, dy: 10 }, { dx: -1, dy: 9 }, { dx: 2, dy: 11 },
        { dx: -1, dy: 10 }, { dx: 0, dy: 9 }, { dx: 1, dy: 8 }, { dx: -2, dy: 7 },
        { dx: 2, dy: 6 }, { dx: -1, dy: 7 }, { dx: 1, dy: 6 }, { dx: -2, dy: 5 },
        { dx: 2, dy: 5 }, { dx: 0, dy: 6 }, { dx: -1, dy: 5 }, { dx: 1, dy: 4 },
        { dx: -2, dy: 5 }, { dx: 2, dy: 4 }, { dx: 0, dy: 5 }, { dx: -1, dy: 4 },
        { dx: 1, dy: 3 }, { dx: -2, dy: 4 }, { dx: 2, dy: 3 }, { dx: 0, dy: 4 },
        { dx: -1, dy: 3 }, { dx: 1, dy: 3 }, { dx: -2, dy: 3 }, { dx: 2, dy: 2 },
        { dx: 0, dy: 3 }, { dx: -1, dy: 2 },
    ],
} as const;

const AKM: WeaponData = {
    id: 'akm',
    name: 'AKM',
    category: 'ar',
    fireRateRPM: 600,
    msPerShot: rpmToMs(600),
    magazineSize: 30,
    damage: 47,
    horizontalNoiseBase: 4.0,
    verticalRecoilBase: 240,
    recoilPattern: [
        { dx: 0, dy: 12 }, { dx: 2, dy: 14 }, { dx: -3, dy: 13 }, { dx: 3, dy: 15 },
        { dx: -2, dy: 12 }, { dx: 1, dy: 11 }, { dx: -3, dy: 10 }, { dx: 3, dy: 9 },
        { dx: -1, dy: 8 }, { dx: 2, dy: 7 }, { dx: -3, dy: 8 }, { dx: 3, dy: 7 },
        { dx: -2, dy: 6 }, { dx: 1, dy: 7 }, { dx: -3, dy: 6 }, { dx: 2, dy: 5 },
        { dx: -1, dy: 6 }, { dx: 3, dy: 5 }, { dx: -2, dy: 5 }, { dx: 1, dy: 4 },
        { dx: -3, dy: 5 }, { dx: 2, dy: 4 }, { dx: -1, dy: 4 }, { dx: 3, dy: 3 },
        { dx: -2, dy: 4 }, { dx: 1, dy: 3 }, { dx: -3, dy: 3 }, { dx: 2, dy: 3 },
        { dx: -1, dy: 2 }, { dx: 1, dy: 2 },
    ],
} as const;

const SCARL: WeaponData = {
    id: 'scar-l',
    name: 'SCAR-L',
    category: 'ar',
    fireRateRPM: 620,
    msPerShot: rpmToMs(620),
    magazineSize: 30,
    damage: 41,
    horizontalNoiseBase: 2.0,
    verticalRecoilBase: 170,
    recoilPattern: [
        { dx: 0, dy: 7 }, { dx: 1, dy: 9 }, { dx: -1, dy: 8 }, { dx: 1, dy: 10 },
        { dx: -1, dy: 9 }, { dx: 0, dy: 8 }, { dx: 1, dy: 7 }, { dx: -1, dy: 7 },
        { dx: 1, dy: 6 }, { dx: 0, dy: 6 }, { dx: -1, dy: 6 }, { dx: 1, dy: 5 },
        { dx: -1, dy: 5 }, { dx: 0, dy: 5 }, { dx: 1, dy: 5 }, { dx: -1, dy: 4 },
        { dx: 0, dy: 5 }, { dx: 1, dy: 4 }, { dx: -1, dy: 4 }, { dx: 0, dy: 4 },
        { dx: 1, dy: 3 }, { dx: -1, dy: 4 }, { dx: 0, dy: 3 }, { dx: 1, dy: 3 },
        { dx: -1, dy: 3 }, { dx: 0, dy: 3 }, { dx: 1, dy: 2 }, { dx: -1, dy: 3 },
        { dx: 0, dy: 2 }, { dx: 1, dy: 2 },
    ],
} as const;

const BERYLM762: WeaponData = {
    id: 'beryl-m762',
    name: 'Beryl M762',
    category: 'ar',
    fireRateRPM: 700,
    msPerShot: rpmToMs(700),
    magazineSize: 30,
    damage: 46,
    horizontalNoiseBase: 5.0,
    verticalRecoilBase: 260,
    recoilPattern: [
        { dx: 0, dy: 14 }, { dx: 3, dy: 16 }, { dx: -4, dy: 15 }, { dx: 4, dy: 17 },
        { dx: -3, dy: 14 }, { dx: 2, dy: 13 }, { dx: -4, dy: 11 }, { dx: 3, dy: 10 },
        { dx: -2, dy: 9 }, { dx: 4, dy: 8 }, { dx: -3, dy: 9 }, { dx: 3, dy: 7 },
        { dx: -2, dy: 7 }, { dx: 4, dy: 6 }, { dx: -3, dy: 7 }, { dx: 2, dy: 6 },
        { dx: -4, dy: 5 }, { dx: 3, dy: 5 }, { dx: -2, dy: 5 }, { dx: 4, dy: 4 },
        { dx: -3, dy: 5 }, { dx: 2, dy: 4 }, { dx: -4, dy: 4 }, { dx: 3, dy: 3 },
        { dx: -2, dy: 4 }, { dx: 4, dy: 3 }, { dx: -3, dy: 3 }, { dx: 2, dy: 3 },
        { dx: -4, dy: 2 }, { dx: 3, dy: 2 },
    ],
} as const;

const G36C: WeaponData = {
    id: 'g36c',
    name: 'G36C',
    category: 'ar',
    fireRateRPM: 700,
    msPerShot: rpmToMs(700),
    magazineSize: 30,
    damage: 41,
    horizontalNoiseBase: 2.2,
    verticalRecoilBase: 175,
    recoilPattern: [
        { dx: 0, dy: 8 }, { dx: 1, dy: 10 }, { dx: -1, dy: 9 }, { dx: 2, dy: 10 },
        { dx: -1, dy: 9 }, { dx: 0, dy: 8 }, { dx: 1, dy: 7 }, { dx: -2, dy: 7 },
        { dx: 1, dy: 6 }, { dx: -1, dy: 6 }, { dx: 2, dy: 5 }, { dx: -1, dy: 6 },
        { dx: 1, dy: 5 }, { dx: 0, dy: 5 }, { dx: -1, dy: 5 }, { dx: 1, dy: 4 },
        { dx: -1, dy: 4 }, { dx: 2, dy: 4 }, { dx: -1, dy: 4 }, { dx: 0, dy: 4 },
        { dx: 1, dy: 3 }, { dx: -1, dy: 4 }, { dx: 1, dy: 3 }, { dx: 0, dy: 3 },
        { dx: -1, dy: 3 }, { dx: 1, dy: 3 }, { dx: -1, dy: 2 }, { dx: 0, dy: 3 },
        { dx: 1, dy: 2 }, { dx: -1, dy: 2 },
    ],
} as const;

const ACE32: WeaponData = {
    id: 'ace32',
    name: 'ACE32',
    category: 'ar',
    fireRateRPM: 680,
    msPerShot: rpmToMs(680),
    magazineSize: 35,
    damage: 43,
    horizontalNoiseBase: 2.8,
    verticalRecoilBase: 190,
    recoilPattern: [
        { dx: 0, dy: 9 }, { dx: 1, dy: 11 }, { dx: -2, dy: 10 }, { dx: 2, dy: 12 },
        { dx: -1, dy: 10 }, { dx: 1, dy: 9 }, { dx: -2, dy: 8 }, { dx: 2, dy: 7 },
        { dx: -1, dy: 7 }, { dx: 1, dy: 6 }, { dx: -2, dy: 6 }, { dx: 2, dy: 5 },
        { dx: -1, dy: 6 }, { dx: 1, dy: 5 }, { dx: -2, dy: 5 }, { dx: 2, dy: 4 },
        { dx: -1, dy: 5 }, { dx: 1, dy: 4 }, { dx: -2, dy: 4 }, { dx: 2, dy: 3 },
        { dx: -1, dy: 4 }, { dx: 1, dy: 3 }, { dx: -2, dy: 3 }, { dx: 2, dy: 3 },
        { dx: -1, dy: 3 }, { dx: 1, dy: 2 }, { dx: -2, dy: 3 }, { dx: 2, dy: 2 },
        { dx: -1, dy: 2 }, { dx: 1, dy: 2 }, { dx: -2, dy: 2 }, { dx: 2, dy: 1 },
        { dx: -1, dy: 2 }, { dx: 1, dy: 1 }, { dx: 0, dy: 1 },
    ],
} as const;

// ═══════════════════════════════════════════
// SMGs
// ═══════════════════════════════════════════

const UMP45: WeaponData = {
    id: 'ump45',
    name: 'UMP45',
    category: 'smg',
    fireRateRPM: 650,
    msPerShot: rpmToMs(650),
    magazineSize: 25,
    damage: 39,
    horizontalNoiseBase: 1.8,
    verticalRecoilBase: 140,
    recoilPattern: [
        { dx: 0, dy: 6 }, { dx: 1, dy: 7 }, { dx: -1, dy: 7 }, { dx: 1, dy: 8 },
        { dx: -1, dy: 7 }, { dx: 0, dy: 6 }, { dx: 1, dy: 5 }, { dx: -1, dy: 5 },
        { dx: 1, dy: 5 }, { dx: 0, dy: 4 }, { dx: -1, dy: 4 }, { dx: 1, dy: 4 },
        { dx: 0, dy: 4 }, { dx: -1, dy: 3 }, { dx: 1, dy: 3 }, { dx: 0, dy: 3 },
        { dx: -1, dy: 3 }, { dx: 1, dy: 3 }, { dx: 0, dy: 3 }, { dx: -1, dy: 2 },
        { dx: 1, dy: 2 }, { dx: 0, dy: 2 }, { dx: -1, dy: 2 }, { dx: 1, dy: 2 },
        { dx: 0, dy: 2 },
    ],
} as const;

const VECTOR: WeaponData = {
    id: 'vector',
    name: 'Vector',
    category: 'smg',
    fireRateRPM: 1100,
    msPerShot: rpmToMs(1100),
    magazineSize: 25,
    damage: 31,
    horizontalNoiseBase: 1.5,
    verticalRecoilBase: 120,
    recoilPattern: [
        { dx: 0, dy: 5 }, { dx: 1, dy: 6 }, { dx: -1, dy: 5 }, { dx: 1, dy: 6 },
        { dx: 0, dy: 5 }, { dx: -1, dy: 5 }, { dx: 1, dy: 4 }, { dx: -1, dy: 4 },
        { dx: 0, dy: 4 }, { dx: 1, dy: 3 }, { dx: -1, dy: 3 }, { dx: 0, dy: 3 },
        { dx: 1, dy: 3 }, { dx: -1, dy: 2 }, { dx: 0, dy: 3 }, { dx: 1, dy: 2 },
        { dx: -1, dy: 2 }, { dx: 0, dy: 2 }, { dx: 1, dy: 2 }, { dx: -1, dy: 2 },
        { dx: 0, dy: 1 }, { dx: 1, dy: 2 }, { dx: -1, dy: 1 }, { dx: 0, dy: 1 },
        { dx: 1, dy: 1 },
    ],
} as const;

const MP5K: WeaponData = {
    id: 'mp5k',
    name: 'MP5K',
    category: 'smg',
    fireRateRPM: 900,
    msPerShot: rpmToMs(900),
    magazineSize: 30,
    damage: 33,
    horizontalNoiseBase: 1.5,
    verticalRecoilBase: 130,
    recoilPattern: [
        { dx: 0, dy: 5 }, { dx: 1, dy: 6 }, { dx: -1, dy: 6 }, { dx: 1, dy: 7 },
        { dx: -1, dy: 6 }, { dx: 0, dy: 5 }, { dx: 1, dy: 5 }, { dx: -1, dy: 4 },
        { dx: 1, dy: 4 }, { dx: 0, dy: 4 }, { dx: -1, dy: 3 }, { dx: 1, dy: 3 },
        { dx: 0, dy: 3 }, { dx: -1, dy: 3 }, { dx: 1, dy: 2 }, { dx: 0, dy: 3 },
        { dx: -1, dy: 2 }, { dx: 1, dy: 2 }, { dx: 0, dy: 2 }, { dx: -1, dy: 2 },
        { dx: 1, dy: 2 }, { dx: 0, dy: 1 }, { dx: -1, dy: 2 }, { dx: 1, dy: 1 },
        { dx: 0, dy: 1 }, { dx: -1, dy: 1 }, { dx: 1, dy: 1 }, { dx: 0, dy: 1 },
        { dx: -1, dy: 1 }, { dx: 1, dy: 1 },
    ],
} as const;

// ═══════════════════════════════════════════
// LMGs
// ═══════════════════════════════════════════

const DP28: WeaponData = {
    id: 'dp28',
    name: 'DP-28',
    category: 'lmg',
    fireRateRPM: 550,
    msPerShot: rpmToMs(550),
    magazineSize: 47,
    damage: 51,
    horizontalNoiseBase: 2.0,
    verticalRecoilBase: 200,
    recoilPattern: [
        { dx: 0, dy: 10 }, { dx: 1, dy: 12 }, { dx: -1, dy: 11 }, { dx: 1, dy: 12 },
        { dx: -1, dy: 10 }, { dx: 0, dy: 9 }, { dx: 1, dy: 8 }, { dx: -1, dy: 7 },
        { dx: 1, dy: 7 }, { dx: 0, dy: 6 }, { dx: -1, dy: 5 }, { dx: 1, dy: 5 },
        { dx: 0, dy: 5 }, { dx: -1, dy: 4 }, { dx: 1, dy: 4 }, { dx: 0, dy: 3 },
        { dx: -1, dy: 3 }, { dx: 1, dy: 3 }, { dx: 0, dy: 3 }, { dx: -1, dy: 2 },
        { dx: 1, dy: 2 }, { dx: 0, dy: 2 }, { dx: -1, dy: 2 }, { dx: 1, dy: 2 },
        { dx: 0, dy: 2 }, { dx: -1, dy: 1 }, { dx: 1, dy: 1 }, { dx: 0, dy: 1 },
        { dx: -1, dy: 1 }, { dx: 1, dy: 1 }, { dx: 0, dy: 1 }, { dx: -1, dy: 1 },
        { dx: 1, dy: 1 }, { dx: 0, dy: 1 }, { dx: -1, dy: 0 }, { dx: 1, dy: 0 },
        { dx: 0, dy: 1 }, { dx: -1, dy: 0 }, { dx: 1, dy: 0 }, { dx: 0, dy: 0 },
        { dx: -1, dy: 0 }, { dx: 1, dy: 0 }, { dx: 0, dy: 0 }, { dx: -1, dy: 0 },
        { dx: 1, dy: 0 }, { dx: 0, dy: 0 }, { dx: -1, dy: 0 },
    ],
} as const;

const M249: WeaponData = {
    id: 'm249',
    name: 'M249',
    category: 'lmg',
    fireRateRPM: 750,
    msPerShot: rpmToMs(750),
    magazineSize: 75,
    damage: 45,
    horizontalNoiseBase: 3.5,
    verticalRecoilBase: 220,
    recoilPattern: [
        { dx: 0, dy: 11 }, { dx: 2, dy: 13 }, { dx: -2, dy: 12 }, { dx: 3, dy: 14 },
        { dx: -2, dy: 11 }, { dx: 1, dy: 10 }, { dx: -3, dy: 9 }, { dx: 2, dy: 8 },
        { dx: -1, dy: 7 }, { dx: 3, dy: 7 }, { dx: -2, dy: 6 }, { dx: 1, dy: 6 },
        { dx: -3, dy: 5 }, { dx: 2, dy: 5 }, { dx: -1, dy: 4 }, { dx: 3, dy: 4 },
        { dx: -2, dy: 4 }, { dx: 1, dy: 3 }, { dx: -3, dy: 3 }, { dx: 2, dy: 3 },
        { dx: -1, dy: 2 }, { dx: 3, dy: 2 }, { dx: -2, dy: 2 }, { dx: 1, dy: 2 },
        { dx: -3, dy: 1 }, { dx: 2, dy: 1 }, { dx: -1, dy: 1 }, { dx: 3, dy: 1 },
        { dx: -2, dy: 1 }, { dx: 1, dy: 0 },
    ],
} as const;

// ═══════════════════════════════════════════
// DMRs
// ═══════════════════════════════════════════

const MINI14: WeaponData = {
    id: 'mini14',
    name: 'Mini 14',
    category: 'dmr',
    fireRateRPM: 450,
    msPerShot: rpmToMs(450),
    magazineSize: 20,
    damage: 46,
    horizontalNoiseBase: 1.0,
    verticalRecoilBase: 100,
    recoilPattern: [
        { dx: 0, dy: 12 }, { dx: 1, dy: 10 }, { dx: -1, dy: 8 }, { dx: 1, dy: 7 },
        { dx: 0, dy: 6 }, { dx: -1, dy: 5 }, { dx: 1, dy: 4 }, { dx: 0, dy: 4 },
        { dx: -1, dy: 3 }, { dx: 1, dy: 3 }, { dx: 0, dy: 2 }, { dx: -1, dy: 2 },
        { dx: 1, dy: 2 }, { dx: 0, dy: 1 }, { dx: -1, dy: 1 }, { dx: 1, dy: 1 },
        { dx: 0, dy: 1 }, { dx: -1, dy: 1 }, { dx: 1, dy: 0 }, { dx: 0, dy: 0 },
    ],
} as const;

const SKS: WeaponData = {
    id: 'sks',
    name: 'SKS',
    category: 'dmr',
    fireRateRPM: 400,
    msPerShot: rpmToMs(400),
    magazineSize: 20,
    damage: 53,
    horizontalNoiseBase: 2.0,
    verticalRecoilBase: 150,
    recoilPattern: [
        { dx: 0, dy: 18 }, { dx: 2, dy: 15 }, { dx: -2, dy: 12 }, { dx: 2, dy: 10 },
        { dx: -1, dy: 8 }, { dx: 1, dy: 7 }, { dx: -2, dy: 6 }, { dx: 2, dy: 5 },
        { dx: -1, dy: 4 }, { dx: 1, dy: 3 }, { dx: 0, dy: 3 }, { dx: -1, dy: 2 },
        { dx: 1, dy: 2 }, { dx: 0, dy: 2 }, { dx: -1, dy: 1 }, { dx: 1, dy: 1 },
        { dx: 0, dy: 1 }, { dx: -1, dy: 1 }, { dx: 1, dy: 0 }, { dx: 0, dy: 0 },
    ],
} as const;

const SLR: WeaponData = {
    id: 'slr',
    name: 'SLR',
    category: 'dmr',
    fireRateRPM: 380,
    msPerShot: rpmToMs(380),
    magazineSize: 20,
    damage: 58,
    horizontalNoiseBase: 2.5,
    verticalRecoilBase: 180,
    recoilPattern: [
        { dx: 0, dy: 22 }, { dx: 2, dy: 18 }, { dx: -3, dy: 15 }, { dx: 3, dy: 12 },
        { dx: -2, dy: 10 }, { dx: 1, dy: 8 }, { dx: -2, dy: 7 }, { dx: 2, dy: 5 },
        { dx: -1, dy: 4 }, { dx: 1, dy: 3 }, { dx: 0, dy: 3 }, { dx: -1, dy: 2 },
        { dx: 1, dy: 2 }, { dx: 0, dy: 2 }, { dx: -1, dy: 1 }, { dx: 1, dy: 1 },
        { dx: 0, dy: 1 }, { dx: -1, dy: 1 }, { dx: 1, dy: 0 }, { dx: 0, dy: 0 },
    ],
} as const;

// ═══════════════════════════════════════════
// Weapon Registry
// ═══════════════════════════════════════════

export const WEAPONS = {
    'm416': M416,
    'akm': AKM,
    'scar-l': SCARL,
    'beryl-m762': BERYLM762,
    'g36c': G36C,
    'ace32': ACE32,
    'ump45': UMP45,
    'vector': VECTOR,
    'mp5k': MP5K,
    'dp28': DP28,
    'm249': M249,
    'mini14': MINI14,
    'sks': SKS,
    'slr': SLR,
} as const;

export type WeaponId = keyof typeof WEAPONS;

export const WEAPON_LIST: readonly WeaponData[] = Object.values(WEAPONS);

export function getWeapon(id: string): WeaponData | undefined {
    return WEAPONS[id as WeaponId];
}

export function getWeaponsByCategory(category: WeaponCategory): readonly WeaponData[] {
    return WEAPON_LIST.filter(w => w.category === category);
}

/** Calcula a jitter threshold baseada na categoria da arma */
export function getJitterThreshold(category: WeaponCategory): number {
    switch (category) {
        case 'ar': return 4.0;
        case 'smg': return 3.0;
        case 'lmg': return 5.0;
        case 'dmr': return 3.5;
        case 'sr': return 6.0;
        case 'shotgun': return 8.0;
        case 'pistol': return 5.0;
    }
}
