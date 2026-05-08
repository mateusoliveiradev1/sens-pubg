import type { SprayLabProjectedAudit, SprayLabProjection } from '@/lib/spray-lab-projection';
import type {
    SprayLabFidelityReasonCode,
    SprayLabSessionEventType,
    SprayLabSessionSnapshot,
    SprayLabStepState,
} from '@/types/engine';

export type SprayLabRouteState = 'empty' | 'repair' | 'session';
export type SprayLabRunnerActionKind = 'event' | 'complete' | 'href';

export interface SprayLabRunnerActionModel {
    readonly id: string;
    readonly label: string;
    readonly kind: SprayLabRunnerActionKind;
    readonly eventType?: SprayLabSessionEventType;
    readonly href?: string;
    readonly reasonCodes?: readonly SprayLabFidelityReasonCode[];
    readonly variablesChanged?: boolean;
    readonly primary?: boolean;
}

export interface SprayLabStepModel {
    readonly state: SprayLabStepState;
    readonly actLabel: string;
    readonly title: string;
    readonly body: string;
    readonly timerSeconds: number;
    readonly primaryAction: SprayLabRunnerActionModel;
    readonly secondaryActions: readonly SprayLabRunnerActionModel[];
}

export interface SprayLabViewModel {
    readonly routeState: SprayLabRouteState;
    readonly title: string;
    readonly body: string;
    readonly primaryAction: {
        readonly label: string;
        readonly href: string;
        readonly disabled?: boolean;
    };
    readonly evidenceItems: readonly {
        readonly label: string;
        readonly value: string;
        readonly tone: 'info' | 'success' | 'warning' | 'error' | 'pro';
        readonly detail?: string;
    }[];
    readonly loopStage: 'clip' | 'evidence' | 'coach' | 'block' | 'outcome' | 'validation' | 'checkpoint';
    readonly loopEvidenceLabel: string;
    readonly session: {
        readonly id: string;
        readonly protocolId: string;
        readonly baseAnalysisId: string | null;
        readonly laneLabel: string;
        readonly laneObjective: string;
        readonly target: string;
        readonly contextLabel: string;
        readonly progressLabel: string;
        readonly progressPercent: number;
        readonly fidelityLabel: string;
        readonly indexLabel: string;
        readonly freeValueCopy: string;
        readonly proValueCopy: string;
        readonly lockCopy: string | null;
        readonly preparation: readonly string[];
        readonly executionSteps: readonly string[];
        readonly validationChecklist: readonly string[];
        readonly repair: SprayLabSessionSnapshot['repairState'];
        readonly step: SprayLabStepModel;
        readonly audit: SprayLabProjectedAudit | null;
    } | null;
    readonly repair: {
        readonly title: string;
        readonly whatHappened: string;
        readonly whyItMatters: string;
        readonly ctas: readonly string[];
    } | null;
}

function formatStepTitle(state: SprayLabStepState): string {
    switch (state) {
        case 'preparar':
            return 'Preparar';
        case 'pronto_para_spray':
            return 'Pronto para spray';
        case 'spray_em_andamento':
            return 'Spray em andamento';
        case 'descanso':
            return 'Descanso';
        case 'checagem_rapida':
            return 'Checagem rapida';
        case 'resultado':
            return 'Resultado';
        case 'validar_clip':
            return 'Validar clip';
    }
}

function formatActLabel(state: SprayLabStepState): string {
    switch (state) {
        case 'preparar':
        case 'pronto_para_spray':
            return 'Preparar';
        case 'spray_em_andamento':
        case 'descanso':
        case 'checagem_rapida':
            return 'Executar';
        case 'resultado':
            return 'Fechar resultado';
        case 'validar_clip':
            return 'Validar clip compativel';
    }
}

function formatStepBody(session: SprayLabSessionSnapshot): string {
    switch (session.stepState) {
        case 'preparar':
            return session.status === 'draft'
                ? 'Abra o bloco, confira setup e mantenha as variaveis do protocolo antes do primeiro spray.'
                : 'Preparo iniciado. Confirme que arma, mira, distancia, postura e sensibilidade ficaram iguais.';
        case 'pronto_para_spray':
            return 'Mantenha o alvo unico e comece o spray quando estiver pronto.';
        case 'spray_em_andamento':
            return 'Execute o spray sustentado e feche a rep sem trocar alvo ou sensibilidade.';
        case 'descanso':
            return 'Pausa controlada. Volte sem estourar o tempo do protocolo.';
        case 'checagem_rapida':
            return 'Marque se algo quebrou fidelidade antes de continuar.';
        case 'resultado':
            return 'Feche a sessao para calcular fidelidade, indice provisorio e proximo passo.';
        case 'validar_clip':
            return 'Agora grave o clip compativel no Analyze com o contexto carregado.';
    }
}

function validationHref(session: SprayLabSessionSnapshot): string {
    const params = new URLSearchParams({
        mode: 'validation',
        labSessionId: session.id,
        protocolId: session.protocolId,
    });

    if (session.baseAnalysisId) {
        params.set('baseSessionId', session.baseAnalysisId);
    }

    return `/analyze?${params.toString()}`;
}

