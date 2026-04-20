'use server';

import { randomUUID } from 'node:crypto';

import { and, count, eq } from 'drizzle-orm';

import { auth } from '@/auth';
import {
    buildCommunitySquadGoalProgressSnapshot,
    buildCommunitySquadSlug,
    normalizeCommunitySquadMemberLimit,
    normalizeCommunitySquadName,
    resolveCommunitySquadInviteValidity,
    resolveDefaultCommunitySquadGoal,
} from '@/core/community-squads';
import { toCommunityProgressionHistoryEvent } from '@/core/community-progression';
import { db } from '@/db';
import {
    communityProgressionEvents,
    communitySquadInvites,
    communitySquadMemberships,
    communitySquads,
} from '@/db/schema';
import type { CommunitySquadGoalState } from '@/db/schema';
import type { CommunitySquadVisibility } from '@/types/community';

type CommunitySquadActionErrorResult = {
    readonly success: false;
    readonly error: string;
};

type CommunitySquadActionResult<TPayload> =
    | ({
        readonly success: true;
    } & TPayload)
    | CommunitySquadActionErrorResult;

export interface CreateCommunitySquadInput {
    readonly name: string;
    readonly description?: string | null;
    readonly visibility?: CommunitySquadVisibility;
    readonly memberLimit?: number | null;
}

export type CreateCommunitySquadResult = CommunitySquadActionResult<{
    readonly squadId: string;
    readonly slug: string;
    readonly visibility: CommunitySquadVisibility;
    readonly memberLimit: number;
    readonly activeGoal: CommunitySquadGoalState;
}>;

export interface CreateCommunitySquadInviteInput {
    readonly squadId: string;
    readonly invitedUserId?: string | null;
}

export type CreateCommunitySquadInviteResult = CommunitySquadActionResult<{
    readonly inviteId: string;
    readonly squadId: string;
    readonly inviteCode: string;
    readonly expiresAt: Date;
}>;

export interface AcceptCommunitySquadInviteInput {
    readonly inviteCode: string;
}

export type AcceptCommunitySquadInviteResult = CommunitySquadActionResult<{
    readonly squadId: string;
    readonly membershipVisibility: boolean;
    readonly activeGoal: CommunitySquadGoalState | null;
}>;

export interface LeaveCommunitySquadInput {
    readonly squadId: string;
}

export type LeaveCommunitySquadResult = CommunitySquadActionResult<{
    readonly squadId: string;
    readonly archivedSquad: boolean;
}>;

export interface SetCommunitySquadMembershipVisibilityInput {
    readonly squadId: string;
    readonly isPubliclyVisible: boolean;
}

export type SetCommunitySquadMembershipVisibilityResult = CommunitySquadActionResult<{
    readonly squadId: string;
    readonly isPubliclyVisible: boolean;
}>;

export interface RefreshCommunitySquadGoalStateInput {
    readonly squadId: string;
}

export type RefreshCommunitySquadGoalStateResult = CommunitySquadActionResult<{
    readonly squadId: string;
    readonly activeGoal: CommunitySquadGoalState | null;
    readonly headline: string;
    readonly summary: string;
    readonly currentCount: number;
    readonly targetCount: number;
    readonly state: 'zero_state' | 'in_progress' | 'complete';
}>;

interface StoredCommunitySquadRow {
    readonly id: string;
    readonly ownerUserId: string;
    readonly slug: string;
    readonly visibility: CommunitySquadVisibility;
    readonly status: typeof communitySquads.$inferSelect.status;
    readonly memberLimit: number;
    readonly activeGoal: CommunitySquadGoalState | null;
}

interface StoredCommunityMembershipRow {
    readonly squadId: string;
    readonly userId: string;
    readonly role: typeof communitySquadMemberships.$inferSelect.role;
    readonly status: typeof communitySquadMemberships.$inferSelect.status;
    readonly isPubliclyVisible: boolean;
}

interface StoredCommunityInviteRow {
    readonly id: string;
    readonly squadId: string;
    readonly createdByUserId: string;
    readonly invitedUserId: string | null;
    readonly acceptedByUserId: string | null;
    readonly status: typeof communitySquadInvites.$inferSelect.status;
    readonly expiresAt: Date;
    readonly acceptedAt: Date | null;
    readonly revokedAt: Date | null;
    readonly createdAt: Date;
    readonly updatedAt: Date;
    readonly inviteCode: string;
}

