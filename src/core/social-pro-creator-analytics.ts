import {
    socialProSafeCreatorMetricKeyValues,
    type SocialProSafeCreatorMetricKey,
} from '@/types/social-pro';

export const socialProCreatorAnalyticsMetricKeys = socialProSafeCreatorMetricKeyValues;

type SocialProCreatorPublicEventType =
    | 'public_post'
    | 'public_comment'
    | 'public_save'
    | 'public_follow'
    | 'setup_copy'
    | 'generated_report'
    | 'analysis_cta_click'
    | 'training_cta_click'
    | 'context_interest'
    | 'pro_cta_click'
    | 'pro_library_attempt'
    | 'lock_impression';

interface SocialProCreatorPublicEvent {
    readonly type?: unknown;
    readonly context?: Record<string, unknown>;
}

interface SocialProCreatorAnalyticsInput {
    readonly creatorId?: unknown;
    readonly publicEvents?: readonly SocialProCreatorPublicEvent[];
    readonly communityMetrics?: {
        readonly postCount?: number;
        readonly commentCount?: number;
        readonly saveCount?: number;
        readonly followCount?: number;
        readonly copyCount?: number;
    };
}

export interface SocialProCreatorContextImpact {
    readonly weaponId?: string;
    readonly opticId?: string;
    readonly distanceMeters?: number;
    readonly diagnosisKey?: string;
    readonly activeLineId?: string;
    readonly programKey?: string;
    readonly sprayLabLaneId?: string;
    readonly objectiveKey?: string;
    readonly validationState?: string;
    readonly blockerKey?: string;
    readonly surface?: string;
    readonly kind?: string;
    readonly count: number;
}

export interface SocialProCreatorAnalytics {
    readonly creatorId: string;
    readonly metrics: Readonly<Record<SocialProSafeCreatorMetricKey, number>>;
    readonly topContexts: readonly SocialProCreatorContextImpact[];
    readonly upgradeIntent: {
        readonly countedEvents: number;
        readonly ignoredPassiveImpressions: number;
    };
    readonly panelKind: 'creator_social_impact';
}

const metricByEventType: Partial<Record<SocialProCreatorPublicEventType, SocialProSafeCreatorMetricKey>> = {
    public_post: 'public_posts',
    public_comment: 'public_comments',
    public_save: 'public_saves',
    public_follow: 'public_follows',
    setup_copy: 'setup_copies',
    generated_report: 'generated_reports',
    analysis_cta_click: 'analysis_cta_clicks',
    training_cta_click: 'training_cta_clicks',
    context_interest: 'context_interest',
};

function createEmptyMetrics(): Record<SocialProSafeCreatorMetricKey, number> {
    return Object.fromEntries(
        socialProCreatorAnalyticsMetricKeys.map((key) => [key, 0]),
    ) as Record<SocialProSafeCreatorMetricKey, number>;
}

function safeText(value: unknown): string | undefined {
    return typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined;
}

