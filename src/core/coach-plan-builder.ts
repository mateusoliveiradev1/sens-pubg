import type {
    AnalysisResult,
    CoachActionProtocol,
    CoachBlockPlan,
    CoachDecisionTier,
    CoachFocusArea,
    CoachPlan,
    CoachPriority,
    CoachValidationCheck,
    ProfileType,
} from '../types/engine';
import type { CoachMemorySnapshot } from './coach-memory';
import { extractCoachMemorySignals } from './coach-memory';
import { rankCoachPriorities } from './coach-priority-engine';
import { extractCoachSignals } from './coach-signal-extractor';

export interface BuildCoachPlanInput {
    readonly analysisResult?: AnalysisResult;
    readonly memorySnapshot?: CoachMemorySnapshot;
}

export interface ResolveCoachDecisionTierInput {
    readonly analysisResult: AnalysisResult | undefined;
    readonly primaryFocus: CoachPriority;
    readonly priorities: readonly CoachPriority[];
    readonly memorySnapshot?: CoachMemorySnapshot;
}

export function buildCoachPlan(input: BuildCoachPlanInput = {}): CoachPlan {
    const priorities = input.analysisResult
        ? rankCoachPriorities({
            signals: [
                ...extractCoachSignals({ analysisResult: input.analysisResult }),
                ...extractCoachMemorySignals(input.memorySnapshot),
            ],
        })
        : [];
    const primaryFocus = priorities[0] ?? {
        id: 'contract-primary-focus',
        area: 'validation' as const,
        title: 'Validar o proximo bloco do coach',
        whyNow: 'Sem sinais suficientes ainda; este bloco existe para validar o contrato do plano.',
        priorityScore: 0,
        severity: 0,
        confidence: 0,
        coverage: 0,
        dependencies: [],
        blockedBy: [],
        signals: [],
    };

    const tier = resolveCoachDecisionTier({
        analysisResult: input.analysisResult,
        primaryFocus,
        priorities,
        ...(input.memorySnapshot ? { memorySnapshot: input.memorySnapshot } : {}),
    });

    return {
        tier,
        sessionSummary: buildSessionSummary({ tier, primaryFocus, priorityCount: priorities.length }),
        primaryFocus,
        secondaryFocuses: priorities.slice(1, 3),
        actionProtocols: buildActionProtocols({
            tier,
            primaryFocus,
            analysisResult: input.analysisResult,
            ...(input.memorySnapshot ? { memorySnapshot: input.memorySnapshot } : {}),
        }),
        nextBlock: buildNextBlockPlan({ tier, primaryFocus }),
        stopConditions: buildStopConditions({ tier, primaryFocus }),
        adaptationWindowDays: buildAdaptationWindow(tier),
        llmRewriteAllowed: false,
    };
}

export function buildActionProtocols(input: {
    readonly tier: CoachDecisionTier;
    readonly primaryFocus: CoachPriority;
    readonly analysisResult: AnalysisResult | undefined;
    readonly memorySnapshot?: CoachMemorySnapshot;
}): readonly CoachActionProtocol[] {
    const { tier, primaryFocus, analysisResult, memorySnapshot } = input;

    if (tier === 'capture_again') {
        return [{
            id: 'capture-retry-protocol',
            kind: 'capture',
            instruction: 'Grave um spray limpo com a mesma arma, mira, distancia e postura antes de mudar configuracoes.',
            expectedEffect: 'Melhora a cobertura do rastreio para a proxima decisao do coach usar evidencia mais forte.',
            risk: 'low',
            applyWhen: 'Use antes de qualquer mudanca de sensibilidade ou equipamento quando a captura estiver bloqueando a leitura.',
            avoidWhen: 'Evite mudar a sensibilidade ate a captura ficar usavel para analise.',
        }];
    }

    if (primaryFocus.area === 'sensitivity' && tier === 'apply_protocol') {
        const recommendedProfile = analysisResult?.sensitivity.recommended ?? 'balanced';
        const suggestedVsm = analysisResult?.sensitivity.suggestedVSM;
        const vsmInstruction = typeof suggestedVsm === 'number'
            ? ` e deixe o VSM perto de ${suggestedVsm.toFixed(2)}`
            : '';

        return [{
            id: 'sensitivity-apply-protocol',
            kind: 'sens',
            instruction: `Aplique o perfil de sensibilidade ${profileLabel(recommendedProfile)}${vsmInstruction}; depois mantenha todas as outras variaveis fixas no bloco.`,
            expectedEffect: 'Testa a mudanca recomendada de sensibilidade sem misturar ruido de captura, postura, mira ou equipamento.',
            risk: 'medium',
            applyWhen: 'Use quando a captura estiver usavel, a evidencia de sensibilidade for forte e a prioridade estiver desbloqueada.',
            avoidWhen: 'Evite empilhar outra mudanca de sensibilidade antes de completar o bloco de validacao.',
        }];
    }

    if (tier === 'stabilize_block') {
        return [{
            id: 'stability-drill-protocol',
            kind: 'drill',
            instruction: 'Repita sprays com a mesma configuracao e foque em igualar os dez primeiros tiros antes de julgar a sensibilidade.',
            expectedEffect: 'Reduz a variacao entre tentativas para que a decisao de sensibilidade nao nasca de ruido.',
            risk: 'low',
            applyWhen: 'Use quando a consistencia for o foco dominante e a captura estiver usavel.',
            avoidWhen: 'Evite mudar a sensibilidade durante o bloco de estabilizacao.',
        }];
    }

    return [applyMemoryProtocolContext(protocolForFocus(primaryFocus), primaryFocus, memorySnapshot)];
}

