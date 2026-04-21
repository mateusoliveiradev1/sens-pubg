import { and, asc, desc, eq, inArray, or, sql } from 'drizzle-orm';

import {
    buildCommunityProgressionAggregateSnapshot,
    getCommunityProgressionRule,
    listCommunityMissionCompletionRecords,
    listCommunityStreakParticipationWindows,
    recordCommunityProgressionEvent,
    resolveActiveCommunitySeason,
    toCommunityProgressionHistoryEvent,
    type CommunityProgressionEventRecord,
    type CommunityProgressionHistoryEvent,
    type CommunityProgressionMissionSource,
    type CommunitySeasonSource,
} from '@/core/community-progression';
import { applyCommunityProgressionGuardrails } from '@/core/community-progression-guardrails';
import { db } from '@/db';
import {
    communityMissions,
    communityProgressionEvents,
    communityRewardRecords,
    communitySeasons,
    communitySquadMemberships,
    communitySquads,
    communityUserProgressionAggregates,
    type CommunityReportEntityType,
    type CommunitySquadGoalState,
} from '@/db/schema';
import type {
    CommunityProgressionAggregateScope,
    CommunityProgressionEntityType,
    CommunityProgressionEventType,
} from '@/types/community';

const COMMUNITY_MISSION_AND_STREAK_DERIVED_EVENT_TYPES = [
    'weekly_challenge_complete',
    'mission_complete',
    'streak_participation',
] as const satisfies readonly CommunityProgressionEventType[];

const COMMUNITY_ALL_DERIVED_EVENT_TYPES = [
    ...COMMUNITY_MISSION_AND_STREAK_DERIVED_EVENT_TYPES,
    'squad_goal_contribution',
] as const satisfies readonly CommunityProgressionEventType[];

interface TrackCommunityProgressionForActionInput {
    readonly actorUserId: string;
    readonly beneficiaryUserId?: string | null;
    readonly dedupeKey?: string | null;
    readonly entityType: CommunityProgressionEntityType;
    readonly entityId: string;
    readonly eventType: CommunityProgressionEventType;
    readonly hasRequiredContext?: boolean;
    readonly isArchived?: boolean;
    readonly isDeleted?: boolean;
    readonly isHidden?: boolean;
    readonly isModerated?: boolean;
    readonly isPubliclyVisible?: boolean;
    readonly metadata?: Readonly<Record<string, unknown>>;
    readonly occurredAt?: Date;
}

interface ExcludeCommunityEntityFromGamificationInput {
    readonly entityType: CommunityReportEntityType;
    readonly entityId: string;
}

interface CommunityProgressionSquadContext {
    readonly squadId: string | null;
    readonly activeGoal: CommunitySquadGoalState | null;
}

interface CommunityAggregateScopeRecord {
    readonly scope: CommunityProgressionAggregateScope;
    readonly scopeKey: string;
    readonly seasonId: string | null;
    readonly events: readonly CommunityProgressionHistoryEvent[];
    readonly missions: readonly CommunityProgressionMissionSource[];
}

interface StoredImpactedCommunityProgressionEventRow {
    readonly id: string;
    readonly actorUserId: string;
    readonly beneficiaryUserId: string | null;
    readonly idempotencyKey: string;
}

