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
}

/**
 * Get player image URL.
 */
export function getPlayerImageUrl(name: string): string {
    const player = PRO_PLAYERS.find(p => p.name.toLowerCase() === name.toLowerCase());
    if (player?.imageUrl) return player.imageUrl;
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
    const slug = TEAM_SLUGS[teamName] ?? teamName.toLowerCase().replace(/[.\s]+/g, '-').replace(/[^a-z0-9-]/g, '');
    return `/images/teams/${slug}.webp`;
}

// PUBG yaw constant: 0.001375 (confirmed via mouse-sensitivity.com)
// cm/360 = (360 * 2.54) / (DPI * sens * yaw)
const PUBG_YAW = 0.001375;
function calcCm360(dpi: number, sens: number): number {
    return Math.round(((360 * 2.54) / (dpi * sens * PUBG_YAW)) * 10) / 10;
}

export const PRO_PLAYERS: readonly ProPlayer[] = [
    // ═══ Team Falcons (ex-Soniqs) ═══
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
        mouse: 'Logitech G PRO X Superlight 2',
        mousepad: 'Artisan FX Type-99 MID XXL',
        gripStyle: 'claw',
        specsUrl: 'https://specs.gg/TGLTN',
        achievements: ['Falcons 2025', 'Ex-Soniqs'],
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
        mousepad: 'ZOWIE G-SR',
        gripStyle: 'palm',
        specsUrl: 'https://specs.gg/Shrimzy',
        achievements: ['Falcons 2025', 'Ex-Soniqs'],
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
        achievements: ['Falcons 2025', 'Ex-Soniqs'],
    },
    {
        id: 'hwinn',
        name: 'hwinn',
        team: 'Falcons',
        countryCode: 'us',
        role: 'IGL',
        dpi: 950,
        inGameSens: 30,
        verticalSensMultiplier: 1.0,
        adsSens: 27,
        cmPer360: calcCm360(950, 30),
        scopeSens: { 'red-dot': 27, '2x': 27, '3x': 27, '4x': 27, '6x': 27, '8x': 27 },
        mouse: 'ZOWIE EC3-DW',
        mousepad: 'ZOWIE G-SR',
        gripStyle: 'claw',
        specsUrl: 'https://specs.gg/hwinn',
        achievements: ['Falcons IGL', 'Ex-Soniqs'],
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
        achievements: ['PGC 2023 Champion', 'Ex-Gen.G'],
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
        scopeSens: { 'red-dot': 41, '2x': 41, '3x': 38, '4x': 38, '6x': 38, '8x': 38 },
        mouse: 'Logitech G PRO X Superlight 2',
        mousepad: 'VAXEE PA Summer23',
        gripStyle: 'claw',
        specsUrl: 'https://specs.gg/Aixleft',
        achievements: ['PGC 2024 Participant'],
    },
    // ═══ T1 ═══
    {
        id: 'eend',
        name: 'EeND',
        team: 'T1',
        countryCode: 'kr',
        role: 'Sniper',
        dpi: 400,
        inGameSens: 45,
        verticalSensMultiplier: 0.85,
        adsSens: 45,
        cmPer360: calcCm360(400, 45),
        scopeSens: { 'red-dot': 45, '2x': 45, '3x': 45, '4x': 45, '6x': 45, '8x': 45 },
        mouse: 'Logitech G PRO X Superlight 2',
        mousepad: 'Artisan Zero XL',
        gripStyle: 'fingertip',
        specsUrl: 'https://specs.gg/EeND',
        achievements: ['T1 PUBG'],
    },
    // ═══ Gen.G ═══
    {
        id: 'salute',
        name: 'Salute',
        team: 'Gen.G',
        countryCode: 'kr',
        role: 'IGL',
        dpi: 400,
        inGameSens: 33,
        verticalSensMultiplier: 0.85,
        adsSens: 42,
        cmPer360: calcCm360(400, 33),
        scopeSens: { 'red-dot': 55, '2x': 48, '3x': 50, '4x': 50, '6x': 50, '8x': 50 },
        mouse: 'Logitech G PRO X Superlight',
        mousepad: 'SteelSeries QcK Heavy XXL',
        gripStyle: 'palm',
        specsUrl: 'https://specs.gg/Salute',
        achievements: ['Gen.G IGL'],
    },
    // ═══ Danawa e-Sports ═══
    {
        id: 'taemin',
        name: 'Taemin',
        team: 'Danawa e-Sports',
        countryCode: 'kr',
        role: 'Support',
        dpi: 800,
        inGameSens: 43,
        verticalSensMultiplier: 1.0,
        adsSens: 43,
        cmPer360: calcCm360(800, 43),
        scopeSens: { 'red-dot': 43, '2x': 40, '3x': 38, '4x': 36, '6x': 30, '8x': 25 },
        mouse: 'ROCCAT KONE Pure Owl-Eye',
        mousepad: 'Razer Gigantus',
        gripStyle: 'claw',
        specsUrl: 'https://specs.gg/Taemin',
        achievements: ['Ex-Gen.G'],
    },
    {
        id: 'inonix',
        name: 'Inonix',
        team: 'Danawa e-Sports',
        countryCode: 'kr',
        role: 'Entry Fragger',
        dpi: 1600,
        inGameSens: 16,
        verticalSensMultiplier: 0.85,
        adsSens: 11,
        cmPer360: calcCm360(1600, 16),
        scopeSens: { 'red-dot': 16, '2x': 11, '3x': 11, '4x': 11, '6x': 11, '8x': 11 },
        mouse: 'ROCCAT Kone Pure Ultra',
        mousepad: 'ZOWIE G-SR-SE Deep Blue',
        gripStyle: 'claw',
        specsUrl: 'https://specs.gg/Inonix',
        achievements: ['Danawa e-Sports'],
    },
    // ═══ FaZe Clan ═══
    {
        id: 'mxey',
        name: 'Mxey',
        team: 'FaZe Clan',
        countryCode: 'fi',
        role: 'IGL',
        dpi: 800,
        inGameSens: 35,
        verticalSensMultiplier: 1.0,
        adsSens: 32,
        cmPer360: calcCm360(800, 35),
        scopeSens: { 'red-dot': 32, '2x': 32, '3x': 32, '4x': 32, '6x': 32, '8x': 32 },
        mouse: 'Logitech G PRO X Superlight',
        mousepad: 'SteelSeries QcK Heavy',
        gripStyle: 'claw',
        specsUrl: 'https://specs.gg/Mxey',
        achievements: ['FaZe Clan IGL'],
    },
    {
        id: 'gustav',
        name: 'Gustav',
        team: 'FaZe Clan',
        countryCode: 'dk',
        role: 'Entry Fragger',
        dpi: 800,
        inGameSens: 36,
        verticalSensMultiplier: 1.0,
        adsSens: 36,
        cmPer360: calcCm360(800, 36),
        scopeSens: { 'red-dot': 36, '2x': 36, '3x': 36, '4x': 36, '6x': 36, '8x': 36 },
        mouse: 'Finalmouse UltralightX',
        mousepad: 'Artisan Hien XL',
        gripStyle: 'claw',
        specsUrl: 'https://specs.gg/Gustav',
        achievements: ['FaZe Fragger'],
    },
    {
        id: 'jeemzz',
        name: 'Jeemzz',
        team: 'FaZe Clan',
        countryCode: 'no',
        role: 'Support',
        dpi: 800,
        inGameSens: 30,
        verticalSensMultiplier: 1.2,
        adsSens: 30,
        cmPer360: calcCm360(800, 30),
        scopeSens: { 'red-dot': 30, '2x': 30, '3x': 30, '4x': 30, '6x': 28, '8x': 27 },
        mouse: 'Logitech G PRO X Superlight 2',
        mousepad: 'Artisan Hien MID XL',
        gripStyle: 'claw',
        specsUrl: 'https://specs.gg/Jeemzz',
        achievements: ['FaZe Veteran', 'PGC Legend'],
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
        scopeSens: { 'red-dot': 37, '2x': 32, '3x': 32, '4x': 32, '6x': 30, '8x': 30 },
        mouse: 'Logitech G PRO X Superlight 2',
        mousepad: 'SteelSeries QcK Heavy',
        gripStyle: 'claw',
        specsUrl: 'https://specs.gg/Fexx',
        achievements: ['FaZe Fragger'],
    },
    // ═══ Twisted Minds ═══
    {
        id: 'xmpl',
        name: 'xmpl',
        team: 'Twisted Minds',
        countryCode: 'ru',
        role: 'IGL',
        dpi: 400,
        inGameSens: 50,
        verticalSensMultiplier: 1.0,
        adsSens: 39,
        cmPer360: calcCm360(400, 50),
        scopeSens: { 'red-dot': 50, '2x': 39, '3x': 39, '4x': 39, '6x': 39, '8x': 39 },
        mouse: 'Ninjutso Sora V2',
        mousepad: 'Artisan FX Hayate Otsu MID XL',
        gripStyle: 'claw',
        specsUrl: 'https://specs.gg/xmpl',
        achievements: ['EWC 2025 Champion'],
    },
    {
        id: 'batulins',
        name: 'BatulinS',
        team: 'Twisted Minds',
        countryCode: 'ru',
        role: 'Entry Fragger',
        dpi: 400,
        inGameSens: 51,
        verticalSensMultiplier: 1.0,
        adsSens: 35,
        cmPer360: calcCm360(400, 51),
        scopeSens: { 'red-dot': 51, '2x': 39, '3x': 39, '4x': 39, '6x': 39, '8x': 39 },
        mouse: 'Logitech G PRO X Superlight 2',
        mousepad: 'Artisan Zero MID XL',
        gripStyle: 'claw',
        specsUrl: 'https://specs.gg/BatulinS',
        achievements: ['EWC 2025 Champion'],
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
        scopeSens: { 'red-dot': 35, '2x': 31, '3x': 30, '4x': 30, '6x': 30, '8x': 30 },
        mouse: 'Logitech G PRO X Superlight',
        mousepad: 'SteelSeries QcK Heavy',
        gripStyle: 'claw',
        specsUrl: 'https://specs.gg/Lu',
        achievements: ['EWC 2025 Champion'],
    },
    // ═══ NAVI ═══
    {
        id: 'feyerist',
        name: 'Feyerist',
        team: 'NAVI',
        countryCode: 'ua',
        role: 'Entry Fragger',
        dpi: 400,
        inGameSens: 50,
        verticalSensMultiplier: 1.0,
        adsSens: 39,
        cmPer360: calcCm360(400, 50),
        scopeSens: { 'red-dot': 50, '2x': 45, '3x': 42, '4x': 40, '6x': 35, '8x': 30 },
        mouse: 'Pulsar X2 Mini',
        mousepad: 'Artisan FX Zero SOFT XL',
        gripStyle: 'claw',
        specsUrl: 'https://specs.gg/Feyerist',
        achievements: ['NAVI 2025'],
    },
    // ═══ Team Liquid ═══
    {
        id: 'luke12',
        name: 'luke12',
        team: 'Team Liquid',
        countryCode: 'br',
        role: 'Entry Fragger',
        dpi: 400,
        inGameSens: 49,
        verticalSensMultiplier: 1.0,
        adsSens: 35,
        cmPer360: calcCm360(400, 49),
        scopeSens: { 'red-dot': 49, '2x': 45, '3x': 45, '4x': 45, '6x': 45, '8x': 45 },
        mouse: 'Logitech G PRO X Superlight',
        mousepad: 'Artisan Zero MID XL',
        gripStyle: 'claw',
        specsUrl: 'https://specs.gg/luke12',
        achievements: ['Team Liquid'],
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
        mouse: 'Logitech G PRO X Superlight 2',
        mousepad: 'Artisan Hien MID XL',
        gripStyle: 'claw',
        specsUrl: 'https://specs.gg/guizeraa',
        achievements: ['FURIA PUBG'],
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
        mouse: 'Razer Viper V3 Pro',
        mousepad: 'Artisan Hien MID XL',
        gripStyle: 'claw',
        specsUrl: 'https://specs.gg/zkrakeN',
        achievements: ['FURIA PUBG'],
    },
    // ═══ Al Qadsiah ═══
    {
        id: 'relo',
        name: 'Relo',
        team: 'Al Qadsiah',
        countryCode: 'kr',
        role: 'IGL',
        dpi: 800,
        inGameSens: 35,
        verticalSensMultiplier: 1.0,
        adsSens: 30,
        cmPer360: calcCm360(800, 35),
        scopeSens: { 'red-dot': 30, '2x': 30, '3x': 30, '4x': 30, '6x': 30, '8x': 30 },
        mouse: 'Logitech G PRO X Superlight 2',
        mousepad: 'Artisan Zero MID XL',
        gripStyle: 'claw',
        specsUrl: 'https://specs.gg/Relo',
        achievements: ['Al Qadsiah IGL'],
    },
    // ═══ Four Angry Men (4AM) ═══
    {
        id: 'god',
        name: 'God',
        team: 'Four Angry Men',
        countryCode: 'cn',
        role: 'Entry Fragger',
        dpi: 800,
        inGameSens: 47,
        verticalSensMultiplier: 1.0,
        adsSens: 40,
        cmPer360: calcCm360(800, 47),
        scopeSens: { 'red-dot': 47, '2x': 45, '3x': 43, '4x': 40, '6x': 34, '8x': 28 },
        mouse: 'Logitech G PRO X Superlight 2',
        mousepad: 'Artisan Hien XL',
        gripStyle: 'claw',
        specsUrl: 'https://specs.gg/God',
        achievements: ['4AM Core'],
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
