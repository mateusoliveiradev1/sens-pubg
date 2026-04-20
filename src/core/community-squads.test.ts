import { describe, expect, it } from 'vitest';

import {
    buildCommunityPublicSquadIdentity,
    buildCommunitySquadGoalProgressSnapshot,
    buildCommunitySquadSlug,
    resolveCommunitySquadInviteValidity,
    resolveDefaultCommunitySquadGoal,
    type CommunitySquadInviteSource,
} from './community-squads';
import type { CommunityProgressionHistoryEvent } from './community-progression';

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

function createInvite(
    overrides: Partial<CommunitySquadInviteSource> & {
        readonly id: string;
        readonly squadId: string;
        readonly createdByUserId: string;
        readonly inviteCode: string;
        readonly expiresAt: Date;
    },
): CommunitySquadInviteSource {
    return {
        id: overrides.id,
        squadId: overrides.squadId,
        createdByUserId: overrides.createdByUserId,
        invitedUserId: overrides.invitedUserId ?? null,
        acceptedByUserId: overrides.acceptedByUserId ?? null,
        inviteCode: overrides.inviteCode,
        status: overrides.status ?? 'pending',
        expiresAt: overrides.expiresAt,
        acceptedAt: overrides.acceptedAt ?? null,
        revokedAt: overrides.revokedAt ?? null,
        createdAt: overrides.createdAt ?? new Date('2026-04-20T10:00:00.000Z'),
        updatedAt: overrides.updatedAt ?? new Date('2026-04-20T10:00:00.000Z'),
    };
}