export async function trackCommunityProgressionForAction(
    input: TrackCommunityProgressionForActionInput,
): Promise<void> {
    try {
        const occurredAt = cloneDate(input.occurredAt ?? new Date());
        const progressionUserId = resolveProgressionOwnerUserId(input);
        const [activeSeasonContext, progressionSquadContext, guardrailHistory, missions] = await Promise.all([
            getActiveCommunitySeasonContext(occurredAt),
            getResolvedCommunitySquadContext(progressionUserId),
            getRelevantCommunityProgressionHistory({
                actorUserId: input.actorUserId,
                beneficiaryUserId: input.beneficiaryUserId ?? null,
                eventType: input.eventType,
                occurredAt,
            }),
            getTrackedCommunityMissions(),
        ]);
        const rawXp = getCommunityRuleRawXp(input.eventType);
        const guardrailOutcome = applyCommunityProgressionGuardrails({
            eventType: input.eventType,
            actorUserId: input.actorUserId,
            beneficiaryUserId: input.beneficiaryUserId ?? null,
            occurredAt,
            rawXp,
            history: guardrailHistory,
        });
        const metadata = {
            progressionUserId,
            ...(input.metadata ?? {}),
            ...(guardrailOutcome.reasons.length > 0
                ? {
                    guardrailReasons: guardrailOutcome.reasons,
                }
                : {}),
        };
        const recordResult = recordCommunityProgressionEvent({
            actorUserId: input.actorUserId,
            beneficiaryUserId: input.beneficiaryUserId ?? null,
            dedupeKey: input.dedupeKey ?? null,
            entityType: input.entityType,
            entityId: input.entityId,
            eventType: input.eventType,
            hasRequiredContext: input.hasRequiredContext ?? false,
            isArchived: input.isArchived ?? false,
            isDeleted: input.isDeleted ?? false,
            isHidden: input.isHidden ?? false,
            isModerated: input.isModerated ?? false,
            isPubliclyVisible: input.isPubliclyVisible ?? false,
            metadata,
            occurredAt,
            seasonId: activeSeasonContext.seasonId,
            squadId: progressionSquadContext.squadId,
            history: guardrailHistory,
            effectiveXpOverride: guardrailOutcome.effectiveXp,
        });

        if (recordResult.outcome !== 'recorded') {
            return;
        }

        await persistCommunityProgressionEvent(recordResult.event, 'ignore');

        const storedUserEvents = await getStoredCommunityProgressionEventsForUser(
            progressionUserId,
        );
        const missionAndStreakEvents = await synchronizeMissionAndStreakDerivedEvents({
            progressionUserId,
            missions,
            userEvents: storedUserEvents,
        });
        const newSquadContributionEvent = await maybeRecordSquadGoalContribution({
            baseEvent: recordResult.event,
            progressionUserId,
            squadContext: progressionSquadContext,
            userEvents: storedUserEvents,
        });
        const finalUserEvents = buildFinalCommunityProgressionLedger({
            progressionUserId,
            storedUserEvents,
            missionAndStreakEvents,
            newSquadContributionEvent,
        });

        await upsertCommunityProgressionAggregatesForUser({
            userId: progressionUserId,
            events: finalUserEvents,
            missions,
            now: occurredAt,
        });
    } catch (error) {
        console.error('[community progression recorder] failed to track event', error);
    }
}

export async function excludeCommunityEntityFromGamification(
    input: ExcludeCommunityEntityFromGamificationInput,
): Promise<void> {
    try {
        const impactedEvents = await getImpactedCommunityProgressionEvents(input);

        if (impactedEvents.length === 0) {
            return;
        }

        const impactedEventIds = impactedEvents.map((event) => event.id);
        const impactedIdempotencyKeys = impactedEvents.map((event) => event.idempotencyKey);
        const impactedProgressionUserIds = uniqueValues(
            impactedEvents.map((event) => resolveProgressionOwnerUserId(event)),
        );
        const now = new Date();

        await db
            .update(communityProgressionEvents)
            .set({
                effectiveXp: 0,
            })
            .where(inArray(communityProgressionEvents.id, impactedEventIds));

        await revokeRewardsAwardedByEvents(impactedEventIds, now);
        await zeroLinkedSquadGoalContributionEvents(impactedIdempotencyKeys);

        const missions = await getTrackedCommunityMissions();

        for (const progressionUserId of impactedProgressionUserIds) {
            const storedUserEvents = await getStoredCommunityProgressionEventsForUser(
                progressionUserId,
            );
            const missionAndStreakEvents = await synchronizeMissionAndStreakDerivedEvents({
                progressionUserId,
                missions,
                userEvents: storedUserEvents,
            });
            const finalUserEvents = buildFinalCommunityProgressionLedger({
                progressionUserId,
                storedUserEvents,
                missionAndStreakEvents,
                newSquadContributionEvent: null,
            });

            await upsertCommunityProgressionAggregatesForUser({
                userId: progressionUserId,
                events: finalUserEvents,
                missions,
                now,
            });
        }
    } catch (error) {
        console.error('[community progression recorder] failed to exclude entity', error);
    }
}

