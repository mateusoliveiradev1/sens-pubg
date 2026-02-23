/**
 * PUBG Sensitivity Mathematics.
 * Formulas for converting between in-game slider (0-100) and internal multipliers.
 * 
 * Sources: 
 * - internalSens = 10^((menuSens - 50) / 50)
 * - menuSens = 50 * log10(internalSens) + 50
 */

/**
 * Converte o valor do slider (0-100) para o multiplicador interno do PUBG.
 */
export function sliderToInternal(slider: number): number {
    // Clamp slider to 0-100
    const val = Math.max(0, Math.min(100, slider));
    return Math.pow(10, (val - 50) / 50);
}

/**
 * Converte o multiplicador interno para o valor do slider (0-100).
 */
export function internalToSlider(internal: number): number {
    if (internal <= 0) return 0;
    const slider = 50 * Math.log10(internal) + 50;
    return Math.max(0, Math.min(100, Math.round(slider)));
}

/**
 * Calcula o Yaw por Count (em graus) dado o multiplicador interno.
 * O PUBG usa um valor base que, quando multiplicado por internalSens,
 * resulta em 0.05 graus por count em sensibilidade 50.
 * 
 * Formula final de cm/360:
 * cm/360 = (360 * 2.54) / (DPI * PUBG_BASE_ROTATION_CONSTANT * internalSens)
 */
export const PUBG_BASE_ROTATION_CONSTANT = 0.05;
