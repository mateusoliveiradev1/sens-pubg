import { describe, expect, it } from 'vitest';

import {
    COMMUNITY_PROGRESSION_RULES,
    buildCommunityPersonalRecap,
    buildCommunityMissionProgressSnapshots,
    buildCommunityPrivateProgressionSummary,
    buildCommunityProgressionAggregateSnapshot,
    buildCommunityProgressionStreakSnapshot,
    buildCommunitySquadRecap,
    recordCommunityProgressionEvent,
    resolveActiveCommunitySeason,
    resolveCommunityWeeklyChallenge,
    type CommunityProgressionHistoryEvent,
    type CommunityProgressionMissionSource,
    type CommunityRewardRecordSource,
    type CommunitySeasonSource,
    type CommunityWeeklyChallengeTrendSignal,
} from './community-progression';
import { applyCommunityProgressionGuardrails } from './community-progression-guardrails';

function createHistoryEvent(
    overrides: Partial<CommunityProgressionHistoryEvent> & {
        readonly idempotencyKey: string;
        readonly eventType: CommunityProgressionHistoryEvent['eventType'];
        readonly actorUserId: string;
        readonly entityType: CommunityProgressionHistoryEvent['entityType'];
        readonly entityId: string;
        readonly occurredAt: Date;
    },
): CommunityProgressionHistoryEvent {
    return {
        idempotencyKey: overrides.idempotencyKey,
        eventType: overrides.eventType,
        actorUserId: overrides.actorUserId,
        beneficiaryUserId: overrides.beneficiaryUserId ?? null,
        entityType: overrides.entityType,
        entityId: overrides.entityId,
        rawXp: overrides.rawXp ?? overrides.effectiveXp ?? 0,
        effectiveXp: overrides.effectiveXp ?? overrides.rawXp ?? 0,
        occurredAt: overrides.occurredAt,
        seasonId: overrides.seasonId ?? null,
        missionId: overrides.missionId ?? null,
        squadId: overrides.squadId ?? null,
    };
}

function createMission(
    overrides: Partial<CommunityProgressionMissionSource> & {
        readonly id: string;
        readonly title: string;
    },
): CommunityProgressionMissionSource {
    return {
        id: overrides.id,
        title: overrides.title,
        description: overrides.description ?? `${overrides.title} description`,
        missionType: overrides.missionType ?? 'weekly_challenge',
        status: overrides.status ?? 'active',
        cadence: overrides.cadence ?? 'weekly',
        seasonId: overrides.seasonId ?? null,
        targetCount: overrides.targetCount ?? 1,
        rewardXp: overrides.rewardXp ?? 0,
        theme: overrides.theme ?? null,
        eligibleActions: overrides.eligibleActions ?? [],
        config: overrides.config ?? {
            targetCount: overrides.targetCount ?? 1,
            eligibleEventTypes: [],
            metadata: {},
        },
        startsAt: overrides.startsAt ?? null,
        endsAt: overrides.endsAt ?? null,
    };
}

function createSeason(
    overrides: Partial<CommunitySeasonSource> & {
        readonly id: string;
        readonly slug: string;
        readonly title: string;
        readonly startsAt: Date;
        readonly endsAt: Date;
    },
): CommunitySeasonSource {
    return {
        id: overrides.id,
        slug: overrides.slug,
        title: overrides.title,
        theme: overrides.theme ?? 'Patch 36.1',
        summary: overrides.summary ?? `${overrides.title} summary`,
        status: overrides.status ?? 'active',
        startsAt: overrides.startsAt,
        endsAt: overrides.endsAt,
    };
}

function createReward(
    overrides: Partial<CommunityRewardRecordSource> & {
        readonly id: string;
        readonly ownerType: CommunityRewardRecordSource['ownerType'];
        readonly rewardKind: CommunityRewardRecordSource['rewardKind'];
        readonly label: string;
        readonly earnedAt: Date;
    },
): CommunityRewardRecordSource {
    return {
        id: overrides.id,
        ownerType: overrides.ownerType,
        rewardKind: overrides.rewardKind,
        label: overrides.label,
        status: overrides.status ?? 'earned',
        displayState: overrides.displayState ?? 'hidden',
        isPublicSafe: overrides.isPublicSafe ?? false,
        earnedAt: overrides.earnedAt,
        userId: overrides.userId ?? null,
        squadId: overrides.squadId ?? null,
    };
}

