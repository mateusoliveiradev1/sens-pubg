/**
 * Branded Types — Tipos nominais para evitar confusão entre valores numéricos.
 * Exemplo: DPI e Sensitivity são ambos números, mas não devem ser intercambiáveis.
 */

declare const __brand: unique symbol;

type Brand<T, TBrand extends string> = T & { readonly [__brand]: TBrand };

// ═══════════════════════════════════════════
// Branded Primitives
// ═══════════════════════════════════════════

/** DPI do mouse (100–25600) */
export type DPI = Brand<number, 'DPI'>;

/** Sensibilidade do jogo (0.01–100) */
export type Sensitivity = Brand<number, 'Sensitivity'>;

/** Tempo em milissegundos */
export type Milliseconds = Brand<number, 'Milliseconds'>;

/** Ângulo em graus */
export type Degrees = Brand<number, 'Degrees'>;

/** Distância em pixels */
export type Pixels = Brand<number, 'Pixels'>;

/** Centímetros */
export type Centimeters = Brand<number, 'Centimeters'>;

/** Hertz (polling rate, refresh rate) */
export type Hertz = Brand<number, 'Hertz'>;

/** Gramas (peso do mouse) */
export type Grams = Brand<number, 'Grams'>;

/** Score normalizado 0–100 */
export type Score = Brand<number, 'Score'>;

/** Frames por segundo */
export type FPS = Brand<number, 'FPS'>;

// ═══════════════════════════════════════════
// Construtores (type-safe factory functions)
// ═══════════════════════════════════════════

export function asDPI(value: number): DPI {
    if (value < 100 || value > 25600) throw new RangeError(`DPI inválido: ${value}. Use 100–25600.`);
    return value as DPI;
}

export function asSensitivity(value: number): Sensitivity {
    if (value < 0.01 || value > 100) throw new RangeError(`Sensibilidade inválida: ${value}. Use 0.01–100.`);
    return value as Sensitivity;
}

export function asMilliseconds(value: number): Milliseconds {
    if (value < 0) throw new RangeError(`Milissegundos não pode ser negativo: ${value}`);
    return value as Milliseconds;
}

export function asDegrees(value: number): Degrees {
    return value as Degrees;
}

export function asPixels(value: number): Pixels {
    return value as Pixels;
}

export function asCentimeters(value: number): Centimeters {
    if (value < 0) throw new RangeError(`Centímetros não pode ser negativo: ${value}`);
    return value as Centimeters;
}

export function asHertz(value: number): Hertz {
    if (value <= 0) throw new RangeError(`Hertz deve ser positivo: ${value}`);
    return value as Hertz;
}

export function asGrams(value: number): Grams {
    if (value <= 0) throw new RangeError(`Gramas deve ser positivo: ${value}`);
    return value as Grams;
}

export function asScore(value: number): Score {
    const clamped = Math.max(0, Math.min(100, value));
    return clamped as Score;
}

export function asFPS(value: number): FPS {
    if (value <= 0) throw new RangeError(`FPS deve ser positivo: ${value}`);
    return value as FPS;
}
