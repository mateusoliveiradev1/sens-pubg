'use server';

import { and, eq } from 'drizzle-orm';

import { auth } from '@/auth';
import { db } from '@/db';
import {
    communityRewardRecords,
    communitySquads,
} from '@/db/schema';
import type { CommunityRewardDisplayState } from '@/types/community';

type CommunityRewardActionResult<TPayload> =
    | ({
        readonly success: true;
    } & TPayload)
    | {
        readonly success: false;
        readonly error: string;
    };

export interface SetCommunityRewardDisplayStateInput {
    readonly rewardId: string;
    readonly displayState: CommunityRewardDisplayState;
}

export type SetCommunityRewardDisplayStateResult = CommunityRewardActionResult<{
    readonly rewardId: string;
    readonly displayState: CommunityRewardDisplayState;
}>;

interface StoredCommunityRewardRow {
    readonly id: string;
    readonly ownerType: typeof communityRewardRecords.$inferSelect.ownerType;
    readonly rewardKind: typeof communityRewardRecords.$inferSelect.rewardKind;
    readonly status: typeof communityRewardRecords.$inferSelect.status;
    readonly displayState: typeof communityRewardRecords.$inferSelect.displayState;
    readonly isPublicSafe: boolean;
    readonly userId: string | null;
    readonly squadId: string | null;
}

export async function setCommunityRewardDisplayState(
    input: SetCommunityRewardDisplayStateInput,
): Promise<SetCommunityRewardDisplayStateResult> {
    const session = await auth();

    if (!session?.user?.id) {
        return {
            success: false,
            error: 'Nao autenticado.',
        };
    }

    const rewardId = input.rewardId.trim();

    if (!rewardId) {
        return {
            success: false,
            error: 'Reward invalido.',
        };
    }

    const [storedReward] = await db
        .select({
            id: communityRewardRecords.id,
            ownerType: communityRewardRecords.ownerType,
            rewardKind: communityRewardRecords.rewardKind,
            status: communityRewardRecords.status,
            displayState: communityRewardRecords.displayState,
            isPublicSafe: communityRewardRecords.isPublicSafe,
            userId: communityRewardRecords.userId,
            squadId: communityRewardRecords.squadId,
        })
        .from(communityRewardRecords)
        .where(eq(communityRewardRecords.id, rewardId))
        .limit(1) as StoredCommunityRewardRow[];

    if (!storedReward) {
        return {
            success: false,
            error: 'Reward nao encontrado.',
        };
    }

    if (storedReward.status !== 'earned' || !storedReward.isPublicSafe) {
        return {
            success: false,
            error: 'Este reward nao pode ser exibido publicamente.',
        };
    }

    if (storedReward.ownerType === 'user') {
        if (storedReward.userId !== session.user.id) {
            return {
                success: false,
                error: 'Voce nao pode alterar rewards de outro operador.',
            };
        }
    } else {
        const [storedSquad] = await db
            .select({
                ownerUserId: communitySquads.ownerUserId,
            })
            .from(communitySquads)
            .where(eq(communitySquads.id, storedReward.squadId!))
            .limit(1);

        if (!storedSquad || storedSquad.ownerUserId !== session.user.id) {
            return {
                success: false,
                error: 'Apenas o owner do squad pode alterar este reward.',
            };
        }
    }

    if (input.displayState === 'equipped') {
        await db
            .update(communityRewardRecords)
            .set({
                displayState: 'visible',
            })
            .where(
                and(
                    eq(communityRewardRecords.ownerType, storedReward.ownerType),
                    eq(communityRewardRecords.rewardKind, storedReward.rewardKind),
                    storedReward.ownerType === 'user'
                        ? eq(communityRewardRecords.userId, storedReward.userId!)
                        : eq(communityRewardRecords.squadId, storedReward.squadId!),
                    eq(communityRewardRecords.displayState, 'equipped'),
                ),
            );
    }

    await db
        .update(communityRewardRecords)
        .set({
            displayState: input.displayState,
        })
        .where(eq(communityRewardRecords.id, rewardId));

    return {
        success: true,
        rewardId,
        displayState: input.displayState,
    };
}
