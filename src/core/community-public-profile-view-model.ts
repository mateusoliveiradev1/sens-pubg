import { and, count, desc, eq, inArray, isNotNull, or } from 'drizzle-orm';

import {
    communityFollows,
    communityPostComments,
    communityPostCopyEvents,
    communityPostLikes,
    communityPostSaves,
    communityPosts,
    communityProgressionEvents,
    communityProfiles,
    communityRewardRecords,
    communitySquadMemberships,
    communitySquads,
    playerProfiles,
    users,
} from '@/db/schema';
import type {
    CommunityCreatorProgramStatus,
    CommunityProfileLink,
    CommunityProfileVisibility,
} from '@/db/schema';
import type {
    CommunityPostStatus,
    CommunityPostVisibility,
    CommunityProgressionStreakState,
} from '@/types/community';
import {
    buildCommunityProgressionStreakSnapshot,
    toCommunityProgressionHistoryEvent,
} from './community-progression';
import {
    buildCommunityAnalysisTags,
    buildCommunityFallbackInitials,
    formatCommunityCreatorStatusBadge,
    normalizeCommunityExternalLinks,
    toSafeCommunityCount,
} from './community-public-formatting';
import {
    buildCommunityPublicRewardSummaries,
    type CommunityPublicRewardSummary,
} from './community-rewards';
import {
    buildCommunityPublicSquadIdentity,
    type CommunityPublicSquadIdentity,
} from './community-squads';
import {
    buildProfileTrustSignals,
    type CommunityTrustSignal,
} from './community-trust-signals';

const COMMUNITY_PUBLIC_PROFILE_EVENT_LIMIT = 250;
const COMMUNITY_PUBLIC_PROFILE_REWARD_LIMIT = 24;

export interface CommunityPublicProfileSourceProfile {
    readonly userId: string;
    readonly profileId: string;
    readonly slug: string;
    readonly displayName: string;
    readonly headline: string | null;
    readonly bio: string | null;
    readonly avatarUrl: string | null;
    readonly links: readonly CommunityProfileLink[];
    readonly visibility: CommunityProfileVisibility;
    readonly creatorProgramStatus: CommunityCreatorProgramStatus;
}

export interface CommunityPublicProfileSourceUser {
    readonly name: string | null;
    readonly image: string | null;
}

export interface CommunityPublicProfileSourcePlayerProfile {
    readonly bio?: string | null;
    readonly twitter?: string | null;
    readonly twitch?: string | null;
    readonly mouseModel?: string | null;
    readonly mouseSensor?: string | null;
    readonly mouseDpi?: number | null;
    readonly mousePollingRate?: number | null;
    readonly mousepadModel?: string | null;
    readonly mousepadType?: string | null;
    readonly gripStyle?: string | null;
    readonly playStyle?: string | null;
    readonly generalSens?: number | null;
    readonly adsSens?: number | null;
    readonly verticalMultiplier?: number | null;
    readonly fov?: number | null;
}

export interface CommunityPublicProfileSourcePost {
    readonly id: string;
    readonly slug: string;
    readonly title: string;
    readonly excerpt: string;
    readonly status: CommunityPostStatus;
    readonly visibility: CommunityPostVisibility;
    readonly publishedAt: Date | null;
    readonly primaryWeaponId: string | null;
    readonly primaryPatchVersion: string | null;
    readonly primaryDiagnosisKey: string | null;
}

export interface CommunityPublicProfileCreatorMetrics {
    readonly publicPostCount: number;
    readonly likeCount: number;
    readonly commentCount: number;
    readonly copyCount: number;
    readonly saveCount: number;
}

export interface CommunityPublicProfileFollowState {
    readonly followerCount: number;
    readonly viewerIsFollowing: boolean;
}

export interface CommunityPublicProfilePostCard {
    readonly id: string;
    readonly slug: string;
    readonly href: string;
    readonly title: string;
    readonly excerpt: string;
    readonly analysisTags: readonly {
        readonly key: 'weapon' | 'patch' | 'diagnosis';
        readonly value: string;
        readonly label: string;
    }[];
    readonly publishedAt: Date;
    readonly publishedAtIso: string;
    readonly primaryAction: {
        readonly label: string;
        readonly href: string;
    };
}

