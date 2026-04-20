import type {
    CommunityCreatorProgramStatus,
    CommunityProfileVisibility,
} from '@/db/schema';
import type {
    CommunityPostStatus,
    CommunityPostVisibility,
} from '@/types/community';
import {
    buildCommunityAnalysisTags,
    formatCommunityCount,
    formatCommunityCreatorStatusBadge,
} from './community-public-formatting';

export interface CommunityHighlightSourcePost {
    readonly id: string;
    readonly slug: string;
    readonly title: string;
    readonly excerpt: string;
    readonly status: CommunityPostStatus;
    readonly visibility: CommunityPostVisibility;
    readonly publishedAt: Date | null;
    readonly featuredUntil: Date | null;
    readonly primaryWeaponId: string | null;
    readonly primaryPatchVersion: string | null;
    readonly primaryDiagnosisKey: string | null;
    readonly engagement: {
        readonly likeCount: number;
        readonly commentCount: number;
        readonly copyCount: number;
        readonly saveCount: number;
    };
}

export interface CommunityHighlightSourceCreator {
    readonly profileId: string;
    readonly profileSlug: string;
    readonly displayName: string;
    readonly visibility: CommunityProfileVisibility;
    readonly creatorProgramStatus: CommunityCreatorProgramStatus;
    readonly followerCount: number;
    readonly publicPostCount: number;
    readonly likeCount: number;
    readonly commentCount: number;
    readonly copyCount: number;
    readonly lastPublicPostAt: Date | null;
}

export interface CommunityCreatorBadge {
    readonly label: string;
    readonly status: CommunityCreatorProgramStatus;
}

export interface CommunityHighlightEmptyState {
    readonly title: string;
    readonly body: string;
    readonly primaryAction: {
        readonly label: string;
        readonly href: string;
    };
}

export interface CommunityPostHighlight {
    readonly id: string;
    readonly slug: string;
    readonly href: string;
    readonly title: string;
    readonly excerpt: string;
    readonly reason: string;
    readonly analysisTags: readonly {
        readonly key: 'weapon' | 'patch' | 'diagnosis';
        readonly value: string;
        readonly label: string;
    }[];
}

export interface CommunityCreatorHighlight {
    readonly profileId: string;
    readonly profileHref: string;
    readonly displayName: string;
    readonly badge: CommunityCreatorBadge | null;
    readonly reasons: readonly string[];
}

export interface CommunityPostHighlightsViewModel {
    readonly items: readonly CommunityPostHighlight[];
    readonly emptyState: CommunityHighlightEmptyState | null;
}

export interface CommunityCreatorHighlightsViewModel {
    readonly items: readonly CommunityCreatorHighlight[];
    readonly emptyState: CommunityHighlightEmptyState | null;
}

export interface BuildFeaturedCommunityPostHighlightsInput {
    readonly now: Date;
    readonly posts: readonly CommunityHighlightSourcePost[];
}

export interface BuildCommunityCreatorHighlightsInput {
    readonly now: Date;
    readonly creators: readonly CommunityHighlightSourceCreator[];
}

export function buildFeaturedCommunityPostHighlights(
    input: BuildFeaturedCommunityPostHighlightsInput,
): CommunityPostHighlightsViewModel {
    const items = input.posts
        .filter((post) => isPublicHighlightPost(post, input.now))
        .sort(compareHighlightPosts)
        .slice(0, 3)
        .map((post): CommunityPostHighlight => ({
            id: post.id,
            slug: post.slug,
            href: `/community/${post.slug}`,
            title: post.title,
            excerpt: post.excerpt,
            reason: formatPostHighlightReason(post),
            analysisTags: buildCommunityAnalysisTags({
                weaponId: post.primaryWeaponId,
                patchVersion: post.primaryPatchVersion,
                diagnosisKey: post.primaryDiagnosisKey,
            }),
        }));

    return {
        items,
        emptyState: items.length > 0
            ? null
            : {
                title: 'Sem destaques publicos ainda',
                body: 'Publique uma analise, compare recoil, copie um preset ou salve um drill para gerar sinais publicos.',
                primaryAction: {
                    label: 'Publicar analise',
                    href: '/history',
                },
            },
    };
}

export function buildCommunityCreatorHighlights(
    input: BuildCommunityCreatorHighlightsInput,
): CommunityCreatorHighlightsViewModel {
    const items = input.creators
        .filter(isHighlightableCreator)
        .sort(compareCreatorHighlights)
        .slice(0, 4)
        .map((creator): CommunityCreatorHighlight => ({
            profileId: creator.profileId,
            profileHref: `/community/users/${creator.profileSlug}`,
            displayName: creator.displayName,
            badge: formatCommunityCreatorBadge(creator.creatorProgramStatus),
            reasons: buildCreatorHighlightReasons(creator),
        }));

    return {
        items,
        emptyState: items.length > 0
            ? null
            : {
                title: 'Sem creators em destaque ainda',
                body: 'Siga creators, comente analises e copie setups para fortalecer sinais de patch, arma e preset.',
                primaryAction: {
                    label: 'Explorar comunidade',
                    href: '/community',
                },
            },
    };
}

