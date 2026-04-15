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
} from '@/types/engine';
import { asSensitivity, asCentimeters } from '@/types/branded';
import {
    internalFromCmPer360,
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

type ResidualObjectiveDirection = 'increase_sens' | 'decrease_sens' | 'hold';

interface ResidualObjective {
    readonly direction: ResidualObjectiveDirection;
    readonly meanPitchResidual: number;
    readonly meanAbsResidual: number;
    readonly coverage: number;
    readonly confidence: number;
    readonly adjustmentPercent: number;
    readonly recommended: ProfileType | null;
    readonly hasResiduals: boolean;
}

const RESIDUAL_DEADZONE_DEGREES = 0.05;

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
    diagnoses: readonly Diagnosis[],
    metrics: SprayMetrics // Pass metrics to check phases
): number {
    let adjusted = idealCm360;

    // Usar burstVCI (balas 1-10) como peso principal (80%) se disponível
    const controlIndex = metrics.burstVCI !== undefined ? metrics.burstVCI : metrics.verticalControlIndex;

    for (const d of diagnoses) {
        switch (d.type) {
            case 'overpull':
                // Se o burstVCI confirmar overpull, o ajuste é mais agressivo
                const factor = controlIndex > 1.2 ? 0.05 : 0.03;
                adjusted -= adjusted * factor;
                break;
            case 'underpull':
                const uFactor = controlIndex < 0.8 ? 0.05 : 0.03;
                adjusted += adjusted * uFactor;
                break;
            case 'excessive_jitter':
                adjusted += adjusted * 0.04;
                break;
            case 'horizontal_drift':
                adjusted += adjusted * 0.02;
                break;
        }
    }

    return adjusted;
}

function clampPercent(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
}

function calculateResidualObjective(metrics: SprayMetrics): ResidualObjective {
    const residuals = metrics.shotResiduals ?? [];
    const quality = metrics.metricQuality?.shotResiduals;
    const coverage = quality?.coverage ?? 1;
    const confidence = quality?.confidence ?? 1;

    if (residuals.length === 0) {
        return {
            direction: 'hold',
            meanPitchResidual: 0,
            meanAbsResidual: 0,
            coverage,
            confidence,
            adjustmentPercent: 0,
            recommended: null,
            hasResiduals: false,
        };
    }

    const meanPitchResidual = residuals.reduce(
        (sum, residual) => sum + residual.residual.pitch,
        0
    ) / residuals.length;
    const meanAbsResidual = residuals.reduce(
        (sum, residual) => sum + residual.residualMagnitudeDegrees,
        0
    ) / residuals.length;

    if (Math.abs(meanPitchResidual) <= RESIDUAL_DEADZONE_DEGREES) {
        return {
            direction: 'hold',
            meanPitchResidual,
            meanAbsResidual,
            coverage,
            confidence,
            adjustmentPercent: 0,
            recommended: null,
            hasResiduals: true,
        };
    }

    const direction: ResidualObjectiveDirection = meanPitchResidual < 0
        ? 'increase_sens'
        : 'decrease_sens';

    return {
        direction,
        meanPitchResidual,
        meanAbsResidual,
        coverage,
        confidence,
        adjustmentPercent: clampPercent(meanAbsResidual * 0.12 * confidence, 0.02, 0.08),
        recommended: direction === 'increase_sens' ? 'high' : 'low',
        hasResiduals: true,
    };
}