function safeNumber(value: unknown): number | undefined {
    return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function parseEventType(value: unknown): SocialProCreatorPublicEventType | null {
    if (typeof value !== 'string') {
        return null;
    }

    if (value in metricByEventType || value === 'pro_cta_click' || value === 'pro_library_attempt' || value === 'lock_impression') {
        return value as SocialProCreatorPublicEventType;
    }

    return null;
}

function sanitizeContext(context: Record<string, unknown> = {}): Omit<SocialProCreatorContextImpact, 'count'> {
    return {
        ...(safeText(context.weaponId) ? { weaponId: safeText(context.weaponId)! } : {}),
        ...(safeText(context.opticId) ? { opticId: safeText(context.opticId)! } : {}),
        ...(safeNumber(context.distanceMeters) !== undefined ? { distanceMeters: safeNumber(context.distanceMeters)! } : {}),
        ...(safeText(context.diagnosisKey) ?? safeText(context.diagnosis)
            ? { diagnosisKey: (safeText(context.diagnosisKey) ?? safeText(context.diagnosis))! }
            : {}),
        ...(safeText(context.activeLineId) ? { activeLineId: safeText(context.activeLineId)! } : {}),
        ...(safeText(context.programKey) ?? safeText(context.program)
            ? { programKey: (safeText(context.programKey) ?? safeText(context.program))! }
            : {}),
        ...(safeText(context.sprayLabLaneId) ? { sprayLabLaneId: safeText(context.sprayLabLaneId)! } : {}),
        ...(safeText(context.objectiveKey) ?? safeText(context.objective)
            ? { objectiveKey: (safeText(context.objectiveKey) ?? safeText(context.objective))! }
            : {}),
        ...(safeText(context.validationState) ? { validationState: safeText(context.validationState)! } : {}),
        ...(safeText(context.blockerKey) ?? safeText(context.blocker)
            ? { blockerKey: (safeText(context.blockerKey) ?? safeText(context.blocker))! }
            : {}),
        ...(safeText(context.surface) ? { surface: safeText(context.surface)! } : {}),
        ...(safeText(context.kind) ? { kind: safeText(context.kind)! } : {}),
    };
}

function contextFingerprint(context: Omit<SocialProCreatorContextImpact, 'count'>): string | null {
    const entries = Object.entries(context)
        .filter(([, value]) => value !== undefined && value !== null)
        .sort(([left], [right]) => left.localeCompare(right));

    return entries.length > 0 ? JSON.stringify(entries) : null;
}

function buildTopContexts(events: readonly SocialProCreatorPublicEvent[]): SocialProCreatorContextImpact[] {
    const contextCounts = new Map<string, {
        readonly context: Omit<SocialProCreatorContextImpact, 'count'>;
        count: number;
    }>();

    for (const event of events) {
        const sanitized = sanitizeContext(event.context);
        const fingerprint = contextFingerprint(sanitized);

        if (!fingerprint) {
            continue;
        }

        const existing = contextCounts.get(fingerprint);

        if (existing) {
            existing.count += 1;
        } else {
            contextCounts.set(fingerprint, {
                context: sanitized,
                count: 1,
            });
        }
    }

    return [...contextCounts.values()]
        .map(({ context, count }) => ({
            ...context,
            count,
        }))
        .sort((left, right) => {
            const countDiff = right.count - left.count;

            if (countDiff !== 0) {
                return countDiff;
            }

            return (contextFingerprint(left) ?? '').localeCompare(contextFingerprint(right) ?? '');
        })
        .slice(0, 6);
}

export function buildSocialProCreatorAnalytics(
    input: SocialProCreatorAnalyticsInput,
): SocialProCreatorAnalytics {
    const creatorId = safeText(input.creatorId) ?? 'unknown_creator';
    const publicEvents = input.publicEvents ?? [];
    const metrics = createEmptyMetrics();

    metrics.public_posts += input.communityMetrics?.postCount ?? 0;
    metrics.public_comments += input.communityMetrics?.commentCount ?? 0;
    metrics.public_saves += input.communityMetrics?.saveCount ?? 0;
    metrics.public_follows += input.communityMetrics?.followCount ?? 0;
    metrics.setup_copies += input.communityMetrics?.copyCount ?? 0;

    let countedEvents = 0;
    let ignoredPassiveImpressions = 0;

    for (const event of publicEvents) {
        const eventType = parseEventType(event.type);

        if (!eventType) {
            continue;
        }

        const metricKey = metricByEventType[eventType];

        if (metricKey) {
            metrics[metricKey] += 1;
            continue;
        }

        if (eventType === 'pro_cta_click' || eventType === 'pro_library_attempt') {
            countedEvents += 1;
            continue;
        }

        if (eventType === 'lock_impression') {
            ignoredPassiveImpressions += 1;
        }
    }

    return {
        creatorId,
        metrics,
        topContexts: buildTopContexts(publicEvents),
        upgradeIntent: {
            countedEvents,
            ignoredPassiveImpressions,
        },
        panelKind: 'creator_social_impact',
    };
}
