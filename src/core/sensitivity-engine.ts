import type {
    AnalysisDecision,
    Diagnosis,
    ProfileType,
    RecommendationEvidenceTier,
    ScopeSensitivity,
    SensitivityRecommendationTier,
    SensitivityProfile,
    SensitivityRecommendation,
    SprayMetrics,
} from '@/types/engine';
import { asCentimeters, asSensitivity } from '@/types/branded';
import {
    CURRENT_PUBG_PATCH_VERSION,
    internalFromCmPer360,
    isSensViableForMousepad,
    normalizeScopeSensitivityMap,
    resolveScopeSensitivityValue,
    resolveEffectiveSensitivity,
    SCOPES,
    scopeSliderFromEffectiveYaw,
    type ScopeId,
} from '@/game/pubg';
import { internalToSlider } from '@/game/pubg/sens-math';

interface SensRange {
    readonly minCm360: number;
    readonly maxCm360: number;
    readonly idealCm360: number;
}

type ResidualObjectiveDirection = 'increase_sens' | 'decrease_sens' | 'hold';
type DiagnosticFallbackReason = 'none' | 'applied' | 'guarded' | 'inconclusive';

interface ResidualObjective {
    readonly direction: ResidualObjectiveDirection;
    readonly meanPitchResidual: number;
    readonly meanAbsResidual: number;
    readonly coverage: number;
    readonly confidence: number;
    readonly sampleSize: number;
    readonly evidenceScore: number;
    readonly evidenceTier: RecommendationEvidenceTier;
    readonly adjustmentPercent: number;
    readonly recommended: ProfileType | null;
    readonly hasResiduals: boolean;
    readonly actionable: boolean;
}

interface DiagnosticFallback {
    readonly actionable: boolean;
    readonly recommended: ProfileType | null;
    readonly reason: DiagnosticFallbackReason;
    readonly confidence: number;
    readonly coverage: number;
}

interface CandidateContext {
    readonly targetCm360: number;
    readonly baseIdealCm360: number;
    readonly minViable: number;
    readonly maxViable: number;
    readonly evidenceTier: RecommendationEvidenceTier;
    readonly diagnoses: readonly Diagnosis[];
}

interface ScoredCandidate {
    readonly cm360: number;
    readonly score: number;
}

interface SensitivityBias {
    readonly controlBias: number;
    readonly speedBias: number;
}

interface ScopeRecommendationContext {
    readonly type: ProfileType;
    readonly playStyle: string;
    readonly gripStyle: string;
    readonly mousepadWidthCm: number;
    readonly deskSpaceCm: number;
    readonly evidenceTier: RecommendationEvidenceTier;
}

const RESIDUAL_DEADZONE_DEGREES = 0.05;
const MIN_ACTIONABLE_EVIDENCE = 0.6;
const MIN_ACTIONABLE_RESIDUAL_SAMPLES = 3;

function clamp01(value: number): number {
    return Math.max(0, Math.min(1, value));
}

function clampPercent(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
}

function roundSlider(value: number): number {
    return Math.max(0.01, Math.min(100, Math.round(value)));
}

function roundCm360(value: number): number {
    return Number(value.toFixed(2));
}

function scoreToEvidenceTier(score: number): RecommendationEvidenceTier {
    if (score >= 0.78) {
        return 'strong';
    }

    if (score >= 0.58) {
        return 'moderate';
    }

    return 'weak';
}

function getBaseSensRange(
    playStyle: string,
    gripStyle: string
): SensRange {
    const styleBase = {
        arm: { minCm360: 35, maxCm360: 60, idealCm360: 45 },
        wrist: { minCm360: 18, maxCm360: 35, idealCm360: 25 },
        hybrid: { minCm360: 25, maxCm360: 45, idealCm360: 35 },
    } satisfies Record<string, SensRange>;
    const base = playStyle === 'arm'
        ? styleBase.arm
        : playStyle === 'wrist'
            ? styleBase.wrist
            : styleBase.hybrid;

    if (gripStyle === 'fingertip') {
        return {
            minCm360: base.minCm360 - 3,
            maxCm360: base.maxCm360 - 3,
            idealCm360: base.idealCm360 - 2,
        };
    }

    if (gripStyle === 'palm') {
        return {
            minCm360: base.minCm360 + 2,
            maxCm360: base.maxCm360 + 2,
            idealCm360: base.idealCm360 + 2,
        };
    }

    return base;
}

