/**
 * Pro Player Database — Dados de jogadores profissionais de PUBG.
 * Fonte: specs.gg — verificado em Março 2026.
 */

export interface ProPlayer {
    readonly id: string;
    readonly name: string;
    readonly team: string;
    readonly countryCode: string;
    readonly role: 'Entry Fragger' | 'Support' | 'IGL' | 'Sniper' | 'Flex';
    readonly dpi: number;
    readonly inGameSens: number;
    readonly verticalSensMultiplier: number;
    readonly adsSens: number;
    readonly cmPer360: number;
    readonly scopeSens: {
        readonly 'red-dot'?: number;
        readonly '2x'?: number;
        readonly '3x'?: number;
        readonly '4x'?: number;
        readonly '6x'?: number;
        readonly '8x'?: number;
    };
    readonly mouse: string;
    readonly mousepad: string;
    readonly gripStyle: 'claw' | 'palm' | 'fingertip' | 'hybrid';
    readonly specsUrl: string;
    readonly achievements: readonly string[];
    readonly imageUrl?: string;
    // Hardware extras
    readonly keyboard?: string;
    readonly monitor?: string;
    readonly gpu?: string;
    readonly headset?: string;
    readonly pollingRate?: number;
    readonly resolution?: string;
    readonly aspectRatio?: string;
    readonly refreshRate?: number;
    readonly digitalVibrance?: number;
    readonly fov?: number;
    readonly aimingStyle?: string;
    readonly aimColor?: string;
}

/**
 * Explicit filename map for player photos in /public/images/pros/.
 * Key = player name (case-insensitive). Value = exact filename with extension.
 */
export const PLAYER_PHOTO_FILES: Record<string, string> = {
    // Falcons
    'tgltn': 'tgltn.webp',
    'shrimzy': 'Shrimzy.webp',
    'kickstart': 'Kickstart.webp',
    'hwinn': 'hwinn.webp',
    // Baegopa
    'pio': 'Pio.webp',
    // Petrichor Road
    'aixleft': 'Aixleft.webp',
    // FaZe Clan
    'mxey': 'mxey.webp',
    'gustav': 'Gustav.webp',
    'jeemzz': 'jeemzz.webp',
    'fexx': 'Fexx.webp',
    // Twisted Minds
    'xmpl': 'xmpl.webp',
    'batulins': 'BatulinS.webp',
    'lu': 'Lu.webp',
    // NAVI
    'feyerist': 'feyerist.webp',
    // Team Liquid
    'luke12': 'luke12.webp',
    'sparkingg': 'sparkingg.webp',
    // FURIA
    'guizeraa': 'guizeraa.webp',
    'zkraken': 'zkrakeN.webp',
    'cauan7zin': 'cauan7zin.webp',
    // Al Qadsiah
    'relo': 'Relo.webp',
    // Four Angry Men
    'godv': 'GodV.webp',
    // ROC Esports
    'sxntastico': 'sxntastico.webp',
    'rbnn1': 'rbNN1.webp',
    // Danawa e-Sports
    'inonix': 'Inonix.webp',
    // Extra fotos disponíveis (sem dados no specs.gg ainda)
    'alow': 'aLOW.webp',
    'longskr': 'LongSkr.webp',
    'perfect1ks': 'Perfect1ks.webp',
    'hakatory': 'Hakatory.webp',
    'possa': 'Possa.webp',
    'purdykurty': 'PurdyKurty.webp',
    'boost1k': 'boost1k-.webp',
    'spyrro': 'spyrro.webp',
    'vard': 'vard.webp',
    'xxxlu': 'xxxLu.webp',
};

/** PUBG icon path (used for badges/section headers). */
export const PUBG_ICON = '/images/pros/pubg.png';

/**
 * Get player photo URL. Tries webp first via the explicit map, falls back to svg placeholder.
 */
