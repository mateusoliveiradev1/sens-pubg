import type {
    CommunityProgressionEventType,
    CommunityRewardKind,
} from '@/types/community';

const HOUR_MS = 60 * 60 * 1000;
const WEEK_MS = 7 * 24 * HOUR_MS;

export type CommunityProgressionIdempotencyStrategy = 'entity' | 'source' | 'window';

export interface CommunityProgressionRuleDefinition {
    readonly eventType: CommunityProgressionEventType;
    readonly title: string;
    readonly description: string;
    readonly defaultXp: number;
    readonly cooldownWindowMs: number;
    readonly requiresPublicEntity: boolean;
    readonly requiresContext: boolean;
    readonly requiresBeneficiary: boolean;
    readonly requiresDistinctActors: boolean;
    readonly meaningfulParticipation: boolean;
    readonly idempotencyStrategy: CommunityProgressionIdempotencyStrategy;
    readonly nextActionHint: {
        readonly title: string;
        readonly description: string;
    } | null;
}

export const COMMUNITY_PROGRESSION_RULE_ORDER: readonly CommunityProgressionEventType[] = [
    'publish_post',
    'complete_public_profile',
    'follow_profile',
    'receive_unique_save',
    'receive_unique_copy',
    'comment_with_context',
    'weekly_challenge_complete',
    'mission_complete',
    'squad_goal_contribution',
    'streak_participation',
] as const;

export const COMMUNITY_PROGRESSION_RULES: Readonly<
    Record<CommunityProgressionEventType, CommunityProgressionRuleDefinition>
> = {
    publish_post: {
        eventType: 'publish_post',
        title: 'Publicar post',
        description: 'Publicar um post publico e elegivel para a comunidade.',
        defaultXp: 40,
        cooldownWindowMs: 0,
        requiresPublicEntity: true,
        requiresContext: false,
        requiresBeneficiary: false,
        requiresDistinctActors: false,
        meaningfulParticipation: true,
        idempotencyStrategy: 'entity',
        nextActionHint: {
            title: 'Publique um post',
            description: 'Transforme uma analise util em post publico para ganhar XP real.',
        },
    },
    complete_public_profile: {
        eventType: 'complete_public_profile',
        title: 'Completar perfil publico',
        description: 'Ativar ou completar o perfil publico com dados visiveis da comunidade.',
        defaultXp: 30,
        cooldownWindowMs: 0,
        requiresPublicEntity: true,
        requiresContext: false,
        requiresBeneficiary: false,
        requiresDistinctActors: false,
        meaningfulParticipation: true,
        idempotencyStrategy: 'entity',
        nextActionHint: {
            title: 'Complete seu perfil publico',
            description: 'Adicione bio, links e setup aberto para iniciar sua presenca na comunidade.',
        },
    },
    follow_profile: {
        eventType: 'follow_profile',
        title: 'Seguir jogador',
        description: 'Seguir um perfil publico para reforcar descoberta recorrente.',
        defaultXp: 10,
        cooldownWindowMs: 0,
        requiresPublicEntity: true,
        requiresContext: false,
        requiresBeneficiary: false,
        requiresDistinctActors: false,
        meaningfulParticipation: true,
        idempotencyStrategy: 'entity',
        nextActionHint: {
            title: 'Siga um jogador relevante',
            description: 'Siga perfis uteis para montar um loop saudavel de descoberta e retorno.',
        },
    },
    receive_unique_save: {
        eventType: 'receive_unique_save',
        title: 'Receber save unico',
        description: 'Receber um save unico em conteudo publico e elegivel.',
        defaultXp: 15,
        cooldownWindowMs: 0,
        requiresPublicEntity: true,
        requiresContext: false,
        requiresBeneficiary: true,
        requiresDistinctActors: true,
        meaningfulParticipation: true,
        idempotencyStrategy: 'entity',
        nextActionHint: null,
    },
    receive_unique_copy: {
        eventType: 'receive_unique_copy',
        title: 'Receber copy unico',
        description: 'Receber um copy unico em conteudo publico e elegivel.',
        defaultXp: 20,
        cooldownWindowMs: 0,
        requiresPublicEntity: true,
        requiresContext: false,
        requiresBeneficiary: true,
        requiresDistinctActors: true,
        meaningfulParticipation: true,
        idempotencyStrategy: 'entity',
        nextActionHint: null,
    },
    comment_with_context: {
        eventType: 'comment_with_context',
        title: 'Comentar com contexto',
        description: 'Contribuir com comentario contextual, tecnico e publico.',
        defaultXp: 20,
        cooldownWindowMs: 12 * HOUR_MS,
        requiresPublicEntity: true,
        requiresContext: true,
        requiresBeneficiary: false,
        requiresDistinctActors: false,
        meaningfulParticipation: true,
        idempotencyStrategy: 'source',
        nextActionHint: {
            title: 'Deixe um comentario com contexto',
            description: 'Explique recoil, patch ou diagnostico para gerar contribuicao de alto valor.',
        },
    },
    weekly_challenge_complete: {
        eventType: 'weekly_challenge_complete',
        title: 'Completar desafio semanal',
        description: 'Concluir um desafio semanal ativo da comunidade.',
        defaultXp: 80,
        cooldownWindowMs: 0,
        requiresPublicEntity: false,
        requiresContext: false,
        requiresBeneficiary: false,
        requiresDistinctActors: false,
        meaningfulParticipation: true,
        idempotencyStrategy: 'entity',
        nextActionHint: null,
    },
    mission_complete: {
        eventType: 'mission_complete',
        title: 'Completar missao',
        description: 'Finalizar uma missao ativa a partir de contribuicoes elegiveis.',
        defaultXp: 60,
        cooldownWindowMs: 0,
        requiresPublicEntity: false,
        requiresContext: false,
        requiresBeneficiary: false,
        requiresDistinctActors: false,
        meaningfulParticipation: true,
        idempotencyStrategy: 'entity',
        nextActionHint: null,
    },
    squad_goal_contribution: {
        eventType: 'squad_goal_contribution',
        title: 'Contribuir para meta de squad',
        description: 'Registrar uma contribuicao valida para a meta compartilhada do squad.',
        defaultXp: 15,
        cooldownWindowMs: 6 * HOUR_MS,
        requiresPublicEntity: false,
        requiresContext: false,
        requiresBeneficiary: false,
        requiresDistinctActors: false,
        meaningfulParticipation: true,
        idempotencyStrategy: 'source',
        nextActionHint: null,
    },
    streak_participation: {
        eventType: 'streak_participation',
        title: 'Participacao de streak',
        description: 'Registrar uma participacao significativa no intervalo saudavel da streak.',
        defaultXp: 10,
        cooldownWindowMs: WEEK_MS,
        requiresPublicEntity: false,
        requiresContext: false,
        requiresBeneficiary: false,
        requiresDistinctActors: false,
        meaningfulParticipation: true,
        idempotencyStrategy: 'window',
        nextActionHint: {
            title: 'Volte com uma acao significativa',
            description: 'Retome sua rotina com uma contribuicao real, sem depender de volume vazio.',
        },
    },
} as const;