interface StoredCommunityGoalEventRow {
    readonly idempotencyKey: string;
    readonly eventType: typeof communityProgressionEvents.$inferSelect.eventType;
    readonly actorUserId: string;
    readonly beneficiaryUserId: string | null;
    readonly entityType: typeof communityProgressionEvents.$inferSelect.entityType;
    readonly entityId: string;
    readonly rawXp: number;
    readonly effectiveXp: number;
    readonly occurredAt: Date;
    readonly seasonId: string | null;
    readonly missionId: string | null;
    readonly squadId: string | null;
}

export async function createCommunitySquad(
    input: CreateCommunitySquadInput,
): Promise<CreateCommunitySquadResult> {
    const session = await auth();

    if (!session?.user?.id) {
        return {
            success: false,
            error: 'Nao autenticado.',
        };
    }

    let name: string;

    try {
        name = normalizeCommunitySquadName(input.name);
    } catch {
        return {
            success: false,
            error: 'Informe um nome valido para o squad.',
        };
    }

    const now = new Date();
    const visibility = input.visibility ?? 'private';
    const memberLimit = normalizeCommunitySquadMemberLimit(input.memberLimit);
    const activeGoal = resolveDefaultCommunitySquadGoal({
        now,
    });
    const [createdSquad] = await db
        .insert(communitySquads)
        .values({
            ownerUserId: session.user.id,
            slug: buildCommunitySquadSlug({
                name,
                ownerUserId: session.user.id,
            }),
            name,
            description: normalizeOptionalText(input.description),
            visibility,
            status: 'active',
            memberLimit,
            activeGoal,
            createdAt: now,
            updatedAt: now,
        })
        .returning({
            id: communitySquads.id,
            slug: communitySquads.slug,
            visibility: communitySquads.visibility,
            memberLimit: communitySquads.memberLimit,
            activeGoal: communitySquads.activeGoal,
        });

    await db
        .insert(communitySquadMemberships)
        .values({
            squadId: createdSquad!.id,
            userId: session.user.id,
            role: 'owner',
            status: 'active',
            isPubliclyVisible: true,
            joinedAt: now,
            updatedAt: now,
        });

    return {
        success: true,
        squadId: createdSquad!.id,
        slug: createdSquad!.slug,
        visibility: createdSquad!.visibility,
        memberLimit: createdSquad!.memberLimit,
        activeGoal: createdSquad!.activeGoal!,
    };
}

export async function createCommunitySquadInvite(
    input: CreateCommunitySquadInviteInput,
): Promise<CreateCommunitySquadInviteResult> {
    const session = await auth();

    if (!session?.user?.id) {
        return {
            success: false,
            error: 'Nao autenticado.',
        };
    }

    const squadId = input.squadId.trim();

    if (!squadId) {
        return {
            success: false,
            error: 'Squad invalido.',
        };
    }

    const [storedSquad] = await db
        .select({
            id: communitySquads.id,
            ownerUserId: communitySquads.ownerUserId,
            status: communitySquads.status,
        })
        .from(communitySquads)
        .where(eq(communitySquads.id, squadId))
        .limit(1);

    if (!storedSquad || storedSquad.status !== 'active') {
        return {
            success: false,
            error: 'Squad nao encontrado.',
        };
    }

    if (storedSquad.ownerUserId !== session.user.id) {
        return {
            success: false,
            error: 'Apenas o owner pode convidar novos membros.',
        };
    }

    const invitedUserId = normalizeOptionalText(input.invitedUserId);

    if (invitedUserId === session.user.id) {
        return {
            success: false,
            error: 'O owner ja faz parte do squad.',
        };
    }

    const now = new Date();
    const expiresAt = new Date(
        now.getTime() + 7 * 24 * 60 * 60 * 1000,
    );
    const inviteCode = randomUUID();
    const [createdInvite] = await db
        .insert(communitySquadInvites)
        .values({
            squadId,
            createdByUserId: session.user.id,
            invitedUserId,
            inviteCode,
            status: 'pending',
            expiresAt,
            createdAt: now,
            updatedAt: now,
        })
        .returning({
            id: communitySquadInvites.id,
            squadId: communitySquadInvites.squadId,
            inviteCode: communitySquadInvites.inviteCode,
            expiresAt: communitySquadInvites.expiresAt,
        });

    return {
        success: true,
        inviteId: createdInvite!.id,
        squadId: createdInvite!.squadId,
        inviteCode: createdInvite!.inviteCode,
        expiresAt: createdInvite!.expiresAt,
    };
}