async function getRelevantCommunityProgressionHistory(input: {
    readonly actorUserId: string;
    readonly beneficiaryUserId: string | null;
    readonly eventType: CommunityProgressionEventType;
    readonly occurredAt: Date;
}): Promise<readonly CommunityProgressionHistoryEvent[]> {
    const historyWindowStart = new Date(input.occurredAt.getTime() - 8 * 24 * 60 * 60 * 1000);
    const rows = await db
        .select({
            idempotencyKey: communityProgressionEvents.idempotencyKey,
            eventType: communityProgressionEvents.eventType,
            actorUserId: communityProgressionEvents.actorUserId,
            beneficiaryUserId: communityProgressionEvents.beneficiaryUserId,
            entityType: communityProgressionEvents.entityType,
            entityId: communityProgressionEvents.entityId,
            rawXp: communityProgressionEvents.rawXp,
            effectiveXp: communityProgressionEvents.effectiveXp,
            occurredAt: communityProgressionEvents.occurredAt,
            seasonId: communityProgressionEvents.seasonId,
            missionId: communityProgressionEvents.missionId,
            squadId: communityProgressionEvents.squadId,
        })
        .from(communityProgressionEvents)
        .where(
            and(
                eq(communityProgressionEvents.eventType, input.eventType),
                sql`${communityProgressionEvents.occurredAt} >= ${historyWindowStart}`,
                sql`${communityProgressionEvents.occurredAt} <= ${input.occurredAt}`,
                input.beneficiaryUserId
                    ? or(
                        inArray(communityProgressionEvents.actorUserId, [
                            input.actorUserId,
                            input.beneficiaryUserId,
                        ]),
                        inArray(communityProgressionEvents.beneficiaryUserId, [
                            input.actorUserId,
                            input.beneficiaryUserId,
                        ]),
                    )
                    : eq(communityProgressionEvents.actorUserId, input.actorUserId),
            ),
        )
        .orderBy(desc(communityProgressionEvents.occurredAt));

    return rows.map(toCommunityProgressionHistoryEvent);
}

async function getActiveCommunitySeasonContext(
    occurredAt: Date,
): Promise<ReturnType<typeof resolveActiveCommunitySeason>> {
    const seasons = await db
        .select({
            id: communitySeasons.id,
            slug: communitySeasons.slug,
            title: communitySeasons.title,
            theme: communitySeasons.theme,
            summary: communitySeasons.summary,
            status: communitySeasons.status,
            startsAt: communitySeasons.startsAt,
            endsAt: communitySeasons.endsAt,
        })
        .from(communitySeasons)
        .where(
            and(
                eq(communitySeasons.status, 'active'),
                sql`${communitySeasons.startsAt} <= ${occurredAt}`,
                sql`${communitySeasons.endsAt} >= ${occurredAt}`,
            ),
        ) as CommunitySeasonSource[];

    return resolveActiveCommunitySeason({
        seasons,
        now: occurredAt,
    });
}

async function getResolvedCommunitySquadContext(
    userId: string,
): Promise<CommunityProgressionSquadContext> {
    const memberships = await db
        .select({
            squadId: communitySquadMemberships.squadId,
            activeGoal: communitySquads.activeGoal,
        })
        .from(communitySquadMemberships)
        .innerJoin(communitySquads, eq(communitySquadMemberships.squadId, communitySquads.id))
        .where(
            and(
                eq(communitySquadMemberships.userId, userId),
                eq(communitySquadMemberships.status, 'active'),
                eq(communitySquads.status, 'active'),
            ),
        )
        .limit(2);

    if (memberships.length !== 1) {
        return {
            squadId: null,
            activeGoal: null,
        };
    }

    return {
        squadId: memberships[0]!.squadId,
        activeGoal: memberships[0]!.activeGoal ?? null,
    };
}

async function getTrackedCommunityMissions(): Promise<
    readonly CommunityProgressionMissionSource[]
> {
    return db
        .select({
            cadence: communityMissions.cadence,
            config: communityMissions.config,
            description: communityMissions.description,
            eligibleActions: communityMissions.eligibleActions,
            endsAt: communityMissions.endsAt,
            id: communityMissions.id,
            missionType: communityMissions.missionType,
            rewardXp: communityMissions.rewardXp,
            seasonId: communityMissions.seasonId,
            startsAt: communityMissions.startsAt,
            status: communityMissions.status,
            targetCount: communityMissions.targetCount,
            theme: communityMissions.theme,
            title: communityMissions.title,
        })
        .from(communityMissions)
        .where(inArray(communityMissions.status, ['active', 'paused', 'archived']));
}

async function getStoredCommunityProgressionEventsForUser(
    userId: string,
): Promise<readonly CommunityProgressionHistoryEvent[]> {
    const rows = await db
        .select({
            idempotencyKey: communityProgressionEvents.idempotencyKey,
            eventType: communityProgressionEvents.eventType,
            actorUserId: communityProgressionEvents.actorUserId,
            beneficiaryUserId: communityProgressionEvents.beneficiaryUserId,
            entityType: communityProgressionEvents.entityType,
            entityId: communityProgressionEvents.entityId,
            rawXp: communityProgressionEvents.rawXp,
            effectiveXp: communityProgressionEvents.effectiveXp,
            occurredAt: communityProgressionEvents.occurredAt,
            seasonId: communityProgressionEvents.seasonId,
            missionId: communityProgressionEvents.missionId,
            squadId: communityProgressionEvents.squadId,
        })
        .from(communityProgressionEvents)
        .where(
            or(
                eq(communityProgressionEvents.actorUserId, userId),
                eq(communityProgressionEvents.beneficiaryUserId, userId),
            ),
        )
        .orderBy(asc(communityProgressionEvents.occurredAt));

    return rows.map(toCommunityProgressionHistoryEvent);
}

