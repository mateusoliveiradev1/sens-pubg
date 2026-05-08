import type {
    SprayLabFidelityComponent,
    SprayLabFidelityReasonCode,
    SprayLabFidelityReport,
    SprayLabFidelityTier,
    SprayLabRepairState,
    SprayLabRepairStateType,
    SprayLabSessionEvent,
    SprayLabSessionSnapshot,
} from '../types/engine';

const EXCESSIVE_PAUSE_MULTIPLIER = 1.75;

export function calculateSprayLabFidelity(
    session: SprayLabSessionSnapshot,
    events: readonly SprayLabSessionEvent[],
): SprayLabFidelityReport {
    const reasonCodes = collectFidelityReasons(session, events);
    const completedRatio = session.totalReps > 0
        ? session.completedReps / session.totalReps
        : 0;
    const manualInterventions = countManualInterventions(session, events);
    const components: readonly SprayLabFidelityComponent[] = [
        component('preparacao', 'Preparacao', preparationScore(session, events, reasonCodes)),
        component('controle_variaveis', 'Controle de variaveis', variableControlScore(reasonCodes)),
        component('reps_concluidas', 'Reps concluidas', Math.round(completedRatio * 100)),
        component('disciplina_pausas', 'Disciplina de pausas', pauseDisciplineScore(reasonCodes, events)),
        component('seguranca_reparo', 'Seguranca e reparo', safetyRepairScore(reasonCodes)),
        component('intervencao_manual', 'Intervencao manual', manualInterventionScore(manualInterventions)),
    ];
    const score = roundedAverage(components.map((current) => current.score));
    const tier = resolveFidelityTier({
        score,
        completedRatio,
        reasonCodes,
        manualInterventions,
        sessionStatus: session.status,
    });
    const evidenceLevel = tier === 'strong'
        ? 'provisional_benchmark'
        : tier === 'usable'
            ? 'weak_execution'
            : 'practice';

    return {
        version: 'spray-lab-v1',
        sessionId: session.id,
        tier,
        score,
        components,
        reasonCodes,
        evidenceLevel,
        benchmarkEligible: tier === 'strong' || tier === 'usable',
        safetyDowngrade: reasonCodes.includes('fatigue_or_pain'),
        coachImpactCopy: buildCoachImpactCopy(tier, reasonCodes),
        repairCtas: buildRepairCtas(reasonCodes, tier),
    };
}

export function buildSprayLabRepairState(
    fidelity: SprayLabFidelityReport,
): SprayLabRepairState | null {
    if (fidelity.benchmarkEligible && fidelity.reasonCodes.length === 0) {
        return null;
    }

    const type = resolveRepairStateType(fidelity);

    return {
        type,
        title: repairTitle(type),
        whatHappened: repairWhatHappened(type),
        whyItMatters: repairWhyItMatters(type),
        stillUsefulAs: fidelity.evidenceLevel,
        ctas: fidelity.repairCtas,
        reasonCodes: fidelity.reasonCodes,
    };
}

function collectFidelityReasons(
    session: SprayLabSessionSnapshot,
    events: readonly SprayLabSessionEvent[],
): readonly SprayLabFidelityReasonCode[] {
    const reasons = new Set<SprayLabFidelityReasonCode>(session.problemReasonCodes);

    for (const event of events) {
        for (const reason of event.reasonCodes ?? []) {
            reasons.add(reason);
        }

        if (event.variablesChanged === true) {
            reasons.add('variable_changed');
        }

        if (event.type === 'skip_rep') {
            reasons.add('skipped_reps');
        }

        if (event.type === 'end_early') {
            reasons.add('early_stop');
        }
    }

    if (session.completedReps < session.totalReps && session.status === 'completed') {
        reasons.add('early_stop');
    }

    if (session.lane.supportLevel === 'practice_only' || session.status === 'blocked') {
        reasons.add('capture_blocker');
    }

    if (session.protocol.context.personalizationLimited || session.protocol.context.limitationReasons.length > 0) {
        reasons.add('missing_context');
    }

    if (hasExcessivePause(session, events)) {
        reasons.add('excessive_pause');
    }

    return Array.from(reasons);
}

function component(
    key: SprayLabFidelityComponent['key'],
    label: string,
    score: number,
): SprayLabFidelityComponent {
    const clamped = clampScore(score);

    return {
        key,
        label,
        score: clamped,
        impact: clamped >= 80 ? 'positive' : clamped >= 55 ? 'downgrade' : 'blocker',
    };
}

