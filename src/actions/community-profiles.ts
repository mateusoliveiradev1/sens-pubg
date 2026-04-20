'use server';

import { and, desc, eq, isNotNull } from 'drizzle-orm';

import { db } from '@/db';
import {
    communityPosts,
    communityProfiles,
    type CommunityCreatorProgramStatus,
    type CommunityProfileLink,
} from '@/db/schema';

export interface PublicCommunityProfilePost {
    readonly id: string;
    readonly slug: string;
    readonly title: string;
    readonly excerpt: string;
    readonly primaryWeaponId: string;
    readonly primaryPatchVersion: string;
    readonly primaryDiagnosisKey: string;
    readonly publishedAt: Date;
}

export interface PublicCommunityProfile {
    readonly id: string;
    readonly slug: string;
    readonly displayName: string;
    readonly headline: string | null;
    readonly bio: string | null;
    readonly avatarUrl: string | null;
    readonly creatorProgramStatus: CommunityCreatorProgramStatus;
    readonly links: readonly CommunityProfileLink[];
    readonly posts: readonly PublicCommunityProfilePost[];
}

export interface GetPublicCommunityProfileBySlugInput {
    readonly slug: string;
}

interface StoredPublicCommunityProfilePost extends Omit<PublicCommunityProfilePost, 'publishedAt'> {
    readonly status: typeof communityPosts.$inferSelect.status;
    readonly visibility: typeof communityPosts.$inferSelect.visibility;
    readonly publishedAt: Date | null;
}

function isPublicPublishedPost(
    post: StoredPublicCommunityProfilePost,
): post is PublicCommunityProfilePost & {
    readonly status: 'published';
    readonly visibility: 'public';
} {
    return post.status === 'published' && post.visibility === 'public' && post.publishedAt instanceof Date;
}

function toPublicCommunityProfilePost(
    post: StoredPublicCommunityProfilePost & {
        readonly publishedAt: Date;
    },
): PublicCommunityProfilePost {
    return {
        id: post.id,
        slug: post.slug,
        title: post.title,
        excerpt: post.excerpt,
        primaryWeaponId: post.primaryWeaponId,
        primaryPatchVersion: post.primaryPatchVersion,
        primaryDiagnosisKey: post.primaryDiagnosisKey,
        publishedAt: post.publishedAt,
    };
}

export async function getPublicCommunityProfileBySlug(
    input: GetPublicCommunityProfileBySlugInput,
): Promise<PublicCommunityProfile | null> {
    const normalizedSlug = input.slug.trim();

    if (!normalizedSlug) {
        return null;
    }

    const [storedProfile] = await db
        .select({
            id: communityProfiles.id,
            slug: communityProfiles.slug,
            displayName: communityProfiles.displayName,
            headline: communityProfiles.headline,
            bio: communityProfiles.bio,
            avatarUrl: communityProfiles.avatarUrl,
            creatorProgramStatus: communityProfiles.creatorProgramStatus,
            links: communityProfiles.links,
        })
        .from(communityProfiles)
        .where(
            and(
                eq(communityProfiles.slug, normalizedSlug),
                eq(communityProfiles.visibility, 'public'),
            ),
        )
        .limit(1);

    if (!storedProfile) {
        return null;
    }

    const storedPosts = await db
        .select({
            id: communityPosts.id,
            slug: communityPosts.slug,
            title: communityPosts.title,
            excerpt: communityPosts.excerpt,
            status: communityPosts.status,
            visibility: communityPosts.visibility,
            primaryWeaponId: communityPosts.primaryWeaponId,
            primaryPatchVersion: communityPosts.primaryPatchVersion,
            primaryDiagnosisKey: communityPosts.primaryDiagnosisKey,
            publishedAt: communityPosts.publishedAt,
        })
        .from(communityPosts)
        .where(
            and(
                eq(communityPosts.communityProfileId, storedProfile.id),
                eq(communityPosts.status, 'published'),
                eq(communityPosts.visibility, 'public'),
                isNotNull(communityPosts.publishedAt),
            ),
        )
        .orderBy(desc(communityPosts.publishedAt)) as StoredPublicCommunityProfilePost[];

    return {
        ...storedProfile,
        posts: storedPosts
            .filter(isPublicPublishedPost)
            .map(toPublicCommunityProfilePost),
    };
}
