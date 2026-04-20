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
    seasons: 'community_seasons',
    progressionEvents: 'community_progression_events',
    userProgressionAggregates: 'community_user_progression_aggregates',
    missions: 'community_missions',
    squads: 'community_squads',
    squadMemberships: 'community_squad_memberships',
    squadInvites: 'community_squad_invites',
    rewardRecords: 'community_reward_records',
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

const seasonStatusContract = createCommunityEnumContract([
    'draft',
    'active',
    'completed',
    'archived',
]);

export const communitySeasonStatusValues = seasonStatusContract.values;
export const communitySeasonStatusSchema = seasonStatusContract.schema;
export type CommunitySeasonStatus = z.infer<typeof communitySeasonStatusSchema>;
export const isCommunitySeasonStatus = seasonStatusContract.isValue;
export const parseCommunitySeasonStatus = seasonStatusContract.parse;

const progressionAggregateScopeContract = createCommunityEnumContract([
    'evergreen',
    'season',
]);

export const communityProgressionAggregateScopeValues =
    progressionAggregateScopeContract.values;
export const communityProgressionAggregateScopeSchema =
    progressionAggregateScopeContract.schema;
export type CommunityProgressionAggregateScope = z.infer<
    typeof communityProgressionAggregateScopeSchema
>;
export const isCommunityProgressionAggregateScope =
    progressionAggregateScopeContract.isValue;
export const parseCommunityProgressionAggregateScope =
    progressionAggregateScopeContract.parse;

const progressionStreakStateContract = createCommunityEnumContract([
    'inactive',
    'active',
    'at_risk',
    'reentry',
]);

export const communityProgressionStreakStateValues =
    progressionStreakStateContract.values;
export const communityProgressionStreakStateSchema =
    progressionStreakStateContract.schema;
export type CommunityProgressionStreakState = z.infer<
    typeof communityProgressionStreakStateSchema
>;
export const isCommunityProgressionStreakState =
    progressionStreakStateContract.isValue;
export const parseCommunityProgressionStreakState =
    progressionStreakStateContract.parse;

const progressionEventTypeContract = createCommunityEnumContract([
    'publish_post',
    'complete_public_profile',
    'follow_profile',
    'receive_unique_save',
    'receive_unique_copy',
    'comment_with_context',
    'weekly_challenge_complete',
    'mission_complete',
    'squad_goal_contribution',
    'streak_participation',
]);

export const communityProgressionEventTypeValues =
    progressionEventTypeContract.values;
export const communityProgressionEventTypeSchema =
    progressionEventTypeContract.schema;
export type CommunityProgressionEventType = z.infer<
    typeof communityProgressionEventTypeSchema
>;
export const isCommunityProgressionEventType =
    progressionEventTypeContract.isValue;
export const parseCommunityProgressionEventType =
    progressionEventTypeContract.parse;

const progressionEntityTypeContract = createCommunityEnumContract([
    'post',
    'comment',
    'profile',
    'follow',
    'season',
    'mission',
    'squad',
    'system',
]);

export const communityProgressionEntityTypeValues =
    progressionEntityTypeContract.values;
export const communityProgressionEntityTypeSchema =
    progressionEntityTypeContract.schema;
export type CommunityProgressionEntityType = z.infer<
    typeof communityProgressionEntityTypeSchema
>;
export const isCommunityProgressionEntityType =
    progressionEntityTypeContract.isValue;
export const parseCommunityProgressionEntityType =
    progressionEntityTypeContract.parse;

const missionStatusContract = createCommunityEnumContract([
    'draft',
    'active',
    'paused',
    'archived',
]);

export const communityMissionStatusValues = missionStatusContract.values;
export const communityMissionStatusSchema = missionStatusContract.schema;
export type CommunityMissionStatus = z.infer<typeof communityMissionStatusSchema>;
export const isCommunityMissionStatus = missionStatusContract.isValue;
export const parseCommunityMissionStatus = missionStatusContract.parse;

const missionTypeContract = createCommunityEnumContract([
    'onboarding',
    'weekly_challenge',
    'seasonal_goal',
    'squad_goal',
]);

export const communityMissionTypeValues = missionTypeContract.values;
export const communityMissionTypeSchema = missionTypeContract.schema;
export type CommunityMissionType = z.infer<typeof communityMissionTypeSchema>;
export const isCommunityMissionType = missionTypeContract.isValue;
export const parseCommunityMissionType = missionTypeContract.parse;

const missionCadenceContract = createCommunityEnumContract([
    'one_time',
    'weekly',
    'seasonal',
]);

export const communityMissionCadenceValues = missionCadenceContract.values;
export const communityMissionCadenceSchema = missionCadenceContract.schema;
export type CommunityMissionCadence = z.infer<typeof communityMissionCadenceSchema>;
export const isCommunityMissionCadence = missionCadenceContract.isValue;
export const parseCommunityMissionCadence = missionCadenceContract.parse;