function adjustForDiagnostics(
    idealCm360: number,
    diagnoses: readonly Diagnosis[],
    metrics: SprayMetrics
): number {
    let adjusted = idealCm360;
    const controlIndex = metrics.burstVCI !== undefined ? metrics.burstVCI : metrics.verticalControlIndex;

    for (const diagnosis of diagnoses) {
        switch (diagnosis.type) {
            case 'overpull':
                adjusted -= adjusted * (controlIndex > 1.2 ? 0.05 : 0.03);
                break;
            case 'underpull':
                adjusted += adjusted * (controlIndex < 0.8 ? 0.05 : 0.03);
                break;
            case 'excessive_jitter':
            case 'horizontal_drift':
            case 'inconsistency':
                adjusted += adjusted * 0.03;
                break;
            case 'late_compensation':
                adjusted -= adjusted * 0.02;
                break;
            case 'inconclusive':
                break;
        }
    }

    return adjusted;
}

function calculateResidualObjective(metrics: SprayMetrics): ResidualObjective {
    const residuals = metrics.shotResiduals ?? [];
    const quality = metrics.metricQuality?.shotResiduals;
    const coverage = clamp01(quality?.coverage ?? 1);
    const confidence = clamp01(quality?.confidence ?? 1);
    const sampleSize = residuals.length;

    if (sampleSize === 0) {
        return {
            direction: 'hold',
            meanPitchResidual: 0,
            meanAbsResidual: 0,
            coverage,
            confidence,
            sampleSize,
            evidenceScore: 0,
            evidenceTier: 'weak',
            adjustmentPercent: 0,
            recommended: null,
            hasResiduals: false,
            actionable: false,
        };
    }

    const meanPitchResidual = residuals.reduce(
        (sum, residual) => sum + residual.residual.pitch,
        0
    ) / sampleSize;
    const meanAbsResidual = residuals.reduce(
        (sum, residual) => sum + residual.residualMagnitudeDegrees,
        0
    ) / sampleSize;
    const signalScore = clamp01((Math.abs(meanPitchResidual) - RESIDUAL_DEADZONE_DEGREES) / 0.35);
    const sampleScore = clamp01(sampleSize / 10);
    const evidenceScore = Number((
        (coverage * 0.35)
        + (confidence * 0.35)
        + (sampleScore * 0.15)
        + (signalScore * 0.15)
    ).toFixed(3));
    const evidenceTier = scoreToEvidenceTier(evidenceScore);

    if (signalScore === 0) {
        return {
            direction: 'hold',
            meanPitchResidual,
            meanAbsResidual,
            coverage,
            confidence,
            sampleSize,
            evidenceScore,
            evidenceTier,
            adjustmentPercent: 0,
            recommended: null,
            hasResiduals: true,
            actionable: false,
        };
    }

    const direction: ResidualObjectiveDirection = meanPitchResidual < 0
        ? 'increase_sens'
        : 'decrease_sens';
    const actionable = (
        sampleSize >= MIN_ACTIONABLE_RESIDUAL_SAMPLES
        && coverage >= MIN_ACTIONABLE_EVIDENCE
        && confidence >= MIN_ACTIONABLE_EVIDENCE
        && evidenceTier !== 'weak'
    );

    if (!actionable) {
        return {
            direction,
            meanPitchResidual,
            meanAbsResidual,
            coverage,
            confidence,
            sampleSize,
            evidenceScore,
            evidenceTier,
            adjustmentPercent: 0,
            recommended: null,
            hasResiduals: true,
            actionable: false,
        };
    }

    const rawAdjustment = meanAbsResidual * 0.12 * (0.5 + evidenceScore);
    const minAdjustment = evidenceTier === 'strong' ? 0.03 : 0.02;
    const maxAdjustment = evidenceTier === 'strong' ? 0.12 : 0.08;

    return {
        direction,
        meanPitchResidual,
        meanAbsResidual,
        coverage,
        confidence,
        sampleSize,
        evidenceScore,
        evidenceTier,
        adjustmentPercent: clampPercent(rawAdjustment, minAdjustment, maxAdjustment),
        recommended: direction === 'increase_sens' ? 'high' : 'low',
        hasResiduals: true,
        actionable: true,
    };
}

