import type {
    AnalysisDecision,
    AnalysisResult,
    CoachFocusArea,
    CoachSignal,
    Diagnosis,
    SensitivityRecommendation,
    VideoQualityReport,
} from '../types/engine';

export interface BuildCoachSignalInput {
    readonly analysisResult: AnalysisResult;
}

export function extractCoachSignals(input: BuildCoachSignalInput): readonly CoachSignal[] {
    const { analysisResult } = input;

    return [
        ...extractVideoQualitySignals(analysisResult.videoQualityReport),
        ...extractAnalysisDecisionSignals(analysisResult.analysisDecision),
        ...analysisResult.diagnoses.map(extractDiagnosisSignal),
        extractSensitivitySignal(analysisResult.sensitivity),
        ...extractContextSignals(analysisResult),
    ];
}

function extractAnalysisDecisionSignals(decision: AnalysisDecision | undefined): readonly CoachSignal[] {
    if (!decision) {
        return [];
    }

    return [{
        source: 'context',
        area: decision.permissionMatrix.canDisplayCoach ? 'validation' : 'capture_quality',
        key: `analysis_decision.${decision.level}`,
        summary: `Decision ladder ${decision.level}; ${decision.recommendedNextStep}`,
        confidence: clampUnit(decision.confidence),
        coverage: clampUnit(decision.confidence),
        weight: decision.permissionMatrix.canDisplayCoach ? 0.65 : 1,
    }];
}

function extractVideoQualitySignals(report: VideoQualityReport | undefined): readonly CoachSignal[] {
    if (!report) {
        return [];
    }

    if (!report.usableForAnalysis) {
        const reasons = report.blockingReasons.length > 0
            ? report.blockingReasons.map(formatVideoQualityBlockingReason).join(', ')
            : 'bloqueio de captura desconhecido';

        return [{
            source: 'video_quality',
            area: 'capture_quality',
            key: 'video_quality.unusable',
            summary: `O video ainda nao sustenta analise; bloqueios: ${reasons}.`,
            confidence: 1,
            coverage: 1,
            weight: 1,
        }];
    }

    const tier = report.diagnostic?.tier ?? 'usable';

    return [{
        source: 'video_quality',
        area: 'capture_quality',
        key: `video_quality.${tier}`,
        summary: report.diagnostic?.summary ?? 'O video esta usavel para a leitura do coach.',
        confidence: scoreToUnit(report.overallScore),
        coverage: 1,
        weight: 0.5,
    }];
}

function extractDiagnosisSignal(diagnosis: Diagnosis): CoachSignal {
    const evidence = diagnosis.evidence;
    const area = mapDiagnosisArea(diagnosis);

    return {
        source: 'diagnosis',
        area,
        key: `diagnosis.${diagnosis.type}`,
        summary: `${diagnosis.description} Causa: ${diagnosis.cause}`,
        confidence: clampUnit(evidence?.confidence ?? diagnosis.confidence ?? 0.5),
        coverage: clampUnit(evidence?.coverage ?? 0.5),
        weight: clampUnit(diagnosis.severity / 5),
    };
}

function extractSensitivitySignal(sensitivity: SensitivityRecommendation): CoachSignal {
    const isCaptureBlocked = sensitivity.tier === 'capture_again';
    const blockerSuffix = isCaptureBlocked
        ? ' Isso bloqueia mudancas agressivas de sensibilidade.'
        : '';

    return {
        source: 'sensitivity',
        area: 'sensitivity',
        key: `sensitivity.${sensitivity.tier}`,
        summary: `Recomendacao de sensibilidade em modo ${formatSensitivityTier(sensitivity.tier)}, com evidencia ${formatSensitivityEvidenceTier(sensitivity.evidenceTier)} e confianca ${sensitivity.confidenceScore}.${blockerSuffix}`,
        confidence: clampUnit(sensitivity.confidenceScore),
        coverage: evidenceTierCoverage(sensitivity.evidenceTier),
        weight: isCaptureBlocked ? 1 : evidenceTierCoverage(sensitivity.evidenceTier),
    };
}

function extractContextSignals(analysisResult: AnalysisResult): readonly CoachSignal[] {
    const signals: CoachSignal[] = [{
        source: 'context',
        area: 'validation',
        key: 'context.patch',
        summary: `Patch ${analysisResult.patchVersion}.`,
        confidence: 1,
        coverage: 1,
        weight: 0.25,
    }];

    const context = analysisResult.analysisContext;
    if (!context) {
        return signals;
    }

    signals.push({
        source: 'context',
        area: 'validation',
        key: 'context.optic',
        summary: `Mira ${context.optic.opticName} (${context.optic.opticStateName}).`,
        confidence: 1,
        coverage: 1,
        weight: 0.25,
    });

    signals.push({
        source: 'context',
        area: 'validation',
        key: 'context.distance',
        summary: `Distancia alvo ${formatMeters(context.targetDistanceMeters)}m (${formatDistanceMode(context.distanceMode)}).`,
        confidence: context.distanceMode === 'exact' ? 1 : 0.65,
        coverage: 1,
        weight: 0.25,
    });

    return signals;
}

function mapDiagnosisArea(diagnosis: Diagnosis): CoachFocusArea {
    switch (diagnosis.type) {
        case 'overpull':
        case 'underpull':
            return 'vertical_control';
        case 'late_compensation':
            return 'timing';
        case 'excessive_jitter':
        case 'horizontal_drift':
            return 'horizontal_control';
        case 'inconsistency':
            return 'consistency';
        case 'inconclusive':
            return 'validation';
    }
}

function evidenceTierCoverage(tier: SensitivityRecommendation['evidenceTier']): number {
    switch (tier) {
        case 'weak':
            return 0.35;
        case 'moderate':
            return 0.65;
        case 'strong':
            return 0.9;
    }
}

function formatVideoQualityBlockingReason(reason: VideoQualityReport['blockingReasons'][number]): string {
    switch (reason) {
        case 'low_sharpness':
            return 'baixa nitidez';
        case 'high_compression_burden':
            return 'compressao pesada';
        case 'low_reticle_contrast':
            return 'baixo contraste da mira';
        case 'unstable_roi':
            return 'area da mira instavel';
        case 'unstable_fps':
            return 'FPS instavel';
    }
}

function formatSensitivityTier(tier: SensitivityRecommendation['tier']): string {
    switch (tier) {
        case 'capture_again':
            return 'capturar novamente';
        case 'test_profiles':
            return 'testar perfis';
        case 'apply_ready':
            return 'pronto para aplicar';
    }
}

function formatSensitivityEvidenceTier(tier: SensitivityRecommendation['evidenceTier']): string {
    switch (tier) {
        case 'weak':
            return 'fraca';
        case 'moderate':
            return 'moderada';
        case 'strong':
            return 'forte';
    }
}

function formatDistanceMode(mode: NonNullable<AnalysisResult['analysisContext']>['distanceMode'] | undefined): string {
    switch (mode) {
        case 'exact':
            return 'exata';
        case 'estimated':
            return 'estimada';
        case 'unknown':
        case undefined:
            return 'nao informada';
    }
}

function scoreToUnit(score: number): number {
    return clampUnit(score / 100);
}

function clampUnit(value: number): number {
    if (Number.isNaN(value)) {
        return 0;
    }

    return Math.min(1, Math.max(0, value));
}

function formatMeters(value: number): string {
    return Number.isInteger(value) ? String(value) : value.toFixed(1);
}
