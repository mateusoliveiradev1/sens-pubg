/**
 * PUBG Scope Multipliers & ADS Behavior.
 * Multiplicadores de sensibilidade por scope, scaling ADS,
 * e fórmulas de conversão FOV-to-sensitivity.
 */

// ═══════════════════════════════════════════
// Scope Data
// ═══════════════════════════════════════════

export interface ScopeData {
    readonly id: string;
    readonly name: string;
    readonly magnification: number;
    readonly sensitivityMultiplier: number;  // Multiplicador padrão do PUBG
    readonly fovReduction: number;           // Fator de redução do FOV ao usar ADS
}

export const SCOPES = {
    'hip': {
        id: 'hip',
        name: 'Sem Mira (Hip Fire)',
        magnification: 1,
        sensitivityMultiplier: 1.0,
        fovReduction: 1.0,
    },
    'red-dot': {
        id: 'red-dot',
        name: 'Red Dot / Holográfica',
        magnification: 1,
        sensitivityMultiplier: 1.0,
        fovReduction: 0.85,
    },
    '2x': {
        id: '2x',
        name: '2x Scope',
        magnification: 2,
        sensitivityMultiplier: 0.78,
        fovReduction: 0.5,
    },
    '3x': {
        id: '3x',
        name: '3x Scope',
        magnification: 3,
        sensitivityMultiplier: 0.56,
        fovReduction: 0.33,
    },
    '4x': {
        id: '4x',
        name: '4x ACOG',
        magnification: 4,
        sensitivityMultiplier: 0.42,
        fovReduction: 0.25,
    },
    '6x': {
        id: '6x',
        name: '6x Scope',
        magnification: 6,
        sensitivityMultiplier: 0.28,
        fovReduction: 0.167,
    },
    '8x': {
        id: '8x',
        name: '8x CQBSS',
        magnification: 8,
        sensitivityMultiplier: 0.21,
        fovReduction: 0.125,
    },
} as const;

export type ScopeId = keyof typeof SCOPES;

export const SCOPE_LIST: readonly ScopeData[] = Object.values(SCOPES);

export function getScope(id: string): ScopeData | undefined {
    return SCOPES[id as ScopeId];
}

// ═══════════════════════════════════════════
// ADS Sensitivity Scaling
// ═══════════════════════════════════════════

/**
 * Calcula a sensibilidade efetiva para um scope específico.
 *
 * effectiveSens = generalSens * adsSens * scopeMultiplier * scopeSens
 *
 * @param generalSens - Sensibilidade geral (1-100)
 * @param adsSens - Sensibilidade ADS (1-100, normalizada /50)
 * @param scopeMultiplier - Multiplicador nativo do scope
 * @param scopeSens - Sensibilidade per-scope do jogador (1-100, normalizada /50)
 */
export function calculateEffectiveSensitivity(
    generalSens: number,
    adsSens: number,
    scopeMultiplier: number,
    scopeSens: number
): number {
    return generalSens * (adsSens / 50) * scopeMultiplier * (scopeSens / 50);
}

/**
 * Calcula cm/360° para uma combinação de DPI e sensibilidade.
 *
 * O PUBG usa a fórmula:
 *   yaw per count = 0.002222 * sens
 *   counts per 360 = 360 / yaw_per_count
 *   inches per 360 = counts_per_360 / DPI
 *   cm per 360 = inches_per_360 * 2.54
 */
export function calculateCmPer360(
    dpi: number,
    effectiveSens: number
): number {
    const yawPerCount = 0.002222 * effectiveSens;
    if (yawPerCount === 0) return Infinity;
    const countsPerRevolution = 360 / yawPerCount;
    const inchesPer360 = countsPerRevolution / dpi;
    const cmPer360 = inchesPer360 * 2.54;
    return Math.round(cmPer360 * 100) / 100;
}

/**
 * Calcula a sensibilidade necessária para atingir um cm/360° alvo.
 * Inverso de calculateCmPer360.
 */
export function sensFromCmPer360(
    dpi: number,
    targetCmPer360: number
): number {
    const targetInchesPer360 = targetCmPer360 / 2.54;
    const targetCountsPer360 = targetInchesPer360 * dpi;
    const targetYawPerCount = 360 / targetCountsPer360;
    const targetSens = targetYawPerCount / 0.002222;
    return Math.round(targetSens * 100) / 100;
}

// ═══════════════════════════════════════════
// FOV Scaling
// ═══════════════════════════════════════════

/**
 * Converte FOV horizontal para vertical dado aspect ratio.
 */
export function horizontalToVerticalFov(
    horizontalFov: number,
    aspectRatio: number = 16 / 9
): number {
    const hFovRad = (horizontalFov * Math.PI) / 180;
    const vFovRad = 2 * Math.atan(Math.tan(hFovRad / 2) / aspectRatio);
    return (vFovRad * 180) / Math.PI;
}

/**
 * Calcula a conversão pixel-para-grau dado resolução e FOV.
 * Quantos pixels de movimento do mouse = 1 grau de rotação.
 */
export function pixelsPerDegree(
    horizontalResolution: number,
    horizontalFov: number
): number {
    return horizontalResolution / horizontalFov;
}

/**
 * Dado um deslocamento em pixels no vídeo, converte para graus reais.
 */
export function pixelDisplacementToDegrees(
    pixelDisplacement: number,
    horizontalResolution: number,
    horizontalFov: number
): number {
    const ppd = pixelsPerDegree(horizontalResolution, horizontalFov);
    if (ppd === 0) return 0;
    return pixelDisplacement / ppd;
}

/**
 * Verifica se um cm/360° é viável dado o tamanho do mousepad.
 * Regra: precisa de pelo menos 60% da largura do pad para um 180°.
 */
export function isSensViableForMousepad(
    cmPer360: number,
    mousepadWidthCm: number
): boolean {
    const cmPer180 = cmPer360 / 2;
    return cmPer180 <= mousepadWidthCm * 0.6;
}