function applyResidualObjective(
    idealCm360: number,
    objective: ResidualObjective
): number {
    if (!objective.actionable || objective.direction === 'hold') {
        return idealCm360;
    }

    if (objective.direction === 'increase_sens') {
        return idealCm360 * (1 - objective.adjustmentPercent);
    }

    return idealCm360 * (1 + objective.adjustmentPercent);
}

function getDiagnosisConfidence(diagnosis: Diagnosis | undefined): number {
    if (!diagnosis) {
        return 0;
    }

    if (diagnosis.type === 'inconclusive') {
        return clamp01(diagnosis.evidenceQuality.confidence);
    }

    return clamp01(diagnosis.confidence ?? diagnosis.evidence?.confidence ?? 1);
}

function getDiagnosisCoverage(diagnosis: Diagnosis | undefined): number {
    if (!diagnosis) {
        return 0;
    }

    if (diagnosis.type === 'inconclusive') {
        return clamp01(diagnosis.evidenceQuality.coverage);
    }

    return clamp01(diagnosis.evidence?.coverage ?? 1);
}

function mapDiagnosisToFallbackProfile(diagnosis: Diagnosis): ProfileType | null {
    switch (diagnosis.type) {
        case 'overpull':
        case 'late_compensation':
            return 'high';
        case 'underpull':
        case 'excessive_jitter':
        case 'horizontal_drift':
        case 'inconsistency':
            return 'low';
        case 'inconclusive':
            return null;
    }
}

function resolveDiagnosticFallback(diagnoses: readonly Diagnosis[]): DiagnosticFallback {
    const dominant = diagnoses[0];

    if (!dominant) {
        return {
            actionable: false,
            recommended: null,
            reason: 'none',
            confidence: 0,
            coverage: 0,
        };
    }

    if (dominant.type === 'inconclusive') {
        return {
            actionable: false,
            recommended: null,
            reason: 'inconclusive',
            confidence: getDiagnosisConfidence(dominant),
            coverage: getDiagnosisCoverage(dominant),
        };
    }

    const confidence = getDiagnosisConfidence(dominant);
    const coverage = getDiagnosisCoverage(dominant);
    const actionable = confidence >= MIN_ACTIONABLE_EVIDENCE && coverage >= MIN_ACTIONABLE_EVIDENCE;

    return {
        actionable,
        recommended: actionable ? mapDiagnosisToFallbackProfile(dominant) : null,
        reason: actionable ? 'applied' : 'guarded',
        confidence,
        coverage,
    };
}

function resolveSensitivityBias(diagnoses: readonly Diagnosis[]): SensitivityBias {
    let controlBias = 0;
    let speedBias = 0;

    for (const diagnosis of diagnoses) {
        const weight = diagnosis.severity / 5;

        switch (diagnosis.type) {
            case 'underpull':
            case 'excessive_jitter':
            case 'horizontal_drift':
            case 'inconsistency':
                controlBias += weight;
                break;
            case 'overpull':
            case 'late_compensation':
                speedBias += weight;
                break;
            case 'inconclusive':
                break;
        }
    }

    return {
        controlBias: Math.min(controlBias, 1),
        speedBias: Math.min(speedBias, 1),
    };
}

