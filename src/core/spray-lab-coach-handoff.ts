import type {
    CoachSignal,
    SprayLabBenchmarkSnapshot,
    SprayLabEvidenceLevel,
    SprayLabFidelityReasonCode,
    SprayLabFidelityTier,
    SprayLabIndexState,
    SprayLabSessionSnapshot,
    SprayLabSessionStatus,
    SprayLabValidationLink,
    SprayLabValidationStatus,
} from '@/types/engine';

export type SprayLabTechnicalProofState =
    | 'none'
    | 'pending'
    | 'confirmed_progress'
    | 'confirmed_regression'
    | 'inconclusive'
    | 'blocked';

export type SprayLabCoachNextActionKind =
    | 'continue_session'
    | 'close_result'
    | 'record_validation'
    | 'repair_capture'
    | 'start_next_lane'
    | 'audit_history';

export interface SprayLabTransferEvidenceInput {
    readonly situation: string;
    readonly result: string;
    readonly countsAsTechnicalValidation: false;
    readonly createdAt: Date | string;
}

export interface SprayLabCoachHandoff {
    readonly labSessionId: string;
    readonly protocolId: string;
    readonly laneId: string;
    readonly contextKey: string;
    readonly contextLabel: string;
    readonly status: SprayLabSessionStatus;
    readonly fidelityTier: SprayLabFidelityTier | null;
    readonly evidenceLevel: SprayLabEvidenceLevel;
    readonly validationStatus: SprayLabValidationStatus;
    readonly indexState: SprayLabIndexState | null;
    readonly provisionalScore: number | null;
    readonly validatedScore: number | null;
    readonly technicalProofState: SprayLabTechnicalProofState;
    readonly confidence: number;
    readonly executionEvidence: {
        readonly label: string;
        readonly countsAsTechnicalProof: false;
    };
    readonly compatibleClipProof: {
        readonly label: string;
        readonly countsAsTechnicalProof: boolean;
    };
    readonly practicalTransfer: {
        readonly count: number;
        readonly label: string;
        readonly countsAsTechnicalProof: false;
    };
    readonly blockerReasons: readonly string[];
    readonly repairReasonCodes: readonly SprayLabFidelityReasonCode[];
    readonly nextAction: {
        readonly kind: SprayLabCoachNextActionKind;
        readonly label: string;
        readonly href: string;
    };
    readonly coachSignals: readonly CoachSignal[];
    readonly summary: string;
}

export interface BuildSprayLabCoachHandoffInput {
    readonly session: SprayLabSessionSnapshot | null | undefined;
    readonly benchmark?: SprayLabBenchmarkSnapshot | null;
    readonly validationLink?: SprayLabValidationLink | null;
    readonly transfers?: readonly SprayLabTransferEvidenceInput[];
}

const TECHNICAL_VALIDATION_STATUSES = new Set<SprayLabValidationStatus>([
    'validacao_confirmada',
    'sinal_promissor',
    'sem_mudanca_clara',
    'regressao_validada',
]);

