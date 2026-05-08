import type {
    AnalysisResult,
    CompleteTrainingProtocol,
    TrainingProtocolContextSnapshot,
} from '../types/engine';
import type {
    TrainingProgramActiveLineReference,
    TrainingProgramCycleSnapshot,
    TrainingProgramEvidenceReference,
    TrainingProgramEvidenceSummary,
    TrainingProgramKind,
    TrainingProgramReasonCode,
    TrainingProgramRecoveryAction,
    TrainingProgramState,
} from '../types/training-programs';
import { buildTrainingProtocolContextSnapshot } from './training-protocol-drills';
import { buildSprayLabLaneContextKey } from './spray-lab-lanes';

export interface TrainingProgramEligibilityInput {
    readonly analysisResult?: AnalysisResult | null;
    readonly protocol?: CompleteTrainingProtocol | null;
    readonly activeLine?: TrainingProgramActiveLineReference | null;
    readonly archivedLines?: readonly TrainingProgramActiveLineReference[];
    readonly now: string;
}

export interface TrainingProgramEligibility {
    readonly kind: TrainingProgramKind;
    readonly state: TrainingProgramState;
    readonly eligibleForFullCycle: boolean;
    readonly contextKey: string;
    readonly contextLabel: string;
    readonly reasonCodes: readonly TrainingProgramReasonCode[];
    readonly userVisibleReasons: readonly string[];
    readonly lineRestartRequired: boolean;
}

export function resolveTrainingProgramEligibility(
    input: TrainingProgramEligibilityInput,
): TrainingProgramEligibility {
    const context = resolveTrainingProgramContext(input);
    const contextKey = resolveTrainingProgramContextKey(input);
    const reasons = new Set<TrainingProgramReasonCode>();

    if (!hasSavedAnalysis(input.analysisResult)) {
        reasons.add('missing_saved_analysis');
    }

    if (!context || hasMissingContext(context)) {
        reasons.add('missing_context');
    }

    if (!input.protocol && !input.activeLine) {
        reasons.add('missing_protocol');
    }

    for (const reason of resolveWeakBaseReasons(input.analysisResult, input.protocol)) {
        reasons.add(reason);
    }

    const lineRestartRequired = Boolean(
        input.activeLine
        && input.activeLine.contextKey !== contextKey
        && contextKey !== 'context:unknown',
    );

    if (lineRestartRequired) {
        reasons.add('line_restart');
    }

    const reasonCodes = Array.from(reasons);
    const repairReasons = reasonCodes.filter((reason) => reason !== 'line_restart');
    const eligibleForFullCycle = repairReasons.length === 0;
    const kind: TrainingProgramKind = eligibleForFullCycle ? 'ciclo_pro' : 'ciclo_reparo';
    const state: TrainingProgramState = lineRestartRequired
        ? 'linha_reiniciada'
        : eligibleForFullCycle
            ? 'ativo'
            : 'reparando';

    return {
        kind,
        state,
        eligibleForFullCycle,
        contextKey,
        contextLabel: formatContextLabel(context),
        reasonCodes,
        userVisibleReasons: reasonCodes.map(trainingProgramReasonCopy),
        lineRestartRequired,
    };
}

export function createTrainingProgramCycle(
    input: TrainingProgramEligibilityInput,
): TrainingProgramCycleSnapshot {
    const eligibility = resolveTrainingProgramEligibility(input);

    if (!eligibility.eligibleForFullCycle) {
        return createRepairProgramCycle(input);
    }

    const evidenceSummary = buildTrainingProgramEvidenceSummary(input, eligibility.reasonCodes);
    const activeLine = buildActiveLineReference(input, eligibility, evidenceSummary);
    const archivedLines = buildArchivedLines(input, eligibility);
    const cycleId = buildCycleId('ciclo-pro-v1', eligibility.contextKey, input.now);

    return {
        version: 'ciclo-pro-v1',
        id: cycleId,
        kind: 'ciclo_pro',
        state: eligibility.state,
        label: `Ciclo Pro ${eligibility.contextLabel}`,
        createdAt: input.now,
        updatedAt: input.now,
        ...(input.analysisResult?.historySessionId ? { baseAnalysisId: input.analysisResult.historySessionId } : {}),
        activeLine,
        archivedLines,
        strictContextKey: eligibility.contextKey,
        strictContextLabel: eligibility.contextLabel,
        evidenceSummary,
        weeks: [],
        checkpoints: [],
        transitionEvents: [],
        currentWeekNumber: 1,
        currentMissionId: null,
        reasonCodes: eligibility.reasonCodes,
        recoveryAction: eligibility.lineRestartRequired ? 'reiniciar_linha' : 'consolidar',
        nextCta: {
            label: 'Abrir Ciclo Pro',
            href: '/spray-lab',
            target: 'spray_lab',
        },
    };
}