function buildCandidateGrid(
    minViable: number,
    maxViable: number,
    targetCm360: number
): readonly number[] {
    const values = new Set<number>();
    const steps = 12;
    const range = maxViable - minViable;

    if (range <= 0) {
        return [roundCm360(targetCm360)];
    }

    for (let index = 0; index <= steps; index++) {
        values.add(roundCm360(minViable + ((range * index) / steps)));
    }

    values.add(roundCm360(targetCm360));
    values.add(roundCm360(targetCm360 * 0.97));
    values.add(roundCm360(targetCm360 * 1.03));
    values.add(roundCm360((targetCm360 + minViable) / 2));
    values.add(roundCm360((targetCm360 + maxViable) / 2));

    return [...values]
        .map((value) => roundCm360(Math.max(minViable, Math.min(maxViable, value))))
        .sort((left, right) => left - right)
        .filter((value, index, all) => index === 0 || value !== all[index - 1]);
}

function scoreCandidate(
    cm360: number,
    context: CandidateContext,
    bias: SensitivityBias
): number {
    const rangeWidth = Math.max(context.maxViable - context.minViable, 1);
    const targetDistance = Math.abs(cm360 - context.targetCm360) / rangeWidth;
    const priorDistance = Math.abs(cm360 - context.baseIdealCm360) / rangeWidth;
    const priorWeight = context.evidenceTier === 'strong'
        ? 0.08
        : context.evidenceTier === 'moderate'
            ? 0.16
            : 0.28;

    const boundaryMargin = Math.min(cm360 - context.minViable, context.maxViable - cm360) / rangeWidth;
    const boundaryPenalty = boundaryMargin < 0.08 ? (0.08 - boundaryMargin) * 0.4 : 0;
    const speedRatio = (context.maxViable - cm360) / rangeWidth;
    const controlRatio = (cm360 - context.minViable) / rangeWidth;
    const symptomPenalty = (bias.controlBias * speedRatio * 0.22) + (bias.speedBias * controlRatio * 0.18);

    return Number((
        targetDistance
        + (priorDistance * priorWeight)
        + boundaryPenalty
        + symptomPenalty
    ).toFixed(4));
}

function pickCandidateProfiles(context: CandidateContext): {
    readonly lowCm360: number;
    readonly balancedCm360: number;
    readonly highCm360: number;
} {
    const bias = resolveSensitivityBias(context.diagnoses);
    const candidates = buildCandidateGrid(
        context.minViable,
        context.maxViable,
        context.targetCm360
    ).map<ScoredCandidate>((cm360) => ({
        cm360,
        score: scoreCandidate(cm360, context, bias),
    }));
    const balanced = candidates
        .slice()
        .sort((left, right) => left.score - right.score || right.cm360 - left.cm360)[0]!;
    const tolerance = context.evidenceTier === 'strong'
        ? 0.08
        : context.evidenceTier === 'moderate'
            ? 0.1
            : 0.12;
    const frontier = candidates.filter((candidate) => candidate.score <= balanced.score + tolerance);
    const low = frontier
        .filter((candidate) => candidate.cm360 >= balanced.cm360)
        .sort((left, right) => right.cm360 - left.cm360 || left.score - right.score)[0] ?? balanced;
    const high = frontier
        .filter((candidate) => candidate.cm360 <= balanced.cm360)
        .sort((left, right) => left.cm360 - right.cm360 || left.score - right.score)[0] ?? balanced;

    return {
        lowCm360: low.cm360,
        balancedCm360: balanced.cm360,
        highCm360: high.cm360,
    };
}

function resolveReferenceEffectiveYaw(
    generalSlider: number,
    adsSlider: number
): number {
    return resolveEffectiveSensitivity({
        patchVersion: CURRENT_PUBG_PATCH_VERSION,
        generalSlider,
        adsSlider,
        scopeSlider: generalSlider,
        opticId: 'red-dot-sight',
        opticStateId: '1x',
        verticalMultiplier: 1,
    }).effectiveYaw;
}

