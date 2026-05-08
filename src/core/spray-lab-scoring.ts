import type {
    PrecisionTrendSummary,
    SprayLabBenchmarkSnapshot,
    SprayLabEvidenceLevel,
    SprayLabFidelityReport,
    SprayLabIndexComponent,
    SprayLabIndexSnapshot,
    SprayLabIndexState,
    SprayLabSessionSnapshot,
    SprayLabValidationStatus,
} from '../types/engine';

export interface BuildSprayLabIndexSnapshotInput {
    readonly session: SprayLabSessionSnapshot;
    readonly fidelity: SprayLabFidelityReport;
    readonly validationStatus?: SprayLabValidationStatus;
    readonly precisionTrend?: PrecisionTrendSummary;
    readonly createdAt: string;
    readonly id?: string;
}

export interface BuildSprayLabBenchmarkSnapshotInput {
    readonly session: SprayLabSessionSnapshot;
    readonly index: SprayLabIndexSnapshot;
    readonly createdAt: string;
    readonly id?: string;
}

export function buildSprayLabIndexSnapshot(
    input: BuildSprayLabIndexSnapshotInput,
): SprayLabIndexSnapshot {
    const validationStatus = input.validationStatus ?? input.session.validationStatus;
    const evidenceLevel = resolveSprayLabEvidenceLevel(input.fidelity, validationStatus);
    const components = buildIndexComponents(input.session, input.fidelity, validationStatus);
    const provisionalScore = weightedScore(components.filter((component) => (
        component.key !== 'compatible_validation'
    )));
    const state = resolveIndexState({
        fidelity: input.fidelity,
        validationStatus,
        ...(input.precisionTrend ? { precisionTrend: input.precisionTrend } : {}),
    });
    const validatedScore = evidenceLevel === 'validated_benchmark'
        ? weightedScore(components)
        : undefined;

    return {
        version: 'spray-lab-v1',
        id: input.id ?? `${input.session.id}:index:${validationStatus}`,
        sessionId: input.session.id,
        protocolId: input.session.protocolId,
        laneId: input.session.lane.id,
        contextKey: input.session.contextKey,
        state,
        evidenceLevel,
        provisionalScore,
        ...(validatedScore !== undefined ? { validatedScore } : {}),
        components,
        fidelityTier: input.fidelity.tier,
        validationStatus,
        blockerReasons: input.fidelity.reasonCodes,
        ...(input.precisionTrend ? { precisionTrend: input.precisionTrend } : {}),
        createdAt: input.createdAt,
    };
}

export function buildSprayLabBenchmarkSnapshot(
    input: BuildSprayLabBenchmarkSnapshotInput,
): SprayLabBenchmarkSnapshot {
    return {
        version: 'spray-lab-v1',
        id: input.id ?? `${input.session.id}:benchmark:${input.index.validationStatus}`,
        sessionId: input.session.id,
        protocolId: input.session.protocolId,
        laneId: input.session.lane.id,
        contextKey: input.session.contextKey,
        index: input.index,
        fidelityTier: input.index.fidelityTier,
        evidenceLevel: input.index.evidenceLevel,
        validationStatus: input.index.validationStatus,
        eligibleForReleaseBenchmark: input.index.evidenceLevel === 'validated_benchmark'
            && input.index.blockerReasons.length === 0,
        blockerReasons: input.index.blockerReasons,
        createdAt: input.createdAt,
    };
}

export function resolveSprayLabEvidenceLevel(
    fidelity: SprayLabFidelityReport,
    validationStatus: SprayLabValidationStatus = 'not_requested',
): SprayLabEvidenceLevel {
    if (!fidelity.benchmarkEligible) {
        return 'practice';
    }

    if (isValidatedStatus(validationStatus)) {
        return 'validated_benchmark';
    }

    if (fidelity.tier === 'strong') {
        return 'provisional_benchmark';
    }

    return 'weak_execution';
}

function buildIndexComponents(
    session: SprayLabSessionSnapshot,
    fidelity: SprayLabFidelityReport,
    validationStatus: SprayLabValidationStatus,
): readonly SprayLabIndexComponent[] {
    return [
        {
            key: 'fidelity',
            label: 'Fidelidade da sessao',
            score: fidelity.score,
            weight: 0.4,
        },
        {
            key: 'drill_execution',
            label: 'Execucao do drill',
            score: completionScore(session.completedSprays, session.totalSprays),
            weight: 0.2,
        },
        {
            key: 'rep_consistency',
            label: 'Consistencia das reps',
            score: repConsistencyScore(session),
            weight: 0.15,
        },
        {
            key: 'compatible_validation',
            label: 'Validacao compativel',
            score: validationScore(validationStatus),
            weight: 0.25,
        },
    ];
}

function resolveIndexState(input: {
    readonly fidelity: SprayLabFidelityReport;
    readonly validationStatus: SprayLabValidationStatus;
    readonly precisionTrend?: PrecisionTrendSummary;
}): SprayLabIndexState {
    if (!input.fidelity.benchmarkEligible) {
        return 'bloqueado_por_fidelidade';
    }

    switch (input.validationStatus) {
        case 'not_requested':
            return 'baseline';
        case 'pending':
            return 'em_validacao';
        case 'sinal_promissor':
            return 'sinal_promissor';
        case 'validacao_confirmada':
            return input.precisionTrend?.label === 'validated_regression'
                ? 'regressao_validada'
                : 'progresso_validado';
        case 'regressao_validada':
            return 'regressao_validada';
        case 'sem_mudanca_clara':
        case 'nao_compativel':
        case 'inconclusivo':
            return 'inconclusivo';
    }
}

function isValidatedStatus(status: SprayLabValidationStatus): boolean {
    return status === 'validacao_confirmada'
        || status === 'sinal_promissor'
        || status === 'sem_mudanca_clara'
        || status === 'regressao_validada';
}

function completionScore(completed: number, total: number): number {
    if (total <= 0) {
        return 0;
    }

    return clampScore((completed / total) * 100);
}

function repConsistencyScore(session: SprayLabSessionSnapshot): number {
    const completion = completionScore(session.completedReps, session.totalReps);
    const interventionPenalty = session.manualInterventionCount * 12;
    const problemPenalty = session.problemReasonCodes.length * 10;

    return clampScore(completion - interventionPenalty - problemPenalty);
}

function validationScore(status: SprayLabValidationStatus): number {
    switch (status) {
        case 'validacao_confirmada':
            return 100;
        case 'sinal_promissor':
            return 78;
        case 'sem_mudanca_clara':
            return 58;
        case 'regressao_validada':
            return 45;
        case 'pending':
            return 45;
        case 'inconclusivo':
        case 'nao_compativel':
            return 20;
        case 'not_requested':
            return 0;
    }
}

function weightedScore(components: readonly SprayLabIndexComponent[]): number {
    const totalWeight = components.reduce((sum, component) => sum + component.weight, 0);

    if (totalWeight <= 0) {
        return 0;
    }

    const total = components.reduce((sum, component) => (
        sum + component.score * component.weight
    ), 0);

    return clampScore(total / totalWeight);
}

function clampScore(value: number): number {
    return Math.max(0, Math.min(100, Math.round(value)));
}
