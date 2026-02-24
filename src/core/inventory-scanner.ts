/**
 * Inventory Scanner — Detecta arma via OCR na tela de Inventário (Tab).
 */
import Tesseract from 'tesseract.js';
import type { ExtractedFrame } from './frame-extraction';
import { WEAPON_LIST } from '@/game/pubg';

export interface InventoryScanResult {
    readonly found: boolean;
    readonly activeSlot: 1 | 2 | null;
    readonly weaponId?: string;
}

// ═══════════════════════════════════════════
// Regions (Normalized 1080p)
// ═══════════════════════════════════════════

// The main slots
const SLOT_1_REGION = { x: 1280, y: 220, w: 300, h: 320 };
const SLOT_2_REGION = { x: 1280, y: 560, w: 300, h: 320 };

// The specific small box at the top of the slot where the weapon name is written
const WEAPON_NAME_OFFSET = { x: 0, y: 0, w: 300, h: 50 };

/**
 * Calcula a luminosidade média de uma região.
 * Usado para detectar qual slot está destacado (ativo).
 */
function calculateRegionBrightness(frame: ExtractedFrame, x: number, y: number, w: number, h: number): number {
    const { width: fw, data } = frame.imageData;

    const scale = fw / 1920;
    const sx = Math.floor(x * scale);
    const sy = Math.floor(y * scale);
    const sw = Math.floor(w * scale);
    const sh = Math.floor(h * scale);

    let total = 0;
    let count = 0;

    for (let ty = sy; ty < sy + sh; ty++) {
        for (let tx = sx; tx < sx + sw; tx++) {
            const idx = (ty * fw + tx) * 4;
            if (data[idx] !== undefined) {
                // Luminance
                total += (data[idx]! * 0.299 + data[idx + 1]! * 0.587 + data[idx + 2]! * 0.114);
                count++;
            }
        }
    }

    return count > 0 ? total / count : 0;
}

/**
 * Extrai o texto de uma região específica do frame usando canvas + tesseract.js
 */
async function extractWeaponNameOCR(frame: ExtractedFrame, baseRegion: { x: number, y: number }): Promise<string> {
    const { width: fw, height: fh, data } = frame.imageData;
    const scale = fw / 1920;

    const sx = Math.floor((baseRegion.x + WEAPON_NAME_OFFSET.x) * scale);
    const sy = Math.floor((baseRegion.y + WEAPON_NAME_OFFSET.y) * scale);
    const sw = Math.floor(WEAPON_NAME_OFFSET.w * scale);
    const sh = Math.floor(WEAPON_NAME_OFFSET.h * scale);

    const canvas = document.createElement('canvas');
    canvas.width = sw;
    canvas.height = sh;
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';

    const cropData = ctx.createImageData(sw, sh);
    for (let cy = 0; cy < sh; cy++) {
        for (let cx = 0; cx < sw; cx++) {
            const srcY = sy + cy;
            const srcX = sx + cx;
            if (srcY < fh && srcX < fw) {
                const srcIdx = (srcY * fw + srcX) * 4;
                const dstIdx = (cy * sw + cx) * 4;
                cropData.data[dstIdx] = data[srcIdx]!;
                cropData.data[dstIdx + 1] = data[srcIdx + 1]!;
                cropData.data[dstIdx + 2] = data[srcIdx + 2]!;
                cropData.data[dstIdx + 3] = data[srcIdx + 3]!;
            }
        }
    }
    ctx.putImageData(cropData, 0, 0);

    const dataUrl = canvas.toDataURL('image/png');

    try {
        const result = await Tesseract.recognize(dataUrl, 'eng');
        return result.data.text.trim();
    } catch (err) {
        console.error('OCR Error:', err);
        return '';
    }
}

/**
 * Match heuristic between OCR text and WEAPON_LIST
 */
function matchWeapon(text: string): string | undefined {
    if (!text || text.length < 2) return undefined;
    const normalized = text.toLowerCase().replace(/[^a-z0-9]/g, '');

    for (const weapon of WEAPON_LIST) {
        const weaponIdClean = weapon.id.toLowerCase().replace(/[^a-z0-9]/g, '');
        const weaponNameClean = weapon.name.toLowerCase().replace(/[^a-z0-9]/g, '');

        // Exact substring matches are strongly preferred
        if (normalized.includes(weaponIdClean) || normalized.includes(weaponNameClean)) {
            return weapon.id;
        }
    }

    // Secondary fallback for common OCR misreads (e.g. m416 -> rn416)
    if (normalized.includes('rn416') || normalized.includes('ma16')) return 'm416';
    if (normalized.includes('beryl') || normalized.includes('m7')) return 'bylm762';

    return undefined;
}

/**
 * Escaneia o inventário para achar o Slot Ativo e usar OCR para ler a Arma.
 */
export async function scanInventory(frames: readonly ExtractedFrame[]): Promise<InventoryScanResult> {
    let bestFrame: ExtractedFrame | null = null;
    let maxDiff = 0;

    // Scan first 30 frames (1 second) to detect the Tab menu opening and the active slot
    const framesToScan = Math.min(frames.length, 30);
    for (let i = 0; i < framesToScan; i++) {
        const frame = frames[i]!;
        const b1 = calculateRegionBrightness(frame, SLOT_1_REGION.x, SLOT_1_REGION.y, SLOT_1_REGION.w, SLOT_1_REGION.h);
        const b2 = calculateRegionBrightness(frame, SLOT_2_REGION.x, SLOT_2_REGION.y, SLOT_2_REGION.w, SLOT_2_REGION.h);

        const diff = Math.abs(b1 - b2);
        // If difference is substantial, Tab menu with an active slot is likely on screen
        if (diff > 15 && diff > maxDiff) {
            maxDiff = diff;
            bestFrame = frame;
        }
    }

    if (!bestFrame) {
        return { found: false, activeSlot: null };
    }

    const b1 = calculateRegionBrightness(bestFrame, SLOT_1_REGION.x, SLOT_1_REGION.y, SLOT_1_REGION.w, SLOT_1_REGION.h);
    const b2 = calculateRegionBrightness(bestFrame, SLOT_2_REGION.x, SLOT_2_REGION.y, SLOT_2_REGION.w, SLOT_2_REGION.h);

    const activeSlot = b1 > b2 ? 1 : 2;
    const activeRegion = activeSlot === 1 ? SLOT_1_REGION : SLOT_2_REGION;

    // Run OCR only on the active slot's name header
    const ocrText = await extractWeaponNameOCR(bestFrame, activeRegion);
    console.log(`[OCR] Extracted text for Slot ${activeSlot}: "${ocrText}"`);

    const weaponId = matchWeapon(ocrText);

    const result: InventoryScanResult = {
        found: true,
        activeSlot
    };

    return weaponId ? { ...result, weaponId } : result;
}