const SCOPE_BASE_OFFSETS: Readonly<Record<string, number>> = {
    'red-dot': 0,
    '2x': 0.4,
    '3x': 0.8,
    '4x': 1.2,
    '6x': 1.8,
    '8x': 2.3,
    '15x': 3.0,
};

const SCOPE_MAX_DELTA_FROM_CURRENT: Readonly<Record<string, number>> = {
    'red-dot': 2,
    '2x': 3,
    '3x': 4,
    '4x': 5,
    '6x': 6,
    '8x': 6,
    '15x': 7,
};

function clampSliderToRange(value: number, min: number, max: number): number {
    return roundSlider(Math.max(min, Math.min(max, value)));
}

function resolveScopePhysicalBias(
    playStyle: string,
    gripStyle: string,
    mousepadWidthCm: number,
    deskSpaceCm: number
): number {
    const usableSpace = Math.max(mousepadWidthCm, Math.min(deskSpaceCm || mousepadWidthCm, mousepadWidthCm + 18));
    let bias = 0;

    if (usableSpace <= 35) {
        bias += 0.9;
    } else if (usableSpace >= 55) {
        bias -= 0.9;
    }

    if (playStyle === 'wrist') {
        bias += 0.7;
    } else if (playStyle === 'arm') {
        bias -= 0.7;
    }

    if (gripStyle === 'fingertip') {
        bias += 0.3;
    } else if (gripStyle === 'palm') {
        bias -= 0.3;
    }

    return Math.max(-1.4, Math.min(1.4, bias));
}

function resolveScopeBaselineSlider(
    scopeId: ScopeId,
    generalSlider: number,
    context: ScopeRecommendationContext
): number {
    const baseOffset = SCOPE_BASE_OFFSETS[scopeId] ?? 0;
    if (baseOffset === 0) {
        return generalSlider;
    }

    const physicalBias = resolveScopePhysicalBias(
        context.playStyle,
        context.gripStyle,
        context.mousepadWidthCm,
        context.deskSpaceCm
    );
    const evidenceFactor = context.evidenceTier === 'strong'
        ? 1
        : context.evidenceTier === 'moderate'
            ? 0.82
            : 0.65;
    const profileFactor = context.type === 'high'
        ? 1.18
        : context.type === 'low'
            ? 0.82
            : 1;
    const physicalFactor = 1 + (physicalBias * 0.16);
    const physicalFineTune = physicalBias * 0.22;
    const offset = (baseOffset * evidenceFactor * profileFactor * physicalFactor) + physicalFineTune;

    return generalSlider + offset;
}

function resolveScopeDeltaCap(
    scopeId: ScopeId,
    context: ScopeRecommendationContext
): number {
    const physicalBias = resolveScopePhysicalBias(
        context.playStyle,
        context.gripStyle,
        context.mousepadWidthCm,
        context.deskSpaceCm
    );
    const baseCap = SCOPE_MAX_DELTA_FROM_CURRENT[scopeId] ?? 4;
    const profileBonus = context.type === 'high'
        ? 1
        : context.type === 'low'
            ? -1
            : 0;
    const evidenceBonus = context.evidenceTier === 'strong'
        ? 1
        : context.evidenceTier === 'weak'
            ? -1
            : 0;
    const physicalBonus = physicalBias > 0.5
        ? 1
        : physicalBias < -0.5
            ? -1
            : 0;

    return Math.max(2, baseCap + profileBonus + evidenceBonus + physicalBonus);
}

