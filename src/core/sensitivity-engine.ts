/**
 * Sensitivity Engine — Recomendações de sensibilidade baseadas no hardware.
 * Gera 3 perfis (LOW, BALANCED, HIGH) com micro-ajustes 2-6%.
 * Prioriza controle vertical.
 */

import type {
    SprayMetrics,
    SensitivityProfile,
    SensitivityRecommendation,
    ScopeSensitivity,
    ProfileType,
    Diagnosis,
    PlayerHardwareProfile,
} from '@/types/engine';
import { asSensitivity, asCentimeters } from '@/types/branded';
import type { Sensitivity, Centimeters } from '@/types/branded';
import {
    calculateCmPer360,
    internalFromCmPer360,
    calculateEffectiveSensitivity,
    isSensViableForMousepad,
    SCOPES,
    type ScopeId,
} from '@/game/pubg';
import { internalToSlider } from '@/game/pubg/sens-math';

// ═══════════════════════════════════════════
// Base ranges por play style + grip
// ═══════════════════════════════════════════

interface SensRange {
    readonly minCm360: number;
    readonly maxCm360: number;
    readonly idealCm360: number;
}

function getBaseSensRange(
    playStyle: string,
    gripStyle: string
): SensRange {
    // Arm aimers = mais cm/360 (baixa sens), Wrist = menos cm/360 (alta sens)
    const styleBase: Record<string, SensRange> = {
        arm: { minCm360: 35, maxCm360: 60, idealCm360: 45 },
        wrist: { minCm360: 18, maxCm360: 35, idealCm360: 25 },
        hybrid: { minCm360: 25, maxCm360: 45, idealCm360: 35 },
    };

    const base = styleBase[playStyle] ?? styleBase['hybrid']!;

    // Fingertip/claw = pode usar sens um pouco mais alta
    if (gripStyle === 'fingertip') {
        return { minCm360: base.minCm360 - 3, maxCm360: base.maxCm360 - 3, idealCm360: base.idealCm360 - 2 };
    }
    if (gripStyle === 'palm') {
        return { minCm360: base.minCm360 + 2, maxCm360: base.maxCm360 + 2, idealCm360: base.idealCm360 + 2 };
    }

    return base;
}

// ═══════════════════════════════════════════
// Adjust for diagnostics
// ═══════════════════════════════════════════

function adjustForDiagnostics(
    idealCm360: number,
    diagnoses: readonly Diagnosis[]
): number {
    let adjusted = idealCm360;

    for (const d of diagnoses) {
        switch (d.type) {
            case 'overpull':
                // Sens muito baixa → reduzir cm/360 (aumentar sens) ligeiramente
                adjusted -= adjusted * 0.03; // 3%
                break;
            case 'underpull':
                // Sens muito alta → aumentar cm/360 (diminuir sens) ligeiramente
                adjusted += adjusted * 0.03;
                break;
            case 'excessive_jitter':
                // Aumentar cm/360 (diminuir sens) para reduzir tremor
                adjusted += adjusted * 0.04;
                break;
            case 'horizontal_drift':
                // Slight increase in cm/360 to reduce uncontrolled movement
                adjusted += adjusted * 0.02;
                break;
            // late_compensation e inconsistency não alteram sens diretamente
        }
    }

    return adjusted;
}

// ═══════════════════════════════════════════
// Build Profile
// ═══════════════════════════════════════════