const squadVisibilityContract = createCommunityEnumContract([
    'private',
    'public',
]);

export const communitySquadVisibilityValues = squadVisibilityContract.values;
export const communitySquadVisibilitySchema = squadVisibilityContract.schema;
export type CommunitySquadVisibility = z.infer<
    typeof communitySquadVisibilitySchema
>;
export const isCommunitySquadVisibility = squadVisibilityContract.isValue;
export const parseCommunitySquadVisibility = squadVisibilityContract.parse;

const squadStatusContract = createCommunityEnumContract([
    'active',
    'archived',
]);

export const communitySquadStatusValues = squadStatusContract.values;
export const communitySquadStatusSchema = squadStatusContract.schema;
export type CommunitySquadStatus = z.infer<typeof communitySquadStatusSchema>;
export const isCommunitySquadStatus = squadStatusContract.isValue;
export const parseCommunitySquadStatus = squadStatusContract.parse;

const squadRoleContract = createCommunityEnumContract([
    'owner',
    'member',
]);

export const communitySquadRoleValues = squadRoleContract.values;
export const communitySquadRoleSchema = squadRoleContract.schema;
export type CommunitySquadRole = z.infer<typeof communitySquadRoleSchema>;
export const isCommunitySquadRole = squadRoleContract.isValue;
export const parseCommunitySquadRole = squadRoleContract.parse;

const squadMembershipStatusContract = createCommunityEnumContract([
    'active',
    'left',
    'removed',
]);

export const communitySquadMembershipStatusValues =
    squadMembershipStatusContract.values;
export const communitySquadMembershipStatusSchema =
    squadMembershipStatusContract.schema;
export type CommunitySquadMembershipStatus = z.infer<
    typeof communitySquadMembershipStatusSchema
>;
export const isCommunitySquadMembershipStatus =
    squadMembershipStatusContract.isValue;
export const parseCommunitySquadMembershipStatus =
    squadMembershipStatusContract.parse;

const squadInviteStatusContract = createCommunityEnumContract([
    'pending',
    'accepted',
    'revoked',
    'expired',
]);

export const communitySquadInviteStatusValues =
    squadInviteStatusContract.values;
export const communitySquadInviteStatusSchema =
    squadInviteStatusContract.schema;
export type CommunitySquadInviteStatus = z.infer<
    typeof communitySquadInviteStatusSchema
>;
export const isCommunitySquadInviteStatus =
    squadInviteStatusContract.isValue;
export const parseCommunitySquadInviteStatus =
    squadInviteStatusContract.parse;

const rewardKindContract = createCommunityEnumContract([
    'badge',
    'title',
    'season_mark',
    'squad_mark',
]);

export const communityRewardKindValues = rewardKindContract.values;
export const communityRewardKindSchema = rewardKindContract.schema;
export type CommunityRewardKind = z.infer<typeof communityRewardKindSchema>;
export const isCommunityRewardKind = rewardKindContract.isValue;
export const parseCommunityRewardKind = rewardKindContract.parse;

const rewardOwnerTypeContract = createCommunityEnumContract([
    'user',
    'squad',
]);

export const communityRewardOwnerTypeValues = rewardOwnerTypeContract.values;
export const communityRewardOwnerTypeSchema = rewardOwnerTypeContract.schema;
export type CommunityRewardOwnerType = z.infer<
    typeof communityRewardOwnerTypeSchema
>;
export const isCommunityRewardOwnerType = rewardOwnerTypeContract.isValue;
export const parseCommunityRewardOwnerType = rewardOwnerTypeContract.parse;

const rewardStatusContract = createCommunityEnumContract([
    'earned',
    'revoked',
    'expired',
]);

export const communityRewardStatusValues = rewardStatusContract.values;
export const communityRewardStatusSchema = rewardStatusContract.schema;
export type CommunityRewardStatus = z.infer<typeof communityRewardStatusSchema>;
export const isCommunityRewardStatus = rewardStatusContract.isValue;
export const parseCommunityRewardStatus = rewardStatusContract.parse;

const rewardDisplayStateContract = createCommunityEnumContract([
    'hidden',
    'visible',
    'equipped',
]);

export const communityRewardDisplayStateValues =
    rewardDisplayStateContract.values;
export const communityRewardDisplayStateSchema =
    rewardDisplayStateContract.schema;
export type CommunityRewardDisplayState = z.infer<
    typeof communityRewardDisplayStateSchema
>;
export const isCommunityRewardDisplayState =
    rewardDisplayStateContract.isValue;
export const parseCommunityRewardDisplayState =
    rewardDisplayStateContract.parse;