export async function acceptCommunitySquadInvite(
    input: AcceptCommunitySquadInviteInput,
): Promise<AcceptCommunitySquadInviteResult> {
    const session = await auth();

    if (!session?.user?.id) {
        return {
            success: false,
            error: 'Nao autenticado.',
        };
    }

    const inviteCode = input.inviteCode.trim();

    if (!inviteCode) {
        return {
            success: false,
            error: 'Convite invalido.',
        };
    }

    const [storedInvite] = await db
        .select({
            id: communitySquadInvites.id,
            squadId: communitySquadInvites.squadId,
            createdByUserId: communitySquadInvites.createdByUserId,
            invitedUserId: communitySquadInvites.invitedUserId,
            acceptedByUserId: communitySquadInvites.acceptedByUserId,
            status: communitySquadInvites.status,
            expiresAt: communitySquadInvites.expiresAt,
            acceptedAt: communitySquadInvites.acceptedAt,
            revokedAt: communitySquadInvites.revokedAt,
            createdAt: communitySquadInvites.createdAt,
            updatedAt: communitySquadInvites.updatedAt,
            inviteCode: communitySquadInvites.inviteCode,
        })
        .from(communitySquadInvites)
        .where(eq(communitySquadInvites.inviteCode, inviteCode))
        .limit(1) as StoredCommunityInviteRow[];
    const inviteValidity = resolveCommunitySquadInviteValidity({
        invite: storedInvite ?? null,
        viewerUserId: session.user.id,
        now: new Date(),
    });

    if (!inviteValidity.isUsable) {
        return {
            success: false,
            error: inviteValidity.error,
        };
    }

    const [storedSquad] = await db
        .select({
            id: communitySquads.id,
            ownerUserId: communitySquads.ownerUserId,
            slug: communitySquads.slug,
            visibility: communitySquads.visibility,
            status: communitySquads.status,
            memberLimit: communitySquads.memberLimit,
            activeGoal: communitySquads.activeGoal,
        })
        .from(communitySquads)
        .where(eq(communitySquads.id, storedInvite!.squadId))
        .limit(1) as StoredCommunitySquadRow[];

    if (!storedSquad || storedSquad.status !== 'active') {
        return {
            success: false,
            error: 'Squad nao encontrado.',
        };
    }

    const [existingMembership] = await db
        .select({
            squadId: communitySquadMemberships.squadId,
            userId: communitySquadMemberships.userId,
            role: communitySquadMemberships.role,
            status: communitySquadMemberships.status,
            isPubliclyVisible: communitySquadMemberships.isPubliclyVisible,
        })
        .from(communitySquadMemberships)
        .where(
            and(
                eq(communitySquadMemberships.squadId, storedSquad.id),
                eq(communitySquadMemberships.userId, session.user.id),
            ),
        )
        .limit(1) as StoredCommunityMembershipRow[];

    if (existingMembership?.status !== 'active') {
        const activeMemberCount = await getActiveCommunitySquadMemberCount(storedSquad.id);

        if (activeMemberCount >= storedSquad.memberLimit) {
            return {
                success: false,
                error: 'Squad cheio. Aguarde uma vaga ou solicite outro convite.',
            };
        }
    }

    const now = new Date();

    if (existingMembership) {
        await db
            .update(communitySquadMemberships)
            .set({
                role: existingMembership.role === 'owner' ? 'owner' : 'member',
                status: 'active',
                isPubliclyVisible: existingMembership.isPubliclyVisible,
                leftAt: null,
                updatedAt: now,
            })
            .where(
                and(
                    eq(communitySquadMemberships.squadId, storedSquad.id),
                    eq(communitySquadMemberships.userId, session.user.id),
                ),
            );
    } else {
        await db
            .insert(communitySquadMemberships)
            .values({
                squadId: storedSquad.id,
                userId: session.user.id,
                role: 'member',
                status: 'active',
                isPubliclyVisible: true,
                joinedAt: now,
                updatedAt: now,
            });
    }

    await db
        .update(communitySquadInvites)
        .set({
            status: 'accepted',
            acceptedByUserId: session.user.id,
            acceptedAt: now,
            updatedAt: now,
        })
        .where(eq(communitySquadInvites.id, storedInvite!.id));

    return {
        success: true,
        squadId: storedSquad.id,
        membershipVisibility: existingMembership?.isPubliclyVisible ?? true,
        activeGoal: storedSquad.activeGoal,
    };
}