async function persistCommunityProgressionEvent(
    event: CommunityProgressionEventRecord,
    mode: 'ignore' | 'upsert',
): Promise<void> {
    const insertQuery = db
        .insert(communityProgressionEvents)
        .values({
            seasonId: event.seasonId,
            missionId: event.missionId,
            squadId: event.squadId,
            actorUserId: event.actorUserId,
            beneficiaryUserId: event.beneficiaryUserId,
            eventType: event.eventType,
            entityType: event.entityType,
            entityId: event.entityId,
            idempotencyKey: event.idempotencyKey,
            rawXp: event.rawXp,
            effectiveXp: event.effectiveXp,
            metadata: event.metadata,
            occurredAt: event.occurredAt,
        });

    if (mode === 'upsert') {
        await insertQuery.onConflictDoUpdate({
            target: communityProgressionEvents.idempotencyKey,
            set: {
                seasonId: event.seasonId,
                missionId: event.missionId,
                squadId: event.squadId,
                actorUserId: event.actorUserId,
                beneficiaryUserId: event.beneficiaryUserId,
                eventType: event.eventType,
                entityType: event.entityType,
                entityId: event.entityId,
                rawXp: event.rawXp,
                effectiveXp: event.effectiveXp,
                metadata: event.metadata,
                occurredAt: event.occurredAt,
            },
        });

        return;
    }

    await insertQuery.onConflictDoNothing({
        target: communityProgressionEvents.idempotencyKey,
    });
}

async function synchronizeMissionAndStreakDerivedEvents(input: {
    readonly progressionUserId: string;
    readonly missions: readonly CommunityProgressionMissionSource[];
    readonly userEvents: readonly CommunityProgressionHistoryEvent[];
}): Promise<readonly CommunityProgressionHistoryEvent[]> {
    const ownedBaseEvents = getOwnedCommunityProgressionEvents(
        input.progressionUserId,
        input.userEvents,
    ).filter((event) => !isDerivedCommunityProgressionEventType(event.eventType));
    const existingDerivedEvents = getOwnedCommunityProgressionEvents(
        input.progressionUserId,
        input.userEvents,
    ).filter((event) => isMissionOrStreakDerivedCommunityProgressionEventType(event.eventType));
    const desiredDerivedEvents = buildDesiredMissionAndStreakDerivedEvents({
        progressionUserId: input.progressionUserId,
        missions: input.missions,
        userEvents: ownedBaseEvents,
    });
    const desiredIdempotencyKeys = new Set(
        desiredDerivedEvents.map((event) => event.idempotencyKey),
    );

    for (const event of desiredDerivedEvents) {
        await persistCommunityProgressionEvent(event, 'upsert');
    }

    const staleDerivedEvents = existingDerivedEvents.filter((event) =>
        event.effectiveXp > 0 && !desiredIdempotencyKeys.has(event.idempotencyKey),
    );

    if (staleDerivedEvents.length > 0) {
        await db
            .update(communityProgressionEvents)
            .set({
                effectiveXp: 0,
            })
            .where(
                inArray(
                    communityProgressionEvents.idempotencyKey,
                    staleDerivedEvents.map((event) => event.idempotencyKey),
                ),
            );
    }

    return desiredDerivedEvents.map(toCommunityProgressionHistoryEventFromRecord);
}

function buildDesiredMissionAndStreakDerivedEvents(input: {
    readonly progressionUserId: string;
    readonly missions: readonly CommunityProgressionMissionSource[];
    readonly userEvents: readonly CommunityProgressionHistoryEvent[];
}): readonly CommunityProgressionEventRecord[] {
    const desiredEvents = [
        ...buildDesiredMissionCompletionEvents(input),
        ...buildDesiredStreakParticipationEvents(input),
    ];

    return desiredEvents.sort(compareCommunityProgressionEventRecordsByTime);
}

