export type BetaCohortTag =
    | 'internal_sanity'
    | 'beginner_casual'
    | 'serious_competitive'
    | 'coach_creator_advisor';

export type FounderRolloutStage =
    | 'grant_only'
    | 'founder_paid_allowlist'
    | 'public_blocked';

export interface BetaCohortDefinition {
    readonly tag: BetaCohortTag;
    readonly label: string;
    readonly targetSize: string;
    readonly interpretation: string;
    readonly allowsCreatorCode: boolean;
}

export interface CreatorDisclosureInput {
    readonly cohortTag: BetaCohortTag;
    readonly hasGrantOrDiscountOrCode: boolean;
    readonly disclosureAccepted: boolean;
}

export interface FounderRolloutInput {
    readonly requestedStage: FounderRolloutStage;
    readonly automatedGatesPassed: boolean;
    readonly manualStripeChecklistPassed: boolean;
    readonly explicitOwnerApproval: boolean;
}

export const BETA_COHORTS: Record<BetaCohortTag, BetaCohortDefinition> = {
    internal_sanity: {
        tag: 'internal_sanity',
        label: 'Internal sanity',
        targetSize: '3-5 trusted users',
        interpretation: 'Find broken flows before interpreting product value.',
        allowsCreatorCode: false,
    },
    beginner_casual: {
        tag: 'beginner_casual',
        label: 'Beginner/casual',
        targetSize: '5-10 players',
        interpretation: 'Measure clarity, capture guidance, and whether Free remains useful.',
        allowsCreatorCode: false,
    },
    serious_competitive: {
        tag: 'serious_competitive',
        label: 'Serious/competitive',
        targetSize: '5-15 players',
        interpretation: 'Measure repeat-clip value, coach usefulness, and upgrade pressure.',
        allowsCreatorCode: false,
    },
    coach_creator_advisor: {
        tag: 'coach_creator_advisor',
        label: 'Coach/creator/advisor',
        targetSize: '1-3 advisors',
        interpretation: 'Use qualitative review and disclosed material-benefit feedback.',
        allowsCreatorCode: true,
    },
};

export function assertCreatorDisclosure(input: CreatorDisclosureInput): void {
    if (
        input.cohortTag === 'coach_creator_advisor'
        && input.hasGrantOrDiscountOrCode
        && !input.disclosureAccepted
    ) {
        throw new Error('Creator cohort requires material-benefit disclosure before grant, discount, or invite code.');
    }
}

export function resolveFounderRollout(input: FounderRolloutInput): {
    readonly allowed: boolean;
    readonly stage: FounderRolloutStage;
    readonly blockers: readonly string[];
} {
    const blockers: string[] = [];

    if (input.requestedStage === 'founder_paid_allowlist') {
        if (!input.automatedGatesPassed) {
            blockers.push('automated_gates_missing');
        }
        if (!input.manualStripeChecklistPassed) {
            blockers.push('manual_stripe_checklist_missing');
        }
        if (!input.explicitOwnerApproval) {
            blockers.push('owner_approval_missing');
        }
    }

    if (input.requestedStage === 'public_blocked') {
        blockers.push('public_launch_waits_for_later_validation_ui_training_revenue_ops');
    }

    return {
        allowed: blockers.length === 0,
        stage: input.requestedStage,
        blockers,
    };
}

export function createSafeCohortAnalyticsMetadata(input: {
    readonly cohortTag: BetaCohortTag;
    readonly creatorCode?: string | null;
}): { readonly cohortTag: BetaCohortTag; readonly creatorCode: string | null } {
    return {
        cohortTag: input.cohortTag,
        creatorCode: input.creatorCode?.trim() || null,
    };
}