export async function leaveCommunitySquad(
    input: LeaveCommunitySquadInput,
): Promise<LeaveCommunitySquadResult> {
    const session = await auth();

    if (!session?.user?.id) {
        return {
            success: false,
            error: 'Nao autenticado.',
        };
    }

    const squadId = input.squadId.trim();

    if (!squadId) {
        return {
            success: false,
            error: 'Squad invalido.',
        };
    }

    const [storedMembership] = await db
        .select({
            squadId: communitySquadMemberships.squadId,
            userId: communitySquadMemberships.userId,
            role: communitySquadMemberships.role,
            status: communitySquadMemberships.status,
            isPubliclyVisible: communitySquadMemberships.isPubliclyVisible,
        })
        .from(communitySquadMemberships)
        .where(
            and(
                eq(communitySquadMemberships.squadId, squadId),
                eq(communitySquadMemberships.userId, session.user.id),
            ),
        )
        .limit(1) as StoredCommunityMembershipRow[];

    if (!storedMembership || storedMembership.status !== 'active') {
        return {
            success: false,
            error: 'Voce nao faz parte deste squad.',
        };
    }

    const now = new Date();
    const activeMemberCount = await getActiveCommunitySquadMemberCount(squadId);

    if (storedMembership.role === 'owner' && activeMemberCount > 1) {
        return {
            success: false,
            error: 'Transfira a ownership antes de sair de um squad com outros membros.',
        };
    }

    await db
        .update(communitySquadMemberships)
        .set({
            status: 'left',
            leftAt: now,
            updatedAt: now,
        })
        .where(
            and(
                eq(communitySquadMemberships.squadId, squadId),
                eq(communitySquadMemberships.userId, session.user.id),
            ),
        );

    const archivedSquad = storedMembership.role === 'owner' && activeMemberCount <= 1;

    if (archivedSquad) {
        await db
            .update(communitySquads)
            .set({
                status: 'archived',
                updatedAt: now,
            })
            .where(eq(communitySquads.id, squadId));
    }

    return {
        success: true,
        squadId,
        archivedSquad,
    };
}

export async function setCommunitySquadMembershipVisibility(
    input: SetCommunitySquadMembershipVisibilityInput,
): Promise<SetCommunitySquadMembershipVisibilityResult> {
    const session = await auth();

    if (!session?.user?.id) {
        return {
            success: false,
            error: 'Nao autenticado.',
        };
    }

    const squadId = input.squadId.trim();

    if (!squadId) {
        return {
            success: false,
            error: 'Squad invalido.',
        };
    }

    const [storedMembership] = await db
        .select({
            squadId: communitySquadMemberships.squadId,
            userId: communitySquadMemberships.userId,
            role: communitySquadMemberships.role,
            status: communitySquadMemberships.status,
            isPubliclyVisible: communitySquadMemberships.isPubliclyVisible,
        })
        .from(communitySquadMemberships)
        .where(
            and(
                eq(communitySquadMemberships.squadId, squadId),
                eq(communitySquadMemberships.userId, session.user.id),
            ),
        )
        .limit(1) as StoredCommunityMembershipRow[];

    if (!storedMembership || storedMembership.status !== 'active') {
        return {
            success: false,
            error: 'Voce nao faz parte deste squad.',
        };
    }

    await db
        .update(communitySquadMemberships)
        .set({
            isPubliclyVisible: input.isPubliclyVisible,
            updatedAt: new Date(),
        })
        .where(
            and(
                eq(communitySquadMemberships.squadId, squadId),
                eq(communitySquadMemberships.userId, session.user.id),
            ),
        );

    return {
        success: true,
        squadId,
        isPubliclyVisible: input.isPubliclyVisible,
    };
}

