import { describe, expect, it } from 'vitest';

const VALID_POST_STATUSES = ['draft', 'published', 'hidden', 'archived', 'deleted'] as const;
const VALID_POST_VISIBILITIES = ['public', 'unlisted', 'followers_only', 'premium_future'] as const;
const VALID_POST_TYPES = ['analysis_snapshot', 'setup_note', 'comparison'] as const;
const VALID_ENTITLEMENT_KEYS = [
    'community.post.create',
    'community.comment.create',
    'community.feed.following',
    'community.collections.private',
    'community.creator.analytics',
    'community.post.featured',
    'community.post.premium_access',
] as const;

async function loadCommunityModule() {
    return import('./community');
}

describe('community contracts', () => {
    it('locks the canonical community table names for upcoming schema work', async () => {
        const { COMMUNITY_TABLE_NAMES } = await loadCommunityModule();

        expect(COMMUNITY_TABLE_NAMES).toEqual({
            profiles: 'community_profiles',
            posts: 'community_posts',
            postAnalysisSnapshots: 'community_post_analysis_snapshots',
            postLikes: 'community_post_likes',
            postSaves: 'community_post_saves',
            postCopyEvents: 'community_post_copy_events',
            postComments: 'community_post_comments',
            follows: 'community_follows',
            reports: 'community_reports',
            moderationActions: 'community_moderation_actions',
            featureEntitlements: 'feature_entitlements',
            userEntitlements: 'user_entitlements',
        });
    });

    it('accepts only canonical post status values', async () => {
        const { communityPostStatusSchema, isCommunityPostStatus, parseCommunityPostStatus } = await loadCommunityModule();

        for (const value of VALID_POST_STATUSES) {
            expect(communityPostStatusSchema.safeParse(value).success).toBe(true);
            expect(isCommunityPostStatus(value)).toBe(true);
            expect(parseCommunityPostStatus(value)).toBe(value);
        }
    });

    it('rejects invalid post status values', async () => {
        const { communityPostStatusSchema, isCommunityPostStatus, parseCommunityPostStatus } = await loadCommunityModule();

        const result = communityPostStatusSchema.safeParse('reviewed');

        expect(result.success).toBe(false);
        expect(isCommunityPostStatus('reviewed')).toBe(false);
        expect(() => parseCommunityPostStatus('reviewed')).toThrow();
    });

    it('accepts only canonical post visibility values', async () => {
        const { communityPostVisibilitySchema, isCommunityPostVisibility, parseCommunityPostVisibility } = await loadCommunityModule();

        for (const value of VALID_POST_VISIBILITIES) {
            expect(communityPostVisibilitySchema.safeParse(value).success).toBe(true);
            expect(isCommunityPostVisibility(value)).toBe(true);
            expect(parseCommunityPostVisibility(value)).toBe(value);
        }
    });

    it('rejects invalid post visibility values', async () => {
        const { communityPostVisibilitySchema, isCommunityPostVisibility, parseCommunityPostVisibility } = await loadCommunityModule();

        const result = communityPostVisibilitySchema.safeParse('private');

        expect(result.success).toBe(false);
        expect(isCommunityPostVisibility('private')).toBe(false);
        expect(() => parseCommunityPostVisibility('private')).toThrow();
    });

    it('accepts only canonical post type values', async () => {
        const { communityPostTypeSchema, isCommunityPostType, parseCommunityPostType } = await loadCommunityModule();

        for (const value of VALID_POST_TYPES) {
            expect(communityPostTypeSchema.safeParse(value).success).toBe(true);
            expect(isCommunityPostType(value)).toBe(true);
            expect(parseCommunityPostType(value)).toBe(value);
        }
    });

    it('rejects invalid post type values', async () => {
        const { communityPostTypeSchema, isCommunityPostType, parseCommunityPostType } = await loadCommunityModule();

        const result = communityPostTypeSchema.safeParse('analysis_live');

        expect(result.success).toBe(false);
        expect(isCommunityPostType('analysis_live')).toBe(false);
        expect(() => parseCommunityPostType('analysis_live')).toThrow();
    });

    it('accepts only canonical entitlement keys', async () => {
        const { communityEntitlementKeySchema, isCommunityEntitlementKey, parseCommunityEntitlementKey } = await loadCommunityModule();

        for (const value of VALID_ENTITLEMENT_KEYS) {
            expect(communityEntitlementKeySchema.safeParse(value).success).toBe(true);
            expect(isCommunityEntitlementKey(value)).toBe(true);
            expect(parseCommunityEntitlementKey(value)).toBe(value);
        }
    });

    it('rejects invalid entitlement keys', async () => {
        const { communityEntitlementKeySchema, isCommunityEntitlementKey, parseCommunityEntitlementKey } = await loadCommunityModule();

        const result = communityEntitlementKeySchema.safeParse('community.post.delete');

        expect(result.success).toBe(false);
        expect(isCommunityEntitlementKey('community.post.delete')).toBe(false);
        expect(() => parseCommunityEntitlementKey('community.post.delete')).toThrow();
    });
});