function createTrend(
    overrides: Partial<CommunityWeeklyChallengeTrendSignal> & {
        readonly key: string;
        readonly kind: CommunityWeeklyChallengeTrendSignal['kind'];
        readonly value: string;
        readonly label: string;
        readonly href: string;
    },
): CommunityWeeklyChallengeTrendSignal {
    return {
        key: overrides.key,
        kind: overrides.kind,
        value: overrides.value,
        label: overrides.label,
        href: overrides.href,
        postCount: overrides.postCount ?? 2,
        engagementCount: overrides.engagementCount ?? 8,
        reason: overrides.reason ?? '2 posts publicos recentes.',
    };
}

describe('recordCommunityProgressionEvent', () => {
    it('records configured XP for a public publish action', () => {
        const occurredAt = new Date('2026-04-20T12:00:00.000Z');
        const result = recordCommunityProgressionEvent({
            actorUserId: 'user-1',
            eventType: 'publish_post',
            entityType: 'post',
            entityId: 'post-1',
            isPubliclyVisible: true,
            occurredAt,
        });

        expect(result.outcome).toBe('recorded');

        if (result.outcome !== 'recorded') {
            return;
        }

        expect(result.rule).toEqual(COMMUNITY_PROGRESSION_RULES.publish_post);
        expect(result.event).toEqual({
            seasonId: null,
            missionId: null,
            squadId: null,
            actorUserId: 'user-1',
            beneficiaryUserId: null,
            eventType: 'publish_post',
            entityType: 'post',
            entityId: 'post-1',
            idempotencyKey: 'publish_post:user-1:-:post:post-1',
            rawXp: 40,
            effectiveXp: 40,
            metadata: {},
            occurredAt,
        });
    });

    it('ignores hidden or moderated content before awarding progression XP', () => {
        const hiddenResult = recordCommunityProgressionEvent({
            actorUserId: 'user-1',
            beneficiaryUserId: 'user-2',
            eventType: 'receive_unique_save',
            entityType: 'post',
            entityId: 'post-1',
            isPubliclyVisible: true,
            isHidden: true,
            occurredAt: new Date('2026-04-20T12:00:00.000Z'),
        });
        const moderatedResult = recordCommunityProgressionEvent({
            actorUserId: 'user-1',
            eventType: 'comment_with_context',
            entityType: 'comment',
            entityId: 'comment-1',
            dedupeKey: 'comment-1',
            hasRequiredContext: true,
            isPubliclyVisible: true,
            isModerated: true,
            occurredAt: new Date('2026-04-20T13:00:00.000Z'),
        });

        expect(hiddenResult).toMatchObject({
            outcome: 'ignored',
            reason: 'entity_hidden',
        });
        expect(moderatedResult).toMatchObject({
            outcome: 'ignored',
            reason: 'entity_moderated',
        });
    });

    it('blocks duplicate idempotency fingerprints for unique progression actions', () => {
        const history = [
            createHistoryEvent({
                idempotencyKey: 'receive_unique_save:user-2:user-1:post:post-1',
                eventType: 'receive_unique_save',
                actorUserId: 'user-2',
                beneficiaryUserId: 'user-1',
                entityType: 'post',
                entityId: 'post-1',
                effectiveXp: 15,
                occurredAt: new Date('2026-04-20T10:00:00.000Z'),
            }),
        ];

        const result = recordCommunityProgressionEvent({
            actorUserId: 'user-2',
            beneficiaryUserId: 'user-1',
            eventType: 'receive_unique_save',
            entityType: 'post',
            entityId: 'post-1',
            isPubliclyVisible: true,
            occurredAt: new Date('2026-04-20T12:00:00.000Z'),
            history,
        });

        expect(result).toMatchObject({
            outcome: 'ignored',
            reason: 'duplicate_event',
        });
    });

    it('enforces cooldown windows for repeated contextual actions on the same target', () => {
        const history = [
            createHistoryEvent({
                idempotencyKey: 'comment_with_context:user-1:-:comment:comment-1:comment-1',
                eventType: 'comment_with_context',
                actorUserId: 'user-1',
                entityType: 'comment',
                entityId: 'comment-thread-1',
                effectiveXp: 20,
                occurredAt: new Date('2026-04-20T08:00:00.000Z'),
            }),
        ];
        const result = recordCommunityProgressionEvent({
            actorUserId: 'user-1',
            eventType: 'comment_with_context',
            entityType: 'comment',
            entityId: 'comment-thread-1',
            dedupeKey: 'comment-2',
            hasRequiredContext: true,
            isPubliclyVisible: true,
            occurredAt: new Date('2026-04-20T14:00:00.000Z'),
            history,
        });

        expect(result).toMatchObject({
            outcome: 'ignored',
            reason: 'cooldown_active',
        });

        if (result.outcome !== 'ignored') {
            return;
        }

        expect(result.cooldownEndsAt).toEqual(new Date('2026-04-20T20:00:00.000Z'));
    });

    it('allows a contextual action again after the cooldown window expires', () => {
        const history = [
            createHistoryEvent({
                idempotencyKey: 'comment_with_context:user-1:-:comment:comment-thread-1:comment-1',
                eventType: 'comment_with_context',
                actorUserId: 'user-1',
                entityType: 'comment',
                entityId: 'comment-thread-1',
                effectiveXp: 20,
                occurredAt: new Date('2026-04-20T08:00:00.000Z'),
            }),
        ];
        const result = recordCommunityProgressionEvent({
            actorUserId: 'user-1',
            eventType: 'comment_with_context',
            entityType: 'comment',
            entityId: 'comment-thread-1',
            dedupeKey: 'comment-2',
            hasRequiredContext: true,
            isPubliclyVisible: true,
            occurredAt: new Date('2026-04-20T21:30:00.000Z'),
            history,
        });

        expect(result.outcome).toBe('recorded');

        if (result.outcome !== 'recorded') {
            return;
        }

        expect(result.event.idempotencyKey).toBe(
            'comment_with_context:user-1:-:comment:comment-thread-1:comment-2',
        );
        expect(result.event.rawXp).toBe(20);
        expect(result.event.effectiveXp).toBe(20);
    });
});

