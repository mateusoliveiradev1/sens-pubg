'use server';

import { eq } from 'drizzle-orm';

import { auth } from '@/auth';
import { db } from '@/db';
import {
    communityPostComments,
    communityPosts,
    communityProfiles,
    communityReports,
    type CommunityReportEntityType,
} from '@/db/schema';

export interface CreateCommunityReportInput {
    readonly entityType: CommunityReportEntityType;
    readonly entityId: string;
    readonly reasonKey: string;
    readonly details?: string | null;
}

type CreateCommunityReportResult =
    | {
        readonly success: true;
        readonly status: 'open';
    }
    | {
        readonly success: false;
        readonly error: string;
    };

async function resolveCommunityReportTarget(
    entityType: CommunityReportEntityType,
    entityId: string,
): Promise<boolean> {
    switch (entityType) {
        case 'post': {
            const [storedPost] = await db
                .select({
                    id: communityPosts.id,
                })
                .from(communityPosts)
                .where(eq(communityPosts.id, entityId))
                .limit(1);

            return Boolean(storedPost);
        }
        case 'comment': {
            const [storedComment] = await db
                .select({
                    id: communityPostComments.id,
                })
                .from(communityPostComments)
                .where(eq(communityPostComments.id, entityId))
                .limit(1);

            return Boolean(storedComment);
        }
        case 'profile': {
            const [storedProfile] = await db
                .select({
                    id: communityProfiles.id,
                })
                .from(communityProfiles)
                .where(eq(communityProfiles.id, entityId))
                .limit(1);

            return Boolean(storedProfile);
        }
        default:
            return false;
    }
}

export async function createCommunityReport(
    input: CreateCommunityReportInput,
): Promise<CreateCommunityReportResult> {
    const session = await auth();

    if (!session?.user?.id) {
        return {
            success: false,
            error: 'Nao autenticado.',
        };
    }

    const normalizedEntityId = input.entityId.trim();
    const normalizedReasonKey = input.reasonKey.trim();
    const normalizedDetails = input.details?.trim() || null;

    if (!normalizedEntityId || !normalizedReasonKey) {
        return {
            success: false,
            error: 'Report invalido.',
        };
    }

    const targetExists = await resolveCommunityReportTarget(input.entityType, normalizedEntityId);

    if (!targetExists) {
        return {
            success: false,
            error: 'Entidade nao encontrada.',
        };
    }

    await db.insert(communityReports).values({
        entityType: input.entityType,
        entityId: normalizedEntityId,
        reportedByUserId: session.user.id,
        reasonKey: normalizedReasonKey,
        details: normalizedDetails,
        status: 'open',
    });

    return {
        success: true,
        status: 'open',
    };
}
