import type {
    PrecisionTrendLabel,
    SprayLabValidationStatus,
} from '../types/engine';
import type {
    TrainingProgramCheckpoint,
    TrainingProgramCheckpointOutcome,
    TrainingProgramCycleSnapshot,
    TrainingProgramEvidenceSummary,
    TrainingProgramReasonCode,
    TrainingProgramRecoveryAction,
    TrainingProgramState,
} from '../types/training-programs';

export interface BuildTrainingProgramCheckpointInput {
    readonly cycle: TrainingProgramCycleSnapshot;
    readonly weekNumber?: 1 | 2 | 3 | 4;
    readonly evidenceSummary?: TrainingProgramEvidenceSummary;
    readonly now: string;
}

interface EvidenceConvergence {
    readonly converged: boolean;
    readonly outcome: TrainingProgramCheckpointOutcome;
    readonly state: TrainingProgramState;
    readonly reasonCodes: readonly TrainingProgramReasonCode[];
    readonly canIncreaseDifficulty: boolean;
    readonly nextRecommendation: TrainingProgramRecoveryAction;
}

export function buildTrainingProgramWeeklyCheckpoint(
    input: BuildTrainingProgramCheckpointInput,
): TrainingProgramCheckpoint {
    const evidence = input.evidenceSummary ?? input.cycle.evidenceSummary;
    const convergence = resolveEvidenceConvergence(evidence);
    const weekNumber = input.weekNumber ?? input.cycle.currentWeekNumber;
    const week = input.cycle.weeks.find((current) => current.weekNumber === weekNumber);
    const rhythmClosed = Boolean(week);
    const outcome: TrainingProgramCheckpointOutcome = rhythmClosed
        ? convergence.outcome === 'progress_validated'
            ? 'stabilized'
            : convergence.outcome
        : 'repair_needed';
    const reasonCodes = mergeReasons(
        evidence.blockers,
        convergence.reasonCodes,
        week?.reasonCodes ?? [],
    );

    return {
        id: `${input.cycle.id}:checkpoint:weekly:${weekNumber}:${Date.parse(input.now) || 0}`,
        layer: 'weekly_operational',
        weekNumber,
        state: convergence.state,
        outcome,
        createdAt: input.now,
        evidenceSummary: evidence,
        reasonCodes,
        canIncreaseDifficulty: convergence.canIncreaseDifficulty,
        nextRecommendation: convergence.nextRecommendation,
        summary: buildWeeklySummary({
            weekNumber,
            outcome,
            canIncreaseDifficulty: convergence.canIncreaseDifficulty,
            reasonCodes,
        }),
    };
}

export function buildTrainingProgramTechnicalCheckpoint(
    input: BuildTrainingProgramCheckpointInput,
): TrainingProgramCheckpoint | null {
    const evidence = input.evidenceSummary ?? input.cycle.evidenceSummary;

    if (!hasCompatibleClipEvidence(evidence)) {
        return null;
    }

    const convergence = resolveEvidenceConvergence(evidence);
    const weekNumber = input.weekNumber ?? input.cycle.currentWeekNumber;

    return {
        id: `${input.cycle.id}:checkpoint:technical:${weekNumber}:${Date.parse(input.now) || 0}`,
        layer: 'technical_validated',
        weekNumber,
        state: convergence.state,
        outcome: convergence.outcome,
        createdAt: input.now,
        evidenceSummary: evidence,
        reasonCodes: convergence.reasonCodes,
        canIncreaseDifficulty: convergence.canIncreaseDifficulty,
        nextRecommendation: convergence.nextRecommendation,
        summary: buildTechnicalSummary(convergence.outcome, evidence),
    };
}

