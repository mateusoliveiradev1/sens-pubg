import type {
    AnalysisDecisionLevel,
    AnalysisResult,
    CoachDecisionTier,
    CoachFocusArea,
    CoachPlan,
    CompleteTrainingProtocol,
    TrainingProtocolContextSnapshot,
    TrainingProtocolDose,
    TrainingProtocolDowngrade,
    TrainingProtocolDowngradeReasonCode,
    TrainingProtocolDrillId,
    TrainingProtocolPreparationItem,
    TrainingProtocolTransferPlan,
    TrainingProtocolValidationPlan,
} from '../types/engine';
import type { CoachMemorySnapshot } from './coach-memory';
import {
    adaptTrainingProtocolDoseForContext,
    buildTrainingProtocolContextSnapshot,
    getTrainingProtocolDrill,
    selectTrainingProtocolDrillId,
} from './training-protocol-drills';

export interface BuildCompleteTrainingProtocolInput {
    readonly analysisResult?: AnalysisResult;
    readonly coachPlanBase: Omit<CoachPlan, 'completeProtocol'>;
    readonly memorySnapshot?: CoachMemorySnapshot;
}

export interface ResolveTrainingProtocolDowngradeReasonsInput {
    readonly analysisResult?: AnalysisResult;
    readonly coachPlanBase: Omit<CoachPlan, 'completeProtocol'>;
    readonly memorySnapshot?: CoachMemorySnapshot;
    readonly context?: TrainingProtocolContextSnapshot;
    readonly reportedFatigueOrPain?: boolean;
    readonly variableChanged?: boolean;
}

export function buildCompleteTrainingProtocol(
    input: BuildCompleteTrainingProtocolInput,
): CompleteTrainingProtocol {
    const context = buildTrainingProtocolContextSnapshot({
        ...(input.analysisResult ? { analysisResult: input.analysisResult } : {}),
        calibrationLimited: input.analysisResult?.analysisDecision?.level === 'partial_safe_read',
    });
    const downgradeReasons = resolveTrainingProtocolDowngradeReasons({
        coachPlanBase: input.coachPlanBase,
        ...(input.analysisResult ? { analysisResult: input.analysisResult } : {}),
        ...(input.memorySnapshot ? { memorySnapshot: input.memorySnapshot } : {}),
        context,
    });
    const tier = resolveProtocolTierAfterDowngrade(input.coachPlanBase.tier, downgradeReasons);
    const drillId = selectTrainingProtocolDrillId({
        primaryFocusArea: input.coachPlanBase.primaryFocus.area,
        tier,
    });
    const drill = getTrainingProtocolDrill(drillId);
    const dose = doseForTrainingProtocolTier(tier, drillId, context);
    const downgrade = buildTrainingProtocolDowngrade({
        tierBefore: input.coachPlanBase.tier,
        tierAfter: tier,
        reasons: downgradeReasons,
        context,
    });
    const preparation = buildTrainingProtocolPreparation(
        input.coachPlanBase.primaryFocus.area,
        tier,
        downgradeReasons,
    );
    const validation = buildTrainingProtocolValidationPlan({
        tier,
        drillId,
        context,
        coachPlanBase: input.coachPlanBase,
        downgradeReasons,
    });
    const transfer = buildTrainingProtocolTransferPlan({
        tier,
        drillId,
        context,
        primaryFocusArea: input.coachPlanBase.primaryFocus.area,
    });
    const antiMixingNotes = buildAntiMixingNotes(input.coachPlanBase);

    return {
        version: 'complete-protocol-v1',
        id: buildProtocolId(input.analysisResult?.id, drillId, tier),
        drillId,
        tier,
        title: titleForProtocol(tier, input.coachPlanBase.primaryFocus.area),
        summary: summaryForProtocol(tier, input.coachPlanBase.primaryFocus.area, downgradeReasons),
        environment: drill.environment,
        context,
        objective: drill.objective,
        dose,
        target: buildProtocolTarget(drill.target, context),
        executionSteps: drill.executionSteps,
        preparation,
        validation,
        transfer,
        downgrade,
        audit: {
            createdAt: input.analysisResult?.timestamp.toISOString() ?? new Date(0).toISOString(),
            ...(input.analysisResult?.analysisDecision?.level ? {
                analysisDecisionLevel: input.analysisResult.analysisDecision.level,
            } : {}),
            primaryFocusArea: input.coachPlanBase.primaryFocus.area,
            secondaryFocusAreas: input.coachPlanBase.secondaryFocuses.map((focus) => focus.area),
            confidence: roundedUnit(input.coachPlanBase.primaryFocus.confidence),
            coverage: roundedUnit(input.coachPlanBase.primaryFocus.coverage),
            source: 'deterministic_coach',
        },
        stopConditions: buildProtocolStopConditions(tier, downgradeReasons),
        continueCriteria: buildContinueCriteria(tier, validation),
        antiMixingNotes,
        freeSummary: buildFreeSummary(tier, dose, input.coachPlanBase.primaryFocus.area, preparation, validation),
        proSections: [
            'Ambiente, arma, mira e distancia completos',
            'Dose com reps, pausas e criterio de parada',
            'Preparacao contextual e controle de variaveis',
            'Validacao compativel e transferencia conservadora',
            'Auditoria de blockers, downgrades e fatos usados',
        ],
        llmRewriteAllowed: false,
    };
}

