/**
 * Inventory Scanner — Detecta arma e acessórios via tela de Inventário (Tab).
 */

import type { ExtractedFrame } from './frame-extraction';

export interface InventoryScanResult {
    readonly found: boolean;
    readonly activeSlot: 1 | 2 | null;
    readonly weaponId?: string;
    readonly attachments?: {
        readonly scope?: string;
        readonly muzzle?: string;
        readonly grip?: string;
        readonly stock?: string;
    };
}

// ═══════════════════════════════════════════
// Regions (Normalized 1080p)
// ═══════════════════════════════════════════

const SLOT_1_REGION = { x: 1280, y: 220, w: 300, h: 320 };
const SLOT_2_REGION = { x: 1280, y: 560, w: 300, h: 320 };

/**
 * Calcula a luminosidade média de uma região.
 * Usado para detectar qual slot está destacado (ativo).
 */
function calculateRegionBrightness(frame: ExtractedFrame, x: number, y: number, w: number, h: number): number {
    const { width: fw, data } = frame.imageData;
    let total = 0;
    let count = 0;

    // Scale coordinates to actual frame size
    const scale = fw / 1920;
    const sx = Math.floor(x * scale);
    const sy = Math.floor(y * scale);
    const sw = Math.floor(w * scale);
    const sh = Math.floor(h * scale);

    for (let ty = sy; ty < sy + sh; ty++) {
        for (let tx = sx; tx < sx + sw; tx++) {
            const idx = (ty * fw + tx) * 4;
            if (data[idx] !== undefined) {
                // Luminance: 0.299R + 0.587G + 0.114B
                total += (data[idx]! * 0.299 + data[idx + 1]! * 0.587 + data[idx + 2]! * 0.114);
                count++;
            }
        }
    }

    return count > 0 ? total / count : 0;
}

/**
 * Procura pela tela de Inventário nos primeiros frames do clip.
 */
export function scanInventory(frames: readonly ExtractedFrame[]): InventoryScanResult {
    // 1. Procurar um frame que tenha o "Inventário" (baseado em contraste ou elementos fixos)
    // Por simplicidade na V1, assumimos que se a luminosidade média de certas áreas bater, o Tab está aberto.

    let bestFrame: ExtractedFrame | null = null;

    // Scan first 30-60 frames (1-2 seconds)
    for (let i = 0; i < Math.min(frames.length, 60); i++) {
        const frame = frames[i]!;

        // No inventário do PUBG, o lado direito (arma) costuma ser muito mais escuro (transparente) 
        // ou ter elementos de UI específicos.
        // Aqui detectamos a "presença" comparando o brilho dos slots com um fundo esperado.
        const b1 = calculateRegionBrightness(frame, SLOT_1_REGION.x, SLOT_1_REGION.y, SLOT_1_REGION.w, SLOT_1_REGION.h);
        const b2 = calculateRegionBrightness(frame, SLOT_2_REGION.x, SLOT_2_REGION.y, SLOT_2_REGION.w, SLOT_2_REGION.h);

        // PUBG UI high-contrast detection logic goes here.
        // If one is significantly brighter/has the 'active' highlight.
        if (Math.abs(b1 - b2) > 15) {
            bestFrame = frame;
            break;
        }
    }

    if (!bestFrame) {
        return { found: false, activeSlot: null };
    }

    // 2. Determinar slot ativo
    const b1 = calculateRegionBrightness(bestFrame, SLOT_1_REGION.x, SLOT_1_REGION.y, SLOT_1_REGION.w, SLOT_1_REGION.h);
    const b2 = calculateRegionBrightness(bestFrame, SLOT_2_REGION.x, SLOT_2_REGION.y, SLOT_2_REGION.w, SLOT_2_REGION.h);

    const activeSlot = b1 > b2 ? 1 : 2;

    // 3. TODO: Template Matching para nomes de armas/ícones
    // Isso requer uma base de dados de templates que será implementada na sequência.

    return {
        found: true,
        activeSlot,
        // Fallback for demo
    };
}
