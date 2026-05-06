import type {
    AnalysisDecision,
    AnalysisResult,
    CoachPlan,
    Diagnosis,
    DiagnosisType,
    SensitivityRecommendation,
    SprayActionLabel,
    SprayActionState,
    SprayMastery,
    SprayMasteryEvidence,
    SprayMasteryPillars,
    SprayMechanicalLevel,
    SprayMechanicalLevelLabel,
    SprayMetrics,
    SprayTrajectory,
    VideoQualityReport,
} from '@/types/engine';

const MIN_ACTIONABLE_EVIDENCE = 0.6;
const STRONG_EVIDENCE = 0.8;

export interface ResolveMeasurementTruthInput {
    readonly metrics: SprayMetrics;
    readonly trajectory: SprayTrajectory;
    readonly sensitivity: SensitivityRecommendation;
    readonly videoQualityReport?: VideoQualityReport;
    readonly diagnoses?: readonly Diagnosis[];
    readonly analysisDecision?: AnalysisDecision;
    readonly coachPlan?: CoachPlan;
    readonly subSessions?: readonly AnalysisResult[];
}

interface EvidenceSnapshot {
    readonly coverage: number;
    readonly confidence: number;
    readonly visibleFrames: number;
    readonly lostFrames: number;
    readonly framesProcessed: number;
    readonly sampleSize: number;
}

export function formatDiagnosisTruthLabel(type: DiagnosisType): string {
    switch (type) {
        case 'underpull':
            return 'spray subindo';
        case 'overpull':
            return 'spray descendo demais';
        case 'excessive_jitter':
            return 'tremida lateral';
        case 'horizontal_drift':
            return 'desvio lateral';
        case 'inconsistency':
            return 'spray irregular';
        case 'late_compensation':
            return 'reacao atrasada ao recuo';
        case 'inconclusive':
            return 'leitura inconclusiva';
    }
}

export function resolveMeasurementTruth(input: ResolveMeasurementTruthInput): SprayMastery {
    const evidenceSnapshot = resolveEvidenceSnapshot(input);
    const qualityScore = resolveQualityScore(input.videoQualityReport);
    const usableForAnalysis = input.videoQualityReport?.usableForAnalysis ?? true;
    const evidence: SprayMasteryEvidence = {
        ...evidenceSnapshot,
        qualityScore,
        usableForAnalysis,
    };
    const mechanicalScore = roundScore(input.metrics.sprayScore);
    const pillars = resolvePillars(input.metrics, evidence);
    const blockedRecommendations = resolveBlockedRecommendations(input, evidence);
    const hasWeakEvidence = blockedRecommendations.length > 0;
    const ready = canResolveReady(input, evidence, mechanicalScore);

    let actionState: SprayActionState;
    if (hasWeakEvidence) {
        actionState = shouldCaptureAgain(input, evidence)
            ? 'capture_again'
            : 'inconclusive';
    } else if (ready) {
        actionState = 'ready';
    } else {
        actionState = 'testable';
    }
    actionState = capActionStateByDecision(actionState, input.analysisDecision);

    const actionLabel = actionLabelForState(actionState);
    const mechanicalLevel = resolveMechanicalLevel(mechanicalScore, evidence);
    const mechanicalLevelLabel = mechanicalLevelLabelForState(mechanicalLevel);
    const actionableScore = resolveActionableScore({
        actionState,
        mechanicalScore,
        pillars,
        evidence,
    });

    return {
        actionState,
        actionLabel,
        mechanicalLevel,
        mechanicalLevelLabel,
        actionableScore,
        mechanicalScore,
        pillars,
        evidence,
        reasons: resolveReasons({
            input,
            actionState,
            mechanicalLevelLabel,
            pillars,
            evidence,
        }),
        blockedRecommendations,
    };
}