describe('community squads core', () => {
    it('creates stable squad slugs with ascii-only normalization and owner suffixes', () => {
        const slug = buildCommunitySquadSlug({
            name: '  Alpha Spray & Ritmo  ',
            ownerUserId: '5f71c1a2-1b5e-46b0-8b29-112233445566',
        });

        expect(slug).toBe('alpha-spray-ritmo-5f71c1a2');
    });

    it('returns only allowlisted public squad identity fields for public squads', () => {
        const publicIdentity = buildCommunityPublicSquadIdentity({
            id: 'squad-1',
            name: 'Alpha Spray',
            slug: 'alpha-spray',
            description: '  Squad aberto para loops saudaveis.  ',
            visibility: 'public',
        });

        expect(publicIdentity).toEqual({
            id: 'squad-1',
            name: 'Alpha Spray',
            slug: 'alpha-spray',
            description: 'Squad aberto para loops saudaveis.',
        });
        expect(publicIdentity).not.toHaveProperty('activeGoal');
        expect(buildCommunityPublicSquadIdentity({
            id: 'squad-2',
            name: 'Private Squad',
            slug: 'private-squad',
            description: 'Privado',
            visibility: 'private',
        })).toBeNull();
    });

    it('builds a neutral zero-state shared goal when the squad has no eligible progress yet', () => {
        const snapshot = buildCommunitySquadGoalProgressSnapshot({
            squadId: 'squad-1',
            memberUserIds: ['user-1', 'user-2'],
            activeGoal: resolveDefaultCommunitySquadGoal({
                now: new Date('2026-04-22T12:00:00.000Z'),
            }),
            events: [],
        });

        expect(snapshot).toMatchObject({
            state: 'zero_state',
            currentCount: 0,
            remainingCount: 3,
            contributorCount: 0,
            headline: 'Objetivo do squad pronto para comecar',
            nextAction: {
                eventType: 'publish_post',
            },
        });
        expect(snapshot.summary.toLowerCase()).not.toContain('erro');
        expect(snapshot.summary.toLowerCase()).not.toContain('vazio');
    });

    it('aggregates only eligible member actions and ignores capped or unrelated activity', () => {
        const activeGoal = resolveDefaultCommunitySquadGoal({
            now: new Date('2026-04-22T12:00:00.000Z'),
            targetCount: 2,
            eligibleEventTypes: ['publish_post', 'comment_with_context'],
        });
        const snapshot = buildCommunitySquadGoalProgressSnapshot({
            squadId: 'squad-1',
            memberUserIds: ['user-1', 'user-2'],
            activeGoal,
            events: [
                createHistoryEvent({
                    idempotencyKey: 'publish-1',
                    eventType: 'publish_post',
                    actorUserId: 'user-1',
                    entityType: 'post',
                    entityId: 'post-1',
                    effectiveXp: 40,
                    occurredAt: new Date('2026-04-22T10:00:00.000Z'),
                    squadId: 'squad-1',
                }),
                createHistoryEvent({
                    idempotencyKey: 'publish-1',
                    eventType: 'publish_post',
                    actorUserId: 'user-1',
                    entityType: 'post',
                    entityId: 'post-1-duplicate',
                    effectiveXp: 40,
                    occurredAt: new Date('2026-04-22T10:05:00.000Z'),
                    squadId: 'squad-1',
                }),
                createHistoryEvent({
                    idempotencyKey: 'comment-1',
                    eventType: 'comment_with_context',
                    actorUserId: 'user-2',
                    entityType: 'comment',
                    entityId: 'comment-1',
                    effectiveXp: 20,
                    occurredAt: new Date('2026-04-22T11:00:00.000Z'),
                    squadId: 'squad-1',
                }),
                createHistoryEvent({
                    idempotencyKey: 'comment-2-zero-xp',
                    eventType: 'comment_with_context',
                    actorUserId: 'user-2',
                    entityType: 'comment',
                    entityId: 'comment-2',
                    effectiveXp: 0,
                    occurredAt: new Date('2026-04-22T11:10:00.000Z'),
                    squadId: 'squad-1',
                }),
                createHistoryEvent({
                    idempotencyKey: 'publish-other-squad',
                    eventType: 'publish_post',
                    actorUserId: 'user-1',
                    entityType: 'post',
                    entityId: 'post-2',
                    effectiveXp: 40,
                    occurredAt: new Date('2026-04-22T11:20:00.000Z'),
                    squadId: 'squad-2',
                }),
                createHistoryEvent({
                    idempotencyKey: 'publish-non-member',
                    eventType: 'publish_post',
                    actorUserId: 'user-3',
                    entityType: 'post',
                    entityId: 'post-3',
                    effectiveXp: 40,
                    occurredAt: new Date('2026-04-22T11:30:00.000Z'),
                    squadId: 'squad-1',
                }),
                createHistoryEvent({
                    idempotencyKey: 'follow-ignored',
                    eventType: 'follow_profile',
                    actorUserId: 'user-2',
                    entityType: 'follow',
                    entityId: 'follow-1',
                    effectiveXp: 10,
                    occurredAt: new Date('2026-04-22T11:40:00.000Z'),
                    squadId: 'squad-1',
                }),
            ],
        });

        expect(snapshot).toMatchObject({
            state: 'complete',
            currentCount: 2,
            remainingCount: 0,
            contributorCount: 2,
            contributingUserIds: ['user-1', 'user-2'],
            nextAction: null,
        });
        expect(snapshot.persistedGoal).toMatchObject({
            currentCount: 2,
            targetCount: 2,
        });
    });

    it('marks revoked, expired, accepted, and mismatched invites as unusable', () => {
        const now = new Date('2026-04-22T12:00:00.000Z');
        const baseInvite = createInvite({
            id: 'invite-1',
            squadId: 'squad-1',
            createdByUserId: 'owner-1',
            inviteCode: 'invite-code-1',
            invitedUserId: 'user-2',
            expiresAt: new Date('2026-04-24T12:00:00.000Z'),
        });

        expect(resolveCommunitySquadInviteValidity({
            invite: {
                ...baseInvite,
                status: 'revoked',
                revokedAt: now,
            },
            viewerUserId: 'user-2',
            now,
        })).toMatchObject({
            isUsable: false,
            reason: 'revoked',
        });

        expect(resolveCommunitySquadInviteValidity({
            invite: {
                ...baseInvite,
                status: 'accepted',
                acceptedAt: now,
            },
            viewerUserId: 'user-2',
            now,
        })).toMatchObject({
            isUsable: false,
            reason: 'accepted',
        });

        expect(resolveCommunitySquadInviteValidity({
            invite: {
                ...baseInvite,
                expiresAt: new Date('2026-04-20T12:00:00.000Z'),
            },
            viewerUserId: 'user-2',
            now,
        })).toMatchObject({
            isUsable: false,
            reason: 'expired',
        });

        expect(resolveCommunitySquadInviteValidity({
            invite: baseInvite,
            viewerUserId: 'user-9',
            now,
        })).toMatchObject({
            isUsable: false,
            reason: 'viewer_mismatch',
        });
    });
});