export interface CommunityPublicProfileRelatedLink {
    readonly key: string;
    readonly label: string;
    readonly href: string;
    readonly description: string;
    readonly postCount: number;
}

export interface CommunityPublicProfilePublicSetup {
    readonly aimSetup: {
        readonly mouseModel: string | null;
        readonly mouseSensor: string | null;
        readonly mouseDpi: number | null;
        readonly mousePollingRate: number | null;
    };
    readonly surfaceGrip: {
        readonly mousepadModel: string | null;
        readonly mousepadType: string | null;
        readonly gripStyle: string | null;
        readonly playStyle: string | null;
    };
    readonly pubgCore: {
        readonly generalSens: number | null;
        readonly adsSens: number | null;
        readonly verticalMultiplier: number | null;
        readonly fov: number | null;
    };
}

export interface CommunityPublicProfileStreakSummary {
    readonly currentStreak: number;
    readonly longestStreak: number;
    readonly streakState: CommunityProgressionStreakState;
    readonly title: string;
    readonly summary: string;
}

export interface CommunityPublicProfileViewModel {
    readonly identity: {
        readonly profileId: string;
        readonly slug: string;
        readonly displayName: string;
        readonly headline: string | null;
        readonly bio: string | null;
        readonly avatarUrl: string | null;
        readonly fallbackInitials: string;
        readonly creatorProgramStatus: CommunityCreatorProgramStatus;
        readonly creatorBadge: {
            readonly label: string;
            readonly status: CommunityCreatorProgramStatus;
        } | null;
        readonly profileHref: string;
        readonly canonicalPath: string;
    };
    readonly links: readonly {
        readonly label: string;
        readonly url: string;
        readonly target: '_blank';
        readonly rel: 'noreferrer';
    }[];
    readonly metrics: {
        readonly followerCount: number;
        readonly publicPostCount: number;
        readonly likeCount: number;
        readonly commentCount: number;
        readonly copyCount: number;
        readonly saveCount: number;
    };
    readonly trustSignals: readonly CommunityTrustSignal[];
    readonly follow: {
        readonly followerCount: number;
        readonly viewerIsFollowing: boolean;
        readonly canFollow: boolean;
        readonly isSelfProfile: boolean;
        readonly actionLabel: string;
        readonly disabledReason: string | null;
    };
    readonly publicRewards: readonly CommunityPublicRewardSummary[];
    readonly streak: CommunityPublicProfileStreakSummary;
    readonly squadIdentity: CommunityPublicSquadIdentity | null;
    readonly publicSetup: CommunityPublicProfilePublicSetup | null;
    readonly relatedLinks: readonly CommunityPublicProfileRelatedLink[];
    readonly posts: readonly CommunityPublicProfilePostCard[];
    readonly emptyState: {
        readonly title: string;
        readonly body: string;
        readonly primaryAction: {
            readonly label: string;
            readonly href: string;
        };
    } | null;
}

export interface BuildPublicCommunityProfileViewModelInput {
    readonly profile: CommunityPublicProfileSourceProfile;
    readonly user?: CommunityPublicProfileSourceUser | null;
    readonly playerProfile?: CommunityPublicProfileSourcePlayerProfile | null;
    readonly posts: readonly CommunityPublicProfileSourcePost[];
    readonly creatorMetrics: CommunityPublicProfileCreatorMetrics;
    readonly followState: CommunityPublicProfileFollowState;
    readonly viewerUserId: string | null;
    readonly publicRewards?: readonly CommunityPublicRewardSummary[];
    readonly streakSummary?: CommunityPublicProfileStreakSummary;
    readonly squadIdentity?: CommunityPublicSquadIdentity | null;
}