export async function refreshCommunitySquadGoalState(
    input: RefreshCommunitySquadGoalStateInput,
): Promise<RefreshCommunitySquadGoalStateResult> {
    const session = await auth();

    if (!session?.user?.id) {
        return {
            success: false,
            error: 'Nao autenticado.',
        };
    }

    const squadId = input.squadId.trim();

    if (!squadId) {
        return {
            success: false,
            error: 'Squad invalido.',
        };
    }

    const [storedMembership] = await db
        .select({
            squadId: communitySquadMemberships.squadId,
            userId: communitySquadMemberships.userId,
            role: communitySquadMemberships.role,
            status: communitySquadMemberships.status,
            isPubliclyVisible: communitySquadMemberships.isPubliclyVisible,
        })
        .from(communitySquadMemberships)
        .where(
            and(
                eq(communitySquadMemberships.squadId, squadId),
                eq(communitySquadMemberships.userId, session.user.id),
            ),
        )
        .limit(1) as StoredCommunityMembershipRow[];

    if (!storedMembership || storedMembership.status !== 'active') {
        return {
            success: false,
            error: 'Voce nao faz parte deste squad.',
        };
    }

    const [storedSquad] = await db
        .select({
            id: communitySquads.id,
            ownerUserId: communitySquads.ownerUserId,
            slug: communitySquads.slug,
            visibility: communitySquads.visibility,
            status: communitySquads.status,
            memberLimit: communitySquads.memberLimit,
            activeGoal: communitySquads.activeGoal,
        })
        .from(communitySquads)
        .where(eq(communitySquads.id, squadId))
        .limit(1) as StoredCommunitySquadRow[];

    if (!storedSquad || storedSquad.status !== 'active') {
        return {
            success: false,
            error: 'Squad nao encontrado.',
        };
    }

    const activeMemberships = await db
        .select({
            squadId: communitySquadMemberships.squadId,
            userId: communitySquadMemberships.userId,
            role: communitySquadMemberships.role,
            status: communitySquadMemberships.status,
            isPubliclyVisible: communitySquadMemberships.isPubliclyVisible,
        })
        .from(communitySquadMemberships)
        .where(
            and(
                eq(communitySquadMemberships.squadId, squadId),
                eq(communitySquadMemberships.status, 'active'),
            ),
        ) as StoredCommunityMembershipRow[];
    const storedGoalEvents = await db
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
        .where(eq(communityProgressionEvents.squadId, squadId)) as StoredCommunityGoalEventRow[];
    const goalSnapshot = buildCommunitySquadGoalProgressSnapshot({
        squadId,
        memberUserIds: activeMemberships.map((membership) => membership.userId),
        activeGoal: storedSquad.activeGoal,
        events: storedGoalEvents.map((event) => toCommunityProgressionHistoryEvent(event)),
    });

    await db
        .update(communitySquads)
        .set({
            activeGoal: goalSnapshot.persistedGoal,
            updatedAt: new Date(),
        })
        .where(eq(communitySquads.id, squadId));

    return {
        success: true,
        squadId,
        activeGoal: goalSnapshot.persistedGoal,
        headline: goalSnapshot.headline,
        summary: goalSnapshot.summary,
        currentCount: goalSnapshot.currentCount,
        targetCount: goalSnapshot.targetCount,
        state: goalSnapshot.state,
    };
}

async function getActiveCommunitySquadMemberCount(
    squadId: string,
): Promise<number> {
    const [countRow] = await db
        .select({
            count: count(),
        })
        .from(communitySquadMemberships)
        .where(
            and(
                eq(communitySquadMemberships.squadId, squadId),
                eq(communitySquadMemberships.status, 'active'),
            ),
        )
        .limit(1);

    return Number(countRow?.count ?? 0);
}

function normalizeOptionalText(value?: string | null): string | null {
    const normalizedValue = value?.trim();

    return normalizedValue ? normalizedValue : null;
}