export function buildTrainingProgramMonthlyCheckpoint(
    input: Omit<BuildTrainingProgramCheckpointInput, 'weekNumber'>,
): TrainingProgramCheckpoint {
    const evidence = input.evidenceSummary ?? input.cycle.evidenceSummary;
    const convergence = resolveEvidenceConvergence(evidence);
    const weeklyCheckpoints = input.cycle.checkpoints.filter((checkpoint) => checkpoint.layer === 'weekly_operational');
    const technicalCheckpoints = input.cycle.checkpoints.filter((checkpoint) => checkpoint.layer === 'technical_validated');
    const hasRestart = input.cycle.state === 'linha_reiniciada'
        || input.cycle.reasonCodes.includes('line_restart')
        || input.cycle.archivedLines.length > 0;
    const blockers = mergeReasons(
        input.cycle.reasonCodes,
        evidence.blockers,
        convergence.reasonCodes,
    );
    const outcome: TrainingProgramCheckpointOutcome = hasRestart
        ? 'line_restarted'
        : convergence.outcome === 'progress_validated' && technicalCheckpoints.length > 0
            ? 'cycle_completed'
            : convergence.outcome;

    return {
        id: `${input.cycle.id}:checkpoint:monthly:${Date.parse(input.now) || 0}`,
        layer: 'monthly_program',
        state: hasRestart ? 'linha_reiniciada' : convergence.state,
        outcome,
        createdAt: input.now,
        evidenceSummary: evidence,
        reasonCodes: blockers,
        canIncreaseDifficulty: convergence.canIncreaseDifficulty && technicalCheckpoints.length > 0 && !hasRestart,
        nextRecommendation: hasRestart ? 'reiniciar_linha' : convergence.nextRecommendation,
        summary: buildMonthlySummary({
            cycle: input.cycle,
            weeklyCount: weeklyCheckpoints.length,
            technicalCount: technicalCheckpoints.length,
            outcome,
            blockers,
        }),
    };
}

function resolveEvidenceConvergence(evidence: TrainingProgramEvidenceSummary): EvidenceConvergence {
    const reasons = new Set<TrainingProgramReasonCode>(evidence.blockers);
    const validationStatus = evidence.validationStatus ?? evidence.validationLink?.status;
    const trendLabel = evidence.precisionTrend?.label;
    const hasConflict = evidence.coachOutcome?.conflict !== undefined
        || Boolean(evidence.coachDecision && evidence.coachDecision.conflicts.length > 0);
    const fidelityDropped = evidence.fidelityTier === 'practice_only'
        || evidence.fidelityTier === 'invalid_for_benchmark'
        || evidence.fidelityReasonCodes.length > 0;

    if (hasConflict) {
        reasons.add('outcome_conflict');
    }

    if (fidelityDropped) {
        reasons.add('fidelity_dropped');
    }

    if (validationStatus === 'inconclusivo') {
        reasons.add('validation_inconclusive');
    }

    if (validationStatus === 'nao_compativel') {
        reasons.add('variable_changed');
    }

    if (validationStatus === 'regressao_validada' || trendLabel === 'validated_regression') {
        return convergence({
            outcome: 'regression_validated',
            state: 'regressao_validada',
            reasonCodes: Array.from(reasons),
            canIncreaseDifficulty: false,
            nextRecommendation: 'consolidar',
        });
    }

    if (validationStatus === 'sem_mudanca_clara' || trendLabel === 'oscillation') {
        return convergence({
            outcome: 'no_clear_change',
            state: 'sem_mudanca_clara',
            reasonCodes: Array.from(reasons),
            canIncreaseDifficulty: false,
            nextRecommendation: 'consolidar',
        });
    }

    if (reasons.has('variable_changed') || validationStatus === 'nao_compativel') {
        return convergence({
            outcome: 'incompatible_context',
            state: 'linha_reiniciada',
            reasonCodes: Array.from(reasons),
            canIncreaseDifficulty: false,
            nextRecommendation: 'reiniciar_linha',
        });
    }

    if (reasons.size > 0 || validationStatus === 'inconclusivo') {
        return convergence({
            outcome: 'repair_needed',
            state: 'reparando',
            reasonCodes: Array.from(reasons),
            canIncreaseDifficulty: false,
            nextRecommendation: 'reparar',
        });
    }

    if (hasProgressValidation(validationStatus, trendLabel, evidence)) {
        return convergence({
            outcome: 'progress_validated',
            state: 'progresso_validado',
            reasonCodes: [],
            canIncreaseDifficulty: true,
            nextRecommendation: 'consolidar',
        });
    }

    if (validationStatus === 'pending') {
        return convergence({
            outcome: 'validation_pending',
            state: 'validacao_pendente',
            reasonCodes: ['compatible_proof_missing'],
            canIncreaseDifficulty: false,
            nextRecommendation: 'consolidar',
        });
    }

    return convergence({
        outcome: 'insufficient_evidence',
        state: 'consolidando',
        reasonCodes: ['compatible_proof_missing'],
        canIncreaseDifficulty: false,
        nextRecommendation: 'consolidar',
    });
}

