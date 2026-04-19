'use server';

import { and, eq } from 'drizzle-orm';

import { auth } from '@/auth';
import { db } from '@/db';
import { communityPostSaves, communityPosts } from '@/db/schema';

export interface SetCommunityPostSaveInput {
    readonly slug: string;
    readonly saved: boolean;
}

type SetCommunityPostSaveResult =
    | {
        readonly success: true;
        readonly postId: string;
        readonly saved: boolean;
    }
    | {
        readonly success: false;
        readonly error: string;
    };

export async function setCommunityPostSave(
    input: SetCommunityPostSaveInput,
): Promise<SetCommunityPostSaveResult> {
    const session = await auth();

    if (!session?.user?.id) {
        return {
            success: false,
            error: 'Nao autenticado.',
        };
    }

    const normalizedSlug = input.slug.trim();
    const [storedPost] = await db
        .select({
            id: communityPosts.id,
        })
        .from(communityPosts)
        .where(eq(communityPosts.slug, normalizedSlug))
        .limit(1);

    if (!storedPost) {
        return {
            success: false,
            error: 'Post nao encontrado.',
        };
    }

    if (input.saved) {
        await db
            .insert(communityPostSaves)
            .values({
                postId: storedPost.id,
                userId: session.user.id,
            })
            .onConflictDoNothing({
                target: [communityPostSaves.postId, communityPostSaves.userId],
            });
    } else {
        await db
            .delete(communityPostSaves)
            .where(
                and(
                    eq(communityPostSaves.postId, storedPost.id),
                    eq(communityPostSaves.userId, session.user.id),
                ),
            );
    }

    return {
        success: true,
        postId: storedPost.id,
        saved: input.saved,
    };
}
