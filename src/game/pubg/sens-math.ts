/**
 * PUBG Sensitivity Mathematics.
 * Formulas for converting between in-game slider (0-100) and internal multipliers.
 *
 * Sources:
 * - internalSens = 10^((menuSens - 50) / 50)
 * - menuSens = 50 * log10(internalSens) + 50
 */

import { delta_theta } from './projection-math';

/**
 * Converte o valor do slider (0-100) para o multiplicador interno do PUBG.
 */
export function sliderToInternal(slider: number): number {
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
 * Calcula o yaw por count (em graus) dado o multiplicador interno.
 *
 * Formula final de cm/360:
 * cm/360 = (360 * 2.54) / (DPI * PUBG_BASE_ROTATION_CONSTANT * internalSens)
 */
export const PUBG_BASE_ROTATION_CONSTANT = 0.05;

/**
 * Calcula a escala angular do pixel central baseada no FOV e resolucao.
 * Para deltas grandes, prefira `delta_theta`; graus por pixel nao e constante
 * em projecao perspectiva.
 */
export function getPixelToDegree(
    fov: number,
    resolutionY: number,
    resolutionX: number = Math.round((resolutionY * 16) / 9)
): number {
    const center = { x: resolutionX / 2, y: resolutionY / 2 };
    const onePixelDown = { x: center.x, y: center.y + 1 };

    return Math.abs(delta_theta(center, onePixelDown, {
        widthPx: resolutionX,
        heightPx: resolutionY,
        horizontalFovDegrees: fov,
    }).pitchDegrees);
}

/**
 * Retorna o multiplicador de compensacao vertical (VSM).
 * O VSM do PUBG afeta apenas o movimento vertical do mouse.
 */
export function applyVerticalMultiplier(recoil: number, vsm: number): number {
    return recoil * vsm;
}