export function formatCommunityCreatorBadge(
    status: CommunityCreatorProgramStatus,
): CommunityCreatorBadge | null {
    return formatCommunityCreatorStatusBadge(status);
}

function isPublicHighlightPost(
    post: CommunityHighlightSourcePost,
    now: Date,
): boolean {
    if (
        post.status !== 'published'
        || post.visibility !== 'public'
        || !(post.publishedAt instanceof Date)
    ) {
        return false;
    }

    if (post.featuredUntil && post.featuredUntil.getTime() < now.getTime()) {
        return false;
    }

    return Boolean(post.featuredUntil) || getPostEngagementScore(post) > 0;
}

function getPostEngagementScore(post: CommunityHighlightSourcePost): number {
    return post.engagement.copyCount * 4
        + post.engagement.saveCount * 3
        + post.engagement.commentCount * 2
        + post.engagement.likeCount;
}

function compareHighlightPosts(
    left: CommunityHighlightSourcePost,
    right: CommunityHighlightSourcePost,
): number {
    const engagementDelta = getPostEngagementScore(right) - getPostEngagementScore(left);

    if (engagementDelta !== 0) {
        return engagementDelta;
    }

    return (right.publishedAt?.getTime() ?? 0) - (left.publishedAt?.getTime() ?? 0);
}

function formatPostHighlightReason(post: CommunityHighlightSourcePost): string {
    const patchLabel = post.primaryPatchVersion
        ? ` no Patch ${post.primaryPatchVersion}`
        : '';

    if (post.engagement.copyCount > 0) {
        return `Preset copiado ${post.engagement.copyCount} ${post.engagement.copyCount === 1 ? 'vez' : 'vezes'}${patchLabel}.`;
    }

    if (post.engagement.saveCount > 0) {
        return `Drill salvo ${post.engagement.saveCount} ${post.engagement.saveCount === 1 ? 'vez' : 'vezes'}${patchLabel}.`;
    }

    if (post.engagement.commentCount > 0) {
        return `${formatCommunityCount(post.engagement.commentCount, 'comentario publico de recoil', 'comentarios publicos de recoil')}${patchLabel}.`;
    }

    if (post.engagement.likeCount > 0) {
        return `${formatCommunityCount(post.engagement.likeCount, 'curtida publica no snapshot', 'curtidas publicas no snapshot')}${patchLabel}.`;
    }

    if (post.primaryWeaponId) {
        return `Snapshot publico com foco em ${post.primaryWeaponId}${patchLabel}.`;
    }

    return `Snapshot publico recente${patchLabel}.`;
}

function isHighlightableCreator(creator: CommunityHighlightSourceCreator): boolean {
    if (creator.visibility !== 'public') {
        return false;
    }

    return creator.creatorProgramStatus !== 'none'
        || creator.followerCount > 0
        || creator.publicPostCount > 0
        || creator.likeCount > 0
        || creator.commentCount > 0
        || creator.copyCount > 0
        || creator.lastPublicPostAt instanceof Date;
}

function compareCreatorHighlights(
    left: CommunityHighlightSourceCreator,
    right: CommunityHighlightSourceCreator,
): number {
    const scoreDelta = getCreatorHighlightScore(right) - getCreatorHighlightScore(left);

    if (scoreDelta !== 0) {
        return scoreDelta;
    }

    return (right.lastPublicPostAt?.getTime() ?? 0) - (left.lastPublicPostAt?.getTime() ?? 0);
}

function getCreatorHighlightScore(creator: CommunityHighlightSourceCreator): number {
    return (creator.creatorProgramStatus === 'approved' ? 100 : 0)
        + (creator.creatorProgramStatus === 'waitlist' ? 25 : 0)
        + creator.copyCount * 4
        + creator.commentCount * 3
        + creator.likeCount * 2
        + creator.followerCount
        + creator.publicPostCount;
}

function buildCreatorHighlightReasons(
    creator: CommunityHighlightSourceCreator,
): readonly string[] {
    const reasons: string[] = [];
    const badge = formatCommunityCreatorBadge(creator.creatorProgramStatus);

    if (badge) {
        reasons.push(badge.label);
    }

    if (creator.followerCount > 0) {
        reasons.push(formatCommunityCount(creator.followerCount, 'seguidor', 'seguidores'));
    }

    if (creator.publicPostCount > 0) {
        reasons.push(formatCommunityCount(creator.publicPostCount, 'analise publica', 'analises publicas'));
    }

    if (creator.copyCount > 0) {
        reasons.push(formatCommunityCount(creator.copyCount, 'preset copiado', 'presets copiados'));
    } else if (creator.commentCount > 0) {
        reasons.push(formatCommunityCount(creator.commentCount, 'comentario publico', 'comentarios publicos'));
    } else if (creator.likeCount > 0) {
        reasons.push(formatCommunityCount(creator.likeCount, 'curtida publica', 'curtidas publicas'));
    }

    return reasons.slice(0, 4);
}