export function buildNextBlockPlan(input: {
    readonly tier: CoachDecisionTier;
    readonly primaryFocus: CoachPriority;
}): CoachBlockPlan {
    const { tier, primaryFocus } = input;

    return {
        title: nextBlockTitle(tier, primaryFocus),
        durationMinutes: durationForTier(tier),
        steps: stepsForTier(tier, primaryFocus),
        checks: [validationCheckForFocus(primaryFocus)],
    };
}

export function buildStopConditions(input: {
    readonly tier: CoachDecisionTier;
    readonly primaryFocus: CoachPriority;
}): readonly string[] {
    const { tier, primaryFocus } = input;

    if (tier === 'capture_again') {
        return [
            'Pare se a captura continuar inutil para analise; grave novamente antes de testar sensibilidade.',
            'Pare se a visibilidade da mira ou a compressao impedir rastreio estavel.',
        ];
    }

    if (tier === 'apply_protocol') {
        return [
            'Pare se o proximo video cair abaixo da cobertura ou confianca minima.',
            'Pare se o primeiro bloco de validacao piorar antes de fazer outra mudanca.',
        ];
    }

    if (tier === 'stabilize_block') {
        return [
            'Pare se os sprays variarem tanto que o mesmo erro nao se repete.',
            'Pare se cansaco ou mudanca de configuracao invalidar a comparacao entre tentativas.',
        ];
    }

    return [
        `Pare se ${focusLabel(primaryFocus)} deixar de ser o sinal dominante repetido.`,
        'Pare se captura, mira, distancia ou postura mudarem durante o bloco de teste.',
    ];
}

export function buildAdaptationWindow(tier: CoachDecisionTier): number {
    switch (tier) {
        case 'capture_again':
            return 1;
        case 'test_protocol':
            return 2;
        case 'stabilize_block':
            return 3;
        case 'apply_protocol':
            return 5;
    }
}

export function resolveCoachDecisionTier(input: ResolveCoachDecisionTierInput): CoachDecisionTier {
    const decisionOverride = resolveDecisionTierOverride(input.analysisResult?.analysisDecision);
    if (decisionOverride) {
        return decisionOverride;
    }

    if (captureCannotSupportAnalysis(input)) {
        return 'capture_again';
    }

    if (hasConflictingSensitivityHistory(input.analysisResult)) {
        return 'test_protocol';
    }

    if (hasConflictingCoachMemory(input.memorySnapshot)) {
        return 'test_protocol';
    }

    if (hasOutcomeFailureMemory(input.memorySnapshot)) {
        return 'test_protocol';
    }

    if (shouldStabilizeFromMemory(input)) {
        return 'stabilize_block';
    }

    if (shouldStabilizeBlock(input.primaryFocus)) {
        return 'stabilize_block';
    }

    if (shouldApplyProtocol(input)) {
        return 'apply_protocol';
    }

    return 'test_protocol';
}