export function buildPublicCommunityProfileViewModel(
    input: BuildPublicCommunityProfileViewModelInput,
): CommunityPublicProfileViewModel {
    const profileHref = `/community/users/${input.profile.slug}`;
    const publicSourcePosts = input.posts
        .filter(isPublicProfilePost)
        .sort(compareProfilePostsByRecency);
    const publicPosts = publicSourcePosts.map(toProfilePostCard);
    const isSelfProfile = input.viewerUserId === input.profile.userId;
    const canFollow = Boolean(input.viewerUserId) && !isSelfProfile;
    const displayName = firstPublicText(input.profile.displayName, input.user?.name) ?? 'Jogador da comunidade';
    const avatarUrl = firstPublicText(input.profile.avatarUrl, input.user?.image);
    const headline = firstPublicText(
        input.profile.headline,
        buildPublicSetupHeadline(input.playerProfile ?? null),
    );
    const bio = firstPublicText(input.profile.bio, input.playerProfile?.bio);
    const fallbackInitials = buildCommunityFallbackInitials(displayName);
    const links = normalizePublicProfileLinks({
        communityLinks: input.profile.links,
        playerProfile: input.playerProfile ?? null,
    });
    const publicSetup = toPublicSetup(input.playerProfile ?? null);
    const metrics = {
        followerCount: toSafeCommunityCount(input.followState.followerCount),
        publicPostCount: toSafeCommunityCount(input.creatorMetrics.publicPostCount),
        likeCount: toSafeCommunityCount(input.creatorMetrics.likeCount),
        commentCount: toSafeCommunityCount(input.creatorMetrics.commentCount),
        copyCount: toSafeCommunityCount(input.creatorMetrics.copyCount),
        saveCount: toSafeCommunityCount(input.creatorMetrics.saveCount),
    };

    return {
        identity: {
            profileId: input.profile.profileId,
            slug: input.profile.slug,
            displayName,
            headline,
            bio,
            avatarUrl,
            fallbackInitials,
            creatorProgramStatus: input.profile.creatorProgramStatus,
            creatorBadge: formatCommunityCreatorStatusBadge(input.profile.creatorProgramStatus),
            profileHref,
            canonicalPath: profileHref,
        },
        links,
        metrics,
        trustSignals: buildProfileTrustSignals({
            creatorProgramStatus: input.profile.creatorProgramStatus,
            publicSetup,
            copyCount: metrics.copyCount,
            saveCount: metrics.saveCount,
        }),
        follow: {
            followerCount: toSafeCommunityCount(input.followState.followerCount),
            viewerIsFollowing: canFollow ? input.followState.viewerIsFollowing : false,
            canFollow,
            isSelfProfile,
            actionLabel: resolveFollowActionLabel({
                canFollow,
                isSelfProfile,
                viewerIsFollowing: input.followState.viewerIsFollowing,
            }),
            disabledReason: resolveFollowDisabledReason({
                canFollow,
                isSelfProfile,
                viewerUserId: input.viewerUserId,
            }),
        },
        publicRewards: input.publicRewards ?? [],
        streak: input.streakSummary ?? createZeroCommunityPublicProfileStreakSummary(),
        squadIdentity: input.squadIdentity ?? null,
        posts: publicPosts,
        emptyState: publicPosts.length > 0
            ? null
            : {
                title: 'Sem posts publicos ainda',
                body: 'Este perfil ainda nao publicou posts publicos. Continue explorando outros jogadores da comunidade.',
                primaryAction: {
                    label: 'Explorar comunidade',
                    href: '/community',
                },
            },
        publicSetup,
        relatedLinks: buildPublicProfileRelatedLinks(publicSourcePosts),
    };
}

export interface GetPublicCommunityProfileViewModelInput {
    readonly slug: string;
    readonly viewerUserId: string | null;
}