function buildDesiredMissionCompletionEvents(input: {
    readonly progressionUserId: string;
    readonly missions: readonly CommunityProgressionMissionSource[];
    readonly userEvents: readonly CommunityProgressionHistoryEvent[];
}): readonly CommunityProgressionEventRecord[] {
    const completionRecords = listCommunityMissionCompletionRecords({
        userId: input.progressionUserId,
        missions: input.missions,
        events: input.userEvents,
    });
    const desiredEvents: CommunityProgressionEventRecord[] = [];
    const desiredHistory: CommunityProgressionHistoryEvent[] = [];

    for (const completionRecord of completionRecords) {
        const eventType = completionRecord.missionType === 'weekly_challenge'
            ? 'weekly_challenge_complete'
            : 'mission_complete';
        const recordResult = recordCommunityProgressionEvent({
            actorUserId: input.progressionUserId,
            eventType,
            entityType: 'mission',
            entityId: completionRecord.missionId,
            occurredAt: completionRecord.completedAt,
            seasonId: completionRecord.seasonId,
            missionId: completionRecord.missionId,
            metadata: {
                missionTitle: completionRecord.title,
                missionType: completionRecord.missionType,
                rewardXp: completionRecord.rewardXp,
            },
            rawXpOverride: completionRecord.rewardXp > 0
                ? completionRecord.rewardXp
                : null,
            history: desiredHistory,
        });

        if (recordResult.outcome !== 'recorded') {
            continue;
        }

        desiredEvents.push(recordResult.event);
        desiredHistory.push(toCommunityProgressionHistoryEventFromRecord(recordResult.event));
    }

    return desiredEvents;
}

function buildDesiredStreakParticipationEvents(input: {
    readonly progressionUserId: string;
    readonly userEvents: readonly CommunityProgressionHistoryEvent[];
}): readonly CommunityProgressionEventRecord[] {
    const windows = listCommunityStreakParticipationWindows({
        userId: input.progressionUserId,
        events: input.userEvents,
    });
    const desiredEvents: CommunityProgressionEventRecord[] = [];
    const desiredHistory: CommunityProgressionHistoryEvent[] = [];

    for (const window of windows) {
        const recordResult = recordCommunityProgressionEvent({
            actorUserId: input.progressionUserId,
            eventType: 'streak_participation',
            entityType: 'system',
            entityId: window.weekStartedAt.toISOString(),
            occurredAt: window.triggeredAt,
            seasonId: window.seasonId,
            metadata: {
                weekStartedAt: window.weekStartedAt.toISOString(),
                weekEndsAt: window.weekEndsAt.toISOString(),
                sourceEventType: window.sourceEventType,
                sourceEntityType: window.sourceEntityType,
                sourceEntityId: window.sourceEntityId,
            },
            history: desiredHistory,
        });

        if (recordResult.outcome !== 'recorded') {
            continue;
        }

        desiredEvents.push(recordResult.event);
        desiredHistory.push(toCommunityProgressionHistoryEventFromRecord(recordResult.event));
    }

    return desiredEvents;
}

async function maybeRecordSquadGoalContribution(input: {
    readonly baseEvent: CommunityProgressionEventRecord;
    readonly progressionUserId: string;
    readonly squadContext: CommunityProgressionSquadContext;
    readonly userEvents: readonly CommunityProgressionHistoryEvent[];
}): Promise<CommunityProgressionHistoryEvent | null> {
    if (
        !matchesSquadGoalContributionSourceEvent(
            input.baseEvent,
            input.progressionUserId,
            input.squadContext,
        )
    ) {
        return null;
    }

    const squadContributionHistory = getOwnedCommunityProgressionEvents(
        input.progressionUserId,
        input.userEvents,
    ).filter((event) => event.eventType === 'squad_goal_contribution');
    const recordResult = recordCommunityProgressionEvent({
        actorUserId: input.progressionUserId,
        eventType: 'squad_goal_contribution',
        entityType: 'squad',
        entityId: input.squadContext.squadId!,
        dedupeKey: input.baseEvent.idempotencyKey,
        occurredAt: input.baseEvent.occurredAt,
        seasonId: input.baseEvent.seasonId,
        squadId: input.squadContext.squadId!,
        metadata: {
            goalKey: input.squadContext.activeGoal!.goalKey,
            goalTitle: input.squadContext.activeGoal!.title,
            sourceEventIdempotencyKey: input.baseEvent.idempotencyKey,
            sourceEventType: input.baseEvent.eventType,
            sourceEntityType: input.baseEvent.entityType,
            sourceEntityId: input.baseEvent.entityId,
        },
        history: squadContributionHistory,
    });

    if (recordResult.outcome !== 'recorded') {
        return null;
    }

    await persistCommunityProgressionEvent(recordResult.event, 'upsert');

    return toCommunityProgressionHistoryEventFromRecord(recordResult.event);
}