describe('community progression guardrails', () => {
    it('caps repeated low-value engagement for the same actor-beneficiary pair within a day', () => {
        const outcome = applyCommunityProgressionGuardrails({
            eventType: 'receive_unique_save',
            actorUserId: 'user-1',
            beneficiaryUserId: 'user-2',
            occurredAt: new Date('2026-04-20T18:00:00.000Z'),
            rawXp: 15,
            history: [
                createHistoryEvent({
                    idempotencyKey: 'save-1',
                    eventType: 'receive_unique_save',
                    actorUserId: 'user-1',
                    beneficiaryUserId: 'user-2',
                    entityType: 'post',
                    entityId: 'post-1',
                    effectiveXp: 15,
                    occurredAt: new Date('2026-04-20T10:00:00.000Z'),
                }),
                createHistoryEvent({
                    idempotencyKey: 'save-2',
                    eventType: 'receive_unique_save',
                    actorUserId: 'user-1',
                    beneficiaryUserId: 'user-2',
                    entityType: 'post',
                    entityId: 'post-2',
                    effectiveXp: 15,
                    occurredAt: new Date('2026-04-20T12:00:00.000Z'),
                }),
            ],
        });

        expect(outcome).toEqual({
            effectiveXp: 0,
            reasons: ['pair_period_cap'],
        });
    });

    it('caps low-value actions after the actor hits the daily period limit', () => {
        const outcome = applyCommunityProgressionGuardrails({
            eventType: 'follow_profile',
            actorUserId: 'user-1',
            occurredAt: new Date('2026-04-20T18:00:00.000Z'),
            rawXp: 10,
            history: [
                createHistoryEvent({
                    idempotencyKey: 'follow-1',
                    eventType: 'follow_profile',
                    actorUserId: 'user-1',
                    entityType: 'profile',
                    entityId: 'profile-1',
                    effectiveXp: 10,
                    occurredAt: new Date('2026-04-20T09:00:00.000Z'),
                }),
                createHistoryEvent({
                    idempotencyKey: 'follow-2',
                    eventType: 'follow_profile',
                    actorUserId: 'user-1',
                    entityType: 'profile',
                    entityId: 'profile-2',
                    effectiveXp: 10,
                    occurredAt: new Date('2026-04-20T11:00:00.000Z'),
                }),
                createHistoryEvent({
                    idempotencyKey: 'follow-3',
                    eventType: 'follow_profile',
                    actorUserId: 'user-1',
                    entityType: 'profile',
                    entityId: 'profile-3',
                    effectiveXp: 10,
                    occurredAt: new Date('2026-04-20T13:00:00.000Z'),
                }),
            ],
        });

        expect(outcome).toEqual({
            effectiveXp: 0,
            reasons: ['period_cap'],
        });
    });

    it('caps reciprocal farming even before the direct pair cap is reached', () => {
        const outcome = applyCommunityProgressionGuardrails({
            eventType: 'receive_unique_copy',
            actorUserId: 'user-1',
            beneficiaryUserId: 'user-2',
            occurredAt: new Date('2026-04-20T18:00:00.000Z'),
            rawXp: 20,
            history: [
                createHistoryEvent({
                    idempotencyKey: 'copy-1',
                    eventType: 'receive_unique_copy',
                    actorUserId: 'user-1',
                    beneficiaryUserId: 'user-2',
                    entityType: 'post',
                    entityId: 'post-1',
                    effectiveXp: 20,
                    occurredAt: new Date('2026-04-20T09:00:00.000Z'),
                }),
                createHistoryEvent({
                    idempotencyKey: 'copy-2',
                    eventType: 'receive_unique_copy',
                    actorUserId: 'user-2',
                    beneficiaryUserId: 'user-1',
                    entityType: 'post',
                    entityId: 'post-2',
                    effectiveXp: 20,
                    occurredAt: new Date('2026-04-20T10:00:00.000Z'),
                }),
                createHistoryEvent({
                    idempotencyKey: 'copy-3',
                    eventType: 'receive_unique_copy',
                    actorUserId: 'user-2',
                    beneficiaryUserId: 'user-1',
                    entityType: 'post',
                    entityId: 'post-3',
                    effectiveXp: 20,
                    occurredAt: new Date('2026-04-20T11:00:00.000Z'),
                }),
            ],
        });

        expect(outcome).toEqual({
            effectiveXp: 0,
            reasons: ['reciprocal_pair_cap'],
        });
    });
});

