import type {
    CommunityProgressionEventType,
} from '@/types/community';
import type { CommunityProgressionHistoryEvent } from './community-progression';
import {
    COMMUNITY_LOW_SIGNAL_GUARDRAIL_CONFIG,
} from './community-progression-policy';

export type CommunityProgressionGuardrailReason =
    | 'pair_period_cap'
    | 'period_cap'
    | 'reciprocal_pair_cap';

export interface ApplyCommunityProgressionGuardrailsInput {
    readonly eventType: CommunityProgressionEventType;
    readonly actorUserId: string;
    readonly beneficiaryUserId?: string | null;
    readonly occurredAt: Date;
    readonly rawXp: number;
    readonly history: readonly CommunityProgressionHistoryEvent[];
}

export interface CommunityProgressionGuardrailOutcome {
    readonly effectiveXp: number;
    readonly reasons: readonly CommunityProgressionGuardrailReason[];
}

export function applyCommunityProgressionGuardrails(
    input: ApplyCommunityProgressionGuardrailsInput,
): CommunityProgressionGuardrailOutcome {
    const config = COMMUNITY_LOW_SIGNAL_GUARDRAIL_CONFIG[input.eventType];

    if (!config || input.rawXp <= 0) {
        return {
            effectiveXp: input.rawXp,
            reasons: [],
        };
    }

    const periodStart = startOfUtcDay(input.occurredAt);
    const periodEnd = endOfUtcDay(input.occurredAt);
    const creditedEvents = input.history.filter((event) =>
        event.eventType === input.eventType
        && event.effectiveXp > 0
        && event.occurredAt.getTime() >= periodStart.getTime()
        && event.occurredAt.getTime() <= periodEnd.getTime(),
    );
    const reasons: CommunityProgressionGuardrailReason[] = [];
    const beneficiaryUserId = normalizeOptionalIdentifier(input.beneficiaryUserId);

    if (creditedEvents.filter((event) => event.actorUserId === input.actorUserId).length >= config.periodCap) {
        reasons.push('period_cap');
    }

    if (beneficiaryUserId) {
        if (
            creditedEvents.filter((event) =>
                event.actorUserId === input.actorUserId
                && event.beneficiaryUserId === beneficiaryUserId,
            ).length >= config.pairPeriodCap
        ) {
            reasons.push('pair_period_cap');
        }

        if (
            creditedEvents.filter((event) =>
                isSameCommunityProgressionPair(event, input.actorUserId, beneficiaryUserId),
            ).length >= config.reciprocalPairPeriodCap
        ) {
            reasons.push('reciprocal_pair_cap');
        }
    }

    return {
        effectiveXp: reasons.length > 0 ? 0 : input.rawXp,
        reasons,
    };
}

function isSameCommunityProgressionPair(
    event: CommunityProgressionHistoryEvent,
    actorUserId: string,
    beneficiaryUserId: string,
): boolean {
    return (
        event.actorUserId === actorUserId
        && event.beneficiaryUserId === beneficiaryUserId
    ) || (
        event.actorUserId === beneficiaryUserId
        && event.beneficiaryUserId === actorUserId
    );
}

function normalizeOptionalIdentifier(value?: string | null): string | null {
    const normalizedValue = value?.trim();
    return normalizedValue ? normalizedValue : null;
}

function cloneDate(date: Date): Date {
    return new Date(date.getTime());
}

function startOfUtcDay(date: Date): Date {
    return new Date(Date.UTC(
        date.getUTCFullYear(),
        date.getUTCMonth(),
        date.getUTCDate(),
        0,
        0,
        0,
        0,
    ));
}

function endOfUtcDay(date: Date): Date {
    const dayStart = startOfUtcDay(cloneDate(date));
    dayStart.setUTCDate(dayStart.getUTCDate() + 1);
    dayStart.setUTCMilliseconds(dayStart.getUTCMilliseconds() - 1);
    return dayStart;
}
