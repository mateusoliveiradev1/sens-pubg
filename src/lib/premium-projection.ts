import {
    hasProductEntitlement,
    type ProductAccessResolution,
} from '@/lib/product-entitlements';
import type { AnalysisResult, CoachPlan, CompleteTrainingProtocol } from '@/types/engine';
import type {
    PremiumFeatureLock,
    PremiumLockReason,
    PremiumProjectionSummary,
    ProductEntitlementKey,
} from '@/types/monetization';

const FULL_COACH_FEATURE: ProductEntitlementKey = 'coach.full_plan';
const TRAINING_PROTOCOL_FEATURE: ProductEntitlementKey = 'training.next_block_protocol';
const HISTORY_FEATURE: ProductEntitlementKey = 'history.full';
const ADVANCED_METRICS_FEATURE: ProductEntitlementKey = 'metrics.advanced';
const OUTCOME_FEATURE: ProductEntitlementKey = 'coach.outcome_capture';
const FULL_TREND_FEATURE: ProductEntitlementKey = 'trends.compatible_full';
const EVOLUTION_FEATURE: ProductEntitlementKey = 'precision.evolution_lines';
const CHECKPOINT_FEATURE: ProductEntitlementKey = 'precision.checkpoints';
const VALIDATION_FEATURE: ProductEntitlementKey = 'coach.validation_loop';
const PROGRAM_WEEKLY_FEATURE: ProductEntitlementKey = 'programs.guided_weekly';
const PROGRAM_MONTHLY_FEATURE: ProductEntitlementKey = 'programs.guided_monthly';
const SPRAY_LAB_SESSION_RUNNER_FEATURE: ProductEntitlementKey = 'spray_lab.session_runner';
const SPRAY_LAB_BENCHMARKS_FEATURE: ProductEntitlementKey = 'spray_lab.benchmarks';
const SOCIAL_PRO_REPORT_FEATURE: ProductEntitlementKey = 'community.premium_report_share';
const SOCIAL_PRO_LIBRARY_FEATURE: ProductEntitlementKey = 'community.pro_library';
const SOCIAL_PRO_PRIVATE_LINKS_FEATURE: ProductEntitlementKey = 'community.private_report_links';
const SOCIAL_PRO_CREATOR_ANALYTICS_FEATURE: ProductEntitlementKey = 'community.creator_analytics';
const SOCIAL_PRO_ADVANCED_CONTEXT_FEATURE: ProductEntitlementKey = 'community.advanced_context';
const SOCIAL_PRO_BADGE_FEATURE: ProductEntitlementKey = 'community.pro_badge';

const PREMIUM_FEATURES = [
    FULL_COACH_FEATURE,
    TRAINING_PROTOCOL_FEATURE,
    HISTORY_FEATURE,
    ADVANCED_METRICS_FEATURE,
    OUTCOME_FEATURE,
    FULL_TREND_FEATURE,
    EVOLUTION_FEATURE,
    CHECKPOINT_FEATURE,
    VALIDATION_FEATURE,
    PROGRAM_WEEKLY_FEATURE,
    PROGRAM_MONTHLY_FEATURE,
    SPRAY_LAB_SESSION_RUNNER_FEATURE,
    SPRAY_LAB_BENCHMARKS_FEATURE,
    SOCIAL_PRO_REPORT_FEATURE,
    SOCIAL_PRO_LIBRARY_FEATURE,
    SOCIAL_PRO_PRIVATE_LINKS_FEATURE,
    SOCIAL_PRO_CREATOR_ANALYTICS_FEATURE,
    SOCIAL_PRO_ADVANCED_CONTEXT_FEATURE,
    SOCIAL_PRO_BADGE_FEATURE,
] as const satisfies readonly ProductEntitlementKey[];

