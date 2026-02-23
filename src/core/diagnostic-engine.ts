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
    SprayMetrics,
    Diagnosis,
    OverpullDiagnosis,
    UnderpullDiagnosis,
    LateCompensationDiagnosis,
    ExcessiveJitterDiagnosis,
    HorizontalDriftDiagnosis,
    InconsistencyDiagnosis,
    Severity,
} from '@/types/engine';
import { asMilliseconds, asScore } from '@/types/branded';
import type { WeaponCategory } from '@/game/pubg/weapon-data';
import { getJitterThreshold } from '@/game/pubg/weapon-data';

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

// ═══════════════════════════════════════════
// Individual Diagnostics
// ═══════════════════════════════════════════

function diagnoseOverpull(metrics: SprayMetrics): OverpullDiagnosis | null {
    const vci = metrics.verticalControlIndex;
    if (vci <= 1.15) return null; // Dentro do aceitável

    const excess = Math.round((vci - 1) * 100);
    return {
        type: 'overpull',
        severity: percentToSeverity(excess),
        verticalControlIndex: vci,
        excessPercent: excess,
        description: `Você está puxando o mouse ${excess}% a mais do que o necessário para compensar o recoil.`,
        cause: 'Sensibilidade muito baixa ou movimento brusco demais ao compensar. Possível excesso de força no pulldown.',
        remediation: `Reduza a força do pulldown. Considere aumentar a sens vertical em ${Math.min(excess, 15)}% ou usar o multiplicador vertical.`,
    };
}

function diagnoseUnderpull(metrics: SprayMetrics): UnderpullDiagnosis | null {
    const vci = metrics.verticalControlIndex;
    if (vci >= 0.85) return null;

    const deficit = Math.round((1 - vci) * 100);
    return {
        type: 'underpull',
        severity: percentToSeverity(deficit),
        verticalControlIndex: vci,
        deficitPercent: deficit,
        description: `Compensação vertical ${deficit}% abaixo do ideal. O spray sobe mais do que deveria.`,
        cause: 'Sensibilidade muito alta ou pulldown insuficiente. Pode indicar falta de espaço no mousepad ou hábito de spray curto.',
        remediation: `Aumente a força do pulldown ou reduza a sens em ${Math.min(deficit, 15)}%. Verifique se tem espaço suficiente no mousepad.`,
    };
}

function diagnoseLateCompensation(metrics: SprayMetrics): LateCompensationDiagnosis | null {
    const responseMs = Number(metrics.initialRecoilResponseMs);
    const idealMs = 120; // ~4 frames a 30fps
    if (responseMs <= idealMs * 1.5) return null;

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
    weaponCategory: WeaponCategory
): Diagnosis[] {
    const diagnoses: Diagnosis[] = [];

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
