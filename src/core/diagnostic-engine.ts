/**
 * Diagnostic Engine — 6 classificações automáticas de problemas.
 *
 * 1. Overpull — compensação vertical excessiva
 * 2. Underpull — compensação vertical insuficiente
 * 3. Late Compensation — demora para reagir ao recoil
 * 4. Excessive Jitter — tremor horizontal excessivo
 * 5. Horizontal Drift — tendência direcional
 * 6. Inconsistency — variação alta entre segmentos
 */

import type {
    AnalysisDecision,
    SprayMetrics,
    Diagnosis,
    OverpullDiagnosis,
    UnderpullDiagnosis,
    LateCompensationDiagnosis,
    ExcessiveJitterDiagnosis,
    HorizontalDriftDiagnosis,
    InconsistencyDiagnosis,
    InconclusiveDiagnosis,
    Severity,
    DominantSprayPhase,
    DiagnosisEvidence,
    MetricEvidenceQuality,
    SprayMetricQualityKey,
} from '@/types/engine';
import { asMilliseconds } from '@/types/branded';
import type { WeaponCategory } from '@/game/pubg/weapon-data';
import { getJitterThreshold } from '@/game/pubg/weapon-data';

export interface RunDiagnosticsOptions {
    readonly analysisDecision?: AnalysisDecision;
}

// ═══════════════════════════════════════════
// Severity Helpers
// ═══════════════════════════════════════════

function percentToSeverity(percent: number): Severity {
    if (percent < 10) return 1;
    if (percent < 20) return 2;
    if (percent < 35) return 3;
    if (percent < 50) return 4;
    return 5;
}

function scoreToSeverity(score: number): Severity {
    if (score >= 80) return 1;
    if (score >= 60) return 2;
    if (score >= 40) return 3;
    if (score >= 20) return 4;
    return 5;
}

function clampSeverity(value: number): Severity {
    return Math.max(1, Math.min(5, Math.round(value))) as Severity;
}

function angularErrorToSeverity(errorDegrees: number): Severity {
    if (errorDegrees < 0.35) return 1;
    if (errorDegrees < 0.75) return 2;
    if (errorDegrees < 1.5) return 3;
    if (errorDegrees < 2.5) return 4;
    return 5;
}

function getMetricEvidence(
    metrics: SprayMetrics,
    key: SprayMetricQualityKey
): MetricEvidenceQuality | undefined {
    return metrics.metricQuality?.[key];
}

function buildDiagnosisEvidence(
    metrics: SprayMetrics,
    key: SprayMetricQualityKey
): DiagnosisEvidence {
    const quality = getMetricEvidence(metrics, key);

    return {
        confidence: quality?.confidence ?? 1,
        coverage: quality?.coverage ?? 1,
        angularErrorDegrees: metrics.angularErrorDegrees,
        linearErrorCm: metrics.linearErrorCm,
        linearErrorSeverity: metrics.linearErrorSeverity,
    };
}

function evidenceAdjustedSeverity(
    baseSeverity: Severity,
    metrics: SprayMetrics,
    key: SprayMetricQualityKey
): Severity {
    const evidence = buildDiagnosisEvidence(metrics, key);
    const angularSeverity = angularErrorToSeverity(evidence.angularErrorDegrees);
    const linearSeverity = clampSeverity(evidence.linearErrorSeverity);
    const signalSeverity = Math.max(
        baseSeverity,
        Math.round((baseSeverity + angularSeverity + linearSeverity) / 3)
    );
    const confidencePenalty = evidence.confidence < 0.8 ? 1 : 0;

    return clampSeverity(signalSeverity - confidencePenalty);
}

function phaseFromShotIndex(shotIndex: number): DominantSprayPhase {
    if (shotIndex < 10) return 'burst';
    if (shotIndex < 20) return 'sustained';
    return 'fatigue';
}