function primaryActionForSession(session: SprayLabSessionSnapshot): SprayLabRunnerActionModel {
    switch (session.stepState) {
        case 'preparar':
            return session.status === 'draft'
                ? { id: 'start', label: 'Iniciar preparo', kind: 'event', eventType: 'start', primary: true }
                : { id: 'ready', label: 'Estou pronto', kind: 'event', eventType: 'ready', primary: true };
        case 'pronto_para_spray':
            return { id: 'spray_start', label: 'Iniciar spray', kind: 'event', eventType: 'spray_start', primary: true };
        case 'spray_em_andamento':
            return { id: 'spray_end', label: 'Fechar spray', kind: 'event', eventType: 'spray_end', primary: true };
        case 'descanso':
            return { id: 'rest_end', label: 'Voltar ao spray', kind: 'event', eventType: 'rest_end', primary: true };
        case 'checagem_rapida':
            return session.completedSprays >= session.totalSprays
                ? { id: 'complete', label: 'Fechar resultado', kind: 'complete', primary: true }
                : { id: 'rest_start', label: 'Iniciar descanso', kind: 'event', eventType: 'rest_start', primary: true };
        case 'resultado':
            return session.index
                ? { id: 'request_validation', label: 'Gravar validacao compativel', kind: 'event', eventType: 'request_validation', primary: true }
                : { id: 'complete', label: 'Calcular resultado', kind: 'complete', primary: true };
        case 'validar_clip':
            return { id: 'validation_href', label: 'Abrir validacao', kind: 'href', href: validationHref(session), primary: true };
    }
}

function secondaryActionsForSession(session: SprayLabSessionSnapshot): readonly SprayLabRunnerActionModel[] {
    const actions: SprayLabRunnerActionModel[] = [];

    if (session.status === 'paused') {
        actions.push({ id: 'resume', label: 'Retomar', kind: 'event', eventType: 'resume' });
    } else if (session.status === 'active') {
        actions.push({ id: 'pause', label: 'Pausar', kind: 'event', eventType: 'pause' });
    }

    if (session.stepState !== 'validar_clip' && session.status !== 'completed') {
        actions.push(
            { id: 'repeat', label: 'Repetir rep', kind: 'event', eventType: 'repeat_rep' },
            { id: 'skip', label: 'Pular rep', kind: 'event', eventType: 'skip_rep' },
            { id: 'problem', label: 'Problema', kind: 'event', eventType: 'report_problem', reasonCodes: ['user_confused'] },
            { id: 'variables_changed', label: 'Variavel mudou', kind: 'event', eventType: 'report_problem', reasonCodes: ['variable_changed'], variablesChanged: true },
            { id: 'end_early', label: 'Encerrar cedo', kind: 'event', eventType: 'end_early', reasonCodes: ['early_stop'] },
        );
    }

    return actions;
}

function timerForStep(session: SprayLabSessionSnapshot): number {
    switch (session.stepState) {
        case 'spray_em_andamento':
            return Math.max(20, Math.round((session.protocol.dose.durationMinutes * 60) / Math.max(session.totalSprays, 1)));
        case 'descanso':
            return Math.max(10, session.protocol.dose.restBetweenSpraysSeconds);
        case 'preparar':
        case 'pronto_para_spray':
            return 30;
        case 'checagem_rapida':
            return 20;
        case 'resultado':
        case 'validar_clip':
            return 0;
    }
}

function buildStepModel(session: SprayLabSessionSnapshot): SprayLabStepModel {
    const primaryAction = primaryActionForSession(session);

    return {
        state: session.stepState,
        actLabel: formatActLabel(session.stepState),
        title: formatStepTitle(session.stepState),
        body: formatStepBody(session),
        timerSeconds: timerForStep(session),
        primaryAction,
        secondaryActions: secondaryActionsForSession(session),
    };
}

function formatContextLabel(session: SprayLabSessionSnapshot): string {
    const context = session.protocol.context;
    const weapon = context.weaponName ?? context.weaponId ?? 'arma';
    const optic = context.opticName ?? context.opticId ?? 'mira';
    const distance = typeof context.distanceMeters === 'number'
        ? `${Math.round(context.distanceMeters)}m`
        : 'distancia a confirmar';

    return `${weapon} / ${optic} / ${distance}`;
}

function formatFidelityLabel(session: SprayLabSessionSnapshot): string {
    if (!session.fidelity) {
        return 'fidelidade pendente';
    }

    switch (session.fidelity.tier) {
        case 'strong':
            return `forte ${session.fidelity.score}/100`;
        case 'usable':
            return `util ${session.fidelity.score}/100`;
        case 'practice_only':
            return `pratica ${session.fidelity.score}/100`;
        case 'invalid_for_benchmark':
            return `fora do benchmark ${session.fidelity.score}/100`;
    }
}