function resolveRecommendedScopeSlider(
    scopeId: ScopeId,
    generalSlider: number,
    adsSlider: number,
    targetEffectiveYaw: number,
    currentSlider: number,
    context: ScopeRecommendationContext
): number {
    const scope = SCOPES[scopeId];

    if (!scope) {
        return generalSlider;
    }

    try {
        const theoreticalSlider = roundSlider(scopeSliderFromEffectiveYaw({
            patchVersion: CURRENT_PUBG_PATCH_VERSION,
            generalSlider,
            adsSlider,
            opticId: scope.opticId,
            opticStateId: scope.stateId,
            verticalMultiplier: 1,
            targetEffectiveYaw,
        }));
        const ergonomicBaseline = resolveScopeBaselineSlider(scopeId, generalSlider, context);
        const currentWeight = context.evidenceTier === 'strong'
            ? 0.24
            : context.evidenceTier === 'moderate'
                ? 0.38
                : 0.52;
        const blendedSlider = (
            ergonomicBaseline * (1 - currentWeight)
            + (currentSlider * currentWeight)
        );
        const cap = resolveScopeDeltaCap(scopeId, context);
        const physicalBias = resolveScopePhysicalBias(
            context.playStyle,
            context.gripStyle,
            context.mousepadWidthCm,
            context.deskSpaceCm
        );
        const lowerBound = Math.max(0.01, currentSlider - 4);
        const upperBound = currentSlider + cap;
        const boundedTarget = Math.min(theoreticalSlider, upperBound);
        const finalTarget = Math.min(
            boundedTarget,
            Math.max(
                lowerBound,
                blendedSlider + Math.max(-1, Math.min(1.5, physicalBias * 0.35))
            )
        );

        return clampSliderToRange(finalTarget, lowerBound, upperBound);
    } catch {
        return generalSlider;
    }
}

function buildProfile(
    type: ProfileType,
    targetCm360: number,
    dpi: number,
    currentScopeSens: Record<string, number>,
    context: Omit<ScopeRecommendationContext, 'type'>
): SensitivityProfile {
    const internalMultiplier = internalFromCmPer360(dpi, targetCm360);
    const generalSlider = internalToSlider(internalMultiplier);
    const adsSlider = generalSlider;
    const targetEffectiveYaw = resolveReferenceEffectiveYaw(generalSlider, adsSlider);

    const scopeEntries: ScopeSensitivity[] = (Object.keys(SCOPES) as ScopeId[])
        .filter((scopeId) => scopeId !== 'hip')
        .flatMap((scopeId) => {
            const scope = SCOPES[scopeId];

            if (!scope) {
                return [];
            }

            const current = resolveScopeSensitivityValue(currentScopeSens, scopeId);
            const recommended = resolveRecommendedScopeSlider(
                scopeId,
                generalSlider,
                adsSlider,
                targetEffectiveYaw,
                current,
                {
                    ...context,
                    type,
                }
            );

            return [{
                scopeName: scope.name,
                current: asSensitivity(current),
                recommended: asSensitivity(recommended),
                changePercent: Math.round(((recommended - current) / Math.max(current, 1)) * 100),
            }];
        });

    const labels: Record<ProfileType, { label: string; description: string }> = {
        low: {
            label: 'Baixa (Max. Controle)',
            description: 'Maior cm/360. Ideal para sprays longos e mais margem de controle.',
        },
        balanced: {
            label: 'Balanceada',
            description: 'Melhor ponto de equilibrio dentro da evidencia capturada neste clip.',
        },
        high: {
            label: 'Alta (Max. Velocidade)',
            description: 'Menor cm/360. Prioriza resposta rapida quando a leitura sustenta esse ganho.',
        },
    };

    return {
        type,
        label: labels[type].label,
        description: labels[type].description,
        general: asSensitivity(generalSlider),
        ads: asSensitivity(adsSlider),
        scopes: scopeEntries,
        cmPer360: asCentimeters(roundCm360(targetCm360)),
    };
}

function resolveRecommendedProfile(
    residualObjective: ResidualObjective,
    diagnosticFallback: DiagnosticFallback
): ProfileType {
    if (residualObjective.actionable) {
        const threshold = residualObjective.evidenceTier === 'strong' ? 0.05 : 0.07;

        if (residualObjective.adjustmentPercent >= threshold) {
            return residualObjective.direction === 'increase_sens' ? 'high' : 'low';
        }

        return 'balanced';
    }

    if (diagnosticFallback.actionable && diagnosticFallback.recommended) {
        return diagnosticFallback.recommended;
    }

    return 'balanced';
}