function dominantPhaseFromResiduals(metrics: SprayMetrics): DominantSprayPhase | null {
    if (!metrics.shotResiduals || metrics.shotResiduals.length === 0) {
        return null;
    }

    const phaseTotals: Record<Exclude<DominantSprayPhase, 'overall'>, { sum: number; count: number }> = {
        burst: { sum: 0, count: 0 },
        sustained: { sum: 0, count: 0 },
        fatigue: { sum: 0, count: 0 },
    };

    for (const residual of metrics.shotResiduals) {
        const phase = phaseFromShotIndex(residual.shotIndex);
        if (phase === 'overall') continue;
        phaseTotals[phase].sum += residual.residualMagnitudeDegrees;
        phaseTotals[phase].count += 1;
    }

    const rankedPhases = Object.entries(phaseTotals)
        .map(([phase, total]) => ({
            phase: phase as Exclude<DominantSprayPhase, 'overall'>,
            averageResidual: total.count > 0 ? total.sum / total.count : 0,
        }))
        .sort((left, right) => right.averageResidual - left.averageResidual);

    const dominant = rankedPhases[0];
    return dominant && dominant.averageResidual > 0 ? dominant.phase : null;
}

function dominantPhaseFromVerticalControl(metrics: SprayMetrics): DominantSprayPhase {
    const phases = [
        { phase: 'burst' as const, value: metrics.burstVCI },
        { phase: 'sustained' as const, value: metrics.sustainedVCI },
        { phase: 'fatigue' as const, value: metrics.fatigueVCI },
    ];

    phases.sort((left, right) => Math.abs(right.value - 1) - Math.abs(left.value - 1));
    return phases[0]?.phase ?? 'overall';
}

function getDominantPhase(metrics: SprayMetrics): DominantSprayPhase {
    return dominantPhaseFromResiduals(metrics) ?? dominantPhaseFromVerticalControl(metrics);
}

function diagnoseInconclusive(metrics: SprayMetrics): InconclusiveDiagnosis | null {
    const evidenceQuality = getMetricEvidence(metrics, 'sprayScore')
        ?? getMetricEvidence(metrics, 'verticalControlIndex');
    if (!evidenceQuality) {
        return null;
    }

    if (evidenceQuality.coverage >= 0.5 && evidenceQuality.confidence >= 0.45) {
        return null;
    }

    const evidence = buildDiagnosisEvidence(metrics, 'sprayScore');

    return {
        type: 'inconclusive',
        severity: 1,
        evidenceQuality,
        confidence: evidence.confidence,
        evidence,
        description: `Evidencia fraca: coverage ${(evidenceQuality.coverage * 100).toFixed(0)}% e confidence ${(evidenceQuality.confidence * 100).toFixed(0)}%.`,
        cause: 'Poucos frames confiaveis ou muita oclusao impedem separar erro real de ruido do tracking.',
        remediation: 'Grave outro clip com a mira visivel durante todo o spray antes de ajustar sensibilidade.',
    };
}

function diagnoseDecisionLimited(
    metrics: SprayMetrics,
    decision: AnalysisDecision
): InconclusiveDiagnosis {
    const evidenceQuality = getMetricEvidence(metrics, 'sprayScore')
        ?? getMetricEvidence(metrics, 'verticalControlIndex')
        ?? {
            coverage: decision.confidence,
            confidence: decision.confidence,
            sampleSize: 0,
            framesTracked: 0,
            framesLost: 0,
            framesProcessed: 0,
        };
    const evidence = buildDiagnosisEvidence(metrics, 'sprayScore');

    return {
        type: 'inconclusive',
        severity: 1,
        evidenceQuality,
        confidence: Math.min(evidence.confidence, decision.confidence),
        evidence: {
            ...evidence,
            confidence: Math.min(evidence.confidence, decision.confidence),
        },
        description: `Leitura inconclusiva pelo decision ladder: ${decision.level}.`,
        cause: decision.blockerReasons.length > 0
            ? `Bloqueios de validade: ${decision.blockerReasons.join(', ')}.`
            : 'A permissao da leitura atual nao sustenta diagnostico acionavel.',
        remediation: decision.recommendedNextStep,
    };
}