function resolveEvidenceSnapshot(input: ResolveMeasurementTruthInput): EvidenceSnapshot {
    if (input.subSessions && input.subSessions.length > 0) {
        const snapshots = input.subSessions.map((session) => (
            readMetricEvidence(session.metrics, session.trajectory)
        ));
        const totals = snapshots.reduce((accumulator, snapshot) => ({
            coverageWeighted: accumulator.coverageWeighted + (snapshot.coverage * Math.max(snapshot.framesProcessed, 1)),
            confidenceWeighted: accumulator.confidenceWeighted + (snapshot.confidence * Math.max(snapshot.framesProcessed, 1)),
            visibleFrames: accumulator.visibleFrames + snapshot.visibleFrames,
            lostFrames: accumulator.lostFrames + snapshot.lostFrames,
            framesProcessed: accumulator.framesProcessed + snapshot.framesProcessed,
            sampleSize: accumulator.sampleSize + snapshot.sampleSize,
        }), {
            coverageWeighted: 0,
            confidenceWeighted: 0,
            visibleFrames: 0,
            lostFrames: 0,
            framesProcessed: 0,
            sampleSize: 0,
        });

        if (totals.framesProcessed > 0) {
            return {
                coverage: clamp01(totals.coverageWeighted / totals.framesProcessed),
                confidence: clamp01(totals.confidenceWeighted / totals.framesProcessed),
                visibleFrames: totals.visibleFrames,
                lostFrames: totals.lostFrames,
                framesProcessed: totals.framesProcessed,
                sampleSize: totals.sampleSize,
            };
        }
    }

    return readMetricEvidence(input.metrics, input.trajectory);
}

function readMetricEvidence(
    metrics: SprayMetrics,
    trajectory: SprayTrajectory,
): EvidenceSnapshot {
    const metricQuality = metrics.metricQuality?.sprayScore
        ?? metrics.metricQuality?.shotResiduals
        ?? metrics.metricQuality?.verticalControlIndex;
    const framesProcessed = Math.max(
        0,
        finite(metricQuality?.framesProcessed, trajectory.framesProcessed ?? trajectory.totalFrames ?? 0)
    );
    const visibleFrames = Math.max(
        0,
        finite(metricQuality?.framesTracked, trajectory.visibleFrames ?? trajectory.framesTracked ?? 0)
    );
    const lostFrames = Math.max(
        0,
        finite(metricQuality?.framesLost, trajectory.framesLost ?? Math.max(0, framesProcessed - visibleFrames))
    );
    const fallbackCoverage = framesProcessed > 0
        ? visibleFrames / framesProcessed
        : 0;

    return {
        coverage: clamp01(finite(metricQuality?.coverage, fallbackCoverage)),
        confidence: clamp01(finite(metricQuality?.confidence, trajectory.trackingQuality ?? 0)),
        visibleFrames,
        lostFrames,
        framesProcessed,
        sampleSize: Math.max(0, finite(metricQuality?.sampleSize, trajectory.displacements?.length ?? 0)),
    };
}

function resolveQualityScore(videoQualityReport: VideoQualityReport | undefined): number {
    if (!videoQualityReport) {
        return 65;
    }

    return roundScore(videoQualityReport.overallScore);
}

function resolvePillars(metrics: SprayMetrics, evidence: SprayMasteryEvidence): SprayMasteryPillars {
    return {
        control: resolveControlPillar(metrics),
        consistency: roundScore(metrics.consistencyScore),
        confidence: roundScore(((evidence.confidence * 0.65) + (evidence.coverage * 0.35)) * 100),
        clipQuality: evidence.qualityScore,
    };
}

function resolveControlPillar(metrics: SprayMetrics): number {
    const vertical = clampScore(100 - (Math.abs(1 - finite(metrics.verticalControlIndex, 1)) * 100));
    const horizontal = clampScore(100 - (finite(metrics.horizontalNoiseIndex, 0) * 12));
    const severity = clamp(finite(metrics.linearErrorSeverity, 2), 1, 5);
    const linear = clampScore(100 - (((severity - 1) / 4) * 100));

    return roundScore((vertical * 0.45) + (horizontal * 0.3) + (linear * 0.25));
}

