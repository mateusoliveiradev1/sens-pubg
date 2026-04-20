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
const VALID_SEASON_STATUSES = ['draft', 'active', 'completed', 'archived'] as const;
const VALID_PROGRESSION_AGGREGATE_SCOPES = ['evergreen', 'season'] as const;
const VALID_PROGRESSION_STREAK_STATES = ['inactive', 'active', 'at_risk', 'reentry'] as const;
const VALID_PROGRESSION_EVENT_TYPES = [
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
] as const;
const VALID_PROGRESSION_ENTITY_TYPES = [
    'post',
    'comment',
    'profile',
    'follow',
    'season',
    'mission',
    'squad',
    'system',
] as const;
const VALID_MISSION_STATUSES = ['draft', 'active', 'paused', 'archived'] as const;
const VALID_MISSION_TYPES = ['onboarding', 'weekly_challenge', 'seasonal_goal', 'squad_goal'] as const;
const VALID_MISSION_CADENCES = ['one_time', 'weekly', 'seasonal'] as const;
const VALID_SQUAD_VISIBILITIES = ['private', 'public'] as const;
const VALID_SQUAD_STATUSES = ['active', 'archived'] as const;
const VALID_SQUAD_ROLES = ['owner', 'member'] as const;
const VALID_SQUAD_MEMBERSHIP_STATUSES = ['active', 'left', 'removed'] as const;
const VALID_SQUAD_INVITE_STATUSES = ['pending', 'accepted', 'revoked', 'expired'] as const;
const VALID_REWARD_KINDS = ['badge', 'title', 'season_mark', 'squad_mark'] as const;
const VALID_REWARD_OWNER_TYPES = ['user', 'squad'] as const;
const VALID_REWARD_STATUSES = ['earned', 'revoked', 'expired'] as const;
const VALID_REWARD_DISPLAY_STATES = ['hidden', 'visible', 'equipped'] as const;

async function loadCommunityModule() {
    return import('./community');
}

type EnumCase = {
    readonly schemaKey: string;
    readonly guardKey: string;
    readonly parseKey: string;
    readonly validValues: readonly string[];
    readonly invalidValue: string;
};

function assertEnumContract(module: Record<string, unknown>, testCase: EnumCase) {
    const schema = module[testCase.schemaKey] as {
        safeParse: (value: string) => { success: boolean };
    };
    const guard = module[testCase.guardKey] as (value: string) => boolean;
    const parse = module[testCase.parseKey] as (value: string) => string;

    for (const value of testCase.validValues) {
        expect(schema.safeParse(value).success).toBe(true);
        expect(guard(value)).toBe(true);
        expect(parse(value)).toBe(value);
    }

    expect(schema.safeParse(testCase.invalidValue).success).toBe(false);
    expect(guard(testCase.invalidValue)).toBe(false);
    expect(() => parse(testCase.invalidValue)).toThrow();
}