function resolveDecisionTierOverride(
    decision: AnalysisResult['analysisDecision'] | undefined,
): CoachDecisionTier | null {
    switch (decision?.level) {
        case 'blocked_invalid_clip':
        case 'inconclusive_recapture':
            return 'capture_again';
        case 'partial_safe_read':
            return 'test_protocol';
        case 'usable_analysis':
        case 'strong_analysis':
        case undefined:
            return null;
    }
}

function captureCannotSupportAnalysis(input: ResolveCoachDecisionTierInput): boolean {
    const { analysisResult, primaryFocus, priorities } = input;

    return analysisResult?.videoQualityReport?.usableForAnalysis === false
        || analysisResult?.sensitivity.tier === 'capture_again'
        || hasSignal(primaryFocus, 'video_quality.unusable')
        || priorities.some((priority) => (
            priority.area === 'sensitivity'
            && priority.blockedBy.includes('capture_quality')
        ));
}

function hasConflictingSensitivityHistory(analysisResult: AnalysisResult | undefined): boolean {
    return analysisResult?.sensitivity.historyConvergence?.agreement === 'conflicting';
}

function hasConflictingCoachMemory(memorySnapshot: CoachMemorySnapshot | undefined): boolean {
    return Boolean(memorySnapshot && memorySnapshot.conflictingFocusAreas.length > 0);
}

function hasOutcomeFailureMemory(memorySnapshot: CoachMemorySnapshot | undefined): boolean {
    const outcomeMemory = memorySnapshot?.outcomeMemory;

    return Boolean(outcomeMemory && outcomeMemory.repeatedFailureCount > 0);
}

function shouldStabilizeFromMemory(input: ResolveCoachDecisionTierInput): boolean {
    const trendLabel = input.memorySnapshot?.precisionTrend?.label;
    if (
        trendLabel === 'initial_signal'
        || trendLabel === 'in_validation'
        || trendLabel === 'oscillation'
    ) {
        return true;
    }

    const outcomeMemory = input.memorySnapshot?.outcomeMemory;
    if (!outcomeMemory || outcomeMemory.activeLayer === 'none') {
        return false;
    }

    return outcomeMemory.pendingCount > 0
        || outcomeMemory.neutralCount > 0
        || outcomeMemory.invalidCount > 0;
}

function shouldStabilizeBlock(primaryFocus: CoachPriority): boolean {
    return primaryFocus.area === 'consistency'
        && primaryFocus.blockedBy.length === 0
        && primaryFocus.confidence >= 0.7
        && primaryFocus.coverage >= 0.65;
}

function shouldApplyProtocol(input: ResolveCoachDecisionTierInput): boolean {
    const { analysisResult, primaryFocus } = input;
    const sensitivity = analysisResult?.sensitivity;

    if (!sensitivity) {
        return false;
    }

    if (analysisResult?.analysisDecision && analysisResult.analysisDecision.level !== 'strong_analysis') {
        return false;
    }

    return sensitivity.tier === 'apply_ready'
        && sensitivity.evidenceTier === 'strong'
        && sensitivity.confidenceScore >= 0.85
        && primaryFocus.blockedBy.length === 0
        && primaryFocus.priorityScore >= 0.75
        && primaryFocus.confidence >= 0.75
        && primaryFocus.coverage >= 0.75
        && hasStrongCompatibleValidation(input);
}

