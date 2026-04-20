import type {
    CommunityMissionConfig,
    CommunityMissionRow,
    CommunityProgressionEventRow,
    CommunityRewardRecordRow,
    CommunitySeasonRow,
} from '@/db/schema';
import type {
    CommunityProgressionEntityType,
    CommunityProgressionEventType,
    CommunityProgressionStreakState,
} from '@/types/community';

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;
const WEEK_MS = 7 * DAY_MS;

export interface CommunityLevelCurve {
    readonly baseXpPerLevel: number;
    readonly extraXpPerLevel: number;
}

export const COMMUNITY_LEVEL_CURVE: CommunityLevelCurve = {
    baseXpPerLevel: 100,
    extraXpPerLevel: 25,
};

type CommunityProgressionIdempotencyStrategy = 'entity' | 'source' | 'window';

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

const COMMUNITY_PROGRESSION_RULE_ORDER: readonly CommunityProgressionEventType[] = [
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
        title: 'Publicar analise',
        description: 'Publicar uma analise publica e elegivel para a comunidade.',
        defaultXp: 40,
        cooldownWindowMs: 0,
        requiresPublicEntity: true,
        requiresContext: false,
        requiresBeneficiary: false,
        requiresDistinctActors: false,
        meaningfulParticipation: true,
        idempotencyStrategy: 'entity',
        nextActionHint: {
            title: 'Publique uma analise publica',
            description: 'Transforme um snapshot util em post publico para ganhar XP real.',
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
            description: 'Adicione bio, links e setup publico para iniciar sua identidade comunitaria.',
        },
    },
    follow_profile: {
        eventType: 'follow_profile',
        title: 'Seguir operador',
        description: 'Seguir um operador publico para reforcar descoberta recorrente.',
        defaultXp: 10,
        cooldownWindowMs: 0,
        requiresPublicEntity: true,
        requiresContext: false,
        requiresBeneficiary: false,
        requiresDistinctActors: false,
        meaningfulParticipation: true,
        idempotencyStrategy: 'entity',
        nextActionHint: {
            title: 'Siga um operador relevante',
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

export function listCommunityProgressionRules(): readonly CommunityProgressionRuleDefinition[] {
    return COMMUNITY_PROGRESSION_RULE_ORDER.map(
        (eventType) => COMMUNITY_PROGRESSION_RULES[eventType],
    );
}

export function getCommunityProgressionRule(
    eventType: CommunityProgressionEventType,
): CommunityProgressionRuleDefinition {
    return COMMUNITY_PROGRESSION_RULES[eventType];
}

export interface CommunityProgressionHistoryEvent {
    readonly idempotencyKey: string;
    readonly eventType: CommunityProgressionEventType;
    readonly actorUserId: string;
    readonly beneficiaryUserId: string | null;
    readonly entityType: CommunityProgressionEntityType;
    readonly entityId: string;
    readonly rawXp: number;
    readonly effectiveXp: number;
    readonly occurredAt: Date;
    readonly seasonId: string | null;
    readonly missionId: string | null;
    readonly squadId: string | null;
}

export type CommunityProgressionEventHistorySource = Pick<
    CommunityProgressionEventRow,
    | 'idempotencyKey'
    | 'eventType'
    | 'actorUserId'
    | 'beneficiaryUserId'
    | 'entityType'
    | 'entityId'
    | 'rawXp'
    | 'effectiveXp'
    | 'occurredAt'
    | 'seasonId'
    | 'missionId'
    | 'squadId'
>;

export function toCommunityProgressionHistoryEvent(
    event: CommunityProgressionEventHistorySource,
): CommunityProgressionHistoryEvent {
    return {
        idempotencyKey: event.idempotencyKey,
        eventType: event.eventType,
        actorUserId: event.actorUserId,
        beneficiaryUserId: event.beneficiaryUserId ?? null,
        entityType: event.entityType,
        entityId: event.entityId,
        rawXp: normalizeNonNegativeInteger(event.rawXp),
        effectiveXp: normalizeNonNegativeInteger(event.effectiveXp),
        occurredAt: cloneDate(event.occurredAt),
        seasonId: event.seasonId ?? null,
        missionId: event.missionId ?? null,
        squadId: event.squadId ?? null,
    };
}

export type CommunitySeasonSource = Pick<
    CommunitySeasonRow,
    'id' | 'slug' | 'title' | 'theme' | 'summary' | 'status' | 'startsAt' | 'endsAt'
>;

export interface CommunitySeasonContext {
    readonly kind: 'active' | 'evergreen';
    readonly seasonId: string | null;
    readonly slug: string | null;
    readonly title: string;
    readonly theme: string;
    readonly summary: string;
    readonly startsAt: Date | null;
    readonly endsAt: Date | null;
}

export interface ResolveActiveCommunitySeasonInput {
    readonly seasons: readonly CommunitySeasonSource[];
    readonly now?: Date;
}

export interface CommunityWeeklyChallengeTrendSignal {
    readonly key: string;
    readonly kind: 'weapon' | 'patch' | 'diagnosis';
    readonly value: string;
    readonly label: string;
    readonly href: string;
    readonly postCount: number;
    readonly engagementCount: number;
    readonly reason: string;
}

export interface CommunityWeeklyChallengeEligibleActionMetadata {
    readonly eventType: CommunityProgressionEventType;
    readonly entityType: CommunityProgressionEntityType | null;
    readonly title: string;
    readonly description: string;
    readonly defaultXp: number;
    readonly meaningfulParticipation: boolean;
}

export interface CommunityWeeklyChallengeResolution {
    readonly source: 'mission' | 'trend' | 'fallback';
    readonly missionId: string | null;
    readonly seasonId: string | null;
    readonly title: string;
    readonly description: string;
    readonly rationale: string;
    readonly theme: string;
    readonly startsAt: Date;
    readonly endsAt: Date;
    readonly eligibleActions: readonly CommunityWeeklyChallengeEligibleActionMetadata[];
    readonly trend: CommunityWeeklyChallengeTrendSignal | null;
}

export interface ResolveCommunityWeeklyChallengeInput {
    readonly seasons?: readonly CommunitySeasonSource[];
    readonly seasonContext?: CommunitySeasonContext | null;
    readonly missions?: readonly CommunityProgressionMissionSource[];
    readonly trends?: readonly CommunityWeeklyChallengeTrendSignal[];
    readonly now?: Date;
}

export type CommunityRewardRecordSource = Pick<
    CommunityRewardRecordRow,
    | 'displayState'
    | 'earnedAt'
    | 'id'
    | 'isPublicSafe'
    | 'label'
    | 'ownerType'
    | 'rewardKind'
    | 'squadId'
    | 'status'
    | 'userId'
>;

export interface CommunityRecapWindow {
    readonly kind: 'current' | 'previous';
    readonly startsAt: Date;
    readonly endsAt: Date;
}

export interface CommunityRecapRitualSummary {
    readonly key: string;
    readonly title: string;
    readonly description: string;
    readonly count: number;
    readonly completedAt: Date;
}

export interface CommunityRecapRewardSummary {
    readonly id: string;
    readonly rewardKind: CommunityRewardRecordRow['rewardKind'];
    readonly label: string;
    readonly isPublicSafe: boolean;
    readonly displayState: CommunityRewardRecordRow['displayState'];
    readonly earnedAt: Date;
}

export type CommunityRecapState = 'zero_state' | 'recap' | 'reentry';

export interface CommunityPersonalRecap {
    readonly state: CommunityRecapState;
    readonly userId: string;
    readonly season: CommunitySeasonContext;
    readonly window: CommunityRecapWindow | null;
    readonly headline: string;
    readonly summary: string;
    readonly earnedXp: number;
    readonly completedRituals: readonly CommunityRecapRitualSummary[];
    readonly unlockedRewards: readonly CommunityRecapRewardSummary[];
    readonly nextAction: CommunityProgressionNextAction;
    readonly streak: CommunityProgressionStreakSnapshot;
}

export interface BuildCommunityPersonalRecapInput {
    readonly userId: string;
    readonly events: readonly CommunityProgressionHistoryEvent[];
    readonly missions?: readonly CommunityProgressionMissionSource[];
    readonly rewards?: readonly CommunityRewardRecordSource[];
    readonly seasons?: readonly CommunitySeasonSource[];
    readonly now?: Date;
}

export interface CommunitySquadRecap {
    readonly state: CommunityRecapState;
    readonly squadId: string;
    readonly squadName: string;
    readonly memberCount: number;
    readonly activeMemberCount: number;
    readonly season: CommunitySeasonContext;
    readonly window: CommunityRecapWindow | null;
    readonly headline: string;
    readonly summary: string;
    readonly earnedXp: number;
    readonly completedRituals: readonly CommunityRecapRitualSummary[];
    readonly unlockedRewards: readonly CommunityRecapRewardSummary[];
    readonly nextAction: CommunityProgressionNextAction;
}

export interface BuildCommunitySquadRecapInput {
    readonly squadId: string;
    readonly squadName: string;
    readonly memberUserIds: readonly string[];
    readonly events: readonly CommunityProgressionHistoryEvent[];
    readonly missions?: readonly CommunityProgressionMissionSource[];
    readonly rewards?: readonly CommunityRewardRecordSource[];
    readonly seasons?: readonly CommunitySeasonSource[];
    readonly now?: Date;
}

export function resolveActiveCommunitySeason(
    input: ResolveActiveCommunitySeasonInput,
): CommunitySeasonContext {
    const now = cloneDate(input.now ?? new Date());
    const activeSeason = input.seasons
        .filter((season) =>
            season.status === 'active'
            && season.startsAt.getTime() <= now.getTime()
            && season.endsAt.getTime() >= now.getTime(),
        )
        .sort((left, right) => {
            const startDelta = right.startsAt.getTime() - left.startsAt.getTime();

            if (startDelta !== 0) {
                return startDelta;
            }

            return left.endsAt.getTime() - right.endsAt.getTime();
        })[0];

    if (activeSeason) {
        return {
            kind: 'active',
            seasonId: activeSeason.id,
            slug: activeSeason.slug,
            title: activeSeason.title,
            theme: activeSeason.theme,
            summary: activeSeason.summary?.trim()
                || 'Temporada ativa com foco em contribuicoes uteis da comunidade.',
            startsAt: cloneDate(activeSeason.startsAt),
            endsAt: cloneDate(activeSeason.endsAt),
        };
    }

    return {
        kind: 'evergreen',
        seasonId: null,
        slug: null,
        title: 'Progressao da comunidade',
        theme: 'Evergreen',
        summary: 'Sem temporada ativa no momento. Continue contribuindo com progresso neutro e sem ranking sazonal.',
        startsAt: null,
        endsAt: null,
    };
}

export function resolveCommunityWeeklyChallenge(
    input: ResolveCommunityWeeklyChallengeInput,
): CommunityWeeklyChallengeResolution {
    const now = cloneDate(input.now ?? new Date());
    const seasonContext = input.seasonContext
        ?? resolveActiveCommunitySeason({
            seasons: input.seasons ?? [],
            now,
        });
    const currentWeekWindow = getUtcWeekWindow(now);
    const activeMission = selectActiveWeeklyChallengeMission(input.missions ?? [], now);

    if (activeMission) {
        const eligibleActions = resolveWeeklyChallengeEligibleActionsFromMission(activeMission);

        return {
            source: 'mission',
            missionId: activeMission.id,
            seasonId: activeMission.seasonId
                ?? (seasonContext.kind === 'active' ? seasonContext.seasonId : null),
            title: activeMission.title,
            description: activeMission.description,
            rationale: activeMission.theme?.trim()
                || seasonContext.summary,
            theme: activeMission.theme?.trim()
                || seasonContext.theme,
            startsAt: cloneDate(activeMission.startsAt ?? currentWeekWindow.startsAt),
            endsAt: cloneDate(activeMission.endsAt ?? currentWeekWindow.endsAt),
            eligibleActions,
            trend: selectTopWeeklyChallengeTrend(input.trends ?? []),
        };
    }

    const topTrend = selectTopWeeklyChallengeTrend(input.trends ?? []);

    if (topTrend) {
        return {
            source: 'trend',
            missionId: null,
            seasonId: seasonContext.kind === 'active'
                ? seasonContext.seasonId
                : null,
            title: buildTrendWeeklyChallengeTitle(topTrend),
            description: buildTrendWeeklyChallengeDescription(topTrend),
            rationale: topTrend.reason,
            theme: seasonContext.theme,
            startsAt: currentWeekWindow.startsAt,
            endsAt: currentWeekWindow.endsAt,
            eligibleActions: buildTrendWeeklyChallengeEligibleActions(topTrend),
            trend: topTrend,
        };
    }

    return {
        source: 'fallback',
        missionId: null,
        seasonId: seasonContext.kind === 'active'
            ? seasonContext.seasonId
            : null,
        title: 'Desafio semanal: publique um snapshot util',
        description: 'Sem tendencia publica suficiente ainda. Escolha uma analise, organize seu perfil ou publique um snapshot claro para abrir o proximo ritual da comunidade.',
        rationale: 'Fallback editorial neutro para semanas com pouco contexto publico.',
        theme: seasonContext.theme,
        startsAt: currentWeekWindow.startsAt,
        endsAt: currentWeekWindow.endsAt,
        eligibleActions: [
            createChallengeEligibleActionMetadata('complete_public_profile', {
                title: 'Complete sua operator plate',
                description: 'Ative ou revise seu perfil publico para preparar seus proximos rituais.',
                entityType: 'profile',
            }),
            createChallengeEligibleActionMetadata('publish_post', {
                title: 'Publique um snapshot util',
                description: 'Compartilhe uma analise publica que possa virar save, copy ou comentario contextual.',
                entityType: 'post',
            }),
        ],
        trend: null,
    };
}

export type CommunityProgressionIgnoreReason =
    | 'cooldown_active'
    | 'duplicate_event'
    | 'entity_archived'
    | 'entity_deleted'
    | 'entity_hidden'
    | 'entity_moderated'
    | 'entity_not_public'
    | 'missing_beneficiary'
    | 'missing_context'
    | 'missing_dedupe_key'
    | 'self_benefit_blocked';

export interface CommunityProgressionEventRecord {
    readonly seasonId: string | null;
    readonly missionId: string | null;
    readonly squadId: string | null;
    readonly actorUserId: string;
    readonly beneficiaryUserId: string | null;
    readonly eventType: CommunityProgressionEventType;
    readonly entityType: CommunityProgressionEntityType;
    readonly entityId: string;
    readonly idempotencyKey: string;
    readonly rawXp: number;
    readonly effectiveXp: number;
    readonly metadata: Readonly<Record<string, unknown>>;
    readonly occurredAt: Date;
}

export interface CommunityProgressionRecordInput {
    readonly actorUserId: string;
    readonly beneficiaryUserId?: string | null;
    readonly dedupeKey?: string | null;
    readonly entityId: string;
    readonly entityType: CommunityProgressionEntityType;
    readonly eventType: CommunityProgressionEventType;
    readonly history?: readonly CommunityProgressionHistoryEvent[];
    readonly metadata?: Readonly<Record<string, unknown>>;
    readonly occurredAt?: Date;
    readonly rawXpOverride?: number | null;
    readonly effectiveXpOverride?: number | null;
    readonly seasonId?: string | null;
    readonly missionId?: string | null;
    readonly squadId?: string | null;
    readonly isArchived?: boolean;
    readonly isDeleted?: boolean;
    readonly isHidden?: boolean;
    readonly isModerated?: boolean;
    readonly isPubliclyVisible?: boolean;
    readonly hasRequiredContext?: boolean;
}

interface NormalizedCommunityProgressionRecordInput
    extends Omit<
        CommunityProgressionRecordInput,
        'beneficiaryUserId' | 'dedupeKey' | 'history' | 'metadata' | 'occurredAt'
    > {
    readonly actorUserId: string;
    readonly beneficiaryUserId: string | null;
    readonly dedupeKey: string | null;
    readonly history: readonly CommunityProgressionHistoryEvent[];
    readonly metadata: Readonly<Record<string, unknown>>;
    readonly occurredAt: Date;
}

type CommunityProgressionRecordResult =
    | {
        readonly outcome: 'ignored';
        readonly rule: CommunityProgressionRuleDefinition;
        readonly reason: CommunityProgressionIgnoreReason;
        readonly cooldownEndsAt?: Date;
    }
    | {
        readonly outcome: 'recorded';
        readonly rule: CommunityProgressionRuleDefinition;
        readonly event: CommunityProgressionEventRecord;
    };

export function recordCommunityProgressionEvent(
    input: CommunityProgressionRecordInput,
): CommunityProgressionRecordResult {
    const normalizedInput = normalizeCommunityProgressionRecordInput(input);
    const rule = getCommunityProgressionRule(normalizedInput.eventType);
    const ignoredReason = getCommunityProgressionIgnoreReason(normalizedInput, rule);

    if (ignoredReason) {
        return {
            outcome: 'ignored',
            rule,
            reason: ignoredReason,
        };
    }

    const idempotencyKey = buildCommunityProgressionIdempotencyKey(
        normalizedInput,
        rule,
    );

    if (normalizedInput.history.some((event) => event.idempotencyKey === idempotencyKey)) {
        return {
            outcome: 'ignored',
            rule,
            reason: 'duplicate_event',
        };
    }

    const cooldownEvent = findRecentCooldownEvent(normalizedInput, rule);

    if (cooldownEvent) {
        return {
            outcome: 'ignored',
            rule,
            reason: 'cooldown_active',
            cooldownEndsAt: new Date(
                cooldownEvent.occurredAt.getTime() + rule.cooldownWindowMs,
            ),
        };
    }

    const rawXp = normalizeNonNegativeInteger(
        normalizedInput.rawXpOverride ?? rule.defaultXp,
    );
    const effectiveXp = normalizeNonNegativeInteger(
        normalizedInput.effectiveXpOverride ?? rawXp,
    );

    return {
        outcome: 'recorded',
        rule,
        event: {
            seasonId: normalizedInput.seasonId ?? null,
            missionId: normalizedInput.missionId ?? null,
            squadId: normalizedInput.squadId ?? null,
            actorUserId: normalizedInput.actorUserId,
            beneficiaryUserId: normalizedInput.beneficiaryUserId,
            eventType: normalizedInput.eventType,
            entityType: normalizedInput.entityType,
            entityId: normalizedInput.entityId,
            idempotencyKey,
            rawXp,
            effectiveXp,
            metadata: normalizedInput.metadata,
            occurredAt: normalizedInput.occurredAt,
        },
    };
}

export interface CommunityLevelState {
    readonly totalXp: number;
    readonly level: number;
    readonly currentLevelFloorXp: number;
    readonly currentLevelXp: number;
    readonly nextLevelTotalXp: number;
    readonly nextLevelXp: number;
    readonly xpToNextLevel: number;
    readonly progressRatio: number;
}

export function calculateCommunityLevelState(
    totalXp: number,
    curve: CommunityLevelCurve = COMMUNITY_LEVEL_CURVE,
): CommunityLevelState {
    const safeTotalXp = normalizeNonNegativeInteger(totalXp);
    let level = 1;
    let currentLevelFloorXp = 0;
    let currentLevelSpan = getXpSpanForLevel(level, curve);

    while (safeTotalXp >= currentLevelFloorXp + currentLevelSpan) {
        currentLevelFloorXp += currentLevelSpan;
        level += 1;
        currentLevelSpan = getXpSpanForLevel(level, curve);
    }

    const currentLevelXp = safeTotalXp - currentLevelFloorXp;
    const xpToNextLevel = Math.max(currentLevelSpan - currentLevelXp, 0);

    return {
        totalXp: safeTotalXp,
        level,
        currentLevelFloorXp,
        currentLevelXp,
        nextLevelTotalXp: currentLevelFloorXp + currentLevelSpan,
        nextLevelXp: currentLevelSpan,
        xpToNextLevel,
        progressRatio: currentLevelSpan === 0
            ? 1
            : clampRatio(currentLevelXp / currentLevelSpan),
    };
}

export type CommunityProgressionMissionSource = Pick<
    CommunityMissionRow,
    | 'cadence'
    | 'config'
    | 'description'
    | 'eligibleActions'
    | 'endsAt'
    | 'id'
    | 'missionType'
    | 'rewardXp'
    | 'seasonId'
    | 'startsAt'
    | 'status'
    | 'targetCount'
    | 'theme'
    | 'title'
>;

export interface CommunityMissionProgressSnapshot {
    readonly missionId: string;
    readonly title: string;
    readonly description: string;
    readonly missionType: CommunityMissionRow['missionType'];
    readonly cadence: CommunityMissionRow['cadence'];
    readonly status: CommunityMissionRow['status'];
    readonly targetCount: number;
    readonly currentCount: number;
    readonly remainingCount: number;
    readonly completionRatio: number;
    readonly isComplete: boolean;
    readonly rewardXp: number;
    readonly eligibleEventTypes: readonly CommunityProgressionEventType[];
    readonly startsAt: Date | null;
    readonly endsAt: Date | null;
    readonly completedAt: Date | null;
}

export interface BuildCommunityMissionProgressSnapshotsInput {
    readonly userId: string;
    readonly missions: readonly CommunityProgressionMissionSource[];
    readonly events: readonly CommunityProgressionHistoryEvent[];
    readonly now?: Date;
}

export function buildCommunityMissionProgressSnapshots(
    input: BuildCommunityMissionProgressSnapshotsInput,
): readonly CommunityMissionProgressSnapshot[] {
    const now = cloneDate(input.now ?? new Date());
    const userEvents = getCommunityProgressionEventsForUser(input.userId, input.events);

    return input.missions.map((mission) =>
        buildCommunityMissionProgressSnapshot({
            mission,
            userEvents,
            now,
        }),
    );
}

export interface CommunityProgressionStreakSnapshot {
    readonly currentStreak: number;
    readonly longestStreak: number;
    readonly streakState: CommunityProgressionStreakState;
    readonly lastMeaningfulAt: Date | null;
    readonly lastWindowStartedAt: Date | null;
    readonly lastWindowEndedAt: Date | null;
    readonly nextWindowStartsAt: Date | null;
    readonly nextWindowEndsAt: Date | null;
    readonly missedWindowCount: number;
}

export interface BuildCommunityProgressionStreakSnapshotInput {
    readonly userId: string;
    readonly events: readonly CommunityProgressionHistoryEvent[];
    readonly now?: Date;
}

export function buildCommunityProgressionStreakSnapshot(
    input: BuildCommunityProgressionStreakSnapshotInput,
): CommunityProgressionStreakSnapshot {
    const now = cloneDate(input.now ?? new Date());
    const meaningfulEvents = getMeaningfulCommunityProgressionEventsForUser(
        input.userId,
        input.events,
        now,
    );

    if (meaningfulEvents.length === 0) {
        const currentWeekWindow = getUtcWeekWindow(now);

        return {
            currentStreak: 0,
            longestStreak: 0,
            streakState: 'inactive',
            lastMeaningfulAt: null,
            lastWindowStartedAt: null,
            lastWindowEndedAt: null,
            nextWindowStartsAt: currentWeekWindow.startsAt,
            nextWindowEndsAt: currentWeekWindow.endsAt,
            missedWindowCount: 0,
        };
    }

    const weekStarts = uniqueUtcWeekStarts(
        meaningfulEvents.map((event) => event.occurredAt),
    );
    const streakRuns = buildStreakRuns(weekStarts, differenceInUtcWeeks);
    const latestRun = streakRuns[streakRuns.length - 1]!;
    const currentWeekWindow = getUtcWeekWindow(now);
    const currentWeekStart = currentWeekWindow.startsAt;
    const latestWeekStart = latestRun.end;
    const weeksSinceLatestRun = differenceInUtcWeeks(currentWeekStart, latestWeekStart);
    const longestStreak = streakRuns.reduce(
        (longest, run) => Math.max(longest, run.length),
        0,
    );
    const nextWeekStart = addWeeks(latestWeekStart, 1);

    let currentStreak = latestRun.length;
    let streakState: CommunityProgressionStreakState = 'active';
    let missedWindowCount = 0;

    if (weeksSinceLatestRun === 0) {
        streakState = 'active';
    } else if (weeksSinceLatestRun === 1) {
        streakState = 'at_risk';
    } else {
        streakState = 'reentry';
        currentStreak = 0;
        missedWindowCount = Math.max(weeksSinceLatestRun - 1, 1);
    }

    const lastMeaningfulAt = meaningfulEvents.reduce(
        (latest, event) =>
            event.occurredAt.getTime() > latest.getTime() ? event.occurredAt : latest,
        meaningfulEvents[0]!.occurredAt,
    );

    return {
        currentStreak,
        longestStreak,
        streakState,
        lastMeaningfulAt: cloneDate(lastMeaningfulAt),
        lastWindowStartedAt: cloneDate(latestRun.start),
        lastWindowEndedAt: endOfUtcWeek(latestRun.end),
        nextWindowStartsAt: cloneDate(
            streakState === 'reentry' ? currentWeekWindow.startsAt : nextWeekStart,
        ),
        nextWindowEndsAt: cloneDate(
            streakState === 'reentry' ? currentWeekWindow.endsAt : endOfUtcWeek(nextWeekStart),
        ),
        missedWindowCount,
    };
}

export interface CommunityProgressionAggregateSnapshot {
    readonly totalXp: number;
    readonly currentLevel: number;
    readonly currentLevelXp: number;
    readonly nextLevelXp: number;
    readonly activeMissionCount: number;
    readonly currentStreak: number;
    readonly longestStreak: number;
    readonly streakState: CommunityProgressionStreakState;
    readonly lastMeaningfulAt: Date | null;
    readonly lastWindowStartedAt: Date | null;
    readonly lastWindowEndedAt: Date | null;
    readonly nextWindowStartsAt: Date | null;
    readonly nextWindowEndsAt: Date | null;
    readonly missedWindowCount: number;
    readonly levelState: CommunityLevelState;
}

export interface BuildCommunityProgressionAggregateSnapshotInput {
    readonly userId: string;
    readonly events: readonly CommunityProgressionHistoryEvent[];
    readonly missions?: readonly CommunityProgressionMissionSource[];
    readonly now?: Date;
    readonly curve?: CommunityLevelCurve;
}

export function buildCommunityProgressionAggregateSnapshot(
    input: BuildCommunityProgressionAggregateSnapshotInput,
): CommunityProgressionAggregateSnapshot {
    const missions = input.missions ?? [];
    const now = cloneDate(input.now ?? new Date());
    const userEvents = getCommunityProgressionEventsForUser(input.userId, input.events);
    const totalXp = userEvents.reduce(
        (sum, event) => sum + normalizeNonNegativeInteger(event.effectiveXp),
        0,
    );
    const levelState = calculateCommunityLevelState(totalXp, input.curve);
    const missionProgress = buildCommunityMissionProgressSnapshots({
        userId: input.userId,
        missions,
        events: input.events,
        now,
    });
    const activeMissionCount = missionProgress.filter((mission) =>
        isMissionActiveAt(mission, now) && !mission.isComplete,
    ).length;
    const streak = buildCommunityProgressionStreakSnapshot({
        userId: input.userId,
        events: input.events,
        now,
    });

    return {
        totalXp: levelState.totalXp,
        currentLevel: levelState.level,
        currentLevelXp: levelState.currentLevelXp,
        nextLevelXp: levelState.nextLevelXp,
        activeMissionCount,
        currentStreak: streak.currentStreak,
        longestStreak: streak.longestStreak,
        streakState: streak.streakState,
        lastMeaningfulAt: streak.lastMeaningfulAt,
        lastWindowStartedAt: streak.lastWindowStartedAt,
        lastWindowEndedAt: streak.lastWindowEndedAt,
        nextWindowStartsAt: streak.nextWindowStartsAt,
        nextWindowEndsAt: streak.nextWindowEndsAt,
        missedWindowCount: streak.missedWindowCount,
        levelState,
    };
}

export interface CommunityProgressionNextMilestone {
    readonly type: 'level' | 'mission';
    readonly title: string;
    readonly description: string;
    readonly remainingCount?: number;
    readonly remainingXp?: number;
    readonly missionId?: string;
}

export interface CommunityProgressionNextAction {
    readonly eventType: CommunityProgressionEventType;
    readonly title: string;
    readonly description: string;
}

export interface CommunityPrivateProgressionSummary {
    readonly userId: string;
    readonly isZeroState: boolean;
    readonly totalEventCount: number;
    readonly totalXp: number;
    readonly currentLevel: number;
    readonly currentLevelXp: number;
    readonly nextLevelXp: number;
    readonly activeMissionCount: number;
    readonly completedMissionCount: number;
    readonly aggregate: CommunityProgressionAggregateSnapshot;
    readonly missionProgress: readonly CommunityMissionProgressSnapshot[];
    readonly streak: CommunityProgressionStreakSnapshot;
    readonly nextMilestone: CommunityProgressionNextMilestone;
    readonly nextMeaningfulAction: CommunityProgressionNextAction;
}

export interface BuildCommunityPrivateProgressionSummaryInput {
    readonly userId: string;
    readonly events: readonly CommunityProgressionHistoryEvent[];
    readonly missions?: readonly CommunityProgressionMissionSource[];
    readonly now?: Date;
    readonly curve?: CommunityLevelCurve;
}

export function buildCommunityPrivateProgressionSummary(
    input: BuildCommunityPrivateProgressionSummaryInput,
): CommunityPrivateProgressionSummary {
    const missions = input.missions ?? [];
    const now = cloneDate(input.now ?? new Date());
    const userEvents = getCommunityProgressionEventsForUser(input.userId, input.events)
        .filter((event) => event.effectiveXp > 0);
    const aggregate = buildCommunityProgressionAggregateSnapshot({
        userId: input.userId,
        events: input.events,
        missions,
        now,
        ...(input.curve ? { curve: input.curve } : {}),
    });
    const streak = buildCommunityProgressionStreakSnapshot({
        userId: input.userId,
        events: input.events,
        now,
    });
    const missionProgress = buildCommunityMissionProgressSnapshots({
        userId: input.userId,
        missions,
        events: input.events,
        now,
    }).slice().sort((left, right) => compareMissionProgress(left, right, now));
    const activeMissions = missionProgress.filter((mission) =>
        isMissionActiveAt(mission, now) && !mission.isComplete,
    );
    const completedMissionCount = missionProgress.filter((mission) => mission.isComplete).length;

    return {
        userId: input.userId,
        isZeroState: aggregate.totalXp === 0 && userEvents.length === 0,
        totalEventCount: userEvents.length,
        totalXp: aggregate.totalXp,
        currentLevel: aggregate.currentLevel,
        currentLevelXp: aggregate.currentLevelXp,
        nextLevelXp: aggregate.nextLevelXp,
        activeMissionCount: aggregate.activeMissionCount,
        completedMissionCount,
        aggregate,
        missionProgress,
        streak,
        nextMilestone: resolveNextMilestone({
            activeMissions,
            aggregate,
        }),
        nextMeaningfulAction: resolveNextMeaningfulAction({
            actorEvents: input.events.filter((event) =>
                event.actorUserId === input.userId && event.effectiveXp > 0,
            ),
            activeMissions,
        }),
    };
}

export function buildCommunityPersonalRecap(
    input: BuildCommunityPersonalRecapInput,
): CommunityPersonalRecap {
    const missions = input.missions ?? [];
    const rewards = input.rewards ?? [];
    const now = cloneDate(input.now ?? new Date());
    const season = resolveActiveCommunitySeason({
        seasons: input.seasons ?? [],
        now,
    });
    const userEvents = getCommunityProgressionEventsForUser(input.userId, input.events)
        .filter((event) =>
            event.occurredAt.getTime() <= now.getTime()
            && event.effectiveXp > 0,
        );
    const summary = buildCommunityPrivateProgressionSummary({
        userId: input.userId,
        events: input.events,
        missions,
        now,
    });
    const recapWindow = resolveRecentRecapWindow(userEvents, now);

    if (userEvents.length === 0) {
        return {
            state: 'zero_state',
            userId: input.userId,
            season,
            window: null,
            headline: 'Comece seu primeiro ritual comunitario',
            summary: 'Complete o perfil publico ou publique uma analise util para iniciar seu progresso semanal sem pressa artificial.',
            earnedXp: 0,
            completedRituals: [],
            unlockedRewards: [],
            nextAction: summary.nextMeaningfulAction,
            streak: summary.streak,
        };
    }

    if (!recapWindow) {
        return {
            state: 'reentry',
            userId: input.userId,
            season,
            window: null,
            headline: 'Retome seu loop com calma',
            summary: 'Voce pode reiniciar seu ritmo nesta semana com uma unica contribuicao significativa, sem perder o contexto do que ja construiu.',
            earnedXp: 0,
            completedRituals: [],
            unlockedRewards: [],
            nextAction: summary.nextMeaningfulAction,
            streak: summary.streak,
        };
    }

    const windowEvents = filterEventsInRecapWindow(userEvents, recapWindow);
    const unlockedRewards = filterUnlockedRewards({
        rewards,
        ownerType: 'user',
        userId: input.userId,
        window: recapWindow,
    });
    const earnedXp = windowEvents.reduce(
        (sum, event) => sum + normalizeNonNegativeInteger(event.effectiveXp),
        0,
    );

    return {
        state: 'recap',
        userId: input.userId,
        season,
        window: recapWindow,
        headline: recapWindow.kind === 'current'
            ? 'Seu recap da semana'
            : 'Seu recap da semana passada',
        summary: buildRecapSummaryCopy({
            earnedXp,
            rewardCount: unlockedRewards.length,
            ritualCount: buildRecapRitualSummaries({
                events: windowEvents,
                missions,
            }).length,
            recapWindow,
        }),
        earnedXp,
        completedRituals: buildRecapRitualSummaries({
            events: windowEvents,
            missions,
        }),
        unlockedRewards,
        nextAction: summary.nextMeaningfulAction,
        streak: summary.streak,
    };
}

export function buildCommunitySquadRecap(
    input: BuildCommunitySquadRecapInput,
): CommunitySquadRecap {
    const missions = input.missions ?? [];
    const rewards = input.rewards ?? [];
    const now = cloneDate(input.now ?? new Date());
    const season = resolveActiveCommunitySeason({
        seasons: input.seasons ?? [],
        now,
    });
    const memberUserIds = uniqueValues(
        input.memberUserIds
            .map((userId) => userId.trim())
            .filter(Boolean),
    );
    const squadEvents = input.events
        .filter((event) => memberUserIds.includes(getCommunityProgressionUserId(event)))
        .filter((event) => event.occurredAt.getTime() <= now.getTime())
        .filter((event) => event.effectiveXp > 0)
        .sort((left, right) => left.occurredAt.getTime() - right.occurredAt.getTime());
    const recapWindow = resolveRecentRecapWindow(squadEvents, now);
    const activeMissions = buildCommunityMissionProgressSnapshotsForActors({
        actorUserIds: memberUserIds,
        missions,
        events: input.events,
        now,
    }).filter((mission) => isMissionActiveAt(mission, now) && !mission.isComplete);
    const nextAction = resolveNextMeaningfulAction({
        actorEvents: input.events.filter((event) => memberUserIds.includes(event.actorUserId)),
        activeMissions,
        actionRulePriority: [
            'publish_post',
            'comment_with_context',
        ],
    });

    if (squadEvents.length === 0) {
        return {
            state: 'zero_state',
            squadId: input.squadId,
            squadName: input.squadName,
            memberCount: memberUserIds.length,
            activeMemberCount: 0,
            season,
            window: null,
            headline: `Inicie o recap do squad ${input.squadName}`,
            summary: 'O squad ainda nao registrou rituais suficientes. Comecem com uma analise publica ou comentario contextual compartilhado.',
            earnedXp: 0,
            completedRituals: [],
            unlockedRewards: [],
            nextAction,
        };
    }

    if (!recapWindow) {
        return {
            state: 'reentry',
            squadId: input.squadId,
            squadName: input.squadName,
            memberCount: memberUserIds.length,
            activeMemberCount: 0,
            season,
            window: null,
            headline: `Reative o squad ${input.squadName}`,
            summary: 'Uma unica contribuicao coletiva nesta semana ja recoloca o squad no loop, sem copy agressiva ou urgencia artificial.',
            earnedXp: 0,
            completedRituals: [],
            unlockedRewards: [],
            nextAction,
        };
    }

    const windowEvents = filterEventsInRecapWindow(squadEvents, recapWindow);
    const activeMemberCount = countActiveRecapMembers(windowEvents);
    const unlockedRewards = filterUnlockedRewards({
        rewards,
        ownerType: 'squad',
        squadId: input.squadId,
        window: recapWindow,
    });
    const earnedXp = windowEvents.reduce(
        (sum, event) => sum + normalizeNonNegativeInteger(event.effectiveXp),
        0,
    );
    const completedRituals = buildRecapRitualSummaries({
        events: windowEvents,
        missions,
    });

    return {
        state: 'recap',
        squadId: input.squadId,
        squadName: input.squadName,
        memberCount: memberUserIds.length,
        activeMemberCount,
        season,
        window: recapWindow,
        headline: recapWindow.kind === 'current'
            ? `Recap semanal do squad ${input.squadName}`
            : `Recap anterior do squad ${input.squadName}`,
        summary: `${activeMemberCount} membro(s) ativos, ${completedRituals.length} ritual(is) concluido(s) e ${earnedXp} XP somados nesta janela.`,
        earnedXp,
        completedRituals,
        unlockedRewards,
        nextAction,
    };
}

function normalizeCommunityProgressionRecordInput(
    input: CommunityProgressionRecordInput,
): NormalizedCommunityProgressionRecordInput {
    const actorUserId = normalizeRequiredIdentifier(input.actorUserId, 'actorUserId');
    const entityId = normalizeRequiredIdentifier(input.entityId, 'entityId');

    return {
        ...input,
        actorUserId,
        beneficiaryUserId: normalizeOptionalIdentifier(input.beneficiaryUserId),
        dedupeKey: normalizeOptionalIdentifier(input.dedupeKey),
        entityId,
        history: input.history ?? [],
        metadata: input.metadata ?? {},
        occurredAt: cloneDate(input.occurredAt ?? new Date()),
    };
}

function getCommunityProgressionIgnoreReason(
    input: NormalizedCommunityProgressionRecordInput,
    rule: CommunityProgressionRuleDefinition,
): CommunityProgressionIgnoreReason | null {
    if (rule.requiresBeneficiary && !input.beneficiaryUserId) {
        return 'missing_beneficiary';
    }

    if (rule.idempotencyStrategy === 'source' && !input.dedupeKey) {
        return 'missing_dedupe_key';
    }

    if (rule.requiresPublicEntity && input.isPubliclyVisible !== true) {
        return 'entity_not_public';
    }

    if (input.isHidden) {
        return 'entity_hidden';
    }

    if (input.isArchived) {
        return 'entity_archived';
    }

    if (input.isDeleted) {
        return 'entity_deleted';
    }

    if (input.isModerated) {
        return 'entity_moderated';
    }

    if (rule.requiresContext && input.hasRequiredContext !== true) {
        return 'missing_context';
    }

    if (
        rule.requiresDistinctActors
        && input.beneficiaryUserId
        && input.beneficiaryUserId === input.actorUserId
    ) {
        return 'self_benefit_blocked';
    }

    return null;
}

function buildCommunityProgressionIdempotencyKey(
    input: NormalizedCommunityProgressionRecordInput,
    rule: CommunityProgressionRuleDefinition,
): string {
    const fingerprintBase = [
        input.eventType,
        input.actorUserId,
        input.beneficiaryUserId ?? '-',
        input.entityType,
        input.entityId,
    ].join(':');

    if (rule.idempotencyStrategy === 'entity') {
        return fingerprintBase;
    }

    if (rule.idempotencyStrategy === 'source') {
        return `${fingerprintBase}:${input.dedupeKey ?? '-'}`;
    }

    const windowStart = input.eventType === 'streak_participation'
        ? startOfUtcWeek(input.occurredAt)
        : startOfUtcDay(input.occurredAt);

    return `${fingerprintBase}:${windowStart.toISOString()}`;
}

function findRecentCooldownEvent(
    input: NormalizedCommunityProgressionRecordInput,
    rule: CommunityProgressionRuleDefinition,
): CommunityProgressionHistoryEvent | null {
    if (rule.cooldownWindowMs <= 0) {
        return null;
    }

    let latestMatchingEvent: CommunityProgressionHistoryEvent | null = null;

    for (const event of input.history) {
        if (
            event.eventType !== input.eventType
            || event.actorUserId !== input.actorUserId
            || event.beneficiaryUserId !== input.beneficiaryUserId
            || event.entityType !== input.entityType
            || event.entityId !== input.entityId
        ) {
            continue;
        }

        const deltaMs = input.occurredAt.getTime() - event.occurredAt.getTime();

        if (deltaMs < 0 || deltaMs >= rule.cooldownWindowMs) {
            continue;
        }

        if (
            !latestMatchingEvent
            || event.occurredAt.getTime() > latestMatchingEvent.occurredAt.getTime()
        ) {
            latestMatchingEvent = event;
        }
    }

    return latestMatchingEvent;
}

function buildCommunityMissionProgressSnapshot(input: {
    readonly mission: CommunityProgressionMissionSource;
    readonly userEvents: readonly CommunityProgressionHistoryEvent[];
    readonly now: Date;
}): CommunityMissionProgressSnapshot {
    const targetCount = resolveMissionTargetCount(input.mission);
    const eligibleEventTypes = resolveMissionEligibleEventTypes(input.mission);
    const completionEvents = input.userEvents
        .filter((event) =>
            event.missionId === input.mission.id
            && (
                event.eventType === 'mission_complete'
                || event.eventType === 'weekly_challenge_complete'
            ),
        )
        .sort((left, right) => left.occurredAt.getTime() - right.occurredAt.getTime());

    let currentCount = 0;
    let completedAt: Date | null = null;

    if (completionEvents.length > 0) {
        currentCount = targetCount;
        completedAt = cloneDate(completionEvents[0]!.occurredAt);
    } else {
        const matchedEvents = input.userEvents
            .filter((event) => matchesMissionProgressEvent(event, input.mission))
            .sort((left, right) => left.occurredAt.getTime() - right.occurredAt.getTime());

        currentCount = Math.min(matchedEvents.length, targetCount);

        if (matchedEvents.length >= targetCount && targetCount > 0) {
            completedAt = cloneDate(matchedEvents[targetCount - 1]!.occurredAt);
        }
    }

    const remainingCount = Math.max(targetCount - currentCount, 0);

    return {
        missionId: input.mission.id,
        title: input.mission.title,
        description: input.mission.description,
        missionType: input.mission.missionType,
        cadence: input.mission.cadence,
        status: input.mission.status,
        targetCount,
        currentCount,
        remainingCount,
        completionRatio: targetCount === 0 ? 1 : clampRatio(currentCount / targetCount),
        isComplete: currentCount >= targetCount,
        rewardXp: normalizeNonNegativeInteger(input.mission.rewardXp),
        eligibleEventTypes,
        startsAt: input.mission.startsAt ? cloneDate(input.mission.startsAt) : null,
        endsAt: input.mission.endsAt ? cloneDate(input.mission.endsAt) : null,
        completedAt,
    };
}

function resolveMissionTargetCount(mission: CommunityProgressionMissionSource): number {
    const configuredTargetCount = normalizeNonNegativeInteger(
        getMissionConfig(mission).targetCount ?? mission.targetCount,
    );

    return Math.max(configuredTargetCount, 1);
}

function resolveMissionEligibleEventTypes(
    mission: CommunityProgressionMissionSource,
): readonly CommunityProgressionEventType[] {
    const configuredEventTypes = getMissionConfig(mission).eligibleEventTypes;

    if (configuredEventTypes.length > 0) {
        return uniqueValues(configuredEventTypes);
    }

    return uniqueValues(
        mission.eligibleActions.map((action) => action.eventType),
    );
}

function matchesMissionProgressEvent(
    event: CommunityProgressionHistoryEvent,
    mission: CommunityProgressionMissionSource,
): boolean {
    if (event.effectiveXp <= 0) {
        return false;
    }

    if (event.missionId && event.missionId !== mission.id) {
        return false;
    }

    if (!resolveMissionEligibleEventTypes(mission).includes(event.eventType)) {
        return false;
    }

    if (mission.startsAt && event.occurredAt.getTime() < mission.startsAt.getTime()) {
        return false;
    }

    if (mission.endsAt && event.occurredAt.getTime() > mission.endsAt.getTime()) {
        return false;
    }

    return true;
}

function getMissionConfig(
    mission: CommunityProgressionMissionSource,
): CommunityMissionConfig {
    return mission.config;
}

function compareMissionProgress(
    left: CommunityMissionProgressSnapshot,
    right: CommunityMissionProgressSnapshot,
    now: Date,
): number {
    const leftIsActive = isMissionActiveAt(left, now);
    const rightIsActive = isMissionActiveAt(right, now);

    if (leftIsActive !== rightIsActive) {
        return Number(rightIsActive) - Number(leftIsActive);
    }

    if (left.isComplete !== right.isComplete) {
        return Number(left.isComplete) - Number(right.isComplete);
    }

    const leftEndsAt = left.endsAt?.getTime() ?? Number.POSITIVE_INFINITY;
    const rightEndsAt = right.endsAt?.getTime() ?? Number.POSITIVE_INFINITY;

    if (leftEndsAt !== rightEndsAt) {
        return leftEndsAt - rightEndsAt;
    }

    return left.title.localeCompare(right.title, 'pt-BR');
}

function isMissionActiveAt(
    mission: Pick<CommunityMissionProgressSnapshot, 'endsAt' | 'startsAt' | 'status'>,
    now: Date,
): boolean {
    if (mission.status !== 'active') {
        return false;
    }

    if (mission.startsAt && now.getTime() < mission.startsAt.getTime()) {
        return false;
    }

    if (mission.endsAt && now.getTime() > mission.endsAt.getTime()) {
        return false;
    }

    return true;
}

function resolveNextMilestone(input: {
    readonly activeMissions: readonly CommunityMissionProgressSnapshot[];
    readonly aggregate: CommunityProgressionAggregateSnapshot;
}): CommunityProgressionNextMilestone {
    const nextActiveMission = input.activeMissions[0];

    if (nextActiveMission) {
        return {
            type: 'mission',
            title: nextActiveMission.title,
            description: `${nextActiveMission.remainingCount} acao(oes) restante(s) para concluir esta missao.`,
            remainingCount: nextActiveMission.remainingCount,
            missionId: nextActiveMission.missionId,
        };
    }

    return {
        type: 'level',
        title: `Nivel ${input.aggregate.currentLevel + 1}`,
        description: `Faltam ${input.aggregate.levelState.xpToNextLevel} XP para o proximo nivel.`,
        remainingXp: input.aggregate.levelState.xpToNextLevel,
    };
}

function resolveNextMeaningfulAction(input: {
    readonly actorEvents: readonly CommunityProgressionHistoryEvent[];
    readonly activeMissions: readonly CommunityMissionProgressSnapshot[];
    readonly actionRulePriority?: readonly CommunityProgressionEventType[];
}): CommunityProgressionNextAction {
    const activeMission = input.activeMissions[0];

    if (activeMission) {
        const missionAction = createNextActionFromMission(activeMission);

        if (missionAction) {
            return missionAction;
        }
    }

    const actionRulePriority = input.actionRulePriority ?? [
        'complete_public_profile',
        'publish_post',
        'comment_with_context',
        'follow_profile',
        'streak_participation',
    ];
    const directActionRules = actionRulePriority
        .map((eventType) => COMMUNITY_PROGRESSION_RULES[eventType])
        .filter((rule) => rule.nextActionHint);
    const eventCountByType = new Map<CommunityProgressionEventType, number>();

    for (const event of input.actorEvents) {
        eventCountByType.set(
            event.eventType,
            (eventCountByType.get(event.eventType) ?? 0) + 1,
        );
    }

    directActionRules.sort((left, right) => {
        const leftCount = eventCountByType.get(left.eventType) ?? 0;
        const rightCount = eventCountByType.get(right.eventType) ?? 0;

        if (leftCount !== rightCount) {
            return leftCount - rightCount;
        }

        return actionRulePriority.indexOf(left.eventType) - actionRulePriority.indexOf(right.eventType);
    });

    const selectedRule = directActionRules[0]!;

    return {
        eventType: selectedRule.eventType,
        title: selectedRule.nextActionHint!.title,
        description: selectedRule.nextActionHint!.description,
    };
}

function createNextActionFromMission(
    mission: CommunityMissionProgressSnapshot,
): CommunityProgressionNextAction | null {
    const missionRule = mission.eligibleEventTypes
        .map((eventType) => COMMUNITY_PROGRESSION_RULES[eventType])
        .find((rule) => rule.nextActionHint);

    if (!missionRule || !missionRule.nextActionHint) {
        return null;
    }

    return {
        eventType: missionRule.eventType,
        title: missionRule.nextActionHint.title,
        description: missionRule.nextActionHint.description,
    };
}

function selectActiveWeeklyChallengeMission(
    missions: readonly CommunityProgressionMissionSource[],
    now: Date,
): CommunityProgressionMissionSource | null {
    return missions
        .filter((mission) => mission.missionType === 'weekly_challenge')
        .filter((mission) => isMissionActiveAt(mission, now))
        .sort((left, right) => {
            const leftEndsAt = left.endsAt?.getTime() ?? Number.POSITIVE_INFINITY;
            const rightEndsAt = right.endsAt?.getTime() ?? Number.POSITIVE_INFINITY;

            if (leftEndsAt !== rightEndsAt) {
                return leftEndsAt - rightEndsAt;
            }

            return (right.startsAt?.getTime() ?? 0) - (left.startsAt?.getTime() ?? 0);
        })[0] ?? null;
}

function selectTopWeeklyChallengeTrend(
    trends: readonly CommunityWeeklyChallengeTrendSignal[],
): CommunityWeeklyChallengeTrendSignal | null {
    return trends.slice().sort((left, right) => {
        if (right.engagementCount !== left.engagementCount) {
            return right.engagementCount - left.engagementCount;
        }

        if (right.postCount !== left.postCount) {
            return right.postCount - left.postCount;
        }

        return left.label.localeCompare(right.label, 'pt-BR');
    })[0] ?? null;
}

function resolveWeeklyChallengeEligibleActionsFromMission(
    mission: CommunityProgressionMissionSource,
): readonly CommunityWeeklyChallengeEligibleActionMetadata[] {
    if (mission.eligibleActions.length > 0) {
        return mission.eligibleActions.map((action) =>
            createChallengeEligibleActionMetadata(action.eventType, {
                title: action.title,
                ...(action.description ? { description: action.description } : {}),
                ...(action.entityType ? { entityType: action.entityType } : {}),
            }),
        );
    }

    const configuredEventTypes = resolveMissionEligibleEventTypes(mission);

    if (configuredEventTypes.length > 0) {
        return configuredEventTypes.map((eventType) =>
            createChallengeEligibleActionMetadata(eventType),
        );
    }

    return [
        createChallengeEligibleActionMetadata('publish_post'),
    ];
}

function buildTrendWeeklyChallengeTitle(
    trend: CommunityWeeklyChallengeTrendSignal,
): string {
    const verbsByKind = {
        weapon: 'estabilize',
        patch: 'valide',
        diagnosis: 'corrija',
    } as const;

    return `Desafio semanal: ${verbsByKind[trend.kind]} ${trend.label}`;
}

function buildTrendWeeklyChallengeDescription(
    trend: CommunityWeeklyChallengeTrendSignal,
): string {
    return `${trend.reason} Use esse foco para publicar uma leitura util ou deixar um comentario contextual que ajude a comunidade a voltar melhor na proxima sessao.`;
}

function buildTrendWeeklyChallengeEligibleActions(
    trend: CommunityWeeklyChallengeTrendSignal,
): readonly CommunityWeeklyChallengeEligibleActionMetadata[] {
    const publishDescriptionsByKind = {
        weapon: `Publique uma analise publica mostrando como voce estabilizou ${trend.label}.`,
        patch: `Publique uma analise publica validando o impacto de ${trend.label} no seu recoil.`,
        diagnosis: `Publique uma analise publica mostrando como voce tratou ${trend.label}.`,
    } as const;
    const commentDescriptionsByKind = {
        weapon: `Adicione contexto em um post de ${trend.label} com leitura tecnica ou ajuste pratico.`,
        patch: `Explique em um comentario publico o que mudou em ${trend.label} e como voce adaptou o treino.`,
        diagnosis: `Deixe um comentario contextual explicando como diagnosticar ou corrigir ${trend.label}.`,
    } as const;

    return [
        createChallengeEligibleActionMetadata('publish_post', {
            title: `Publique uma leitura sobre ${trend.label}`,
            description: publishDescriptionsByKind[trend.kind],
            entityType: 'post',
        }),
        createChallengeEligibleActionMetadata('comment_with_context', {
            title: `Comente com contexto sobre ${trend.label}`,
            description: commentDescriptionsByKind[trend.kind],
            entityType: 'comment',
        }),
    ];
}

function createChallengeEligibleActionMetadata(
    eventType: CommunityProgressionEventType,
    overrides: {
        readonly title?: string;
        readonly description?: string;
        readonly entityType?: CommunityProgressionEntityType;
    } = {},
): CommunityWeeklyChallengeEligibleActionMetadata {
    const rule = COMMUNITY_PROGRESSION_RULES[eventType];

    return {
        eventType,
        entityType: overrides.entityType ?? null,
        title: overrides.title ?? rule.title,
        description: overrides.description ?? rule.description,
        defaultXp: rule.defaultXp,
        meaningfulParticipation: rule.meaningfulParticipation,
    };
}

function buildCommunityMissionProgressSnapshotsForActors(input: {
    readonly actorUserIds: readonly string[];
    readonly missions: readonly CommunityProgressionMissionSource[];
    readonly events: readonly CommunityProgressionHistoryEvent[];
    readonly now: Date;
}): readonly CommunityMissionProgressSnapshot[] {
    const actorUserIds = new Set(input.actorUserIds);
    const actorEvents = input.events.filter((event) => actorUserIds.has(event.actorUserId));

    return input.missions.map((mission) =>
        buildCommunityMissionProgressSnapshot({
            mission,
            userEvents: actorEvents,
            now: input.now,
        }),
    );
}

function resolveRecentRecapWindow(
    events: readonly CommunityProgressionHistoryEvent[],
    now: Date,
): CommunityRecapWindow | null {
    const currentWeekWindow = getUtcWeekWindow(now);

    if (events.some((event) => isDateInRecapWindow(event.occurredAt, currentWeekWindow))) {
        return currentWeekWindow;
    }

    const previousWeekWindow = getPreviousUtcWeekWindow(now);

    if (events.some((event) => isDateInRecapWindow(event.occurredAt, previousWeekWindow))) {
        return previousWeekWindow;
    }

    return null;
}

function filterEventsInRecapWindow(
    events: readonly CommunityProgressionHistoryEvent[],
    window: CommunityRecapWindow,
): readonly CommunityProgressionHistoryEvent[] {
    return events.filter((event) => isDateInRecapWindow(event.occurredAt, window));
}

function isDateInRecapWindow(date: Date, window: CommunityRecapWindow): boolean {
    return date.getTime() >= window.startsAt.getTime()
        && date.getTime() <= window.endsAt.getTime();
}

function filterUnlockedRewards(input: {
    readonly rewards: readonly CommunityRewardRecordSource[];
    readonly ownerType: CommunityRewardRecordSource['ownerType'];
    readonly userId?: string;
    readonly squadId?: string;
    readonly window: CommunityRecapWindow;
}): readonly CommunityRecapRewardSummary[] {
    return input.rewards
        .filter((reward) => reward.ownerType === input.ownerType)
        .filter((reward) => reward.status === 'earned')
        .filter((reward) =>
            input.ownerType === 'user'
                ? reward.userId === input.userId
                : reward.squadId === input.squadId,
        )
        .filter((reward) => isDateInRecapWindow(reward.earnedAt, input.window))
        .sort((left, right) => right.earnedAt.getTime() - left.earnedAt.getTime())
        .map((reward) => ({
            id: reward.id,
            rewardKind: reward.rewardKind,
            label: reward.label,
            isPublicSafe: reward.isPublicSafe,
            displayState: reward.displayState,
            earnedAt: cloneDate(reward.earnedAt),
        }));
}

function buildRecapRitualSummaries(input: {
    readonly events: readonly CommunityProgressionHistoryEvent[];
    readonly missions: readonly CommunityProgressionMissionSource[];
}): readonly CommunityRecapRitualSummary[] {
    const missionsById = new Map(
        input.missions.map((mission) => [mission.id, mission]),
    );
    const ritualByKey = new Map<string, CommunityRecapRitualSummary>();

    for (const event of input.events) {
        if (event.effectiveXp <= 0) {
            continue;
        }

        const mission = event.missionId ? missionsById.get(event.missionId) : null;
        const rule = COMMUNITY_PROGRESSION_RULES[event.eventType];
        const key = mission ? `mission:${mission.id}` : `event:${event.eventType}`;
        const title = mission?.title ?? rule.title;
        const description = mission?.description ?? rule.description;
        const currentSummary = ritualByKey.get(key);

        if (!currentSummary) {
            ritualByKey.set(key, {
                key,
                title,
                description,
                count: 1,
                completedAt: cloneDate(event.occurredAt),
            });
            continue;
        }

        ritualByKey.set(key, {
            ...currentSummary,
            count: currentSummary.count + 1,
            completedAt: event.occurredAt.getTime() > currentSummary.completedAt.getTime()
                ? cloneDate(event.occurredAt)
                : currentSummary.completedAt,
        });
    }

    return [...ritualByKey.values()].sort((left, right) =>
        right.completedAt.getTime() - left.completedAt.getTime(),
    );
}

function buildRecapSummaryCopy(input: {
    readonly recapWindow: CommunityRecapWindow;
    readonly ritualCount: number;
    readonly rewardCount: number;
    readonly earnedXp: number;
}): string {
    const windowLabel = input.recapWindow.kind === 'current'
        ? 'nesta semana'
        : 'na semana passada';

    return `${input.ritualCount} ritual(is), ${input.rewardCount} recompensa(s) e ${input.earnedXp} XP ${windowLabel}.`;
}

function countActiveRecapMembers(
    events: readonly CommunityProgressionHistoryEvent[],
): number {
    return new Set(events.map((event) => getCommunityProgressionUserId(event))).size;
}

function getCommunityProgressionEventsForUser(
    userId: string,
    events: readonly CommunityProgressionHistoryEvent[],
): readonly CommunityProgressionHistoryEvent[] {
    return events
        .filter((event) => getCommunityProgressionUserId(event) === userId)
        .slice()
        .sort((left, right) => left.occurredAt.getTime() - right.occurredAt.getTime());
}

function getCommunityProgressionUserId(
    event: CommunityProgressionHistoryEvent,
): string {
    return event.beneficiaryUserId ?? event.actorUserId;
}

function getMeaningfulCommunityProgressionEventsForUser(
    userId: string,
    events: readonly CommunityProgressionHistoryEvent[],
    now: Date,
): readonly CommunityProgressionHistoryEvent[] {
    return getCommunityProgressionEventsForUser(userId, events).filter((event) =>
        event.occurredAt.getTime() <= now.getTime()
        && event.effectiveXp > 0
        && COMMUNITY_PROGRESSION_RULES[event.eventType].meaningfulParticipation,
    );
}

function buildStreakRuns(
    windowStarts: readonly Date[],
    getDifference: (later: Date, earlier: Date) => number,
): readonly {
    readonly start: Date;
    readonly end: Date;
    readonly length: number;
}[] {
    const runs: {
        start: Date;
        end: Date;
        length: number;
    }[] = [];

    for (const windowStart of windowStarts) {
        const previousRun = runs[runs.length - 1];

        if (!previousRun) {
            runs.push({
                start: cloneDate(windowStart),
                end: cloneDate(windowStart),
                length: 1,
            });
            continue;
        }

        const difference = getDifference(windowStart, previousRun.end);

        if (difference === 1) {
            previousRun.end = cloneDate(windowStart);
            previousRun.length += 1;
            continue;
        }

        runs.push({
            start: cloneDate(windowStart),
            end: cloneDate(windowStart),
            length: 1,
        });
    }

    return runs;
}

function uniqueUtcWeekStarts(dates: readonly Date[]): readonly Date[] {
    const seenWeekStarts = new Set<number>();
    const uniqueWeekStarts: Date[] = [];

    for (const date of dates.slice().sort((left, right) => left.getTime() - right.getTime())) {
        const weekStart = startOfUtcWeek(date);
        const weekKey = weekStart.getTime();

        if (seenWeekStarts.has(weekKey)) {
            continue;
        }

        seenWeekStarts.add(weekKey);
        uniqueWeekStarts.push(weekStart);
    }

    return uniqueWeekStarts;
}

function startOfUtcDay(date: Date): Date {
    return new Date(
        Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
    );
}

function startOfUtcWeek(date: Date): Date {
    const utcDay = date.getUTCDay();
    const diffToMonday = utcDay === 0 ? -6 : 1 - utcDay;

    return startOfUtcDay(
        new Date(
            Date.UTC(
                date.getUTCFullYear(),
                date.getUTCMonth(),
                date.getUTCDate() + diffToMonday,
            ),
        ),
    );
}

function endOfUtcWeek(date: Date): Date {
    return new Date(startOfUtcWeek(date).getTime() + WEEK_MS - 1);
}

function getUtcWeekWindow(date: Date): CommunityRecapWindow {
    const startsAt = startOfUtcWeek(date);

    return {
        kind: 'current',
        startsAt,
        endsAt: endOfUtcWeek(startsAt),
    };
}

function getPreviousUtcWeekWindow(date: Date): CommunityRecapWindow {
    const previousWeekStart = addWeeks(startOfUtcWeek(date), -1);

    return {
        kind: 'previous',
        startsAt: previousWeekStart,
        endsAt: endOfUtcWeek(previousWeekStart),
    };
}

function differenceInUtcWeeks(later: Date, earlier: Date): number {
    return Math.round(
        (startOfUtcWeek(later).getTime() - startOfUtcWeek(earlier).getTime()) / WEEK_MS,
    );
}

function addWeeks(date: Date, amount: number): Date {
    return new Date(date.getTime() + amount * WEEK_MS);
}

function getXpSpanForLevel(level: number, curve: CommunityLevelCurve): number {
    return Math.max(
        curve.baseXpPerLevel + (level - 1) * curve.extraXpPerLevel,
        1,
    );
}

function normalizeRequiredIdentifier(value: string, fieldName: string): string {
    const normalizedValue = value.trim();

    if (!normalizedValue) {
        throw new Error(`${fieldName} must be a non-empty string.`);
    }

    return normalizedValue;
}

function normalizeOptionalIdentifier(value: string | null | undefined): string | null {
    const normalizedValue = value?.trim();
    return normalizedValue ? normalizedValue : null;
}

function normalizeNonNegativeInteger(value: number): number {
    if (!Number.isFinite(value)) {
        return 0;
    }

    return Math.max(Math.trunc(value), 0);
}

function uniqueValues<TValue>(values: readonly TValue[]): readonly TValue[] {
    return [...new Set(values)];
}

function clampRatio(value: number): number {
    return Math.min(Math.max(value, 0), 1);
}

function cloneDate(date: Date): Date {
    return new Date(date.getTime());
}