function applyResidualObjective(
    idealCm360: number,
    objective: ResidualObjective
): number {
    if (!objective.hasResiduals || objective.direction === 'hold') {
        return idealCm360;
    }

    if (objective.direction === 'increase_sens') {
        return idealCm360 * (1 - objective.adjustmentPercent);
    }

    return idealCm360 * (1 + objective.adjustmentPercent);
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
        .flatMap(scopeId => {
            const scope = SCOPES[scopeId];
            if (!scope) {
                return [];
            }
            const current = (currentScopeSens && currentScopeSens[scopeId]) ?? 50;

            // Recomendamos que cada mira mantenha a mesma "física" do generalSlider
            // No PUBG, se você quer que 8x sinta igual a 1x (focal scaling), 
            // você geralmente mantém os sliders próximos se a engine for linear, 
            // mas como o PUBG tem multipliers internos, o ideal é o 1:1 físico.
            const recommended = generalSlider;

            return [{
                scopeName: scope.name,
                current: asSensitivity(current),
                recommended: asSensitivity(recommended),
                changePercent: Math.round(((recommended - current) / Math.max(current, 1)) * 100),
            }];
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
    currentScopeSens: Record<string, number>,
    currentVSM: number = 1.0
): SensitivityRecommendation {
    // 1. Get base range
    const range = getBaseSensRange(playStyle, gripStyle);
    const residualObjective = calculateResidualObjective(metrics);

    // 2. Residual objective drives the math; diagnostics are a legacy fallback.
    const adjustedIdeal = residualObjective.hasResiduals
        ? applyResidualObjective(range.idealCm360, residualObjective)
        : adjustForDiagnostics(range.idealCm360, diagnoses, metrics);

    // 3. Clamp to viable range (mousepad-aware)
    const minViable = isSensViableForMousepad(range.minCm360, mousepadWidthCm) ? range.minCm360 : adjustedIdeal * 0.8;
    const maxViable = range.maxCm360;

    // 4. Generate 3 profiles with ~5% spread
    const lowCm360 = Math.min(adjustedIdeal * 1.06, maxViable);
    const balancedCm360 = adjustedIdeal;
    const highCm360 = Math.max(adjustedIdeal * 0.94, minViable);

    const profiles: [SensitivityProfile, SensitivityProfile, SensitivityProfile] = [
        buildProfile('low', lowCm360, dpi, currentScopeSens),
        buildProfile('balanced', balancedCm360, dpi, currentScopeSens),
        buildProfile('high', highCm360, dpi, currentScopeSens),
    ];

    // 5. Choose recommended profile from residual objective, falling back to dominant diagnosis.
    let recommended: ProfileType = residualObjective.recommended ?? 'balanced';
    const dominant = diagnoses[0]; // Highest severity
    if (!residualObjective.recommended && dominant) {
        if (dominant.type === 'overpull') {
            recommended = 'high';
        } else if (dominant.type === 'underpull') {
            recommended = 'low';
        }
    }

    // 6. Calculate Bi-directional VSM Adjustment
    // Se BurstVCI > 1.1 ou < 0.9, sugerimos mudar o VSM
    const burstVCI = metrics.burstVCI ?? metrics.verticalControlIndex;
    let suggestedVSM: number | undefined;

    if (residualObjective.hasResiduals && residualObjective.direction !== 'hold') {
        const directionMultiplier = residualObjective.direction === 'increase_sens'
            ? 1 - residualObjective.adjustmentPercent
            : 1 + residualObjective.adjustmentPercent;
        suggestedVSM = Number((currentVSM * directionMultiplier).toFixed(2));
        suggestedVSM = Math.max(0.7, Math.min(2.0, suggestedVSM));
    } else if (burstVCI > 1.05 || burstVCI < 0.95) {
        // target_vsm = current_vsm / vci
        suggestedVSM = Number((currentVSM / burstVCI).toFixed(2));
        // Clamp entre 0.7 e 2.0 (limites razoáveis do PUBG)
        suggestedVSM = Math.max(0.7, Math.min(2.0, suggestedVSM));
    }

    // 7. Reasoning
    const reasoningParts: string[] = [
        `residualObjective=${residualObjective.direction}`,
        `meanPitchResidual=${residualObjective.meanPitchResidual.toFixed(3)}`,
        `meanAbsResidual=${residualObjective.meanAbsResidual.toFixed(3)}`,
        `coverage=${residualObjective.coverage.toFixed(2)}`,
        `confidence=${residualObjective.confidence.toFixed(2)}`,
        `prior=${playStyle}/${gripStyle}`,
        `Fase Burst: VCI ${burstVCI.toFixed(2)}`,
        `DPI ${dpi}`,
    ];
    if (dominant) {
        reasoningParts.push(`foco em ${dominant.type}`);
    }
    const reasoning = reasoningParts.join(', ') + '.';
    return {
        profiles,
        recommended,
        reasoning,
        ...(suggestedVSM !== undefined ? { suggestedVSM } : {})
    };
}