export function createRepairProgramCycle(
    input: TrainingProgramEligibilityInput,
): TrainingProgramCycleSnapshot {
    const eligibility = resolveTrainingProgramEligibility(input);
    const reasons = eligibility.reasonCodes.length > 0
        ? eligibility.reasonCodes
        : ['weak_base_evidence'] as const;
    const evidenceSummary = buildTrainingProgramEvidenceSummary(input, reasons);
    const cycleId = buildCycleId('ciclo-reparo-v1', eligibility.contextKey, input.now);

    return {
        version: 'ciclo-pro-v1',
        id: cycleId,
        kind: 'ciclo_reparo',
        state: eligibility.lineRestartRequired ? 'linha_reiniciada' : 'reparando',
        label: `Ciclo de Reparo ${eligibility.contextLabel}`,
        createdAt: input.now,
        updatedAt: input.now,
        ...(input.analysisResult?.historySessionId ? { baseAnalysisId: input.analysisResult.historySessionId } : {}),
        activeLine: input.activeLine ?? null,
        archivedLines: buildArchivedLines(input, eligibility),
        strictContextKey: eligibility.contextKey,
        strictContextLabel: eligibility.contextLabel,
        evidenceSummary,
        weeks: [],
        checkpoints: [],
        transitionEvents: [],
        currentWeekNumber: 1,
        currentMissionId: null,
        reasonCodes: reasons,
        recoveryAction: eligibility.lineRestartRequired ? 'reiniciar_linha' : 'reparar',
        nextCta: {
            label: 'Reparar base do Ciclo',
            href: '/analyze?mode=validation',
            target: 'analyze_validation',
        },
    };
}

export function resolveTrainingProgramContextKey(
    input: Pick<TrainingProgramEligibilityInput, 'analysisResult' | 'protocol' | 'activeLine'>,
): string {
    const context = resolveTrainingProgramContext(input);

    if (context) {
        return `program:${buildSprayLabLaneContextKey(context)}`;
    }

    return input.activeLine?.contextKey ?? 'context:unknown';
}

export function trainingProgramReasonCopy(code: TrainingProgramReasonCode): string {
    switch (code) {
        case 'fidelity_dropped':
            return 'A fidelidade do Spray Lab caiu; o ciclo preserva isso como reparo.';
        case 'validation_inconclusive':
            return 'A validacao ficou inconclusiva; o ciclo pede nova prova compativel.';
        case 'variable_changed':
            return 'Uma variavel central mudou; a evidencia antiga nao sera misturada.';
        case 'outcome_conflict':
            return 'O resultado reportado conflita com a evidencia do clip.';
        case 'fatigue_reduced_dose':
            return 'Fadiga reduz a dose para preservar execucao e evidencia.';
        case 'discomfort_stop':
            return 'Desconforto encerra o bloco e nao conta como falha tecnica.';
        case 'stale_context':
            return 'O contexto ficou antigo; o ciclo pede leitura fresca antes de subir.';
        case 'compatible_proof_missing':
            return 'Falta clip compativel para confirmar progresso tecnico.';
        case 'blocker_repaired':
            return 'Um blocker foi reparado e a linha pode continuar com cautela.';
        case 'missed_day_reentry':
            return 'O ciclo foi reencaixado para preservar evidencia.';
        case 'line_restart':
            return 'Contexto estrutural mudou; a linha ativa foi reiniciada sem apagar a antiga.';
        case 'missing_saved_analysis':
            return 'Salve uma analise antes de abrir o Ciclo Pro completo.';
        case 'missing_context':
            return 'Complete arma, mira, distancia e variaveis antes do ciclo completo.';
        case 'missing_protocol':
            return 'Falta uma ficha de treino completa ou linha ativa para guiar o ciclo.';
        case 'weak_base_evidence':
            return 'A base ainda e fraca; o caminho honesto e Ciclo de Reparo.';
        case 'low_coverage':
            return 'Cobertura baixa bloqueia conclusao forte.';
        case 'low_confidence':
            return 'Confianca baixa bloqueia conclusao forte.';
        case 'confusion_simplified':
            return 'A missao foi simplificada para reduzir variaveis.';
        case 'repeated_failure_consolidation':
            return 'Falhas repetidas viram consolidacao, nao aumento de dificuldade.';
    }
}