export function buildSprayLabCoachHandoff(
    input: BuildSprayLabCoachHandoffInput,
): SprayLabCoachHandoff | null {
    const session = input.session ?? null;

    if (!session) {
        return null;
    }

    const validationLink = input.validationLink ?? session.validationLink ?? null;
    const validationStatus = validationLink?.status ?? session.validationStatus;
    const fidelityTier = session.fidelity?.tier ?? input.benchmark?.fidelityTier ?? null;
    const evidenceLevel = session.index?.evidenceLevel
        ?? input.benchmark?.evidenceLevel
        ?? session.fidelity?.evidenceLevel
        ?? 'practice';
    const technicalProofState = resolveTechnicalProofState(validationStatus);
    const compatibleClipCountsAsProof = isTechnicalValidationStatus(validationStatus)
        && evidenceLevel === 'validated_benchmark'
        && fidelityTier !== 'practice_only'
        && fidelityTier !== 'invalid_for_benchmark';
    const blockerReasons = buildBlockerReasons(session, validationLink, input.benchmark ?? null);
    const transferCount = (input.transfers ?? []).filter((transfer) => (
        transfer.countsAsTechnicalValidation === false
    )).length;
    const confidence = calculateHandoffConfidence({
        evidenceLevel,
        fidelityTier,
        technicalProofState,
        compatibleClipCountsAsProof,
        blockerCount: blockerReasons.length,
    });

    const handoff: SprayLabCoachHandoff = {
        labSessionId: session.id,
        protocolId: session.protocolId,
        laneId: session.lane.id,
        contextKey: session.contextKey,
        contextLabel: formatContextLabel(session),
        status: session.status,
        fidelityTier,
        evidenceLevel,
        validationStatus,
        indexState: session.index?.state ?? input.benchmark?.index.state ?? null,
        provisionalScore: session.index?.provisionalScore ?? input.benchmark?.index.provisionalScore ?? null,
        validatedScore: compatibleClipCountsAsProof
            ? session.index?.validatedScore ?? input.benchmark?.index.validatedScore ?? null
            : null,
        technicalProofState,
        confidence,
        executionEvidence: {
            label: formatExecutionEvidence(evidenceLevel, fidelityTier),
            countsAsTechnicalProof: false,
        },
        compatibleClipProof: {
            label: formatCompatibleProof(validationStatus, compatibleClipCountsAsProof),
            countsAsTechnicalProof: compatibleClipCountsAsProof,
        },
        practicalTransfer: {
            count: transferCount,
            label: transferCount > 0
                ? `${transferCount} transferencia(s) pratica(s) registradas; nao contam como validacao tecnica.`
                : 'Sem transferencia pratica registrada.',
            countsAsTechnicalProof: false,
        },
        blockerReasons,
        repairReasonCodes: session.repairState?.reasonCodes ?? session.fidelity?.reasonCodes ?? [],
        nextAction: resolveNextAction(session, validationStatus, blockerReasons),
        coachSignals: [],
        summary: '',
    };

    const coachSignals = buildCoachSignals(handoff);

    return {
        ...handoff,
        coachSignals,
        summary: summarizeHandoff(handoff),
    };
}

function isTechnicalValidationStatus(status: SprayLabValidationStatus): boolean {
    return TECHNICAL_VALIDATION_STATUSES.has(status);
}

function resolveTechnicalProofState(status: SprayLabValidationStatus): SprayLabTechnicalProofState {
    switch (status) {
        case 'validacao_confirmada':
        case 'sinal_promissor':
        case 'sem_mudanca_clara':
            return 'confirmed_progress';
        case 'regressao_validada':
            return 'confirmed_regression';
        case 'pending':
            return 'pending';
        case 'nao_compativel':
            return 'blocked';
        case 'inconclusivo':
            return 'inconclusive';
        case 'not_requested':
            return 'none';
    }
}

function calculateHandoffConfidence(input: {
    readonly evidenceLevel: SprayLabEvidenceLevel;
    readonly fidelityTier: SprayLabFidelityTier | null;
    readonly technicalProofState: SprayLabTechnicalProofState;
    readonly compatibleClipCountsAsProof: boolean;
    readonly blockerCount: number;
}): number {
    const evidenceBase: Record<SprayLabEvidenceLevel, number> = {
        practice: 0.28,
        weak_execution: 0.38,
        provisional_benchmark: 0.56,
        validated_benchmark: 0.74,
    };
    const fidelityBoost: Record<SprayLabFidelityTier, number> = {
        strong: 0.1,
        usable: 0.04,
        practice_only: -0.08,
        invalid_for_benchmark: -0.16,
    };
    const technicalBoost = input.compatibleClipCountsAsProof ? 0.14 : 0;
    const conflictPenalty = input.technicalProofState === 'blocked' || input.technicalProofState === 'inconclusive'
        ? 0.12
        : 0;
    const blockerPenalty = Math.min(0.18, input.blockerCount * 0.04);
    const value = evidenceBase[input.evidenceLevel]
        + (input.fidelityTier ? fidelityBoost[input.fidelityTier] : 0)
        + technicalBoost
        - conflictPenalty
        - blockerPenalty;

    return roundUnit(value);
}