export function resolveTrainingProtocolDowngradeReasons(
    input: ResolveTrainingProtocolDowngradeReasonsInput,
): readonly TrainingProtocolDowngradeReasonCode[] {
    const reasons: TrainingProtocolDowngradeReasonCode[] = [];
    const decision = input.analysisResult?.analysisDecision;
    const context = input.context ?? buildTrainingProtocolContextSnapshot({
        ...(input.analysisResult ? { analysisResult: input.analysisResult } : {}),
    });

    reasons.push(...decisionDowngradeReasons(decision?.level));

    if (decision?.blockerReasons.includes('low_confidence') || input.coachPlanBase.primaryFocus.confidence < 0.6) {
        reasons.push('low_confidence');
    }

    if (decision?.blockerReasons.includes('low_coverage') || input.coachPlanBase.primaryFocus.coverage < 0.6) {
        reasons.push('low_coverage');
    }

    reasons.push(...context.limitationReasons);

    if (hasOutcomeConflict(input.memorySnapshot)) {
        reasons.push('outcome_conflict');
    }

    if (input.reportedFatigueOrPain === true || hasCoachBlocker(input.coachPlanBase, 'fatigue_or_pain')) {
        reasons.push('fatigue_or_pain');
    }

    if (input.variableChanged === true || hasCoachBlocker(input.coachPlanBase, 'variable_changed')) {
        reasons.push('variable_changed');
    }

    if (
        input.coachPlanBase.tier === 'apply_protocol'
        && !canApplyCompleteProtocol(input.analysisResult?.analysisDecision?.level, input.memorySnapshot)
    ) {
        reasons.push('insufficient_compatible_validation');
    }

    return uniqueReasons(reasons);
}

export function doseForTrainingProtocolTier(
    tier: CoachDecisionTier,
    drillId: TrainingProtocolDrillId,
    context: TrainingProtocolContextSnapshot,
): TrainingProtocolDose {
    return adaptTrainingProtocolDoseForContext({ tier, drillId, context });
}

