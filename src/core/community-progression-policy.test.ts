import { describe, expect, it } from 'vitest';

import {
    COMMUNITY_PROGRESSION_POLICY_SNAPSHOT,
    isCommunityRewardKindPublicSafe,
} from './community-progression-policy';

describe('community progression policy', () => {
    it('locks the final XP, mission, streak, reward, and anti-farming rules for this change', () => {
        expect(COMMUNITY_PROGRESSION_POLICY_SNAPSHOT).toEqual({
            xpByEvent: {
                publish_post: 40,
                complete_public_profile: 30,
                follow_profile: 10,
                receive_unique_save: 15,
                receive_unique_copy: 20,
                comment_with_context: 20,
                weekly_challenge_complete: 80,
                mission_complete: 60,
                squad_goal_contribution: 15,
                streak_participation: 10,
            },
            missionBoardLimit: 3,
            weeklyChallengeSourcePriority: ['mission', 'trend', 'fallback'],
            streak: {
                cadence: 'weekly',
                atRiskWeekGap: 1,
                reentryWeekGap: 2,
            },
            rewards: {
                publicSafeKinds: ['badge', 'title', 'season_mark', 'squad_mark'],
                requiresFactualCopy: true,
                skillClaimsAllowed: false,
            },
            antiFarming: {
                lowSignalEventTypes: ['follow_profile', 'receive_unique_save', 'receive_unique_copy'],
                caps: {
                    follow_profile: {
                        pairPeriodCap: 1,
                        periodCap: 3,
                        reciprocalPairPeriodCap: 2,
                    },
                    receive_unique_save: {
                        pairPeriodCap: 2,
                        periodCap: 5,
                        reciprocalPairPeriodCap: 3,
                    },
                    receive_unique_copy: {
                        pairPeriodCap: 2,
                        periodCap: 4,
                        reciprocalPairPeriodCap: 3,
                    },
                },
            },
        });
    });

    it('accepts only factual reward kinds as candidates for public-safe display', () => {
        expect(isCommunityRewardKindPublicSafe('badge')).toBe(true);
        expect(isCommunityRewardKindPublicSafe('legacy_trophy')).toBe(false);
    });
});
