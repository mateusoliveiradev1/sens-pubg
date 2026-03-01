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

/**
 * Calcula a escala de Pixel para Grau (Angular) baseada no FOV e Resolução.
 * @param fov FOV horizontal do jogo (ex: 90)
 * @param resolutionY Resolução vertical (ex: 1080)
 * @returns Razão de graus por pixel (deg/px)
 */
export function getPixelToDegree(fov: number, resolutionY: number): number {
    // Para simplificação, usamos o FOV vertical derivado da proporção.
    // Tan(FovV/2) = Tan(FovH/2) / AspectRatio
    const aspectRatio = 16 / 9; // Padrao
    const fovHRad = (fov * Math.PI) / 180;
    const fovVRad = 2 * Math.atan(Math.tan(fovHRad / 2) / aspectRatio);
    const fovV = (fovVRad * 180) / Math.PI;

    return fovV / resolutionY;
}

/**
 * Retorna o multiplicador de compensação vertical (VSM).
 * O VSM do PUBG afeta apenas o movimento vertical do mouse.
 */
export function applyVerticalMultiplier(recoil: number, vsm: number): number {
    return recoil * vsm;
}