function resolveBlockedRecommendations(
    input: ResolveMeasurementTruthInput,
    evidence: SprayMasteryEvidence,
): readonly string[] {
    const blocked: string[] = [];

    if (!evidence.usableForAnalysis) {
        blocked.push('A qualidade do clip bloqueia uma decisao forte. Capture outro spray comparavel antes de alterar sensibilidade.');
    }

    if (input.sensitivity.tier === 'capture_again') {
        blocked.push('A recomendacao de sensibilidade esta bloqueada pela propria leitura do motor.');
    }

    if (input.coachPlan?.tier === 'capture_again') {
        blocked.push('O coach pediu recaptura antes de promover treino ou ajuste.');
    }

    if (input.analysisDecision && !input.analysisDecision.permissionMatrix.countsAsUsefulAnalysis) {
        blocked.push(`Decision ladder ${input.analysisDecision.level} nao conta como analise util para recomendacoes fortes.`);
    }

    for (const reason of input.analysisDecision?.blockerReasons ?? []) {
        blocked.push(`Decision ladder blocker: ${reason}.`);
    }

    if (evidence.coverage < MIN_ACTIONABLE_EVIDENCE) {
        blocked.push('Cobertura abaixo de 60% nao sustenta uma recomendacao agressiva.');
    }

    if (evidence.confidence < MIN_ACTIONABLE_EVIDENCE) {
        blocked.push('Confianca abaixo de 60% exige validacao antes de qualquer mudanca.');
    }

    return blocked;
}

function shouldCaptureAgain(
    input: ResolveMeasurementTruthInput,
    evidence: SprayMasteryEvidence,
): boolean {
    return !evidence.usableForAnalysis
        || input.analysisDecision?.legacyActionState === 'capture_again'
        || input.sensitivity.tier === 'capture_again'
        || input.coachPlan?.tier === 'capture_again'
        || evidence.coverage < 0.45
        || evidence.confidence < 0.45;
}

function canResolveReady(
    input: ResolveMeasurementTruthInput,
    evidence: SprayMasteryEvidence,
    mechanicalScore: number,
): boolean {
    if (input.analysisDecision && input.analysisDecision.level !== 'strong_analysis') {
        return false;
    }

    const strongEvidence = evidence.usableForAnalysis
        && evidence.coverage >= STRONG_EVIDENCE
        && evidence.confidence >= STRONG_EVIDENCE
        && evidence.qualityScore >= 70;
    const strongDecision = input.sensitivity.tier === 'apply_ready'
        || input.coachPlan?.tier === 'apply_protocol';
    const compatibleRepetition = input.sensitivity.tier === 'apply_ready'
        || (input.subSessions?.length ?? 0) >= 3;

    return strongEvidence
        && strongDecision
        && compatibleRepetition
        && mechanicalScore >= 78;
}

function resolveMechanicalLevel(
    mechanicalScore: number,
    evidence: SprayMasteryEvidence,
): SprayMechanicalLevel {
    if (
        mechanicalScore >= 88
        && evidence.usableForAnalysis
        && evidence.coverage >= STRONG_EVIDENCE
        && evidence.confidence >= STRONG_EVIDENCE
        && evidence.qualityScore >= 75
    ) {
        return 'elite';
    }

    if (mechanicalScore >= 70) {
        return 'advanced';
    }

    if (mechanicalScore >= 50) {
        return 'intermediate';
    }

    return 'initial';
}

function resolveActionableScore(input: {
    readonly actionState: SprayActionState;
    readonly mechanicalScore: number;
    readonly pillars: SprayMasteryPillars;
    readonly evidence: SprayMasteryEvidence;
}): number {
    const evidenceScore = Math.min(input.pillars.confidence, input.pillars.clipQuality);
    const reliableActionScore = roundScore(
        (input.mechanicalScore * 0.5)
        + (input.pillars.control * 0.15)
        + (input.pillars.consistency * 0.15)
        + (evidenceScore * 0.2)
    );

    switch (input.actionState) {
        case 'capture_again':
            return Math.min(39, reliableActionScore);
        case 'inconclusive':
            return Math.min(49, reliableActionScore);
        case 'testable':
            return clamp(reliableActionScore, 50, 84);
        case 'ready':
            return clamp(Math.max(85, reliableActionScore), 85, 100);
    }
}

