import type {
    AnalysisResult,
    AnalysisSession,
    CoachFeedback,
    CoachPlan,
    Diagnosis,
    SensitivityRecommendation,
    SprayMetrics,
    SprayTrajectory,
} from '@/types/engine';

export const COMMUNITY_POST_ANALYSIS_SNAPSHOT_SCHEMA_VERSION = 1 as const;

export interface CommunityPostAnalysisCoachingSnapshot {
    readonly feedback: readonly CoachFeedback[];
    readonly plan: CoachPlan | null;
}

export type CommunityPostAnalysisSnapshotSourceSession = Pick<
    AnalysisSession,
    'id' | 'weaponId' | 'scopeId' | 'patchVersion' | 'stance' | 'attachments' | 'distance'
>;

export interface CommunityPostAnalysisSnapshot {
    readonly analysisSessionId: string;
    readonly analysisResultId: string;
    readonly analysisTimestamp: string;
    readonly analysisResultSchemaVersion: typeof COMMUNITY_POST_ANALYSIS_SNAPSHOT_SCHEMA_VERSION;
    readonly patchVersion: string;
    readonly weaponId: string;
    readonly scopeId: string;
    readonly distance: number;
    readonly stance: CommunityPostAnalysisSnapshotSourceSession['stance'];
    readonly attachmentsSnapshot: CommunityPostAnalysisSnapshotSourceSession['attachments'];
    readonly metricsSnapshot: SprayMetrics;
    readonly diagnosesSnapshot: readonly Diagnosis[];
    readonly coachingSnapshot: CommunityPostAnalysisCoachingSnapshot;
    readonly sensSnapshot: SensitivityRecommendation;
    readonly trackingSnapshot: SprayTrajectory;
}

export interface CreateCommunityPostAnalysisSnapshotInput {
    readonly analysisResult: AnalysisResult;
    readonly session: CommunityPostAnalysisSnapshotSourceSession;
}

function cloneSnapshotValue<TValue>(value: TValue): TValue {
    return JSON.parse(JSON.stringify(value)) as TValue;
}

export function createCommunityPostAnalysisSnapshot({
    analysisResult,
    session,
}: CreateCommunityPostAnalysisSnapshotInput): CommunityPostAnalysisSnapshot {
    return {
        analysisSessionId: session.id,
        analysisResultId: analysisResult.id,
        analysisTimestamp: analysisResult.timestamp.toISOString(),
        analysisResultSchemaVersion: COMMUNITY_POST_ANALYSIS_SNAPSHOT_SCHEMA_VERSION,
        patchVersion: session.patchVersion,
        weaponId: session.weaponId,
        scopeId: session.scopeId,
        distance: session.distance,
        stance: session.stance,
        attachmentsSnapshot: cloneSnapshotValue(session.attachments),
        metricsSnapshot: cloneSnapshotValue(analysisResult.metrics),
        diagnosesSnapshot: cloneSnapshotValue(analysisResult.diagnoses),
        coachingSnapshot: {
            feedback: cloneSnapshotValue(analysisResult.coaching),
            plan: analysisResult.coachPlan ? cloneSnapshotValue(analysisResult.coachPlan) : null,
        },
        sensSnapshot: cloneSnapshotValue(analysisResult.sensitivity),
        trackingSnapshot: cloneSnapshotValue(analysisResult.trajectory),
    };
}