function buildTrainingProgramEvidenceSummary(
    input: TrainingProgramEligibilityInput,
    blockers: readonly TrainingProgramReasonCode[],
): TrainingProgramEvidenceSummary {
    const context = resolveTrainingProgramContext(input);
    const protocol = input.protocol ?? undefined;
    const decision = input.analysisResult?.analysisDecision;
    const precisionTrend = input.analysisResult?.precisionTrend;
    const confidence = clampUnit(
        input.analysisResult?.mastery?.evidence.confidence
        ?? decision?.confidence
        ?? input.analysisResult?.sensitivity.confidenceScore
        ?? input.protocol?.audit.confidence
        ?? 0,
    );
    const coverage = clampUnit(
        input.analysisResult?.mastery?.evidence.coverage
        ?? input.protocol?.audit.coverage
        ?? 0,
    );
    const refs = buildEvidenceRefs(input, precisionTrend?.current?.resultId);

    return {
        ...(input.analysisResult?.historySessionId ? { savedAnalysisId: input.analysisResult.historySessionId } : {}),
        ...(decision?.level ? { analysisDecisionLevel: decision.level } : {}),
        ...(protocol ? { protocol } : {}),
        ...(protocol ? { protocolId: protocol.id } : {}),
        context,
        ...(precisionTrend ? { precisionTrend } : {}),
        confidence,
        coverage,
        fidelityReasonCodes: [],
        blockers,
        summary: buildEvidenceSummaryCopy(blockers, refs),
    };
}

function buildEvidenceRefs(
    input: TrainingProgramEligibilityInput,
    precisionResultId: string | undefined,
): readonly TrainingProgramEvidenceReference[] {
    const refs: TrainingProgramEvidenceReference[] = [];

    if (input.analysisResult?.historySessionId) {
        refs.push({
            kind: 'analysis',
            id: input.analysisResult.historySessionId,
            href: `/history/${input.analysisResult.historySessionId}`,
        });
    }

    if (input.protocol) {
        refs.push({
            kind: 'protocol',
            id: input.protocol.id,
        });
    }

    if (precisionResultId) {
        refs.push({
            kind: 'precision_trend',
            id: precisionResultId,
        });
    }

    return refs;
}

function buildEvidenceSummaryCopy(
    blockers: readonly TrainingProgramReasonCode[],
    refs: readonly TrainingProgramEvidenceReference[],
): string {
    if (blockers.length > 0) {
        return `Base com ${blockers.length} ajuste(s) pendente(s); o ciclo usa reparo antes de progresso.`;
    }

    return refs.length > 0
        ? 'Base salva com contexto e protocolo suficientes para iniciar Ciclo Pro.'
        : 'Base tecnica suficiente, mas sem referencias persistidas adicionais.';
}

function buildActiveLineReference(
    input: TrainingProgramEligibilityInput,
    eligibility: TrainingProgramEligibility,
    evidenceSummary: TrainingProgramEvidenceSummary,
): TrainingProgramActiveLineReference {
    if (input.activeLine && !eligibility.lineRestartRequired) {
        return {
            ...input.activeLine,
            active: true,
        };
    }

    return {
        lineId: eligibility.lineRestartRequired
            ? `line:${hashKey(eligibility.contextKey)}:${Date.parse(input.now) || 0}`
            : input.activeLine?.lineId ?? `line:${hashKey(eligibility.contextKey)}`,
        contextKey: eligibility.contextKey,
        label: eligibility.contextLabel,
        active: true,
        startedAt: input.now,
        restartReasonCodes: eligibility.lineRestartRequired ? ['line_restart'] : [],
        ...(evidenceSummary.precisionTrend ? { precisionTrend: evidenceSummary.precisionTrend } : {}),
    };
}

function buildArchivedLines(
    input: TrainingProgramEligibilityInput,
    eligibility: TrainingProgramEligibility,
): readonly TrainingProgramActiveLineReference[] {
    const archived = [...(input.archivedLines ?? [])];

    if (input.activeLine && eligibility.lineRestartRequired) {
        archived.push({
            ...input.activeLine,
            active: false,
            archivedAt: input.now,
            restartReasonCodes: Array.from(new Set([...input.activeLine.restartReasonCodes, 'line_restart'])),
        });
    }

    return archived;
}

