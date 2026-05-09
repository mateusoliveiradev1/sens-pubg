import { trainingProgramReasonCopy } from '@/core/training-programs';
import type {
    TrainingProgramProjectedCycle,
    TrainingProgramProjectedMission,
    TrainingProgramProjectedWeek,
    TrainingProgramProjection,
} from '@/lib/training-program-projection';
import type { EvidenceTone } from '@/ui/components/evidence-chip';
import type {
    TrainingProgramCheckpoint,
    TrainingProgramCheckpointLayer,
    TrainingProgramCheckpointOutcome,
    TrainingProgramMissionCategory,
    TrainingProgramMissionSlot,
    TrainingProgramMissionStatus,
    TrainingProgramReasonCode,
    TrainingProgramRecoveryAction,
    TrainingProgramState,
} from '@/types/training-programs';

export type CicloProRouteState = 'empty' | 'locked' | 'repair' | 'active' | 'completed';

export interface CicloProActionModel {
    readonly label: string;
    readonly href: string;
    readonly disabled?: boolean;
}

export interface CicloProEvidenceItemModel {
    readonly label: string;
    readonly value?: string;
    readonly tone: EvidenceTone;
    readonly detail?: string;
}

export interface CicloProMissionModel {
    readonly id: string;
    readonly weekNumber: 1 | 2 | 3 | 4;
    readonly slotLabel: string;
    readonly categoryLabel: string;
    readonly statusLabel: string;
    readonly title: string;
    readonly agora: string;
    readonly porQueImporta: string;
    readonly oQueInvalida: string;
    readonly evidenciaGerada: string;
    readonly proximoCta: CicloProActionModel;
    readonly reasonLabels: readonly string[];
    readonly evidenceLabels: readonly string[];
}

export interface CicloProWeekModel {
    readonly id: string;
    readonly weekNumber: 1 | 2 | 3 | 4;
    readonly label: string;
    readonly state: TrainingProgramState;
    readonly stateLabel: string;
    readonly active: boolean;
    readonly checkpointCount: number;
    readonly canIncreaseDifficulty: boolean;
    readonly recoveryLabel: string | null;
    readonly reasonLabels: readonly string[];
    readonly missions: readonly CicloProMissionModel[];
}

export interface CicloProCheckpointModel {
    readonly id: string;
    readonly layerLabel: string;
    readonly outcomeLabel: string;
    readonly stateLabel: string;
    readonly summary: string;
    readonly reasonLabels: readonly string[];
    readonly canIncreaseDifficulty: boolean;
}

export interface CicloProRepairPanelModel {
    readonly title: string;
    readonly body: string;
    readonly action: TrainingProgramRecoveryAction;
    readonly reasonLabels: readonly string[];
}

export interface CicloProProgramMapModel {
    readonly cycleId: string;
    readonly kindLabel: string;
    readonly stateLabel: string;
    readonly contextLabel: string;
    readonly currentWeekLabel: string;
    readonly activeLineLabel: string;
    readonly archivedLineCount: number;
    readonly weeks: readonly CicloProWeekModel[];
    readonly checkpoints: readonly CicloProCheckpointModel[];
    readonly repairPanels: readonly CicloProRepairPanelModel[];
}

export interface CicloProLockModel {
    readonly title: string;
    readonly body: string;
    readonly cta: CicloProActionModel;
}

export interface CicloProSocialProSourceIds {
    readonly sourceTrainingProgramCycleId?: string;
    readonly sourceAnalysisSessionId?: string;
    readonly sourceValidationLinkId?: string;
}

export interface CicloProSocialProLibraryContext {
    readonly programCycleId?: string;
    readonly activeLineId?: string;
    readonly validationState: string;
    readonly blockerKey?: string;
}

export interface CicloProSocialProReportActionModel {
    readonly label: string;
    readonly body: string;
    readonly disabled: boolean;
    readonly lockCopy: string | null;
    readonly title: string;
    readonly visibility: 'link_private';
    readonly sourceIds: CicloProSocialProSourceIds;
}

