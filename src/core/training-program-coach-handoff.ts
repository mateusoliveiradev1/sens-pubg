import type { CoachSignal, SprayLabValidationStatus } from '@/types/engine';
import type {
    TrainingProgramCheckpoint,
    TrainingProgramCycleSnapshot,
    TrainingProgramReasonCode,
    TrainingProgramRecoveryAction,
    TrainingProgramState,
} from '@/types/training-programs';
import { trainingProgramReasonCopy } from './training-programs';

export type TrainingProgramTechnicalProofState =
    | 'none'
    | 'pending'
    | 'validated_progress'
    | 'validated_regression'
    | 'no_clear_change'
    | 'inconclusive'
    | 'blocked';

export type TrainingProgramCoachAggressiveness =
    | 'support_continuity'
    | 'hold_validation'
    | 'reduce_dose'
    | 'recovery_or_baseline';

export type TrainingProgramCoachNextActionKind =
    | 'continue_cycle'
    | 'record_validation'
    | 'consolidate_context'
    | 'repair_program'
    | 'recover_baseline'
    | 'pause_for_safety'
    | 'audit_history';

export interface TrainingProgramCoachHandoff {
    readonly cycleId: string;
    readonly kind: TrainingProgramCycleSnapshot['kind'];
    readonly state: TrainingProgramState;
    readonly label: string;
    readonly strictContextKey: string;
    readonly strictContextLabel: string;
    readonly currentWeekNumber: 1 | 2 | 3 | 4;
    readonly recoveryAction: TrainingProgramRecoveryAction;
    readonly technicalProofState: TrainingProgramTechnicalProofState;
    readonly aggressiveness: TrainingProgramCoachAggressiveness;
    readonly confidence: number;
    readonly coverage: number;
    readonly executionEvidence: {
        readonly label: string;
        readonly countsAsTechnicalProof: false;
    };
    readonly compatibleValidation: {
        readonly label: string;
        readonly countsAsTechnicalProof: boolean;
    };
    readonly practicalTransfer: {
        readonly label: string;
        readonly countsAsTechnicalProof: false;
    };
    readonly blockerReasons: readonly string[];
    readonly reasonCodes: readonly TrainingProgramReasonCode[];
    readonly nextAction: {
        readonly kind: TrainingProgramCoachNextActionKind;
        readonly label: string;
        readonly href: string;
    };
    readonly coachSignals: readonly CoachSignal[];
    readonly summary: string;
    readonly llmFactsMutable: false;
}

export interface BuildTrainingProgramCoachHandoffInput {
    readonly cycle: TrainingProgramCycleSnapshot | null | undefined;
}

const TECHNICAL_VALIDATION_STATUSES = new Set<SprayLabValidationStatus>([
    'validacao_confirmada',
    'sinal_promissor',
    'sem_mudanca_clara',
    'regressao_validada',
]);

export function buildTrainingProgramCoachHandoff(
    input: BuildTrainingProgramCoachHandoffInput,
): TrainingProgramCoachHandoff | null {
    const cycle = input.cycle ?? null;

    if (!cycle) {
        return null;
    }

    const technicalCheckpoint = latestCheckpoint(cycle, 'technical_validated');
    const latestEvidence = technicalCheckpoint?.evidenceSummary
        ?? latestCheckpoint(cycle)?.evidenceSummary
        ?? cycle.evidenceSummary;
    const validationStatus = latestEvidence.validationStatus ?? latestEvidence.validationLink?.status;
    const compatibleValidationCountsAsProof = hasCompatibleValidationProof(validationStatus, latestEvidence);
    const technicalProofState = resolveTechnicalProofState({
        cycle,
        validationStatus,
        compatibleValidationCountsAsProof,
    });
    const reasonCodes = Array.from(new Set([
        ...cycle.reasonCodes,
        ...latestEvidence.blockers,
        ...(technicalCheckpoint?.reasonCodes ?? []),
    ]));
    const blockerReasons = buildBlockerReasons(reasonCodes, cycle, technicalProofState);
    const aggressiveness = resolveAggressiveness(cycle, technicalProofState, reasonCodes);
    const confidence = calculateConfidence({
        technicalProofState,
        compatibleValidationCountsAsProof,
        blockerCount: blockerReasons.length,
        evidenceConfidence: latestEvidence.confidence,
    });
    const coverage = calculateCoverage(latestEvidence.coverage, technicalProofState, blockerReasons.length);
    const handoff: TrainingProgramCoachHandoff = {
        cycleId: cycle.id,
        kind: cycle.kind,
        state: cycle.state,
        label: cycle.label,
        strictContextKey: cycle.strictContextKey,
        strictContextLabel: cycle.strictContextLabel,
        currentWeekNumber: cycle.currentWeekNumber,
        recoveryAction: cycle.recoveryAction,
        technicalProofState,
        aggressiveness,
        confidence,
        coverage,
        executionEvidence: {
            label: formatExecutionEvidence(cycle),
            countsAsTechnicalProof: false,
        },
        compatibleValidation: {
            label: formatCompatibleValidation(technicalProofState, compatibleValidationCountsAsProof),
            countsAsTechnicalProof: compatibleValidationCountsAsProof,
        },
        practicalTransfer: {
            label: formatPracticalTransfer(cycle),
            countsAsTechnicalProof: false,
        },
        blockerReasons,
        reasonCodes,
        nextAction: resolveNextAction(cycle, technicalProofState, reasonCodes),
        coachSignals: [],
        summary: '',
        llmFactsMutable: false,
    };
    const coachSignals = buildCoachSignals(handoff);

    return {
        ...handoff,
        coachSignals,
        summary: summarizeHandoff(handoff),
    };
}