const FEATURE_TITLES: Record<ProductEntitlementKey, string> = {
    'analysis.save.free_limit': 'Save Free',
    'analysis.save.pro_limit': 'Save Pro',
    'analysis.save.quota_warning': 'Aviso de quota',
    'coach.summary': 'Resumo do coach',
    'coach.full_plan': 'Plano completo do coach',
    'training.next_block_protocol': 'Protocolo completo',
    'history.basic_recent': 'Historico recente',
    'history.full': 'Historico completo',
    'trends.compatible_summary': 'Resumo de tendencia comparavel',
    'trends.compatible_full': 'Tendencia comparavel completa',
    'precision.evolution_lines': 'Linhas de evolucao',
    'precision.checkpoints': 'Checkpoints de precisao',
    'metrics.basic': 'Metricas basicas',
    'metrics.advanced': 'Metricas avancadas',
    'coach.outcome_capture': 'Registro do resultado do treino',
    'coach.validation_loop': 'Loop de validacao',
    'billing.portal_access': 'Portal de billing',
    'admin.entitlements.view': 'Admin: ver entitlements',
    'admin.entitlements.grant': 'Admin: conceder acesso',
    'admin.entitlements.revoke': 'Admin: revogar acesso',
    'admin.entitlements.suspend': 'Admin: suspender acesso',
    'admin.billing.reconcile': 'Admin: reconciliar billing',
    'support.entitlements.view': 'Support: ver entitlements',
    'support.entitlements.note': 'Support: notas',
    'programs.guided_weekly': 'Programa semanal',
    'programs.guided_monthly': 'Programa mensal',
    'spray_lab.session_runner': 'Spray Lab',
    'spray_lab.benchmarks': 'Benchmarks do Spray Lab',
    'community.pro_badge': 'Badge Pro',
    'community.premium_report_share': 'Relatorio premium compartilhavel',
    'community.creator_attribution': 'Atribuicao de creator',
    'community.pro_library': 'Biblioteca Pro social',
    'community.creator_analytics': 'Analytics de creator',
    'community.private_report_links': 'Links privados de relatorio',
    'community.advanced_context': 'Contexto social avancado',
    'team.player_review': 'Review de jogadores',
    'team.seats': 'Assentos de equipe',
};

const FREE_VISIBLE_COPY: Partial<Record<ProductEntitlementKey, string>> = {
    'coach.full_plan': 'resumo do coach, foco primario, confianca, cobertura e bloqueios continuam visiveis no Free',
    'training.next_block_protocol': 'foco, duracao, passos essenciais, preparo compacto, validacao basica, confianca, cobertura e bloqueios continuam visiveis no Free',
    'history.full': 'historico recente, evidencia basica e bloqueios continuam visiveis no Free',
    'metrics.advanced': 'mastery, confianca, cobertura e metricas basicas continuam visiveis no Free',
    'coach.outcome_capture': 'resultado do clip e proximo passo curto continuam visiveis no Free',
    'coach.validation_loop': 'verdade do clip, bloqueios e inconclusivo continuam visiveis no Free',
    'trends.compatible_full': 'resumo de tendencia e motivo de bloqueio continuam visiveis no Free',
    'precision.evolution_lines': 'direcao principal e checkpoints essenciais continuam visiveis no Free',
    'precision.checkpoints': 'estado atual do clip e proxima validacao continuam visiveis no Free',
    'programs.guided_weekly': 'proximo passo, uma missao semanal basica, blockers, evidencia e CTA do Ciclo Pro continuam visiveis no Free',
    'programs.guided_monthly': 'o Free mostra o proximo passo real do ciclo sem dados falsos ou blur enganoso',
    'spray_lab.session_runner': 'sessao guiada basica, checklist, timer simples, score provisorio e CTA de validacao continuam visiveis no Free',
    'spray_lab.benchmarks': 'score provisorio e status de fidelidade continuam visiveis no Free sem vender dado externo exclusivo',
    'community.premium_report_share': 'Free mantem a leitura publica, confianca, cobertura, bloqueios e disclaimers do relatorio',
    'community.pro_library': 'Free mantem leitura publica, saves normais e contexto essencial sem fechar a comunidade',
    'community.private_report_links': 'Free mantem relatorios publicos ou por link legiveis em estado seguro',
    'community.creator_analytics': 'Free mantem publicacao, leitura, comentarios, curtidas, saves normais e perfis basicos',
    'community.advanced_context': 'Free mantem a leitura publica e o contexto essencial sem esconder a verdade do clip',
    'community.pro_badge': 'Free mantem a leitura publica; o badge Pro e apenas sinal de acesso, nao autoridade',
};