export interface CicloProSocialProLibraryActionModel {
    readonly label: string;
    readonly body: string;
    readonly disabled: boolean;
    readonly lockCopy: string | null;
    readonly item: {
        readonly kind: 'program_mission';
        readonly id: string | null;
        readonly context: CicloProSocialProLibraryContext;
    };
}

export interface CicloProSocialProModel {
    readonly title: string;
    readonly body: string;
    readonly evidenceHierarchy: readonly [
        'Execucao do Ciclo Pro',
        'Transferencia pratica',
        'Validacao tecnica compativel',
    ];
    readonly blockerLabels: readonly string[];
    readonly reportAction: CicloProSocialProReportActionModel;
    readonly libraryAction: CicloProSocialProLibraryActionModel;
}

export interface CicloProViewModel {
    readonly routeState: CicloProRouteState;
    readonly title: string;
    readonly body: string;
    readonly roleLabel: string;
    readonly primaryAction: CicloProActionModel;
    readonly evidenceItems: readonly CicloProEvidenceItemModel[];
    readonly loopStage: 'clip' | 'evidence' | 'coach' | 'block' | 'outcome' | 'validation' | 'checkpoint';
    readonly loopEvidenceLabel: string;
    readonly stateLabel: string;
    readonly blockerLabel: string;
    readonly currentWeekLabel: string;
    readonly programMap: CicloProProgramMapModel | null;
    readonly freeMission: CicloProMissionModel | null;
    readonly lock: CicloProLockModel | null;
    readonly socialPro: CicloProSocialProModel;
    readonly emptySteps: readonly CicloProActionModel[];
}

export interface BuildCicloProViewModelInput {
    readonly projection: TrainingProgramProjection;
    readonly loadError?: string | null;
}

const PRO_LOCK_TITLE = 'Desbloqueie o Ciclo Pro de 30 dias';
const PRO_LOCK_BODY = 'O Free te mostra o proximo passo. O Pro organiza sua evolucao em um ciclo completo, adaptativo e auditavel.';

function formatPercent(value: number | null | undefined): string {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
        return 'pendente';
    }

    return `${Math.round(value * 100)}%`;
}

function stateLabel(state: TrainingProgramState): string {
    switch (state) {
        case 'preparando':
            return 'Preparando ciclo';
        case 'ativo':
            return 'Linha ativa';
        case 'reparando':
            return 'Reparo ativo';
        case 'consolidando':
            return 'Consolidacao';
        case 'validacao_pendente':
            return 'Validacao pendente';
        case 'progresso_validado':
            return 'Progresso validado';
        case 'sem_mudanca_clara':
            return 'Sem mudanca clara';
        case 'regressao_validada':
            return 'Regressao validada';
        case 'inconclusivo':
            return 'Inconclusivo';
        case 'linha_reiniciada':
            return 'Linha reiniciada';
        case 'concluido':
            return 'Ciclo concluido';
        case 'pausado':
            return 'Bloco pausado';
        case 'contexto_desatualizado':
            return 'Contexto desatualizado';
    }
}

function categoryLabel(category: TrainingProgramMissionCategory): string {
    switch (category) {
        case 'execution':
            return 'Execucao';
        case 'validation':
            return 'Validacao';
        case 'repair':
            return 'Reparo';
        case 'preparation':
            return 'Preparacao';
        case 'transfer':
            return 'Transferencia';
    }
}

function slotLabel(slot: TrainingProgramMissionSlot): string {
    switch (slot) {
        case 'main_1':
            return 'Missao 1';
        case 'main_2':
            return 'Missao 2';
        case 'main_3':
            return 'Missao 3';
        case 'main_4':
            return 'Missao 4';
        case 'main_5':
            return 'Missao 5';
        case 'flex_1':
            return 'Slot flex 1';
        case 'flex_2':
            return 'Slot flex 2';
    }
}

function statusLabel(status: TrainingProgramMissionStatus): string {
    switch (status) {
        case 'locked':
            return 'Bloqueada';
        case 'available':
            return 'Disponivel';
        case 'active':
            return 'Agora';
        case 'completed':
            return 'Concluida';
        case 'blocked':
            return 'Com blocker';
        case 'skipped_reentered':
            return 'Reencaixada';
    }
}