export function getPlayerImageUrl(name: string): string {
    const player = PRO_PLAYERS.find(p => p.name.toLowerCase() === name.toLowerCase());
    if (player?.imageUrl) return player.imageUrl;
    const file = PLAYER_PHOTO_FILES[name.toLowerCase()];
    if (file) return `/images/pros/${file}`;
    return `/images/pros/${name.toLowerCase()}.svg`;
}

// Slug mapping — must match the actual filename (without extension) in /public/images/teams/
export const TEAM_SLUGS: Record<string, string> = {
    'Falcons': 'falcons',
    'Baegopa': 'baegopa',
    'Petrichor Road': 'petrichor-road',
    'Gen.G': 'geng',
    'T1': 't1',
    'FaZe Clan': 'faze-clan',
    'Twisted Minds': 'twisted-minds',
    'Danawa e-Sports': 'Danawa_e-sports',
    'NAVI': 'natus-vincere',
    '17 Gaming': '17-gaming',
    'The Expendables': 'the-expendables',
    'Four Angry Men': '4am',
    'NH Esports': 'nh-esports',
    'Virtus.pro': 'virtuspro',
    'BetBoom': 'betboom',
    'Team Liquid': 'team-liquid',
    'FURIA': 'furia',
    'Crazy Raccoon': 'crazy-raccoon',
    'ROC Esports': 'roc-esports',
    'Al Qadsiah': 'al-qadsiah',
    'eArena': 'earena',
    'Vitality': 'vitality',
};

/**
 * Get team logo URL. All logos are .webp.
 */
export function getTeamLogoUrl(teamName: string): string {
    const slug = TEAM_SLUGS[teamName] ?? teamName.toLowerCase().replace(/[\.\s]+/g, '-').replace(/[^a-z0-9-]/g, '');
    return `/images/teams/${slug}.webp`;
}

// PUBG yaw constant: 0.001375 (confirmed via mouse-sensitivity.com)
// cm/360 = (360 * 2.54) / (DPI * sens * yaw)
const PUBG_YAW = 0.001375;
function calcCm360(dpi: number, sens: number): number {
    return Math.round(((360 * 2.54) / (dpi * sens * PUBG_YAW)) * 10) / 10;
}

