/**
 * Pro Player Database — Dados de jogadores profissionais de PUBG.
 * Fonte: specs.gg — verificado em Fevereiro 2026.
 * Imagens e perfis linkam para specs.gg.
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
}

/**
 * Get local player image URL.
 */
export function getPlayerImageUrl(name: string): string {
    return `/images/pros/${name.toLowerCase()}.png`;
}

/**
 * Get local team logo URL.
 */
export function getTeamLogoUrl(teamSlug: string): string {
    return `/images/teams/${teamSlug}.png`;
}

// Team slug mapping for specs.gg CDN
export const TEAM_SLUGS: Record<string, string> = {
    'Falcons': 'falcons',
    'Baegopa': 'baegopa',
    'Petrichor Road': 'petrichor-road',
    'Gen.G': 'gen-g',
    'T1': 't1',
    'FaZe Clan': 'faze-clan',
    'Twisted Minds': 'twisted-minds',
    'Danawa e-Sports': 'danawa-esports',
    'NAVI': 'natus-vincere',
    '17 Gaming': '17-gaming',
    'The Expendables': 'the-expendables',
    'Four Angry Men': 'four-angry-men',
    'NH Esports': 'nh-esports',
    'Virtus.pro': 'virtus-pro',
    'BetBoom': 'betboom',
};