export function buildTrainingProtocolPreparation(
    focusArea: CoachFocusArea,
    tier: CoachDecisionTier,
    downgradeReasons: readonly TrainingProtocolDowngradeReasonCode[] = [],
): readonly TrainingProtocolPreparationItem[] {
    const items: TrainingProtocolPreparationItem[] = [
        {
            id: 'fixed-variables',
            label: 'Fixe arma, mira, distancia, postura, acessorios e sensibilidade antes do bloco.',
            reason: 'O protocolo so mede uma variavel quando o resto fica igual.',
            required: true,
            safetyKind: 'variable_control',
        },
        {
            id: 'repeatable-posture',
            label: 'Use a mesma postura e o mesmo ponto de apoio em todos os sprays.',
            reason: 'Postura repetivel reduz ruido sem transformar isso em conselho fisico sensivel.',
            required: true,
            safetyKind: 'setup_control',
        },
        {
            id: 'planned-pauses',
            label: 'Respeite as pausas entre sprays e encerre quando a execucao degradar.',
            reason: 'Pausa mantem a validacao mais limpa e evita confundir cansaco com erro tecnico.',
            required: tier !== 'capture_again',
            safetyKind: 'rest',
        },
        {
            id: 'pain-stop-rule',
            label: 'Pare se houver dor, dormencia, formigamento ou desconforto forte.',
            reason: 'Isso rebaixa o bloco para seguranca/aprendizado e nao conta como falha de mira.',
            required: true,
            safetyKind: 'stop_rule',
        },
    ];

    if (focusArea === 'vertical_control') {
        items.unshift({
            id: 'pull-space',
            label: 'Deixe espaco livre no mousepad para puxar para baixo.',
            reason: 'Controle vertical depende de espaco consistente para a puxada.',
            required: true,
            safetyKind: 'setup_control',
        });
    }

    if (focusArea === 'horizontal_control') {
        items.unshift({
            id: 'relaxed-grip',
            label: 'Comece com pegada repetivel e antebraco relaxado.',
            reason: 'Tensao lateral pode virar drift ou tremor horizontal.',
            required: true,
            safetyKind: 'setup_control',
        });
    }

    if (focusArea === 'capture_quality' || downgradeReasons.includes('invalid_clip')) {
        items.unshift({
            id: 'recording-setup',
            label: 'Cheque nitidez, reticulo visivel e alvo unico antes de gravar.',
            reason: 'Sem captura limpa, o coach nao deve escolher treino forte.',
            required: true,
            safetyKind: 'setup_control',
        });
    }

    return items;
}

export function buildTrainingProtocolValidationPlan(input: {
    readonly tier: CoachDecisionTier;
    readonly drillId: TrainingProtocolDrillId;
    readonly context: TrainingProtocolContextSnapshot;
    readonly coachPlanBase: Omit<CoachPlan, 'completeProtocol'>;
    readonly downgradeReasons?: readonly TrainingProtocolDowngradeReasonCode[];
}): TrainingProtocolValidationPlan {
    const drill = getTrainingProtocolDrill(input.drillId);
    const minimumConfidence = threshold(input.coachPlanBase.primaryFocus.confidence);
    const minimumCoverage = threshold(input.coachPlanBase.primaryFocus.coverage);
    const compatibleClipChecklist = [
        sameOrMissing('Arma', input.context.weaponName ?? input.context.weaponId),
        sameOrMissing('Mira', input.context.opticName ?? input.context.opticId),
        sameOrMissing('Distancia', formatDistance(input.context)),
        sameOrMissing('Postura', input.context.stance),
        'Mesmos acessorios, sensibilidade, DPI, VSM, FOV e patch quando disponiveis.',
        'Mesmo tipo de spray, duracao aproximada e preparacao/control variables iguais.',
    ];
    const conservativeSuccess = input.tier === 'apply_protocol'
        ? 'Pode consolidar apenas depois de clip compativel forte e sem conflito.'
        : 'Sinal promissor: mantenha como teste ate a validacao compativel confirmar.';

    return {
        compatibleClipChecklist,
        minimumConfidence,
        minimumCoverage,
        successCriteria: [
            ...drill.successCriteria,
            conservativeSuccess,
        ],
        failCriteria: [
            ...drill.failCriteria,
            'Falha se dor, dormencia, formigamento, cansaco forte ou troca de variavel contaminar o bloco.',
        ],
        variableControlChecklist: [
            'Nao mudar sensibilidade durante o bloco.',
            'Nao trocar acessorio, arma, mira, postura ou distancia no mesmo teste.',
            'Registrar qualquer variavel alterada como blocker antes de comparar.',
        ],
        nextClipCopy: nextClipCopy(input.tier, drill.validationTarget, input.downgradeReasons ?? []),
    };
}

export function buildTrainingProtocolTransferPlan(input: {
    readonly tier: CoachDecisionTier;
    readonly drillId: TrainingProtocolDrillId;
    readonly context: TrainingProtocolContextSnapshot;
    readonly primaryFocusArea: CoachFocusArea;
}): TrainingProtocolTransferPlan {
    const focus = focusLabel(input.primaryFocusArea);
    const drill = getTrainingProtocolDrill(input.drillId);

    return {
        situationChecklist: [
            `Use em TDM/partida apenas quando aparecer spray parecido de ${focus}.`,
            sameOrMissing('Arma/mira', [input.context.weaponName, input.context.opticName].filter(Boolean).join(' + ')),
            sameOrMissing('Distancia aproximada', formatDistance(input.context)),
            'Marque se segurou o padrao, se corrigiu demais ou se a pressao da partida mudou a execucao.',
            `Compare contra o alvo do drill: ${drill.validationTarget}.`,
        ],
        conservativeConfidenceCopy: 'Transferencia em partida e evidencia pratica. Ela ajuda o coach, mas nao substitui clip compativel controlado.',
        countsAsTechnicalValidation: false,
    };
}

