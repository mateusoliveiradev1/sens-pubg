import { getCommunityPostModerationState } from '@/core/community-moderation';
import {
    hasCommunityEntitlement,
    resolveCommunityEntitlements,
    type CommunityEntitlementResolution,
} from '@/lib/community-entitlements';
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

export type CommunityPostEntitlementFutureAccess =
    | 'not_required'
    | 'allowed'
    | 'denied';

export interface CommunityPostEntitlementHook {
    readonly requiredEntitlementKey: CommunityEntitlementKey | null;
    readonly enforcement: 'inactive';
    readonly futureAccess: CommunityPostEntitlementFutureAccess;
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
    readonly entitlements?: CommunityEntitlementResolution | null;
}

function isPostAuthor(post: CommunityAccessPost, viewer?: CommunityAccessViewer | null): boolean {
    const viewerUserId = viewer?.userId ?? null;

    return viewerUserId !== null && viewerUserId === post.authorId;
}

function resolveAccessEntitlements(
    input: GetCommunityPostReadAccessInput,
): CommunityEntitlementResolution {
    return input.entitlements ?? resolveCommunityEntitlements({
        userId: input.viewer?.userId ?? null,
    });
}

function getCommunityPostEntitlementFutureAccess(
    requiredEntitlementKey: CommunityEntitlementKey | null,
    entitlements: CommunityEntitlementResolution,
): CommunityPostEntitlementFutureAccess {
    if (requiredEntitlementKey === null) {
        return 'not_required';
    }

    return hasCommunityEntitlement(entitlements, requiredEntitlementKey) ? 'allowed' : 'denied';
}

function createEntitlementHook(
    post: CommunityAccessPost,
    entitlements: CommunityEntitlementResolution,
): CommunityPostEntitlementHook {
    const requiredEntitlementKey = post.requiredEntitlementKey ?? null;

    // W60-T02 wires the policy to the resolver but keeps enforcement inactive.
    return {
        requiredEntitlementKey,
        enforcement: 'inactive',
        futureAccess: getCommunityPostEntitlementFutureAccess(
            requiredEntitlementKey,
            entitlements,
        ),
    };
}

export function getCommunityPostReadAccess(
    input: GetCommunityPostReadAccessInput,
): CommunityPostReadAccess {
    const { post, viewer } = input;
    const author = isPostAuthor(post, viewer);
    const entitlement = createEntitlementHook(post, resolveAccessEntitlements(input));
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