function recoveryLabel(action: TrainingProgramRecoveryAction | null | undefined): string | null {
    if (!action) {
        return null;
    }

    switch (action) {
        case 'reparar':
            return 'Reparar evidencia';
        case 'consolidar':
            return 'Consolidar antes de subir';
        case 'reiniciar_linha':
            return 'Reiniciar linha ativa';
        case 'pausar_bloco':
            return 'Pausar bloco';
        case 'reencaixar':
            return 'Reencaixar missao';
    }
}

function checkpointLayerLabel(layer: TrainingProgramCheckpointLayer): string {
    switch (layer) {
        case 'weekly_operational':
            return 'Checkpoint operacional semanal';
        case 'technical_validated':
            return 'Checkpoint tecnico validado';
        case 'monthly_program':
            return 'Checkpoint mensal';
    }
}

function checkpointOutcomeLabel(outcome: TrainingProgramCheckpointOutcome): string {
    switch (outcome) {
        case 'executed':
            return 'Executado';
        case 'stabilized':
            return 'Estabilizado';
        case 'repair_needed':
            return 'Reparo necessario';
        case 'validation_pending':
            return 'Validacao pendente';
        case 'progress_validated':
            return 'Progresso validado';
        case 'regression_validated':
            return 'Regressao validada';
        case 'no_clear_change':
            return 'Sem mudanca clara';
        case 'incompatible_context':
            return 'Contexto incompativel';
        case 'insufficient_evidence':
            return 'Evidencia insuficiente';
        case 'line_restarted':
            return 'Linha reiniciada';
        case 'cycle_completed':
            return 'Ciclo concluido';
    }
}

function reasonLabels(reasonCodes: readonly TrainingProgramReasonCode[]): readonly string[] {
    return reasonCodes.map(trainingProgramReasonCopy);
}

function evidenceLabelForMission(mission: TrainingProgramProjectedMission): readonly string[] {
    if (mission.evidenceRefs.length === 0) {
        return ['Evidencia sera anexada ao concluir a missao.'];
    }

    return mission.evidenceRefs.map((ref) => {
        switch (ref.kind) {
            case 'analysis':
                return 'Analise salva';
            case 'protocol':
                return 'Protocolo completo';
            case 'spray_lab_session':
                return 'Sessao Spray Lab';
            case 'spray_lab_benchmark':
                return 'Benchmark Spray Lab';
            case 'validation_link':
                return 'Validacao compativel';
            case 'precision_trend':
                return 'Linha de precisao';
            case 'precision_checkpoint':
                return 'Checkpoint de precisao';
            case 'coach_outcome':
                return 'Resultado do coach';
        }
    });
}

function missionModel(mission: TrainingProgramProjectedMission): CicloProMissionModel {
    return {
        id: mission.id,
        weekNumber: mission.weekNumber,
        slotLabel: slotLabel(mission.slot),
        categoryLabel: categoryLabel(mission.category),
        statusLabel: statusLabel(mission.status),
        title: mission.title,
        agora: mission.agora,
        porQueImporta: mission.porQueImporta,
        oQueInvalida: mission.oQueInvalida,
        evidenciaGerada: mission.evidenciaGerada,
        proximoCta: {
            label: mission.proximoCta.label,
            href: mission.proximoCta.href,
        },
        reasonLabels: reasonLabels(mission.reasonCodes),
        evidenceLabels: evidenceLabelForMission(mission),
    };
}

function weekModel(week: TrainingProgramProjectedWeek, cycle: TrainingProgramProjectedCycle): CicloProWeekModel {
    return {
        id: week.id,
        weekNumber: week.weekNumber,
        label: week.label,
        state: week.state,
        stateLabel: stateLabel(week.state),
        active: week.weekNumber === cycle.currentWeekNumber,
        checkpointCount: week.checkpointIds.length,
        canIncreaseDifficulty: week.canIncreaseDifficulty,
        recoveryLabel: recoveryLabel(week.recoveryAction),
        reasonLabels: reasonLabels(week.reasonCodes),
        missions: week.missions.map(missionModel),
    };
}