function resolveRecommendationEvidence(
    residualObjective: ResidualObjective,
    diagnosticFallback: DiagnosticFallback
): {
    readonly evidenceTier: RecommendationEvidenceTier;
    readonly confidenceScore: number;
} {
    if (residualObjective.hasResiduals) {
        return {
            evidenceTier: residualObjective.evidenceTier,
            confidenceScore: residualObjective.evidenceScore,
        };
    }

    if (diagnosticFallback.reason === 'none') {
        return {
            evidenceTier: 'moderate',
            confidenceScore: 0.5,
        };
    }

    const confidenceScore = Number((
        (diagnosticFallback.confidence * 0.6)
        + (diagnosticFallback.coverage * 0.4)
    ).toFixed(3));

    return {
        evidenceTier: scoreToEvidenceTier(confidenceScore),
        confidenceScore,
    };
}

function resolveRecommendationTier(input: {
    readonly recommended: ProfileType;
    readonly evidenceTier: RecommendationEvidenceTier;
    readonly confidenceScore: number;
    readonly residualObjective: ResidualObjective;
    readonly diagnosticFallback: DiagnosticFallback;
    readonly clipCount: number;
    readonly analysisDecision?: AnalysisDecision;
}): SensitivityRecommendationTier {
    if (
        input.analysisDecision
        && input.analysisDecision.level !== 'usable_analysis'
        && input.analysisDecision.level !== 'strong_analysis'
    ) {
        return 'capture_again';
    }

    const hasStrongEvidence = input.evidenceTier === 'strong' && input.confidenceScore >= 0.8;
    const hasActionableSignal = input.residualObjective.actionable || input.diagnosticFallback.actionable;

    if (!hasActionableSignal || input.evidenceTier === 'weak' || input.confidenceScore < 0.58) {
        return 'capture_again';
    }

    if (hasStrongEvidence && input.clipCount >= 3) {
        return input.analysisDecision && input.analysisDecision.level !== 'strong_analysis'
            ? 'test_profiles'
            : 'apply_ready';
    }

    return 'test_profiles';
}