const PRO_VALUE_COPY: Partial<Record<ProductEntitlementKey, string>> = {
    'coach.full_plan': 'Pro adiciona plano completo, protocolo de bloco, checagens e criterios de parada',
    'training.next_block_protocol': 'Pro adiciona reps, local, alvo, criterios, preparacao completa, auditoria, revisao, validacao compativel e transferencia real',
    'history.full': 'Pro adiciona historico profundo, auditoria longa e comparacao entre sessoes',
    'metrics.advanced': 'Pro adiciona metricas avancadas para diagnostico e revisao de treino',
    'coach.outcome_capture': 'Pro adiciona registro do resultado do treino para fechar o bloco e alimentar memoria',
    'coach.validation_loop': 'Pro adiciona validacao compativel e continuidade do coach',
    'trends.compatible_full': 'Pro adiciona tendencia comparavel completa com deltas e bloqueios auditaveis',
    'precision.evolution_lines': 'Pro adiciona linhas de evolucao por contexto estrito',
    'precision.checkpoints': 'Pro adiciona checkpoints antigos e retomada de linha ativa',
    'programs.guided_weekly': 'Pro organiza a semana adaptativa com missoes, reparo, validacao e reencaixe auditavel',
    'programs.guided_monthly': 'Pro organiza o Ciclo Pro de 30 dias com quatro semanas, checkpoints, recuperacao, historico e continuidade auditavel',
    'spray_lab.session_runner': 'Pro adiciona runner profundo, lanes avancadas, auditoria, historico de sessoes e continuidade por contexto',
    'spray_lab.benchmarks': 'Pro adiciona indice validado, benchmark por contexto e comparacoes entre suas sessoes e clips compativeis',
    'community.premium_report_share': 'Pro organiza relatorio auditavel com biblioteca, Spray Lab, Ciclo Pro, historico, coach, protocolos e validacao compativel',
    'community.pro_library': 'Pro organiza biblioteca privada por contexto com relatorio, auditoria, Spray Lab, Ciclo Pro, historico, coach, protocolos e validacao compativel',
    'community.private_report_links': 'Pro adiciona links privados revogaveis para relatorio seguro, auditoria, biblioteca e continuidade sem expor leitor privado',
    'community.creator_analytics': 'Pro mostra analytics agregados de creator ligados a relatorio, biblioteca, auditoria, Spray Lab, Ciclo Pro e validacao compativel',
    'community.advanced_context': 'Pro adiciona contexto social avancado para conectar relatorio, biblioteca, coach, protocolos, historico e validacao compativel',
    'community.pro_badge': 'Pro habilita badge discreto de acesso premium com controles de relatorio, sem autoridade tecnica ou certificacao',
};

function reasonFromAccess(access: ProductAccessResolution): PremiumLockReason {
    if (access.quota.remaining <= 0 || access.accessState === 'free_limit_reached') {
        return 'limit_reached';
    }

    if (
        access.accessState === 'past_due_blocked'
        || access.accessState === 'past_due_grace'
        || access.billingStatus === 'past_due'
        || access.billingStatus === 'unpaid'
        || access.billingStatus === 'incomplete'
    ) {
        return 'payment_issue';
    }

    return 'pro_feature';
}

function ctaHrefForReason(reason: PremiumLockReason): PremiumFeatureLock['ctaHref'] {
    if (reason === 'payment_issue') {
        return '/billing';
    }

    if (reason === 'weak_evidence' || reason === 'not_enough_history') {
        return null;
    }

    return '/pricing';
}