function checkpointModel(checkpoint: TrainingProgramCheckpoint): CicloProCheckpointModel {
    return {
        id: checkpoint.id,
        layerLabel: checkpointLayerLabel(checkpoint.layer),
        outcomeLabel: checkpointOutcomeLabel(checkpoint.outcome),
        stateLabel: stateLabel(checkpoint.state),
        summary: checkpoint.summary,
        reasonLabels: reasonLabels(checkpoint.reasonCodes),
        canIncreaseDifficulty: checkpoint.canIncreaseDifficulty,
    };
}

function repairPanelsFor(cycle: TrainingProgramProjectedCycle): readonly CicloProRepairPanelModel[] {
    const reasonCodes = cycle.weeks.flatMap((week) => week.reasonCodes).length > 0
        ? cycle.weeks.flatMap((week) => week.reasonCodes)
        : cycle.checkpoints.flatMap((checkpoint) => checkpoint.reasonCodes);
    const uniqueReasons = Array.from(new Set([...cycle.archivedLines.flatMap((line) => line.restartReasonCodes), ...reasonCodes]));
    const action = cycle.recoveryAction;
    const label = recoveryLabel(action) ?? 'Preservar evidencia';

    if (uniqueReasons.length === 0 && cycle.state === 'ativo') {
        return [];
    }

    return [{
        title: label,
        body: uniqueReasons[0]
            ? trainingProgramReasonCopy(uniqueReasons[0])
            : 'O ciclo mantem a linha ativa sem inventar progresso quando falta prova compativel.',
        action,
        reasonLabels: reasonLabels(uniqueReasons),
    }];
}

function programMapModel(cycle: TrainingProgramProjectedCycle): CicloProProgramMapModel {
    return {
        cycleId: cycle.id,
        kindLabel: cycle.kind === 'ciclo_reparo' ? 'Ciclo de Reparo' : 'Ciclo Pro',
        stateLabel: stateLabel(cycle.state),
        contextLabel: cycle.strictContextLabel,
        currentWeekLabel: `Semana ${cycle.currentWeekNumber} de 4`,
        activeLineLabel: cycle.activeLine?.label ?? 'Linha ativa aguardando contexto',
        archivedLineCount: cycle.archivedLines.length,
        weeks: cycle.weeks.map((week) => weekModel(week, cycle)),
        checkpoints: cycle.checkpoints.map(checkpointModel),
        repairPanels: repairPanelsFor(cycle),
    };
}

function routeStateFor(input: {
    readonly loadError: string | null;
    readonly projection: TrainingProgramProjection;
}): CicloProRouteState {
    if (input.loadError) {
        return 'repair';
    }

    const cycle = input.projection.fullCycle;
    if (!input.projection.basicMission && !input.projection.evidence && !cycle) {
        return 'empty';
    }

    if (!cycle) {
        return 'locked';
    }

    if (cycle.state === 'concluido') {
        return 'completed';
    }

    if (
        cycle.kind === 'ciclo_reparo'
        || cycle.state === 'reparando'
        || cycle.state === 'consolidando'
        || cycle.state === 'linha_reiniciada'
        || cycle.state === 'pausado'
        || cycle.state === 'contexto_desatualizado'
    ) {
        return 'repair';
    }

    return 'active';
}

function loopStageFor(state: CicloProRouteState, cycle: TrainingProgramProjectedCycle | null): CicloProViewModel['loopStage'] {
    if (state === 'empty') {
        return 'clip';
    }

    if (state === 'locked') {
        return 'coach';
    }

    if (!cycle) {
        return 'block';
    }

    switch (cycle.state) {
        case 'preparando':
            return 'coach';
        case 'ativo':
        case 'reparando':
        case 'consolidando':
        case 'pausado':
        case 'contexto_desatualizado':
            return 'block';
        case 'validacao_pendente':
            return 'validation';
        case 'progresso_validado':
        case 'sem_mudanca_clara':
        case 'regressao_validada':
        case 'inconclusivo':
        case 'linha_reiniciada':
        case 'concluido':
            return 'checkpoint';
    }
}