function hasStrongCompatibleValidation(input: ResolveCoachDecisionTierInput): boolean {
    const memorySnapshot = input.memorySnapshot;

    if (!memorySnapshot) {
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

function hasSignal(priority: CoachPriority, key: string): boolean {
    return priority.signals.some((signal) => signal.key === key);
}

function protocolForFocus(primaryFocus: CoachPriority): CoachActionProtocol {
    switch (primaryFocus.area) {
        case 'vertical_control':
            return {
                id: 'vertical-control-drill-protocol',
                kind: 'drill',
                instruction: 'Faca tres sprays focando em puxada constante para baixo durante a fase sustentada.',
                expectedEffect: 'Confirma se o erro vertical melhora antes de escalar para mudanca de sensibilidade.',
                risk: 'low',
                applyWhen: 'Use quando controle vertical for o foco principal e a sensibilidade ainda estiver em teste.',
                avoidWhen: 'Evite mudar a sensibilidade durante a mesma comparacao de tres sprays.',
            };
        case 'horizontal_control':
            return {
                id: 'horizontal-control-technique-protocol',
                kind: 'technique',
                instruction: 'Faca um bloco curto com a mesma pressao na pegada e observe se o desvio lateral se repete.',
                expectedEffect: 'Separa desvio mecanico de ruido aleatorio antes de mudar equipamento ou sensibilidade.',
                risk: 'low',
                applyWhen: 'Use quando desvio horizontal ou tremor lateral for o sinal mais forte.',
                avoidWhen: 'Evite trocar empunhadura no meio do bloco.',
            };
        case 'timing':
            return {
                id: 'timing-technique-protocol',
                kind: 'technique',
                instruction: 'Faca sprays iniciando a compensacao de recuo mais cedo e compare os dez primeiros tiros.',
                expectedEffect: 'Verifica se compensar mais cedo reduz o erro dominante de tempo de resposta.',
                risk: 'low',
                applyWhen: 'Use quando compensacao atrasada for o foco principal.',
                avoidWhen: 'Evite julgar o resultado apenas pelos tiros da fase de fadiga.',
            };
        case 'consistency':
            return {
                id: 'consistency-drill-protocol',
                kind: 'drill',
                instruction: 'Repita exatamente a mesma configuracao de spray ate o padrao ficar estavel o bastante para comparar.',
                expectedEffect: 'Cria evidencia repetivel antes de aplicar uma decisao de coach mais forte.',
                risk: 'low',
                applyWhen: 'Use quando existe inconsistencia, mas ela ainda nao pede um bloco inteiro de estabilizacao.',
                avoidWhen: 'Evite adicionar variaveis novas entre tentativas.',
            };
        case 'sensitivity':
            return {
                id: 'sensitivity-test-protocol',
                kind: 'sens',
                instruction: 'Teste o perfil de sensibilidade recomendado em um bloco curto, sem assumir como definitivo ainda.',
                expectedEffect: 'Valida a direcao do ajuste mantendo a decisao em modo experimental.',
                risk: 'medium',
                applyWhen: 'Use apenas quando a sensibilidade estiver desbloqueada e a evidencia ainda for parcial.',
                avoidWhen: 'Evite se qualidade da captura, historico ou consistencia bloquearem a prioridade de sensibilidade.',
            };
        case 'loadout':
            return {
                id: 'loadout-test-protocol',
                kind: 'loadout',
                instruction: 'Teste uma variavel de equipamento por vez, mantendo arma, mira, distancia e postura fixas.',
                expectedEffect: 'Valida se a mudanca de equipamento altera o erro dominante do spray.',
                risk: 'medium',
                applyWhen: 'Use quando equipamento for o foco principal desbloqueado.',
                avoidWhen: 'Evite mudar sensibilidade no mesmo bloco.',
            };
        case 'capture_quality':
            return {
                id: 'capture-quality-protocol',
                kind: 'capture',
                instruction: 'Grave outro video com area da mira estavel, reticulo visivel e mesmo contexto de jogo.',
                expectedEffect: 'Eleva a qualidade da captura antes de escolher treino ou ajuste mais forte.',
                risk: 'low',
                applyWhen: 'Use sempre que qualidade da captura for o foco principal.',
                avoidWhen: 'Evite aplicar mudancas de jogo a partir de captura fraca.',
            };
        case 'validation':
            return {
                id: 'validation-block-protocol',
                kind: 'drill',
                instruction: 'Repita um bloco controlado de validacao antes de promover qualquer diagnostico isolado.',
                expectedEffect: 'Melhora a qualidade da evidencia para a proxima decisao do coach.',
                risk: 'low',
                applyWhen: 'Use quando a sessao atual ainda e mais validacao do que ajuste.',
                avoidWhen: 'Evite mudancas permanentes de configuracao com evidencia apenas de validacao.',
            };
    }
}

function applyMemoryProtocolContext(
    protocol: CoachActionProtocol,
    primaryFocus: CoachPriority,
    memorySnapshot: CoachMemorySnapshot | undefined,
): CoachActionProtocol {
    if (!memorySnapshot) {
        return protocol;
    }

    const hasRepeatedFailure = primaryFocus.blockedBy.includes('revised_hypothesis')
        || primaryFocus.signals.some((signal) => signal.key.includes('.repeated_failure.'));
    if (hasRepeatedFailure) {
        return {
            ...protocol,
            id: `${protocol.id}-revised-hypothesis`,
            instruction: `${protocol.instruction} Antes de repetir, valide uma hipotese alternativa curta para ${focusLabel(primaryFocus)} e compare contra o ultimo bloco.`,
            applyWhen: `${protocol.applyWhen} Use como revisao controlada porque o mesmo foco ja falhou antes.`,
            avoidWhen: 'Evite repetir o protocolo antigo sem uma nova hipotese, checagem curta ou validacao compativel.',
        };
    }

    const hasConfirmedProgress = memorySnapshot.outcomeMemory.activeLayer === 'strict_compatible'
        && memorySnapshot.outcomeMemory.confirmedCount > 0;
    if (hasConfirmedProgress && memorySnapshot.precisionTrend?.label === 'validated_progress') {
        return {
            ...protocol,
            instruction: `${protocol.instruction} O objetivo agora e consolidar o mesmo contexto antes de trocar variavel.`,
            applyWhen: `${protocol.applyWhen} Use quando o proximo clip mantiver arma, mira, distancia, postura, acessorios e sensibilidade fixos.`,
        };
    }

    return protocol;
}

function nextBlockTitle(tier: CoachDecisionTier, primaryFocus: CoachPriority): string {
    switch (tier) {
        case 'capture_again':
            return 'Bloco de captura limpa';
        case 'test_protocol':
            return `Bloco curto de teste de ${focusLabel(primaryFocus)}`;
        case 'stabilize_block':
            return 'Bloco de estabilizacao';
        case 'apply_protocol':
            return `Aplicar e validar ${focusLabel(primaryFocus)}`;
    }
}

function durationForTier(tier: CoachDecisionTier): number {
    switch (tier) {
        case 'capture_again':
            return 5;
        case 'test_protocol':
            return 12;
        case 'stabilize_block':
            return 18;
        case 'apply_protocol':
            return 20;
    }
}

function stepsForTier(
    tier: CoachDecisionTier,
    primaryFocus: CoachPriority,
): readonly string[] {
    if (tier === 'capture_again') {
        return [
            'Grave um novo spray com a mesma arma, mira, distancia e postura.',
            'Mantenha a mira visivel e evite compressao extra ou area da mira instavel.',
            'Envie o novo video antes de aplicar mudanca de sensibilidade ou equipamento.',
        ];
    }

    const focus = focusLabel(primaryFocus);

    if (tier === 'apply_protocol') {
        return [
            `Aplique o protocolo de ${focus} uma vez.`,
            'Faca de 3 a 5 sprays comparaveis sem mudar nenhuma outra variavel.',
            'Compare o criterio de validacao antes de decidir outro ajuste.',
        ];
    }

    if (tier === 'stabilize_block') {
        return [
            'Faca 4 sprays comparaveis com configuracao identica.',
            `Foque apenas em estabilizar ${focus}.`,
            'Mantenha a mesma sensibilidade ate o padrao se repetir.',
        ];
    }

    return [
        `Faca 3 sprays comparaveis focados em ${focus}.`,
        'Mantenha arma, mira, distancia, postura, acessorios e sensibilidade fixos.',
        'Use o proximo video para confirmar se o mesmo sinal se repete.',
    ];
}

function validationCheckForFocus(primaryFocus: CoachPriority): CoachValidationCheck {
    return {
        label: `Validacao de ${focusLabel(primaryFocus)}`,
        target: targetForFocus(primaryFocus),
        minimumCoverage: threshold(primaryFocus.coverage),
        minimumConfidence: threshold(primaryFocus.confidence),
        successCondition: successConditionForFocus(primaryFocus),
        failCondition: `Falha se ${focusLabel(primaryFocus)} nao melhorar ou se a evidencia cair abaixo do limite.`,
    };
}

function targetForFocus(primaryFocus: CoachPriority): string {
    switch (primaryFocus.area) {
        case 'capture_quality':
            return 'captura usavel com mira visivel e estavel';
        case 'vertical_control':
            return 'reduzir o erro vertical sustentado em sprays comparaveis';
        case 'horizontal_control':
            return 'reduzir desvio ou tremor horizontal repetido';
        case 'timing':
            return 'responder ao recuo mais cedo nos dez primeiros tiros';
        case 'consistency':
            return 'padrao de spray mais repetivel entre tentativas';
        case 'sensitivity':
            return 'perfil recomendado melhora o controle sem nova instabilidade';
        case 'loadout':
            return 'uma mudanca de equipamento melhora o erro dominante do spray';
        case 'validation':
            return 'evidencia mais forte para a proxima decisao do coach';
    }
}

function successConditionForFocus(primaryFocus: CoachPriority): string {
    switch (primaryFocus.area) {
        case 'capture_quality':
            return 'Sucesso quando o proximo video ficar usavel para analise, sem bloqueios de captura.';
        case 'sensitivity':
            return 'Sucesso quando o perfil recomendado melhorar o erro principal sem derrubar a consistencia.';
        default:
            return `Sucesso quando ${focusLabel(primaryFocus)} melhorar e cobertura/confianca continuarem acima do limite.`;
    }
}

function focusLabel(primaryFocus: CoachPriority): string {
    return focusAreaLabel(primaryFocus.area);
}

function focusAreaLabel(area: CoachFocusArea): string {
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

function focusAreaTitle(area: CoachFocusArea): string {
    const label = focusAreaLabel(area);
    return label.charAt(0).toUpperCase() + label.slice(1);
}

function profileLabel(profile: ProfileType): string {
    switch (profile) {
        case 'low':
            return 'Baixa';
        case 'balanced':
            return 'Balanceada';
        case 'high':
            return 'Alta';
    }
}

function buildSessionSummary(input: {
    readonly tier: CoachDecisionTier;
    readonly primaryFocus: CoachPriority;
    readonly priorityCount: number;
}): string {
    const focus = focusLabel(input.primaryFocus);

    switch (input.tier) {
        case 'capture_again':
            return 'A captura limita a leitura agora. Antes de mexer em sensibilidade ou equipamento, vale gravar um bloco mais limpo.';
        case 'stabilize_block':
            return `O coach prioriza ${focus}. Primeiro estabilize o padrao para separar erro real de variacao entre tentativas.`;
        case 'apply_protocol':
            return `A evidencia ja sustenta aplicar o protocolo de ${focus}, mas ainda com validacao curta antes de tratar como ajuste definitivo.`;
        case 'test_protocol':
            return input.priorityCount > 0
                ? `O coach prioriza ${focus} porque e o sinal que mais mexe no resultado agora. Use o proximo bloco como teste controlado, nao como veredito final.`
                : 'Ainda falta sinal forte. Use o proximo bloco como validacao controlada antes de fechar qualquer ajuste.';
    }
}

export function localizeStoredCoachPlanPtBr(coachPlan: CoachPlan): CoachPlan {
    const primaryFocus = localizeStoredCoachPriority(coachPlan.primaryFocus);
    const fallbackNextBlock = buildNextBlockPlan({
        tier: coachPlan.tier,
        primaryFocus,
    });
    const fallbackStopConditions = buildStopConditions({
        tier: coachPlan.tier,
        primaryFocus,
    });
    const fallbackProtocols = buildActionProtocols({
        tier: coachPlan.tier,
        primaryFocus,
        analysisResult: undefined,
    });
    const fallbackProtocolById = new Map(fallbackProtocols.map((protocol) => [protocol.id, protocol]));

    return {
        ...coachPlan,
        sessionSummary: shouldLocalizeCoachText(coachPlan.sessionSummary)
            ? buildSessionSummary({
                tier: coachPlan.tier,
                primaryFocus,
                priorityCount: 1 + coachPlan.secondaryFocuses.length,
            })
            : localizeInlineCoachText(coachPlan.sessionSummary),
        primaryFocus,
        secondaryFocuses: coachPlan.secondaryFocuses.map(localizeStoredCoachPriority),
        actionProtocols: coachPlan.actionProtocols.map((protocol) => {
            const fallback = fallbackProtocolById.get(protocol.id);

            return {
                ...protocol,
                instruction: maybeUseLocalizedFallback(protocol.instruction, fallback?.instruction),
                expectedEffect: maybeUseLocalizedFallback(protocol.expectedEffect, fallback?.expectedEffect),
                applyWhen: maybeUseLocalizedFallback(protocol.applyWhen, fallback?.applyWhen),
                ...(protocol.avoidWhen !== undefined ? {
                    avoidWhen: maybeUseLocalizedFallback(protocol.avoidWhen, fallback?.avoidWhen),
                } : {}),
            };
        }),
        nextBlock: {
            ...coachPlan.nextBlock,
            title: maybeUseLocalizedFallback(coachPlan.nextBlock.title, fallbackNextBlock.title),
            steps: coachPlan.nextBlock.steps.map((step, index) =>
                maybeUseLocalizedFallback(step, fallbackNextBlock.steps[index])
            ),
            checks: coachPlan.nextBlock.checks.map((check, index) => {
                const fallback = fallbackNextBlock.checks[index] ?? fallbackNextBlock.checks[0];

                return {
                    ...check,
                    label: maybeUseLocalizedFallback(check.label, fallback?.label),
                    target: maybeUseLocalizedFallback(check.target, fallback?.target),
                    successCondition: maybeUseLocalizedFallback(check.successCondition, fallback?.successCondition),
                    failCondition: maybeUseLocalizedFallback(check.failCondition, fallback?.failCondition),
                };
            }),
        },
        stopConditions: coachPlan.stopConditions.map((condition, index) =>
            maybeUseLocalizedFallback(condition, fallbackStopConditions[index])
        ),
    };
}

function localizeStoredCoachPriority(priority: CoachPriority): CoachPriority {
    return {
        ...priority,
        title: shouldLocalizeCoachText(priority.title)
            ? focusAreaTitle(priority.area)
            : localizeInlineCoachText(priority.title),
        whyNow: localizeInlineCoachText(priority.whyNow),
        signals: priority.signals.map((signal) => ({
            ...signal,
            summary: localizeInlineCoachText(signal.summary),
        })),
    };
}

function maybeUseLocalizedFallback(value: string, fallback: string | undefined): string {
    if (!shouldLocalizeCoachText(value)) {
        return localizeInlineCoachText(value);
    }

    return fallback ?? localizeInlineCoachText(value);
}

function shouldLocalizeCoachText(value: string): boolean {
    const normalized = value.toLowerCase();

    return [
        'coachplan contract stub',
        'validate the next coaching block',
        'task 1 only establishes',
        'capture quality',
        'vertical control',
        'horizontal control',
        'clean capture block',
        'short ',
        'test block',
        'stabilization block',
        'apply and validate',
        'record one',
        'run three',
        'run a short',
        'run sprays',
        'run 3',
        'run 4',
        'repeat the exact',
        'test the recommended',
        'test one loadout',
        'record another clip',
        'repeat a controlled',
        'keep weapon',
        'use the next clip',
        'success when',
        'fail if',
        'stop if',
        'threshold',
        'setup',
        'drift',
        'grip',
        'loadout',
        'sensitivity',
        'capture evidence',
        'dominant repeated signal',
    ].some((marker) => normalized.includes(marker));
}

function localizeInlineCoachText(value: string): string {
    return value
        .replace(/\bCause:/g, 'Causa:')
        .replace(/\bClip is usable for coaching analysis\./g, 'O video esta usavel para a leitura do coach.')
        .replace(/\bPatch\b/g, 'Patch')
        .replace(/\bOptic\b/g, 'Mira')
        .replace(/\bTarget distance\b/g, 'Distancia alvo')
        .replace(/\bunknown\b/g, 'nao informada')
        .replace(/\bexact\b/g, 'exata')
        .replace(/\bestimated\b/g, 'estimada')
        .replace(/\bthreshold\b/gi, 'limite')
        .replace(/\bsetup\b/gi, 'configuracao')
        .replace(/\bdrift\b/gi, 'desvio')
        .replace(/\bgrip\b/gi, 'empunhadura')
        .replace(/\bloadout\b/gi, 'equipamento')
        .replace(/\bsensitivity\b/gi, 'sensibilidade')
        .replace(/\bcapture\b/gi, 'captura');
}

function threshold(value: number): number {
    const bounded = Math.min(0.9, Math.max(0.65, value));
    return Number(bounded.toFixed(2));
}