describe('community rituals and seasons', () => {
    it('resolves the active season and derives a weekly challenge from trend data', () => {
        const seasons = [
            createSeason({
                id: 'season-active',
                slug: 'operation-361',
                title: 'Operation 36.1',
                theme: 'Patch 36.1',
                startsAt: new Date('2026-04-20T00:00:00.000Z'),
                endsAt: new Date('2026-05-18T00:00:00.000Z'),
            }),
            createSeason({
                id: 'season-draft',
                slug: 'future-season',
                title: 'Future season',
                status: 'draft',
                startsAt: new Date('2026-05-20T00:00:00.000Z'),
                endsAt: new Date('2026-06-20T00:00:00.000Z'),
            }),
        ] satisfies readonly CommunitySeasonSource[];

        const season = resolveActiveCommunitySeason({
            seasons,
            now: new Date('2026-04-22T12:00:00.000Z'),
        });
        const challenge = resolveCommunityWeeklyChallenge({
            seasons,
            trends: [
                createTrend({
                    key: 'weapon:beryl-m762',
                    kind: 'weapon',
                    value: 'beryl-m762',
                    label: 'Beryl M762',
                    href: '/community?weaponId=beryl-m762',
                    postCount: 4,
                    engagementCount: 18,
                    reason: '4 posts publicos com 6 presets copiados.',
                }),
                createTrend({
                    key: 'patch:36.1',
                    kind: 'patch',
                    value: '36.1',
                    label: 'Patch 36.1',
                    href: '/community?patchVersion=36.1',
                    postCount: 3,
                    engagementCount: 12,
                }),
            ],
            now: new Date('2026-04-22T12:00:00.000Z'),
        });

        expect(season).toMatchObject({
            kind: 'active',
            seasonId: 'season-active',
            title: 'Operation 36.1',
            theme: 'Patch 36.1',
        });
        expect(challenge).toMatchObject({
            source: 'trend',
            seasonId: 'season-active',
            title: 'Desafio semanal: estabilize Beryl M762',
            theme: 'Patch 36.1',
            rationale: '4 posts publicos com 6 presets copiados.',
            startsAt: new Date('2026-04-20T00:00:00.000Z'),
            endsAt: new Date('2026-04-26T23:59:59.999Z'),
            trend: {
                key: 'weapon:beryl-m762',
                href: '/community?weaponId=beryl-m762',
            },
            eligibleActions: [
                expect.objectContaining({
                    eventType: 'publish_post',
                    title: 'Publique uma leitura sobre Beryl M762',
                    entityType: 'post',
                }),
                expect.objectContaining({
                    eventType: 'comment_with_context',
                    title: 'Comente com contexto sobre Beryl M762',
                    entityType: 'comment',
                }),
            ],
        });
    });

    it('uses a neutral fallback weekly challenge when no trend data is available', () => {
        const challenge = resolveCommunityWeeklyChallenge({
            seasons: [],
            trends: [],
            now: new Date('2026-04-22T12:00:00.000Z'),
        });

        expect(challenge).toMatchObject({
            source: 'fallback',
            seasonId: null,
            title: 'Desafio semanal: publique um snapshot util',
            theme: 'Evergreen',
            startsAt: new Date('2026-04-20T00:00:00.000Z'),
            endsAt: new Date('2026-04-26T23:59:59.999Z'),
            eligibleActions: [
                expect.objectContaining({
                    eventType: 'complete_public_profile',
                    entityType: 'profile',
                }),
                expect.objectContaining({
                    eventType: 'publish_post',
                    entityType: 'post',
                }),
            ],
        });
        expect(challenge.description.toLowerCase()).not.toContain('urgencia');
        expect(challenge.description.toLowerCase()).not.toContain('vazio');
    });

    it('calculates streaks across weekly participation windows and enters reentry after a missed week', () => {
        const streak = buildCommunityProgressionStreakSnapshot({
            userId: 'user-1',
            events: [
                createHistoryEvent({
                    idempotencyKey: 'publish-post-1',
                    eventType: 'publish_post',
                    actorUserId: 'user-1',
                    entityType: 'post',
                    entityId: 'post-1',
                    effectiveXp: 40,
                    occurredAt: new Date('2026-04-01T10:00:00.000Z'),
                }),
                createHistoryEvent({
                    idempotencyKey: 'comment-context-1',
                    eventType: 'comment_with_context',
                    actorUserId: 'user-1',
                    entityType: 'comment',
                    entityId: 'comment-1',
                    effectiveXp: 20,
                    occurredAt: new Date('2026-04-08T10:00:00.000Z'),
                }),
            ],
            now: new Date('2026-04-22T12:00:00.000Z'),
        });

        expect(streak).toMatchObject({
            currentStreak: 0,
            longestStreak: 2,
            streakState: 'reentry',
            lastWindowStartedAt: new Date('2026-03-30T00:00:00.000Z'),
            lastWindowEndedAt: new Date('2026-04-12T23:59:59.999Z'),
            nextWindowStartsAt: new Date('2026-04-20T00:00:00.000Z'),
            nextWindowEndsAt: new Date('2026-04-26T23:59:59.999Z'),
            missedWindowCount: 1,
        });
    });

    it('builds personal and squad recaps with rituals, rewards and next suggested actions', () => {
        const season = createSeason({
            id: 'season-1',
            slug: 'operation-361',
            title: 'Operation 36.1',
            theme: 'Patch 36.1',
            startsAt: new Date('2026-04-20T00:00:00.000Z'),
            endsAt: new Date('2026-05-18T00:00:00.000Z'),
        });
        const missions = [
            createMission({
                id: 'mission-weekly',
                title: 'Segure a Beryl no patch 36.1',
                description: 'Publique uma leitura util ou deixe contexto tecnico sobre a Beryl.',
                missionType: 'weekly_challenge',
                cadence: 'weekly',
                targetCount: 2,
                eligibleActions: [
                    {
                        eventType: 'publish_post',
                        title: 'Publique uma analise da Beryl',
                        description: 'Compartilhe uma leitura publica da Beryl no patch atual.',
                    },
                    {
                        eventType: 'comment_with_context',
                        title: 'Comente com contexto',
                        description: 'Explique como voce corrigiu ou leu o recoil da Beryl.',
                    },
                ],
                config: {
                    targetCount: 2,
                    eligibleEventTypes: ['publish_post', 'comment_with_context'],
                    metadata: {},
                },
                seasonId: 'season-1',
                theme: 'Beryl focus',
                startsAt: new Date('2026-04-20T00:00:00.000Z'),
                endsAt: new Date('2026-04-26T23:59:59.999Z'),
                rewardXp: 80,
            }),
        ] satisfies readonly CommunityProgressionMissionSource[];
        const events = [
            createHistoryEvent({
                idempotencyKey: 'complete-profile-1',
                eventType: 'complete_public_profile',
                actorUserId: 'user-1',
                entityType: 'profile',
                entityId: 'profile-1',
                effectiveXp: 30,
                occurredAt: new Date('2026-04-14T12:00:00.000Z'),
            }),
            createHistoryEvent({
                idempotencyKey: 'publish-weekly-1',
                eventType: 'publish_post',
                actorUserId: 'user-1',
                entityType: 'post',
                entityId: 'post-1',
                effectiveXp: 40,
                occurredAt: new Date('2026-04-21T12:00:00.000Z'),
                missionId: 'mission-weekly',
                seasonId: 'season-1',
                squadId: 'squad-1',
            }),
            createHistoryEvent({
                idempotencyKey: 'challenge-complete-1',
                eventType: 'weekly_challenge_complete',
                actorUserId: 'user-1',
                entityType: 'mission',
                entityId: 'mission-weekly',
                effectiveXp: 80,
                occurredAt: new Date('2026-04-22T12:00:00.000Z'),
                missionId: 'mission-weekly',
                seasonId: 'season-1',
            }),
            createHistoryEvent({
                idempotencyKey: 'squad-comment-1',
                eventType: 'comment_with_context',
                actorUserId: 'user-2',
                entityType: 'comment',
                entityId: 'comment-1',
                effectiveXp: 20,
                occurredAt: new Date('2026-04-22T18:00:00.000Z'),
                missionId: 'mission-weekly',
                squadId: 'squad-1',
            }),
        ] satisfies readonly CommunityProgressionHistoryEvent[];
        const rewards = [
            createReward({
                id: 'reward-user-1',
                ownerType: 'user',
                rewardKind: 'badge',
                label: 'Operador da Beryl',
                earnedAt: new Date('2026-04-22T12:30:00.000Z'),
                userId: 'user-1',
                isPublicSafe: true,
            }),
            createReward({
                id: 'reward-squad-1',
                ownerType: 'squad',
                rewardKind: 'squad_mark',
                label: 'Squad sincronizado',
                earnedAt: new Date('2026-04-22T19:00:00.000Z'),
                squadId: 'squad-1',
                isPublicSafe: true,
            }),
        ] satisfies readonly CommunityRewardRecordSource[];

        const personalRecap = buildCommunityPersonalRecap({
            userId: 'user-1',
            events,
            missions,
            rewards,
            seasons: [season],
            now: new Date('2026-04-23T12:00:00.000Z'),
        });
        const squadRecap = buildCommunitySquadRecap({
            squadId: 'squad-1',
            squadName: 'Alpha Spray',
            memberUserIds: ['user-1', 'user-2'],
            events,
            missions,
            rewards,
            seasons: [season],
            now: new Date('2026-04-23T12:00:00.000Z'),
        });

        expect(personalRecap).toMatchObject({
            state: 'recap',
            season: {
                seasonId: 'season-1',
            },
            window: {
                kind: 'current',
            },
            earnedXp: 120,
            unlockedRewards: [
                expect.objectContaining({
                    label: 'Operador da Beryl',
                    rewardKind: 'badge',
                }),
            ],
            nextAction: {
                eventType: 'comment_with_context',
            },
        });
        expect(personalRecap.completedRituals.map((ritual) => ritual.title)).toContain(
            'Segure a Beryl no patch 36.1',
        );

        expect(squadRecap).toMatchObject({
            state: 'recap',
            squadId: 'squad-1',
            activeMemberCount: 2,
            unlockedRewards: [
                expect.objectContaining({
                    label: 'Squad sincronizado',
                    rewardKind: 'squad_mark',
                }),
            ],
            nextAction: {
                eventType: 'publish_post',
            },
        });
        expect(squadRecap.completedRituals.map((ritual) => ritual.title)).toEqual([
            'Segure a Beryl no patch 36.1',
        ]);
    });
});