const ENUM_CASES: readonly EnumCase[] = [
    {
        schemaKey: 'communityPostStatusSchema',
        guardKey: 'isCommunityPostStatus',
        parseKey: 'parseCommunityPostStatus',
        validValues: VALID_POST_STATUSES,
        invalidValue: 'reviewed',
    },
    {
        schemaKey: 'communityPostVisibilitySchema',
        guardKey: 'isCommunityPostVisibility',
        parseKey: 'parseCommunityPostVisibility',
        validValues: VALID_POST_VISIBILITIES,
        invalidValue: 'private',
    },
    {
        schemaKey: 'communityPostTypeSchema',
        guardKey: 'isCommunityPostType',
        parseKey: 'parseCommunityPostType',
        validValues: VALID_POST_TYPES,
        invalidValue: 'analysis_live',
    },
    {
        schemaKey: 'communityEntitlementKeySchema',
        guardKey: 'isCommunityEntitlementKey',
        parseKey: 'parseCommunityEntitlementKey',
        validValues: VALID_ENTITLEMENT_KEYS,
        invalidValue: 'community.post.delete',
    },
    {
        schemaKey: 'communitySeasonStatusSchema',
        guardKey: 'isCommunitySeasonStatus',
        parseKey: 'parseCommunitySeasonStatus',
        validValues: VALID_SEASON_STATUSES,
        invalidValue: 'scheduled',
    },
    {
        schemaKey: 'communityProgressionAggregateScopeSchema',
        guardKey: 'isCommunityProgressionAggregateScope',
        parseKey: 'parseCommunityProgressionAggregateScope',
        validValues: VALID_PROGRESSION_AGGREGATE_SCOPES,
        invalidValue: 'lifetime',
    },
    {
        schemaKey: 'communityProgressionStreakStateSchema',
        guardKey: 'isCommunityProgressionStreakState',
        parseKey: 'parseCommunityProgressionStreakState',
        validValues: VALID_PROGRESSION_STREAK_STATES,
        invalidValue: 'broken',
    },
    {
        schemaKey: 'communityProgressionEventTypeSchema',
        guardKey: 'isCommunityProgressionEventType',
        parseKey: 'parseCommunityProgressionEventType',
        validValues: VALID_PROGRESSION_EVENT_TYPES,
        invalidValue: 'like_post',
    },
    {
        schemaKey: 'communityProgressionEntityTypeSchema',
        guardKey: 'isCommunityProgressionEntityType',
        parseKey: 'parseCommunityProgressionEntityType',
        validValues: VALID_PROGRESSION_ENTITY_TYPES,
        invalidValue: 'reward',
    },
    {
        schemaKey: 'communityMissionStatusSchema',
        guardKey: 'isCommunityMissionStatus',
        parseKey: 'parseCommunityMissionStatus',
        validValues: VALID_MISSION_STATUSES,
        invalidValue: 'completed',
    },
    {
        schemaKey: 'communityMissionTypeSchema',
        guardKey: 'isCommunityMissionType',
        parseKey: 'parseCommunityMissionType',
        validValues: VALID_MISSION_TYPES,
        invalidValue: 'daily_challenge',
    },
    {
        schemaKey: 'communityMissionCadenceSchema',
        guardKey: 'isCommunityMissionCadence',
        parseKey: 'parseCommunityMissionCadence',
        validValues: VALID_MISSION_CADENCES,
        invalidValue: 'daily',
    },
    {
        schemaKey: 'communitySquadVisibilitySchema',
        guardKey: 'isCommunitySquadVisibility',
        parseKey: 'parseCommunitySquadVisibility',
        validValues: VALID_SQUAD_VISIBILITIES,
        invalidValue: 'invite_only',
    },
    {
        schemaKey: 'communitySquadStatusSchema',
        guardKey: 'isCommunitySquadStatus',
        parseKey: 'parseCommunitySquadStatus',
        validValues: VALID_SQUAD_STATUSES,
        invalidValue: 'paused',
    },
    {
        schemaKey: 'communitySquadRoleSchema',
        guardKey: 'isCommunitySquadRole',
        parseKey: 'parseCommunitySquadRole',
        validValues: VALID_SQUAD_ROLES,
        invalidValue: 'captain',
    },
    {
        schemaKey: 'communitySquadMembershipStatusSchema',
        guardKey: 'isCommunitySquadMembershipStatus',
        parseKey: 'parseCommunitySquadMembershipStatus',
        validValues: VALID_SQUAD_MEMBERSHIP_STATUSES,
        invalidValue: 'invited',
    },
    {
        schemaKey: 'communitySquadInviteStatusSchema',
        guardKey: 'isCommunitySquadInviteStatus',
        parseKey: 'parseCommunitySquadInviteStatus',
        validValues: VALID_SQUAD_INVITE_STATUSES,
        invalidValue: 'claimed',
    },
    {
        schemaKey: 'communityRewardKindSchema',
        guardKey: 'isCommunityRewardKind',
        parseKey: 'parseCommunityRewardKind',
        validValues: VALID_REWARD_KINDS,
        invalidValue: 'rank',
    },
    {
        schemaKey: 'communityRewardOwnerTypeSchema',
        guardKey: 'isCommunityRewardOwnerType',
        parseKey: 'parseCommunityRewardOwnerType',
        validValues: VALID_REWARD_OWNER_TYPES,
        invalidValue: 'season',
    },
    {
        schemaKey: 'communityRewardStatusSchema',
        guardKey: 'isCommunityRewardStatus',
        parseKey: 'parseCommunityRewardStatus',
        validValues: VALID_REWARD_STATUSES,
        invalidValue: 'pending',
    },
    {
        schemaKey: 'communityRewardDisplayStateSchema',
        guardKey: 'isCommunityRewardDisplayState',
        parseKey: 'parseCommunityRewardDisplayState',
        validValues: VALID_REWARD_DISPLAY_STATES,
        invalidValue: 'featured',
    },
] as const;

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
            seasons: 'community_seasons',
            progressionEvents: 'community_progression_events',
            userProgressionAggregates: 'community_user_progression_aggregates',
            missions: 'community_missions',
            squads: 'community_squads',
            squadMemberships: 'community_squad_memberships',
            squadInvites: 'community_squad_invites',
            rewardRecords: 'community_reward_records',
        });
    });

    it('accepts and rejects only the canonical enum contracts used by community and gamification', async () => {
        const communityModule = await loadCommunityModule();

        for (const testCase of ENUM_CASES) {
            assertEnumContract(communityModule, testCase);
        }
    });
});