function formatIndexLabel(session: SprayLabSessionSnapshot): string {
    if (!session.index) {
        return 'indice pendente';
    }

    return session.index.validatedScore
        ? `validado ${session.index.validatedScore}/100`
        : `provisorio ${session.index.provisionalScore}/100`;
}

export function buildSprayLabViewModel(input: {
    readonly projection: SprayLabProjection;
    readonly session?: SprayLabSessionSnapshot | null;
    readonly loadError?: string | null;
}): SprayLabViewModel {
    const session = input.session ?? null;

    if (input.loadError) {
        return {
            routeState: 'repair',
            title: 'Spray Lab indisponivel',
            body: 'Nao foi possivel abrir essa sessao Lab com seguranca.',
            primaryAction: { label: 'Voltar ao Analyze', href: '/analyze' },
            evidenceItems: [
                { label: 'Estado', value: 'Reparo', tone: 'warning' },
                { label: 'Acesso', value: input.projection.tier, tone: input.projection.tier === 'free' ? 'info' : 'pro' },
            ],
            loopStage: 'block',
            loopEvidenceLabel: 'sessao nao carregada',
            session: null,
            repair: {
                title: 'Sessao nao encontrada',
                whatHappened: input.loadError,
                whyItMatters: 'A rota nao deve abrir sessao inexistente ou de outro usuario.',
                ctas: ['Abra o Lab por uma analise salva ou continue uma sessao ativa.'],
            },
        };
    }

    if (!session || !input.projection.session) {
        return {
            routeState: 'empty',
            title: 'Spray Lab',
            body: 'Use uma analise salva com protocolo completo para abrir um bloco guiado, registrar fidelidade e gravar validacao compativel.',
            primaryAction: { label: 'Ver historico', href: '/history' },
            evidenceItems: [
                { label: 'Estado', value: 'Sem sessao ativa', tone: 'warning' },
                { label: 'Entrada', value: 'historico ou resultado salvo', tone: 'info' },
                { label: 'Pro', value: 'auditoria e benchmark', tone: 'pro' },
            ],
            loopStage: 'block',
            loopEvidenceLabel: 'aguardando protocolo',
            session: null,
            repair: null,
        };
    }

    const projectedSession = input.projection.session;
    const progressPercent = Math.round((session.completedSprays / Math.max(session.totalSprays, 1)) * 100);
    const lockCopy = input.projection.locks[0]?.body ?? null;
    const primaryAction = primaryActionForSession(session);

    return {
        routeState: 'session',
        title: formatStepTitle(session.stepState),
        body: `${session.lane.shortLabel}. ${formatStepBody(session)}`,
        primaryAction: {
            label: primaryAction.label,
            href: primaryAction.href ?? '#spray-lab-runner',
        },
        evidenceItems: [
            { label: 'Ato', value: formatActLabel(session.stepState), tone: 'info' },
            { label: 'Fidelidade', value: formatFidelityLabel(session), tone: session.fidelity?.benchmarkEligible ? 'success' : 'warning' },
            { label: 'Indice', value: formatIndexLabel(session), tone: session.index?.validatedScore ? 'success' : 'info' },
            { label: 'Acesso', value: input.projection.tier, tone: input.projection.tier === 'free' ? 'info' : 'pro' },
        ],
        loopStage: session.stepState === 'validar_clip' ? 'validation' : session.stepState === 'resultado' ? 'outcome' : 'block',
        loopEvidenceLabel: formatFidelityLabel(session),
        session: {
            id: session.id,
            protocolId: session.protocolId,
            baseAnalysisId: session.baseAnalysisId ?? null,
            laneLabel: projectedSession.lane.label,
            laneObjective: projectedSession.lane.objective,
            target: session.protocol.target,
            contextLabel: formatContextLabel(session),
            progressLabel: `${session.completedSprays}/${session.totalSprays} sprays`,
            progressPercent,
            fidelityLabel: formatFidelityLabel(session),
            indexLabel: formatIndexLabel(session),
            freeValueCopy: input.projection.freeValueCopy,
            proValueCopy: input.projection.proValueCopy,
            lockCopy,
            preparation: input.projection.canSeeAuditDrawers
                ? session.protocol.preparation.map((item) => item.label)
                : session.protocol.preparation.slice(0, 3).map((item) => item.label),
            executionSteps: input.projection.canUseFullSessionRunner
                ? session.protocol.executionSteps
                : session.protocol.executionSteps.slice(0, 3),
            validationChecklist: input.projection.canSeeAuditDrawers
                ? session.protocol.validation.compatibleClipChecklist
                : session.protocol.validation.compatibleClipChecklist.slice(0, 3),
            repair: session.repairState,
            step: buildStepModel(session),
            audit: projectedSession.audit,
        },
        repair: session.repairState
            ? {
                title: session.repairState.title,
                whatHappened: session.repairState.whatHappened,
                whyItMatters: session.repairState.whyItMatters,
                ctas: session.repairState.ctas,
            }
            : null,
    };
}
