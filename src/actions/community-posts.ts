'use server';

import { and, eq } from 'drizzle-orm';

import { auth } from '@/auth';
import {
    createCommunityPostAnalysisSnapshot,
    type CommunityPostAnalysisSnapshotSourceSession,
} from '@/core/community-post-snapshot';
import { db } from '@/db';
import {
    analysisSessions,
    communityPostAnalysisSnapshots,
    communityPosts,
    communityProfiles,
} from '@/db/schema';
import { checkCommunityActionRateLimit } from '@/lib/rate-limit';
import type { CommunityPostStatus, CommunityPostVisibility } from '@/types/community';
import type { AnalysisResult } from '@/types/engine';

type PublishableCommunityPostStatus = Extract<CommunityPostStatus, 'draft' | 'published'>;

export interface PublishAnalysisSessionToCommunityInput {
    readonly analysisSessionId: string;
    readonly title: string;
    readonly excerpt: string;
    readonly bodyMarkdown: string;
    readonly status: PublishableCommunityPostStatus;
    readonly visibility?: CommunityPostVisibility;
}

type PublishAnalysisSessionToCommunityResult =
    | {
        readonly success: true;
        readonly postId: string;
        readonly slug: string;
        readonly status: PublishableCommunityPostStatus;
    }
    | {
        readonly success: false;
        readonly error: string;
    };

interface StoredPublishableAnalysisSession {
    readonly id: string;
    readonly weaponId: string;
    readonly scopeId: string;
    readonly patchVersion: string;
    readonly stance: string;
    readonly attachments: CommunityPostAnalysisSnapshotSourceSession['attachments'];
    readonly distance: number;
    readonly fullResult: Record<string, unknown> | null;
}

function buildAnalysisSnapshotPostSlug(profileSlug: string, analysisSessionId: string): string {
    return `${profileSlug}-${analysisSessionId}`;
}

function toSnapshotSourceSession(
    session: StoredPublishableAnalysisSession,
): CommunityPostAnalysisSnapshotSourceSession {
    return {
        id: session.id,
        weaponId: session.weaponId,
        scopeId: session.scopeId,
        patchVersion: session.patchVersion,
        stance: session.stance as CommunityPostAnalysisSnapshotSourceSession['stance'],
        attachments: session.attachments,
        distance: session.distance,
    };
}

function resolvePrimaryDiagnosisKey(analysisResult: AnalysisResult): string {
    return analysisResult.diagnoses[0]?.type ?? 'clean_analysis';
}

export async function publishAnalysisSessionToCommunity(
    input: PublishAnalysisSessionToCommunityInput,
): Promise<PublishAnalysisSessionToCommunityResult> {
    const session = await auth();
    if (!session?.user?.id) {
        return {
            success: false,
            error: 'Nao autenticado.',
        };
    }

    const rateLimitResult = await checkCommunityActionRateLimit({
        action: 'community.post.publish',
        userId: session.user.id,
    });

    if (!rateLimitResult.success) {
        return {
            success: false,
            error: 'Muitos posts em pouco tempo. Tente novamente.',
        };
    }

    const [storedAnalysisSession] = await db
        .select({
            id: analysisSessions.id,
            weaponId: analysisSessions.weaponId,
            scopeId: analysisSessions.scopeId,
            patchVersion: analysisSessions.patchVersion,
            stance: analysisSessions.stance,
            attachments: analysisSessions.attachments,
            distance: analysisSessions.distance,
            fullResult: analysisSessions.fullResult,
        })
        .from(analysisSessions)
        .where(
            and(
                eq(analysisSessions.id, input.analysisSessionId),
                eq(analysisSessions.userId, session.user.id),
            ),
        )
        .limit(1) as StoredPublishableAnalysisSession[];

    if (!storedAnalysisSession) {
        return {
            success: false,
            error: 'Sessao nao encontrada.',
        };
    }

    const [communityProfile] = await db
        .select({
            id: communityProfiles.id,
            slug: communityProfiles.slug,
        })
        .from(communityProfiles)
        .where(eq(communityProfiles.userId, session.user.id))
        .limit(1);

    if (!communityProfile) {
        return {
            success: false,
            error: 'Perfil da comunidade nao encontrado.',
        };
    }

    if (!storedAnalysisSession.fullResult || typeof storedAnalysisSession.fullResult !== 'object') {
        return {
            success: false,
            error: 'Sessao sem resultado completo.',
        };
    }

    const analysisResult = storedAnalysisSession.fullResult as unknown as AnalysisResult;
    const analysisSnapshot = createCommunityPostAnalysisSnapshot({
        analysisResult,
        session: toSnapshotSourceSession(storedAnalysisSession),
    });
    const slug = buildAnalysisSnapshotPostSlug(communityProfile.slug, storedAnalysisSession.id);
    const publishedAt = input.status === 'published' ? new Date() : null;

    const [createdPost] = await db
        .insert(communityPosts)
        .values({
            authorId: session.user.id,
            communityProfileId: communityProfile.id,
            slug,
            type: 'analysis_snapshot',
            status: input.status,
            visibility: input.visibility ?? 'public',
            title: input.title.trim(),
            excerpt: input.excerpt.trim(),
            bodyMarkdown: input.bodyMarkdown.trim(),
            sourceAnalysisSessionId: storedAnalysisSession.id,
            primaryWeaponId: storedAnalysisSession.weaponId,
            primaryPatchVersion: storedAnalysisSession.patchVersion,
            primaryDiagnosisKey: resolvePrimaryDiagnosisKey(analysisResult),
            copySensPreset: analysisSnapshot.sensSnapshot,
            publishedAt,
        })
        .returning({
            id: communityPosts.id,
            slug: communityPosts.slug,
            status: communityPosts.status,
        });

    await db
        .insert(communityPostAnalysisSnapshots)
        .values({
            postId: createdPost!.id,
            analysisSessionId: analysisSnapshot.analysisSessionId,
            analysisResultId: analysisSnapshot.analysisResultId,
            analysisTimestamp: analysisSnapshot.analysisTimestamp,
            analysisResultSchemaVersion: analysisSnapshot.analysisResultSchemaVersion,
            patchVersion: analysisSnapshot.patchVersion,
            weaponId: analysisSnapshot.weaponId,
            scopeId: analysisSnapshot.scopeId,
            distance: analysisSnapshot.distance,
            stance: analysisSnapshot.stance,
            attachmentsSnapshot: analysisSnapshot.attachmentsSnapshot,
            metricsSnapshot: analysisSnapshot.metricsSnapshot,
            diagnosesSnapshot: analysisSnapshot.diagnosesSnapshot,
            coachingSnapshot: analysisSnapshot.coachingSnapshot,
            sensSnapshot: analysisSnapshot.sensSnapshot,
            trackingSnapshot: analysisSnapshot.trackingSnapshot,
        });

    return {
        success: true,
        postId: createdPost!.id,
        slug: createdPost!.slug,
        status: createdPost!.status as PublishableCommunityPostStatus,
    };
}