function preparationScore(
    session: SprayLabSessionSnapshot,
    events: readonly SprayLabSessionEvent[],
    reasonCodes: readonly SprayLabFidelityReasonCode[],
): number {
    const started = events.some((event) => event.type === 'start');
    const ready = events.some((event) => event.type === 'ready');
    const requiredPreparation = session.protocol.preparation.filter((item) => item.required).length;
    const base = started && ready ? 100 : started ? 78 : 55;
    const preparationPenalty = requiredPreparation > 4 ? 0 : 5;
    const missingContextPenalty = reasonCodes.includes('missing_context') ? 20 : 0;

    return base - preparationPenalty - missingContextPenalty;
}

function variableControlScore(reasonCodes: readonly SprayLabFidelityReasonCode[]): number {
    if (reasonCodes.includes('variable_changed')) {
        return 42;
    }

    if (reasonCodes.includes('missing_context')) {
        return 70;
    }

    return 100;
}

function pauseDisciplineScore(
    reasonCodes: readonly SprayLabFidelityReasonCode[],
    events: readonly SprayLabSessionEvent[],
): number {
    if (reasonCodes.includes('excessive_pause')) {
        return 52;
    }

    const pauseCount = events.filter((event) => event.type === 'pause').length;

    return Math.max(70, 100 - pauseCount * 12);
}

function safetyRepairScore(reasonCodes: readonly SprayLabFidelityReasonCode[]): number {
    if (reasonCodes.includes('capture_blocker') || reasonCodes.includes('user_confused')) {
        return 35;
    }

    if (reasonCodes.includes('fatigue_or_pain')) {
        return 68;
    }

    if (reasonCodes.includes('early_stop')) {
        return 72;
    }

    return 100;
}

function manualInterventionScore(manualInterventions: number): number {
    return Math.max(35, 100 - manualInterventions * 15);
}

function countManualInterventions(
    session: SprayLabSessionSnapshot,
    events: readonly SprayLabSessionEvent[],
): number {
    const eventInterventions = events.filter((event) => (
        event.type === 'pause'
        || event.type === 'skip_rep'
        || event.type === 'repeat_rep'
        || event.type === 'report_problem'
        || event.type === 'end_early'
    )).length;

    return Math.max(session.manualInterventionCount, eventInterventions);
}

function hasExcessivePause(
    session: SprayLabSessionSnapshot,
    events: readonly SprayLabSessionEvent[],
): boolean {
    let restStartedAt: string | undefined;
    const restLimitMs = Math.max(30, session.protocol.dose.restBetweenSpraysSeconds)
        * EXCESSIVE_PAUSE_MULTIPLIER
        * 1000;

    for (const event of events) {
        if (event.type === 'rest_start') {
            restStartedAt = event.occurredAt;
            continue;
        }

        if (event.type === 'rest_end' && restStartedAt) {
            const deltaMs = Date.parse(event.occurredAt) - Date.parse(restStartedAt);

            if (Number.isFinite(deltaMs) && deltaMs > restLimitMs) {
                return true;
            }

            restStartedAt = undefined;
        }
    }

    return false;
}

function resolveFidelityTier(input: {
    readonly score: number;
    readonly completedRatio: number;
    readonly reasonCodes: readonly SprayLabFidelityReasonCode[];
    readonly manualInterventions: number;
    readonly sessionStatus: SprayLabSessionSnapshot['status'];
}): SprayLabFidelityTier {
    if (
        input.reasonCodes.includes('capture_blocker')
        || input.reasonCodes.includes('user_confused')
        || input.sessionStatus === 'blocked'
    ) {
        return 'invalid_for_benchmark';
    }

    if (
        input.reasonCodes.includes('fatigue_or_pain')
        || input.reasonCodes.includes('variable_changed')
        || input.reasonCodes.includes('skipped_reps')
        || input.reasonCodes.includes('early_stop')
        || input.score < 70
        || input.completedRatio < 0.75
    ) {
        return 'practice_only';
    }

    if (
        input.score >= 90
        && input.completedRatio >= 1
        && input.manualInterventions === 0
        && input.reasonCodes.length === 0
    ) {
        return 'strong';
    }

    return 'usable';
}

function buildCoachImpactCopy(
    tier: SprayLabFidelityTier,
    reasonCodes: readonly SprayLabFidelityReasonCode[],
): string {
    if (reasonCodes.includes('fatigue_or_pain')) {
        return 'Dor ou fadiga rebaixa a sessao por seguranca; isso nao conta como falha de mira.';
    }

    if (tier === 'strong') {
        return 'Sessao forte para benchmark provisorio e continuidade do coach, ainda pendente de clip compativel.';
    }

    if (tier === 'usable') {
        return 'Sessao utilizavel como evidencia fraca; o coach pode adaptar dose sem promover conclusao forte.';
    }

    if (tier === 'practice_only') {
        return 'Sessao fica como pratica ou reparo; nao deve alimentar benchmark forte.';
    }

    return 'Sessao invalida para benchmark; use os blockers para reparar antes de validar.';
}