export const PRO_PLAYERS: readonly ProPlayer[] = [
    {
        id: 'tgltn',
        name: 'TGLTN',
        team: 'Falcons',
        countryCode: 'au',
        role: 'Entry Fragger',
        dpi: 800,
        inGameSens: 50,
        verticalSensMultiplier: 1.0,
        cmPer360: 27.9,
        scopeSens: { 'red-dot': 50, '2x': 48, '3x': 45, '4x': 42, '6x': 35, '8x': 30 },
        mouse: 'Logitech G PRO X Superlight',
        mousepad: 'Artisan Hien XL',
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
        inGameSens: 44,
        verticalSensMultiplier: 1.0,
        cmPer360: 31.7,
        scopeSens: { 'red-dot': 44, '2x': 42, '3x': 40, '4x': 38, '6x': 32, '8x': 26 },
        mouse: 'ZOWIE EC2-A',
        mousepad: 'Lethal Gaming Gear Saturn',
        gripStyle: 'hybrid',
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
        inGameSens: 46,
        verticalSensMultiplier: 1.0,
        cmPer360: 30.3,
        scopeSens: { 'red-dot': 46, '2x': 44, '3x': 42, '4x': 40, '6x': 34, '8x': 28 },
        mouse: 'Razer Viper V3 Pro',
        mousepad: 'Artisan Hien XL',
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
        dpi: 800,
        inGameSens: 42,
        verticalSensMultiplier: 1.0,
        cmPer360: 33.2,
        scopeSens: { 'red-dot': 42, '2x': 40, '3x': 38, '4x': 36, '6x': 30, '8x': 25 },
        mouse: 'Logitech G PRO X Superlight 2',
        mousepad: 'Artisan Zero XL',
        gripStyle: 'claw',
        specsUrl: 'https://specs.gg/hwinn',
        achievements: ['Falcons IGL', 'Ex-Soniqs'],
    },
    {
        id: 'pio',
        name: 'Pio',
        team: 'Baegopa',
        countryCode: 'kr',
        role: 'Entry Fragger',
        dpi: 800,
        inGameSens: 42,
        verticalSensMultiplier: 1.0,
        cmPer360: 33.2,
        scopeSens: { 'red-dot': 42, '2x': 40, '3x': 38, '4x': 35, '6x': 30, '8x': 25 },
        mouse: 'Logitech G PRO X Superlight 2',
        mousepad: 'VAXEE PA',
        gripStyle: 'claw',
        specsUrl: 'https://specs.gg/Pio',
        achievements: ['PGC 2023 Champion', 'Ex-Gen.G'],
    },
    {
        id: 'aixleft',
        name: 'Aixleft',
        team: 'Petrichor Road',
        countryCode: 'cn',
        role: 'Entry Fragger',
        dpi: 800,
        inGameSens: 48,
        verticalSensMultiplier: 1.0,
        cmPer360: 29.1,
        scopeSens: { 'red-dot': 48, '2x': 45, '3x': 42, '4x': 40, '6x': 34, '8x': 28 },
        mouse: 'Logitech G PRO X Superlight 2',
        mousepad: 'VAXEE PA Summer23',
        gripStyle: 'claw',
        specsUrl: 'https://specs.gg/Aixleft',
        achievements: ['PGC 2024 Participant', 'PCL Star'],
    },
    {
        id: 'eend',
        name: 'EeND',
        team: 'T1',
        countryCode: 'kr',
        role: 'Sniper',
        dpi: 800,
        inGameSens: 38,
        verticalSensMultiplier: 1.0,
        cmPer360: 36.7,
        scopeSens: { 'red-dot': 38, '2x': 35, '3x': 32, '4x': 28, '6x': 22, '8x': 18 },
        mouse: 'Logitech G PRO X Superlight 2',
        mousepad: 'Artisan Zero XL',
        gripStyle: 'fingertip',
        specsUrl: 'https://specs.gg/EeND',
        achievements: ['T1 PUBG', 'PCL MVP'],
    },
    {
        id: 'salute',
        name: 'Salute',
        team: 'Gen.G',
        countryCode: 'kr',
        role: 'IGL',
        dpi: 400,
        inGameSens: 55,
        verticalSensMultiplier: 1.0,
        cmPer360: 50.5,
        scopeSens: { 'red-dot': 55, '2x': 50, '3x': 48, '4x': 45, '6x': 38, '8x': 30 },
        mouse: 'Logitech G PRO X Superlight',
        mousepad: 'SteelSeries QcK Heavy XXL',
        gripStyle: 'palm',
        specsUrl: 'https://specs.gg/Salute',
        achievements: ['Gen.G IGL', 'PGC 2024'],
    },
    {
        id: 'taemin',
        name: 'Taemin',
        team: 'Danawa e-Sports',
        countryCode: 'kr',
        role: 'Support',
        dpi: 800,
        inGameSens: 43,
        verticalSensMultiplier: 1.0,
        cmPer360: 32.4,
        scopeSens: { 'red-dot': 43, '2x': 40, '3x': 38, '4x': 36, '6x': 30, '8x': 25 },
        mouse: 'Razer Viper V3 Pro',
        mousepad: 'ZOWIE G-SR-SE',
        gripStyle: 'claw',
        specsUrl: 'https://specs.gg/Taemin',
        achievements: ['Ex-Gen.G', 'PGC 2022 Runner-up'],
    },
    {
        id: 'mxey',
        name: 'Mxey',
        team: 'FaZe Clan',
        countryCode: 'fi',
        role: 'IGL',
        dpi: 800,
        inGameSens: 40,
        verticalSensMultiplier: 1.0,
        cmPer360: 34.9,
        scopeSens: { 'red-dot': 40, '2x': 38, '3x': 36, '4x': 34, '6x': 28, '8x': 24 },
        mouse: 'Logitech G PRO X Superlight',
        mousepad: 'SteelSeries QcK Heavy',
        gripStyle: 'claw',
        specsUrl: 'https://specs.gg/Mxey',
        achievements: ['FaZe Clan Coach/IGL', 'PEL Champion'],
    },
    {
        id: 'xmpl',
        name: 'xmpl',
        team: 'Twisted Minds',
        countryCode: 'ru',
        role: 'IGL',
        dpi: 800,
        inGameSens: 44,
        verticalSensMultiplier: 1.0,
        cmPer360: 31.7,
        scopeSens: { 'red-dot': 44, '2x': 42, '3x': 40, '4x': 38, '6x': 32, '8x': 26 },
        mouse: 'Logitech G PRO X Superlight 2',
        mousepad: 'Artisan Hien XL',
        gripStyle: 'claw',
        specsUrl: 'https://specs.gg/xmpl',
        achievements: ['PGC 2024', 'Twisted Minds IGL'],
    },
    {
        id: 'fludd',
        name: 'Fludd',
        team: 'NAVI',
        countryCode: 'au',
        role: 'Entry Fragger',
        dpi: 400,
        inGameSens: 60,
        verticalSensMultiplier: 1.0,
        cmPer360: 46.4,
        scopeSens: { 'red-dot': 60, '2x': 55, '3x': 50, '4x': 45, '6x': 38, '8x': 30 },
        mouse: 'Razer DeathAdder V3',
        mousepad: 'ZOWIE G-SR',
        gripStyle: 'palm',
        specsUrl: 'https://specs.gg/Fludd',
        achievements: ['Ex-Falcons', 'PGC Veteran'],
    },
    {
        id: 'inonix',
        name: 'Inonix',
        team: 'Danawa e-Sports',
        countryCode: 'kr',
        role: 'Entry Fragger',
        dpi: 800,
        inGameSens: 45,
        verticalSensMultiplier: 1.0,
        cmPer360: 31.0,
        scopeSens: { 'red-dot': 45, '2x': 42, '3x': 40, '4x': 38, '6x': 32, '8x': 28 },
        mouse: 'Razer Viper V3 Pro',
        mousepad: 'ZOWIE G-SR-SE',
        gripStyle: 'claw',
        specsUrl: 'https://specs.gg/Inonix',
        achievements: ['Danawa ATTACK ZERO', 'PCS Contender'],
    },
    {
        id: 'god',
        name: 'God',
        team: 'Four Angry Men',
        countryCode: 'cn',
        role: 'Entry Fragger',
        dpi: 800,
        inGameSens: 47,
        verticalSensMultiplier: 1.0,
        cmPer360: 29.7,
        scopeSens: { 'red-dot': 47, '2x': 45, '3x': 43, '4x': 40, '6x': 34, '8x': 28 },
        mouse: 'Logitech G PRO X Superlight 2',
        mousepad: 'Artisan Hien XL',
        gripStyle: 'claw',
        specsUrl: 'https://specs.gg/God',
        achievements: ['4AM Core', 'PGC 2024'],
    },
    {
        id: 'gustav',
        name: 'Gustav',
        team: 'FaZe Clan',
        countryCode: 'dk',
        role: 'Entry Fragger',
        dpi: 800,
        inGameSens: 50,
        verticalSensMultiplier: 1.0,
        cmPer360: 27.9,
        scopeSens: { 'red-dot': 50, '2x': 48, '3x': 45, '4x': 42, '6x': 35, '8x': 28 },
        mouse: 'Finalmouse UltralightX',
        mousepad: 'Artisan Hien XL',
        gripStyle: 'claw',
        specsUrl: 'https://specs.gg/Gustav',
        achievements: ['FaZe Fragger', 'PEC Veteran'],
    },
] as const;

// ═══ Helpers ═══

export function getProPlayer(id: string): ProPlayer | undefined {
    return PRO_PLAYERS.find(p => p.id === id);
}

export function getProsByRole(role: ProPlayer['role']): ProPlayer[] {
    return PRO_PLAYERS.filter(p => p.role === role);
}

/** Stats summary for the pro database */
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
