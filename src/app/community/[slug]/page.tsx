import React from 'react';
import { and, count, eq } from 'drizzle-orm';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { listVisibleCommunityPostComments } from '@/actions/community-comments';
import { auth } from '@/auth';
import { db } from '@/db';
import {
    communityPostAnalysisSnapshots,
    communityPostLikes,
    communityPosts,
    communityPostSaves,
} from '@/db/schema';
import { getScope, getWeapon } from '@/game/pubg';
import { getCommunityPostReadAccess } from '@/lib/community-access';
import { Header } from '@/ui/components/header';

import { PostDetail, type CommunityPostDetailData } from './post-detail';

export const dynamic = 'force-dynamic';

interface CommunityPostPageProps {
    readonly params: Promise<{
        readonly slug: string;
    }>;
}

interface CommunityPostMetadataRecord {
    readonly slug: string;
    readonly authorId: string;
    readonly status: 'draft' | 'published' | 'hidden' | 'archived' | 'deleted';
    readonly requiredEntitlementKey: string | null;
    readonly title: string;
    readonly excerpt: string;
    readonly snapshotPatchVersion: string;
    readonly snapshotWeaponId: string;
    readonly snapshotScopeId: string;
    readonly snapshotDistance: number;
    readonly snapshotDiagnoses: ReadonlyArray<{
        readonly type: string;
    }>;
}

function extractDiagnosisOptions(
    diagnoses: CommunityPostDetailData['snapshot']['diagnoses'],
): readonly string[] {
    return Array.from(new Set(diagnoses.map((diagnosis) => diagnosis.type)));
}

function formatDiagnosisMetadataLabel(type: string): string {
    return type.replaceAll('_', ' ').trim();
}

function buildCommunityPostMetadataTitle(post: CommunityPostMetadataRecord): string {
    const weaponName = getWeapon(post.snapshotWeaponId)?.name ?? post.snapshotWeaponId;

    return `${post.title} - ${weaponName} no Patch ${post.snapshotPatchVersion}`;
}

function buildCommunityPostMetadataDescription(post: CommunityPostMetadataRecord): string {
    const weaponName = getWeapon(post.snapshotWeaponId)?.name ?? post.snapshotWeaponId;
    const scopeName =
        getScope(post.snapshotScopeId, post.snapshotPatchVersion)?.name ?? post.snapshotScopeId;
    const diagnosisLabels = Array.from(
        new Set(post.snapshotDiagnoses.map((diagnosis) => formatDiagnosisMetadataLabel(diagnosis.type))),
    );
    const diagnosisSummary = diagnosisLabels.length > 0 ? diagnosisLabels.join(', ') : 'snapshot tecnico';

    return `Snapshot tecnico de ${weaponName} com ${scopeName} a ${post.snapshotDistance} m no patch ${post.snapshotPatchVersion}. Diagnosticos: ${diagnosisSummary}. ${post.excerpt}`;
}

async function loadCommunityPostMetadataRecord(
    slug: string,
): Promise<CommunityPostMetadataRecord | null> {
    const normalizedSlug = slug.trim();

    if (!normalizedSlug) {
        return null;
    }

    const [storedPost] = await db
        .select({
            slug: communityPosts.slug,
            authorId: communityPosts.authorId,
            status: communityPosts.status,
            requiredEntitlementKey: communityPosts.requiredEntitlementKey,
            title: communityPosts.title,
            excerpt: communityPosts.excerpt,
            snapshotPatchVersion: communityPostAnalysisSnapshots.patchVersion,
            snapshotWeaponId: communityPostAnalysisSnapshots.weaponId,
            snapshotScopeId: communityPostAnalysisSnapshots.scopeId,
            snapshotDistance: communityPostAnalysisSnapshots.distance,
            snapshotDiagnoses: communityPostAnalysisSnapshots.diagnosesSnapshot,
        })
        .from(communityPosts)
        .innerJoin(
            communityPostAnalysisSnapshots,
            eq(communityPostAnalysisSnapshots.postId, communityPosts.id),
        )
        .where(eq(communityPosts.slug, normalizedSlug))
        .limit(1);

    if (!storedPost) {
        return null;
    }

    const access = getCommunityPostReadAccess({
        post: {
            authorId: storedPost.authorId,
            status: storedPost.status,
            requiredEntitlementKey: storedPost.requiredEntitlementKey,
        },
        viewer: {
            userId: null,
        },
    });

    return access.canRead ? storedPost : null;
}

export async function generateMetadata({
    params,
}: CommunityPostPageProps): Promise<Metadata> {
    const { slug } = await params;
    const post = await loadCommunityPostMetadataRecord(slug);

    if (!post) {
        return {
            title: 'Post da comunidade',
            description: 'Publicacao tecnica da comunidade do PUBG Aim Analyzer.',
        };
    }

    const title = buildCommunityPostMetadataTitle(post);
    const description = buildCommunityPostMetadataDescription(post);
    const canonicalPath = `/community/${post.slug}`;

    return {
        title,
        description,
        alternates: {
            canonical: canonicalPath,
        },
        openGraph: {
            title,
            description,
            url: canonicalPath,
            type: 'article',
        },
        twitter: {
            card: 'summary_large_image',
            title,
            description,
        },
    };
}

