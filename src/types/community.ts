import { z } from 'zod';

export const COMMUNITY_TABLE_NAMES = {
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
} as const;

export type CommunityTableName = (typeof COMMUNITY_TABLE_NAMES)[keyof typeof COMMUNITY_TABLE_NAMES];

function createCommunityEnumContract<const TValues extends readonly [string, ...string[]]>(values: TValues) {
    const schema = z.enum(values);
    const valueSet = new Set<string>(values);

    return {
        values,
        schema,
        isValue(value: string): value is TValues[number] {
            return valueSet.has(value);
        },
        parse(value: string): TValues[number] {
            return schema.parse(value);
        },
    };
}

const postStatusContract = createCommunityEnumContract([
    'draft',
    'published',
    'hidden',
    'archived',
    'deleted',
]);

export const communityPostStatusValues = postStatusContract.values;
export const communityPostStatusSchema = postStatusContract.schema;
export type CommunityPostStatus = z.infer<typeof communityPostStatusSchema>;
export const isCommunityPostStatus = postStatusContract.isValue;
export const parseCommunityPostStatus = postStatusContract.parse;

const postVisibilityContract = createCommunityEnumContract([
    'public',
    'unlisted',
    'followers_only',
    'premium_future',
]);

export const communityPostVisibilityValues = postVisibilityContract.values;
export const communityPostVisibilitySchema = postVisibilityContract.schema;
export type CommunityPostVisibility = z.infer<typeof communityPostVisibilitySchema>;
export const isCommunityPostVisibility = postVisibilityContract.isValue;
export const parseCommunityPostVisibility = postVisibilityContract.parse;

const postTypeContract = createCommunityEnumContract([
    'analysis_snapshot',
    'setup_note',
    'comparison',
]);

export const communityPostTypeValues = postTypeContract.values;
export const communityPostTypeSchema = postTypeContract.schema;
export type CommunityPostType = z.infer<typeof communityPostTypeSchema>;
export const isCommunityPostType = postTypeContract.isValue;
export const parseCommunityPostType = postTypeContract.parse;

const entitlementKeyContract = createCommunityEnumContract([
    'community.post.create',
    'community.comment.create',
    'community.feed.following',
    'community.collections.private',
    'community.creator.analytics',
    'community.post.featured',
    'community.post.premium_access',
]);

export const communityEntitlementKeyValues = entitlementKeyContract.values;
export const communityEntitlementKeySchema = entitlementKeyContract.schema;
export type CommunityEntitlementKey = z.infer<typeof communityEntitlementKeySchema>;
export const isCommunityEntitlementKey = entitlementKeyContract.isValue;
export const parseCommunityEntitlementKey = entitlementKeyContract.parse;
