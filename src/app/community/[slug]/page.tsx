import React from 'react';
import { and, count, eq } from 'drizzle-orm';
import { notFound } from 'next/navigation';

import { auth } from '@/auth';
import { db } from '@/db';
import { communityPostAnalysisSnapshots, communityPostLikes, communityPosts } from '@/db/schema';
import { getCommunityPostReadAccess } from '@/lib/community-access';
import { Header } from '@/ui/components/header';

import { PostDetail, type CommunityPostDetailData } from './post-detail';

export const dynamic = 'force-dynamic';

interface CommunityPostPageProps {
    readonly params: Promise<{
        readonly slug: string;
    }>;
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
    }

    return {
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