describe('community progression aggregates', () => {
    it('builds level state, mission progress and private summary from the event ledger', () => {
        const events = [
            createHistoryEvent({
                idempotencyKey: 'complete_public_profile:user-1:-:profile:profile-1',
                eventType: 'complete_public_profile',
                actorUserId: 'user-1',
                entityType: 'profile',
                entityId: 'profile-1',
                effectiveXp: 30,
                occurredAt: new Date('2026-04-01T10:00:00.000Z'),
            }),
            createHistoryEvent({
                idempotencyKey: 'publish_post:user-1:-:post:post-1',
                eventType: 'publish_post',
                actorUserId: 'user-1',
                entityType: 'post',
                entityId: 'post-1',
                effectiveXp: 40,
                occurredAt: new Date('2026-04-08T10:00:00.000Z'),
            }),
            createHistoryEvent({
                idempotencyKey: 'receive_unique_save:user-2:user-1:post:post-1',
                eventType: 'receive_unique_save',
                actorUserId: 'user-2',
                beneficiaryUserId: 'user-1',
                entityType: 'post',
                entityId: 'post-1',
                effectiveXp: 15,
                occurredAt: new Date('2026-04-09T10:00:00.000Z'),
            }),
            createHistoryEvent({
                idempotencyKey: 'comment_with_context:user-1:-:comment:comment-1:comment-1',
                eventType: 'comment_with_context',
                actorUserId: 'user-1',
                entityType: 'comment',
                entityId: 'comment-1',
                effectiveXp: 20,
                occurredAt: new Date('2026-04-15T10:00:00.000Z'),
            }),
        ] satisfies readonly CommunityProgressionHistoryEvent[];
        const missions = [
            createMission({
                id: 'mission-1',
                title: 'Ritmo semanal',
                targetCount: 3,
                rewardXp: 80,
                eligibleActions: [
                    {
                        eventType: 'publish_post',
                        title: 'Publique uma analise publica',
                        description: 'Compartilhe outra leitura util da sua analise.',
                    },
                    {
                        eventType: 'comment_with_context',
                        title: 'Adicione contexto',
                        description: 'Comente com um diagnostico ou ajuste relevante.',
                    },
                ],
                config: {
                    targetCount: 3,
                    eligibleEventTypes: ['publish_post', 'comment_with_context'],
                    metadata: {},
                },
                startsAt: new Date('2026-04-01T00:00:00.000Z'),
                endsAt: new Date('2026-04-20T00:00:00.000Z'),
            }),
            createMission({
                id: 'mission-2',
                title: 'Conteudo salvo',
                targetCount: 1,
                rewardXp: 15,
                eligibleActions: [
                    {
                        eventType: 'receive_unique_save',
                        title: 'Receba um save unico',
                        description: 'Crie um post que outro operador queira guardar.',
                    },
                ],
                config: {
                    targetCount: 1,
                    eligibleEventTypes: ['receive_unique_save'],
                    metadata: {},
                },
                startsAt: new Date('2026-04-01T00:00:00.000Z'),
                endsAt: new Date('2026-04-10T00:00:00.000Z'),
            }),
        ] satisfies readonly CommunityProgressionMissionSource[];

        const aggregate = buildCommunityProgressionAggregateSnapshot({
            userId: 'user-1',
            events,
            missions,
            now: new Date('2026-04-16T12:00:00.000Z'),
        });
        const missionProgress = buildCommunityMissionProgressSnapshots({
            userId: 'user-1',
            events,
            missions,
            now: new Date('2026-04-16T12:00:00.000Z'),
        });
        const summary = buildCommunityPrivateProgressionSummary({
            userId: 'user-1',
            events,
            missions,
            now: new Date('2026-04-16T12:00:00.000Z'),
        });

        expect(aggregate).toMatchObject({
            totalXp: 105,
            currentLevel: 2,
            currentLevelXp: 5,
            nextLevelXp: 125,
            activeMissionCount: 1,
            currentStreak: 3,
            longestStreak: 3,
            streakState: 'active',
        });
        expect(aggregate.levelState.xpToNextLevel).toBe(120);

        expect(missionProgress).toEqual([
            expect.objectContaining({
                missionId: 'mission-1',
                currentCount: 2,
                remainingCount: 1,
                isComplete: false,
            }),
            expect.objectContaining({
                missionId: 'mission-2',
                currentCount: 1,
                remainingCount: 0,
                isComplete: true,
            }),
        ]);

        expect(summary).toMatchObject({
            isZeroState: false,
            totalEventCount: 4,
            totalXp: 105,
            currentLevel: 2,
            currentLevelXp: 5,
            nextLevelXp: 125,
            activeMissionCount: 1,
            completedMissionCount: 1,
            nextMilestone: {
                type: 'mission',
                missionId: 'mission-1',
                remainingCount: 1,
            },
            nextMeaningfulAction: {
                eventType: 'publish_post',
                title: 'Publique uma analise publica',
            },
        });
    });

    it('returns a neutral zero-state summary when the user has no progression history yet', () => {
        const summary = buildCommunityPrivateProgressionSummary({
            userId: 'user-1',
            events: [],
            missions: [],
            now: new Date('2026-04-20T12:00:00.000Z'),
        });

        expect(summary).toMatchObject({
            isZeroState: true,
            totalEventCount: 0,
            totalXp: 0,
            currentLevel: 1,
            currentLevelXp: 0,
            nextLevelXp: 100,
            activeMissionCount: 0,
            completedMissionCount: 0,
            nextMilestone: {
                type: 'level',
                remainingXp: 100,
            },
            nextMeaningfulAction: {
                eventType: 'complete_public_profile',
                title: 'Complete seu perfil publico',
            },
        });
        expect(summary.streak).toMatchObject({
            currentStreak: 0,
            longestStreak: 0,
            streakState: 'inactive',
        });
    });

    it('ignores zero-XP events for mission progress and private progression summaries', () => {
        const missions = [
            createMission({
                id: 'mission-zero-xp',
                title: 'Publique algo util',
                targetCount: 1,
                eligibleActions: [
                    {
                        eventType: 'publish_post',
                        title: 'Publique uma analise publica',
                        description: 'Compartilhe uma leitura valida.',
                    },
                ],
                config: {
                    targetCount: 1,
                    eligibleEventTypes: ['publish_post'],
                    metadata: {},
                },
                startsAt: new Date('2026-04-01T00:00:00.000Z'),
                endsAt: new Date('2026-04-30T23:59:59.999Z'),
            }),
        ] satisfies readonly CommunityProgressionMissionSource[];
        const events = [
            createHistoryEvent({
                idempotencyKey: 'publish-zero-xp',
                eventType: 'publish_post',
                actorUserId: 'user-1',
                entityType: 'post',
                entityId: 'post-1',
                rawXp: 40,
                effectiveXp: 0,
                occurredAt: new Date('2026-04-20T12:00:00.000Z'),
            }),
        ] satisfies readonly CommunityProgressionHistoryEvent[];

        const [missionProgress] = buildCommunityMissionProgressSnapshots({
            userId: 'user-1',
            events,
            missions,
            now: new Date('2026-04-21T12:00:00.000Z'),
        });
        const summary = buildCommunityPrivateProgressionSummary({
            userId: 'user-1',
            events,
            missions,
            now: new Date('2026-04-21T12:00:00.000Z'),
        });

        expect(missionProgress).toMatchObject({
            missionId: 'mission-zero-xp',
            currentCount: 0,
            remainingCount: 1,
            isComplete: false,
        });
        expect(summary).toMatchObject({
            isZeroState: true,
            totalEventCount: 0,
            totalXp: 0,
            activeMissionCount: 1,
            completedMissionCount: 0,
        });
    });

    it('treats zero-XP recap events as no meaningful activity for personal and squad recaps', () => {
        const events = [
            createHistoryEvent({
                idempotencyKey: 'publish-zero-xp-recap',
                eventType: 'publish_post',
                actorUserId: 'user-1',
                entityType: 'post',
                entityId: 'post-1',
                rawXp: 40,
                effectiveXp: 0,
                occurredAt: new Date('2026-04-21T12:00:00.000Z'),
                squadId: 'squad-1',
            }),
        ] satisfies readonly CommunityProgressionHistoryEvent[];

        const personalRecap = buildCommunityPersonalRecap({
            userId: 'user-1',
            events,
            now: new Date('2026-04-22T12:00:00.000Z'),
        });
        const squadRecap = buildCommunitySquadRecap({
            squadId: 'squad-1',
            squadName: 'Alpha Spray',
            memberUserIds: ['user-1'],
            events,
            now: new Date('2026-04-22T12:00:00.000Z'),
        });

        expect(personalRecap).toMatchObject({
            state: 'zero_state',
            earnedXp: 0,
            completedRituals: [],
            unlockedRewards: [],
        });
        expect(squadRecap).toMatchObject({
            state: 'zero_state',
            earnedXp: 0,
            completedRituals: [],
            unlockedRewards: [],
        });
    });
});