function convergence(input: Omit<EvidenceConvergence, 'converged'>): EvidenceConvergence {
    return {
        ...input,
        converged: input.canIncreaseDifficulty,
    };
}

function hasCompatibleClipEvidence(evidence: TrainingProgramEvidenceSummary): boolean {
    const validation = evidence.validationLink;
    const status = evidence.validationStatus ?? validation?.status;

    return Boolean(
        validation
        && validation.confirmedVariables
        && validation.blockers.length === 0
        && isTechnicalValidationStatus(status),
    );
}

function isTechnicalValidationStatus(status: SprayLabValidationStatus | undefined): boolean {
    return status === 'validacao_confirmada'
        || status === 'sinal_promissor'
        || status === 'sem_mudanca_clara'
        || status === 'regressao_validada';
}

function hasProgressValidation(
    validationStatus: SprayLabValidationStatus | undefined,
    trendLabel: PrecisionTrendLabel | undefined,
    evidence: TrainingProgramEvidenceSummary,
): boolean {
    const handoffProof = evidence.sprayLabHandoff?.compatibleClipProof.countsAsTechnicalProof === true;

    return handoffProof
        || validationStatus === 'validacao_confirmada'
        || validationStatus === 'sinal_promissor'
        || trendLabel === 'validated_progress';
}

function buildWeeklySummary(input: {
    readonly weekNumber: number;
    readonly outcome: TrainingProgramCheckpointOutcome;
    readonly canIncreaseDifficulty: boolean;
    readonly reasonCodes: readonly TrainingProgramReasonCode[];
}): string {
    const rhythm = `Semana ${input.weekNumber} fechada pelo ritmo operacional.`;
    const escalation = input.canIncreaseDifficulty
        ? 'Evidencia converge para proxima dose com cautela.'
        : 'Dificuldade nao sobe sem convergencia tecnica.';
    const blockers = input.reasonCodes.length > 0
        ? ` Motivos: ${input.reasonCodes.join(', ')}.`
        : '';

    return `${rhythm} Resultado: ${input.outcome}. ${escalation}${blockers}`;
}

function buildTechnicalSummary(
    outcome: TrainingProgramCheckpointOutcome,
    evidence: TrainingProgramEvidenceSummary,
): string {
    const context = evidence.context
        ? `${evidence.context.weaponName ?? evidence.context.weaponId ?? 'arma'} ${evidence.context.opticName ?? evidence.context.opticId ?? 'mira'}`
        : 'contexto do ciclo';

    return `Checkpoint tecnico de ${context}: ${outcome}. Conta apenas para este contexto compativel.`;
}

function buildMonthlySummary(input: {
    readonly cycle: TrainingProgramCycleSnapshot;
    readonly weeklyCount: number;
    readonly technicalCount: number;
    readonly outcome: TrainingProgramCheckpointOutcome;
    readonly blockers: readonly TrainingProgramReasonCode[];
}): string {
    const line = input.cycle.activeLine
        ? `Linha ativa: ${input.cycle.activeLine.label}.`
        : 'Linha ativa ainda a confirmar.';
    const archived = input.cycle.archivedLines.length > 0
        ? ` ${input.cycle.archivedLines.length} linha(s) anterior(es) arquivada(s).`
        : '';
    const blockers = input.blockers.length > 0
        ? ` Blockers/reparos: ${input.blockers.join(', ')}.`
        : ' Sem blocker tecnico novo.';

    return [
        `Resumo mensal contextual do Ciclo Pro: ${input.outcome}.`,
        `${input.weeklyCount} checkpoint(s) operacional(is) e ${input.technicalCount} tecnico(s).`,
        line,
        archived,
        blockers,
        'E contextual; nao avalia o jogador inteiro e recomenda o proximo ciclo apenas neste contexto.',
    ].join(' ');
}

function mergeReasons(
    ...groups: readonly (readonly TrainingProgramReasonCode[])[]
): readonly TrainingProgramReasonCode[] {
    return Array.from(new Set(groups.flat()));
}