async function upsertCommunityProgressionAggregatesForUser(input: {
    readonly userId: string;
    readonly events: readonly CommunityProgressionHistoryEvent[];
    readonly missions: readonly CommunityProgressionMissionSource[];
    readonly now: Date;
}): Promise<void> {
    const existingScopeRows = await db
        .select({
            id: communityUserProgressionAggregates.id,
            scope: communityUserProgressionAggregates.scope,
            scopeKey: communityUserProgressionAggregates.scopeKey,
        })
        .from(communityUserProgressionAggregates)
        .where(eq(communityUserProgressionAggregates.userId, input.userId));
    const desiredScopes = buildDesiredCommunityAggregateScopes(input);
    const desiredScopeKeys = new Set(
        desiredScopes.map((scope) => buildCommunityAggregateScopeKey(scope.scope, scope.scopeKey)),
    );

    for (const scope of desiredScopes) {
        const aggregate = buildCommunityProgressionAggregateSnapshot({
            userId: input.userId,
            events: scope.events,
            missions: scope.missions,
            now: input.now,
        });

        await db
            .insert(communityUserProgressionAggregates)
            .values({
                userId: input.userId,
                seasonId: scope.seasonId,
                scope: scope.scope,
                scopeKey: scope.scopeKey,
                totalXp: aggregate.totalXp,
                currentLevel: aggregate.currentLevel,
                currentLevelXp: aggregate.currentLevelXp,
                nextLevelXp: aggregate.nextLevelXp,
                activeMissionCount: aggregate.activeMissionCount,
                currentStreak: aggregate.currentStreak,
                longestStreak: aggregate.longestStreak,
                streakState: aggregate.streakState,
                lastMeaningfulAt: aggregate.lastMeaningfulAt,
                lastWindowStartedAt: aggregate.lastWindowStartedAt,
                lastWindowEndedAt: aggregate.lastWindowEndedAt,
                updatedAt: input.now,
            })
            .onConflictDoUpdate({
                target: [
                    communityUserProgressionAggregates.userId,
                    communityUserProgressionAggregates.scope,
                    communityUserProgressionAggregates.scopeKey,
                ],
                set: {
                    seasonId: scope.seasonId,
                    totalXp: aggregate.totalXp,
                    currentLevel: aggregate.currentLevel,
                    currentLevelXp: aggregate.currentLevelXp,
                    nextLevelXp: aggregate.nextLevelXp,
                    activeMissionCount: aggregate.activeMissionCount,
                    currentStreak: aggregate.currentStreak,
                    longestStreak: aggregate.longestStreak,
                    streakState: aggregate.streakState,
                    lastMeaningfulAt: aggregate.lastMeaningfulAt,
                    lastWindowStartedAt: aggregate.lastWindowStartedAt,
                    lastWindowEndedAt: aggregate.lastWindowEndedAt,
                    updatedAt: input.now,
                },
            });
    }

    const staleScopeRowIds = existingScopeRows
        .filter((row) =>
            !desiredScopeKeys.has(
                buildCommunityAggregateScopeKey(row.scope, row.scopeKey),
            ),
        )
        .map((row) => row.id);

    if (staleScopeRowIds.length > 0) {
        await db
            .delete(communityUserProgressionAggregates)
            .where(inArray(communityUserProgressionAggregates.id, staleScopeRowIds));
    }
}

function buildDesiredCommunityAggregateScopes(input: {
    readonly userId: string;
    readonly events: readonly CommunityProgressionHistoryEvent[];
    readonly missions: readonly CommunityProgressionMissionSource[];
}): readonly CommunityAggregateScopeRecord[] {
    const ownedEvents = getOwnedCommunityProgressionEvents(input.userId, input.events);
    const seasonIds = uniqueValues(
        ownedEvents
            .map((event) => event.seasonId)
            .filter((seasonId): seasonId is string => Boolean(seasonId)),
    );
    const scopes: CommunityAggregateScopeRecord[] = [
        {
            scope: 'evergreen',
            scopeKey: 'evergreen',
            seasonId: null,
            events: ownedEvents,
            missions: input.missions,
        },
    ];

    for (const seasonId of seasonIds) {
        scopes.push({
            scope: 'season',
            scopeKey: seasonId,
            seasonId,
            events: ownedEvents.filter((event) => event.seasonId === seasonId),
            missions: input.missions.filter((mission) => mission.seasonId === seasonId),
        });
    }

    return scopes;
}

