import {
    hasProductEntitlement,
    type ProductAccessResolution,
} from '@/lib/product-entitlements';
import type { AnalysisResult, CoachPlan } from '@/types/engine';
import type {
    PremiumFeatureLock,
    PremiumLockReason,
    PremiumProjectionSummary,
    ProductEntitlementKey,
} from '@/types/monetization';

const FULL_COACH_FEATURE: ProductEntitlementKey = 'coach.full_plan';
const HISTORY_FEATURE: ProductEntitlementKey = 'history.full';
const ADVANCED_METRICS_FEATURE: ProductEntitlementKey = 'metrics.advanced';
const OUTCOME_FEATURE: ProductEntitlementKey = 'coach.outcome_capture';
const FULL_TREND_FEATURE: ProductEntitlementKey = 'trends.compatible_full';
const EVOLUTION_FEATURE: ProductEntitlementKey = 'precision.evolution_lines';
const CHECKPOINT_FEATURE: ProductEntitlementKey = 'precision.checkpoints';
const VALIDATION_FEATURE: ProductEntitlementKey = 'coach.validation_loop';

const PREMIUM_FEATURES = [
    FULL_COACH_FEATURE,
    HISTORY_FEATURE,
    ADVANCED_METRICS_FEATURE,
    OUTCOME_FEATURE,
    FULL_TREND_FEATURE,
    EVOLUTION_FEATURE,
    CHECKPOINT_FEATURE,
    VALIDATION_FEATURE,
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
    'team.player_review': 'Review de jogadores',
    'team.seats': 'Assentos de equipe',
};

const FREE_VISIBLE_COPY: Partial<Record<ProductEntitlementKey, string>> = {
    'coach.full_plan': 'resumo do coach, foco primario, confianca, cobertura e bloqueios continuam visiveis no Free',
    'history.full': 'historico recente, evidencia basica e bloqueios continuam visiveis no Free',
    'metrics.advanced': 'mastery, confianca, cobertura e metricas basicas continuam visiveis no Free',
    'coach.outcome_capture': 'resultado do clip e proximo passo curto continuam visiveis no Free',
    'coach.validation_loop': 'verdade do clip, bloqueios e inconclusivo continuam visiveis no Free',
    'trends.compatible_full': 'resumo de tendencia e motivo de bloqueio continuam visiveis no Free',
    'precision.evolution_lines': 'direcao principal e checkpoints essenciais continuam visiveis no Free',
    'precision.checkpoints': 'estado atual do clip e proxima validacao continuam visiveis no Free',
};

const PRO_VALUE_COPY: Partial<Record<ProductEntitlementKey, string>> = {
    'coach.full_plan': 'Pro adiciona plano completo, protocolo de bloco, checagens e criterios de parada',
    'history.full': 'Pro adiciona historico profundo, auditoria longa e comparacao entre sessoes',
    'metrics.advanced': 'Pro adiciona metricas avancadas para diagnostico e revisao de treino',
    'coach.outcome_capture': 'Pro adiciona registro do resultado do treino para fechar o bloco e alimentar memoria',
    'coach.validation_loop': 'Pro adiciona validacao compativel e continuidade do coach',
    'trends.compatible_full': 'Pro adiciona tendencia comparavel completa com deltas e bloqueios auditaveis',
    'precision.evolution_lines': 'Pro adiciona linhas de evolucao por contexto estrito',
    'precision.checkpoints': 'Pro adiciona checkpoints antigos e retomada de linha ativa',
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
    };
}

function summarizeCoachPlan(plan: CoachPlan | undefined): CoachPlan | undefined {
    if (!plan) {
        return undefined;
    }

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
    };
}

export function projectAnalysisForAccess(
    result: AnalysisResult,
    access: ProductAccessResolution,
): AnalysisResult {
    const projection = createPremiumProjectionSummary(access, result);

    if (projection.canSeeFullCoachPlan && projection.canSeeAdvancedMetrics) {
        return {
            ...result,
            premiumProjection: projection,
        };
    }

    const summarizedCoachPlan = summarizeCoachPlan(result.coachPlan);
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