function latestCheckpoint(
    cycle: TrainingProgramCycleSnapshot,
    layer?: TrainingProgramCheckpoint['layer'],
): TrainingProgramCheckpoint | null {
    return [...cycle.checkpoints]
        .filter((checkpoint) => layer === undefined || checkpoint.layer === layer)
        .sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt))[0]
        ?? null;
}

function hasCompatibleValidationProof(
    validationStatus: SprayLabValidationStatus | undefined,
    evidence: TrainingProgramCycleSnapshot['evidenceSummary'],
): boolean {
    const validation = evidence.validationLink;

    return Boolean(
        validation
        && validation.confirmedVariables
        && validation.blockers.length === 0
        && TECHNICAL_VALIDATION_STATUSES.has(validationStatus ?? validation.status),
    );
}

function resolveTechnicalProofState(input: {
    readonly cycle: TrainingProgramCycleSnapshot;
    readonly validationStatus: SprayLabValidationStatus | undefined;
    readonly compatibleValidationCountsAsProof: boolean;
}): TrainingProgramTechnicalProofState {
    const trendLabel = latestCheckpoint(input.cycle, 'technical_validated')?.evidenceSummary.precisionTrend?.label
        ?? input.cycle.evidenceSummary.precisionTrend?.label;

    if (
        input.cycle.reasonCodes.includes('variable_changed')
        || input.cycle.reasonCodes.includes('line_restart')
        || input.validationStatus === 'nao_compativel'
    ) {
        return 'blocked';
    }

    if (input.validationStatus === 'inconclusivo') {
        return 'inconclusive';
    }

    if (input.validationStatus === 'pending' || input.cycle.state === 'validacao_pendente') {
        return 'pending';
    }

    if (input.validationStatus === 'regressao_validada' || trendLabel === 'validated_regression') {
        return input.compatibleValidationCountsAsProof ? 'validated_regression' : 'blocked';
    }

    if (input.validationStatus === 'sem_mudanca_clara' || trendLabel === 'oscillation') {
        return input.compatibleValidationCountsAsProof ? 'no_clear_change' : 'pending';
    }

    if (input.compatibleValidationCountsAsProof && (input.validationStatus === 'validacao_confirmada' || input.validationStatus === 'sinal_promissor' || trendLabel === 'validated_progress')) {
        return 'validated_progress';
    }

    if (input.cycle.reasonCodes.includes('compatible_proof_missing')) {
        return 'pending';
    }

    return 'none';
}

function resolveAggressiveness(
    cycle: TrainingProgramCycleSnapshot,
    technicalProofState: TrainingProgramTechnicalProofState,
    reasonCodes: readonly TrainingProgramReasonCode[],
): TrainingProgramCoachAggressiveness {
    if (
        technicalProofState === 'validated_regression'
        || technicalProofState === 'blocked'
        || reasonCodes.includes('line_restart')
        || reasonCodes.includes('variable_changed')
        || reasonCodes.includes('outcome_conflict')
        || reasonCodes.includes('repeated_failure_consolidation')
    ) {
        return 'recovery_or_baseline';
    }

    if (
        reasonCodes.includes('discomfort_stop')
        || reasonCodes.includes('fatigue_reduced_dose')
        || cycle.state === 'pausado'
    ) {
        return 'reduce_dose';
    }

    if (
        technicalProofState === 'pending'
        || technicalProofState === 'inconclusive'
        || technicalProofState === 'no_clear_change'
        || cycle.state === 'consolidando'
        || cycle.state === 'reparando'
    ) {
        return 'hold_validation';
    }

    return 'support_continuity';
}