function resolveReasons(input: {
    readonly input: ResolveMeasurementTruthInput;
    readonly actionState: SprayActionState;
    readonly mechanicalLevelLabel: SprayMechanicalLevelLabel;
    readonly pillars: SprayMasteryPillars;
    readonly evidence: SprayMasteryEvidence;
}): readonly string[] {
    const dominantDiagnosis = input.input.diagnoses?.[0];
    const reasons: string[] = [
        `Nivel mecanico observado: ${input.mechanicalLevelLabel}.`,
        `Evidencia do clip: ${Math.round(input.evidence.coverage * 100)}% de cobertura e ${Math.round(input.evidence.confidence * 100)}% de confianca.`,
    ];

    if (dominantDiagnosis) {
        reasons.push(`Sinal principal: ${formatDiagnosisTruthLabel(dominantDiagnosis.type)}.`);
    }

    if (input.input.analysisDecision) {
        reasons.push(`Decision ladder: ${input.input.analysisDecision.level}.`);
    }

    switch (input.actionState) {
        case 'capture_again':
            reasons.push('A proxima acao correta e capturar outro spray comparavel antes de mudar o treino.');
            break;
        case 'inconclusive':
            reasons.push('Existe leitura parcial, mas ela ainda precisa de validacao antes de virar protocolo.');
            break;
        case 'testable':
            reasons.push('A evidencia sustenta um protocolo de teste, mantendo validacao no proximo clip.');
            break;
        case 'ready':
            reasons.push('A evidencia repetida sustenta aplicar o protocolo e validar o resultado no proximo bloco.');
            break;
    }

    if (input.pillars.control >= 75) {
        reasons.push('Controle mecanico aparece forte, separado da confianca da captura.');
    }

    return reasons;
}

function capActionStateByDecision(
    actionState: SprayActionState,
    decision: AnalysisDecision | undefined,
): SprayActionState {
    if (!decision) {
        return actionState;
    }

    switch (decision.level) {
        case 'blocked_invalid_clip':
        case 'inconclusive_recapture':
            return 'capture_again';
        case 'partial_safe_read':
            return actionState === 'capture_again' ? 'capture_again' : 'inconclusive';
        case 'usable_analysis':
            return actionState === 'ready' ? 'testable' : actionState;
        case 'strong_analysis':
            return actionState;
    }
}

function actionLabelForState(state: SprayActionState): SprayActionLabel {
    switch (state) {
        case 'capture_again':
            return 'Capturar de novo';
        case 'inconclusive':
            return 'Incerto';
        case 'testable':
            return 'Testavel';
        case 'ready':
            return 'Pronto';
    }
}

function mechanicalLevelLabelForState(level: SprayMechanicalLevel): SprayMechanicalLevelLabel {
    switch (level) {
        case 'initial':
            return 'Inicial';
        case 'intermediate':
            return 'Intermediario';
        case 'advanced':
            return 'Avancado';
        case 'elite':
            return 'Elite';
    }
}

function finite(value: unknown, fallback: number): number {
    return typeof value === 'number' && Number.isFinite(value)
        ? value
        : fallback;
}

function roundScore(value: unknown): number {
    return Math.round(clampScore(finite(value, 0)));
}

function clampScore(value: number): number {
    return clamp(value, 0, 100);
}

function clamp01(value: number): number {
    return clamp(value, 0, 1);
}

function clamp(value: number, min: number, max: number): number {
    if (!Number.isFinite(value)) {
        return min;
    }

    return Math.max(min, Math.min(max, value));
}
