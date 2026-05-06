import { describe, expect, it } from 'vitest';

import {
    BETA_COHORTS,
    assertCreatorDisclosure,
    createSafeCohortAnalyticsMetadata,
    resolveFounderRollout,
} from './beta-cohorts';

describe('beta cohort controls', () => {
    it('defines the controlled founder beta cohorts and target ranges', () => {
        expect(BETA_COHORTS.internal_sanity.targetSize).toBe('3-5 trusted users');
        expect(BETA_COHORTS.beginner_casual.targetSize).toBe('5-10 players');
        expect(BETA_COHORTS.serious_competitive.targetSize).toBe('5-15 players');
        expect(BETA_COHORTS.coach_creator_advisor.targetSize).toBe('1-3 advisors');
    });

    it('requires creator material-benefit disclosure before grants, discounts, or codes', () => {
        expect(() => assertCreatorDisclosure({
            cohortTag: 'coach_creator_advisor',
            hasGrantOrDiscountOrCode: true,
            disclosureAccepted: false,
        })).toThrow(/disclosure/i);

        expect(() => assertCreatorDisclosure({
            cohortTag: 'coach_creator_advisor',
            hasGrantOrDiscountOrCode: true,
            disclosureAccepted: true,
        })).not.toThrow();
    });

    it('blocks founder paid allowlist until gates, manual Stripe checklist, and owner approval pass', () => {
        expect(resolveFounderRollout({
            requestedStage: 'founder_paid_allowlist',
            automatedGatesPassed: true,
            manualStripeChecklistPassed: false,
            explicitOwnerApproval: true,
        })).toMatchObject({
            allowed: false,
            blockers: ['manual_stripe_checklist_missing'],
        });

        expect(resolveFounderRollout({
            requestedStage: 'founder_paid_allowlist',
            automatedGatesPassed: true,
            manualStripeChecklistPassed: true,
            explicitOwnerApproval: true,
        })).toMatchObject({
            allowed: true,
            blockers: [],
        });
    });

    it('keeps cohort analytics metadata narrow and has no affiliate payout fields', () => {
        const metadata = createSafeCohortAnalyticsMetadata({
            cohortTag: 'coach_creator_advisor',
            creatorCode: ' creator-01 ',
        });

        expect(metadata).toEqual({
            cohortTag: 'coach_creator_advisor',
            creatorCode: 'creator-01',
        });
        expect(metadata).not.toHaveProperty('commission');
        expect(metadata).not.toHaveProperty('payout');
        expect(metadata).not.toHaveProperty('affiliate');
    });
});