function buildTrainingProtocolDowngrade(input: {
    readonly tierBefore: CoachDecisionTier;
    readonly tierAfter: CoachDecisionTier;
    readonly reasons: readonly TrainingProtocolDowngradeReasonCode[];
    readonly context: TrainingProtocolContextSnapshot;
}): TrainingProtocolDowngrade {
    return {
        tierBefore: input.tierBefore,
        tierAfter: input.tierAfter,
        reasons: input.reasons,
        blockedFields: blockedFieldsForReasons(input.reasons),
        repairCtas: repairCtasForReasons(input.reasons, input.context),
        userCopy: input.reasons.length > 0
            ? 'A ficha continua util, mas ficou mais conservadora ate resolver os blockers de evidencia.'
            : 'Sem downgrade: a ficha segue o nivel deterministico do coach.',
    };
}

function resolveProtocolTierAfterDowngrade(
    tier: CoachDecisionTier,
    reasons: readonly TrainingProtocolDowngradeReasonCode[],
): CoachDecisionTier {
    if (reasons.includes('invalid_clip')) {
        return 'capture_again';
    }

    if (reasons.includes('partial_safe_read') || reasons.includes('low_confidence') || reasons.includes('low_coverage')) {
        return 'test_protocol';
    }

    if (
        tier === 'apply_protocol'
        && (
            reasons.includes('insufficient_compatible_validation')
            || reasons.includes('outcome_conflict')
            || reasons.includes('fatigue_or_pain')
            || reasons.includes('variable_changed')
            || reasons.includes('limited_weapon_support')
        )
    ) {
        return 'test_protocol';
    }

    return tier;
}

function decisionDowngradeReasons(
    level: AnalysisDecisionLevel | undefined,
): readonly TrainingProtocolDowngradeReasonCode[] {
    switch (level) {
        case 'blocked_invalid_clip':
        case 'inconclusive_recapture':
            return ['invalid_clip'];
        case 'partial_safe_read':
            return ['partial_safe_read'];
        case 'usable_analysis':
        case 'strong_analysis':
        case undefined:
            return [];
    }
}

function canApplyCompleteProtocol(
    level: AnalysisDecisionLevel | undefined,
    memorySnapshot: CoachMemorySnapshot | undefined,
): boolean {
    if (level !== 'strong_analysis') {
        return false;
    }

    if (!memorySnapshot || hasOutcomeConflict(memorySnapshot)) {
        return false;
    }

    const outcomeMemory = memorySnapshot.outcomeMemory;
    const hasConfirmedStrictOutcome = outcomeMemory.activeLayer === 'strict_compatible'
        && outcomeMemory.confirmedCount > 0
        && outcomeMemory.conflictCount === 0
        && outcomeMemory.repeatedFailureCount === 0;
    const trend = memorySnapshot.precisionTrend;
    const hasValidatedPrecisionTrend = trend?.label === 'validated_progress'
        && trend.evidenceLevel === 'strong'
        && trend.compatibleCount >= 3;

    return hasConfirmedStrictOutcome || hasValidatedPrecisionTrend;
}

function hasOutcomeConflict(memorySnapshot: CoachMemorySnapshot | undefined): boolean {
    return Boolean(
        memorySnapshot
        && (
            memorySnapshot.conflictingFocusAreas.length > 0
            || memorySnapshot.outcomeMemory.conflictCount > 0
            || memorySnapshot.outcomeMemory.repeatedFailureCount > 0
        ),
    );
}

function hasCoachBlocker(
    coachPlanBase: Omit<CoachPlan, 'completeProtocol'>,
    blocker: string,
): boolean {
    return [
        coachPlanBase.primaryFocus,
        ...coachPlanBase.secondaryFocuses,
    ].some((focus) => (
        focus.blockedBy.includes(blocker)
        || focus.signals.some((signal) => (
            signal.key.includes(blocker)
            || signal.summary.toLowerCase().includes(blocker.replace(/_/g, ' '))
        ))
    ));
}

