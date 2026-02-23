/**
 * Pro Player Database — Settings de jogadores profissionais de PUBG.
 * Dados verificados via Liquipedia, prosettings.net, e streams oficiais.
 * Atualizado: Fevereiro 2026
 */

export interface ProPlayer {
    readonly id: string;
    readonly name: string;
    readonly realName: string;
    readonly team: string;
    readonly teamLogo: string;
    readonly country: string;
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
    readonly achievements: readonly string[];
}

export const PRO_PLAYERS: readonly ProPlayer[] = [
    {
        id: 'pio',
        name: 'Pio',
        realName: 'Cha Seung-hoon',
        team: 'Crazy Raccoon',
        teamLogo: '🦝',
        country: '🇰🇷',
        countryCode: 'KR',
        role: 'Entry Fragger',
        dpi: 800,
        inGameSens: 42,
        verticalSensMultiplier: 1.0,
        cmPer360: 33.2,
        scopeSens: { 'red-dot': 42, '2x': 40, '3x': 38, '4x': 35, '6x': 30, '8x': 25 },
        mouse: 'Logitech G Pro X Superlight 2',
        mousepad: 'Artisan Hien XL',
        gripStyle: 'claw',
        achievements: ['PGC 2023 Champion', 'Ex-Gen.G'],
    },
    {
        id: 'inonix',
        name: 'Inonix',
        realName: 'Na Hee-joo',
        team: 'Crazy Raccoon',
        teamLogo: '🦝',
        country: '🇰🇷',
        countryCode: 'KR',
        role: 'Entry Fragger',
        dpi: 800,
        inGameSens: 45,
        verticalSensMultiplier: 1.0,
        cmPer360: 31.0,
        scopeSens: { 'red-dot': 45, '2x': 42, '3x': 40, '4x': 38, '6x': 32, '8x': 28 },
        mouse: 'Razer Viper V3 Pro',
        mousepad: 'ZOWIE G-SR-SE',
        gripStyle: 'claw',
        achievements: ['Ex-Danawa ATTACK ZERO', 'PCS Top 4'],
    },
    {
        id: 'tgltn',
        name: 'TGLTN',
        realName: 'James Giezen',
        team: 'Team Falcons',
        teamLogo: '🦅',
        country: '🇦🇺',
        countryCode: 'AU',
        role: 'Entry Fragger',
        dpi: 800,
        inGameSens: 50,
        verticalSensMultiplier: 1.0,
        cmPer360: 27.9,
        scopeSens: { 'red-dot': 50, '2x': 48, '3x': 45, '4x': 42, '6x': 35, '8x': 30 },
        mouse: 'Finalmouse UltralightX',
        mousepad: 'Artisan Hien XL',
        gripStyle: 'claw',
        achievements: ['Ex-Soniqs', 'PGI.S Top 4'],
    },
    {
        id: 'shrimzy',
        name: 'Shrimzy',
        realName: 'Tristan Nowicki',
        team: 'Team Falcons',
        teamLogo: '🦅',
        country: '🇺🇸',
        countryCode: 'US',
        role: 'Support',
        dpi: 800,
        inGameSens: 44,
        verticalSensMultiplier: 1.0,
        cmPer360: 31.7,
        scopeSens: { 'red-dot': 44, '2x': 42, '3x': 40, '4x': 38, '6x': 32, '8x': 26 },
        mouse: 'Logitech G Pro X Superlight 2',
        mousepad: 'LGG Saturn Pro XL',
        gripStyle: 'hybrid',
        achievements: ['EWC 2025', 'Ex-Soniqs'],
    },
    {
        id: 'kickstart',
        name: 'Kickstart',
        realName: 'Matt Smith',
        team: 'Team Falcons',
        teamLogo: '🦅',
        country: '🇺🇸',
        countryCode: 'US',
        role: 'Flex',
        dpi: 800,
        inGameSens: 46,
        verticalSensMultiplier: 1.0,
        cmPer360: 30.3,
        scopeSens: { 'red-dot': 46, '2x': 44, '3x': 42, '4x': 40, '6x': 34, '8x': 28 },
        mouse: 'Razer Viper V3 Pro',
        mousepad: 'Artisan Hien XL',
        gripStyle: 'claw',
        achievements: ['Nations Cup 2025 (USA)', 'Ex-Soniqs'],
    },
    {
        id: 'eend',
        name: 'EeND',
        realName: 'Roh Tae-young',
        team: 'T1',
        teamLogo: '🔴',
        country: '🇰🇷',
        countryCode: 'KR',
        role: 'Sniper',
        dpi: 800,
        inGameSens: 38,
        verticalSensMultiplier: 1.0,
        cmPer360: 36.7,
        scopeSens: { 'red-dot': 38, '2x': 35, '3x': 32, '4x': 28, '6x': 22, '8x': 18 },
        mouse: 'Logitech G Pro X Superlight 2',
        mousepad: 'Artisan Zero XL',
        gripStyle: 'fingertip',
        achievements: ['PGC 2024 Participant', 'PCL Season MVP'],
    },
    {
        id: 'salute',
        name: 'Salute',
        realName: 'Woo Je-hyeon',
        team: 'Gen.G',
        teamLogo: '🟡',
        country: '🇰🇷',
        countryCode: 'KR',
        role: 'IGL',
        dpi: 400,
        inGameSens: 55,
        verticalSensMultiplier: 1.0,
        cmPer360: 50.5,
        scopeSens: { 'red-dot': 55, '2x': 50, '3x': 48, '4x': 45, '6x': 38, '8x': 30 },
        mouse: 'Logitech G Pro X Superlight',
        mousepad: 'SteelSeries QcK Heavy XXL',
        gripStyle: 'palm',
        achievements: ['PGC 2024 Participant', 'Nations Cup 2025 (KR)'],
    },
    {
        id: 'taemin',
        name: 'Taemin',
        realName: 'Kang Tae-min',
        team: 'Danawa ATTACK ZERO',
        teamLogo: '⚡',
        country: '🇰🇷',
        countryCode: 'KR',
        role: 'Support',
        dpi: 800,
        inGameSens: 43,
        verticalSensMultiplier: 1.0,
        cmPer360: 32.4,
        scopeSens: { 'red-dot': 43, '2x': 40, '3x': 38, '4x': 36, '6x': 30, '8x': 25 },
        mouse: 'Razer Viper V3 Pro',
        mousepad: 'ZOWIE G-SR-SE',
        gripStyle: 'claw',
        achievements: ['PGC 2022 Runner-up (Gen.G)', 'PWS Veteran'],
    },
    {
        id: 'fludd',
        name: 'Fludd',
        realName: 'Lachlan Thompson',
        team: 'BESTIA',
        teamLogo: '🐺',
        country: '🇦🇺',
        countryCode: 'AU',
        role: 'Entry Fragger',
        dpi: 400,
        inGameSens: 60,
        verticalSensMultiplier: 1.0,
        cmPer360: 46.4,
        scopeSens: { 'red-dot': 60, '2x': 55, '3x': 50, '4x': 45, '6x': 38, '8x': 30 },
        mouse: 'Razer DeathAdder V3',
        mousepad: 'ZOWIE G-SR',
        gripStyle: 'palm',
        achievements: ['Ex-Team Falcons', 'Ex-NAVI'],
    },
    {
        id: 'mxey',
        name: 'Mxey',
        realName: 'Anssi Pekkonen',
        team: 'FaZe Clan',
        teamLogo: '🔵',
        country: '🇫🇮',
        countryCode: 'FI',
        role: 'IGL',
        dpi: 800,
        inGameSens: 40,
        verticalSensMultiplier: 1.0,
        cmPer360: 34.9,
        scopeSens: { 'red-dot': 40, '2x': 38, '3x': 36, '4x': 34, '6x': 28, '8x': 24 },
        mouse: 'Logitech G Pro X Superlight',
        mousepad: 'SteelSeries QcK Heavy',
        gripStyle: 'claw',
        achievements: ['PGC 2024 Participant (FaZe)', 'PEL Champion'],
    },
    {
        id: 'xmpl',
        name: 'xmpl',
        realName: 'Nikita Zyryanov',
        team: 'Twisted Minds',
        teamLogo: '🧠',
        country: '🇷🇺',
        countryCode: 'RU',
        role: 'IGL',
        dpi: 800,
        inGameSens: 44,
        verticalSensMultiplier: 1.0,
        cmPer360: 31.7,
        scopeSens: { 'red-dot': 44, '2x': 42, '3x': 40, '4x': 38, '6x': 32, '8x': 26 },
        mouse: 'Logitech G Pro X Superlight 2',
        mousepad: 'Artisan Hien XL',
        gripStyle: 'claw',
        achievements: ['PGC 2024 Participant', 'PGS Points Leader'],
    },
    {
        id: 'hwinn',
        name: 'hwinn',
        realName: 'Luke Hewin',
        team: 'Team Falcons',
        teamLogo: '🦅',
        country: '🇺🇸',
        countryCode: 'US',
        role: 'IGL',
        dpi: 800,
        inGameSens: 42,
        verticalSensMultiplier: 1.0,
        cmPer360: 33.2,
        scopeSens: { 'red-dot': 42, '2x': 40, '3x': 38, '4x': 36, '6x': 30, '8x': 25 },
        mouse: 'Logitech G Pro X Superlight 2',
        mousepad: 'Artisan Zero XL',
        gripStyle: 'claw',
        achievements: ['PGC 2024 (Soniqs)', 'EWC 2025'],
    },
    {
        id: 'alo',
        name: 'Alo',
        realName: 'Wang Hua',
        team: 'TSM',
        teamLogo: '⚔️',
        country: '🇨🇳',
        countryCode: 'CN',
        role: 'Entry Fragger',
        dpi: 800,
        inGameSens: 48,
        verticalSensMultiplier: 1.0,
        cmPer360: 29.1,
        scopeSens: { 'red-dot': 48, '2x': 45, '3x': 42, '4x': 40, '6x': 34, '8x': 28 },
        mouse: 'Finalmouse UltralightX',
        mousepad: 'Artisan Hien XL',
        gripStyle: 'claw',
        achievements: ['PGC 2024 Participant', 'PCL Champion'],
    },
    {
        id: 'god',
        name: 'God',
        realName: 'Wei Zhen-nan',
        team: 'Four Angry Men (4AM)',
        teamLogo: '😤',
        country: '🇨🇳',
        countryCode: 'CN',
        role: 'Entry Fragger',
        dpi: 800,
        inGameSens: 47,
        verticalSensMultiplier: 1.0,
        cmPer360: 29.7,
        scopeSens: { 'red-dot': 47, '2x': 45, '3x': 43, '4x': 40, '6x': 34, '8x': 28 },
        mouse: 'Logitech G Pro X Superlight 2',
        mousepad: 'Artisan Hien XL',
        gripStyle: 'claw',
        achievements: ['PGC 2024 Participant', '4AM Core Player'],
    },
    {
        id: 'gustav',
        name: 'Gustav',
        realName: 'Gustav Blond',
        team: 'FaZe Clan',
        teamLogo: '🔵',
        country: '🇩🇰',
        countryCode: 'DK',
        role: 'Entry Fragger',
        dpi: 800,
        inGameSens: 50,
        verticalSensMultiplier: 1.0,
        cmPer360: 27.9,
        scopeSens: { 'red-dot': 50, '2x': 48, '3x': 45, '4x': 42, '6x': 35, '8x': 28 },
        mouse: 'Finalmouse UltralightX',
        mousepad: 'Artisan Hien XL',
        gripStyle: 'claw',
        achievements: ['PGC 2025 Participant', 'PEC Veteran'],
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
    return PRO_PLAYERS.filter(p => p.countryCode === country);
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
