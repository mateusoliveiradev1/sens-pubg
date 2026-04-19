import { describe, expect, it } from 'vitest';

import type { CommunityEntitlementKey, CommunityPostStatus } from '@/types/community';

async function loadCommunityAccessModule() {
    return import('./community-access');
}

async function loadCommunityEntitlementsModule() {
    return import('./community-entitlements');
}

function createPost(overrides: Partial<{
    authorId: string;
    status: CommunityPostStatus;
    requiredEntitlementKey: CommunityEntitlementKey | null;
}> = {}) {
    return {
        authorId: 'author-1',
        status: 'published' as CommunityPostStatus,
        requiredEntitlementKey: null,
        ...overrides,
    };
}

describe('community post access policy', () => {
    it('allows the author to read their own draft post', async () => {
        const { canReadCommunityPost, getCommunityPostReadAccess } = await loadCommunityAccessModule();

        const input = {
            post: createPost({ status: 'draft' }),
            viewer: { userId: 'author-1' },
        };

        expect(canReadCommunityPost(input)).toBe(true);
        expect(getCommunityPostReadAccess(input)).toMatchObject({
            canRead: true,
            isAuthor: true,
            reason: 'author_draft',
        });
    });

    it('denies draft posts to the public', async () => {
        const { canReadCommunityPost, getCommunityPostReadAccess } = await loadCommunityAccessModule();

        const input = {
            post: createPost({ status: 'draft' }),
            viewer: { userId: null },
        };

        expect(canReadCommunityPost(input)).toBe(false);
        expect(getCommunityPostReadAccess(input)).toMatchObject({
            canRead: false,
            isAuthor: false,
            reason: 'draft_restricted',
        });
    });

    it('allows published posts to the public', async () => {
        const { canReadCommunityPost, getCommunityPostReadAccess } = await loadCommunityAccessModule();

        const input = {
            post: createPost({ status: 'published' }),
            viewer: { userId: null },
        };

        expect(canReadCommunityPost(input)).toBe(true);
        expect(getCommunityPostReadAccess(input)).toMatchObject({
            canRead: true,
            isAuthor: false,
            reason: 'published',
        });
    });

    it('keeps hidden and archived posts visible only to the author', async () => {
        const { canReadCommunityPost, getCommunityPostReadAccess } = await loadCommunityAccessModule();

        const authorHiddenInput = {
            post: createPost({ status: 'hidden' }),
            viewer: { userId: 'author-1' },
        };
        const publicHiddenInput = {
            post: createPost({ status: 'hidden' }),
            viewer: { userId: null },
        };
        const authorArchivedInput = {
            post: createPost({ status: 'archived' }),
            viewer: { userId: 'author-1' },
        };
        const publicArchivedInput = {
            post: createPost({ status: 'archived' }),
            viewer: { userId: null },
        };

        expect(canReadCommunityPost(authorHiddenInput)).toBe(true);
        expect(canReadCommunityPost(publicHiddenInput)).toBe(false);
        expect(canReadCommunityPost(authorArchivedInput)).toBe(true);
        expect(canReadCommunityPost(publicArchivedInput)).toBe(false);

        expect(getCommunityPostReadAccess(authorHiddenInput)).toMatchObject({
            canRead: true,
            isAuthor: true,
            reason: 'author_hidden',
        });
        expect(getCommunityPostReadAccess(publicHiddenInput)).toMatchObject({
            canRead: false,
            isAuthor: false,
            reason: 'hidden_restricted',
        });
        expect(getCommunityPostReadAccess(authorArchivedInput)).toMatchObject({
            canRead: true,
            isAuthor: true,
            reason: 'author_archived',
        });
        expect(getCommunityPostReadAccess(publicArchivedInput)).toMatchObject({
            canRead: false,
            isAuthor: false,
            reason: 'archived_restricted',
        });
    });

    it('denies deleted posts to both public readers and the author', async () => {
        const { canReadCommunityPost, getCommunityPostReadAccess } = await loadCommunityAccessModule();

        const authorInput = {
            post: createPost({ status: 'deleted' }),
            viewer: { userId: 'author-1' },
        };
        const publicInput = {
            post: createPost({ status: 'deleted' }),
            viewer: { userId: null },
        };

        expect(canReadCommunityPost(authorInput)).toBe(false);
        expect(canReadCommunityPost(publicInput)).toBe(false);
        expect(getCommunityPostReadAccess(authorInput)).toMatchObject({
            canRead: false,
            isAuthor: true,
            reason: 'deleted_restricted',
        });
        expect(getCommunityPostReadAccess(publicInput)).toMatchObject({
            canRead: false,
            isAuthor: false,
            reason: 'deleted_restricted',
        });
    });

    it('surfaces an entitlement hook without enforcing premium access yet', async () => {
        const { getCommunityPostReadAccess } = await loadCommunityAccessModule();

        const result = getCommunityPostReadAccess({
            post: createPost({
                status: 'published',
                requiredEntitlementKey: 'community.post.premium_access',
            }),
            viewer: { userId: null },
        });

        expect(result).toMatchObject({
            canRead: true,
            reason: 'published',
            entitlement: {
                requiredEntitlementKey: 'community.post.premium_access',
                enforcement: 'inactive',
                futureAccess: 'denied',
            },
        });
    });

    it('keeps V1 posts accessible and marks entitlement preview as not required when the key is null', async () => {
        const { getCommunityPostReadAccess } = await loadCommunityAccessModule();

        const result = getCommunityPostReadAccess({
            post: createPost({
                status: 'published',
                requiredEntitlementKey: null,
            }),
            viewer: { userId: null },
        });

        expect(result).toMatchObject({
            canRead: true,
            reason: 'published',
            entitlement: {
                requiredEntitlementKey: null,
                enforcement: 'inactive',
                futureAccess: 'not_required',
            },
        });
    });

    it('keeps published posts readable while previewing future access as allowed for entitled viewers', async () => {
        const { getCommunityPostReadAccess } = await loadCommunityAccessModule();
        const { resolveCommunityEntitlements } = await loadCommunityEntitlementsModule();

        const entitlements = resolveCommunityEntitlements({
            userId: 'viewer-1',
            grants: [
                {
                    entitlementKey: 'community.post.premium_access',
                    source: 'subscription_future',
                },
            ],
        });

        const result = getCommunityPostReadAccess({
            post: createPost({
                status: 'published',
                requiredEntitlementKey: 'community.post.premium_access',
            }),
            viewer: { userId: 'viewer-1' },
            entitlements,
        });

        expect(result).toMatchObject({
            canRead: true,
            reason: 'published',
            entitlement: {
                requiredEntitlementKey: 'community.post.premium_access',
                enforcement: 'inactive',
                futureAccess: 'allowed',
            },
        });
    });
});