export interface CommunityLowSignalGuardrailConfig {
    readonly pairPeriodCap: number;
    readonly periodCap: number;
    readonly reciprocalPairPeriodCap: number;
}

export const COMMUNITY_LOW_SIGNAL_GUARDRAIL_CONFIG: Readonly<
    Partial<Record<CommunityProgressionEventType, CommunityLowSignalGuardrailConfig>>
> = {
    follow_profile: {
        pairPeriodCap: 1,
        periodCap: 3,
        reciprocalPairPeriodCap: 2,
    },
    receive_unique_save: {
        pairPeriodCap: 2,
        periodCap: 5,
        reciprocalPairPeriodCap: 3,
    },
    receive_unique_copy: {
        pairPeriodCap: 2,
        periodCap: 4,
        reciprocalPairPeriodCap: 3,
    },
} as const;

export const COMMUNITY_LOW_SIGNAL_EVENT_TYPES = Object.freeze(
    Object.keys(COMMUNITY_LOW_SIGNAL_GUARDRAIL_CONFIG) as readonly CommunityProgressionEventType[],
);

export const COMMUNITY_MISSION_BOARD_LIMIT = 3;
export const COMMUNITY_WEEKLY_CHALLENGE_SOURCE_PRIORITY = [
    'mission',
    'trend',
    'fallback',
] as const;
export const COMMUNITY_STREAK_CADENCE = 'weekly' as const;
export const COMMUNITY_STREAK_AT_RISK_WEEK_GAP = 1;
export const COMMUNITY_STREAK_REENTRY_WEEK_GAP = 2;
export const COMMUNITY_PUBLIC_SAFE_REWARD_KINDS = [
    'badge',
    'title',
    'season_mark',
    'squad_mark',
] as const satisfies readonly CommunityRewardKind[];

export function isCommunityRewardKindPublicSafe(
    rewardKind: string,
): rewardKind is (typeof COMMUNITY_PUBLIC_SAFE_REWARD_KINDS)[number] {
    return COMMUNITY_PUBLIC_SAFE_REWARD_KINDS.includes(
        rewardKind as (typeof COMMUNITY_PUBLIC_SAFE_REWARD_KINDS)[number],
    );
}

const COMMUNITY_PROGRESSION_XP_BY_EVENT = Object.freeze(
    COMMUNITY_PROGRESSION_RULE_ORDER.reduce((xpByEvent, eventType) => {
        xpByEvent[eventType] = COMMUNITY_PROGRESSION_RULES[eventType].defaultXp;
        return xpByEvent;
    }, {} as Record<CommunityProgressionEventType, number>),
);

export const COMMUNITY_PROGRESSION_POLICY_SNAPSHOT = Object.freeze({
    xpByEvent: COMMUNITY_PROGRESSION_XP_BY_EVENT,
    missionBoardLimit: COMMUNITY_MISSION_BOARD_LIMIT,
    weeklyChallengeSourcePriority: COMMUNITY_WEEKLY_CHALLENGE_SOURCE_PRIORITY,
    streak: {
        cadence: COMMUNITY_STREAK_CADENCE,
        atRiskWeekGap: COMMUNITY_STREAK_AT_RISK_WEEK_GAP,
        reentryWeekGap: COMMUNITY_STREAK_REENTRY_WEEK_GAP,
    },
    rewards: {
        publicSafeKinds: COMMUNITY_PUBLIC_SAFE_REWARD_KINDS,
        requiresFactualCopy: true,
        skillClaimsAllowed: false,
    },
    antiFarming: {
        lowSignalEventTypes: COMMUNITY_LOW_SIGNAL_EVENT_TYPES,
        caps: COMMUNITY_LOW_SIGNAL_GUARDRAIL_CONFIG,
    },
});
