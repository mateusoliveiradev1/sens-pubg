/**
 * PUBG Weapon Data — Base de dados completa de armas com curvas de recoil.
 * Cada arma tem: fire rate, recoil pattern ({dx,dy}[] por tiro), dano, categoria.
 * Todos os dados são `as const` para inferência de tipos literal.
 */

// ═══════════════════════════════════════════
// Types
// ═══════════════════════════════════════════

export interface RecoilVector {
    readonly yaw: number;   // Horizontal recoil in Degrees. Positive = right.
    readonly pitch: number; // Vertical recoil in Degrees. Positive = up.
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
    readonly supportedAttachments: {
        readonly muzzle: readonly import('@/types/engine').MuzzleAttachment[];
        readonly grip: readonly import('@/types/engine').GripAttachment[];
        readonly stock: readonly import('@/types/engine').StockAttachment[];
    };
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
        { yaw: 0.00, pitch: 0.36 }, { yaw: 0.05, pitch: 0.45 }, { yaw: -0.05, pitch: 0.41 }, { yaw: 0.09, pitch: 0.50 },
        { yaw: -0.05, pitch: 0.45 }, { yaw: 0.00, pitch: 0.41 }, { yaw: 0.05, pitch: 0.36 }, { yaw: -0.09, pitch: 0.32 },
        { yaw: 0.09, pitch: 0.27 }, { yaw: -0.05, pitch: 0.32 }, { yaw: 0.05, pitch: 0.27 }, { yaw: -0.09, pitch: 0.23 },
        { yaw: 0.09, pitch: 0.23 }, { yaw: 0.00, pitch: 0.27 }, { yaw: -0.05, pitch: 0.23 }, { yaw: 0.05, pitch: 0.18 },
        { yaw: -0.09, pitch: 0.23 }, { yaw: 0.09, pitch: 0.18 }, { yaw: 0.00, pitch: 0.23 }, { yaw: -0.05, pitch: 0.18 },
        { yaw: 0.05, pitch: 0.14 }, { yaw: -0.09, pitch: 0.18 }, { yaw: 0.09, pitch: 0.14 }, { yaw: 0.00, pitch: 0.18 },
        { yaw: -0.05, pitch: 0.14 }, { yaw: 0.05, pitch: 0.14 }, { yaw: -0.09, pitch: 0.14 }, { yaw: 0.09, pitch: 0.09 },
        { yaw: 0.00, pitch: 0.14 }, { yaw: -0.05, pitch: 0.09 },
    ],
    supportedAttachments: { muzzle: ['none', 'compensator', 'flash_hider', 'suppressor', 'muzzle_brake'], grip: ['none', 'vertical', 'angled', 'half', 'thumb', 'lightweight', 'laser', 'ergonomic'], stock: ['none', 'tactical', 'heavy'] },
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
        { yaw: 0.00, pitch: 0.54 }, { yaw: 0.09, pitch: 0.63 }, { yaw: -0.14, pitch: 0.59 }, { yaw: 0.14, pitch: 0.68 },
        { yaw: -0.09, pitch: 0.54 }, { yaw: 0.05, pitch: 0.50 }, { yaw: -0.14, pitch: 0.45 }, { yaw: 0.14, pitch: 0.41 },
        { yaw: -0.05, pitch: 0.36 }, { yaw: 0.09, pitch: 0.32 }, { yaw: -0.14, pitch: 0.36 }, { yaw: 0.14, pitch: 0.32 },
        { yaw: -0.09, pitch: 0.27 }, { yaw: 0.05, pitch: 0.32 }, { yaw: -0.14, pitch: 0.27 }, { yaw: 0.09, pitch: 0.23 },
        { yaw: -0.05, pitch: 0.27 }, { yaw: 0.14, pitch: 0.23 }, { yaw: -0.09, pitch: 0.23 }, { yaw: 0.05, pitch: 0.18 },
        { yaw: -0.14, pitch: 0.23 }, { yaw: 0.09, pitch: 0.18 }, { yaw: -0.05, pitch: 0.18 }, { yaw: 0.14, pitch: 0.14 },
        { yaw: -0.09, pitch: 0.18 }, { yaw: 0.05, pitch: 0.14 }, { yaw: -0.14, pitch: 0.14 }, { yaw: 0.09, pitch: 0.14 },
        { yaw: -0.05, pitch: 0.09 }, { yaw: 0.05, pitch: 0.09 },
    ],
    supportedAttachments: { muzzle: ['none', 'compensator', 'flash_hider', 'suppressor', 'muzzle_brake'], grip: ['none'], stock: ['none'] },
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
        { yaw: 0.00, pitch: 0.32 }, { yaw: 0.04, pitch: 0.40 }, { yaw: -0.04, pitch: 0.36 }, { yaw: 0.04, pitch: 0.45 },
        { yaw: -0.04, pitch: 0.40 }, { yaw: 0.00, pitch: 0.36 }, { yaw: 0.04, pitch: 0.32 }, { yaw: -0.04, pitch: 0.32 },
        { yaw: 0.04, pitch: 0.27 }, { yaw: 0.00, pitch: 0.27 }, { yaw: -0.04, pitch: 0.27 }, { yaw: 0.04, pitch: 0.22 },
        { yaw: -0.04, pitch: 0.22 }, { yaw: 0.00, pitch: 0.22 }, { yaw: 0.04, pitch: 0.22 }, { yaw: -0.04, pitch: 0.18 },
        { yaw: 0.00, pitch: 0.22 }, { yaw: 0.04, pitch: 0.18 }, { yaw: -0.04, pitch: 0.18 }, { yaw: 0.00, pitch: 0.18 },
        { yaw: 0.04, pitch: 0.14 }, { yaw: -0.04, pitch: 0.18 }, { yaw: 0.00, pitch: 0.14 }, { yaw: 0.04, pitch: 0.14 },
        { yaw: -0.04, pitch: 0.14 }, { yaw: 0.00, pitch: 0.14 }, { yaw: 0.04, pitch: 0.09 }, { yaw: -0.04, pitch: 0.14 },
        { yaw: 0.00, pitch: 0.09 }, { yaw: 0.04, pitch: 0.09 },
    ],
    supportedAttachments: { muzzle: ['none', 'compensator', 'flash_hider', 'suppressor', 'muzzle_brake'], grip: ['none', 'vertical', 'angled', 'half', 'thumb', 'lightweight', 'laser', 'ergonomic'], stock: ['none'] },
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
        { yaw: 0.00, pitch: 0.63 }, { yaw: 0.14, pitch: 0.72 }, { yaw: -0.18, pitch: 0.67 }, { yaw: 0.18, pitch: 0.77 },
        { yaw: -0.14, pitch: 0.63 }, { yaw: 0.09, pitch: 0.58 }, { yaw: -0.18, pitch: 0.49 }, { yaw: 0.14, pitch: 0.45 },
        { yaw: -0.09, pitch: 0.40 }, { yaw: 0.18, pitch: 0.36 }, { yaw: -0.14, pitch: 0.40 }, { yaw: 0.14, pitch: 0.32 },
        { yaw: -0.09, pitch: 0.32 }, { yaw: 0.18, pitch: 0.27 }, { yaw: -0.14, pitch: 0.32 }, { yaw: 0.09, pitch: 0.27 },
        { yaw: -0.18, pitch: 0.22 }, { yaw: 0.14, pitch: 0.22 }, { yaw: -0.09, pitch: 0.22 }, { yaw: 0.18, pitch: 0.18 },
        { yaw: -0.14, pitch: 0.22 }, { yaw: 0.09, pitch: 0.18 }, { yaw: -0.18, pitch: 0.18 }, { yaw: 0.14, pitch: 0.14 },
        { yaw: -0.09, pitch: 0.18 }, { yaw: 0.18, pitch: 0.14 }, { yaw: -0.14, pitch: 0.14 }, { yaw: 0.09, pitch: 0.14 },
        { yaw: -0.18, pitch: 0.09 }, { yaw: 0.14, pitch: 0.09 },
    ],
    supportedAttachments: { muzzle: ['none', 'compensator', 'flash_hider', 'suppressor', 'muzzle_brake'], grip: ['none', 'vertical', 'angled', 'half', 'thumb', 'lightweight', 'laser', 'ergonomic'], stock: ['none'] },
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
        { yaw: 0.00, pitch: 0.36 }, { yaw: 0.04, pitch: 0.45 }, { yaw: -0.04, pitch: 0.40 }, { yaw: 0.09, pitch: 0.45 },
        { yaw: -0.04, pitch: 0.40 }, { yaw: 0.00, pitch: 0.36 }, { yaw: 0.04, pitch: 0.32 }, { yaw: -0.09, pitch: 0.32 },
        { yaw: 0.04, pitch: 0.27 }, { yaw: -0.04, pitch: 0.27 }, { yaw: 0.09, pitch: 0.22 }, { yaw: -0.04, pitch: 0.27 },
        { yaw: 0.04, pitch: 0.22 }, { yaw: 0.00, pitch: 0.22 }, { yaw: -0.04, pitch: 0.22 }, { yaw: 0.04, pitch: 0.18 },
        { yaw: -0.04, pitch: 0.18 }, { yaw: 0.09, pitch: 0.18 }, { yaw: -0.04, pitch: 0.18 }, { yaw: 0.00, pitch: 0.18 },
        { yaw: 0.04, pitch: 0.14 }, { yaw: -0.04, pitch: 0.18 }, { yaw: 0.04, pitch: 0.14 }, { yaw: 0.00, pitch: 0.14 },
        { yaw: -0.04, pitch: 0.14 }, { yaw: 0.04, pitch: 0.14 }, { yaw: -0.04, pitch: 0.09 }, { yaw: 0.00, pitch: 0.14 },
        { yaw: 0.04, pitch: 0.09 }, { yaw: -0.04, pitch: 0.09 },
    ],
    supportedAttachments: { muzzle: ['none', 'compensator', 'flash_hider', 'suppressor', 'muzzle_brake'], grip: ['none', 'vertical', 'angled', 'half', 'thumb', 'lightweight', 'laser', 'ergonomic'], stock: ['none'] },
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
        { yaw: 0.00, pitch: 0.40 }, { yaw: 0.04, pitch: 0.49 }, { yaw: -0.09, pitch: 0.45 }, { yaw: 0.09, pitch: 0.54 },
        { yaw: -0.04, pitch: 0.45 }, { yaw: 0.04, pitch: 0.40 }, { yaw: -0.09, pitch: 0.36 }, { yaw: 0.09, pitch: 0.32 },
        { yaw: -0.04, pitch: 0.32 }, { yaw: 0.04, pitch: 0.27 }, { yaw: -0.09, pitch: 0.27 }, { yaw: 0.09, pitch: 0.22 },
        { yaw: -0.04, pitch: 0.27 }, { yaw: 0.04, pitch: 0.22 }, { yaw: -0.09, pitch: 0.22 }, { yaw: 0.09, pitch: 0.18 },
        { yaw: -0.04, pitch: 0.22 }, { yaw: 0.04, pitch: 0.18 }, { yaw: -0.09, pitch: 0.18 }, { yaw: 0.09, pitch: 0.14 },
        { yaw: -0.04, pitch: 0.18 }, { yaw: 0.04, pitch: 0.14 }, { yaw: -0.09, pitch: 0.14 }, { yaw: 0.09, pitch: 0.14 },
        { yaw: -0.04, pitch: 0.14 }, { yaw: 0.04, pitch: 0.09 }, { yaw: -0.09, pitch: 0.14 }, { yaw: 0.09, pitch: 0.09 },
        { yaw: -0.04, pitch: 0.09 }, { yaw: 0.04, pitch: 0.09 }, { yaw: -0.09, pitch: 0.09 }, { yaw: 0.09, pitch: 0.04 },
        { yaw: -0.04, pitch: 0.09 }, { yaw: 0.04, pitch: 0.04 }, { yaw: 0.00, pitch: 0.04 },
    ],
    supportedAttachments: { muzzle: ['none', 'compensator', 'flash_hider', 'suppressor', 'muzzle_brake'], grip: ['none', 'vertical', 'angled', 'half', 'thumb', 'lightweight', 'laser', 'ergonomic'], stock: ['none', 'tactical', 'heavy'] },
} as const;

