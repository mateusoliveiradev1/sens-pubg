import { and, desc, eq, inArray, or, sql } from 'drizzle-orm';

import {
    getCommunityProgressionRule,
    recordCommunityProgressionEvent,
    resolveActiveCommunitySeason,
    toCommunityProgressionHistoryEvent,
    type CommunityProgressionHistoryEvent,
    type CommunitySeasonSource,
} from '@/core/community-progression';
import { applyCommunityProgressionGuardrails } from '@/core/community-progression-guardrails';
import { db } from '@/db';
import {
    communityProgressionEvents,
    communityRewardRecords,
    communitySeasons,
    communitySquadMemberships,
    type CommunityReportEntityType,
} from '@/db/schema';
import type {
    CommunityProgressionEntityType,
    CommunityProgressionEventType,
} from '@/types/community';

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

export async function trackCommunityProgressionForAction(
    input: TrackCommunityProgressionForActionInput,
): Promise<void> {
    try {
        const occurredAt = cloneDate(input.occurredAt ?? new Date());
        const [activeSeasonContext, squadId, history] = await Promise.all([
            getActiveCommunitySeasonContext(occurredAt),
            getResolvedCommunitySquadId(input.actorUserId),
            getRelevantCommunityProgressionHistory({
                actorUserId: input.actorUserId,
                beneficiaryUserId: input.beneficiaryUserId ?? null,
                eventType: input.eventType,
                occurredAt,
            }),
        ]);
        const rawXp = getCommunityRuleRawXp(input.eventType);
        const guardrailOutcome = applyCommunityProgressionGuardrails({
            eventType: input.eventType,
            actorUserId: input.actorUserId,
            beneficiaryUserId: input.beneficiaryUserId ?? null,
            occurredAt,
            rawXp,
            history,
        });
        const metadata = {
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
            squadId,
            history,
            effectiveXpOverride: guardrailOutcome.effectiveXp,
        });

        if (recordResult.outcome !== 'recorded') {
            return;
        }

        await db
            .insert(communityProgressionEvents)
            .values({
                seasonId: recordResult.event.seasonId,
                missionId: recordResult.event.missionId,
                squadId: recordResult.event.squadId,
                actorUserId: recordResult.event.actorUserId,
                beneficiaryUserId: recordResult.event.beneficiaryUserId,
                eventType: recordResult.event.eventType,
                entityType: recordResult.event.entityType,
                entityId: recordResult.event.entityId,
                idempotencyKey: recordResult.event.idempotencyKey,
                rawXp: recordResult.event.rawXp,
                effectiveXp: recordResult.event.effectiveXp,
                metadata: recordResult.event.metadata,
                occurredAt: recordResult.event.occurredAt,
            })
            .onConflictDoNothing({
                target: communityProgressionEvents.idempotencyKey,
            });
    } catch (error) {
        console.error('[community progression recorder] failed to track event', error);
    }
}

export async function excludeCommunityEntityFromGamification(
    input: ExcludeCommunityEntityFromGamificationInput,
): Promise<void> {
    try {
        const impactedEventIds = await getImpactedCommunityProgressionEventIds(input);

        if (impactedEventIds.length === 0) {
            return;
        }

        const now = new Date();

        await db
            .update(communityProgressionEvents)
            .set({
                effectiveXp: 0,
            })
            .where(inArray(communityProgressionEvents.id, impactedEventIds));

        await db
            .update(communityRewardRecords)
            .set({
                status: 'revoked',
                displayState: 'hidden',
                revokedAt: now,
            })
            .where(
                and(
                    inArray(communityRewardRecords.awardedByEventId, impactedEventIds),
                    eq(communityRewardRecords.status, 'earned'),
                ),
            );
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

async function getResolvedCommunitySquadId(
    userId: string,
): Promise<string | null> {
    const memberships = await db
        .select({
            squadId: communitySquadMemberships.squadId,
        })
        .from(communitySquadMemberships)
        .where(
            and(
                eq(communitySquadMemberships.userId, userId),
                eq(communitySquadMemberships.status, 'active'),
            ),
        );

    return memberships.length === 1 ? memberships[0]!.squadId : null;
}

async function getImpactedCommunityProgressionEventIds(
    input: ExcludeCommunityEntityFromGamificationInput,
): Promise<readonly string[]> {
    const rows = await db
        .select({
            id: communityProgressionEvents.id,
        })
        .from(communityProgressionEvents)
        .where(buildCommunityEntityExclusionPredicate(input));

    return rows.map((row) => row.id);
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

function cloneDate(date: Date): Date {
    return new Date(date.getTime());
}

function getCommunityRuleRawXp(eventType: CommunityProgressionEventType): number {
    return getCommunityProgressionRule(eventType).defaultXp;
}