async function getImpactedCommunityProgressionEvents(
    input: ExcludeCommunityEntityFromGamificationInput,
): Promise<readonly StoredImpactedCommunityProgressionEventRow[]> {
    return db
        .select({
            id: communityProgressionEvents.id,
            actorUserId: communityProgressionEvents.actorUserId,
            beneficiaryUserId: communityProgressionEvents.beneficiaryUserId,
            idempotencyKey: communityProgressionEvents.idempotencyKey,
        })
        .from(communityProgressionEvents)
        .where(buildCommunityEntityExclusionPredicate(input));
}

function buildCommunityEntityExclusionPredicate(
    input: ExcludeCommunityEntityFromGamificationInput,
) {
    if (input.entityType === 'post') {
        return or(
            and(
                eq(communityProgressionEvents.entityType, 'post'),
                eq(communityProgressionEvents.entityId, input.entityId),
            ),
            sql`${communityProgressionEvents.metadata} ->> 'sourcePostId' = ${input.entityId}`,
        );
    }

    if (input.entityType === 'comment') {
        return or(
            and(
                eq(communityProgressionEvents.entityType, 'comment'),
                eq(communityProgressionEvents.entityId, input.entityId),
            ),
            sql`${communityProgressionEvents.metadata} ->> 'sourceCommentId' = ${input.entityId}`,
        );
    }

    return and(
        eq(communityProgressionEvents.entityType, 'profile'),
        eq(communityProgressionEvents.entityId, input.entityId),
    );
}

async function revokeRewardsAwardedByEvents(
    awardedByEventIds: readonly string[],
    revokedAt: Date,
): Promise<void> {
    if (awardedByEventIds.length === 0) {
        return;
    }

    await db
        .update(communityRewardRecords)
        .set({
            status: 'revoked',
            displayState: 'hidden',
            revokedAt,
        })
        .where(
            and(
                inArray(communityRewardRecords.awardedByEventId, awardedByEventIds),
                eq(communityRewardRecords.status, 'earned'),
            ),
        );
}

async function zeroLinkedSquadGoalContributionEvents(
    sourceEventIdempotencyKeys: readonly string[],
): Promise<void> {
    if (sourceEventIdempotencyKeys.length === 0) {
        return;
    }

    const linkedRows = await db
        .select({
            id: communityProgressionEvents.id,
        })
        .from(communityProgressionEvents)
        .where(
            and(
                eq(communityProgressionEvents.eventType, 'squad_goal_contribution'),
                or(
                    ...sourceEventIdempotencyKeys.map((idempotencyKey) =>
                        sql`${communityProgressionEvents.metadata} ->> 'sourceEventIdempotencyKey' = ${idempotencyKey}`,
                    ),
                ),
            ),
        );

    if (linkedRows.length === 0) {
        return;
    }

    await db
        .update(communityProgressionEvents)
        .set({
            effectiveXp: 0,
        })
        .where(
            inArray(
                communityProgressionEvents.id,
                linkedRows.map((row) => row.id),
            ),
        );
}

function buildFinalCommunityProgressionLedger(input: {
    readonly progressionUserId: string;
    readonly storedUserEvents: readonly CommunityProgressionHistoryEvent[];
    readonly missionAndStreakEvents: readonly CommunityProgressionHistoryEvent[];
    readonly newSquadContributionEvent: CommunityProgressionHistoryEvent | null;
}): readonly CommunityProgressionHistoryEvent[] {
    const ownedEvents = getOwnedCommunityProgressionEvents(
        input.progressionUserId,
        input.storedUserEvents,
    );
    const baseEvents = ownedEvents.filter((event) => !isDerivedCommunityProgressionEventType(event.eventType));
    const squadContributionEvents = ownedEvents
        .filter((event) => event.eventType === 'squad_goal_contribution' && event.effectiveXp > 0)
        .filter((event) =>
            !input.newSquadContributionEvent
            || event.idempotencyKey !== input.newSquadContributionEvent.idempotencyKey,
        );

    return [
        ...baseEvents,
        ...input.missionAndStreakEvents,
        ...squadContributionEvents,
        ...(input.newSquadContributionEvent ? [input.newSquadContributionEvent] : []),
    ].sort(compareCommunityProgressionHistoryEventsByTime);
}

function getOwnedCommunityProgressionEvents(
    userId: string,
    events: readonly CommunityProgressionHistoryEvent[],
): readonly CommunityProgressionHistoryEvent[] {
    return events.filter((event) => resolveProgressionOwnerUserId(event) === userId);
}

