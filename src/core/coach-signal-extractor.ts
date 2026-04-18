import type {
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
        ...analysisResult.diagnoses.map(extractDiagnosisSignal),
        extractSensitivitySignal(analysisResult.sensitivity),
        ...extractContextSignals(analysisResult),
    ];
}

function extractVideoQualitySignals(report: VideoQualityReport | undefined): readonly CoachSignal[] {
    if (!report) {
        return [];
    }

    if (!report.usableForAnalysis) {
        const reasons = report.blockingReasons.length > 0
            ? report.blockingReasons.join(', ')
            : 'unknown capture blocker';

        return [{
            source: 'video_quality',
            area: 'capture_quality',
            key: 'video_quality.unusable',
            summary: `Clip is not usable for analysis; blockers: ${reasons}.`,
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
        summary: report.diagnostic?.summary ?? 'Clip is usable for coaching analysis.',
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
        summary: `${diagnosis.description} Cause: ${diagnosis.cause}`,
        confidence: clampUnit(evidence?.confidence ?? diagnosis.confidence ?? 0.5),
        coverage: clampUnit(evidence?.coverage ?? 0.5),
        weight: clampUnit(diagnosis.severity / 5),
    };
}

function extractSensitivitySignal(sensitivity: SensitivityRecommendation): CoachSignal {
    const isCaptureBlocked = sensitivity.tier === 'capture_again';
    const blockerSuffix = isCaptureBlocked
        ? ' This blocks aggressive sensitivity changes.'
        : '';

    return {
        source: 'sensitivity',
        area: 'sensitivity',
        key: `sensitivity.${sensitivity.tier}`,
        summary: `Sensitivity tier ${sensitivity.tier} with ${sensitivity.evidenceTier} evidence and confidence ${sensitivity.confidenceScore}.${blockerSuffix}`,
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
        summary: `Optic ${context.optic.opticName} (${context.optic.opticStateName}).`,
        confidence: 1,
        coverage: 1,
        weight: 0.25,
    });

    signals.push({
        source: 'context',
        area: 'validation',
        key: 'context.distance',
        summary: `Target distance ${formatMeters(context.targetDistanceMeters)}m (${context.distanceMode ?? 'unknown'}).`,
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