function buildBlockerReasons(
    session: SprayLabSessionSnapshot,
    validationLink: SprayLabValidationLink | null,
    benchmark: SprayLabBenchmarkSnapshot | null,
): readonly string[] {
    const reasons = [
        ...(session.fidelity?.reasonCodes.map(formatReasonCode) ?? []),
        ...(session.repairState ? [session.repairState.whatHappened] : []),
        ...(session.index?.blockerReasons.map(formatReasonCode) ?? []),
        ...(benchmark?.blockerReasons.map(formatReasonCode) ?? []),
        ...(validationLink?.blockers.map((blocker) => blocker.message) ?? []),
    ];

    return Array.from(new Set(reasons.filter((reason) => reason.trim().length > 0)));
}

function resolveNextAction(
    session: SprayLabSessionSnapshot,
    validationStatus: SprayLabValidationStatus,
    blockerReasons: readonly string[],
): SprayLabCoachHandoff['nextAction'] {
    if (session.status === 'draft' || session.status === 'active' || session.status === 'paused') {
        return {
            kind: 'continue_session',
            label: 'Continuar Spray Lab',
            href: `/spray-lab?labSessionId=${encodeURIComponent(session.id)}`,
        };
    }

    if (session.status === 'blocked' || session.repairState || blockerReasons.length > 0 && validationStatus !== 'validacao_confirmada') {
        return {
            kind: 'repair_capture',
            label: 'Reparar captura',
            href: session.baseAnalysisId
                ? `/spray-lab?sourceSessionId=${encodeURIComponent(session.baseAnalysisId)}`
                : `/spray-lab?labSessionId=${encodeURIComponent(session.id)}`,
        };
    }

    if (session.status === 'completed' && !session.index) {
        return {
            kind: 'close_result',
            label: 'Fechar resultado Lab',
            href: `/spray-lab?labSessionId=${encodeURIComponent(session.id)}`,
        };
    }

    if (validationStatus === 'not_requested' || validationStatus === 'pending') {
        return {
            kind: 'record_validation',
            label: 'Gravar validacao compativel',
            href: `/analyze?mode=validation&labSessionId=${encodeURIComponent(session.id)}&protocolId=${encodeURIComponent(session.protocolId)}`,
        };
    }

    if (validationStatus === 'validacao_confirmada' || validationStatus === 'sinal_promissor') {
        return {
            kind: 'start_next_lane',
            label: 'Iniciar proxima lane',
            href: session.baseAnalysisId
                ? `/spray-lab?sourceSessionId=${encodeURIComponent(session.baseAnalysisId)}&protocolId=${encodeURIComponent(session.protocolId)}`
                : '/spray-lab',
        };
    }

    return {
        kind: 'audit_history',
        label: 'Abrir auditoria Lab',
        href: session.baseAnalysisId
            ? `/history/${encodeURIComponent(session.baseAnalysisId)}#history-spray-lab-audit`
            : `/spray-lab?labSessionId=${encodeURIComponent(session.id)}`,
    };
}

function buildCoachSignals(handoff: SprayLabCoachHandoff): readonly CoachSignal[] {
    const signals: CoachSignal[] = [{
        source: 'history',
        area: handoff.nextAction.kind === 'repair_capture' ? 'capture_quality' : 'validation',
        key: `spray_lab.execution.${handoff.evidenceLevel}`,
        summary: `${handoff.executionEvidence.label} Contexto: ${handoff.contextLabel}.`,
        confidence: handoff.confidence,
        coverage: handoff.evidenceLevel === 'practice' ? 0.35 : 0.65,
        weight: handoff.evidenceLevel === 'validated_benchmark' ? 0.32 : 0.18,
    }];

    if (handoff.compatibleClipProof.countsAsTechnicalProof) {
        signals.push({
            source: 'history',
            area: 'validation',
            key: `spray_lab.technical.${handoff.technicalProofState}`,
            summary: `${handoff.compatibleClipProof.label} O coach pode usar como evidencia do contexto, sem alterar limiares globais.`,
            confidence: Math.max(0.82, handoff.confidence),
            coverage: 0.9,
            weight: 0.36,
        });
    } else if (handoff.technicalProofState !== 'none') {
        signals.push({
            source: 'history',
            area: handoff.technicalProofState === 'blocked' ? 'capture_quality' : 'validation',
            key: `spray_lab.technical.${handoff.technicalProofState}`,
            summary: handoff.compatibleClipProof.label,
            confidence: handoff.technicalProofState === 'blocked' ? 0.76 : 0.58,
            coverage: 0.45,
            weight: handoff.technicalProofState === 'blocked' ? 0.34 : 0.2,
        });
    }

    if (handoff.practicalTransfer.count > 0) {
        signals.push({
            source: 'history',
            area: 'validation',
            key: 'spray_lab.transfer.practical',
            summary: handoff.practicalTransfer.label,
            confidence: 0.46,
            coverage: 0.35,
            weight: 0.1,
        });
    }

    return signals;
}