function matchesSquadGoalContributionSourceEvent(
    baseEvent: CommunityProgressionEventRecord,
    progressionUserId: string,
    squadContext: CommunityProgressionSquadContext,
): boolean {
    if (!squadContext.squadId || !squadContext.activeGoal) {
        return false;
    }

    if (baseEvent.effectiveXp <= 0) {
        return false;
    }

    if (resolveProgressionOwnerUserId(baseEvent) !== progressionUserId) {
        return false;
    }

    if (baseEvent.squadId !== squadContext.squadId) {
        return false;
    }

    if (!squadContext.activeGoal.eligibleEventTypes.includes(baseEvent.eventType)) {
        return false;
    }

    const windowStartedAt = parseOptionalDate(squadContext.activeGoal.windowStartedAt);
    const windowEndsAt = parseOptionalDate(squadContext.activeGoal.windowEndsAt);

    if (windowStartedAt && baseEvent.occurredAt.getTime() < windowStartedAt.getTime()) {
        return false;
    }

    if (windowEndsAt && baseEvent.occurredAt.getTime() > windowEndsAt.getTime()) {
        return false;
    }

    return true;
}

function resolveProgressionOwnerUserId(input: {
    readonly actorUserId: string;
    readonly beneficiaryUserId?: string | null;
    readonly eventType?: CommunityProgressionEventType;
}): string {
    if (
        input.eventType
        && isBeneficiaryOwnedCommunityProgressionEventType(input.eventType)
    ) {
        return normalizeOptionalIdentifier(input.beneficiaryUserId)
            ?? input.actorUserId;
    }

    return input.actorUserId;
}

function isBeneficiaryOwnedCommunityProgressionEventType(
    eventType: CommunityProgressionEventType,
): boolean {
    return eventType === 'receive_unique_save'
        || eventType === 'receive_unique_copy';
}

function isMissionOrStreakDerivedCommunityProgressionEventType(
    eventType: CommunityProgressionEventType,
): boolean {
    return (
        COMMUNITY_MISSION_AND_STREAK_DERIVED_EVENT_TYPES as readonly CommunityProgressionEventType[]
    ).includes(eventType);
}

function isDerivedCommunityProgressionEventType(
    eventType: CommunityProgressionEventType,
): boolean {
    return (
        COMMUNITY_ALL_DERIVED_EVENT_TYPES as readonly CommunityProgressionEventType[]
    ).includes(eventType);
}

function buildCommunityAggregateScopeKey(
    scope: CommunityProgressionAggregateScope,
    scopeKey: string,
): string {
    return `${scope}:${scopeKey}`;
}

function toCommunityProgressionHistoryEventFromRecord(
    event: CommunityProgressionEventRecord,
): CommunityProgressionHistoryEvent {
    return {
        idempotencyKey: event.idempotencyKey,
        eventType: event.eventType,
        actorUserId: event.actorUserId,
        beneficiaryUserId: event.beneficiaryUserId,
        entityType: event.entityType,
        entityId: event.entityId,
        rawXp: event.rawXp,
        effectiveXp: event.effectiveXp,
        occurredAt: cloneDate(event.occurredAt),
        seasonId: event.seasonId,
        missionId: event.missionId,
        squadId: event.squadId,
    };
}

function compareCommunityProgressionEventRecordsByTime(
    left: CommunityProgressionEventRecord,
    right: CommunityProgressionEventRecord,
): number {
    const occurredAtDelta = left.occurredAt.getTime() - right.occurredAt.getTime();

    if (occurredAtDelta !== 0) {
        return occurredAtDelta;
    }

    return left.idempotencyKey.localeCompare(right.idempotencyKey, 'en');
}

function compareCommunityProgressionHistoryEventsByTime(
    left: CommunityProgressionHistoryEvent,
    right: CommunityProgressionHistoryEvent,
): number {
    const occurredAtDelta = left.occurredAt.getTime() - right.occurredAt.getTime();

    if (occurredAtDelta !== 0) {
        return occurredAtDelta;
    }

    return left.idempotencyKey.localeCompare(right.idempotencyKey, 'en');
}

function getCommunityRuleRawXp(eventType: CommunityProgressionEventType): number {
    return getCommunityProgressionRule(eventType).defaultXp;
}

function parseOptionalDate(value?: string | null): Date | null {
    if (!value) {
        return null;
    }

    const parsedDate = new Date(value);

    return Number.isNaN(parsedDate.getTime()) ? null : parsedDate;
}

function normalizeOptionalIdentifier(value?: string | null): string | null {
    const normalizedValue = value?.trim();
    return normalizedValue ? normalizedValue : null;
}

function uniqueValues<TValue>(values: readonly TValue[]): readonly TValue[] {
    return [...new Set(values)];
}

function cloneDate(date: Date): Date {
    return new Date(date.getTime());
}
