import type {
    AnalysisBlockerReasonCode,
    AnalysisDecision,
    AnalysisDecisionLevel,
    AnalysisDecisionPermissionMatrix,
    SprayActionState,
    SprayValidityReport,
} from '@/types/engine';

export interface ResolveAnalysisDecisionInput {
    readonly confidence?: number;
    readonly coverage?: number;
    readonly blockerReasons?: readonly AnalysisBlockerReasonCode[];
    readonly sprayValidity?: SprayValidityReport | null;
    readonly videoQualityUsable?: boolean;
    readonly commercialEvidence?: boolean;
}

const ENGINE_VERSION = 'spray-truth-v2' as const;

const INVALID_PROTOCOL_REASONS = new Set<AnalysisBlockerReasonCode>([
    'too_short',
    'hard_cut',
    'flick',
    'target_swap',
    'camera_motion',
    'crosshair_not_visible',
    'not_spray_protocol',
]);

const PERMISSION_MATRIX: Record<AnalysisDecisionLevel, AnalysisDecisionPermissionMatrix> = {
    blocked_invalid_clip: {
        canDisplayDiagnosis: false,
        canDisplaySensitivity: false,
        canDisplayCoach: false,
        canSaveAuditResult: true,
        countsAsUsefulAnalysis: false,
        canEnterPrecisionTrend: false,
        canEnterCorpus: false,
        allowedClaimLevel: 'none',
    },
    inconclusive_recapture: {
        canDisplayDiagnosis: false,
        canDisplaySensitivity: false,
        canDisplayCoach: false,
        canSaveAuditResult: true,
        countsAsUsefulAnalysis: false,
        canEnterPrecisionTrend: false,
        canEnterCorpus: false,
        allowedClaimLevel: 'capture_guidance',
    },
    partial_safe_read: {
        canDisplayDiagnosis: true,
        canDisplaySensitivity: false,
        canDisplayCoach: false,
        canSaveAuditResult: true,
        countsAsUsefulAnalysis: false,
        canEnterPrecisionTrend: false,
        canEnterCorpus: false,
        allowedClaimLevel: 'limited_read',
    },
    usable_analysis: {
        canDisplayDiagnosis: true,
        canDisplaySensitivity: true,
        canDisplayCoach: true,
        canSaveAuditResult: true,
        countsAsUsefulAnalysis: true,
        canEnterPrecisionTrend: true,
        canEnterCorpus: false,
        allowedClaimLevel: 'analysis',
    },
    strong_analysis: {
        canDisplayDiagnosis: true,
        canDisplaySensitivity: true,
        canDisplayCoach: true,
        canSaveAuditResult: true,
        countsAsUsefulAnalysis: true,
        canEnterPrecisionTrend: true,
        canEnterCorpus: true,
        allowedClaimLevel: 'commercial_supported',
    },
};

export function permissionMatrixForDecisionLevel(
    level: AnalysisDecisionLevel
): AnalysisDecisionPermissionMatrix {
    return PERMISSION_MATRIX[level];
}

export function resolveAnalysisDecision(input: ResolveAnalysisDecisionInput = {}): AnalysisDecision {
    const blockerReasons = uniqueReasons([
        ...(input.sprayValidity?.blockerReasons ?? []),
        ...(input.blockerReasons ?? []),
        ...(input.videoQualityUsable === false ? ['low_clip_quality' as const] : []),
    ]);
    const confidence = clampUnit(input.confidence ?? input.sprayValidity?.confidence ?? 0);
    const coverage = clampUnit(input.coverage ?? (input.sprayValidity ? input.sprayValidity.shotLikeEvents / Math.max(input.sprayValidity.frameCount - 1, 1) : 0));
    const level = resolveDecisionLevel({
        blockerReasons,
        confidence,
        coverage,
        commercialEvidence: input.commercialEvidence === true,
        ...(input.sprayValidity === undefined ? {} : { sprayValidity: input.sprayValidity }),
    });

    return {
        version: ENGINE_VERSION,
        level,
        blockerReasons,
        permissionMatrix: permissionMatrixForDecisionLevel(level),
        recommendedNextStep: recommendedNextStepForDecision(level, blockerReasons),
        legacyActionState: legacyActionStateForDecisionLevel(level),
        confidence,
    };
}

function resolveDecisionLevel(input: {
    readonly blockerReasons: readonly AnalysisBlockerReasonCode[];
    readonly confidence: number;
    readonly coverage: number;
    readonly sprayValidity?: SprayValidityReport | null;
    readonly commercialEvidence: boolean;
}): AnalysisDecisionLevel {
    if (input.blockerReasons.some((reason) => INVALID_PROTOCOL_REASONS.has(reason))) {
        return 'blocked_invalid_clip';
    }

    if (input.sprayValidity?.valid === false) {
        return 'inconclusive_recapture';
    }

    if (
        input.blockerReasons.includes('low_clip_quality')
        || input.confidence < 0.45
        || input.coverage < 0.45
    ) {
        return 'inconclusive_recapture';
    }

    if (
        input.blockerReasons.includes('low_confidence')
        || input.blockerReasons.includes('low_coverage')
        || input.confidence < 0.6
        || input.coverage < 0.6
    ) {
        return 'partial_safe_read';
    }

    if (input.commercialEvidence && input.confidence >= 0.82 && input.coverage >= 0.8) {
        return 'strong_analysis';
    }

    return 'usable_analysis';
}

function legacyActionStateForDecisionLevel(level: AnalysisDecisionLevel): SprayActionState {
    switch (level) {
        case 'blocked_invalid_clip':
        case 'inconclusive_recapture':
            return 'capture_again';
        case 'partial_safe_read':
            return 'inconclusive';
        case 'usable_analysis':
            return 'testable';
        case 'strong_analysis':
            return 'ready';
    }
}

function recommendedNextStepForDecision(
    level: AnalysisDecisionLevel,
    blockerReasons: readonly AnalysisBlockerReasonCode[]
): string {
    if (level === 'blocked_invalid_clip') {
        return `Recapture um spray valido antes da analise. Motivos: ${blockerReasons.join(', ') || 'clip invalido'}.`;
    }

    switch (level) {
        case 'inconclusive_recapture':
            return 'Recapture com reticulo visivel, alvo unico e spray sustentado para liberar uma leitura honesta.';
        case 'partial_safe_read':
            return 'Use a leitura parcial apenas como guia de captura e valide com outro clip comparavel.';
        case 'usable_analysis':
            return 'Use o diagnostico como protocolo de teste e valide no proximo spray comparavel.';
        case 'strong_analysis':
            return 'A evidencia suporta decisao forte, mantendo validacao no proximo bloco.';
    }
}

function uniqueReasons(
    reasons: readonly AnalysisBlockerReasonCode[]
): readonly AnalysisBlockerReasonCode[] {
    return [...new Set(reasons)];
}

function clampUnit(value: number): number {
    if (!Number.isFinite(value)) {
        return 0;
    }

    return Math.max(0, Math.min(1, value));
}