function formatExecutionEvidence(
    evidenceLevel: SprayLabEvidenceLevel,
    fidelityTier: SprayLabFidelityTier | null,
): string {
    const fidelity = fidelityTier ? `fidelidade ${fidelityTier}` : 'fidelidade pendente';

    switch (evidenceLevel) {
        case 'practice':
            return `Sessao Lab conta como pratica (${fidelity}), nao prova tecnica.`;
        case 'weak_execution':
            return `Sessao Lab tem execucao fraca (${fidelity}); use para reparo e proxima tentativa.`;
        case 'provisional_benchmark':
            return `Sessao Lab gerou benchmark provisorio (${fidelity}); ainda precisa de clip compativel.`;
        case 'validated_benchmark':
            return `Sessao Lab tem benchmark validado no contexto (${fidelity}).`;
    }
}

function formatCompatibleProof(
    status: SprayLabValidationStatus,
    countsAsProof: boolean,
): string {
    if (countsAsProof) {
        return 'Clip compativel confirmou sinal tecnico para este contexto.';
    }

    switch (status) {
        case 'not_requested':
            return 'Sem clip compativel ainda; sessao Lab nao confirma melhora tecnica.';
        case 'pending':
            return 'Validacao compativel pendente; nao consolidar mudanca ainda.';
        case 'validacao_confirmada':
        case 'sinal_promissor':
        case 'sem_mudanca_clara':
        case 'regressao_validada':
            return 'Existe validacao, mas fidelidade/evidencia ainda bloqueia prova tecnica forte.';
        case 'nao_compativel':
            return 'Clip de validacao nao foi compativel; manter como pratica/reparo.';
        case 'inconclusivo':
            return 'Clip de validacao foi inconclusivo; repetir contexto controlado.';
    }
}

function formatContextLabel(session: SprayLabSessionSnapshot): string {
    const context = session.protocol.context;
    const weapon = context.weaponName ?? context.weaponId ?? 'arma';
    const optic = context.opticName ?? context.opticId ?? 'mira';
    const distance = typeof context.distanceMeters === 'number'
        ? `${Math.round(context.distanceMeters)}m`
        : 'distancia a confirmar';

    return `${weapon} / ${optic} / ${distance} / ${session.lane.shortLabel}`;
}

function formatReasonCode(code: SprayLabFidelityReasonCode): string {
    switch (code) {
        case 'fatigue_or_pain':
            return 'fadiga/dor rebaixou a sessao para seguranca';
        case 'variable_changed':
            return 'variavel mudou durante a sessao';
        case 'skipped_reps':
            return 'reps puladas reduziram fidelidade';
        case 'excessive_pause':
            return 'pausas excessivas reduziram fidelidade';
        case 'early_stop':
            return 'sessao encerrada cedo';
        case 'capture_blocker':
            return 'bloqueio de captura impede benchmark forte';
        case 'missing_context':
            return 'contexto insuficiente para benchmark';
        case 'user_confused':
            return 'usuario marcou confusao no protocolo';
    }
}

function summarizeHandoff(handoff: SprayLabCoachHandoff): string {
    return [
        handoff.executionEvidence.label,
        handoff.compatibleClipProof.label,
        handoff.practicalTransfer.label,
    ].join(' ');
}

function roundUnit(value: number): number {
    return Number(Math.max(0, Math.min(1, value)).toFixed(3));
}