function blockerLabel(projection: TrainingProgramProjection, loadError: string | null): string {
    if (loadError) {
        return loadError;
    }

    const blockers = projection.evidence?.blockers ?? [];
    if (blockers.length === 0) {
        return 'Sem blocker ativo';
    }

    return blockers.map(trainingProgramReasonCopy).join(' ');
}

function evidenceItemsFor(input: {
    readonly projection: TrainingProgramProjection;
    readonly routeState: CicloProRouteState;
    readonly stateLabelValue: string;
    readonly currentWeekLabel: string;
    readonly blockerValue: string;
}): readonly CicloProEvidenceItemModel[] {
    const { projection, routeState, stateLabelValue, currentWeekLabel, blockerValue } = input;
    const evidence = projection.evidence;

    return [
        { label: 'Estado', value: stateLabelValue, tone: routeState === 'repair' ? 'warning' : 'info' },
        { label: 'Semana', value: currentWeekLabel, tone: 'info' },
        { label: 'Confianca', value: formatPercent(evidence?.confidence), tone: evidence && evidence.confidence >= 0.75 ? 'success' : 'warning' },
        { label: 'Cobertura', value: formatPercent(evidence?.coverage), tone: evidence && evidence.coverage >= 0.75 ? 'success' : 'warning' },
        { label: 'Blocker', value: blockerValue, tone: blockerValue === 'Sem blocker ativo' ? 'success' : 'warning' },
        { label: 'Acesso', value: projection.tier, tone: projection.tier === 'free' ? 'info' : 'pro' },
    ];
}

function lockModel(projection: TrainingProgramProjection): CicloProLockModel | null {
    if (projection.canSeeFullThirtyDayCycle) {
        return null;
    }

    const firstLock = projection.locks[0];

    return {
        title: PRO_LOCK_TITLE,
        body: firstLock?.body
            ? `${PRO_LOCK_BODY} ${firstLock.body}`
            : PRO_LOCK_BODY,
        cta: {
            label: PRO_LOCK_TITLE,
            href: firstLock?.ctaHref ?? '/pricing',
        },
    };
}

function firstEvidenceRefId(
    projection: TrainingProgramProjection,
    kind: 'analysis' | 'validation_link',
): string | null {
    return projection.evidence?.evidenceRefs.find((ref) => ref.kind === kind)?.id ?? null;
}

function socialProMission(cycle: TrainingProgramProjectedCycle | null, freeMission: CicloProMissionModel | null): {
    readonly id: string | null;
    readonly title: string;
} {
    if (!cycle) {
        return {
            id: freeMission?.id ?? null,
            title: freeMission?.title ?? 'Missao Ciclo Pro',
        };
    }

    const missions = cycle.weeks.flatMap((week) => week.missions);
    const current = cycle.currentMissionId
        ? missions.find((mission) => mission.id === cycle.currentMissionId)
        : null;
    const fallback = current
        ?? missions.find((mission) => mission.status !== 'completed')
        ?? missions.at(-1)
        ?? null;

    return {
        id: fallback?.id ?? null,
        title: fallback?.title ?? 'Missao Ciclo Pro',
    };
}

function socialProValidationLinkId(cycle: TrainingProgramProjectedCycle | null): string | null {
    if (!cycle) {
        return null;
    }

    return cycle.checkpoints.find((checkpoint) => checkpoint.evidenceSummary.validationLink?.id)
        ?.evidenceSummary.validationLink?.id
        ?? cycle.weeks
            .flatMap((week) => week.missions)
            .flatMap((mission) => mission.evidenceRefs)
            .find((ref) => ref.kind === 'validation_link')
            ?.id
        ?? null;
}

function socialProValidationState(cycle: TrainingProgramProjectedCycle | null): string {
    if (!cycle) {
        return 'locked';
    }

    return cycle.checkpoints.find((checkpoint) => checkpoint.evidenceSummary.validationStatus)
        ?.evidenceSummary.validationStatus
        ?? (cycle.state === 'validacao_pendente' ? 'not_requested' : 'compatible_validation_pending');
}