function buildProfile(
    type: ProfileType,
    targetCm360: number,
    dpi: number,
    currentScopeSens: Record<string, number>
): SensitivityProfile {
    const internalMultiplier = internalFromCmPer360(dpi, targetCm360);
    const generalSlider = internalToSlider(internalMultiplier);
    const adsSlider = generalSlider; // PUBG baseline: ADS usually matches General

    // Calculate per-scope sensitivities
    const scopeEntries: ScopeSensitivity[] = (Object.keys(SCOPES) as ScopeId[])
        .filter(id => id !== 'hip')
        .map(scopeId => {
            const scope = SCOPES[scopeId];
            const current = currentScopeSens[scopeId] ?? 50;

            // Recomendamos que cada mira mantenha a mesma "física" do generalSlider
            // No PUBG, se você quer que 8x sinta igual a 1x (focal scaling), 
            // você geralmente mantém os sliders próximos se a engine for linear, 
            // mas como o PUBG tem multipliers internos, o ideal é o 1:1 físico.
            const recommended = generalSlider;

            return {
                scopeName: scope.name,
                current: asSensitivity(current),
                recommended: asSensitivity(recommended),
                changePercent: Math.round(((recommended - current) / Math.max(current, 1)) * 100),
            };
        });

    const labels: Record<ProfileType, { label: string; description: string }> = {
        low: {
            label: 'Baixa (Máx. Controle)',
            description: 'Maior cm/360°. Ideal para sprays longos e flicks precisos. Requer mais espaço no mousepad.',
        },
        balanced: {
            label: 'Balanceada',
            description: 'Equilíbrio entre controle e velocidade. Recomendado para a maioria dos jogadores.',
        },
        high: {
            label: 'Alta (Máx. Velocidade)',
            description: 'Menor cm/360°. Ideal para CQB e rotações rápidas. Menos controle em sprays longos.',
        },
    };

    const { label, description } = labels[type];

    return {
        type,
        label,
        description,
        general: asSensitivity(generalSlider),
        ads: asSensitivity(adsSlider),
        scopes: scopeEntries,
        cmPer360: asCentimeters(Math.round(targetCm360 * 100) / 100),
    };
}

// ═══════════════════════════════════════════
// Main: Generate Sensitivity Recommendation
// ═══════════════════════════════════════════

export function generateSensitivityRecommendation(
    metrics: SprayMetrics,
    diagnoses: readonly Diagnosis[],
    dpi: number,
    playStyle: string,
    gripStyle: string,
    mousepadWidthCm: number,
    currentScopeSens: Record<string, number>
): SensitivityRecommendation {
    // 1. Get base range
    const range = getBaseSensRange(playStyle, gripStyle);

    // 2. Adjust ideal based on diagnostics
    const adjustedIdeal = adjustForDiagnostics(range.idealCm360, diagnoses);

    // 3. Clamp to viable range (mousepad-aware)
    const minViable = isSensViableForMousepad(range.minCm360, mousepadWidthCm) ? range.minCm360 : adjustedIdeal * 0.8;
    const maxViable = range.maxCm360;

    // 4. Generate 3 profiles with ~5% spread
    const lowCm360 = Math.min(adjustedIdeal * 1.06, maxViable);   // +6% cm/360 = lower sens
    const balancedCm360 = adjustedIdeal;
    const highCm360 = Math.max(adjustedIdeal * 0.94, minViable);  // -6% cm/360 = higher sens

    const profiles: [SensitivityProfile, SensitivityProfile, SensitivityProfile] = [
        buildProfile('low', lowCm360, dpi, currentScopeSens),
        buildProfile('balanced', balancedCm360, dpi, currentScopeSens),
        buildProfile('high', highCm360, dpi, currentScopeSens),
    ];

    // 5. Choose recommended profile based on dominant diagnosis
    let recommended: ProfileType = 'balanced';
    const dominant = diagnoses[0]; // Highest severity
    if (dominant) {
        if (dominant.type === 'overpull') {
            recommended = 'high'; // Sens muito baixa (precisa puxar muito) -> recomendar sensi mais alta
        } else if (dominant.type === 'underpull') {
            recommended = 'low'; // Sens muito alta (puxa pouco e desce muito) -> recomendar sensi mais baixa
        }
    }

    // 6. Reasoning
    const reasoningParts: string[] = [
        `Baseado no seu estilo ${playStyle} com grip ${gripStyle}`,
        `DPI de ${dpi}`,
        `mousepad de ${mousepadWidthCm}cm`,
    ];
    if (dominant) {
        reasoningParts.push(`diagnóstico principal: ${dominant.type}`);
    }
    const reasoning = reasoningParts.join(', ') + '.';

    return { profiles, recommended, reasoning };
}