async function loadCommunityPostDetail(
    slug: string,
    viewerUserId: string | null,
): Promise<CommunityPostDetailData | null> {
    const normalizedSlug = slug.trim();

    if (!normalizedSlug) {
        return null;
    }

    const [storedPost] = await db
        .select({
            id: communityPosts.id,
            slug: communityPosts.slug,
            authorId: communityPosts.authorId,
            status: communityPosts.status,
            requiredEntitlementKey: communityPosts.requiredEntitlementKey,
            title: communityPosts.title,
            excerpt: communityPosts.excerpt,
            bodyMarkdown: communityPosts.bodyMarkdown,
            publishedAt: communityPosts.publishedAt,
            snapshotPatchVersion: communityPostAnalysisSnapshots.patchVersion,
            snapshotWeaponId: communityPostAnalysisSnapshots.weaponId,
            snapshotScopeId: communityPostAnalysisSnapshots.scopeId,
            snapshotDistance: communityPostAnalysisSnapshots.distance,
            snapshotDiagnoses: communityPostAnalysisSnapshots.diagnosesSnapshot,
        })
        .from(communityPosts)
        .innerJoin(
            communityPostAnalysisSnapshots,
            eq(communityPostAnalysisSnapshots.postId, communityPosts.id),
        )
        .where(eq(communityPosts.slug, normalizedSlug))
        .limit(1);

    if (!storedPost) {
        return null;
    }

    const access = getCommunityPostReadAccess({
        post: {
            authorId: storedPost.authorId,
            status: storedPost.status,
            requiredEntitlementKey: storedPost.requiredEntitlementKey,
        },
        viewer: {
            userId: viewerUserId,
        },
    });

    if (!access.canRead) {
        return null;
    }

    const [likeCountRow] = await db
        .select({
            count: count(),
        })
        .from(communityPostLikes)
        .where(eq(communityPostLikes.postId, storedPost.id))
        .limit(1);

    let viewerHasLiked = false;
    let viewerHasSaved = false;

    if (viewerUserId) {
        const [storedViewerLike] = await db
            .select({
                postId: communityPostLikes.postId,
            })
            .from(communityPostLikes)
            .where(
                and(
                    eq(communityPostLikes.postId, storedPost.id),
                    eq(communityPostLikes.userId, viewerUserId),
                ),
            )
            .limit(1);

        viewerHasLiked = Boolean(storedViewerLike);

        const [storedViewerSave] = await db
            .select({
                postId: communityPostSaves.postId,
            })
            .from(communityPostSaves)
            .where(
                and(
                    eq(communityPostSaves.postId, storedPost.id),
                    eq(communityPostSaves.userId, viewerUserId),
                ),
            )
            .limit(1);

        viewerHasSaved = Boolean(storedViewerSave);
    }

    const comments = await listVisibleCommunityPostComments(storedPost.id);
    const diagnosisOptions = extractDiagnosisOptions(storedPost.snapshotDiagnoses);
    const canComment = Boolean(viewerUserId) && storedPost.status === 'published';
    const commentDisabledReason = storedPost.status !== 'published'
        ? 'Comentarios liberados apenas quando o post estiver publicado.'
        : viewerUserId
            ? null
            : 'Entre na sua conta para comentar neste post.';

    return {
        id: storedPost.id,
        slug: storedPost.slug,
        status: storedPost.status,
        title: storedPost.title,
        excerpt: storedPost.excerpt,
        bodyMarkdown: storedPost.bodyMarkdown,
        publishedAt: storedPost.publishedAt,
        snapshot: {
            patchVersion: storedPost.snapshotPatchVersion,
            weaponId: storedPost.snapshotWeaponId,
            scopeId: storedPost.snapshotScopeId,
            distance: storedPost.snapshotDistance,
            diagnoses: storedPost.snapshotDiagnoses,
        },
        engagement: {
            likeCount: Number(likeCountRow?.count ?? 0),
            viewerHasLiked,
            viewerHasSaved,
        },
        comments,
        commentForm: {
            canSubmit: canComment,
            disabledReason: commentDisabledReason,
            diagnosisOptions,
        },
    };
}

export default async function CommunityPostPage({
    params,
}: CommunityPostPageProps): Promise<React.JSX.Element> {
    const session = await auth();
    const { slug } = await params;
    const post = await loadCommunityPostDetail(slug, session?.user?.id ?? null);

    if (!post) {
        notFound();
    }

    return (
        <>
            <Header />

            <div className="page">
                <div className="container" style={{ display: 'grid', gap: 'var(--space-xl)' }}>
                    <PostDetail post={post} />
                </div>
            </div>
        </>
    );
}