function buildRepairCtas(
    reasonCodes: readonly SprayLabFidelityReasonCode[],
    tier: SprayLabFidelityTier,
): readonly string[] {
    const ctas = new Set<string>();

    if (reasonCodes.includes('fatigue_or_pain')) {
        ctas.add('Reduza a dose e encerre se o desconforto continuar.');
    }

    if (reasonCodes.includes('variable_changed')) {
        ctas.add('Repita o bloco sem trocar variavel ou salve apenas como pratica.');
    }

    if (reasonCodes.includes('skipped_reps')) {
        ctas.add('Refaca a rep pulada antes de contar como benchmark.');
    }

    if (reasonCodes.includes('excessive_pause')) {
        ctas.add('Reinicie com pausas parecidas com a dose planejada.');
    }

    if (reasonCodes.includes('capture_blocker')) {
        ctas.add('Grave uma captura continua e limpa antes de validar tecnicamente.');
    }

    if (reasonCodes.includes('missing_context')) {
        ctas.add('Complete arma, mira, distancia e variaveis antes de comparar contexto.');
    }

    if (reasonCodes.includes('user_confused')) {
        ctas.add('Volte para a preparacao e execute uma lane mais simples.');
    }

    if (ctas.size === 0 && tier !== 'strong') {
        ctas.add('Grave uma validacao compativel antes de consolidar o indice.');
    }

    return Array.from(ctas);
}

function resolveRepairStateType(fidelity: SprayLabFidelityReport): SprayLabRepairStateType {
    if (fidelity.reasonCodes.includes('capture_blocker')) {
        return 'captura_fraca';
    }

    if (fidelity.reasonCodes.includes('missing_context') || fidelity.reasonCodes.includes('variable_changed')) {
        return 'contexto_incompativel';
    }

    if (fidelity.reasonCodes.includes('user_confused')) {
        return 'clip_inconclusivo';
    }

    if (!fidelity.benchmarkEligible) {
        return 'nao_contou_como_benchmark';
    }

    return 'tentativa_salva_como_pratica';
}

function repairTitle(type: SprayLabRepairStateType): string {
    switch (type) {
        case 'validacao_bloqueada':
            return 'Validacao bloqueada';
        case 'clip_inconclusivo':
            return 'Clip inconclusivo';
        case 'captura_fraca':
            return 'Captura fraca';
        case 'contexto_incompativel':
            return 'Contexto incompativel';
        case 'nao_contou_como_benchmark':
            return 'Nao contou como benchmark';
        case 'tentativa_salva_como_pratica':
            return 'Tentativa salva como pratica';
    }
}

function repairWhatHappened(type: SprayLabRepairStateType): string {
    switch (type) {
        case 'validacao_bloqueada':
            return 'A sessao nao tem evidencia suficiente para abrir validacao forte.';
        case 'clip_inconclusivo':
            return 'A execucao ficou confusa ou inconclusiva para comparar.';
        case 'captura_fraca':
            return 'A captura ou a execucao nao sustentou leitura tecnica.';
        case 'contexto_incompativel':
            return 'Alguma variavel central mudou ou ficou ausente.';
        case 'nao_contou_como_benchmark':
            return 'A sessao foi util como pratica, mas ficou abaixo do contrato de benchmark.';
        case 'tentativa_salva_como_pratica':
            return 'A tentativa foi preservada como pratica com evidencia fraca.';
    }
}

function repairWhyItMatters(type: SprayLabRepairStateType): string {
    switch (type) {
        case 'validacao_bloqueada':
        case 'nao_contou_como_benchmark':
            return 'Benchmark forte exige fidelidade suficiente e contexto comparavel.';
        case 'clip_inconclusivo':
            return 'Conclusao tecnica sobre mira precisa de execucao repetivel.';
        case 'captura_fraca':
            return 'Sem captura limpa, o Lab nao deve promover leitura forte.';
        case 'contexto_incompativel':
            return 'Contextos diferentes nao podem virar uma unica linha global.';
        case 'tentativa_salva_como_pratica':
            return 'Pratica ajuda o treino, mas nao substitui clip compativel.';
    }
}

function roundedAverage(values: readonly number[]): number {
    if (values.length === 0) {
        return 0;
    }

    return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function clampScore(value: number): number {
    return Math.max(0, Math.min(100, Math.round(value)));
}