function decisionForcesInconclusive(decision: AnalysisDecision | undefined): decision is AnalysisDecision {
    return decision?.level === 'blocked_invalid_clip'
        || decision?.level === 'inconclusive_recapture'
        || decision?.level === 'partial_safe_read';
}

// ═══════════════════════════════════════════
// Individual Diagnostics
// ═══════════════════════════════════════════

function diagnoseOverpull(metrics: SprayMetrics): OverpullDiagnosis | null {
    const vci = metrics.verticalControlIndex;
    if (vci <= 1.15) return null; // Dentro do aceitável

    const excess = Math.round((vci - 1) * 100);
    const dominantPhase = getDominantPhase(metrics);
    const evidence = buildDiagnosisEvidence(metrics, 'verticalControlIndex');
    return {
        type: 'overpull',
        severity: evidenceAdjustedSeverity(percentToSeverity(excess), metrics, 'verticalControlIndex'),
        verticalControlIndex: vci,
        excessPercent: excess,
        dominantPhase,
        confidence: evidence.confidence,
        evidence,
        description: `Voce esta puxando o mouse ${excess}% a mais do que o necessario para compensar o recoil. Fase dominante: ${dominantPhase}.`,
        cause: 'Sensibilidade muito baixa ou movimento brusco demais ao compensar. Possível excesso de força no pulldown.',
        remediation: `Reduza a força do pulldown. Considere aumentar a sens vertical em ${Math.min(excess, 15)}% ou usar o multiplicador vertical.`,
    };
}

function diagnoseUnderpull(metrics: SprayMetrics): UnderpullDiagnosis | null {
    const vci = metrics.verticalControlIndex;
    if (vci >= 0.85) return null;

    const deficit = Math.round((1 - vci) * 100);
    const dominantPhase = getDominantPhase(metrics);
    const evidence = buildDiagnosisEvidence(metrics, 'verticalControlIndex');
    return {
        type: 'underpull',
        severity: evidenceAdjustedSeverity(percentToSeverity(deficit), metrics, 'verticalControlIndex'),
        verticalControlIndex: vci,
        deficitPercent: deficit,
        dominantPhase,
        confidence: evidence.confidence,
        evidence,
        description: `Compensacao vertical ${deficit}% abaixo do ideal. O spray sobe mais do que deveria. Fase dominante: ${dominantPhase}.`,
        cause: 'Sensibilidade muito alta ou pulldown insuficiente. Pode indicar falta de espaço no mousepad ou hábito de spray curto.',
        remediation: `Aumente a força do pulldown ou reduza a sens em ${Math.min(deficit, 15)}%. Verifique se tem espaço suficiente no mousepad.`,
    };
}

function diagnoseLateCompensation(metrics: SprayMetrics): LateCompensationDiagnosis | null {
    const responseMs = Number(metrics.initialRecoilResponseMs);
    const idealMs = 120; // ~4 frames a 30fps
    if (responseMs <= idealMs * 1.5) return null;

    const convergedOnTarget = (
        Math.abs(metrics.verticalControlIndex - 1) <= 0.05 &&
        metrics.angularErrorDegrees <= 0.15 &&
        metrics.linearErrorCm <= 1
    );
    if (convergedOnTarget) {
        return null;
    }

    const delay = responseMs - idealMs;
    return {
        type: 'late_compensation',
        severity: delay > 200 ? 5 : delay > 150 ? 4 : delay > 100 ? 3 : delay > 50 ? 2 : 1,
        responseTimeMs: metrics.initialRecoilResponseMs,
        idealResponseMs: asMilliseconds(idealMs),
        description: `Sua reação ao recoil leva ${Math.round(responseMs)}ms. Ideal: ~${idealMs}ms.`,
        cause: 'Tempo de reação ao recuo inicial está alto. Pode indicar falta de antecipação ou hesitação no início do spray.',
        remediation: 'Pratique iniciar a compensação ANTES ou junto com o primeiro tiro. Antecipe o recoil com base no padrão da arma.',
    };
}

