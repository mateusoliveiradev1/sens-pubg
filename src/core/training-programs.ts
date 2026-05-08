import type {
    AnalysisResult,
    CompleteTrainingProtocol,
    TrainingProtocolContextSnapshot,
} from '../types/engine';
import type {
    TrainingProgramActiveLineReference,
    TrainingProgramAdaptiveWeek,
    TrainingProgramCheckpoint,
    TrainingProgramCycleSnapshot,
    TrainingProgramEvidenceReference,
    TrainingProgramEvidenceSummary,
    TrainingProgramKind,
    TrainingProgramMission,
    TrainingProgramMissionCategory,
    TrainingProgramMissionSlot,
    TrainingProgramReasonCode,
    TrainingProgramRecoveryAction,
    TrainingProgramState,
    TrainingProgramTransitionEvent,
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

export interface ResolveTrainingProgramRecoveryStateInput {
    readonly cycle: TrainingProgramCycleSnapshot;
    readonly event?: TrainingProgramTransitionEvent;
    readonly evidenceSummary?: TrainingProgramEvidenceSummary;
    readonly repeatedFailureCount?: number;
    readonly missedDays?: number;
    readonly staleContext?: boolean;
}

export interface TrainingProgramRecoveryStateDecision {
    readonly state: TrainingProgramState;
    readonly recoveryAction: TrainingProgramRecoveryAction;
    readonly reasonCodes: readonly TrainingProgramReasonCode[];
    readonly canIncreaseDifficulty: boolean;
    readonly doseMultiplier: number;
    readonly userVisibleReason: string;
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
    const weeks = buildFullProgramWeeks({
        cycleId,
        contextLabel: eligibility.contextLabel,
        state: eligibility.state,
        evidenceSummary,
    });
    const currentMissionId = weeks[0]?.missions[0]?.id ?? null;

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
        weeks,
        checkpoints: [],
        transitionEvents: [],
        currentWeekNumber: 1,
        currentMissionId,
        reasonCodes: eligibility.reasonCodes,
        recoveryAction: eligibility.lineRestartRequired ? 'reiniciar_linha' : 'consolidar',
        nextCta: {
            label: 'Abrir Ciclo Pro',
            href: currentMissionId ? `/spray-lab?programMissionId=${encodeURIComponent(currentMissionId)}` : '/spray-lab',
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
    const weeks = buildRepairProgramWeeks({
        cycleId,
        contextLabel: eligibility.contextLabel,
        evidenceSummary,
        reasonCodes: reasons,
    });
    const currentMissionId = weeks[0]?.missions[0]?.id ?? null;

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
        weeks,
        checkpoints: [],
        transitionEvents: [],
        currentWeekNumber: 1,
        currentMissionId,
        reasonCodes: reasons,
        recoveryAction: eligibility.lineRestartRequired ? 'reiniciar_linha' : 'reparar',
        nextCta: {
            label: 'Reparar base do Ciclo',
            href: currentMissionId ? `/analyze?mode=validation&programMissionId=${encodeURIComponent(currentMissionId)}` : '/analyze?mode=validation',
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

export function resolveTrainingProgramRecoveryState(
    input: ResolveTrainingProgramRecoveryStateInput,
): TrainingProgramRecoveryStateDecision {
    const reasons = new Set<TrainingProgramReasonCode>([
        ...input.cycle.reasonCodes,
        ...(input.evidenceSummary?.blockers ?? []),
        ...(input.event?.reasonCodes ?? []),
    ]);
    const eventType = input.event?.type;

    if (eventType === 'discomfort_reported' || reasons.has('discomfort_stop')) {
        reasons.add('discomfort_stop');

        return recoveryDecision({
            state: 'pausado',
            recoveryAction: 'pausar_bloco',
            reasonCodes: Array.from(reasons),
            canIncreaseDifficulty: false,
            doseMultiplier: 0,
            userVisibleReason: trainingProgramReasonCopy('discomfort_stop'),
        });
    }

    if (eventType === 'fatigue_reported' || reasons.has('fatigue_reduced_dose')) {
        reasons.add('fatigue_reduced_dose');

        return recoveryDecision({
            state: 'reparando',
            recoveryAction: 'reparar',
            reasonCodes: Array.from(reasons),
            canIncreaseDifficulty: false,
            doseMultiplier: 0.5,
            userVisibleReason: trainingProgramReasonCopy('fatigue_reduced_dose'),
        });
    }

    if (eventType === 'confusion_reported' || reasons.has('confusion_simplified')) {
        reasons.add('confusion_simplified');

        return recoveryDecision({
            state: 'reparando',
            recoveryAction: 'reparar',
            reasonCodes: Array.from(reasons),
            canIncreaseDifficulty: false,
            doseMultiplier: 0.65,
            userVisibleReason: trainingProgramReasonCopy('confusion_simplified'),
        });
    }

    if (eventType === 'variable_changed' || reasons.has('variable_changed') || reasons.has('line_restart')) {
        reasons.add('line_restart');

        return recoveryDecision({
            state: 'linha_reiniciada',
            recoveryAction: 'reiniciar_linha',
            reasonCodes: Array.from(reasons),
            canIncreaseDifficulty: false,
            doseMultiplier: 1,
            userVisibleReason: trainingProgramReasonCopy('line_restart'),
        });
    }

    if (
        eventType === 'context_marked_stale'
        || input.staleContext === true
        || input.missedDays !== undefined && input.missedDays >= 7
    ) {
        reasons.add('stale_context');

        return recoveryDecision({
            state: 'contexto_desatualizado',
            recoveryAction: 'reparar',
            reasonCodes: Array.from(reasons),
            canIncreaseDifficulty: false,
            doseMultiplier: 0.75,
            userVisibleReason: trainingProgramReasonCopy('stale_context'),
        });
    }

    if (eventType === 'missed_day_reentered' || input.missedDays !== undefined && input.missedDays > 0) {
        reasons.add('missed_day_reentry');

        return recoveryDecision({
            state: input.cycle.state === 'preparando' ? 'preparando' : 'ativo',
            recoveryAction: 'reencaixar',
            reasonCodes: Array.from(reasons),
            canIncreaseDifficulty: false,
            doseMultiplier: 1,
            userVisibleReason: trainingProgramReasonCopy('missed_day_reentry'),
        });
    }

    if (
        input.repeatedFailureCount !== undefined && input.repeatedFailureCount >= 2
        || reasons.has('repeated_failure_consolidation')
    ) {
        reasons.add('repeated_failure_consolidation');

        return recoveryDecision({
            state: 'consolidando',
            recoveryAction: 'consolidar',
            reasonCodes: Array.from(reasons),
            canIncreaseDifficulty: false,
            doseMultiplier: 0.85,
            userVisibleReason: trainingProgramReasonCopy('repeated_failure_consolidation'),
        });
    }

    if (reasons.size > 0) {
        return recoveryDecision({
            state: input.cycle.state === 'linha_reiniciada' ? 'linha_reiniciada' : 'reparando',
            recoveryAction: input.cycle.state === 'linha_reiniciada' ? 'reiniciar_linha' : 'reparar',
            reasonCodes: Array.from(reasons),
            canIncreaseDifficulty: false,
            doseMultiplier: 0.8,
            userVisibleReason: trainingProgramReasonCopy(Array.from(reasons)[0] ?? 'weak_base_evidence'),
        });
    }

    return recoveryDecision({
        state: input.cycle.state,
        recoveryAction: recoveryActionForState(input.cycle.state),
        reasonCodes: [],
        canIncreaseDifficulty: input.cycle.state === 'progresso_validado',
        doseMultiplier: 1,
        userVisibleReason: 'Sem mudanca automatica: manter contexto e proxima validacao.',
    });
}

export function reduceTrainingProgramEvent(
    cycle: TrainingProgramCycleSnapshot,
    event: TrainingProgramTransitionEvent,
): TrainingProgramCycleSnapshot {
    if (event.cycleId !== cycle.id) {
        throw new Error(`Training program event ${event.id} does not belong to cycle ${cycle.id}`);
    }

    if (cycle.transitionEvents.some((current) => current.id === event.id)) {
        return cycle;
    }

    const mission = event.missionId
        ? cycle.weeks.flatMap((week) => week.missions).find((current) => current.id === event.missionId)
        : undefined;
    const eventState = event.type === 'mission_completed' && mission
        ? mission.stateAfterCompletion
        : event.toState;
    const decision = resolveTrainingProgramRecoveryState({
        cycle: {
            ...cycle,
            state: eventState,
        },
        event,
    });
    const toState = decision.reasonCodes.length > 0 && event.type !== 'mission_completed'
        ? decision.state
        : eventState;
    const reasonCodes = mergeProgramReasons(cycle.reasonCodes, event.reasonCodes, decision.reasonCodes);
    const weeks = updateMissionState(cycle.weeks, event);
    const currentMissionId = resolveNextMissionId(cycle.currentMissionId, weeks, event);
    const recordedEvent: TrainingProgramTransitionEvent = {
        ...event,
        fromState: cycle.state,
        toState,
        reasonCodes: event.reasonCodes.length > 0 ? event.reasonCodes : decision.reasonCodes,
        userVisibleReason: event.userVisibleReason || decision.userVisibleReason,
    };

    return {
        ...cycle,
        state: toState,
        updatedAt: event.occurredAt,
        weeks,
        checkpoints: attachCheckpointId(cycle.checkpoints, event.checkpointId),
        transitionEvents: [...cycle.transitionEvents, recordedEvent],
        currentMissionId,
        reasonCodes,
        recoveryAction: decision.recoveryAction,
    };
}

function recoveryDecision(input: TrainingProgramRecoveryStateDecision): TrainingProgramRecoveryStateDecision {
    return input;
}

function updateMissionState(
    weeks: readonly TrainingProgramAdaptiveWeek[],
    event: TrainingProgramTransitionEvent,
): readonly TrainingProgramAdaptiveWeek[] {
    if (!event.missionId || event.type !== 'mission_started' && event.type !== 'mission_completed') {
        return weeks;
    }

    return weeks.map((week) => ({
        ...week,
        missions: week.missions.map((mission) => {
            if (mission.id !== event.missionId) {
                return mission;
            }

            return {
                ...mission,
                status: event.type === 'mission_completed' ? 'completed' : 'active',
            };
        }),
    }));
}

function resolveNextMissionId(
    currentMissionId: string | null,
    weeks: readonly TrainingProgramAdaptiveWeek[],
    event: TrainingProgramTransitionEvent,
): string | null {
    if (event.type !== 'mission_completed' || !event.missionId) {
        return currentMissionId;
    }

    const missions = weeks.flatMap((week) => week.missions);
    const currentIndex = missions.findIndex((mission) => mission.id === event.missionId);

    if (currentIndex < 0) {
        return currentMissionId;
    }

    return missions.slice(currentIndex + 1).find((mission) => mission.status !== 'completed')?.id ?? null;
}

function attachCheckpointId(
    checkpoints: readonly TrainingProgramCheckpoint[],
    _checkpointId: string | undefined,
): readonly TrainingProgramCheckpoint[] {
    return checkpoints;
}

function mergeProgramReasons(
    ...groups: readonly (readonly TrainingProgramReasonCode[])[]
): readonly TrainingProgramReasonCode[] {
    return Array.from(new Set(groups.flat()));
}

function buildFullProgramWeeks(input: {
    readonly cycleId: string;
    readonly contextLabel: string;
    readonly state: TrainingProgramState;
    readonly evidenceSummary: TrainingProgramEvidenceSummary;
}): readonly TrainingProgramAdaptiveWeek[] {
    return ([1, 2, 3, 4] as const).map((weekNumber) => {
        const missions = buildFullWeekMissions({
            cycleId: input.cycleId,
            weekNumber,
            contextLabel: input.contextLabel,
            evidenceSummary: input.evidenceSummary,
            futureWeek: weekNumber > 1,
        });

        return {
            id: `${input.cycleId}:week:${weekNumber}`,
            weekNumber,
            label: `Semana ${weekNumber} de 4`,
            state: weekNumber === 1 ? input.state : 'preparando',
            missions,
            checkpointIds: [],
            reasonCodes: weekNumber === 1 ? input.evidenceSummary.blockers : [],
            canIncreaseDifficulty: false,
        };
    });
}

function buildRepairProgramWeeks(input: {
    readonly cycleId: string;
    readonly contextLabel: string;
    readonly evidenceSummary: TrainingProgramEvidenceSummary;
    readonly reasonCodes: readonly TrainingProgramReasonCode[];
}): readonly TrainingProgramAdaptiveWeek[] {
    const missions = buildRepairMissions({
        cycleId: input.cycleId,
        contextLabel: input.contextLabel,
        evidenceSummary: input.evidenceSummary,
        reasonCodes: input.reasonCodes,
    });

    return [{
        id: `${input.cycleId}:week:repair`,
        weekNumber: 1,
        label: 'Ciclo de Reparo',
        state: 'reparando',
        missions,
        checkpointIds: [],
        reasonCodes: input.reasonCodes,
        canIncreaseDifficulty: false,
        recoveryAction: 'reparar',
    }];
}

function buildFullWeekMissions(input: {
    readonly cycleId: string;
    readonly weekNumber: 1 | 2 | 3 | 4;
    readonly contextLabel: string;
    readonly evidenceSummary: TrainingProgramEvidenceSummary;
    readonly futureWeek: boolean;
}): readonly TrainingProgramMission[] {
    const { cycleId, weekNumber, contextLabel, evidenceSummary, futureWeek } = input;
    const base = {
        cycleId,
        weekNumber,
        contextLabel,
        evidenceSummary,
        status: futureWeek ? 'locked' as const : 'available' as const,
    };

    return [
        mission({
            ...base,
            slot: 'main_1',
            category: 'preparation',
            title: `Abrir Semana ${weekNumber} da linha ativa`,
            stateAfterCompletion: 'ativo',
            agora: `Fixe ${contextLabel}, dose e variavel principal antes de executar.`,
            porQueImporta: 'A semana so compara evidencia quando o contexto fica repetivel.',
            oQueInvalida: 'Trocar arma, mira, distancia, sensibilidade, DPI, VSM, FOV, postura ou loadout.',
            evidenciaGerada: 'Contexto semanal confirmado para guiar Spray Lab e validacao.',
            ctaLabel: 'Continuar no Spray Lab',
            ctaTarget: 'spray_lab',
        }),
        mission({
            ...base,
            slot: 'main_2',
            category: 'execution',
            title: `Executar Spray Lab ${contextLabel}`,
            stateAfterCompletion: 'validacao_pendente',
            agora: 'Execute a lane vinculada a ficha completa, com reps e pausas planejadas.',
            porQueImporta: 'Spray Lab gera evidencia de execucao, nao substitui clip compativel.',
            oQueInvalida: 'Pular reps, pausar demais, mudar variavel ou encerrar por captura fraca.',
            evidenciaGerada: 'Fidelidade de execucao, blockers e proxima acao do coach.',
            ctaLabel: 'Executar Spray Lab',
            ctaTarget: 'spray_lab',
        }),
        mission({
            ...base,
            slot: 'main_3',
            category: 'repair',
            title: 'Ajustar ou repetir sem misturar variavel',
            stateAfterCompletion: 'consolidando',
            agora: 'Use o resultado do Lab para repetir, reduzir dose ou reparar o blocker dominante.',
            porQueImporta: 'Consolidacao evita subir dificuldade quando a evidencia ainda nao converge.',
            oQueInvalida: 'Tratar pratica fraca como progresso tecnico ou trocar mais de uma variavel.',
            evidenciaGerada: 'Razao de consolidacao, reparo aplicado e variavel preservada.',
            ctaLabel: 'Repetir bloco no Spray Lab',
            ctaTarget: 'spray_lab',
        }),
        mission({
            ...base,
            slot: 'main_4',
            category: 'validation',
            title: 'Gravar validacao compativel',
            stateAfterCompletion: 'validacao_pendente',
            agora: 'Grave um clip com mesmo contexto e checklist de variaveis preservadas.',
            porQueImporta: 'Somente o clip compativel pode confirmar progresso tecnico.',
            oQueInvalida: 'Distancia ambigua, sensibilidade nova, loadout diferente, patch diferente ou captura fraca.',
            evidenciaGerada: 'Validacao pendente, progresso validado, sem mudanca clara ou regressao validada.',
            ctaLabel: 'Gravar validacao compativel',
            ctaTarget: 'analyze_validation',
        }),
        mission({
            ...base,
            slot: 'main_5',
            category: 'validation',
            title: 'Fechar checkpoint semanal',
            stateAfterCompletion: 'consolidando',
            agora: 'Feche a semana pelo ritmo, separando execucao, validacao e blockers.',
            porQueImporta: 'Calendario fecha a semana; dificuldade so sobe com evidencia convergente.',
            oQueInvalida: 'Chamar semana fechada de progresso sem clip compativel ou Lab coerente.',
            evidenciaGerada: 'Checkpoint operacional com estado honesto e proxima recomendacao.',
            ctaLabel: 'Anexar validacao antes do checkpoint',
            ctaTarget: 'analyze_validation',
        }),
        mission({
            ...base,
            slot: 'flex_1',
            category: 'repair',
            title: 'Flex de reparo ou recuperacao',
            stateAfterCompletion: 'reparando',
            agora: 'Use este slot para fadiga, captura fraca, confusao, variavel quebrada ou baixa fidelidade.',
            porQueImporta: 'Reparo preserva evidencia e impede punicao por atraso ou execucao contaminada.',
            oQueInvalida: 'Ignorar dor, fadiga forte, blocker de captura ou contexto incompativel.',
            evidenciaGerada: 'Motivo de reparo e dose rebaixada quando necessario.',
            ctaLabel: 'Reparar no Spray Lab',
            ctaTarget: 'spray_lab',
            reasonCodes: evidenceSummary.blockers.length > 0 ? evidenceSummary.blockers : ['compatible_proof_missing'],
        }),
        mission({
            ...base,
            slot: 'flex_2',
            category: 'transfer',
            title: 'Flex de transferencia pratica',
            stateAfterCompletion: 'consolidando',
            agora: 'Leve o mesmo foco para TDM ou situacao real curta sem trocar contexto tecnico.',
            porQueImporta: 'Transferencia ajuda o coach, mas nao vira prova tecnica do ciclo.',
            oQueInvalida: 'Usar TDM ou partida como substituto de validacao compativel controlada.',
            evidenciaGerada: 'Sinal pratico conservador separado da prova tecnica.',
            ctaLabel: 'Consolidar no Spray Lab',
            ctaTarget: 'spray_lab',
        }),
    ];
}

function buildRepairMissions(input: {
    readonly cycleId: string;
    readonly contextLabel: string;
    readonly evidenceSummary: TrainingProgramEvidenceSummary;
    readonly reasonCodes: readonly TrainingProgramReasonCode[];
}): readonly TrainingProgramMission[] {
    const base = {
        cycleId: input.cycleId,
        weekNumber: 1 as const,
        contextLabel: input.contextLabel,
        evidenceSummary: input.evidenceSummary,
        status: 'available' as const,
        reasonCodes: input.reasonCodes,
    };

    return [
        mission({
            ...base,
            slot: 'main_1',
            category: 'preparation',
            title: 'Preparar captura e contexto de reparo',
            stateAfterCompletion: 'preparando',
            agora: 'Confirme arma, mira, distancia e variaveis antes de qualquer leitura forte.',
            porQueImporta: 'Ciclo de Reparo cria uma base limpa para o Ciclo Pro.',
            oQueInvalida: 'Contexto incompleto, reticulo pouco visivel ou mais de uma variavel em teste.',
            evidenciaGerada: 'Checklist de base minima para nova leitura.',
            ctaLabel: 'Preparar validacao',
            ctaTarget: 'analyze_validation',
        }),
        mission({
            ...base,
            slot: 'main_2',
            category: 'repair',
            title: 'Reparar blocker dominante',
            stateAfterCompletion: 'reparando',
            agora: 'Ataque apenas o blocker principal: captura, contexto, fidelidade ou variavel quebrada.',
            porQueImporta: 'Um blocker reparado vale mais que volume sem evidencia comparavel.',
            oQueInvalida: 'Tentar validar progresso antes de resolver o blocker.',
            evidenciaGerada: 'Blocker reparado ou razao para manter reparo.',
            ctaLabel: 'Reparar no Spray Lab',
            ctaTarget: 'spray_lab',
        }),
        mission({
            ...base,
            slot: 'main_3',
            category: 'execution',
            title: 'Executar bloco curto de estabilizacao',
            stateAfterCompletion: 'consolidando',
            agora: 'Execute dose curta, com pausas claras e sem trocar variaveis.',
            porQueImporta: 'Estabilizacao mostra se a base ja sustenta uma validacao.',
            oQueInvalida: 'Fadiga forte, confusao, reps puladas ou contexto diferente.',
            evidenciaGerada: 'Fidelidade fraca, utilizavel ou pronta para validacao.',
            ctaLabel: 'Executar Spray Lab',
            ctaTarget: 'spray_lab',
        }),
        mission({
            ...base,
            slot: 'main_4',
            category: 'validation',
            title: 'Gerar primeira validacao compativel',
            stateAfterCompletion: 'validacao_pendente',
            agora: 'Grave um clip curto e compativel com a base reparada.',
            porQueImporta: 'O Ciclo Pro completo so nasce quando a base minima fica verificavel.',
            oQueInvalida: 'Clip inconclusivo, variavel alterada ou captura abaixo dos minimos.',
            evidenciaGerada: 'Prova compativel pendente ou blocker restante.',
            ctaLabel: 'Gravar validacao compativel',
            ctaTarget: 'analyze_validation',
        }),
        mission({
            ...base,
            slot: 'main_5',
            category: 'validation',
            title: 'Fechar reparo com decisao honesta',
            stateAfterCompletion: 'inconclusivo',
            agora: 'Decida entre abrir Ciclo Pro, manter reparo ou reiniciar linha.',
            porQueImporta: 'A decisao final depende da base, nao de calendario ou volume.',
            oQueInvalida: 'Promover o ciclo sem contexto salvo e clip compativel suficiente.',
            evidenciaGerada: 'Recomendacao de continuidade, consolidacao ou nova reparacao.',
            ctaLabel: 'Validar antes de abrir Ciclo Pro',
            ctaTarget: 'analyze_validation',
        }),
        mission({
            ...base,
            slot: 'flex_1',
            category: 'repair',
            title: 'Flex de reencaixe sem punicao',
            stateAfterCompletion: 'reparando',
            agora: 'Reencaixe atraso, stale context ou quebra de variavel sem apagar a linha.',
            porQueImporta: 'Uso inconsistente precisa preservar evidencia, nao inventar progresso.',
            oQueInvalida: 'Tratar ausencia longa como progresso automatico.',
            evidenciaGerada: 'Razao de reencaixe e proxima acao minima.',
            ctaLabel: 'Reencaixar no Spray Lab',
            ctaTarget: 'spray_lab',
            reasonCodes: ['missed_day_reentry', ...input.reasonCodes],
        }),
        mission({
            ...base,
            slot: 'flex_2',
            category: 'preparation',
            title: 'Flex de clareza de variaveis',
            stateAfterCompletion: 'preparando',
            agora: 'Reduza a missao para uma variavel clara quando houver confusao.',
            porQueImporta: 'Clareza evita misturar sintomas de execucao com decisao tecnica.',
            oQueInvalida: 'Adicionar objetivos extras antes de reparar a base.',
            evidenciaGerada: 'Missao simplificada e criterio de proxima validacao.',
            ctaLabel: 'Preparar novo clip',
            ctaTarget: 'analyze_validation',
            reasonCodes: ['confusion_simplified', ...input.reasonCodes],
        }),
    ];
}

function mission(input: {
    readonly cycleId: string;
    readonly weekNumber: 1 | 2 | 3 | 4;
    readonly slot: TrainingProgramMissionSlot;
    readonly category: TrainingProgramMissionCategory;
    readonly status: TrainingProgramMission['status'];
    readonly title: string;
    readonly stateAfterCompletion: TrainingProgramState;
    readonly contextLabel: string;
    readonly evidenceSummary: TrainingProgramEvidenceSummary;
    readonly agora: string;
    readonly porQueImporta: string;
    readonly oQueInvalida: string;
    readonly evidenciaGerada: string;
    readonly ctaLabel: string;
    readonly ctaTarget: 'spray_lab' | 'analyze_validation';
    readonly reasonCodes?: readonly TrainingProgramReasonCode[];
}): TrainingProgramMission {
    const id = `${input.cycleId}:week:${input.weekNumber}:${input.slot}`;
    const protocolId = input.evidenceSummary.protocolId;

    return {
        id,
        weekNumber: input.weekNumber,
        slot: input.slot,
        category: input.category,
        status: input.status,
        title: input.title,
        anatomy: {
            agora: input.agora,
            porQueImporta: input.porQueImporta,
            oQueInvalida: input.oQueInvalida,
            evidenciaGerada: input.evidenciaGerada,
            proximoCta: {
                label: input.ctaLabel,
                href: input.ctaTarget === 'spray_lab'
                    ? `/spray-lab?programMissionId=${encodeURIComponent(id)}`
                    : `/analyze?mode=validation&programMissionId=${encodeURIComponent(id)}`,
                target: input.ctaTarget,
            },
        },
        stateAfterCompletion: input.stateAfterCompletion,
        reasonCodes: input.reasonCodes ?? [],
        ...(protocolId ? { protocolId } : {}),
        evidenceRefs: evidenceRefsForMission(input.evidenceSummary, input.category),
    };
}

function evidenceRefsForMission(
    summary: TrainingProgramEvidenceSummary,
    category: TrainingProgramMissionCategory,
): readonly TrainingProgramEvidenceReference[] {
    const refs: TrainingProgramEvidenceReference[] = [];

    if (summary.savedAnalysisId) {
        refs.push({
            kind: 'analysis',
            id: summary.savedAnalysisId,
            href: `/history/${summary.savedAnalysisId}`,
        });
    }

    if (summary.protocolId) {
        refs.push({
            kind: 'protocol',
            id: summary.protocolId,
        });
    }

    if (category === 'validation' && summary.validationLink) {
        refs.push({
            kind: 'validation_link',
            id: summary.validationLink.id,
        });
    }

    return refs;
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
