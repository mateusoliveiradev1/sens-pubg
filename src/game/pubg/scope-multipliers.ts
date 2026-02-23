import { sliderToInternal, PUBG_BASE_ROTATION_CONSTANT } from './sens-math';

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
        sensitivityMultiplier: 0.777,
        fovReduction: 0.85,
    },
    '2x': {
        id: '2x',
        name: '2x Scope',
        magnification: 2,
        sensitivityMultiplier: 0.444,
        fovReduction: 0.5,
    },
    '3x': {
        id: '3x',
        name: '3x Scope',
        magnification: 3,
        sensitivityMultiplier: 0.367,
        fovReduction: 0.33,
    },
    '4x': {
        id: '4x',
        name: '4x ACOG',
        magnification: 4,
        sensitivityMultiplier: 0.211,
        fovReduction: 0.25,
    },
    '6x': {
        id: '6x',
        name: '6x Scope',
        magnification: 6,
        sensitivityMultiplier: 0.183,
        fovReduction: 0.167,
    },
    '8x': {
        id: '8x',
        name: '8x CQBSS',
        magnification: 8,
        sensitivityMultiplier: 0.137,
        fovReduction: 0.125,
    },
    '15x': {
        id: '15x',
        name: '15x PM II',
        magnification: 15,
        sensitivityMultiplier: 0.073,
        fovReduction: 0.067,
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
/**
 * Calcula a sensibilidade efetiva para um scope específico.
 * effectiveSens = InternalMultiplier(slider)
 */
export function calculateEffectiveSensitivity(
    generalSlider: number,
    adsSlider: number,
    scopeMultiplier: number,
    scopeSlider: number
): number {
    // No PUBG, a sensibilidade final é composta por esses fatores concatenados
    const general = sliderToInternal(generalSlider);
    const ads = sliderToInternal(adsSlider); // Já normalizado por 1.0 no sliderToInternal(50)
    const scope = sliderToInternal(scopeSlider);

    return general * ads * scopeMultiplier * scope;
}

/**
 * Calcula cm/360° para uma combinação de DPI e sensibilidade interna.
 */
export function calculateCmPer360(
    dpi: number,
    internalMultiplier: number
): number {
    // 360 / (DPI * Constant * multiplier) = inches
    const inchesPer360 = 360 / (dpi * PUBG_BASE_ROTATION_CONSTANT * internalMultiplier);
    return Math.round(inchesPer360 * 2.54 * 100) / 100;
}

/**
 * Calcula a sensibilidade interna necessária para atingir um cm/360° alvo.
 */
export function internalFromCmPer360(
    dpi: number,
    targetCmPer360: number
): number {
    const targetInchesPer360 = targetCmPer360 / 2.54;
    // internal = 360 / (DPI * Constant * inches)
    return 360 / (dpi * PUBG_BASE_ROTATION_CONSTANT * targetInchesPer360);
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