export const PRO_PLAYERS: readonly ProPlayer[] = [
    // ═══ Team Falcons ═══
    {
        id: 'tgltn',
        name: 'TGLTN',
        team: 'Falcons',
        countryCode: 'au',
        role: 'Entry Fragger',
        dpi: 800,
        inGameSens: 32,
        verticalSensMultiplier: 1.11,
        adsSens: 25,
        cmPer360: calcCm360(800, 32),
        scopeSens: { 'red-dot': 32, '2x': 27, '3x': 29, '4x': 29, '6x': 30, '8x': 30 },
        mouse: 'Logitech G PRO X Superlight White',
        mousepad: 'Artisan FX Type-99 MID XXL',
        gripStyle: 'claw',
        specsUrl: 'https://specs.gg/TGLTN',
        achievements: ['Falcons 2025', 'Ex-Soniqs'],
        keyboard: 'Wooting 80HE',
        monitor: 'Zowie XL2566K',
        gpu: 'NVIDIA GeForce RTX 4090',
        pollingRate: 2000,
        resolution: '1728 x 1080',
        aspectRatio: '16:10',
        refreshRate: 240,
    },
    {
        id: 'shrimzy',
        name: 'Shrimzy',
        team: 'Falcons',
        countryCode: 'us',
        role: 'Support',
        dpi: 800,
        inGameSens: 41,
        verticalSensMultiplier: 1.3,
        adsSens: 41,
        cmPer360: calcCm360(800, 41),
        scopeSens: { 'red-dot': 41, '2x': 41, '3x': 41, '4x': 41, '6x': 41, '8x': 41 },
        mouse: 'ZOWIE EC2-A',
        mousepad: 'Lethal Gaming Gear Saturn Red',
        gripStyle: 'palm',
        specsUrl: 'https://specs.gg/Shrimzy',
        achievements: ['Falcons 2025'],
        monitor: 'ZOWIE XL2546K',
        gpu: 'NVIDIA GeForce RTX 2080 Ti',
        pollingRate: 1000,
        resolution: '1920 x 1080',
        refreshRate: 240,
    },
    {
        id: 'kickstart',
        name: 'Kickstart',
        team: 'Falcons',
        countryCode: 'us',
        role: 'Flex',
        dpi: 800,
        inGameSens: 50,
        verticalSensMultiplier: 1.0,
        adsSens: 39,
        cmPer360: calcCm360(800, 50),
        scopeSens: { 'red-dot': 39, '2x': 39, '3x': 39, '4x': 39, '6x': 39, '8x': 39 },
        mouse: 'Logitech G PRO Wireless',
        mousepad: 'SteelSeries QcK Heavy',
        gripStyle: 'claw',
        specsUrl: 'https://specs.gg/Kickstart',
        achievements: ['Falcons 2025'],
        monitor: 'ASUS VG248QE',
        gpu: 'NVIDIA GeForce RTX 2080 Super',
        pollingRate: 1000,
        resolution: '1920 x 1080',
        refreshRate: 144,
    },
    {
        id: 'hwinn',
        name: 'hwinn',
        team: 'Falcons',
        countryCode: 'us',
        role: 'IGL',
        dpi: 800,
        inGameSens: 37,
        verticalSensMultiplier: 1.0,
        adsSens: 28,
        cmPer360: calcCm360(800, 37),
        scopeSens: { 'red-dot': 28, '2x': 26, '3x': 26, '4x': 26, '6x': 26, '8x': 26 },
        mouse: 'Logitech G703',
        mousepad: 'SteelSeries QcK Heavy',
        gripStyle: 'claw',
        specsUrl: 'https://specs.gg/hwinn',
        achievements: ['Falcons IGL'],
        monitor: 'ZOWIE XL2546',
        gpu: 'NVIDIA GeForce RTX 2080 Ti',
        pollingRate: 1000,
        resolution: '1920 x 1080',
        refreshRate: 240,
    },
    // ═══ Baegopa ═══
    {
        id: 'pio',
        name: 'Pio',
        team: 'Baegopa',
        countryCode: 'kr',
        role: 'Entry Fragger',
        dpi: 400,
        inGameSens: 45,
        verticalSensMultiplier: 0.85,
        adsSens: 36,
        cmPer360: calcCm360(400, 45),
        scopeSens: { 'red-dot': 41, '2x': 39, '3x': 36, '4x': 36, '6x': 36, '8x': 36 },
        mouse: 'Logitech G PRO X Superlight 2',
        mousepad: 'VAXEE PA',
        gripStyle: 'claw',
        specsUrl: 'https://specs.gg/Pio',
        achievements: ['Baegopa'],
        keyboard: 'Corsair K65',
        monitor: 'ZOWIE XL2566K',
        gpu: 'NVIDIA GeForce RTX 4090',
        pollingRate: 1000,
        resolution: '1920 x 1080',
        refreshRate: 360,
    },
    // ═══ Petrichor Road ═══
    {
        id: 'aixleft',
        name: 'Aixleft',
        team: 'Petrichor Road',
        countryCode: 'cn',
        role: 'Entry Fragger',
        dpi: 800,
        inGameSens: 50,
        verticalSensMultiplier: 1.15,
        adsSens: 38,
        cmPer360: calcCm360(800, 50),
        scopeSens: { 'red-dot': 41, '2x': 38, '3x': 38, '4x': 41, '6x': 41, '8x': 41 },
        mouse: 'Logitech G PRO X Superlight 2',
        mousepad: 'VAXEE PA Summer23',
        gripStyle: 'claw',
        specsUrl: 'https://specs.gg/Aixleft',
        achievements: ['Petrichor Road'],
        pollingRate: 1000,
        resolution: '1728 x 1080',
        refreshRate: 280,
    },
    // ═══ FaZe Clan ═══
    {
        id: 'mxey',
        name: 'mxey',
        team: 'FaZe Clan',
        countryCode: 'fi',
        role: 'IGL',
        dpi: 800,
        inGameSens: 35,
        verticalSensMultiplier: 1.0,
        adsSens: 32,
        cmPer360: calcCm360(800, 35),
        scopeSens: { 'red-dot': 32, '2x': 32, '3x': 32, '4x': 32, '6x': 32, '8x': 32 },
        mouse: 'Logitech G703 LIGHTSPEED',
        mousepad: 'ZOWIE G-SR-SE Deep Blue',
        gripStyle: 'palm',
        specsUrl: 'https://specs.gg/mxey',
        achievements: ['FaZe Clan IGL'],
        pollingRate: 1000,
        resolution: '1728 x 1080',
        refreshRate: 144,
    },
    {
        id: 'gustav',
        name: 'Gustav',
        team: 'FaZe Clan',
        countryCode: 'dk',
        role: 'Support',
        dpi: 800,
        inGameSens: 36,
        verticalSensMultiplier: 1.0,
        adsSens: 36,
        cmPer360: calcCm360(800, 36),
        scopeSens: { 'red-dot': 36, '2x': 36, '3x': 36, '4x': 36, '6x': 36, '8x': 36 },
        mouse: 'Logitech G PRO X Superlight 2',
        mousepad: 'FaZe Camo',
        gripStyle: 'claw',
        specsUrl: 'https://specs.gg/Gustav',
        achievements: ['FaZe Clan'],
        pollingRate: 1000,
        resolution: '1728 x 1080',
        refreshRate: 240,
    },
    {
        id: 'jeemzz',
        name: 'Jeemzz',
        team: 'FaZe Clan',
        countryCode: 'no',
        role: 'Sniper',
        dpi: 800,
        inGameSens: 30,
        verticalSensMultiplier: 1.2,
        adsSens: 30,
        cmPer360: calcCm360(800, 30),
        scopeSens: { 'red-dot': 30, '2x': 30, '3x': 30, '4x': 30, '6x': 28, '8x': 27 },
        mouse: 'Logitech G703 LIGHTSPEED',
        mousepad: 'Logitech G840',
        gripStyle: 'palm',
        specsUrl: 'https://specs.gg/Jeemzz',
        achievements: ['FaZe Clan', 'PGC Legend'],
        pollingRate: 1000,
        resolution: '1728 x 1080',
        refreshRate: 144,
    },
    {
        id: 'fexx',
        name: 'Fexx',
        team: 'FaZe Clan',
        countryCode: 'gb',
        role: 'Entry Fragger',
        dpi: 800,
        inGameSens: 37,
        verticalSensMultiplier: 1.0,
        adsSens: 32,
        cmPer360: calcCm360(800, 37),
        scopeSens: { 'red-dot': 32, '2x': 32, '3x': 32, '4x': 32, '6x': 30, '8x': 30 },
        mouse: 'Logitech G PRO X Superlight 2',
        mousepad: 'SteelSeries QcK Heavy',
        gripStyle: 'claw',
        specsUrl: 'https://specs.gg/Fexx',
        achievements: ['FaZe Clan'],
        pollingRate: 1000,
        resolution: '1728 x 1080',
        refreshRate: 240,
    },
    // ═══ Twisted Minds ═══
    {
        id: 'xmpl',
        name: 'xmpl',
        team: 'Twisted Minds',
        countryCode: 'ru',
        role: 'IGL',
        dpi: 400,
        inGameSens: 45,
        verticalSensMultiplier: 1.0,
        adsSens: 35,
        cmPer360: calcCm360(400, 45),
        scopeSens: { 'red-dot': 35, '2x': 40, '3x': 40, '4x': 40, '6x': 40, '8x': 40 },
        mouse: 'Ninjutso Sora V2',
        mousepad: 'Artisan FX Hayate Otsu MID XL',
        gripStyle: 'claw',
        specsUrl: 'https://specs.gg/xmpl',
        achievements: ['EWC 2025 Champion'],
        monitor: 'ZOWIE XL2566X+',
        pollingRate: 1000,
        resolution: '1728 x 1080',
        refreshRate: 400,
    },
    {
        id: 'batulins',
        name: 'BatulinS',
        team: 'Twisted Minds',
        countryCode: 'ru',
        role: 'Entry Fragger',
        dpi: 1600,
        inGameSens: 25,
        verticalSensMultiplier: 1.0,
        adsSens: 18,
        cmPer360: calcCm360(1600, 25),
        scopeSens: { 'red-dot': 18, '2x': 20, '3x': 21, '4x': 20, '6x': 21, '8x': 20 },
        mouse: 'Logitech G PRO X Superlight 2 White',
        mousepad: 'Artisan FX Zero SOFT XL',
        gripStyle: 'claw',
        specsUrl: 'https://specs.gg/BatulinS',
        achievements: ['EWC 2025 Champion'],
        monitor: 'ZOWIE XL2566X+',
        gpu: 'NVIDIA GeForce RTX 5090',
        pollingRate: 1000,
        resolution: '1920 x 1080',
        refreshRate: 240,
    },
    {
        id: 'lu',
        name: 'Lu',
        team: 'Twisted Minds',
        countryCode: 'ru',
        role: 'Support',
        dpi: 800,
        inGameSens: 35,
        verticalSensMultiplier: 1.0,
        adsSens: 33,
        cmPer360: calcCm360(800, 35),
        scopeSens: { 'red-dot': 33, '2x': 31, '3x': 30, '4x': 30, '6x': 30, '8x': 30 },
        mouse: 'Logitech G PRO X Superlight',
        mousepad: 'SteelSeries QcK Heavy',
        gripStyle: 'claw',
        specsUrl: 'https://specs.gg/Lu',
        achievements: ['EWC 2025 Champion'],
        pollingRate: 1000,
        resolution: '1920 x 1080',
        refreshRate: 144,
    },
    // ═══ Natus Vincere (NAVI) ═══
    {
        id: 'feyerist',
        name: 'Feyerist',
        team: 'NAVI',
        countryCode: 'ua',
        role: 'Entry Fragger',
        dpi: 400,
        inGameSens: 45,
        verticalSensMultiplier: 0.85,
        adsSens: 45,
        cmPer360: calcCm360(400, 45),
        scopeSens: { 'red-dot': 45, '2x': 45, '3x': 45, '4x': 45, '6x': 45, '8x': 45 },
        mouse: 'Logitech G PRO X Superlight',
        mousepad: 'Artisan FX Zero SOFT XL',
        gripStyle: 'claw',
        specsUrl: 'https://specs.gg/Feyerist',
        achievements: ['NAVI 2025'],
        pollingRate: 1000,
        resolution: '1728 x 1080',
        refreshRate: 240,
    },
    // ═══ Team Liquid ═══
    {
        id: 'luke12',
        name: 'luke12',
        team: 'Team Liquid',
        countryCode: 'au',
        role: 'Entry Fragger',
        dpi: 400,
        inGameSens: 49,
        verticalSensMultiplier: 1.0,
        adsSens: 35,
        cmPer360: calcCm360(400, 49),
        scopeSens: { 'red-dot': 35, '2x': 45, '3x': 45, '4x': 45, '6x': 45, '8x': 45 },
        mouse: 'Logitech G PRO X Superlight 2 White',
        mousepad: 'Artisan FX Key-83 SOFT XL',
        gripStyle: 'claw',
        specsUrl: 'https://specs.gg/luke12',
        achievements: ['Team Liquid'],
        pollingRate: 1000,
        resolution: '1728 x 1080',
        refreshRate: 240,
    },

    // ═══ FURIA ═══
    {
        id: 'guizeraa',
        name: 'guizeraa',
        team: 'FURIA',
        countryCode: 'br',
        role: 'IGL',
        dpi: 800,
        inGameSens: 36,
        verticalSensMultiplier: 1.0,
        adsSens: 36,
        cmPer360: calcCm360(800, 36),
        scopeSens: { 'red-dot': 36, '2x': 36, '3x': 36, '4x': 36, '6x': 36, '8x': 36 },
        mouse: 'Ninjutso Sora V2',
        mousepad: 'Artisan FX Zero XSOFT XL',
        gripStyle: 'claw',
        specsUrl: 'https://specs.gg/guizeraa',
        achievements: ['FURIA PUBG'],
        pollingRate: 1000,
        resolution: '1728 x 1080',
        refreshRate: 400,
    },
    {
        id: 'zkraken',
        name: 'zkrakeN',
        team: 'FURIA',
        countryCode: 'br',
        role: 'Entry Fragger',
        dpi: 800,
        inGameSens: 35,
        verticalSensMultiplier: 1.0,
        adsSens: 35,
        cmPer360: calcCm360(800, 35),
        scopeSens: { 'red-dot': 35, '2x': 35, '3x': 35, '4x': 35, '6x': 35, '8x': 35 },
        mouse: 'Logitech G PRO X Superlight 2 Magenta',
        mousepad: 'Artisan FX Zero XSOFT XL',
        gripStyle: 'claw',
        specsUrl: 'https://specs.gg/zkrakeN',
        achievements: ['FURIA PUBG'],
        pollingRate: 4000,
        resolution: '1920 x 1080',
        refreshRate: 360,
    },

    // ═══ Al Qadsiah ═══
    {
        id: 'relo',
        name: 'Relo',
        team: 'Al Qadsiah',
        countryCode: 'us',
        role: 'IGL',
        dpi: 800,
        inGameSens: 35,
        verticalSensMultiplier: 1.0,
        adsSens: 30,
        cmPer360: calcCm360(800, 35),
        scopeSens: { 'red-dot': 30, '2x': 30, '3x': 30, '4x': 30, '6x': 30, '8x': 30 },
        mouse: 'Logitech G PRO Wireless',
        mousepad: 'Fnatic Dash',
        gripStyle: 'claw',
        specsUrl: 'https://specs.gg/Relo',
        achievements: ['Al Qadsiah'],
        pollingRate: 1000,
        resolution: '1920 x 1080',
        refreshRate: 240,
    },
    // ═══ Four Angry Men (4AM) ═══
    {
        id: 'godv',
        name: 'GodV',
        team: 'Four Angry Men',
        countryCode: 'cn',
        role: 'Entry Fragger',
        dpi: 800,
        inGameSens: 30,
        verticalSensMultiplier: 1.2,
        adsSens: 25,
        cmPer360: calcCm360(800, 30),
        scopeSens: { 'red-dot': 25, '2x': 25, '3x': 25, '4x': 25, '6x': 25, '8x': 25 },
        mouse: 'Razer Viper Ultimate',
        mousepad: 'Razer Gigantus',
        gripStyle: 'claw',
        specsUrl: 'https://specs.gg/GodV',
        achievements: ['4AM Core'],
        pollingRate: 1000,
        resolution: '1728 x 1080',
        refreshRate: 240,
    },
    // ═══ ROC Esports ═══
    {
        id: 'sxntastico',
        name: 'sxntastico',
        team: 'ROC Esports',
        countryCode: 'br',
        role: 'Flex',
        dpi: 800,
        inGameSens: 39,
        verticalSensMultiplier: 1.23,
        adsSens: 39,
        cmPer360: calcCm360(800, 39),
        scopeSens: { 'red-dot': 39, '2x': 39, '3x': 39, '4x': 39, '6x': 39, '8x': 39 },
        mouse: 'Logitech G PRO X Superlight White',
        mousepad: 'ZOWIE G-SR-SE Gris',
        gripStyle: 'claw',
        specsUrl: 'https://specs.gg/sxntastico',
        achievements: ['ROC Esports 2025'],
        pollingRate: 1000,
        resolution: '1728 x 1080',
        refreshRate: 240,
    },
    {
        id: 'sparkingg',
        name: 'sparkingg',
        team: 'ROC Esports',
        countryCode: 'br',
        role: 'Support',
        dpi: 800,
        inGameSens: 40,
        verticalSensMultiplier: 1.0,
        adsSens: 40,
        cmPer360: calcCm360(800, 40),
        scopeSens: { 'red-dot': 40, '2x': 40, '3x': 40, '4x': 40, '6x': 40, '8x': 40 },
        mouse: 'ZOWIE EC3-C',
        mousepad: 'ZOWIE G-SR-SE Deep Blue',
        gripStyle: 'claw',
        specsUrl: 'https://specs.gg/sparkingg',
        achievements: ['ROC Esports'],
        pollingRate: 1000,
        resolution: '1728 x 1080',
        refreshRate: 240,
    },
    {
        id: 'cauan7zin',
        name: 'cauan7zin',
        team: 'ROC Esports',
        countryCode: 'br',
        role: 'Flex',
        dpi: 400,
        inGameSens: 45,
        verticalSensMultiplier: 1.0,
        adsSens: 30,
        cmPer360: calcCm360(400, 45),
        scopeSens: { 'red-dot': 30, '2x': 36, '3x': 36, '4x': 36, '6x': 34, '8x': 34 },
        mouse: 'Logitech G PRO X Superlight 2',
        mousepad: 'SteelSeries QcK Performance Speed',
        gripStyle: 'claw',
        specsUrl: 'https://specs.gg/cauan7zin',
        achievements: ['ROC Esports'],
        pollingRate: 1000,
        resolution: '1728 x 1080',
        refreshRate: 240,
    },
    {
        id: 'rbnn1',
        name: 'rbNN1',
        team: 'ROC Esports',
        countryCode: 'br',
        role: 'IGL',
        dpi: 400,
        inGameSens: 39,
        verticalSensMultiplier: 1.0,
        adsSens: 39,
        cmPer360: calcCm360(400, 39),
        scopeSens: { 'red-dot': 39, '2x': 39, '3x': 39, '4x': 39, '6x': 39, '8x': 39 },
        mouse: 'ZOWIE EC3-C',
        mousepad: 'ZOWIE G-SR',
        gripStyle: 'claw',
        specsUrl: 'https://specs.gg/rbNN1',
        achievements: ['ROC Esports 2025'],
        pollingRate: 1000,
        resolution: '1728 x 1080',
        refreshRate: 144,
    },
] as const;

// ═══ Helpers ═══

export function getProPlayer(id: string): ProPlayer | undefined {
    return PRO_PLAYERS.find(p => p.id === id);
}

export function getProsByRole(role: ProPlayer['role']): ProPlayer[] {
    return PRO_PLAYERS.filter(p => p.role === role);
}

export function getProStats() {
    const sensValues = PRO_PLAYERS.map(p => p.cmPer360);
    const dpiValues = PRO_PLAYERS.map(p => p.dpi);

    return {
        totalPlayers: PRO_PLAYERS.length,
        avgCmPer360: sensValues.reduce((a, b) => a + b, 0) / sensValues.length,
        minCmPer360: Math.min(...sensValues),
        maxCmPer360: Math.max(...sensValues),
        medianCmPer360: [...sensValues].sort((a, b) => a - b)[Math.floor(sensValues.length / 2)]!,
        mostCommonDpi: dpiValues.filter(d => d === 800).length > dpiValues.length / 2 ? 800 : 400,
        mostCommonGrip: 'claw' as const,
        countries: [...new Set(PRO_PLAYERS.map(p => p.countryCode))].length,
        teams: [...new Set(PRO_PLAYERS.map(p => p.team))].length,
    };
}
