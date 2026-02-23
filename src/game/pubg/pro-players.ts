/**
 * Pro Player Database — Settings de jogadores profissionais de PUBG.
 * Dados compilados de streams, entrevistas e configs públicas.
 */

export interface ProPlayer {
    readonly id: string;
    readonly name: string;
    readonly team: string;
    readonly country: string;
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
    readonly achievements: readonly string[];
}

export const PRO_PLAYERS: readonly ProPlayer[] = [
    {
        id: 'pio',
        name: 'Pio',
        team: 'Danawa e-Sports',
        country: '🇰🇷',
        role: 'Entry Fragger',
        dpi: 800,
        inGameSens: 42,
        verticalSensMultiplier: 1.0,
        cmPer360: 33.2,
        scopeSens: { 'red-dot': 42, '2x': 40, '3x': 38, '4x': 35, '6x': 30, '8x': 25 },
        mouse: 'Logitech G Pro X Superlight 2',
        mousepad: 'Artisan Hien XL',
        gripStyle: 'claw',
        achievements: ['PGC 2023 Champion', 'PCS7 Winner'],
    },
    {
        id: 'inonix',
        name: 'Inonix',
        team: 'Gen.G',
        country: '🇰🇷',
        role: 'Entry Fragger',
        dpi: 800,
        inGameSens: 45,
        verticalSensMultiplier: 1.0,
        cmPer360: 31.0,
        scopeSens: { 'red-dot': 45, '2x': 42, '3x': 40, '4x': 38, '6x': 32, '8x': 28 },
        mouse: 'Razer Viper V3 Pro',
        mousepad: 'ZOWIE G-SR-SE',
        gripStyle: 'claw',
        achievements: ['PGC 2022 Runner-up', 'Multiple PCS Wins'],
    },
    {
        id: 'salute',
        name: 'Salute',
        team: 'Twisted Minds',
        country: '🇸🇦',
        role: 'IGL',
        dpi: 400,
        inGameSens: 55,
        verticalSensMultiplier: 1.0,
        cmPer360: 50.5,
        scopeSens: { 'red-dot': 55, '2x': 50, '3x': 48, '4x': 45, '6x': 38, '8x': 30 },
        mouse: 'Logitech G Pro X Superlight',
        mousepad: 'SteelSeries QcK Heavy XXL',
        gripStyle: 'palm',
        achievements: ['PMGC 2023 Top 4', 'EMEA Champion'],
    },
    {
        id: 'eend',
        name: 'EeND',
        team: '17 Gaming',
        country: '🇨🇳',
        role: 'Sniper',
        dpi: 800,
        inGameSens: 38,
        verticalSensMultiplier: 1.0,
        cmPer360: 36.7,
        scopeSens: { 'red-dot': 38, '2x': 35, '3x': 32, '4x': 28, '6x': 22, '8x': 18 },
        mouse: 'Logitech G Pro X Superlight 2',
        mousepad: 'Artisan Zero XL',
        gripStyle: 'fingertip',
        achievements: ['PGC 2024 Champion', 'PCL Season MVP'],
    },
    {
        id: 'tgltn',
        name: 'TGLTN',
        team: 'Soniqs',
        country: '🇩🇪',
        role: 'Entry Fragger',
        dpi: 800,
        inGameSens: 50,
        verticalSensMultiplier: 1.0,
        cmPer360: 27.9,
        scopeSens: { 'red-dot': 50, '2x': 48, '3x': 45, '4x': 42, '6x': 35, '8x': 30 },
        mouse: 'Finalmouse UltralightX',
        mousepad: 'Artisan Hien XL',
        gripStyle: 'claw',
        achievements: ['PGI.S Top 4', 'NPL Season 3 Winner'],
    },
    {
        id: 'shrimzy',
        name: 'Shrimzy',
        team: 'Soniqs',
        country: '🇺🇸',
        role: 'Support',
        dpi: 800,
        inGameSens: 44,
        verticalSensMultiplier: 1.0,
        cmPer360: 31.7,
        scopeSens: { 'red-dot': 44, '2x': 42, '3x': 40, '4x': 38, '6x': 32, '8x': 26 },
        mouse: 'Logitech G Pro X Superlight 2',
        mousepad: 'LGG Saturn Pro XL',
        gripStyle: 'hybrid',
        achievements: ['PCS7 Americas Winner', 'PGC 2023 Top 8'],
    },
    {
        id: 'fludd',
        name: 'Fludd',
        team: 'NAVI',
        country: '🇺🇦',
        role: 'Entry Fragger',
        dpi: 400,
        inGameSens: 60,
        verticalSensMultiplier: 1.0,
        cmPer360: 46.4,
        scopeSens: { 'red-dot': 60, '2x': 55, '3x': 50, '4x': 45, '6x': 38, '8x': 30 },
        mouse: 'Razer DeathAdder V3',
        mousepad: 'ZOWIE G-SR',
        gripStyle: 'palm',
        achievements: ['PGC 2022 Top 4', 'PEL Champion'],
    },
    {
        id: 'mxey',
        name: 'Mxey',
        team: 'NAVI',
        country: '🇩🇪',
        role: 'IGL',
        dpi: 800,
        inGameSens: 40,
        verticalSensMultiplier: 1.0,
        cmPer360: 34.9,
        scopeSens: { 'red-dot': 40, '2x': 38, '3x': 36, '4x': 34, '6x': 28, '8x': 24 },
        mouse: 'Logitech G Pro X Superlight',
        mousepad: 'SteelSeries QcK Heavy',
        gripStyle: 'claw',
        achievements: ['PEL Champion', 'PGC 2022 Top 4'],
    },
    {
        id: 'sezk0',
        name: 'Sezk0',
        team: 'FaZe Clan',
        country: '🇩🇰',
        role: 'Entry Fragger',
        dpi: 800,
        inGameSens: 48,
        verticalSensMultiplier: 1.0,
        cmPer360: 29.1,
        scopeSens: { 'red-dot': 48, '2x': 45, '3x': 42, '4x': 40, '6x': 34, '8x': 28 },
        mouse: 'Finalmouse UltralightX',
        mousepad: 'Artisan Hien XL',
        gripStyle: 'claw',
        achievements: ['PCS7 Europe Winner', 'PGC 2024 Top 8'],
    },
    {
        id: 'taemin',
        name: 'Taemin',
        team: 'Gen.G',
        country: '🇰🇷',
        role: 'Support',
        dpi: 800,
        inGameSens: 43,
        verticalSensMultiplier: 1.0,
        cmPer360: 32.4,
        scopeSens: { 'red-dot': 43, '2x': 40, '3x': 38, '4x': 36, '6x': 30, '8x': 25 },
        mouse: 'Razer Viper V3 Pro',
        mousepad: 'ZOWIE G-SR-SE',
        gripStyle: 'claw',
        achievements: ['PGC 2022 Runner-up', 'PCS Multiple Wins'],
    },
    {
        id: 'loki',
        name: 'Loki',
        team: 'Danawa e-Sports',
        country: '🇰🇷',
        role: 'Sniper',
        dpi: 400,
        inGameSens: 50,
        verticalSensMultiplier: 1.0,
        cmPer360: 55.7,
        scopeSens: { 'red-dot': 50, '2x': 45, '3x': 40, '4x': 35, '6x': 28, '8x': 20 },
        mouse: 'Logitech G Pro X Superlight 2',
        mousepad: 'Artisan Zero XL',
        gripStyle: 'fingertip',
        achievements: ['PGC 2023 Champion', 'Known for insane DMR shots'],
    },
    {
        id: 'kickstart',
        name: 'Kickstart',
        team: 'NH',
        country: '🇰🇷',
        role: 'Flex',
        dpi: 800,
        inGameSens: 46,
        verticalSensMultiplier: 1.0,
        cmPer360: 30.3,
        scopeSens: { 'red-dot': 46, '2x': 44, '3x': 42, '4x': 40, '6x': 34, '8x': 28 },
        mouse: 'Razer Viper V3 Pro',
        mousepad: 'Artisan Hien XL',
        gripStyle: 'claw',
        achievements: ['PCS Veteran', 'Consistent Top 4 finishes'],
    },
    {
        id: 'godnixon',
        name: 'GodNixon',
        team: 'NH',
        country: '🇰🇷',
        role: 'Entry Fragger',
        dpi: 800,
        inGameSens: 47,
        verticalSensMultiplier: 1.0,
        cmPer360: 29.7,
        scopeSens: { 'red-dot': 47, '2x': 45, '3x': 43, '4x': 40, '6x': 34, '8x': 28 },
        mouse: 'Logitech G Pro X Superlight 2',
        mousepad: 'Artisan Hien XL',
        gripStyle: 'claw',
        achievements: ['PGC 2024 Top 4', 'PKL Champion'],
    },
    {
        id: 'stk',
        name: 'STK',
        team: 'Twisted Minds',
        country: '🇹🇷',
        role: 'Entry Fragger',
        dpi: 800,
        inGameSens: 52,
        verticalSensMultiplier: 1.0,
        cmPer360: 26.8,
        scopeSens: { 'red-dot': 52, '2x': 50, '3x': 48, '4x': 45, '6x': 38, '8x': 32 },
        mouse: 'Finalmouse UltralightX',
        mousepad: 'Artisan Hien XL',
        gripStyle: 'claw',
        achievements: ['PMGC 2023 Top 4', 'EMEA Superstar'],
    },
    {
        id: 'kikilin',
        name: 'KikiLin',
        team: '17 Gaming',
        country: '🇨🇳',
        role: 'IGL',
        dpi: 400,
        inGameSens: 48,
        verticalSensMultiplier: 1.0,
        cmPer360: 58.0,
        scopeSens: { 'red-dot': 48, '2x': 44, '3x': 40, '4x': 36, '6x': 28, '8x': 22 },
        mouse: 'Logitech G Pro X Superlight',
        mousepad: 'SteelSeries QcK Heavy XXL',
        gripStyle: 'palm',
        achievements: ['PGC 2024 Champion', 'PCL Multi-Season MVP'],
    },
] as const;

// ═══ Helpers ═══

export function getProPlayer(id: string): ProPlayer | undefined {
    return PRO_PLAYERS.find(p => p.id === id);
}

export function getProsByRole(role: ProPlayer['role']): ProPlayer[] {
    return PRO_PLAYERS.filter(p => p.role === role);
}

export function getProsByCountry(country: string): ProPlayer[] {
    return PRO_PLAYERS.filter(p => p.country === country);
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
        medianCmPer360: sensValues.sort((a, b) => a - b)[Math.floor(sensValues.length / 2)]!,
        mostCommonDpi: dpiValues.filter(d => d === 800).length > dpiValues.length / 2 ? 800 : 400,
        mostCommonGrip: 'claw' as const,
    };
}
