import { getCommunityPostModerationState } from '@/core/community-moderation';
import type { CommunityEntitlementKey, CommunityPostStatus } from '@/types/community';

export interface CommunityAccessPost {
    readonly authorId: string;
    readonly status: CommunityPostStatus;
    readonly requiredEntitlementKey?: CommunityEntitlementKey | null;
}

export interface CommunityAccessViewer {
    readonly userId?: string | null;
}

export type CommunityPostReadAccessReason =
    | 'author_draft'
    | 'author_hidden'
    | 'author_archived'
    | 'published'
    | 'draft_restricted'
    | 'hidden_restricted'
    | 'archived_restricted'
    | 'deleted_restricted';

export interface CommunityPostEntitlementHook {
    readonly requiredEntitlementKey: CommunityEntitlementKey | null;
    readonly enforcement: 'inactive';
}

export interface CommunityPostReadAccess {
    readonly canRead: boolean;
    readonly isAuthor: boolean;
    readonly reason: CommunityPostReadAccessReason;
    readonly entitlement: CommunityPostEntitlementHook;
}

export interface GetCommunityPostReadAccessInput {
    readonly post: CommunityAccessPost;
    readonly viewer?: CommunityAccessViewer | null;
}

function isPostAuthor(post: CommunityAccessPost, viewer?: CommunityAccessViewer | null): boolean {
    const viewerUserId = viewer?.userId ?? null;

    return viewerUserId !== null && viewerUserId === post.authorId;
}

function createEntitlementHook(post: CommunityAccessPost): CommunityPostEntitlementHook {
    // W20-T02 only preserves the server-side hook. Enforcement stays inactive until W60.
    return {
        requiredEntitlementKey: post.requiredEntitlementKey ?? null,
        enforcement: 'inactive',
    };
}

export function getCommunityPostReadAccess(
    input: GetCommunityPostReadAccessInput,
): CommunityPostReadAccess {
    const { post, viewer } = input;
    const author = isPostAuthor(post, viewer);
    const entitlement = createEntitlementHook(post);
    const moderation = getCommunityPostModerationState(post.status);
    const authorCanRead = author && moderation.authorCanRead;

    switch (post.status) {
        case 'draft':
            return {
                canRead: authorCanRead,
                isAuthor: author,
                reason: authorCanRead ? 'author_draft' : 'draft_restricted',
                entitlement,
            };

        case 'published':
            return {
                canRead: moderation.publicCanRead,
                isAuthor: author,
                reason: 'published',
                entitlement,
            };

        case 'hidden':
            return {
                canRead: authorCanRead,
                isAuthor: author,
                reason: authorCanRead ? 'author_hidden' : 'hidden_restricted',
                entitlement,
            };

        case 'archived':
            return {
                canRead: authorCanRead,
                isAuthor: author,
                reason: authorCanRead ? 'author_archived' : 'archived_restricted',
                entitlement,
            };

        case 'deleted':
            return {
                canRead: authorCanRead,
                isAuthor: author,
                reason: 'deleted_restricted',
                entitlement,
            };
    }
}

export function canReadCommunityPost(input: GetCommunityPostReadAccessInput): boolean {
    return getCommunityPostReadAccess(input).canRead;
}