function calculateConfidence(input: {
    readonly technicalProofState: TrainingProgramTechnicalProofState;
    readonly compatibleValidationCountsAsProof: boolean;
    readonly blockerCount: number;
    readonly evidenceConfidence: number;
}): number {
    const proofBoost = input.compatibleValidationCountsAsProof ? 0.12 : 0;
    const statePenalty = input.technicalProofState === 'blocked' || input.technicalProofState === 'inconclusive'
        ? 0.14
        : input.technicalProofState === 'pending'
            ? 0.08
            : 0;
    const blockerPenalty = Math.min(0.18, input.blockerCount * 0.04);

    return roundUnit(input.evidenceConfidence + proofBoost - statePenalty - blockerPenalty);
}

function calculateCoverage(
    evidenceCoverage: number,
    technicalProofState: TrainingProgramTechnicalProofState,
    blockerCount: number,
): number {
    const statePenalty = technicalProofState === 'none' ? 0.18 : technicalProofState === 'pending' ? 0.1 : 0;
    const blockerPenalty = Math.min(0.16, blockerCount * 0.03);

    return roundUnit(evidenceCoverage - statePenalty - blockerPenalty);
}

function buildBlockerReasons(
    reasonCodes: readonly TrainingProgramReasonCode[],
    cycle: TrainingProgramCycleSnapshot,
    technicalProofState: TrainingProgramTechnicalProofState,
): readonly string[] {
    const reasons = reasonCodes.map(trainingProgramReasonCopy);

    if (technicalProofState === 'pending' && reasons.length === 0) {
        reasons.push('Falta clip compativel para confirmar progresso tecnico.');
    }

    if (cycle.state === 'concluido' && technicalProofState !== 'validated_progress') {
        reasons.push('Ciclo concluido sem prova tecnica nova; usar como execucao auditavel.');
    }

    return Array.from(new Set(reasons));
}

function resolveNextAction(
    cycle: TrainingProgramCycleSnapshot,
    technicalProofState: TrainingProgramTechnicalProofState,
    reasonCodes: readonly TrainingProgramReasonCode[],
): TrainingProgramCoachHandoff['nextAction'] {
    if (reasonCodes.includes('discomfort_stop')) {
        return {
            kind: 'pause_for_safety',
            label: 'Pausar por seguranca',
            href: `/ciclo-pro?cycleId=${encodeURIComponent(cycle.id)}`,
        };
    }

    if (technicalProofState === 'validated_regression' || reasonCodes.includes('line_restart')) {
        return {
            kind: 'recover_baseline',
            label: 'Voltar ao baseline confiavel',
            href: `/history?line=${encodeURIComponent(cycle.activeLine?.lineId ?? cycle.strictContextKey)}`,
        };
    }

    if (technicalProofState === 'blocked' || cycle.state === 'reparando') {
        return {
            kind: 'repair_program',
            label: 'Reparar contexto do ciclo',
            href: `/ciclo-pro?cycleId=${encodeURIComponent(cycle.id)}`,
        };
    }

    if (technicalProofState === 'pending' || technicalProofState === 'inconclusive') {
        return {
            kind: 'record_validation',
            label: 'Gravar validacao compativel',
            href: cycle.nextCta.target === 'analyze_validation'
                ? cycle.nextCta.href
                : '/analyze?mode=validation',
        };
    }

    if (technicalProofState === 'no_clear_change') {
        return {
            kind: 'consolidate_context',
            label: 'Consolidar antes de trocar variavel',
            href: `/ciclo-pro?cycleId=${encodeURIComponent(cycle.id)}`,
        };
    }

    return {
        kind: cycle.state === 'concluido' ? 'audit_history' : 'continue_cycle',
        label: cycle.state === 'concluido' ? 'Auditar ciclo concluido' : 'Continuar ciclo',
        href: `/ciclo-pro?cycleId=${encodeURIComponent(cycle.id)}`,
    };
}