function blockedFieldsForReasons(
    reasons: readonly TrainingProtocolDowngradeReasonCode[],
): readonly string[] {
    const fields = new Set<string>();

    if (reasons.includes('missing_distance')) {
        fields.add('distance-dependent criteria');
    }

    if (reasons.includes('missing_optic')) {
        fields.add('optic-specific execution');
    }

    if (reasons.includes('missing_attachment')) {
        fields.add('attachment experiment');
    }

    if (reasons.includes('limited_weapon_support')) {
        fields.add('weapon-specific fine target');
    }

    if (reasons.includes('insufficient_compatible_validation')) {
        fields.add('apply-strength validation');
    }

    return Array.from(fields);
}

function repairCtasForReasons(
    reasons: readonly TrainingProtocolDowngradeReasonCode[],
    context: TrainingProtocolContextSnapshot,
): readonly string[] {
    const ctas = new Set<string>();

    if (reasons.includes('invalid_clip')) {
        ctas.add('Grave uma captura limpa antes de testar mudanca tecnica.');
    }

    if (reasons.includes('missing_distance')) {
        ctas.add('Informe ou grave uma distancia comparavel antes de validar criterios finos.');
    }

    if (reasons.includes('missing_optic')) {
        ctas.add('Mantenha a mesma mira e registre o optic no proximo clip.');
    }

    if (reasons.includes('missing_attachment')) {
        ctas.add('Registre muzzle, grip e stock antes de testar loadout.');
    }

    if (reasons.includes('outcome_conflict') || reasons.includes('insufficient_compatible_validation')) {
        ctas.add('Grave um clip compativel curto antes de promover o protocolo.');
    }

    if (reasons.includes('fatigue_or_pain')) {
        ctas.add('Reduza a dose e encerre o bloco se o desconforto continuar.');
    }

    if (reasons.includes('variable_changed')) {
        ctas.add('Repita sem trocar variavel ou salve como aprendizado nao tecnico.');
    }

    if (reasons.includes('limited_weapon_support') && context.limitedSupportReason) {
        ctas.add('Use o foco do drill sem prometer alvo fino especifico da arma.');
    }

    return Array.from(ctas);
}

function buildAntiMixingNotes(
    coachPlanBase: Omit<CoachPlan, 'completeProtocol'>,
): readonly string[] {
    const secondaryNotes = coachPlanBase.secondaryFocuses.map((focus) => (
        `${focus.title}: fica como observacao, nao como segundo drill no mesmo bloco.`
    ));

    return [
        'Execute um protocolo por vez, guiado pelo foco primario.',
        'Nao misture sensibilidade, acessorio, mira, postura ou distancia na mesma validacao.',
        ...secondaryNotes,
    ];
}

function buildProtocolTarget(target: string, context: TrainingProtocolContextSnapshot): string {
    const parts = [
        target,
        context.weaponName ? `Arma: ${context.weaponName}.` : undefined,
        context.opticName ? `Mira: ${context.opticName}.` : undefined,
        formatDistance(context) ? `Distancia: ${formatDistance(context)}.` : undefined,
    ].filter((part): part is string => Boolean(part));

    return parts.join(' ');
}

function buildProtocolStopConditions(
    tier: CoachDecisionTier,
    reasons: readonly TrainingProtocolDowngradeReasonCode[],
): readonly string[] {
    const stopConditions = [
        'Pare se a captura cair abaixo da confianca ou cobertura minima.',
        'Pare se arma, mira, distancia, postura, acessorio ou sensibilidade mudarem durante o bloco.',
        'Pare se houver dor, dormencia, formigamento, desconforto forte ou cansaco que mude a execucao.',
    ];

    if (tier === 'capture_again' || reasons.includes('invalid_clip')) {
        return [
            'Pare se o novo video continuar sem reticulo visivel, alvo unico ou spray sustentado.',
            ...stopConditions,
        ];
    }

    return stopConditions;
}