export function generateSensitivityRecommendation(
    metrics: SprayMetrics,
    diagnoses: readonly Diagnosis[],
    dpi: number,
    playStyle: string,
    gripStyle: string,
    mousepadWidthCm: number,
    currentScopeSens: Record<string, number>,
    currentVSM: number = 1.0,
    clipCount: number = 1,
    deskSpaceCm: number = mousepadWidthCm,
    analysisDecision?: AnalysisDecision
): SensitivityRecommendation {
    const range = getBaseSensRange(playStyle, gripStyle);
    const normalizedCurrentScopeSens = normalizeScopeSensitivityMap(currentScopeSens);
    const residualObjective = calculateResidualObjective(metrics);
    const diagnosticFallback = resolveDiagnosticFallback(diagnoses);
    const adjustedIdeal = residualObjective.actionable
        ? applyResidualObjective(range.idealCm360, residualObjective)
        : diagnosticFallback.actionable
            ? adjustForDiagnostics(range.idealCm360, diagnoses, metrics)
            : range.idealCm360;
    const minViable = isSensViableForMousepad(range.minCm360, mousepadWidthCm)
        ? range.minCm360
        : adjustedIdeal * 0.8;
    const maxViable = range.maxCm360;
    const evidence = resolveRecommendationEvidence(residualObjective, diagnosticFallback);
    const effectiveEvidence = analysisDecision && !analysisDecision.permissionMatrix.canDisplaySensitivity
        ? {
            evidenceTier: 'weak' as const,
            confidenceScore: Math.min(evidence.confidenceScore, analysisDecision.confidence),
        }
        : evidence;
    const candidateProfiles = pickCandidateProfiles({
        targetCm360: Math.max(minViable, Math.min(maxViable, adjustedIdeal)),
        baseIdealCm360: range.idealCm360,
        minViable,
        maxViable,
        evidenceTier: effectiveEvidence.evidenceTier,
        diagnoses,
    });
    const profiles: [SensitivityProfile, SensitivityProfile, SensitivityProfile] = [
        buildProfile('low', candidateProfiles.lowCm360, dpi, normalizedCurrentScopeSens, {
            playStyle,
            gripStyle,
            mousepadWidthCm,
            deskSpaceCm,
            evidenceTier: effectiveEvidence.evidenceTier,
        }),
        buildProfile('balanced', candidateProfiles.balancedCm360, dpi, normalizedCurrentScopeSens, {
            playStyle,
            gripStyle,
            mousepadWidthCm,
            deskSpaceCm,
            evidenceTier: effectiveEvidence.evidenceTier,
        }),
        buildProfile('high', candidateProfiles.highCm360, dpi, normalizedCurrentScopeSens, {
            playStyle,
            gripStyle,
            mousepadWidthCm,
            deskSpaceCm,
            evidenceTier: effectiveEvidence.evidenceTier,
        }),
    ];
    const recommended = resolveRecommendedProfile(
        residualObjective,
        diagnosticFallback
    );
    const tier = resolveRecommendationTier({
        recommended,
        evidenceTier: effectiveEvidence.evidenceTier,
        confidenceScore: effectiveEvidence.confidenceScore,
        residualObjective,
        diagnosticFallback,
        clipCount,
        ...(analysisDecision ? { analysisDecision } : {}),
    });
    const burstVCI = metrics.burstVCI ?? metrics.verticalControlIndex;
    let suggestedVSM: number | undefined;

    if (tier !== 'capture_again' && residualObjective.actionable && residualObjective.direction !== 'hold') {
        const directionMultiplier = residualObjective.direction === 'increase_sens'
            ? 1 - residualObjective.adjustmentPercent
            : 1 + residualObjective.adjustmentPercent;
        suggestedVSM = Number((currentVSM * directionMultiplier).toFixed(2));
        suggestedVSM = Math.max(0.7, Math.min(2.0, suggestedVSM));
    } else if (tier !== 'capture_again' && Math.abs(burstVCI - 1) > 0.05) {
        suggestedVSM = Number((currentVSM / burstVCI).toFixed(2));
        suggestedVSM = Math.max(0.7, Math.min(2.0, suggestedVSM));
    }

    const dominant = diagnoses[0];
    const reasoningParts: string[] = [
        `residualObjective=${residualObjective.direction}`,
        `meanPitchResidual=${residualObjective.meanPitchResidual.toFixed(3)}`,
        `meanAbsResidual=${residualObjective.meanAbsResidual.toFixed(3)}`,
        `coverage=${residualObjective.coverage.toFixed(2)}`,
        `confidence=${residualObjective.confidence.toFixed(2)}`,
        `sampleSize=${residualObjective.sampleSize}`,
        `clipCount=${clipCount}`,
        `evidenceTier=${effectiveEvidence.evidenceTier}`,
        `confidenceScore=${effectiveEvidence.confidenceScore.toFixed(3)}`,
        `tier=${tier}`,
        `diagnosticFallback=${diagnosticFallback.reason}`,
        `targetCm360=${adjustedIdeal.toFixed(2)}`,
        `prior=${playStyle}/${gripStyle}`,
        `space=${deskSpaceCm}/${mousepadWidthCm}`,
        `burstVCI=${burstVCI.toFixed(2)}`,
        `dpi=${dpi}`,
    ];

    if (dominant) {
        reasoningParts.push(`foco em ${dominant.type}`);
    }

    if (analysisDecision) {
        reasoningParts.push(`decisionLevel=${analysisDecision.level}`);
    }

    return {
        profiles,
        recommended,
        tier,
        evidenceTier: effectiveEvidence.evidenceTier,
        confidenceScore: effectiveEvidence.confidenceScore,
        reasoning: reasoningParts.join(', ') + '.',
        ...(suggestedVSM !== undefined ? { suggestedVSM } : {}),
    };
}