function diagnoseExcessiveJitter(
    metrics: SprayMetrics,
    category: WeaponCategory
): ExcessiveJitterDiagnosis | null {
    const threshold = getJitterThreshold(category);
    const noise = metrics.horizontalNoiseIndex;
    if (noise <= threshold) return null;

    const excessRatio = noise / threshold;
    return {
        type: 'excessive_jitter',
        severity: excessRatio > 3 ? 5 : excessRatio > 2.5 ? 4 : excessRatio > 2 ? 3 : excessRatio > 1.5 ? 2 : 1,
        horizontalNoise: noise,
        threshold,
        description: `Ruído horizontal de ${noise.toFixed(1)} (limite: ${threshold}). Seu spray está "tremendo".`,
        cause: 'Micro-ajustes excessivos, tensão na mão, ou grip instável. Mousepad com atrito irregular também pode causar.',
        remediation: 'Relaxe o grip durante o spray. Use movimentos suaves e contínuos. Considere um mousepad de controle se estiver em speed pad.',
    };
}

function diagnoseHorizontalDrift(metrics: SprayMetrics): HorizontalDriftDiagnosis | null {
    const { direction, magnitude } = metrics.driftDirectionBias;
    if (direction === 'neutral' || magnitude < 1.0) return null;

    return {
        type: 'horizontal_drift',
        severity: magnitude > 4 ? 5 : magnitude > 3 ? 4 : magnitude > 2 ? 3 : magnitude > 1.5 ? 2 : 1,
        bias: metrics.driftDirectionBias,
        description: `Tendência de desvio para a ${direction === 'left' ? 'esquerda' : 'direita'} (magnitude: ${magnitude.toFixed(1)}px/frame).`,
        cause: `Posicionamento assimétrico do braço ou ângulo do mousepad. Hábito de tracking que influencia o spray.`,
        remediation: `Centralize o mousepad em relação ao ombro. Pratique spray em linha reta sem alvo para calibrar.`,
    };
}

function diagnoseInconsistency(metrics: SprayMetrics): InconsistencyDiagnosis | null {
    const score = Number(metrics.consistencyScore);
    if (score >= 65) return null;

    return {
        type: 'inconsistency',
        severity: scoreToSeverity(score),
        consistencyScore: metrics.consistencyScore,
        description: `Consistência de ${score.toFixed(0)}/100. Seu spray varia muito entre disparos.`,
        cause: 'Falta de memória muscular, fadiga, ou mudança de ritmo durante o spray. Sens instável entre sessões.',
        remediation: 'Pratique o mesmo padrão de spray 100+ vezes sem mudar configurações. Use o Training Mode do PUBG com a mesma arma.',
    };
}

// ═══════════════════════════════════════════
// Main: Run All Diagnostics
// ═══════════════════════════════════════════

export function runDiagnostics(
    metrics: SprayMetrics,
    weaponCategory: WeaponCategory,
    options: RunDiagnosticsOptions = {}
): Diagnosis[] {
    const diagnoses: Diagnosis[] = [];

    if (decisionForcesInconclusive(options.analysisDecision)) {
        return [diagnoseInconclusive(metrics) ?? diagnoseDecisionLimited(metrics, options.analysisDecision)];
    }

    const inconclusive = diagnoseInconclusive(metrics);
    if (inconclusive) {
        return [inconclusive];
    }

    const overpull = diagnoseOverpull(metrics);
    if (overpull) diagnoses.push(overpull);

    const underpull = diagnoseUnderpull(metrics);
    if (underpull) diagnoses.push(underpull);

    const late = diagnoseLateCompensation(metrics);
    if (late) diagnoses.push(late);

    const jitter = diagnoseExcessiveJitter(metrics, weaponCategory);
    if (jitter) diagnoses.push(jitter);

    const drift = diagnoseHorizontalDrift(metrics);
    if (drift) diagnoses.push(drift);

    const inconsistency = diagnoseInconsistency(metrics);
    if (inconsistency) diagnoses.push(inconsistency);

    // Ordenar por severidade (maior primeiro)
    diagnoses.sort((a, b) => b.severity - a.severity);

    return diagnoses;
}