function socialProBlockerKey(
    projection: TrainingProgramProjection,
    cycle: TrainingProgramProjectedCycle | null,
): string | null {
    const explicit = projection.evidence?.blockers[0] ?? projection.evidence?.reasonCodes[0];
    if (explicit) {
        return explicit;
    }

    if (!cycle) {
        return null;
    }

    switch (cycle.state) {
        case 'reparando':
        case 'consolidando':
            return 'fidelity_dropped';
        case 'validacao_pendente':
            return 'compatible_proof_missing';
        case 'linha_reiniciada':
            return 'line_restart';
        case 'contexto_desatualizado':
            return 'stale_context';
        case 'preparando':
        case 'ativo':
        case 'progresso_validado':
        case 'sem_mudanca_clara':
        case 'regressao_validada':
        case 'inconclusivo':
        case 'concluido':
        case 'pausado':
            return null;
    }
}

function socialProBlockerLabels(
    projection: TrainingProgramProjection,
    cycle: TrainingProgramProjectedCycle | null,
): readonly string[] {
    const reasonCodes = [
        ...(projection.evidence?.blockers ?? []),
        ...(projection.evidence?.reasonCodes ?? []),
        ...(cycle?.weeks.flatMap((week) => week.reasonCodes) ?? []),
        ...(cycle?.checkpoints.flatMap((checkpoint) => checkpoint.reasonCodes) ?? []),
    ];
    const uniqueReasons = Array.from(new Set(reasonCodes));

    if (uniqueReasons.length === 0) {
        return ['Confianca, cobertura, blockers e validacao seguem visiveis no relatorio.'];
    }

    return uniqueReasons.map(trainingProgramReasonCopy);
}

function socialProModel(input: {
    readonly projection: TrainingProgramProjection;
    readonly cycle: TrainingProgramProjectedCycle | null;
    readonly freeMission: CicloProMissionModel | null;
}): CicloProSocialProModel {
    const { projection, cycle, freeMission } = input;
    const mission = socialProMission(cycle, freeMission);
    const sourceAnalysisSessionId = firstEvidenceRefId(projection, 'analysis');
    const sourceValidationLinkId = socialProValidationLinkId(cycle) ?? firstEvidenceRefId(projection, 'validation_link');
    const canUseSocialPro = projection.canSeeFullThirtyDayCycle && Boolean(cycle);
    const lockCopy = canUseSocialPro
        ? null
        : 'O Free mantem leitura publica e saves normais. O Pro organiza este contexto em relatorio, biblioteca, Ciclo Pro e validacao compativel.';
    const blockerKey = socialProBlockerKey(projection, cycle);
    const sourceIds: CicloProSocialProSourceIds = {
        ...(cycle ? { sourceTrainingProgramCycleId: cycle.id } : {}),
        ...(sourceAnalysisSessionId ? { sourceAnalysisSessionId } : {}),
        ...(sourceValidationLinkId ? { sourceValidationLinkId } : {}),
    };
    const libraryContext: CicloProSocialProLibraryContext = {
        ...(cycle ? { programCycleId: cycle.id } : {}),
        ...(cycle?.activeLine?.lineId ? { activeLineId: cycle.activeLine.lineId } : {}),
        validationState: socialProValidationState(cycle),
        ...(blockerKey ? { blockerKey } : {}),
    };

    return {
        title: 'Social Pro do Ciclo Pro',
        body: 'Gere um Relatorio Pro Compartilhavel ou salve a missao na Biblioteca Pro mantendo execucao, transferencia pratica e validacao compativel separadas.',
        evidenceHierarchy: [
            'Execucao do Ciclo Pro',
            'Transferencia pratica',
            'Validacao tecnica compativel',
        ],
        blockerLabels: socialProBlockerLabels(projection, cycle),
        reportAction: {
            label: canUseSocialPro ? 'Gerar relatorio do ciclo' : 'Relatorio Pro bloqueado',
            body: 'Usa apenas IDs salvos do ciclo, analise e validacao; a acao recarrega ownership no servidor.',
            disabled: !canUseSocialPro || !cycle,
            lockCopy,
            title: cycle ? `${cycle.label} no Social Pro` : 'Ciclo Pro no Social Pro',
            visibility: 'link_private',
            sourceIds,
        },
        libraryAction: {
            label: canUseSocialPro ? 'Salvar missao na Biblioteca Pro' : 'Biblioteca Pro bloqueada',
            body: 'Organiza esta missao por ciclo, linha ativa, blocker e validacao sem criar placar ou workflow de time.',
            disabled: !canUseSocialPro || !mission.id,
            lockCopy,
            item: {
                kind: 'program_mission',
                id: mission.id,
                context: libraryContext,
            },
        },
    };
}