function buildLockBody(
    title: string,
    featureKey: ProductEntitlementKey,
    reason: PremiumLockReason,
): string {
    const visibleNow = FREE_VISIBLE_COPY[featureKey] ?? 'a evidencia essencial continua visivel no Free';
    const proValue = PRO_VALUE_COPY[featureKey] ?? 'Pro adiciona continuidade e profundidade quando a evidencia sustenta';

    switch (reason) {
        case 'limit_reached':
            return `Visivel agora: ${visibleNow}. Com Pro: ${proValue}. Motivo: limite atual atingido para saves uteis.`;
        case 'payment_issue':
            return `Visivel agora: ${visibleNow}. Com Pro: ${proValue}. Motivo: ${title} espera o billing voltar para um estado confiavel.`;
        case 'weak_evidence':
            return `Visivel agora: confianca, cobertura, bloqueios e estado inconclusivo. Com Pro: ${proValue}, mas so quando a evidencia sustentar. Motivo: evidencia fraca.`;
        case 'not_enough_history':
            return `Visivel agora: ${visibleNow}. Com Pro: ${proValue}. Motivo: ainda faltam clips compativeis para uma leitura honesta.`;
        case 'pro_feature':
            return `Visivel agora: ${visibleNow}. Com Pro: ${proValue}. Motivo: este detalhe faz parte da continuidade Pro, nao da verdade basica do clip.`;
    }
}

function lockForFeature(
    access: ProductAccessResolution,
    featureKey: ProductEntitlementKey,
    reasonOverride?: PremiumLockReason,
): PremiumFeatureLock {
    const reason = reasonOverride ?? reasonFromAccess(access);
    const title = FEATURE_TITLES[featureKey];

    return {
        featureKey,
        reason,
        title,
        body: buildLockBody(title, featureKey, reason),
        ctaHref: ctaHrefForReason(reason),
    };
}

function buildLocks(access: ProductAccessResolution, result?: AnalysisResult): readonly PremiumFeatureLock[] {
    const locks = PREMIUM_FEATURES
        .filter((featureKey) => !hasProductEntitlement(access, featureKey))
        .map((featureKey) => lockForFeature(access, featureKey));
    const extraLocks: PremiumFeatureLock[] = [];

    if (result?.mastery?.evidence.usableForAnalysis === false) {
        extraLocks.push(lockForFeature(access, VALIDATION_FEATURE, 'weak_evidence'));
    }

    if ((result?.precisionTrend?.compatibleCount ?? 0) < 2) {
        extraLocks.push(lockForFeature(access, FULL_TREND_FEATURE, 'not_enough_history'));
    }

    const byFeatureAndReason = new Map<string, PremiumFeatureLock>();
    for (const lock of [...locks, ...extraLocks]) {
        byFeatureAndReason.set(`${lock.featureKey}:${lock.reason}`, lock);
    }

    return Array.from(byFeatureAndReason.values());
}

export function createPremiumProjectionSummary(
    access: ProductAccessResolution,
    result?: AnalysisResult,
): PremiumProjectionSummary {
    const featureValues = Object.values(access.features);
    const visibleFeatureKeys = featureValues
        .filter((feature) => feature.granted)
        .map((feature) => feature.key);
    const hiddenFeatureKeys = featureValues
        .filter((feature) => !feature.granted)
        .map((feature) => feature.key);

    return {
        tier: access.effectiveTier,
        accessState: access.accessState,
        billingStatus: access.billingStatus,
        quota: access.quota,
        locks: buildLocks(access, result),
        visibleFeatureKeys,
        hiddenFeatureKeys,
        canSeeFullCoachPlan: hasProductEntitlement(access, FULL_COACH_FEATURE),
        canSeeFullHistory: hasProductEntitlement(access, HISTORY_FEATURE),
        canSeeAdvancedMetrics: hasProductEntitlement(access, ADVANCED_METRICS_FEATURE),
        canCaptureCoachOutcome: hasProductEntitlement(access, OUTCOME_FEATURE),
        canGenerateSocialProReport: hasProductEntitlement(access, SOCIAL_PRO_REPORT_FEATURE),
        canUseSocialProLibrary: hasProductEntitlement(access, SOCIAL_PRO_LIBRARY_FEATURE),
        canManageSocialProPrivateLinks: hasProductEntitlement(access, SOCIAL_PRO_PRIVATE_LINKS_FEATURE),
        canReadCreatorAnalytics: hasProductEntitlement(access, SOCIAL_PRO_CREATOR_ANALYTICS_FEATURE),
        canUseAdvancedSocialContext: hasProductEntitlement(access, SOCIAL_PRO_ADVANCED_CONTEXT_FEATURE),
        canDisplaySocialProBadge: hasProductEntitlement(access, SOCIAL_PRO_BADGE_FEATURE),
        canControlSocialProBadge: hasProductEntitlement(access, SOCIAL_PRO_BADGE_FEATURE),
    };
}