function buildCoachSignals(handoff: TrainingProgramCoachHandoff): readonly CoachSignal[] {
    const signals: CoachSignal[] = [{
        source: 'history',
        area: handoff.reasonCodes.includes('weak_base_evidence') ? 'capture_quality' : 'validation',
        key: `training_program.execution.${handoff.state}`,
        summary: `${handoff.executionEvidence.label} Contexto: ${handoff.strictContextLabel}.`,
        confidence: handoff.confidence,
        coverage: handoff.coverage,
        weight: handoff.technicalProofState === 'none' ? 0.1 : 0.18,
    }];

    if (handoff.compatibleValidation.countsAsTechnicalProof && handoff.technicalProofState === 'validated_progress') {
        signals.push({
            source: 'history',
            area: 'validation',
            key: 'training_program.technical.validated_progress',
            summary: 'Checkpoint tecnico compativel apoia continuidade no mesmo contexto; consolidar antes de trocar variavel.',
            confidence: Math.max(0.84, handoff.confidence),
            coverage: Math.max(0.75, handoff.coverage),
            weight: 0.34,
        });
    } else if (handoff.technicalProofState === 'validated_regression') {
        signals.push({
            source: 'history',
            area: 'validation',
            key: 'training_program.technical.validated_regression',
            summary: 'Checkpoint tecnico validou regressao no contexto do ciclo; voltar para recuperacao ou baseline antes de avancar.',
            confidence: Math.max(0.86, handoff.confidence),
            coverage: Math.max(0.75, handoff.coverage),
            weight: 0.56,
        });
    } else if (handoff.technicalProofState === 'pending' || handoff.technicalProofState === 'inconclusive') {
        signals.push({
            source: 'history',
            area: 'validation',
            key: `training_program.technical.${handoff.technicalProofState}`,
            summary: handoff.compatibleValidation.label,
            confidence: handoff.technicalProofState === 'pending' ? 0.62 : 0.7,
            coverage: 0.48,
            weight: 0.26,
        });
    } else if (handoff.technicalProofState === 'blocked' || handoff.technicalProofState === 'no_clear_change') {
        signals.push({
            source: 'history',
            area: 'validation',
            key: `training_program.technical.${handoff.technicalProofState}`,
            summary: handoff.compatibleValidation.label,
            confidence: Math.max(0.72, handoff.confidence),
            coverage: Math.max(0.45, handoff.coverage),
            weight: handoff.technicalProofState === 'blocked' ? 0.48 : 0.3,
        });
    }

    if (handoff.reasonCodes.includes('discomfort_stop') || handoff.reasonCodes.includes('fatigue_reduced_dose')) {
        signals.push({
            source: 'history',
            area: 'validation',
            key: 'training_program.safety.reduce_dose',
            summary: 'Fadiga ou desconforto reduz dose por seguranca; isso nao conta como falha de habilidade.',
            confidence: 0.88,
            coverage: 0.7,
            weight: 0.5,
        });
    }

    if (handoff.reasonCodes.includes('confusion_simplified') || handoff.reasonCodes.includes('repeated_failure_consolidation')) {
        signals.push({
            source: 'history',
            area: 'validation',
            key: 'training_program.recovery.revised_hypothesis',
            summary: 'Confusao ou falha repetida pede protocolo mais simples ou hipotese revisada.',
            confidence: 0.82,
            coverage: 0.68,
            weight: 0.46,
        });
    }

    return signals;
}

function formatExecutionEvidence(cycle: TrainingProgramCycleSnapshot): string {
    const completedMissions = cycle.weeks
        .flatMap((week) => week.missions)
        .filter((mission) => mission.status === 'completed').length;

    return `${completedMissions} missao(oes) do programa registradas; execucao do ciclo nao e prova tecnica sozinha.`;
}

function formatCompatibleValidation(
    technicalProofState: TrainingProgramTechnicalProofState,
    countsAsProof: boolean,
): string {
    if (countsAsProof && technicalProofState === 'validated_progress') {
        return 'Clip compativel confirmou sinal tecnico neste contexto, sem garantir melhora futura.';
    }

    if (countsAsProof && technicalProofState === 'validated_regression') {
        return 'Clip compativel confirmou regressao neste contexto; recuperar antes de avancar.';
    }

    switch (technicalProofState) {
        case 'none':
            return 'Sem checkpoint tecnico; programa fica como historico de execucao.';
        case 'pending':
            return 'Validacao compativel pendente; nao tratar ciclo como progresso tecnico.';
        case 'no_clear_change':
            return 'Validacao compativel nao mostrou mudanca clara; consolidar contexto.';
        case 'inconclusive':
            return 'Validacao inconclusiva; repetir contexto controlado.';
        case 'blocked':
            return 'Contexto ou evidencia bloqueou prova tecnica; reparar antes de avancar.';
        case 'validated_progress':
            return 'Existe sinal de progresso, mas sem prova compativel forte para subir agressividade.';
        case 'validated_regression':
            return 'Existe sinal de regressao, mas a prova compativel ficou bloqueada.';
    }
}

function formatPracticalTransfer(cycle: TrainingProgramCycleSnapshot): string {
    const transferMissions = cycle.weeks
        .flatMap((week) => week.missions)
        .filter((mission) => mission.category === 'transfer' && mission.status === 'completed').length;

    return transferMissions > 0
        ? `${transferMissions} transferencia(s) pratica(s) registradas; nao contam como validacao tecnica.`
        : 'Sem transferencia pratica registrada; TDM ou partida nao substitui clip compativel.';
}

function summarizeHandoff(handoff: TrainingProgramCoachHandoff): string {
    return [
        handoff.executionEvidence.label,
        handoff.compatibleValidation.label,
        handoff.practicalTransfer.label,
    ].join(' ');
}

function roundUnit(value: number): number {
    if (!Number.isFinite(value)) {
        return 0;
    }

    return Number(Math.max(0, Math.min(1, value)).toFixed(3));
}
