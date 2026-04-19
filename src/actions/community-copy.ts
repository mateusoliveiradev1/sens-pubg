'use server';

import { eq } from 'drizzle-orm';
import { headers } from 'next/headers';

import { auth } from '@/auth';
import { db } from '@/db';
import {
    communityPostCopyEvents,
    communityPosts,
    type CommunityPostCopySensPreset,
    type CommunityPostCopyTarget,
} from '@/db/schema';
import { checkCommunityActionRateLimit } from '@/lib/rate-limit';

export interface CopyCommunityPostSensInput {
    readonly slug: string;
    readonly target?: CommunityPostCopyTarget;
}

type CopyCommunityPostSensResult =
    | {
        readonly success: true;
        readonly postId: string;
        readonly copyTarget: CommunityPostCopyTarget;
        readonly copySensPreset: CommunityPostCopySensPreset;
        readonly clipboardText: string;
    }
    | {
        readonly success: false;
        readonly error: string;
    };

function resolveRecommendedProfile(preset: CommunityPostCopySensPreset) {
    return preset.profiles.find((profile) => profile.type === preset.recommended) ?? preset.profiles[0];
}

function formatCopySensPresetForClipboard(preset: CommunityPostCopySensPreset): string {
    const recommendedProfile = resolveRecommendedProfile(preset);
    const lines = [
        `Sensitivity Profile: ${recommendedProfile.label}`,
        `General: ${recommendedProfile.general}`,
        `ADS: ${recommendedProfile.ads}`,
        ...recommendedProfile.scopes.map((scope) => `${scope.scopeName}: ${scope.recommended}`),
        `cm/360: ${recommendedProfile.cmPer360}`,
    ];

    if (typeof preset.suggestedVSM === 'number') {
        lines.push(`Suggested VSM: ${preset.suggestedVSM.toFixed(2)}`);
    }

    return lines.join('\n');
}

async function resolveAnonymousCommunityCopyClientId(): Promise<string | null> {
    try {
        const requestHeaders = await headers();
        return requestHeaders.get('x-forwarded-for')?.split(',')[0]?.trim()
            || requestHeaders.get('x-real-ip')?.trim()
            || requestHeaders.get('user-agent')?.trim()
            || null;
    } catch {
        return null;
    }
}

export async function copyCommunityPostSens(
    input: CopyCommunityPostSensInput,
): Promise<CopyCommunityPostSensResult> {
    const session = await auth();
    const copyTarget = input.target ?? 'clipboard';
    const normalizedSlug = input.slug.trim();
    const rateLimitResult = await checkCommunityActionRateLimit({
        action: 'community.post.copy',
        userId: session?.user?.id ?? null,
        ...(session?.user?.id
            ? {}
            : {
                clientId: await resolveAnonymousCommunityCopyClientId(),
            }),
    });

    if (!rateLimitResult.success) {
        return {
            success: false,
            error: 'Muitas copias em pouco tempo. Tente novamente.',
        };
    }

    const [storedPost] = await db
        .select({
            id: communityPosts.id,
            copySensPreset: communityPosts.copySensPreset,
        })
        .from(communityPosts)
        .where(eq(communityPosts.slug, normalizedSlug))
        .limit(1);

    if (!storedPost) {
        return {
            success: false,
            error: 'Post nao encontrado.',
        };
    }

    await db.insert(communityPostCopyEvents).values({
        postId: storedPost.id,
        copiedByUserId: session?.user?.id ?? null,
        copyTarget,
    });

    const copySensPreset = storedPost.copySensPreset;
    const clipboardText = formatCopySensPresetForClipboard(copySensPreset);

    return {
        success: true,
        postId: storedPost.id,
        copyTarget,
        copySensPreset,
        clipboardText,
    };
}