function canSeeCompleteTrainingProtocol(projection: PremiumProjectionSummary): boolean {
    return projection.canSeeFullCoachPlan
        && projection.visibleFeatureKeys.includes(TRAINING_PROTOCOL_FEATURE);
}

export function projectCompleteTrainingProtocolForAccess(
    protocol: CompleteTrainingProtocol | undefined,
    projection: PremiumProjectionSummary,
): CompleteTrainingProtocol | undefined {
    if (!protocol) {
        return undefined;
    }

    if (canSeeCompleteTrainingProtocol(projection)) {
        return protocol;
    }

    return {
        ...protocol,
        dose: {
            ...protocol.dose,
            sprayReps: Math.min(protocol.dose.sprayReps, 3),
            spraysPerRep: Math.min(protocol.dose.spraysPerRep, 1),
            restBetweenRepsSeconds: 0,
        },
        executionSteps: protocol.executionSteps.slice(0, 3),
        preparation: protocol.preparation.slice(0, 3),
        validation: {
            ...protocol.validation,
            compatibleClipChecklist: protocol.validation.compatibleClipChecklist.slice(0, 1),
            successCriteria: protocol.validation.successCriteria.slice(0, 1),
            failCriteria: [],
            variableControlChecklist: protocol.validation.variableControlChecklist.slice(0, 1),
        },
        stopConditions: [],
        continueCriteria: [],
        antiMixingNotes: protocol.antiMixingNotes.slice(0, 1),
        proSections: [],
        freeSummary: [
            ...protocol.freeSummary,
            `Auditoria resumida: confianca ${Math.round(protocol.audit.confidence * 100)}%, cobertura ${Math.round(protocol.audit.coverage * 100)}%.`,
        ],
    };
}

function summarizeCoachPlan(
    plan: CoachPlan | undefined,
    projection: PremiumProjectionSummary,
): CoachPlan | undefined {
    if (!plan) {
        return undefined;
    }

    const projectedCompleteProtocol = projectCompleteTrainingProtocolForAccess(
        plan.completeProtocol,
        projection,
    );

    return {
        ...plan,
        sessionSummary: plan.sessionSummary,
        secondaryFocuses: plan.secondaryFocuses.slice(0, 1),
        actionProtocols: [],
        nextBlock: {
            ...plan.nextBlock,
            steps: plan.nextBlock.steps.slice(0, 1),
            checks: plan.nextBlock.checks.slice(0, 1),
        },
        stopConditions: [],
        ...(projectedCompleteProtocol ? { completeProtocol: projectedCompleteProtocol } : {}),
    };
}

export function projectAnalysisForAccess(
    result: AnalysisResult,
    access: ProductAccessResolution,
): AnalysisResult {
    const projection = createPremiumProjectionSummary(access, result);

    if (projection.canSeeFullCoachPlan && projection.canSeeAdvancedMetrics && canSeeCompleteTrainingProtocol(projection)) {
        return {
            ...result,
            premiumProjection: projection,
        };
    }

    const summarizedCoachPlan = summarizeCoachPlan(result.coachPlan, projection);
    const projected: AnalysisResult = {
        ...result,
        ...(summarizedCoachPlan ? { coachPlan: summarizedCoachPlan } : {}),
        premiumProjection: projection,
    };

    if (projection.canCaptureCoachOutcome && result.coachOutcomeSnapshot) {
        return {
            ...projected,
            coachOutcomeSnapshot: result.coachOutcomeSnapshot,
        };
    }

    return projected;
}

export function isPremiumFeatureGranted(
    projection: PremiumProjectionSummary,
    featureKey: ProductEntitlementKey,
): boolean {
    return projection.visibleFeatureKeys.includes(featureKey);
}