export async function getPublicCommunityProfileViewModel(
    input: GetPublicCommunityProfileViewModelInput,
): Promise<CommunityPublicProfileViewModel | null> {
    const normalizedSlug = input.slug.trim();

    if (!normalizedSlug) {
        return null;
    }

    const { db } = await import('@/db');

    const [storedProfile] = await db
        .select({
            userId: communityProfiles.userId,
            profileId: communityProfiles.id,
            slug: communityProfiles.slug,
            displayName: communityProfiles.displayName,
            headline: communityProfiles.headline,
            bio: communityProfiles.bio,
            avatarUrl: communityProfiles.avatarUrl,
            links: communityProfiles.links,
            visibility: communityProfiles.visibility,
            creatorProgramStatus: communityProfiles.creatorProgramStatus,
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

    const [storedPosts, storedUsers, storedPlayerProfiles] = await Promise.all([
        db
            .select({
                id: communityPosts.id,
                slug: communityPosts.slug,
                title: communityPosts.title,
                excerpt: communityPosts.excerpt,
                status: communityPosts.status,
                visibility: communityPosts.visibility,
                publishedAt: communityPosts.publishedAt,
                primaryWeaponId: communityPosts.primaryWeaponId,
                primaryPatchVersion: communityPosts.primaryPatchVersion,
                primaryDiagnosisKey: communityPosts.primaryDiagnosisKey,
            })
            .from(communityPosts)
            .where(
                and(
                    eq(communityPosts.communityProfileId, storedProfile.profileId),
                    eq(communityPosts.status, 'published'),
                    eq(communityPosts.visibility, 'public'),
                    isNotNull(communityPosts.publishedAt),
                ),
            )
            .orderBy(desc(communityPosts.publishedAt)),
        db
            .select({
                name: users.name,
                image: users.image,
            })
            .from(users)
            .where(eq(users.id, storedProfile.userId))
            .limit(1),
        db
            .select({
                bio: playerProfiles.bio,
                twitter: playerProfiles.twitter,
                twitch: playerProfiles.twitch,
                mouseModel: playerProfiles.mouseModel,
                mouseSensor: playerProfiles.mouseSensor,
                mouseDpi: playerProfiles.mouseDpi,
                mousePollingRate: playerProfiles.mousePollingRate,
                mousepadModel: playerProfiles.mousepadModel,
                mousepadType: playerProfiles.mousepadType,
                gripStyle: playerProfiles.gripStyle,
                playStyle: playerProfiles.playStyle,
                generalSens: playerProfiles.generalSens,
                adsSens: playerProfiles.adsSens,
                verticalMultiplier: playerProfiles.verticalMultiplier,
                fov: playerProfiles.fov,
            })
            .from(playerProfiles)
            .where(eq(playerProfiles.userId, storedProfile.userId))
            .limit(1),
    ]);
    const [storedProgressionEvents, storedRewards, storedSquadRows] = await withCommunityGamificationFallback(
        () => Promise.all([
            db
                .select({
                    idempotencyKey: communityProgressionEvents.idempotencyKey,
                    eventType: communityProgressionEvents.eventType,
                    actorUserId: communityProgressionEvents.actorUserId,
                    beneficiaryUserId: communityProgressionEvents.beneficiaryUserId,
                    entityType: communityProgressionEvents.entityType,
                    entityId: communityProgressionEvents.entityId,
                    rawXp: communityProgressionEvents.rawXp,
                    effectiveXp: communityProgressionEvents.effectiveXp,
                    occurredAt: communityProgressionEvents.occurredAt,
                    seasonId: communityProgressionEvents.seasonId,
                    missionId: communityProgressionEvents.missionId,
                    squadId: communityProgressionEvents.squadId,
                })
                .from(communityProgressionEvents)
                .where(
                    or(
                        eq(communityProgressionEvents.actorUserId, storedProfile.userId),
                        eq(communityProgressionEvents.beneficiaryUserId, storedProfile.userId),
                    ),
                )
                .orderBy(desc(communityProgressionEvents.occurredAt))
                .limit(COMMUNITY_PUBLIC_PROFILE_EVENT_LIMIT),
            db
                .select({
                    description: communityRewardRecords.description,
                    displayState: communityRewardRecords.displayState,
                    earnedAt: communityRewardRecords.earnedAt,
                    id: communityRewardRecords.id,
                    isPublicSafe: communityRewardRecords.isPublicSafe,
                    label: communityRewardRecords.label,
                    ownerType: communityRewardRecords.ownerType,
                    publicPayload: communityRewardRecords.publicPayload,
                    rewardKind: communityRewardRecords.rewardKind,
                    squadId: communityRewardRecords.squadId,
                    status: communityRewardRecords.status,
                    userId: communityRewardRecords.userId,
                })
                .from(communityRewardRecords)
                .where(eq(communityRewardRecords.userId, storedProfile.userId))
                .orderBy(desc(communityRewardRecords.earnedAt))
                .limit(COMMUNITY_PUBLIC_PROFILE_REWARD_LIMIT),
            db
                .select({
                    squadId: communitySquads.id,
                    squadName: communitySquads.name,
                    squadSlug: communitySquads.slug,
                    squadDescription: communitySquads.description,
                    squadVisibility: communitySquads.visibility,
                })
                .from(communitySquadMemberships)
                .innerJoin(communitySquads, eq(communitySquadMemberships.squadId, communitySquads.id))
                .where(
                    and(
                        eq(communitySquadMemberships.userId, storedProfile.userId),
                        eq(communitySquadMemberships.status, 'active'),
                        eq(communitySquadMemberships.isPubliclyVisible, true),
                        eq(communitySquads.visibility, 'public'),
                        eq(communitySquads.status, 'active'),
                    ),
                )
                .orderBy(desc(communitySquadMemberships.joinedAt))
                .limit(1),
        ]),
        [[], [], []] as const,
    );
    const postIds = storedPosts.map((post) => post.id);
    const [creatorMetrics, followState] = await Promise.all([
        getPublicProfileMetrics(postIds),
        getPublicProfileFollowState({
            profileUserId: storedProfile.userId,
            viewerUserId: input.viewerUserId,
        }),
    ]);

    return buildPublicCommunityProfileViewModel({
        profile: storedProfile,
        user: storedUsers[0] ?? null,
        playerProfile: storedPlayerProfiles[0] ?? null,
        posts: storedPosts,
        creatorMetrics,
        followState,
        viewerUserId: input.viewerUserId,
        publicRewards: buildCommunityPublicRewardSummaries({
            rewards: storedRewards,
            ownerType: 'user',
            userId: storedProfile.userId,
        }),
        streakSummary: buildCommunityPublicProfileStreakSummary(
            storedProgressionEvents.map((event) => toCommunityProgressionHistoryEvent(event)),
            storedProfile.userId,
        ),
        squadIdentity: buildCommunityPublicSquadIdentity(
            storedSquadRows[0]
                ? {
                    id: storedSquadRows[0].squadId,
                    name: storedSquadRows[0].squadName,
                    slug: storedSquadRows[0].squadSlug,
                    description: storedSquadRows[0].squadDescription,
                    visibility: storedSquadRows[0].squadVisibility,
                }
                : null,
        ),
    });
}

function isMissingCommunityGamificationRelation(error: unknown): boolean {
    const candidates = [error];

    if (typeof error === 'object' && error !== null && 'cause' in error) {
        candidates.push((error as { readonly cause?: unknown }).cause);
    }

    return candidates.some((candidate) => {
        if (!candidate || typeof candidate !== 'object') {
            return false;
        }

        const code = 'code' in candidate && typeof candidate.code === 'string'
            ? candidate.code
            : null;
        const message = 'message' in candidate && typeof candidate.message === 'string'
            ? candidate.message
            : '';

        return code === '42P01'
            || /relation "community_[^"]+" does not exist/i.test(message);
    });
}

async function withCommunityGamificationFallback<T>(
    query: () => Promise<T>,
    fallback: T,
): Promise<T> {
    try {
        return await query();
    } catch (error) {
        if (isMissingCommunityGamificationRelation(error)) {
            return fallback;
        }

        throw error;
    }
}

function firstPublicText(
    ...values: readonly (string | null | undefined)[]
): string | null {
    for (const value of values) {
        const normalizedValue = value?.trim();

        if (normalizedValue) {
            return normalizedValue;
        }
    }

    return null;
}

function normalizePublicProfileLinks(input: {
    readonly communityLinks: readonly CommunityProfileLink[];
    readonly playerProfile: CommunityPublicProfileSourcePlayerProfile | null;
}): CommunityPublicProfileViewModel['links'] {
    const playerLinks: CommunityProfileLink[] = [
        createPlayerSocialLink({
            label: 'X',
            value: input.playerProfile?.twitter ?? null,
            domains: ['x.com', 'twitter.com'],
            handleBaseUrl: 'https://x.com/',
        }),
        createPlayerSocialLink({
            label: 'Twitch',
            value: input.playerProfile?.twitch ?? null,
            domains: ['twitch.tv', 'www.twitch.tv'],
            handleBaseUrl: 'https://twitch.tv/',
        }),
    ].filter((link): link is CommunityProfileLink => Boolean(link));
    const links = normalizeCommunityExternalLinks([
        ...input.communityLinks,
        ...playerLinks,
    ]);
    const seenUrls = new Set<string>();

    return links.filter((link) => {
        const dedupeKey = link.url.toLowerCase();

        if (seenUrls.has(dedupeKey)) {
            return false;
        }

        seenUrls.add(dedupeKey);
        return true;
    });
}

function createPlayerSocialLink(input: {
    readonly label: string;
    readonly value: string | null;
    readonly domains: readonly string[];
    readonly handleBaseUrl: string;
}): CommunityProfileLink | null {
    const normalizedValue = input.value?.trim();

    if (!normalizedValue) {
        return null;
    }

    const candidateUrl = /^[a-z][a-z\d+.-]*:/i.test(normalizedValue)
        ? normalizedValue
        : `${input.handleBaseUrl}${normalizedValue.replace(/^@/, '')}`;

    try {
        const parsedUrl = new URL(candidateUrl);
        const host = parsedUrl.hostname.toLowerCase().replace(/^www\./, '');
        const allowedDomains = input.domains.map((domain) => domain.toLowerCase().replace(/^www\./, ''));

        if ((parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:')
            || !allowedDomains.includes(host)
            || parsedUrl.pathname === '/') {
            return null;
        }

        return {
            label: input.label,
            url: parsedUrl.toString(),
        };
    } catch {
        return null;
    }
}

function toPublicSetup(
    playerProfile: CommunityPublicProfileSourcePlayerProfile | null,
): CommunityPublicProfilePublicSetup | null {
    if (!playerProfile) {
        return null;
    }

    return {
        aimSetup: {
            mouseModel: firstPublicText(playerProfile.mouseModel),
            mouseSensor: firstPublicText(playerProfile.mouseSensor),
            mouseDpi: playerProfile.mouseDpi ?? null,
            mousePollingRate: playerProfile.mousePollingRate ?? null,
        },
        surfaceGrip: {
            mousepadModel: firstPublicText(playerProfile.mousepadModel),
            mousepadType: firstPublicText(playerProfile.mousepadType),
            gripStyle: firstPublicText(playerProfile.gripStyle),
            playStyle: firstPublicText(playerProfile.playStyle),
        },
        pubgCore: {
            generalSens: playerProfile.generalSens ?? null,
            adsSens: playerProfile.adsSens ?? null,
            verticalMultiplier: playerProfile.verticalMultiplier ?? null,
            fov: playerProfile.fov ?? null,
        },
    };
}

function buildPublicSetupHeadline(
    playerProfile: CommunityPublicProfileSourcePlayerProfile | null,
): string | null {
    const gripStyle = firstPublicText(playerProfile?.gripStyle);
    const playStyle = firstPublicText(playerProfile?.playStyle);

    if (gripStyle && playStyle) {
        return `Grip ${gripStyle} / ${playStyle}`;
    }

    if (gripStyle) {
        return `Grip ${gripStyle}`;
    }

    if (playStyle) {
        return `Setup ${playStyle}`;
    }

    return null;
}

function isPublicProfilePost(post: CommunityPublicProfileSourcePost): boolean {
    return post.status === 'published'
        && post.visibility === 'public'
        && post.publishedAt instanceof Date;
}

function compareProfilePostsByRecency(
    left: CommunityPublicProfileSourcePost,
    right: CommunityPublicProfileSourcePost,
): number {
    return (right.publishedAt?.getTime() ?? 0) - (left.publishedAt?.getTime() ?? 0);
}

function toProfilePostCard(post: CommunityPublicProfileSourcePost): CommunityPublicProfilePostCard {
    const href = `/community/${post.slug}`;

    return {
        id: post.id,
        slug: post.slug,
        href,
        title: post.title,
        excerpt: post.excerpt,
        analysisTags: buildCommunityAnalysisTags({
            weaponId: post.primaryWeaponId,
            patchVersion: post.primaryPatchVersion,
            diagnosisKey: post.primaryDiagnosisKey,
        }),
        publishedAt: post.publishedAt as Date,
        publishedAtIso: (post.publishedAt as Date).toISOString(),
        primaryAction: {
            label: 'Ver post',
            href,
        },
    };
}

function buildPublicProfileRelatedLinks(
    publicPosts: readonly CommunityPublicProfileSourcePost[],
): readonly CommunityPublicProfileRelatedLink[] {
    const links = new Map<string, CommunityPublicProfileRelatedLink>();

    for (const post of publicPosts) {
        for (const tag of buildCommunityAnalysisTags({
            weaponId: post.primaryWeaponId,
            patchVersion: post.primaryPatchVersion,
            diagnosisKey: post.primaryDiagnosisKey,
        })) {
            const key = `${tag.key}:${tag.value}`;
            const existingLink = links.get(key);
            const postCount = (existingLink?.postCount ?? 0) + 1;

            links.set(key, {
                key,
                label: tag.label,
                href: createProfileRelatedHref(tag),
                description: formatProfileRelatedDescription(tag.key, postCount),
                postCount,
            });
        }
    }

    return [...links.values()]
        .sort((left, right) => {
            const countDelta = right.postCount - left.postCount;

            if (countDelta !== 0) {
                return countDelta;
            }

            return left.label.localeCompare(right.label, 'pt-BR');
        })
        .slice(0, 6);
}

function createProfileRelatedHref(
    tag: CommunityPublicProfilePostCard['analysisTags'][number],
): string {
    const queryKeyByTagKey = {
        weapon: 'weaponId',
        patch: 'patchVersion',
        diagnosis: 'diagnosisKey',
    } as const;

    return `/community?${new URLSearchParams({
        [queryKeyByTagKey[tag.key]]: tag.value,
    }).toString()}`;
}

function formatProfileRelatedDescription(
    key: CommunityPublicProfilePostCard['analysisTags'][number]['key'],
    postCount: number,
): string {
    const nounByKey = {
        weapon: postCount === 1 ? 'post desta arma' : 'posts desta arma',
        patch: postCount === 1 ? 'post deste patch' : 'posts deste patch',
        diagnosis: postCount === 1 ? 'post deste diagnostico' : 'posts deste diagnostico',
    } as const;

    return `${postCount} ${nounByKey[key]} neste perfil.`;
}

function resolveFollowActionLabel(input: {
    readonly canFollow: boolean;
    readonly isSelfProfile: boolean;
    readonly viewerIsFollowing: boolean;
}): string {
    if (input.isSelfProfile) {
        return 'Seu perfil';
    }

    if (!input.canFollow) {
        return 'Entrar para seguir';
    }

    return input.viewerIsFollowing ? 'Deixar de seguir' : 'Seguir jogador';
}

function resolveFollowDisabledReason(input: {
    readonly canFollow: boolean;
    readonly isSelfProfile: boolean;
    readonly viewerUserId: string | null;
}): string | null {
    if (input.isSelfProfile) {
        return 'Este e o seu perfil.';
    }

    if (!input.canFollow && !input.viewerUserId) {
        return 'Entre para seguir este jogador.';
    }

    return null;
}

async function getPublicProfileMetrics(
    postIds: readonly string[],
): Promise<CommunityPublicProfileCreatorMetrics> {
    const { db } = await import('@/db');

    if (postIds.length === 0) {
        return {
            publicPostCount: 0,
            likeCount: 0,
            commentCount: 0,
            copyCount: 0,
            saveCount: 0,
        };
    }

    const [likeRows, commentRows, copyRows, saveRows] = await Promise.all([
        db
            .select({
                count: count(),
            })
            .from(communityPostLikes)
            .where(inArray(communityPostLikes.postId, postIds))
            .limit(1),
        db
            .select({
                count: count(),
            })
            .from(communityPostComments)
            .where(
                and(
                    inArray(communityPostComments.postId, postIds),
                    eq(communityPostComments.status, 'visible'),
                ),
            )
            .limit(1),
        db
            .select({
                count: count(),
            })
            .from(communityPostCopyEvents)
            .where(inArray(communityPostCopyEvents.postId, postIds))
            .limit(1),
        db
            .select({
                count: count(),
            })
            .from(communityPostSaves)
            .where(inArray(communityPostSaves.postId, postIds))
            .limit(1),
    ]);

    return {
        publicPostCount: postIds.length,
        likeCount: toSafeCommunityCount(likeRows[0]?.count),
        commentCount: toSafeCommunityCount(commentRows[0]?.count),
        copyCount: toSafeCommunityCount(copyRows[0]?.count),
        saveCount: toSafeCommunityCount(saveRows[0]?.count),
    };
}

async function getPublicProfileFollowState(input: {
    readonly profileUserId: string;
    readonly viewerUserId: string | null;
}): Promise<CommunityPublicProfileFollowState> {
    const { db } = await import('@/db');
    const [followerCountRow] = await db
        .select({
            count: count(),
        })
        .from(communityFollows)
        .where(eq(communityFollows.followedUserId, input.profileUserId))
        .limit(1);
    const followerCount = toSafeCommunityCount(followerCountRow?.count);
    const normalizedViewerUserId = input.viewerUserId?.trim() ?? null;

    if (!normalizedViewerUserId || normalizedViewerUserId === input.profileUserId) {
        return {
            followerCount,
            viewerIsFollowing: false,
        };
    }

    const [storedFollow] = await db
        .select({
            followerUserId: communityFollows.followerUserId,
        })
        .from(communityFollows)
        .where(
            and(
                eq(communityFollows.followerUserId, normalizedViewerUserId),
                eq(communityFollows.followedUserId, input.profileUserId),
            ),
        )
        .limit(1);

    return {
        followerCount,
        viewerIsFollowing: Boolean(storedFollow),
    };
}

function buildCommunityPublicProfileStreakSummary(
    events: Parameters<typeof buildCommunityProgressionStreakSnapshot>[0]['events'],
    userId: string,
): CommunityPublicProfileStreakSummary {
    const streak = buildCommunityProgressionStreakSnapshot({
        userId,
        events,
    });

    switch (streak.streakState) {
        case 'active':
            return {
                currentStreak: streak.currentStreak,
                longestStreak: streak.longestStreak,
                streakState: streak.streakState,
                title: `${streak.currentStreak} semana(s) seguidas`,
                summary: `Maior sequencia: ${streak.longestStreak}. Esse jogador segue em ritmo ativo nesta janela.`,
            };

        case 'at_risk':
            return {
                currentStreak: streak.currentStreak,
                longestStreak: streak.longestStreak,
                streakState: streak.streakState,
                title: 'Sequencia em risco',
                summary: `A ultima contribuicao abriu uma sequencia de ${streak.currentStreak}; falta uma nova acao nesta semana para mante-la ativa.`,
            };

        case 'reentry':
            return {
                currentStreak: streak.currentStreak,
                longestStreak: streak.longestStreak,
                streakState: streak.streakState,
                title: 'Hora de retomar o ritmo',
                summary: `A maior sequencia foi ${streak.longestStreak}. Esse jogador esta em janela de retorno sem pressa artificial.`,
            };

        case 'inactive':
            return createZeroCommunityPublicProfileStreakSummary();
    }
}

function createZeroCommunityPublicProfileStreakSummary(): CommunityPublicProfileStreakSummary {
    return {
        currentStreak: 0,
        longestStreak: 0,
        streakState: 'inactive',
        title: 'Sequencia ainda nao comecou',
        summary: 'Ainda nao ha participacoes publicas suficientes para mostrar uma sequencia visivel.',
    };
}