const AUG: WeaponData = {
    id: 'aug',
    name: 'AUG',
    category: 'ar',
    fireRateRPM: 720,
    msPerShot: rpmToMs(720),
    magazineSize: 30,
    damage: 41,
    horizontalNoiseBase: 1.8,
    verticalRecoilBase: 160,
    recoilPattern: [
        { yaw: 0.00, pitch: 0.27 }, { yaw: 0.04, pitch: 0.36 }, { yaw: -0.04, pitch: 0.32 }, { yaw: 0.04, pitch: 0.40 },
        { yaw: -0.04, pitch: 0.36 }, { yaw: 0.00, pitch: 0.32 }, { yaw: 0.04, pitch: 0.27 }, { yaw: -0.04, pitch: 0.27 },
        { yaw: 0.04, pitch: 0.22 }, { yaw: 0.00, pitch: 0.22 }, { yaw: -0.04, pitch: 0.22 }, { yaw: 0.04, pitch: 0.18 },
        { yaw: -0.04, pitch: 0.18 }, { yaw: 0.00, pitch: 0.18 }, { yaw: 0.04, pitch: 0.18 }, { yaw: -0.04, pitch: 0.14 },
        { yaw: 0.00, pitch: 0.18 }, { yaw: 0.04, pitch: 0.14 }, { yaw: -0.04, pitch: 0.14 }, { yaw: 0.00, pitch: 0.14 },
        { yaw: 0.04, pitch: 0.09 }, { yaw: -0.04, pitch: 0.14 }, { yaw: 0.00, pitch: 0.09 }, { yaw: 0.04, pitch: 0.09 },
        { yaw: -0.04, pitch: 0.09 }, { yaw: 0.00, pitch: 0.09 }, { yaw: 0.04, pitch: 0.04 }, { yaw: -0.04, pitch: 0.09 },
        { yaw: 0.00, pitch: 0.04 }, { yaw: 0.04, pitch: 0.04 },
    ],
    supportedAttachments: { muzzle: ['none', 'compensator', 'flash_hider', 'suppressor', 'muzzle_brake'], grip: ['none', 'vertical', 'angled', 'half', 'thumb', 'lightweight', 'laser', 'ergonomic'], stock: ['none'] },
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
        { yaw: 0.00, pitch: 0.27 }, { yaw: 0.04, pitch: 0.32 }, { yaw: -0.04, pitch: 0.32 }, { yaw: 0.04, pitch: 0.36 },
        { yaw: -0.04, pitch: 0.32 }, { yaw: 0.00, pitch: 0.27 }, { yaw: 0.04, pitch: 0.22 }, { yaw: -0.04, pitch: 0.22 },
        { yaw: 0.04, pitch: 0.22 }, { yaw: 0.00, pitch: 0.18 }, { yaw: -0.04, pitch: 0.18 }, { yaw: 0.04, pitch: 0.18 },
        { yaw: 0.00, pitch: 0.18 }, { yaw: -0.04, pitch: 0.14 }, { yaw: 0.04, pitch: 0.14 }, { yaw: 0.00, pitch: 0.14 },
        { yaw: -0.04, pitch: 0.14 }, { yaw: 0.04, pitch: 0.14 }, { yaw: 0.00, pitch: 0.14 }, { yaw: -0.04, pitch: 0.09 },
        { yaw: 0.04, pitch: 0.09 }, { yaw: 0.00, pitch: 0.09 }, { yaw: -0.04, pitch: 0.09 }, { yaw: 0.04, pitch: 0.09 },
        { yaw: 0.00, pitch: 0.09 },
    ],
    supportedAttachments: { muzzle: ['none', 'compensator', 'flash_hider', 'suppressor', 'muzzle_brake'], grip: ['none', 'vertical', 'angled', 'half', 'thumb', 'lightweight', 'laser', 'ergonomic'], stock: ['none'] },
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
        { yaw: 0.00, pitch: 0.22 }, { yaw: 0.04, pitch: 0.27 }, { yaw: -0.04, pitch: 0.22 }, { yaw: 0.04, pitch: 0.27 },
        { yaw: 0.00, pitch: 0.22 }, { yaw: -0.04, pitch: 0.22 }, { yaw: 0.04, pitch: 0.18 }, { yaw: -0.04, pitch: 0.18 },
        { yaw: 0.00, pitch: 0.18 }, { yaw: 0.04, pitch: 0.14 }, { yaw: -0.04, pitch: 0.14 }, { yaw: 0.00, pitch: 0.14 },
        { yaw: 0.04, pitch: 0.14 }, { yaw: -0.04, pitch: 0.09 }, { yaw: 0.00, pitch: 0.14 }, { yaw: 0.04, pitch: 0.09 },
        { yaw: -0.04, pitch: 0.09 }, { yaw: 0.00, pitch: 0.09 }, { yaw: 0.04, pitch: 0.09 }, { yaw: -0.04, pitch: 0.09 },
        { yaw: 0.00, pitch: 0.04 }, { yaw: 0.04, pitch: 0.09 }, { yaw: -0.04, pitch: 0.04 }, { yaw: 0.00, pitch: 0.04 },
        { yaw: 0.04, pitch: 0.04 },
    ],
    supportedAttachments: { muzzle: ['none', 'compensator', 'flash_hider', 'suppressor', 'muzzle_brake'], grip: ['none', 'vertical', 'angled', 'half', 'thumb', 'lightweight', 'laser', 'ergonomic'], stock: ['none', 'tactical', 'heavy'] },
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
        { yaw: 0.00, pitch: 0.22 }, { yaw: 0.04, pitch: 0.27 }, { yaw: -0.04, pitch: 0.27 }, { yaw: 0.04, pitch: 0.32 },
        { yaw: -0.04, pitch: 0.27 }, { yaw: 0.00, pitch: 0.22 }, { yaw: 0.04, pitch: 0.22 }, { yaw: -0.04, pitch: 0.18 },
        { yaw: 0.04, pitch: 0.18 }, { yaw: 0.00, pitch: 0.18 }, { yaw: -0.04, pitch: 0.14 }, { yaw: 0.04, pitch: 0.14 },
        { yaw: 0.00, pitch: 0.14 }, { yaw: -0.04, pitch: 0.14 }, { yaw: 0.04, pitch: 0.09 }, { yaw: 0.00, pitch: 0.14 },
        { yaw: -0.04, pitch: 0.09 }, { yaw: 0.04, pitch: 0.09 }, { yaw: 0.00, pitch: 0.09 }, { yaw: -0.04, pitch: 0.09 },
        { yaw: 0.04, pitch: 0.09 }, { yaw: 0.00, pitch: 0.04 }, { yaw: -0.04, pitch: 0.09 }, { yaw: 0.04, pitch: 0.04 },
        { yaw: 0.00, pitch: 0.04 }, { yaw: -0.04, pitch: 0.04 }, { yaw: 0.04, pitch: 0.04 }, { yaw: 0.00, pitch: 0.04 },
        { yaw: -0.04, pitch: 0.04 }, { yaw: 0.04, pitch: 0.04 },
    ],
    supportedAttachments: { muzzle: ['none', 'compensator', 'flash_hider', 'suppressor', 'muzzle_brake'], grip: ['none', 'vertical', 'angled', 'half', 'thumb', 'lightweight', 'laser', 'ergonomic'], stock: ['none', 'tactical', 'heavy'] },
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
        { yaw: 0.00, pitch: 0.45 }, { yaw: 0.04, pitch: 0.54 }, { yaw: -0.04, pitch: 0.49 }, { yaw: 0.04, pitch: 0.54 },
        { yaw: -0.04, pitch: 0.45 }, { yaw: 0.00, pitch: 0.40 }, { yaw: 0.04, pitch: 0.36 }, { yaw: -0.04, pitch: 0.32 },
        { yaw: 0.04, pitch: 0.32 }, { yaw: 0.00, pitch: 0.27 }, { yaw: -0.04, pitch: 0.22 }, { yaw: 0.04, pitch: 0.22 },
        { yaw: 0.00, pitch: 0.22 }, { yaw: -0.04, pitch: 0.18 }, { yaw: 0.04, pitch: 0.18 }, { yaw: 0.00, pitch: 0.14 },
        { yaw: -0.04, pitch: 0.14 }, { yaw: 0.04, pitch: 0.14 }, { yaw: 0.00, pitch: 0.14 }, { yaw: -0.04, pitch: 0.09 },
        { yaw: 0.04, pitch: 0.09 }, { yaw: 0.00, pitch: 0.09 }, { yaw: -0.04, pitch: 0.09 }, { yaw: 0.04, pitch: 0.09 },
        { yaw: 0.00, pitch: 0.09 }, { yaw: -0.04, pitch: 0.04 }, { yaw: 0.04, pitch: 0.04 }, { yaw: 0.00, pitch: 0.04 },
        { yaw: -0.04, pitch: 0.04 }, { yaw: 0.04, pitch: 0.04 }, { yaw: 0.00, pitch: 0.04 }, { yaw: -0.04, pitch: 0.04 },
        { yaw: 0.04, pitch: 0.04 }, { yaw: 0.00, pitch: 0.04 }, { yaw: -0.04, pitch: 0.00 }, { yaw: 0.04, pitch: 0.00 },
        { yaw: 0.00, pitch: 0.04 }, { yaw: -0.04, pitch: 0.00 }, { yaw: 0.04, pitch: 0.00 }, { yaw: 0.00, pitch: 0.00 },
        { yaw: -0.04, pitch: 0.00 }, { yaw: 0.04, pitch: 0.00 }, { yaw: 0.00, pitch: 0.00 }, { yaw: -0.04, pitch: 0.00 },
        { yaw: 0.04, pitch: 0.00 }, { yaw: 0.00, pitch: 0.00 }, { yaw: -0.04, pitch: 0.00 },
    ],
    supportedAttachments: { muzzle: ['none'], grip: ['none'], stock: ['none'] },
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
        { yaw: 0.00, pitch: 0.49 }, { yaw: 0.09, pitch: 0.58 }, { yaw: -0.09, pitch: 0.54 }, { yaw: 0.14, pitch: 0.63 },
        { yaw: -0.09, pitch: 0.49 }, { yaw: 0.04, pitch: 0.45 }, { yaw: -0.14, pitch: 0.40 }, { yaw: 0.09, pitch: 0.36 },
        { yaw: -0.04, pitch: 0.32 }, { yaw: 0.14, pitch: 0.32 }, { yaw: -0.09, pitch: 0.27 }, { yaw: 0.04, pitch: 0.27 },
        { yaw: -0.14, pitch: 0.22 }, { yaw: 0.09, pitch: 0.22 }, { yaw: -0.04, pitch: 0.18 }, { yaw: 0.14, pitch: 0.18 },
        { yaw: -0.09, pitch: 0.18 }, { yaw: 0.04, pitch: 0.14 }, { yaw: -0.14, pitch: 0.14 }, { yaw: 0.09, pitch: 0.14 },
        { yaw: -0.04, pitch: 0.09 }, { yaw: 0.14, pitch: 0.09 }, { yaw: -0.09, pitch: 0.09 }, { yaw: 0.04, pitch: 0.09 },
        { yaw: -0.14, pitch: 0.04 }, { yaw: 0.09, pitch: 0.04 }, { yaw: -0.04, pitch: 0.04 }, { yaw: 0.14, pitch: 0.04 },
        { yaw: -0.09, pitch: 0.04 }, { yaw: 0.04, pitch: 0.00 },
    ],
    supportedAttachments: { muzzle: ['none'], grip: ['none'], stock: ['none', 'tactical', 'heavy'] },
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
        { yaw: 0.00, pitch: 0.54 }, { yaw: 0.04, pitch: 0.45 }, { yaw: -0.04, pitch: 0.36 }, { yaw: 0.04, pitch: 0.32 },
        { yaw: 0.00, pitch: 0.27 }, { yaw: -0.04, pitch: 0.22 }, { yaw: 0.04, pitch: 0.18 }, { yaw: 0.00, pitch: 0.18 },
        { yaw: -0.04, pitch: 0.14 }, { yaw: 0.04, pitch: 0.14 }, { yaw: 0.00, pitch: 0.09 }, { yaw: -0.04, pitch: 0.09 },
        { yaw: 0.04, pitch: 0.09 }, { yaw: 0.00, pitch: 0.04 }, { yaw: -0.04, pitch: 0.04 }, { yaw: 0.04, pitch: 0.04 },
        { yaw: 0.00, pitch: 0.04 }, { yaw: -0.04, pitch: 0.04 }, { yaw: 0.04, pitch: 0.00 }, { yaw: 0.00, pitch: 0.00 },
    ],
    supportedAttachments: { muzzle: ['none', 'compensator', 'flash_hider', 'suppressor', 'muzzle_brake'], grip: ['none'], stock: ['none'] },
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
        { yaw: 0.00, pitch: 0.81 }, { yaw: 0.09, pitch: 0.67 }, { yaw: -0.09, pitch: 0.54 }, { yaw: 0.09, pitch: 0.45 },
        { yaw: -0.04, pitch: 0.36 }, { yaw: 0.04, pitch: 0.32 }, { yaw: -0.09, pitch: 0.27 }, { yaw: 0.09, pitch: 0.22 },
        { yaw: -0.04, pitch: 0.18 }, { yaw: 0.04, pitch: 0.14 }, { yaw: 0.00, pitch: 0.14 }, { yaw: -0.04, pitch: 0.09 },
        { yaw: 0.04, pitch: 0.09 }, { yaw: 0.00, pitch: 0.09 }, { yaw: -0.04, pitch: 0.04 }, { yaw: 0.04, pitch: 0.04 },
        { yaw: 0.00, pitch: 0.04 }, { yaw: -0.04, pitch: 0.04 }, { yaw: 0.04, pitch: 0.00 }, { yaw: 0.00, pitch: 0.00 },
    ],
    supportedAttachments: { muzzle: ['none', 'compensator', 'flash_hider', 'suppressor', 'muzzle_brake'], grip: ['none', 'vertical', 'angled', 'half', 'thumb', 'lightweight', 'laser', 'ergonomic'], stock: ['none', 'tactical', 'heavy'] },
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
        { yaw: 0.00, pitch: 0.99 }, { yaw: 0.09, pitch: 0.81 }, { yaw: -0.14, pitch: 0.67 }, { yaw: 0.14, pitch: 0.54 },
        { yaw: -0.09, pitch: 0.45 }, { yaw: 0.04, pitch: 0.36 }, { yaw: -0.09, pitch: 0.32 }, { yaw: 0.09, pitch: 0.22 },
        { yaw: -0.04, pitch: 0.18 }, { yaw: 0.04, pitch: 0.14 }, { yaw: 0.00, pitch: 0.14 }, { yaw: -0.04, pitch: 0.09 },
        { yaw: 0.04, pitch: 0.09 }, { yaw: 0.00, pitch: 0.09 }, { yaw: -0.04, pitch: 0.04 }, { yaw: 0.04, pitch: 0.04 },
        { yaw: 0.00, pitch: 0.04 }, { yaw: -0.04, pitch: 0.04 }, { yaw: 0.04, pitch: 0.00 }, { yaw: 0.00, pitch: 0.00 },
    ],
    supportedAttachments: { muzzle: ['none', 'compensator', 'flash_hider', 'suppressor', 'muzzle_brake'], grip: ['none'], stock: ['none', 'tactical', 'heavy'] },
} as const;

// ═══════════════════════════════════════════
// Weapon Registry
// ═══════════════════════════════════════════

export const WEAPONS = {
    'm416': M416,
    'akm': AKM,
    'scar-l': SCARL,
    'aug': AUG,
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

/** Calcula a jitter threshold baseada na categoria da arma (Angular Degrees) */
export function getJitterThreshold(category: WeaponCategory): number {
    switch (category) {
        case 'ar': return 0.18;
        case 'smg': return 0.13;
        case 'lmg': return 0.22;
        case 'dmr': return 0.15;
        case 'sr': return 0.27;
        case 'shotgun': return 0.36;
        case 'pistol': return 0.22;
    }
}