function titleFor(input: {
    readonly routeState: CicloProRouteState;
    readonly projection: TrainingProgramProjection;
    readonly programMap: CicloProProgramMapModel | null;
}): string {
    if (input.routeState === 'empty') {
        return 'Nenhum Ciclo Pro ativo';
    }

    if (input.routeState === 'locked') {
        return PRO_LOCK_TITLE;
    }

    return input.programMap?.kindLabel ?? 'Ciclo Pro';
}

function bodyFor(input: {
    readonly routeState: CicloProRouteState;
    readonly projection: TrainingProgramProjection;
    readonly loadError: string | null;
}): string {
    if (input.loadError) {
        return 'A rota nao abriu esse ciclo com seguranca; retome por historico, Analyze ou billing conforme o estado.';
    }

    if (input.routeState === 'empty') {
        return 'Salve uma analise com protocolo ou abra o historico antes de criar o mapa. Sem base salva, a rota nao inventa programa.';
    }

    if (input.routeState === 'locked') {
        return PRO_LOCK_BODY;
    }

    return input.projection.evidence?.summary
        ?? 'Ciclo carregado com estado, contexto, evidencia e proximo CTA preservados.';
}

function primaryActionFor(input: {
    readonly routeState: CicloProRouteState;
    readonly projection: TrainingProgramProjection;
}): CicloProActionModel {
    if (input.routeState === 'empty') {
        return { label: 'Abrir Analyze', href: '/analyze' };
    }

    if (input.routeState === 'locked') {
        return { label: PRO_LOCK_TITLE, href: input.projection.locks[0]?.ctaHref ?? '/pricing' };
    }

    return {
        label: input.projection.nextStep.label,
        href: input.projection.nextStep.href,
    };
}

export function buildCicloProViewModel(input: BuildCicloProViewModelInput): CicloProViewModel {
    const loadError = input.loadError ?? null;
    const routeState = routeStateFor({ loadError, projection: input.projection });
    const cycle = input.projection.fullCycle;
    const programMap = cycle ? programMapModel(cycle) : null;
    const freeMission = !cycle && input.projection.basicMission
        ? missionModel(input.projection.basicMission)
        : null;
    const stateLabelValue = programMap?.stateLabel
        ?? (routeState === 'empty' ? 'Sem ciclo ativo' : 'Pro bloqueado');
    const currentWeekLabel = programMap?.currentWeekLabel
        ?? (freeMission ? `Semana ${freeMission.weekNumber} de 4` : 'Sem semana ativa');
    const blockerValue = blockerLabel(input.projection, loadError);
    const primaryAction = primaryActionFor({ routeState, projection: input.projection });

    return {
        routeState,
        title: titleFor({ routeState, projection: input.projection, programMap }),
        body: bodyFor({ routeState, projection: input.projection, loadError }),
        roleLabel: 'Ciclo Pro',
        primaryAction,
        evidenceItems: evidenceItemsFor({
            projection: input.projection,
            routeState,
            stateLabelValue,
            currentWeekLabel,
            blockerValue,
        }),
        loopStage: loopStageFor(routeState, cycle),
        loopEvidenceLabel: input.projection.evidence?.summary ?? blockerValue,
        stateLabel: stateLabelValue,
        blockerLabel: blockerValue,
        currentWeekLabel,
        programMap,
        freeMission,
        lock: lockModel(input.projection),
        socialPro: socialProModel({
            projection: input.projection,
            cycle,
            freeMission,
        }),
        emptySteps: [
            { label: 'Abrir Analyze', href: '/analyze' },
            { label: 'Ver historico', href: '/history' },
            { label: 'Abrir Spray Lab', href: '/spray-lab' },
        ],
    };
}