function buildContinueCriteria(
    tier: CoachDecisionTier,
    validation: TrainingProtocolValidationPlan,
): readonly string[] {
    if (tier === 'apply_protocol') {
        return [
            'Continue apenas se o clip compativel passar confianca/cobertura minima.',
            validation.successCriteria[0] ?? 'Continue quando o criterio principal melhorar sem conflito.',
            'Proximo passo ainda precisa respeitar a mesma variavel controlada.',
        ];
    }

    return [
        'Continue se o bloco gerar sinal claro sem trocar variavel.',
        'Use o proximo clip compativel antes de subir agressividade.',
    ];
}

function buildFreeSummary(
    tier: CoachDecisionTier,
    dose: TrainingProtocolDose,
    focusArea: CoachFocusArea,
    preparation: readonly TrainingProtocolPreparationItem[],
    validation: TrainingProtocolValidationPlan,
): readonly string[] {
    return [
        `${focusLabel(focusArea)} por ${dose.durationMinutes} min em modo ${tierLabel(tier)}.`,
        preparation[0]?.label ?? 'Fixe as variaveis antes do bloco.',
        validation.nextClipCopy,
    ];
}

function titleForProtocol(tier: CoachDecisionTier, focusArea: CoachFocusArea): string {
    return `${tierLabel(tier)} de ${focusLabel(focusArea)}`;
}

function summaryForProtocol(
    tier: CoachDecisionTier,
    focusArea: CoachFocusArea,
    reasons: readonly TrainingProtocolDowngradeReasonCode[],
): string {
    const suffix = reasons.length > 0
        ? ' com downgrade honesto pelos blockers atuais'
        : ' com validacao controlada';

    return `Ficha pratica de ${focusLabel(focusArea)} em nivel ${tierLabel(tier)}${suffix}.`;
}

function nextClipCopy(
    tier: CoachDecisionTier,
    validationTarget: string,
    reasons: readonly TrainingProtocolDowngradeReasonCode[],
): string {
    if (reasons.includes('invalid_clip')) {
        return 'Grave primeiro um clip limpo e compativel para liberar leitura tecnica.';
    }

    if (tier === 'apply_protocol') {
        return `Grave o proximo clip do mesmo contexto para confirmar: ${validationTarget}.`;
    }

    return `Grave o proximo clip assim para validar sem forcar conclusao: ${validationTarget}.`;
}

function sameOrMissing(label: string, value: string | number | undefined): string {
    if (value === undefined || value === '') {
        return `${label}: manter igual ao clip quando souber; se nao souber, marque como blocker.`;
    }

    return `${label}: ${value}.`;
}

function formatDistance(context: TrainingProtocolContextSnapshot): string | undefined {
    if (context.distanceMeters === undefined) {
        return undefined;
    }

    return context.distanceMode === 'estimated' || context.distanceMode === 'estimated_range'
        ? `${context.distanceMeters}m estimados`
        : `${context.distanceMeters}m`;
}

function focusLabel(area: CoachFocusArea): string {
    switch (area) {
        case 'capture_quality':
            return 'qualidade da captura';
        case 'vertical_control':
            return 'controle vertical';
        case 'horizontal_control':
            return 'controle horizontal';
        case 'timing':
            return 'tempo de resposta';
        case 'consistency':
            return 'consistencia';
        case 'sensitivity':
            return 'sensibilidade';
        case 'loadout':
            return 'equipamento';
        case 'validation':
            return 'validacao';
    }
}

function tierLabel(tier: CoachDecisionTier): string {
    switch (tier) {
        case 'capture_again':
            return 'recaptura guiada';
        case 'test_protocol':
            return 'teste curto';
        case 'stabilize_block':
            return 'estabilizacao';
        case 'apply_protocol':
            return 'aplicacao controlada';
    }
}

function buildProtocolId(
    analysisResultId: string | undefined,
    drillId: TrainingProtocolDrillId,
    tier: CoachDecisionTier,
): string {
    return [
        'complete-protocol-v1',
        analysisResultId ?? 'unsaved',
        drillId,
        tier,
    ].join(':');
}

function threshold(value: number): number {
    return Number(Math.min(0.9, Math.max(0.65, value)).toFixed(2));
}

function roundedUnit(value: number): number {
    if (!Number.isFinite(value)) {
        return 0;
    }

    return Number(Math.max(0, Math.min(1, value)).toFixed(3));
}

function uniqueReasons(
    reasons: readonly TrainingProtocolDowngradeReasonCode[],
): readonly TrainingProtocolDowngradeReasonCode[] {
    return Array.from(new Set(reasons));
}