function resolveTrainingProgramContext(
    input: Pick<TrainingProgramEligibilityInput, 'analysisResult' | 'protocol'>,
): TrainingProtocolContextSnapshot | null {
    if (input.protocol) {
        return input.protocol.context;
    }

    if (input.analysisResult) {
        return buildTrainingProtocolContextSnapshot({
            analysisResult: input.analysisResult,
            calibrationLimited: input.analysisResult.analysisDecision?.level === 'partial_safe_read',
        });
    }

    return null;
}

function hasSavedAnalysis(analysisResult: AnalysisResult | null | undefined): boolean {
    return Boolean(analysisResult?.historySessionId);
}

function hasMissingContext(context: TrainingProtocolContextSnapshot): boolean {
    return context.personalizationLimited
        || context.limitationReasons.length > 0
        || !context.weaponId && !context.weaponName
        || !context.opticId && !context.opticName
        || context.distanceMeters === undefined
        || context.distanceMode === 'unknown';
}

function resolveWeakBaseReasons(
    analysisResult: AnalysisResult | null | undefined,
    protocol: CompleteTrainingProtocol | null | undefined,
): readonly TrainingProgramReasonCode[] {
    const reasons = new Set<TrainingProgramReasonCode>();
    const decisionLevel = analysisResult?.analysisDecision?.level;
    const permission = analysisResult?.analysisDecision?.permissionMatrix;
    const blockerReasons = analysisResult?.analysisDecision?.blockerReasons ?? [];
    const coverage = analysisResult?.mastery?.evidence.coverage
        ?? protocol?.audit.coverage
        ?? analysisResult?.coaching[0]?.evidence.coverage
        ?? 0;
    const confidence = analysisResult?.mastery?.evidence.confidence
        ?? analysisResult?.analysisDecision?.confidence
        ?? protocol?.audit.confidence
        ?? analysisResult?.coaching[0]?.evidence.confidence
        ?? 0;

    if (
        decisionLevel === 'blocked_invalid_clip'
        || decisionLevel === 'inconclusive_recapture'
        || decisionLevel === 'partial_safe_read'
        || permission?.canDisplayCoach === false
    ) {
        reasons.add('weak_base_evidence');
    }

    if (coverage > 0 && coverage < 0.6) {
        reasons.add('low_coverage');
    }

    if (confidence > 0 && confidence < 0.6) {
        reasons.add('low_confidence');
    }

    if (blockerReasons.includes('low_coverage')) {
        reasons.add('low_coverage');
    }

    if (blockerReasons.includes('low_confidence')) {
        reasons.add('low_confidence');
    }

    if (protocol?.downgrade.reasons.includes('insufficient_compatible_validation')) {
        reasons.add('compatible_proof_missing');
    }

    return Array.from(reasons);
}

function formatContextLabel(context: TrainingProtocolContextSnapshot | null): string {
    if (!context) {
        return 'contexto a confirmar';
    }

    const weapon = context.weaponName ?? context.weaponId ?? 'arma';
    const optic = context.opticName ?? context.opticId ?? 'mira';
    const distance = context.distanceMeters === undefined
        ? 'distancia a confirmar'
        : `${Math.round(context.distanceMeters)}m`;

    return `${weapon} ${optic} ${distance}`;
}

function buildCycleId(prefix: string, contextKey: string, now: string): string {
    return [prefix, hashKey(contextKey), Date.parse(now) || 0].join(':');
}

function hashKey(value: string): string {
    let hash = 0;

    for (let index = 0; index < value.length; index += 1) {
        hash = ((hash << 5) - hash + value.charCodeAt(index)) | 0;
    }

    return Math.abs(hash).toString(36);
}

function clampUnit(value: number): number {
    if (!Number.isFinite(value)) {
        return 0;
    }

    return Number(Math.max(0, Math.min(1, value)).toFixed(3));
}

export function recoveryActionForState(state: TrainingProgramState): TrainingProgramRecoveryAction {
    switch (state) {
        case 'reparando':
        case 'inconclusivo':
        case 'contexto_desatualizado':
            return 'reparar';
        case 'consolidando':
        case 'sem_mudanca_clara':
            return 'consolidar';
        case 'linha_reiniciada':
            return 'reiniciar_linha';
        case 'pausado':
            return 'pausar_bloco';
        case 'preparando':
        case 'ativo':
        case 'validacao_pendente':
        case 'progresso_validado':
        case 'regressao_validada':
        case 'concluido':
            return 'reencaixar';
    }
}
